import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { GemlyxLoader, GemlyxMark } from "../components/GemlyxLogo";
import { TypewriterText } from "../components/TypewriterText";
import { DetailPage } from "../components/DetailPage";
import { GuideRouteMap } from "../components/GuideRouteMap";
import { ensureLiveContentLoaded } from "../utils/liveContent";
import { lookupRealPlace, resolveStopCoords, resolveLegMode, kmBetween, estimateDurationText, isSameTownWalk, legDistanceKm, WALK_MAX_MINUTES } from "../utils/guideEnrichment";
import { askClaude } from "../utils/aiClient";
import { testTravelerLine } from "../utils/helpers";
import { BOOKING_AFFILIATE_ID } from "../config";

// ─── GUIDE PAGE ───────────────────────────────────────────────────
// The ONLY place a guide is ever shown, per Oliver ("get rid of the popup") —
// the old in-app "little book" guide modal in App.jsx is gone, and this is
// what it used to link out to as an optional "View as full page" extra. A card
// grid (same visual language as the "Hidden Towns" nav page — see the
// .towns-grid class used there) instead of a scrolling wall of text, with an
// explicit confirm-before-save step and a real shareable URL once saved.
//
// Two ways this component gets used:
//  1. FRESH / UNSAVED — App.jsx's generateGuide navigates here with a finished,
//     fully-enriched `guide` object via router state (maps/exact routes/
//     accommodation/weather already baked in — see that function for why it
//     waits for all of that before ever navigating here). Shows the card grid
//     + a "Looks good — save my guide" confirmation step. Saving POSTs to
//     Supabase and redirects to the real /guide/:id URL.
//  2. SAVED / SHARED — visited directly via a real /guide/:id URL (from a saved
//     link, or after step 1 completes). Fetches the guide from Supabase by id
//     and shows it read-only, with its own "Save to my guides" (bookmark) option
//     for whoever's viewing the link.
//
// REQUIRES the "gemlyx_guides" Supabase table (id text primary key, payload
// jsonb, created_at timestamptz default now()) with public insert+select RLS
// policies — this may already exist from an earlier pass; if this page's Save
// button ever fails, that table not existing yet is the first thing to check
// in the Supabase dashboard.

const dayIcon = (i) => ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭"][i] || `Day ${i + 1}`;

// ── THE SHAPE OF THE TRIP, BEFORE ANY OF THE DETAIL ─────────────────
// Oliver, 7 Aug 2026: "We just need to make the guide less overwhelming as
// well. Easier to understand." And, when I offered to collapse the days to do
// it: "I, personally, think putting it up as days is good though. Some people
// like a schedule. And people coming to Denmark, have no idea about Denmark.
// How long the transport is. How long it takes to settle, etc."
//
// That rules out the obvious fix and points at the real problem. The page was
// never overwhelming because it had too much in it; it was overwhelming because
// it opened straight into Day 1 with no answer to "how big is this thing". You
// scroll for a while and still cannot say how many towns you are visiting or
// how much of the week is spent moving.
//
// So nothing is removed. This computes the four numbers a person actually wants
// first, and they go above the days: how many days, how many stops, which towns
// in order, and how much travelling that adds up to.
//
// EVERY FIGURE IS ALL-OR-NOTHING. A distance total built from the legs that
// happened to resolve, silently missing the ferry crossing, is worse than no
// total: it reads as complete and understates the trip. So if one leg cannot be
// measured, the whole figure is withheld rather than quietly wrong. Same for
// time, and the longest single journey is only claimed to BE the longest when
// every journey was measured.
export const tripShape = (guide, legKm) => {
  const days = guide?.days || [];
  const stops = days.flatMap(d => d.stops || []).filter(s => s && s.name);
  const towns = [];
  stops.forEach(s => {
    const t = String(s.town || "").trim();
    if (t && !towns.some(x => x.toLowerCase() === t.toLowerCase())) towns.push(t);
  });
  const geo = guide?._geo || {};
  const durations = guide?._exactDurations || {};
  let km = 0, kmKnown = stops.length > 1;
  let minutes = 0, minutesKnown = stops.length > 1;
  let longest = null;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i].name, b = stops[i + 1].name;
    const d = legKm(a, b, geo);
    if (d == null) kmKnown = false; else km += d;
    // The mode is resolved down in the render, so match on the pair and take
    // whichever mode was actually measured for it.
    const hit = Object.keys(durations).find(k => k.startsWith(`${a}|${b}|`));
    const mins = hit ? durations[hit]?.durationMinutes : null;
    if (typeof mins !== "number") minutesKnown = false;
    else {
      minutes += mins;
      if (!longest || mins > longest.minutes) longest = { minutes: mins, from: a, to: b, text: durations[hit].durationText };
    }
  }
  return {
    dayCount: days.length,
    stopCount: stops.length,
    towns,
    km: kmKnown && km >= 1 ? Math.round(km) : null,
    minutes: minutesKnown && minutes > 0 ? minutes : null,
    longest: minutesKnown ? longest : null,
  };
};

// "3h 20m", or "45m". Hours matter to someone working out whether a day is
// mostly travelling; seconds-level precision does not.
export const humanMinutes = (m) => {
  if (typeof m !== "number" || m <= 0) return null;
  const h = Math.floor(m / 60), rest = Math.round(m % 60);
  if (!h) return `${rest}m`;
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

export const GuidePage = ({ guide: guideProp, onBack, liveGuide }) => {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Reached two ways: navigate("/guide/new", { state: { guide } }) once a fresh
  // build finishes (App.jsx's generateGuide) or from a saved-guide click on Home,
  // or a plain `guide` prop for standalone/test use — router state wins when both
  // are somehow present. Per Oliver ("get rid of the popup"), this page is now
  // the ONLY place a guide is ever shown — there's no in-app modal anymore.
  const freshGuide = location.state?.guide || guideProp || null;
  const [guide, setGuide] = useState(freshGuide || null);
  const [loading, setLoading] = useState(!freshGuide && !!guideId);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const isUnsaved = !!freshGuide && !guideId;

  // App.jsx's generateGuide navigates here as soon as a guide first exists, then
  // keeps enriching it in the background (exact travel times, weather, where to
  // stay) via the same object, identified by _gid. GemlyxApp never unmounts
  // across a route change, so it passes that same live-updating object down as
  // liveGuide on every re-render — mirror it in here as it changes, instead of
  // freezing on the snapshot taken at the moment of navigation. Only applies to
  // the fresh/unsaved case (matched by _gid); a saved guide loaded by id below
  // is untouched by this.
  useEffect(() => {
    if (liveGuide && typeof liveGuide === "object" && liveGuide._gid && guide?._gid === liveGuide._gid) {
      setGuide(liveGuide);
    }
  }, [liveGuide]);

  // Fold in anything published via Content Studio (same one-time, dedup-safe
  // loader App.jsx uses) so a stop that matches a real Gemlyx entry — including
  // one published after this page's own code shipped — can actually be found by
  // lookupRealPlace below, even for someone landing here cold via a shared link
  // who never visited "/" first in this browser tab.
  useEffect(() => { ensureLiveContentLoaded(); }, []);

  // Click a stop that matches something real Gemlyx already knows (a town, a
  // free attraction, a restaurant, a nightlife venue, an event) to open that
  // actual page — same feature the old in-app guide modal had, now here since
  // this is the only guide view left. DetailPage itself is a self-contained
  // full-screen overlay (no route change), so "back" is always instant.
  const [eventDetail, setEventDetail] = useState(null);
  const [townDetail, setTownDetail] = useState(null);
  const [nightlifeDetail, setNightlifeDetail] = useState(null);
  const [freeDetail, setFreeDetail] = useState(null);
  const [foodDetail, setFoodDetail] = useState(null);
  // Craft/booking matches deliberately don't open anything here — App.jsx's own
  // craft detail is a separate bespoke modal (not the shared DetailPage this
  // page reuses), out of scope for this pass. lookupRealPlace's caller below
  // filters craft matches out of "clickable" for the same reason, so a craft
  // stop's card never shows a pointer cursor for a click that would do nothing.
  const openStopDetail = (real) => {
    if (!real) return;
    if (real._src === "free") setFreeDetail(real);
    else if (real._src === "food") setFoodDetail(real);
    else if (real._src === "nightlife") setNightlifeDetail(real);
    else if (real._src === "town") setTownDetail(real);
    else if (real._src === "event") setEventDetail(real);
  };
  const [liveInfo, setLiveInfo] = useState({});
  const [liveInfoLoading, setLiveInfoLoading] = useState(null);
  const checkLiveInfo = async (item) => {
    setLiveInfoLoading(item.name);
    try {
      const query = `${item.name} ${item.location || item.town || ""} Instagram Facebook official page latest update opening hours events 2026`;
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setLiveInfo(prev => ({ ...prev, [item.name]: data.answer || (data.results?.[0]?.snippet) || "No current updates found." }));
    } catch {
      setLiveInfo(prev => ({ ...prev, [item.name]: "Couldn't check right now — try again in a moment." }));
    }
    setLiveInfoLoading(null);
  };
  const [savedPlaces, setSavedPlaces] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gemlyx_saved_places") || "[]"); } catch { return []; }
  });
  const isPlaceSaved = (kind, id) => savedPlaces.some(p => p.kind === kind && p.id === id);
  const toggleSavePlace = (kind, item, townName) => {
    setSavedPlaces(prev => {
      const exists = prev.some(p => p.kind === kind && p.id === item.id);
      const updated = exists
        ? prev.filter(p => !(p.kind === kind && p.id === item.id))
        : [{ kind, id: item.id, name: item.name, emoji: item.emoji, town: townName || item.town || item.city || item.location || "" }, ...prev].slice(0, 40);
      try { localStorage.setItem("gemlyx_saved_places", JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  };

  useEffect(() => {
    if (freshGuide || !guideId) return;
    setLoading(true);
    setLoadError(null);
    fetch(`${SUPABASE_URL}/rest/v1/gemlyx_guides?select=payload&id=eq.${encodeURIComponent(guideId)}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then(r => r.json())
      .then(rows => {
        if (!rows?.[0]?.payload) { setLoadError("This guide link doesn't exist or was removed."); return; }
        setGuide(rows[0].payload);
      })
      .catch(() => setLoadError("Couldn't load this guide — check your connection and try again."))
      .finally(() => setLoading(false));
  }, [guideId, freshGuide]);

  const saveGuide = async () => {
    if (!guide || saving) return;
    setSaving(true);
    setSaveError(null);
    // Short, URL-friendly id — collision odds are negligible at this scale, and a
    // free-read/free-insert table (see the SQL file) doesn't need anything fancier.
    const id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_guides`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        // TEST SCAFFOLDING NEVER GETS SAVED. _testProfile and _testPlan exist
        // so Oliver can see what went into a Random-guide run; they are for him
        // and nobody else. Saving them puts them in the payload permanently, and
        // the shared link then shows a stranger a dashed gold box headed
        // "Pipeline test" describing a traveler who does not exist. Stripped
        // here rather than only hidden at render, because the render guard
        // cannot help a payload that is already in the database.
        body: JSON.stringify({ id, payload: (({ _testProfile, _testPlan, ...rest }) => rest)(guide) }),
      });
      if (!res.ok) { setSaveError("Couldn't save this guide — try again."); setSaving(false); return; }
      // Also bookmark it into the same "gemlyx_saved_guides" localStorage list
      // Home's "Your Saved Guides" quick list reads — this is what used to happen
      // from the old popup's own separate "Save Guide" button, now this page's
      // real Supabase save is the only save flow, so it does both jobs. The
      // string id (not a Date.now() number) is what tells Home's list this entry
      // has a real shareable link and should route straight to /guide/:id.
      try {
        const bookmarks = JSON.parse(localStorage.getItem("gemlyx_saved_guides") || "[]");
        const updated = [{ id, title: guide.title, days: guide.days, savedAt: new Date().toISOString() }, ...bookmarks].slice(0, 20);
        localStorage.setItem("gemlyx_saved_guides", JSON.stringify(updated));
      } catch { /* bookmark list is a convenience, never block the real save over it */ }
      navigate(`/guide/${id}`, { replace: true });
    } catch {
      setSaveError("Couldn't save this guide — check your connection and try again.");
    }
    setSaving(false);
  };

  // PERSISTENT GEMLYX CHAT — per Oliver: once a guide is built, the traveler
  // should still be able to talk to Gemlyx from right here, instead of the
  // conversation dead-ending once App.jsx's Detour chat hands off to this page.
  // This is a lightweight, separate conversation (not the same thread as the
  // one that built the trip) — it can answer questions about the built trip
  // (using the itinerary as context below) or anything else Denmark-related,
  // but it doesn't edit the saved guide object directly; it points back to the
  // main chat for that, same as the itinerary rebuild flow already works.
  // ── STOP NOTES OPEN ON DEMAND ──────────────────────────────────
  // The note was cut at 140 characters with an ellipsis, which is the worst of
  // both: it spends the space AND withholds the sentence. Nothing on this page
  // let you read the rest. Keyed by day and stop index.
  const [openNotes, setOpenNotes] = useState({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Hi again ◆ I'm still here if you want to talk through this trip, ask about a stop, or anything else about Denmark." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  // Which assistant message index has already finished streaming in — see
  // components/TypewriterText.jsx and App.jsx's main Detour chat, same pattern.
  const [chatRevealedUpTo, setChatRevealedUpTo] = useState(0);
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);
  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !guide) return;
    const nextMessages = [...chatMessages, { role: "user", text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    const convoText = nextMessages.slice(1).map(m => `${m.role}: ${m.text}`).join("\n");
    const stopList = (guide.days || []).map(d => `Day ${d.day || ""}: ${d.title || ""} — ${(d.stops || []).map(s => s.name).join(", ") || "no stops yet"}`).join("\n");
    const prompt = `You are Gemlyx's Local Assist, continuing to help with a Denmark trip after the itinerary below was already built. Answer naturally and conversationally, like a knowledgeable local friend giving real advice — never claim to have personally visited a place. You're a genuinely happy, upbeat guy who loves helping; a fitting emoji or two per reply is welcome where it adds warmth, never a wall of them. Never use em dashes or en dashes anywhere in your reply. Keep answers focused and reasonably short unless the question genuinely needs more detail. If asked to change the itinerary itself, explain what you'd change in words — you can't directly edit this saved guide from here, so tell them to describe the change back on the main planning chat to rebuild it.\n\nTHE TRIP ALREADY BUILT:\nTitle: ${guide.title || "Untitled trip"}\n${stopList}${guide.essentials ? `\nBudget: ${guide.essentials.budgetReality || ""}\nGetting around: ${guide.essentials.transportTip || ""}\nKeep in mind: ${guide.essentials.keepInMind || ""}` : ""}\n\nCONVERSATION SO FAR:\n${convoText}\n\nRespond to the traveler's last message.`;
    const result = await askClaude(prompt, 500);
    setChatMessages(prev => [...prev, { role: "assistant", text: result.error ? "Sorry, I couldn't get an answer just now, try again in a moment." : result.text }]);
    setChatLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GemlyxLoader size={44} />
      </div>
    );
  }

  if (loadError || !guide) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 16, color: C.text, fontWeight: 700, marginBottom: 8, fontFamily: "'Fraunces', serif" }}>Guide not found</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{loadError || "Something went wrong loading this guide."}</div>
        <button onClick={() => navigate("/")} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 100, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Back to Gemlyx</button>
      </div>
    );
  }

  const days = guide.days || [];
  // Oliver's map-vs-plain choice, made before this page ever sees the guide
  // (App.jsx's generateGuide, search "chosenMode") — _lightMode true means
  // the plain day-by-day pick, so no route map and no leg time chips here,
  // just the stop cards, photos, click-through, accommodation, and weather.
  const lightMode = !!guide._lightMode;
  const shape = tripShape(guide, legDistanceKm);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 60 }}>
      {/* BUG FIX: .towns-grid was only ever defined in App.jsx's own <style>
          tag, which only exists while GemlyxApp (the "/" route) is mounted.
          A guide reached via a direct/shared link never mounts GemlyxApp at
          all — React Router only renders the ONE matching route — so this
          page's stop-card grid was silently falling back to plain stacked
          block layout with zero columns for anyone opening a shared guide
          link cold, never noticed because every live test so far started
          from "/" first (where GemlyxApp's style tag was still around from
          the client-side nav). Defined locally now so this page never
          depends on another route's CSS still being mounted. */}
      <style>{`
        .towns-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 14px; }
        @media (min-width: 900px) { .towns-grid { grid-template-columns: repeat(3, 1fr); gap: 34px 22px; } }
      `}</style>
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${C.bg}ee`, backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => (onBack ? onBack() : navigate("/"))}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          ‹ Back
        </button>
        {!isUnsaved && (
          <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Copy link ↗
          </button>
        )}
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 16px 28px" }}>
        {/* Redesign pass: kicker + roomier title, and the essentials box became a
            labeled "Before you go" card instead of three anonymous ◆ bullet lines —
            same data, but each line now says what KIND of tip it is at a glance. */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>✦ Your Gemlyx guide</div>
        <div style={{ fontSize: 36, fontWeight: 500, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.1, marginBottom: lightMode ? 10 : 24, maxWidth: 680 }}>{guide.title || "Your Denmark Guide"}</div>
        {/* So the absence of maps/routes reads as the choice it was, not a bug. */}
        {lightMode && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "5px 12px", marginBottom: 24, fontSize: 11, color: C.muted, fontWeight: 600 }}>
            📋 Simple guide, no maps or transport times
          </div>
        )}

        {/* ── AT A GLANCE, BEFORE THE DETAIL ──────────────────────────
            The answer to "how big is this trip", which the page previously made
            you scroll the whole thing to work out. Only figures that are
            genuinely known appear: tripShape withholds a total rather than
            build one out of the legs that happened to resolve. */}
        {shape.stopCount > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18, maxWidth: 640 }}>
            {[
              { n: shape.dayCount, label: shape.dayCount === 1 ? "day" : "days" },
              { n: shape.stopCount, label: shape.stopCount === 1 ? "stop" : "stops" },
              shape.towns.length ? { n: shape.towns.length, label: shape.towns.length === 1 ? "town" : "towns" } : null,
              shape.km ? { n: shape.km, label: "km of travel", sub: true } : null,
              shape.minutes ? { n: humanMinutes(shape.minutes), label: "moving in total", sub: true } : null,
            ].filter(Boolean).map((s2, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 14px", minWidth: 76 }}>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: s2.sub ? C.light : C.gold, lineHeight: 1.1 }}>{s2.n}</div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 0.9, textTransform: "uppercase", marginTop: 3 }}>{s2.label}</div>
              </div>
            ))}
          </div>
        )}
        {shape.towns.length > 1 && (
          <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.7, marginBottom: shape.longest ? 8 : 24, maxWidth: 640 }}>
            <span style={{ color: C.muted, fontWeight: 700 }}>Your route: </span>{shape.towns.join(" → ")}
          </div>
        )}
        {/* His words, on why the transport has to stay visible: "people coming
            to Denmark, have no idea about Denmark. How long the transport is."
            The single longest journey is the one that decides whether a day is
            a day out or a travel day, so it is named rather than buried in a
            chip halfway down. */}
        {shape.longest && (
          <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.7, marginBottom: 24, maxWidth: 640 }}>
            <span style={{ color: C.muted, fontWeight: 700 }}>Longest single journey: </span>
            {shape.longest.text}, {shape.longest.from} to {shape.longest.to}
          </div>
        )}

        {/* A seven day guide is a long page. Jumping is not a substitute for the
            day structure, which he asked to keep, it is a way to get back to
            Thursday without scrolling past Monday again. */}
        {days.length >= 3 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 26 }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => document.getElementById(`gx-day-${d.day || i + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 13px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                Day {d.day || i + 1}
              </button>
            ))}
          </div>
        )}

        {guide.essentials && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 30, maxWidth: 640 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>Before you go</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Money", guide.essentials.budgetReality], ["Getting around", guide.essentials.transportTip], ["Keep in mind", guide.essentials.keepInMind], ["Weather", guide.essentials.weatherNote]].filter(([, v]) => v).map(([label, v]) => (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0, width: 92 }}>{label}</span>
                  <span style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isUnsaved && (
          <div style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: "14px 16px", marginBottom: 24, maxWidth: 640 }}>
            <div style={{ fontSize: 13.5, color: C.text, fontWeight: 700, marginBottom: 4 }}>Does this look right?</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>Here's everything your guide will include — take a look, then save it to get your own link.</div>
          </div>
        )}

        {/* PIPELINE TEST CARD (Oliver: "Can you in the test pipeline also show
            me what the plan was? I want to see what recommendations is given
            to the different types of people... did they include events") —
            only ever present on guides built from Studio's Random-guide test
            button (guide._testProfile is attached exclusively on that path,
            see App.jsx's randomTestProfileRef). Shows the fabricated traveler,
            the planner's raw day/stop skeleton BEFORE the writer touched it,
            and whether any real events made it into the final guide. */}
        {guide._testProfile && isUnsaved && (() => {
          const p = guide._testProfile;
          let plan = null;
          try { plan = guide._testPlan ? JSON.parse(guide._testPlan) : null; } catch { /* skeleton unparseable — show the rest without it */ }
          const eventStops = (guide.days || []).flatMap(d => d.stops || []).map(s => ({ s, real: lookupRealPlace(s.name) })).filter(x => x.real?._src === "event").map(x => x.s.name);
          // The brief no longer names towns or "extras", because naming
          // published entries pre-solved the hardest thing the pipeline does.
          // This panel used to read p.towns.join() unguarded, which would have
          // thrown on the very first Random-guide click after that change: a
          // white screen, from a debug panel. What it shows now is WHO the
          // fabricated traveler is, which is the thing that varies.
          const line = testTravelerLine(p);
          return (
            <div style={{ background: `${C.gold}0D`, border: `1px dashed ${C.gold}66`, borderRadius: 14, padding: "14px 16px", marginBottom: 24, maxWidth: 640, fontSize: 12.5, lineHeight: 1.7 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>◈ Pipeline test — what went in</div>
              <div style={{ color: C.light }}><span style={{ color: C.text, fontWeight: 700 }}>Test traveler:</span> {line}</div>
              {p.brief && (
                <div style={{ color: C.muted, fontStyle: "italic", marginTop: 6, paddingLeft: 10, borderLeft: `2px solid ${C.gold}44` }}>{p.brief}</div>
              )}
              {plan?.days?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: C.text, fontWeight: 700 }}>Planner's structure (before the writer):</div>
                  {plan.days.map((d, i) => (
                    <div key={i} style={{ color: C.light }}>Day {d.day || i + 1}{d.title ? ` · ${d.title}` : ""}: {(d.stops || []).map(s => (typeof s === "string" ? s : s?.name)).filter(Boolean).join(" → ")}</div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8, color: C.light }}><span style={{ color: C.text, fontWeight: 700 }}>Events included:</span> {eventStops.length ? eventStops.join(", ") : "none matched this plan"}</div>
            </div>
          );
        })()}

        {days.map((day, dayIdx) => {
          // Real coordinates for this guide (from geocodeStopsForGuide, baked onto
          // the guide object as _geo when the build handed off to this page — see
          // App.jsx's generateGuide) plus this day's own real exact-duration/route
          // data (_exactDurations/_noRouteFound), so route links/maps here use the
          // exact same numbers the guide-building pipeline already verified,
          // instead of a second, separately-computed guess.
          const geo = guide._geo || {};
          const exactDurations = guide._exactDurations || {};
          const noRouteFound = guide._noRouteFound || {};
          // LINK PARITY FIX (Oliver: "Public transport says 19 minutes... you
          // then check maps, and it's 27"): the in-app duration was fetched
          // with real resolved COORDINATES, but this Google Maps link was built
          // from plain text names — Google's own geocoder can resolve those to
          // different endpoints (a different station, a same-named place
          // elsewhere), so the linked route legitimately disagreed with the
          // quoted one. When we have a genuinely precise coordinate for a stop
          // (real data or this guide's own geocode — NOT the town-center
          // fallback), the link now uses it, so Maps opens the same journey the
          // chip's number came from.
          const preciseCoord = (name) => {
            const real = lookupRealPlace(name);
            if (real?.lat && real?.lon) return { lat: real.lat, lon: real.lon };
            return geo[name] || null;
          };
          const stopTownOf = (name) => (day.stops || []).find(s => s.name === name)?.town || (dayIdx > 0 ? days[dayIdx - 1]?.stops?.slice(-1)[0]?.town : null);
          const routeUrl = (originName, destName, mode) => {
            // READABILITY over raw precision in the LINK (Oliver's screenshot:
            // Google Maps opening with "55.2613281,12.1288198" sitting in the
            // origin field — reads as broken): a town-qualified place name
            // resolves reliably in Google's own geocoder AND displays as a
            // human place, so prefer it whenever a town is known; fall back to
            // the precise coordinate only for stops with no town context at
            // all (where a bare name genuinely risks matching the wrong place).
            const originTown = stopTownOf(originName);
            const destTown = (day.stops || []).find(s => s.name === destName)?.town;
            const oc = preciseCoord(originName), dc = preciseCoord(destName);
            const originText = originTown ? `${originName}, ${originTown}, Denmark` : oc ? `${oc.lat},${oc.lon}` : `${originName}, Denmark`;
            const destText = destTown ? `${destName}, ${destTown}, Denmark` : dc ? `${dc.lat},${dc.lon}` : `${destName}, Denmark`;
            return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originText)}&destination=${encodeURIComponent(destText)}&travelmode=${mode}`;
          };
          const legChip = (originName, destName, how) => {
            let mode = resolveLegMode(how, guide._mode, originName, destName, guide._onlyWalking, geo);
            // Same-town transit legs are walks even when no coordinates ever
            // resolved (the Ribe VikingeCenter → Ribe Old Town report) — same
            // rule, same town source (stop.town) as fetchExactDurations, so
            // the cache key each computes always matches the other's.
            const legOriginTown = stopTownOf(originName);
            const legDestTown = (day.stops || []).find(s => s.name === destName)?.town;
            if (isSameTownWalk(mode, legOriginTown, legDestTown, how)) mode = "walking";
            const rawExact = exactDurations[`${originName}|${destName}|${mode}`];
            // Walking cap tightened 180 → WALK_MAX_MINUTES (Oliver: "there has
            // to be rules. No walking more than 15-20 minutes"). 180 minutes
            // is why a three-hour-capped "1 hour 15 min on foot" sailed through
            // and shipped as a suggested leg. Rejecting it here makes an
            // ALREADY-BUILT guide heal on next view too, not just new builds:
            // the chip falls back to the honest estimate for a real mode
            // instead of presenting an absurd walk.
            const plausibleCap = mode === "walking" ? WALK_MAX_MINUTES : mode === "bicycling" ? 300 : Infinity;
            const exact = rawExact && (rawExact.durationMinutes <= plausibleCap || (rawExact.modeUsed && rawExact.modeUsed !== "walking")) ? rawExact : null;
            // A transit leg with no transit route can have been rescued as a real
            // walking route by the build (see fetchExactDurations' walking retry) —
            // modeUsed is the mode the result actually came from, and the icon/
            // label/link must match IT, not the originally-resolved mode.
            const usedMode = exact?.modeUsed || mode;
            const icon = usedMode === "bicycling" ? "🚲" : usedMode === "driving" ? "🚗" : usedMode === "walking" ? "🚶" : /ferry|boat/i.test(how || "") ? "⛴" : "🚆";
            // legDistanceKm, not kmBetween — when two stops only resolved to
            // the same town centre we do NOT know the distance, and saying so
            // (null → the AI's own leg text, or "Check route") is the honest
            // answer. kmBetween returned 0 there, which estimateDurationText
            // turned into a confident "~1 min" for legs that were really 30:
            // the exact bug Oliver has now reported four times.
            const km = legDistanceKm(originName, destName, geo);
            const modeLabel = usedMode === "bicycling" ? "by bike" : usedMode === "driving" ? "by car" : usedMode === "walking" ? "on foot" : "by train/bus";
            const routeFailed = noRouteFound[`${originName}|${destName}|${mode}`];
            if (routeFailed) {
              // SHORT-LEG GUARD, also covers guides built before the fetch-side
              // fixes: a "no route" leg that is genuinely close together (or
              // inside one town) is a walk — show a real walking chip with a
              // walking Maps link, never "check Rome2Rio" for a five minute
              // stroll. Rome2Rio stays only for real long-distance dead ends
              // (island crossings needing ferry+train combinations).
              if ((km != null && km <= 3) || (legOriginTown && legDestTown && legOriginTown.trim().toLowerCase() === legDestTown.trim().toLowerCase())) {
                return (
                  <a href={routeUrl(originName, destName, "walking")} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                    <span style={{ fontSize: 12 }}>🚶</span>
                    <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{km != null ? `${estimateDurationText(km, "walking")} on foot` : "A short walk"}</span>
                    <span style={{ fontSize: 9.5, color: C.light, fontWeight: 700 }}>· Maps ↗</span>
                  </a>
                );
              }
              return (
                <a href={`https://www.rome2rio.com/map/${encodeURIComponent(originName)}/${encodeURIComponent(destName)}`} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                  <span style={{ fontSize: 12 }}>⛴</span>
                  <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>No direct route, check Rome2Rio</span>
                </a>
              );
            }
            // Transit times get an honest "~" even when they come from the real
            // Directions API — a transit journey's duration depends on when you
            // leave (the API answered for "now" at build time), so presenting it
            // as exact is what made "says 19, Maps says 27" feel like a bug
            // rather than schedule variance.
            const exactLabel = exact ? `${usedMode === "transit" ? "~" : ""}${exact.durationText} ${modeLabel}` : null;
            return (
              <a href={routeUrl(originName, destName, usedMode)} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
                  {exactLabel || (km !== null ? `${estimateDurationText(km, usedMode)} ${modeLabel}` : how || "Check route")}
                </span>
                <span style={{ fontSize: 9.5, color: C.light, fontWeight: 700 }}>· Maps ↗</span>
              </a>
            );
          };
          const routePoints = (day.stops || []).map(s => {
            const c = resolveStopCoords(s.name, geo);
            return c ? { name: s.name, ...c } : null;
          }).filter(Boolean);
          // Per-leg travel modes for the route map, resolved EXACTLY the way
          // legChip resolves them above: same resolveLegMode call, same
          // same-town-walk override. The map fetches real route geometry per
          // leg, and a leg's shape depends entirely on its mode, since a ferry
          // crossing and a walk between the same two points are different
          // journeys. Sharing the resolution instead of re-deriving it is what
          // stops the drawn line and the stated duration from drifting apart.
          const routeLegs = routePoints.slice(0, -1).map((p, i) => {
            const destName = routePoints[i + 1].name;
            const how = day.glance?.legs?.[i]?.how;
            let mode = resolveLegMode(how, guide._mode, p.name, destName, guide._onlyWalking, geo);
            if (isSameTownWalk(mode, stopTownOf(p.name), stopTownOf(destName), how)) mode = "walking";
            return { mode };
          });
          return (
          <div key={day.day || dayIdx} id={`gx-day-${day.day || dayIdx + 1}`} style={{ marginBottom: 44, scrollMarginTop: 70 }}>
            {/* Redesign pass: day headers went from a cramped gold uppercase micro-line
                to a proper serif heading with a hairline rule — the day number stays
                small and gold, the day's title gets the size it deserves. */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", flexShrink: 0 }}>Day {day.day || dayIdx + 1}</span>
                {day.title && <span style={{ fontSize: 22, fontWeight: 500, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.2 }}>{day.title}</span>}
              </div>
              {day.weather && (
                <div title="Forecast assumes the trip starts today" style={{ display: "flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${day.weather.risk === "high" ? "#FFB34766" : C.border}`, borderRadius: 100, padding: "4px 10px", fontSize: 11 }}>
                  <span>{day.weather.icon}</span>
                  <span style={{ color: C.text, fontWeight: 700 }}>{day.weather.temp}°</span>
                  {day.weather.risk === "high" && <span style={{ color: "#FFB347", fontWeight: 700 }}>· rain likely</span>}
                </div>
              )}
            </div>
            <div style={{ height: 1, background: C.border, margin: "10px 0 18px" }} />
            {/* If today only has one stop, the real journey worth showing is the leg
                connecting it to yesterday's last stop, not nothing at all.
                Skipped in light mode, same reasoning as the route map below. */}
            {!lightMode && day.stops?.length === 1 && dayIdx > 0 && days[dayIdx - 1]?.stops?.length > 0 && (
              <div style={{ marginBottom: 14 }}>{legChip(days[dayIdx - 1].stops.slice(-1)[0].name, day.stops[0].name, day.glance?.legs?.[0]?.how)}</div>
            )}
            {!lightMode && routePoints.length > 1 && (
              <div style={{ height: 180, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 18, maxWidth: 620 }}>
                <GuideRouteMap points={routePoints} legs={routeLegs} />
              </div>
            )}
            {/* TIMELINE LAYOUT (Oliver: "having the transport under each is
                odd... put it up so it looks a little bit more understanding",
                his pick from the options offered): the two-column card grid put
                each transport chip under one card in grid space, visually
                attached to nothing. A day is a SEQUENCE, so it now renders as
                one: a single column of stop cards with the transport chip
                sitting on a small connector line BETWEEN the two stops it
                actually joins. The cards themselves are unchanged (same photo
                height as the Towns nav, per Oliver's earlier call). */}
            <div style={{ maxWidth: 620 }}>
              {/* Redesign pass: stops became real cards (surface, border, radius) instead
                  of floating text under a gray box, and the empty-photo state is now a
                  designed monogram plate — the place's initial in italic serif on a
                  layered gradient — rather than a lonely ◆ in a void. Now also clickable
                  when the stop matches something real Gemlyx already has its own page
                  for (a town, a free attraction, a restaurant, a venue, an event). */}
              {/* ── NOT EVERY STOP IS A POSTCARD ────────────────────────
                  This is where the page got heavy. Every stop rendered as a big
                  card, and since only stops matching a published Gemlyx entry
                  have a photo, most days were three or four 96px monogram
                  plates: a large decorated box whose entire content is the
                  first letter of a name you can already read underneath it. A
                  four day trip was a very long scroll made mostly of gradient.

                  Nothing is dropped, the weight is just spent where there is
                  something to look at. A stop with a real photo keeps the full
                  card. Everything else becomes a compact row, which also makes
                  the ones with photos read as the highlights of the day rather
                  than as four equal things in a queue. */}
              {(day.stops || []).map((stop, stopIdx) => {
                const matched = lookupRealPlace(stop.name);
                const real = matched && matched._src !== "craft" ? matched : null;
                const nextStop = day.stops[stopIdx + 1];
                const noteKey = `${dayIdx}-${stopIdx}`;
                const noteOpen = !!openNotes[noteKey];
                const NOTE_CLAMP = 160;
                const note = stop.note || "";
                const longNote = note.length > NOTE_CLAMP;
                const noteBlock = note ? (
                  <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginTop: 7 }}>
                    {longNote && !noteOpen ? `${note.slice(0, NOTE_CLAMP).trimEnd()}… ` : `${note} `}
                    {longNote && (
                      <button onClick={e => { e.stopPropagation(); setOpenNotes(o => ({ ...o, [noteKey]: !noteOpen })); }}
                        style={{ background: "none", border: "none", padding: 0, color: C.gold, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                        {noteOpen ? "Less" : "Read more"}
                      </button>
                    )}
                  </div>
                ) : null;
                const titleRow = (
                  <>
                    <div style={{ fontSize: real?.photo ? 17 : 15, fontWeight: 600, color: real ? C.gold : C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.2, textDecoration: real ? "underline" : "none", textDecorationColor: real ? `${C.gold}55` : "none", textUnderlineOffset: 3 }}>{stop.name}{real ? " ↗" : ""}</div>
                    {(stop.town || stop.suggestedStay || (!real?.photo && stop.arrivalTime)) && (
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 5 }}>
                        {[!real?.photo && stop.arrivalTime, stop.town, stop.suggestedStay].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {noteBlock}
                  </>
                );
                return (
                <div key={stopIdx} style={{ marginBottom: nextStop && lightMode ? 14 : 0 }}>
                  {real?.photo ? (
                  <div onClick={() => openStopDetail(real)}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
                    {/* Per Oliver: "avoid the horizontal pictures, you can't see the
                        whole castle — go with the same size as on the town
                        navigation." This was a much shorter/wider box (116px tall)
                        than the Towns page's own stop photos (210px, same
                        .towns-grid column width) — a short, wide crop of a tall
                        subject like a castle cuts off its towers/spires. Now
                        matches Towns exactly. */}
                    <div style={{ position: "relative", height: 210, overflow: "hidden" }}>
                      <img src={real.photo} alt={stop.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {stop.arrivalTime && (
                        <div style={{ position: "absolute", top: 10, left: 10, background: C.scrim || "rgba(10,15,30,0.78)", backdropFilter: "blur(6px)", color: C.gold, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 100, border: `1px solid ${C.gold}44` }}>{stop.arrivalTime}</div>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px 14px" }}>{titleRow}</div>
                  </div>
                  ) : (
                  <div onClick={real ? () => openStopDetail(real) : undefined}
                    style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", cursor: real ? "pointer" : "default" }}>
                    <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${C.gold}18`, border: `1px solid ${C.gold}33` }}>
                      <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 16, fontWeight: 500, color: C.gold }}>{(stop.name || "◆").slice(0, 1)}</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>{titleRow}</div>
                  </div>
                  )}
                  {/* Connector: the leg chip sits ON the line between the two
                      stops it joins, centered — reads as "then you travel",
                      not as a stray label under a random card. */}
                  {!lightMode && nextStop && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0" }}>
                      <div style={{ width: 1, height: 16, background: `${C.gold}55` }} />
                      {legChip(stop.name, nextStop.name, day.glance?.legs?.[stopIdx]?.how)}
                      <div style={{ width: 1, height: 16, background: `${C.gold}55` }} />
                    </div>
                  )}
                </div>
                );
              })}
            </div>
            {day.glance?.accommodation && (() => {
              const dayDate = guide._arrivalDate ? new Date(guide._arrivalDate) : null;
              if (dayDate) dayDate.setDate(dayDate.getDate() + ((day.day || dayIdx + 1) - 1));
              const nextDate = dayDate ? new Date(dayDate) : null;
              if (nextDate) nextDate.setDate(nextDate.getDate() + 1);
              const fmt = (d) => d ? d.toISOString().slice(0, 10) : null;
              const adultsMatch = (guide._travelers || "").match(/\d+/);
              const adults = adultsMatch ? adultsMatch[0] : "2";
              const searchTerm = day.glance.recommendedStay || day.glance.stayArea;
              // STANDING RULE — DO NOT REMOVE THIS CARD OR THIS LINK IN ANY
              // REBUILD (Oliver: "why does the accommodation/booking
              // affiliation keep getting removed"): the "Where to stay" card
              // and its Booking.com link are a deliberate, permanent feature
              // and the app's planned affiliate revenue path. If a redesign
              // touches this section, the card and link must survive it.
              // BOOKING_AFFILIATE_ID lives in src/config.js — one shared
              // constant, empty until Oliver's Booking.com affiliate account
              // is approved; pasting the aid number there turns every Booking
              // link in the app into an affiliate link at once.
              const bookingUrl = searchTerm
                ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(searchTerm + ", Denmark")}` +
                  (fmt(dayDate) ? `&checkin=${fmt(dayDate)}&checkout=${fmt(nextDate)}` : "") +
                  `&group_adults=${adults}&no_rooms=1` +
                  (BOOKING_AFFILIATE_ID ? `&aid=${BOOKING_AFFILIATE_ID}` : "")
                : null;
              return (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.surface, border: `1px solid ${C.gold}33`, borderRadius: 12, padding: "12px 14px", marginTop: 16 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>🏡</span>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                    <span style={{ color: C.muted, fontWeight: 700 }}>Where to stay: </span>
                    <span style={{ color: C.light }}>{day.glance.accommodation}</span>
                    {day.glance.recommendedStay && (
                      <div style={{ marginTop: 3 }}><span style={{ color: C.gold, fontWeight: 700 }}>{day.glance.recommendedStay}</span></div>
                    )}
                    {bookingUrl && (
                      <a href={bookingUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 5, color: C.gold, fontWeight: 700, textDecoration: "none" }}>
                        🔎 {day.glance.recommendedStay ? `See ${day.glance.recommendedStay} on Booking.com` : `Search stays near ${day.glance.stayArea}`} ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          );
        })}

        {isUnsaved && (
          // PASS 27 BUG FIX (Oliver: "the Gemlyx Guide is on top of the 'sounds
          // good' button... on phone"): this bar was only ever tested at desktop
          // widths. It's centered and un-z-indexed, while the floating "Ask
          // Gemlyx" launcher below is fixed bottom:20/right:20 with zIndex:40 —
          // on a narrow phone this centered pill runs wide enough that its
          // right end (the actual "Looks good — save my guide" button) sits
          // directly under the launcher, which draws on top of it since the
          // bar had no z-index of its own. zIndex 45 here guarantees the save
          // button always wins the stack; the launcher itself also gets moved
          // up out of the way below (className gxa-guide-savebar-active).
          <div style={{ position: "sticky", bottom: 16, zIndex: 45, display: "flex", justifyContent: "center", marginTop: 20 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: 6, display: "flex", gap: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
              <button onClick={() => (onBack ? onBack() : navigate(-1))}
                style={{ background: "none", border: "none", color: C.light, borderRadius: 100, padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Back to chat
              </button>
              <button onClick={saveGuide} disabled={saving}
                style={{ background: `linear-gradient(135deg, ${C.accent}, #C22A3C)`, color: "#fff", border: "none", borderRadius: 100, padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 16px rgba(226,59,78,0.3)" }}>
                {saving ? "Saving…" : "Looks good — save my guide"}
              </button>
            </div>
          </div>
        )}
        {saveError && <div style={{ textAlign: "center", color: "#FFB347", fontSize: 12.5, marginTop: 12 }}>{saveError}</div>}
      </div>

      {/* Persistent Gemlyx chat — a small floating launcher, bottom-right so it
          never collides with the centered "save my guide" bar above. Opens a
          fixed-position panel with its own scrollable history; closing it keeps
          the conversation in memory for the rest of this page visit. */}
      {/* PASS 27: on narrow phones, when the "Looks good — save my guide" bar
          is on screen (isUnsaved), this launcher gets pushed up above it
          instead of sitting at its usual bottom:20 — see the sticky bar's own
          comment above for why they collided. Desktop/tablet is unaffected;
          this only kicks in under 480px via the media query below. */}
      {isUnsaved && (
        <style>{`
          @media (max-width: 480px) {
            .gxa-guide-chat-launcher.gxa-savebar-active { bottom: 84px !important; }
          }
        `}</style>
      )}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
          className={`gxa-guide-chat-launcher${isUnsaved ? " gxa-savebar-active" : ""}`}
          style={{ position: "fixed", bottom: 20, right: 20, zIndex: 40, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`, border: `1px solid ${C.gold}55`, color: C.text, borderRadius: 100, padding: "12px 18px 12px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 26px rgba(0,0,0,0.55)" }}>
          <GemlyxMark size={20} ring={true} ringColor={C.gold} tone="gold" />
          Ask Gemlyx
        </button>
      )}
      {chatOpen && (
        <div style={{ position: "fixed", bottom: 0, right: 0, zIndex: 40, width: "100%", maxWidth: 380, height: "min(560px, 82vh)", margin: "0 0 0 auto", display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.border}`, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, boxShadow: "0 -8px 30px rgba(0,0,0,0.55)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <GemlyxMark size={20} ring={true} ringColor={C.gold} tone="gold" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>Gemlyx</span>
            </div>
            <button onClick={() => setChatOpen(false)}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}>
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.map((m, i) => {
              const isLatestAssistant = m.role === "assistant" && i === chatMessages.length - 1;
              const streaming = isLatestAssistant && i > chatRevealedUpTo;
              return (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? C.accent : C.bg, border: m.role === "user" ? "none" : `1px solid ${C.border}`, color: m.role === "user" ? "#fff" : C.light, borderRadius: 14, padding: "9px 13px", fontSize: 13, lineHeight: 1.55 }}>
                {m.role === "assistant"
                  ? <TypewriterText text={m.text} active={streaming} onDone={() => setChatRevealedUpTo(prev => Math.max(prev, i))} />
                  : m.text}
              </div>
              );
            })}
            {chatLoading && (
              <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "9px 13px" }}>
                <GemlyxLoader size={18} ring={false} />
                <span style={{ fontSize: 11.5, color: C.muted }}>Thinking…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder="Ask about this trip, or anything else…"
              style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none" }} />
            <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 100, width: 40, height: 40, flexShrink: 0, cursor: chatLoading ? "default" : "pointer", opacity: chatLoading || !chatInput.trim() ? 0.55 : 1, fontSize: 15 }}>
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Same DetailPage overlay every other page in the app uses to show a real
          Gemlyx entry — self-contained, fixed full-screen, no route change, so
          closing it is always instant and lands you right back on this guide. */}
      <DetailPage item={eventDetail} onClose={() => setEventDetail(null)} kind="event" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={null} isSaved={eventDetail && isPlaceSaved("event", eventDetail.id)} onToggleSave={eventDetail ? () => toggleSavePlace("event", eventDetail, eventDetail.town) : null} />
      <DetailPage item={townDetail} onClose={() => setTownDetail(null)} kind="town" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={null} isSaved={townDetail && isPlaceSaved("town", townDetail.id)} onToggleSave={townDetail ? () => toggleSavePlace("town", townDetail, townDetail.region) : null} />
      <DetailPage item={nightlifeDetail} onClose={() => setNightlifeDetail(null)} kind="nightlife" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={null} isSaved={nightlifeDetail && isPlaceSaved("nightlife", nightlifeDetail.id)} onToggleSave={nightlifeDetail ? () => toggleSavePlace("nightlife", nightlifeDetail, nightlifeDetail.location) : null} />
      <DetailPage item={freeDetail} onClose={() => setFreeDetail(null)} kind="free" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={null} isSaved={freeDetail && isPlaceSaved("free", freeDetail.id)} onToggleSave={freeDetail ? () => toggleSavePlace("free", freeDetail, freeDetail.city) : null} />
      <DetailPage item={foodDetail} onClose={() => setFoodDetail(null)} kind="food" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={null} isSaved={foodDetail && isPlaceSaved("food", foodDetail.id)} onToggleSave={foodDetail ? () => toggleSavePlace("food", foodDetail, foodDetail.location) : null} />
    </div>
  );
};
