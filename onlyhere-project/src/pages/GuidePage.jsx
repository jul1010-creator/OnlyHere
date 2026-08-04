import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { GemlyxLoader, GemlyxMark } from "../components/GemlyxLogo";
import { DetailPage } from "../components/DetailPage";
import { GuideRouteMap } from "../components/GuideRouteMap";
import { ensureLiveContentLoaded } from "../utils/liveContent";
import { lookupRealPlace, resolveStopCoords, resolveLegMode, kmBetween } from "../utils/guideEnrichment";
import { askClaude } from "../utils/aiClient";

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
        body: JSON.stringify({ id, payload: guide }),
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Hi again ◆ I'm still here if you want to talk through this trip, ask about a stop, or anything else about Denmark." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
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
    const prompt = `You are Gemlyx's Local Assist, continuing to help with a Denmark trip after the itinerary below was already built. Answer naturally and conversationally, like a knowledgeable local friend giving real advice — never claim to have personally visited a place. Never use em dashes or en dashes anywhere in your reply. Keep answers focused and reasonably short unless the question genuinely needs more detail. If asked to change the itinerary itself, explain what you'd change in words — you can't directly edit this saved guide from here, so tell them to describe the change back on the main planning chat to rebuild it.\n\nTHE TRIP ALREADY BUILT:\nTitle: ${guide.title || "Untitled trip"}\n${stopList}${guide.essentials ? `\nBudget: ${guide.essentials.budgetReality || ""}\nGetting around: ${guide.essentials.transportTip || ""}\nKeep in mind: ${guide.essentials.keepInMind || ""}` : ""}\n\nCONVERSATION SO FAR:\n${convoText}\n\nRespond to the traveler's last message.`;
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

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 60 }}>
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
          const routeUrl = (originName, destName, mode) => {
            const originTown = (day.stops || []).find(s => s.name === originName)?.town || (dayIdx > 0 ? days[dayIdx - 1]?.stops?.slice(-1)[0]?.town : null);
            const destTown = (day.stops || []).find(s => s.name === destName)?.town;
            const originText = originTown ? `${originName}, ${originTown}, Denmark` : `${originName}, Denmark`;
            const destText = destTown ? `${destName}, ${destTown}, Denmark` : `${destName}, Denmark`;
            return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originText)}&destination=${encodeURIComponent(destText)}&travelmode=${mode}`;
          };
          const legChip = (originName, destName, how) => {
            const mode = resolveLegMode(how, guide._mode, originName, destName, guide._onlyWalking, geo);
            const icon = mode === "bicycling" ? "🚲" : mode === "driving" ? "🚗" : mode === "walking" ? "🚶" : /ferry|boat/i.test(how || "") ? "⛴" : "🚆";
            const rawExact = exactDurations[`${originName}|${destName}|${mode}`];
            const plausibleCap = mode === "walking" ? 180 : mode === "bicycling" ? 300 : Infinity;
            const exact = rawExact && rawExact.durationMinutes <= plausibleCap ? rawExact : null;
            const a = resolveStopCoords(originName, geo), b = resolveStopCoords(destName, geo);
            const km = a && b ? kmBetween(a, b) : null;
            const modeLabel = mode === "bicycling" ? "by bike" : mode === "driving" ? "by car" : mode === "walking" ? "on foot" : "by train/bus";
            const routeFailed = noRouteFound[`${originName}|${destName}|${mode}`];
            if (routeFailed) {
              return (
                <a href={`https://www.rome2rio.com/map/${encodeURIComponent(originName)}/${encodeURIComponent(destName)}`} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px", marginTop: 8 }}>
                  <span style={{ fontSize: 12 }}>⛴</span>
                  <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>No direct route, check Rome2Rio</span>
                </a>
              );
            }
            return (
              <a href={routeUrl(originName, destName, mode)} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px", marginTop: 8 }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
                  {exact ? `${exact.durationText} ${modeLabel}` : km !== null ? `${Math.round(km) === 0 ? "<1" : "~" + Math.round(km)} km ${modeLabel}` : how || "Route"}
                </span>
                <span style={{ fontSize: 9.5, color: C.light, fontWeight: 700 }}>· Maps ↗</span>
              </a>
            );
          };
          const routePoints = (day.stops || []).map(s => {
            const c = resolveStopCoords(s.name, geo);
            return c ? { name: s.name, ...c } : null;
          }).filter(Boolean);
          return (
          <div key={day.day || dayIdx} style={{ marginBottom: 44 }}>
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
              <div style={{ height: 180, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 18 }}>
                <GuideRouteMap points={routePoints} />
              </div>
            )}
            <div className="towns-grid">
              {/* Redesign pass: stops became real cards (surface, border, radius) instead
                  of floating text under a gray box, and the empty-photo state is now a
                  designed monogram plate — the place's initial in italic serif on a
                  layered gradient — rather than a lonely ◆ in a void. Now also clickable
                  when the stop matches something real Gemlyx already has its own page
                  for (a town, a free attraction, a restaurant, a venue, an event). */}
              {(day.stops || []).map((stop, stopIdx) => {
                const matched = lookupRealPlace(stop.name);
                const real = matched && matched._src !== "craft" ? matched : null;
                const nextStop = day.stops[stopIdx + 1];
                return (
                <div key={stopIdx}>
                  <div onClick={real ? () => openStopDetail(real) : undefined}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", cursor: real ? "pointer" : "default" }}>
                    <div style={{ position: "relative", height: 116, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: real?.photo ? undefined : `radial-gradient(120% 90% at 18% 0%, #1B2946 0%, transparent 60%), radial-gradient(100% 80% at 90% 100%, #23181F 0%, transparent 55%), ${C.bg}` }}>
                      {real?.photo ? (
                        <img src={real.photo} alt={stop.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 44, fontWeight: 500, color: "rgba(148,163,199,0.35)" }}>{(stop.name || "◆").slice(0, 1)}</span>
                      )}
                      {stop.arrivalTime && (
                        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(10,15,30,0.78)", backdropFilter: "blur(6px)", color: C.gold, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 100, border: `1px solid ${C.gold}44` }}>{stop.arrivalTime}</div>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px 14px" }}>
                      <div style={{ fontSize: 17, fontWeight: 600, color: real ? C.gold : C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.15, textDecoration: real ? "underline" : "none", textDecorationColor: real ? `${C.gold}55` : "none", textUnderlineOffset: 3 }}>{stop.name}{real ? " ↗" : ""}</div>
                      {stop.town && <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 5 }}>{stop.town}{stop.suggestedStay ? ` · ${stop.suggestedStay}` : ""}</div>}
                      {stop.note && <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginTop: 7 }}>{stop.note.slice(0, 140)}{stop.note.length > 140 ? "…" : ""}</div>}
                    </div>
                  </div>
                  {!lightMode && nextStop && legChip(stop.name, nextStop.name, day.glance?.legs?.[stopIdx]?.how)}
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
              const bookingUrl = searchTerm
                ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(searchTerm + ", Denmark")}` +
                  (fmt(dayDate) ? `&checkin=${fmt(dayDate)}&checkout=${fmt(nextDate)}` : "") +
                  `&group_adults=${adults}&no_rooms=1`
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
          <div style={{ position: "sticky", bottom: 16, display: "flex", justifyContent: "center", marginTop: 20 }}>
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
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
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
            {chatMessages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? C.accent : C.bg, border: m.role === "user" ? "none" : `1px solid ${C.border}`, color: m.role === "user" ? "#fff" : C.light, borderRadius: 14, padding: "9px 13px", fontSize: 13, lineHeight: 1.55 }}>
                {m.text}
              </div>
            ))}
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
