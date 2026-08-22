import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C } from "../utils/theme";
import { languageBlock } from "../utils/readerLanguage";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { GemlyxLoader, GemlyxMark } from "../components/GemlyxLogo";
import { TypewriterText } from "../components/TypewriterText";
import { DetailPage } from "../components/DetailPage";
import { GuideRouteMap } from "../components/GuideRouteMap";
import { ensureLiveContentLoaded } from "../utils/liveContent";
import { previewPools } from "../utils/previewMatch";
import { placedLibrary, nearbyPublished, describeLocation } from "../utils/nearbyPlaces";
import { towns } from "../data/towns";
import { freeEntrance } from "../data/freeEntrance";
import { foodSpots } from "../data/food";
import { nightlifeSpots } from "../data/nightlife";
import { craftItemsFallback } from "../data/craft";
import { events, majorEvents } from "../data/events";
import { lookupRealPlace, placeCoords, resolveStopCoords, resolveStopCoordsDetailed, townKeyFor, townFallbackFor, townPointFor, resolveLegMode, kmBetween, estimateDurationText, isSameTownWalk, legDistanceKm, isSameSpot, WALK_MAX_MINUTES, walkEstimateTooFar, stopTown } from "../utils/guideEnrichment";
import { operatorsForLeg, operatorNote, OPERATORS } from "../utils/operators";
import { partOfCountry } from "../utils/geography";
import { journeyFromStored, legSteps, worthShowingLegs, journeyAgencies, JOURNEY_SOURCE } from "../utils/journey";
import { dayWeather, weatherIsStale, weatherChanges } from "../utils/weather";
import { dayWarnings, dayCrossings, tripWeatherWarning } from "../utils/weatherWarn";
import { askClaude } from "../utils/aiClient";
import { testTravelerLine, isFerryText, daysUntil } from "../utils/helpers";
import { stopKind, tripScaleLine, tripCharacter, bookingActions, tripDayDate, stopEventWhen } from "../utils/guideReading";
import { BOOKING_AFFILIATE_ID } from "../config";
import { tiqetsBrowseUrl, partnerDisclosure } from "../utils/affiliates";
import { dayStart, dayKey, dayPlus } from "../utils/calendarDay";
import { shareMessage, shareTitle } from "../utils/share";
import { returnLeg, describeReturn, REACH_FAR, overnightMove, describeOvernightMove } from "../utils/routeOrder";
import { stayTextProblem } from "../utils/accommodation";
import { GUIDE_RIGHTS_SHORT, copyrightLine } from "../utils/rights";
import { guideHero, heroCaption } from "../utils/guideHero";
import { PhotoCredit } from "../components/PhotoCredit";

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

  // ── SENDING IT TO SOMEBODY ────────────────────────────────────
  // Oliver, 8 Aug 2026, after the competitor research: "Aight, let's try!" —
  // sharing was the first of the four things worth taking from the rest of the
  // category. Wanderlog's most praised feature is collaboration; G8Trip won its
  // own bake-off on coordinating four people. Almost nobody plans a trip alone.
  //
  // What was here before was a "Copy link ↗" button that called
  // navigator.clipboard.writeText and said NOTHING afterwards — no toast, no
  // state change, no error if the browser refused. Clicking it and clicking a
  // dead button were the same experience, so there was no way to learn which
  // one you had done. Every path below reports what happened.
  // ── OPENING THE PANEL ON THE TRANSITION, NOT AT MOUNT ─────────
  // useState(justSaved) was wrong in both directions, and wrong in the useful
  // one. saveGuide navigates /guide/new → /guide/:id WITHOUT unmounting this
  // component (that is what the liveGuide comment below is about), so the
  // initialiser had already run with justSaved false and the panel never opened
  // on the one path that sets it. Meanwhile history.state SURVIVES A RELOAD, so
  // pressing F5 on the guide an hour later remounted with justSaved true and
  // announced "Saved." all over again. The only case it fired was the wrong one.
  //
  // Same class of bug as keptAlready below, which reads guideId. Anything
  // derived from route state in here needs an effect, not an initialiser.
  const [shareOpen, setShareOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!location.state?.justSaved) return;
    setShareOpen(true);
    setJustSaved(true);
    // Consume it: replace the history entry with the same guide and no flag, so
    // a reload shows the guide rather than re-announcing the save. The guide
    // stays in state, so nothing refetches. Re-running this effect is harmless
    // because the flag it keys on is now gone.
    navigate(location.pathname, { replace: true, state: { guide: location.state.guide } });
  }, [location]);
  const [copied, setCopied] = useState(null);
  const urlRef = useRef(null);
  const copyTimer = useRef(null);
  // Read once: navigator.share disappearing mid-session is not a thing, and
  // reading it during render on every keystroke is pointless work.
  const [canSend] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  // Built from the id this page is actually showing, on the origin it is
  // actually running on. Not window.location.href, which would carry whatever
  // query string the person happened to arrive with; not a hardcoded domain,
  // which would send somebody testing on localhost to production.
  const shareUrl = typeof window === "undefined" ? ""
    : guideId ? `${window.location.origin}/guide/${guideId}`
      : window.location.origin + window.location.pathname;

  const copyLink = async () => {
    clearTimeout(copyTimer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard api");
      await navigator.clipboard.writeText(shareUrl);
      setCopied("done");
      // "✓ Copied" is a confirmation and has a job that is finished in two
      // seconds. The refusal message below is an instruction, so it STAYS —
      // clearing it on a timer left somebody reading it halfway through with a
      // Copy button that had visibly done nothing, which is the exact dead end
      // this whole change set out to remove. Timer is held in a ref so a second
      // click cannot have its confirmation cancelled by the first one's timeout.
      copyTimer.current = setTimeout(() => setCopied(null), 2600);
    } catch {
      // An insecure context, an old browser, or a refused permission. Select
      // the field so the link is one keystroke away instead of telling somebody
      // it failed and leaving them there.
      try { urlRef.current?.select(); } catch { /* ignore */ }
      setCopied("manual");
    }
  };
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const sendLink = async () => {
    if (!canSend) return copyLink();
    try {
      await navigator.share({ title: shareTitle(guide), text: shareMessage(guide), url: shareUrl });
    } catch {
      // Closing the share sheet throws AbortError. A person changing their mind
      // is not an error and must not surface as one.
    }
  };

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

  // "Your Saved Guides" on the home page reads this list. saveGuide writes to
  // it, but saveGuide only runs for the person who BUILT the trip — so the
  // friend who opened the link had nowhere to put it. Same list, same shape.
  const keptCheck = (id) => {
    try { return JSON.parse(localStorage.getItem("gemlyx_saved_guides") || "[]").some(g => g && g.id === id); }
    catch { return false; }
  };
  // Initialised AND re-checked, because guideId changes under this component:
  // the page starts life at /guide/new with no id, and saveGuide navigates it
  // to /guide/:id without unmounting. Read only at mount, this said "＋ Keep"
  // to the very person who had just saved the guide.
  const [keptAlready, setKeptAlready] = useState(() => keptCheck(guideId));
  useEffect(() => { setKeptAlready(keptCheck(guideId)); }, [guideId]);
  const keepGuide = () => {
    if (!guide || !guideId) return;
    try {
      const list = JSON.parse(localStorage.getItem("gemlyx_saved_guides") || "[]");
      if (list.some(g => g && g.id === guideId)) { setKeptAlready(true); return; }
      // arrivalDate is the one field the LIST itself reads rather than the guide:
      // App.jsx's checkSavedGuidesWeather walks the saved rows and lines each day
      // up against the forecast from it. Without it a kept guide is skipped
      // silently and its owner never hears that the rain moved. The trip itself
      // does not need to be copied here, because a string id means the full
      // payload is already in gemlyx_guides and openSavedGuide routes to it.
      const updated = [{ id: guideId, title: guide.title, days: guide.days, savedAt: new Date().toISOString(), arrivalDate: guide._arrivalDate || null }, ...list].slice(0, 20);
      localStorage.setItem("gemlyx_saved_guides", JSON.stringify(updated));
      setKeptAlready(true);
    } catch { /* a full or blocked localStorage is not worth an error message here */ }
  };
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
        //
        // ── AND _planProblems, FOR THE SAME REASON ────────────────────
        // Added 12 Aug 2026. The guide's logistics gates write their findings
        // into planProblems, and those are notes to HIM in the pipeline's own
        // voice: "This suggests a bus for the last leg, and the last leg was
        // MEASURED at 8 minutes on foot from Ribe Station." Nothing renders
        // them, so this is not a display leak, but they were being written into
        // the saved payload of every shared guide and sent to every browser
        // that opens the link. The same night's Studio fix moved the identical
        // findings out of `uncertainties` for the identical reason; this is the
        // other half of it, on the pipeline he cares about most.
        body: JSON.stringify({ id, payload: (({ _testProfile, _testPlan, _planProblems, ...rest }) => rest)(guide) }),
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
        const updated = [{ id, title: guide.title, days: guide.days, savedAt: new Date().toISOString(), arrivalDate: guide._arrivalDate || null }, ...bookmarks].slice(0, 20);
        localStorage.setItem("gemlyx_saved_guides", JSON.stringify(updated));
      } catch { /* bookmark list is a convenience, never block the real save over it */ }
      // The guide travels WITH the navigation for two reasons. It skips the
      // refetch-from-Supabase flash on a page the person has been staring at
      // for a minute already, and justSaved opens the share panel — the moment
      // somebody actually wants to send a trip is the second it becomes real,
      // not whenever they think to look for a button.
      navigate(`/guide/${id}`, { replace: true, state: { guide, justSaved: true } });
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
    const prompt = `You are Gemlyx's Local Assist, continuing to help with a Denmark trip after the itinerary below was already built. Answer naturally and conversationally, like a knowledgeable local friend giving real advice — never claim to have personally visited a place. You're a genuinely happy, upbeat guy who loves helping; a fitting emoji or two per reply is welcome where it adds warmth, never a wall of them. Never use em dashes or en dashes anywhere in your reply. Keep answers focused and reasonably short unless the question genuinely needs more detail. If asked to change the itinerary itself, explain what you'd change in words — you can't directly edit this saved guide from here, so tell them to describe the change back on the main planning chat to rebuild it.\n\nTHE TRIP ALREADY BUILT:\nTitle: ${guide.title || "Untitled trip"}\n${stopList}${guide.essentials ? `\nBudget: ${guide.essentials.budgetReality || ""}\nGetting around: ${guide.essentials.transportTip || ""}\nKeep in mind: ${guide.essentials.keepInMind || ""}` : ""}\n\nCONVERSATION SO FAR:\n${convoText}\n\nRespond to the traveler's last message.${languageBlock()}`;
    const result = await askClaude(prompt, 500);
    setChatMessages(prev => [...prev, { role: "assistant", text: result.error ? "Sorry, I couldn't get an answer just now, try again in a moment." : result.text }]);
    setChatLoading(false);
  };

  // ── THE PIN A READER TAPPED, AND OUR OWN PLACES TO PUT BESIDE IT ──
  // Declared UP HERE, with every other hook, and the reason is written out at
  // length below: three hooks once sat under `if (loading) return` and broke every
  // shared guide link in the product. The suite has guarded that ever since, and it
  // caught these three within a minute of my writing them in the wrong place.
  //
  // mapLibrary is every published row carrying a real coordinate, towns excluded:
  // "close to Copenhagen" is not a fact worth printing on a pin already in
  // Copenhagen. previewPools is the same library the preview screen matches
  // against, so the map cannot show something the rest of the app does not have.
  //
  // libraryTick is READ in the memo, not merely set. ensureLiveContentLoaded fills
  // the imported arrays in place, so the list is empty on first paint and correct a
  // moment later, and a state variable nothing reads is a re-render that never
  // happens.
  const [mapPin, setMapPin] = useState(null);
  const [libraryTick, setLibraryTick] = useState(0);
  useEffect(() => { ensureLiveContentLoaded().then(() => setLibraryTick(t => t + 1)).catch(() => {}); }, []);
  const mapLibrary = useMemo(
    () => placedLibrary(previewPools({
      towns, freeEntrance, foodSpots, nightlifeSpots, craftItemsFallback, events, majorEvents,
    })),
    [libraryTick],
  );

  // The header photograph, up here for the same reason and on the same
  // libraryTick: lookupRealPlace reads the imported arrays, which are empty on
  // first paint, so without the tick a guide would render its plain header once
  // and never pick the picture up. `guide` is in the dependency list because a
  // shared link resolves it asynchronously too.
  const hero = useMemo(() => guideHero(guide, lookupRealPlace), [guide, libraryTick]);

  // ── EVERY HOOK LIVES ABOVE THE EARLY RETURNS ────────────────────
  // These three used to sit BELOW `if (loading) return` and
  // `if (loadError || !guide) return`, which is a hooks-order violation and it
  // broke every shared guide link in the product.
  //
  // The sequence: someone opens /guide/:id cold, from a WhatsApp link, a
  // bookmark or a search result. freshGuide is null, so `loading` starts true,
  // render one bails at the loading guard having mounted 22 hooks. The Supabase
  // fetch resolves, setGuide and setLoading(false) commit together, render two
  // falls past both guards and reaches hook 23. React throws "Rendered more
  // hooks than during the previous render", the ErrorBoundary catches it, and
  // the recipient is told "Something broke on our end". Reloading re-runs the
  // identical path, so it is a permanent dead end rather than a glitch.
  //
  // WHY NOBODY SAW IT. The person who built the guide never hits it: saving
  // navigates with the guide in router state, so freshGuide is set and loading
  // was false from the first render. And a BROKEN id sets loadError, which
  // returns at the second guard with the same 22 hooks and renders "Guide not
  // found" perfectly. Only a VALID shared link crashes, which is the one case
  // that never gets tested by hand because it looks like the working case.
  //
  // `days` is derived here rather than read from the const below, because that
  // const is declared after the guards and cannot be reached from up here.
  // A saved guide's weather is frozen at the moment it was built, so a trip
  // saved in August still shows August's answer when it is opened in October.
  // Re-checking on open fixes that with no cron and no subscriber list, and it
  // makes the forecast ARRIVE on its own: a guide saved fourteen weeks out
  // shows ten year averages, and the same guide opened the week before flying
  // has crossed into the forecast window and shows a real forecast, with
  // nobody having done anything. See utils/weather.js for what this honestly
  // does not do, which is tell somebody who never opens the app.
  const [freshWeather, setFreshWeather] = useState(null);
  const [weatherMoved, setWeatherMoved] = useState([]);
  useEffect(() => {
    const days = guide?.days || [];
    if (!guide || !Array.isArray(days) || !days.length) return;
    if (!weatherIsStale(guide._weatherFetchedAt)) return;
    let cancelled = false;
    // dayStart, not new Date: an arrival is stored as a calendar day now, and
    // the legacy timestamp form still reads as the local day it used to.
    const arrival = dayStart(guide._arrivalDate);
    // daysUntil, not the subtraction written out again. `new Date(arrival)` was a
    // clone and the setHours a no-op on a value dayStart had already normalised,
    // so this read as a raw parse of a stored date while being harmless, which is
    // the worst of both: it teaches the shape without paying for it.
    const startOffset = arrival ? Math.max(0, daysUntil(arrival)) : 0;
    (async () => {
      const next = await Promise.all(days.map(async (d, i) => {
        const st = (d.stops || []).map(x => resolveStopCoords(x.name, guide._geo || {}, x.town)).find(Boolean);
        if (!st) return d.weather || null;
        // The same shared primitive App.jsx's build path uses, so the weather
        // baked into a guide and the weather refreshed when it is reopened are
        // computed for the same day. See dayPlus in utils/calendarDay.js.
        const on = dayPlus(arrival || new Date(), i);
        return await dayWeather({
          point: st, date: on, daysOut: startOffset + i,
          fetchJson: (url) => fetch(url).then(r => r.json()).catch(() => null),
        }) || d.weather || null;
      }));
      if (cancelled) return;
      setFreshWeather(next);
      setWeatherMoved(weatherChanges(days.map(d => d.weather), next));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?._gid, guide?._weatherFetchedAt, (guide?.days || []).length]);

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

  // ── WHICH DAY CROSSES WHICH BELT ────────────────────────────────
  // Computed once for the whole page rather than per day, because a crossing is
  // a fact about a PAIR of days and asking day 3 about it means also resolving
  // day 4. See utils/weatherWarn.js for why only the Great Belt and the
  // Bornholm ferry produce a warning and the other crossings deliberately
  // produce nothing.
  //
  // partOfCountry answers off the kommune map, which is why it is trusted here:
  // it is the same function the towns page filters on, and it returns null
  // rather than guessing when a coordinate cannot be placed. A null breaks the
  // chain in dayCrossings instead of being guessed through.
  const dayParts = days.map(d => {
    const c = (d.stops || [])
      .map(st => resolveStopCoords(st.name, guide._geo || {}, stopTown(st, lookupRealPlace(st.name))))
      .find(Boolean);
    return c ? partOfCountry({ __lat: c.lat, __lon: c.lon }) : null;
  });
  const crossings = dayCrossings(dayParts);
  // The traveller's own stated mode, which decides whether 12 m/s is a footnote
  // or the whole character of the day. Same field returnLeg and overnightMove
  // read, so a bike trip cannot get a driver's wind line on one card and a
  // cyclist's on the next.
  const tripMode = guide._mode || null;

  // ── ONE MAP, NOT SIX ────────────────────────────────────────────
  // Oliver, 7 Aug 2026: "damn, it looks so overwhelming. Let's make the leaflet
  // map more simple on the Gemlyx Guide. Have one big map at the top or bottom
  // that shows the entire road on map."
  //
  // Measured on his five day guide before this change: six separate Leaflet
  // maps on one page, 6153 pixels tall. Each one showed a single day in
  // isolation, so the thing a person most wants to see, the SHAPE of the trip
  // across Denmark, was the one thing no map showed. Six tile layers is also
  // six sets of network requests and six Leaflet instances for less
  // information than one map carries.
  //
  // His scaling rule needs no code: "If it is multiple towns in Zealand, then
  // show all of Zealand. If it's multiple towns around Denmark, then show
  // Denmark. If it's just in Copenhagen, then show the places around
  // Copenhagen." That is fitBounds, which GuideRouteMap already does, with a
  // maxZoom so a tight cluster does not end up at street level. Feed it every
  // stop and the right scale falls out of the geometry.
  //
  // The per-day leg chips stay exactly where they are. He asked to keep the
  // transport visible and it is the thing first-time visitors need most.
  // ── "IT SHOULD BE TRACKING EVERYDAY FOR THEM" ──────────────────

  const tripGeo = guide._geo || {};
  const allStops = days.flatMap((d, di) => (d.stops || []).map(st => ({ ...st, _day: d.day || di + 1 })));
  // ── A PIN THAT IS A TOWN CENTRE MUST NOT LOOK LIKE A VENUE ──────
  // Oliver, 10 Aug 2026: "coordination is off", and "if we screw
  // coordinations, it might hurt our guide too". He is right, and this is the
  // sharpest version of it.
  //
  // resolveStopCoordsDetailed has always returned a `precise` flag saying
  // whether a coordinate is the real place or the crude town-centre fallback.
  // Two things in this codebase read it, both distance checks. Every PIN on
  // every map used resolveStopCoords, which computes that flag and throws it
  // away, so a stop that Nominatim could not find was plotted at the middle of
  // its town and labelled "Day 3 · Samsø Island Distillery".
  //
  // That is not a small inaccuracy, it is the map asserting something nobody
  // checked, in the one place a reader trusts completely. A pin is a claim
  // about where a thing is.
  //
  // Now it is kept, and an approximate pin says so: drawn differently, named
  // for the town it was approximated to, and counted under the map beside the
  // stops that could not be placed at all. Same rule as that line, which this
  // file already got right: never a silently shorter or a silently vaguer map.
  const tripPoints = allStops.map(st => {
    // st.town is what the planner said this stop is in, and the schema marks
    // it REQUIRED for exactly this reason. Passing it is what stops a
    // coordinate about somewhere else being drawn as a confident pin.
    const c = resolveStopCoordsDetailed(st.name, tripGeo, st.town);
    if (!c) return null;
    // Labelled with the day so one pin in a fourteen stop route still says
    // WHEN as well as where.
    // Labelled from the SAME function that chose the point, so the name under
    // the pin is always the town the pin is actually at.
    const town = c.precise ? null : (townFallbackFor(st.town, st.name)?.key || null);
    return {
      name: `Day ${st._day} · ${st.name}${c.precise ? "" : town ? ` (somewhere in ${town})` : " (approximate)"}`,
      stopName: st.name,
      approx: !c.precise,
      town,
      lat: c.lat,
      lon: c.lon,
    };
  });
  // ── A STOP WITH NO COORDINATES IS DROPPED, SILENTLY ────────────
  // The other half of the missing-Odense report, and the more important half.
  // resolveStopCoords returns null for anything it cannot place, and this list
  // was filtered with a bare .filter(Boolean), so a stop that failed to
  // geocode simply stopped existing on the map. No warning, no gap, just a
  // shorter route that looks complete. That is the exact shape this project
  // keeps finding: a silent failure that looks like a working feature.
  //
  // Counted rather than hidden, and printed under the map, because "3 towns"
  // above a map showing two is the thing that makes a founder distrust the
  // whole page.
  const tripUnplaced = allStops.filter((st, i) => !tripPoints[i]).map(st => st.name);
  const tripPlaced = tripPoints.filter(Boolean);
  // Consecutive duplicates are the same place twice (an overnight stop that is
  // also the next morning's start). One pin, not two stacked on each other.
  const tripRoute = tripPlaced.filter((p, i) => i === 0 || Math.abs(p.lat - tripPlaced[i - 1].lat) > 1e-6 || Math.abs(p.lon - tripPlaced[i - 1].lon) > 1e-6);
  // ── COUNTED OFF WHAT IS DRAWN, NOT OFF WHAT WAS PLACED ────────────
  // This read tripPoints, i.e. BEFORE the dedupe on the line above, so it could
  // name a pin that is not on the map. Oliver's screenshot: "2 pins are
  // approximate: Tivoli Christmas market, Amalienborg", on a map where the second
  // of any consecutive pair had already been collapsed away. The note counted
  // stops; the map draws points.
  const tripApprox = tripRoute.filter(p => p.approx).map(p => p.stopName);
  // ── AND WHICH PIN A STOP IS, IF IT IS ONE ─────────────────────────
  // Read off tripRoute itself, so the number under the map and the number ON the
  // map cannot drift. Two stops in one place collapse to one pin by design, and
  // both cards then point at that pin, which is the truth: it is one dot.
  const pinNumber = (stop) => {
    const name = String(stop?.name || "");
    if (!name) return null;
    const at = tripRoute.findIndex(p => String(p.stopName || p.name || "") === name);
    return at < 0 ? null : at + 1;
  };
  // How many stops the dedupe removed, said out loud rather than left as a map
  // that is quietly shorter than the list. The unplaced note below covers the
  // other reason a stop is missing; this covers the one nothing mentioned.
  const tripCollapsed = tripPlaced.length - tripRoute.length;
  const tripLegs = tripRoute.slice(0, -1).map((p, i) => ({
    mode: resolveLegMode(null, guide._mode, p.name, tripRoute[i + 1].name, guide._onlyWalking, tripGeo),
  }));

  return (
    // overflowX clip, not hidden: `hidden` on an ancestor turns every sticky
    // child into a non-sticky one, and this page's header and save bar are
    // both sticky. `clip` stops the sideways scroll without that side effect.
    // Oliver's screenshot has the header clipped to "ack" at the left edge,
    // which only happens when the document itself is scrolled sideways, and
    // that also drags the corner launcher out past the window.
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 60, overflowX: "clip", maxWidth: "100%" }}>
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
          <div style={{ display: "flex", gap: 8 }}>
            {/* Someone who opened a link a friend sent them had no way to keep
                it: the bookmark into "Your Saved Guides" only ever happened
                inside saveGuide, which only the person who BUILT the trip runs.
                A shared guide that the recipient cannot keep is a dead end. */}
            {guideId && !keptAlready && (
              <button onClick={keepGuide}
                style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                ＋ Keep
              </button>
            )}
            {guideId && keptAlready && (
              <span style={{ color: C.muted, fontSize: 12.5, fontWeight: 700, padding: "8px 4px" }}>✓ Kept</span>
            )}
            <button onClick={() => setShareOpen(o => !o)}
              style={{ background: shareOpen ? C.surface : "none", border: `1px solid ${shareOpen ? C.gold + "77" : C.border}`, color: shareOpen ? C.gold : C.light, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              Share ↗
            </button>
          </div>
        )}
      </div>

      {/* ── THE SHARE PANEL ──────────────────────────────────────────
          Under the header rather than floating over it: a dropdown here would
          have to win a z-index argument with the sticky bar, the chat launcher
          and the save bar, all of which already collided once (see the PASS 27
          comment further down). Pushing the page down cannot collide with
          anything. */}
      {shareOpen && !isUnsaved && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "18px 16px 20px" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, marginBottom: 3 }}>
              {justSaved ? "Saved. This link is your guide." : "Send this to whoever you're travelling with."}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 13, maxWidth: 520 }}>
              Anyone with the link can open it, on any device. Nobody needs an account, and it does not expire.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {/* The FULL url including https://, not a prettified one. When
                  the clipboard is refused, this field is what a person copies
                  by hand, and a scheme-less link pasted into an email body is
                  not always linkified. */}
              <input ref={urlRef} readOnly value={shareUrl}
                onFocus={e => e.target.select()}
                style={{ flex: "1 1 260px", minWidth: 0, background: C.bg, border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "10px 16px", fontSize: 12.5, fontFamily: "'Inter', sans-serif" }} />
              <button onClick={copyLink}
                style={{ background: copied === "done" ? C.gold : "none", border: `1px solid ${copied === "done" ? C.gold : C.border}`, color: copied === "done" ? C.onGold : C.light, borderRadius: 100, padding: "10px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                {copied === "done" ? "✓ Copied" : "Copy link"}
              </button>
              {canSend && (
                <button onClick={sendLink}
                  style={{ background: `linear-gradient(135deg, ${C.accent}, #C22A3C)`, color: "#fff", border: "none", borderRadius: 100, padding: "10px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  Send ↗
                </button>
              )}
            </div>
            {/* The clipboard can be refused: an insecure context, an old
                browser, a denied permission. Saying nothing is what the old
                button did. Naming it, and pointing at the link that is now
                selected, is the difference between a failure and a dead end.
                Not "press Ctrl+C" — half the people reading this are on a Mac. */}
            {copied === "manual" && (
              <div style={{ fontSize: 12, color: C.gold, marginTop: 9 }}>
                Your browser wouldn't let the page copy for you. The link is selected above, so copy it by hand.
              </div>
            )}
            {/* Desktop has no share sheet, and "copy it then go and find the
                app yourself" is where a share flow loses people. These two
                cover almost everything a trip actually gets sent through. */}
            {!canSend && (
              <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
                <a href={`https://wa.me/?text=${encodeURIComponent(`${shareMessage(guide)} ${shareUrl}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, textDecoration: "none" }}>WhatsApp ↗</a>
                <a href={`mailto:?subject=${encodeURIComponent(shareTitle(guide))}&body=${encodeURIComponent(`${shareMessage(guide)}\n\n${shareUrl}`)}`}
                  style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, textDecoration: "none" }}>Email ↗</a>
              </div>
            )}
            {/* The rule stated where the action is, which is the only place a
                rule in a terms page ever actually lands. Note that every target
                this panel offers — the native sheet, WhatsApp, email — is
                person to person, so the panel and the rule already agree: this
                is for the people coming with you. */}
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 12, lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              For the people coming with you. Posting the guide publicly or republishing the text is not allowed.
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 16px 28px" }}>
        {/* Redesign pass: kicker + roomier title, and the essentials box became a
            labeled "Before you go" card instead of three anonymous ◆ bullet lines —
            same data, but each line now says what KIND of tip it is at a glance. */}
        {/* ── THE PICTURE BEHIND THE TITLE ───────────────────────────
            Oliver, 17 Aug 2026: "I wonder if we should get a picture of
            something Danish in the background when the guide is given."

            Right that the page opens on nothing, and the literal version would be
            wrong: a stock Nyhavn behind a bicycle trip from Aalborg to Skagen is a
            photograph of somewhere they are not going, unsourced, sitting above a
            page where every price is traced and every distance measured. So it is
            their OWN first stop, from a row he published himself, with the credit
            the licence requires. A different picture on every guide, no research
            and no new API call. utils/guideHero.js carries the full argument.

            No photograph anywhere in the trip means no header image. Never a stock
            fallback: that would put a picture of somewhere they are not going on
            exactly the guides where we know least. */}
        {hero?.photo && (
          <div style={{ position: "relative", height: 260, borderRadius: 18, overflow: "hidden", marginBottom: 18, border: `1px solid ${C.border}` }}>
            <img src={hero.photo} alt={heroCaption(hero) || "A place on this trip"}
              onError={e => { e.target.style.display = "none"; }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* A scrim, not a flat overlay: the title sits over the bottom third
                and text on a photograph without one is unreadable on whichever
                image happens to be bright exactly there. */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,15,30,0.92) 0%, rgba(10,15,30,0.45) 45%, rgba(10,15,30,0.15) 100%)" }} />
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>✦ Your Gemlyx guide</div>
              <div style={{ fontSize: 34, fontWeight: 500, fontFamily: "'Fraunces', serif", color: "#fff", lineHeight: 1.1, maxWidth: 680, textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}>{guide.title || "Your Denmark Guide"}</div>
              {/* Said out loud. An unlabelled photograph on a page about where to
                  go is a decoration; a labelled one is information. */}
              {heroCaption(hero) && (
                <div style={{ fontSize: 11, color: "#E8ECF6", opacity: 0.9, marginTop: 7 }}>{heroCaption(hero)}</div>
              )}
            </div>
          </div>
        )}
        {/* CC BY and CC BY-SA require attribution reasonably near the work, so a
            photograph promoted to a header takes its credit up with it. */}
        {hero?.photo && (
          <PhotoCredit photo={hero.photo} credit={hero.credit} style={{ marginTop: -10, marginBottom: 16 }} />
        )}

        {/* Still exactly the old header on any guide whose stops have no
            photograph between them. */}
        {!hero?.photo && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>✦ Your Gemlyx guide</div>
            <div style={{ fontSize: 36, fontWeight: 500, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.1, marginBottom: lightMode ? 10 : 24, maxWidth: 680 }}>{guide.title || "Your Denmark Guide"}</div>
          </>
        )}
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
        {/* ── WHAT KIND OF TRIP, BEFORE HOW BIG ──────────────────────
            The numbers below answer "how big" and dodge "what shape". Both are
            counted from the plan, never written by a model, and both stay
            silent rather than guess. The scale line is the one a first-time
            visitor needs most: 38 minutes means nothing until you know that in
            Denmark it is a long way. */}
        {(() => {
          const character = tripCharacter(guide, shape);
          const scale = tripScaleLine(shape);
          if (!character && !scale) return null;
          return (
            <div style={{ marginBottom: 20, maxWidth: 640 }}>
              {character && <div style={{ fontSize: 15.5, color: C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.45 }}>{character}</div>}
              {scale && <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 5 }}>{scale}</div>}
            </div>
          );
        })()}

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
        {/* Five days, not three: on a short guide these are three buttons
            that scroll past what they are covering. */}
        {days.length >= 5 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 26 }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => document.getElementById(`gx-day-${d.day || i + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 13px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                Day {d.day || i + 1}
              </button>
            ))}
          </div>
        )}

        {!lightMode && tripRoute.length > 1 && (
          <div style={{ marginBottom: 28, maxWidth: 640 }}>
            {/* ── FLY DOWN, AND SAY WHERE YOU LANDED ────────────────────
                Oliver, 17 Aug 2026: "Can you make a design that when you click on
                one of them, you instantly fly down to the area? And then it pops up
                in the right corner where you read shortly about its location."

                The card sits INSIDE the map's box, top right, over the tiles,
                because the point is that it belongs to the pin you just tapped.

                Not one word of it is written by a model. describeLocation is
                arithmetic: haversine between this pin and the coordinates of rows
                he published himself, phrased. On a map, which is the surface a
                reader trusts most, an invented "close to King's Garden" would be
                the same class of claim as the restaurant the chat quoted out of a
                model's memory this morning. The sentence can be dull. It cannot be
                wrong, and it gets better as his library grows. */}
            <div style={{ height: 320, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, position: "relative" }}>
              <GuideRouteMap
                points={tripRoute}
                legs={tripLegs}
                nearby={mapLibrary}
                selectedName={mapPin?.name || ""}
                onSelect={setMapPin}
              />
              {mapPin && (
                <div style={{
                  position: "absolute", top: 10, right: 10, zIndex: 500, maxWidth: 232,
                  background: C.scrim, backdropFilter: "blur(6px)",
                  border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.25, flex: 1 }}>
                      {mapPin.name}
                    </div>
                    <button
                      onClick={() => setMapPin(null)}
                      aria-label="Close this pin"
                      style={{ background: "transparent", border: 0, color: C.muted, fontSize: 15, lineHeight: 1, cursor: "pointer", padding: 2 }}
                    >×</button>
                  </div>
                  <div style={{ fontSize: 11, color: C.light, lineHeight: 1.55, marginTop: 5 }}>
                    {describeLocation(mapPin, nearbyPublished(mapPin, mapLibrary, { exclude: mapPin.name }), { town: mapPin.town })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 7 }}>
              The whole route, numbered in order. Tap a pin to fly down to it, and zoom in to see what else of ours is nearby.
            </div>
            {/* Said out loud rather than left as a shorter map. A stop with no
                coordinate used to vanish from here with nothing to show it
                had, which is how a route naming three towns drew two. */}
            {tripUnplaced.length > 0 && (
              <div style={{ fontSize: 11, color: "#FFB347", marginTop: 5, lineHeight: 1.55 }}>
                {tripUnplaced.length === 1 ? "One stop is not on this map" : `${tripUnplaced.length} stops are not on this map`}, because we could not place {tripUnplaced.length === 1 ? "it" : "them"} on a coordinate: {tripUnplaced.join(", ")}. {tripUnplaced.length === 1 ? "It is" : "They are"} still in the day-by-day below.
              </div>
            )}
            {tripCollapsed > 0 && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
                {tripCollapsed === 1 ? "One stop shares a pin" : `${tripCollapsed} stops share a pin`} with the stop before it, because they are the same place. That is why the highest number here is lower than the number of stops.
              </div>
            )}
            {tripApprox.length > 0 && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                {tripApprox.length === 1 ? "One pin is approximate" : `${tripApprox.length} pins are approximate`}: {tripApprox.join(", ")}. We could not place {tripApprox.length === 1 ? "it" : "them"} exactly, so {tripApprox.length === 1 ? "it sits" : "they sit"} at the middle of the town rather than at the door. The dashed outline on the map marks {tripApprox.length === 1 ? "it" : "them"}.
              </div>
            )}
          </div>
        )}

        {/* ── DECISIONS, NOT INFORMATION ─────────────────────────────
            The real anxiety of a first trip abroad is not what to see, it is
            what you have to sort out before you go. Only things the guide can
            genuinely stand up appear here: a dated event, a ferry, a bed.
            Nothing pads it out, because a "book ahead" list that repeats itself
            is one a traveler learns to skip. */}
        {(() => {
          const actions = bookingActions(guide, lookupRealPlace);
          if (actions.length === 0) return null;
          return (
            <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}44`, borderRadius: 16, padding: "16px 18px", marginBottom: 26, maxWidth: 640 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>Book before you go</div>
              {actions.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: i === actions.length - 1 ? 0 : 9 }}>
                  <span style={{ color: C.accent, fontSize: 12 }}>◆</span>
                  <span style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>
                    <b style={{ color: C.text }}>{a.what}.</b> {a.why}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {guide.essentials && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 30, maxWidth: 640 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>Before you go</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* ── WHAT A HUNDRED KRONER IS WORTH, ONCE ──────────
                  Oliver, 21 Aug 2026: "In the create an account, ask what
                  country they're from. Because then the guide can probably
                  write in their currency."

                  He asked for that immediately after reading "hostels here run
                  around DKK 600/night while central hotels start near $200" in
                  one of his own guides and judging it "just not true at all".
                  Every price in this guide is in DKK and stays that way, because
                  that is what he will be charged at the desk. This is the one
                  conversion, given once, so he can calibrate the rest himself.

                  STAMPED, NOT LIVE. The rate and the date it was published are
                  baked onto the guide at build time, so a guide saved tonight
                  and opened in March still says which day its number is from
                  instead of quietly showing March's rate under tonight's trip.
                  Absent whenever the rate could not be fetched, and a guide with
                  no rate line is still completely correct. */}
              {guide._fx?.amount > 0 && (
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0, width: 92 }}>Kroner</span>
                  <span style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>
                    Everything here is priced in DKK, which is what you will actually be charged. {guide._fx.baseAmount} DKK was about {guide._fx.amount} {guide._fx.to}{guide._fx.on ? ` on ${guide._fx.on}` : ""}, so rates will have moved a little by the time you travel.
                  </span>
                </div>
              )}
              {[["Money", guide.essentials.budgetReality], ["Getting around", guide.essentials.transportTip], ["Keep in mind", guide.essentials.keepInMind], ["Weather", guide.essentials.weatherNote]].filter(([, v]) => v).map(([label, v]) => (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0, width: 92 }}>{label}</span>
                  <span style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>{v}</span>
                </div>
              ))}
              {/* ── TICKETS, ONCE PER GUIDE ────────────────────────
                  Oliver, 15 Aug 2026: "We need these implemented into
                  essentials and the guide."

                  HERE AND NOT ON EVERY DAY CARD, which was the obvious place
                  and is the wrong one. "Where to stay" repeats per day because
                  the answer genuinely changes per day: a different town, a
                  different date range, a different search. Tickets do not. The
                  same booking link under all seven days is the same link seven
                  times, and a reader learns to scroll past it, which costs the
                  clicks it was added to earn.

                  A BROWSE LINK, and the wording has to match that. It goes to
                  Tiqets and not to any one attraction, so it says "browse" and
                  never promises a particular place. Once the deep link
                  template is filled in, an attraction card can link to its own
                  tickets and this stays what it is: the general one.

                  Nothing renders when the link is not configured, rather than
                  a dead row, and the disclosure is printed from the link
                  itself rather than typed here, so it cannot say "this pays
                  us" over a link that does not. */}
              {(() => {
                const href = tiqetsBrowseUrl();
                if (!href) return null;
                const note = partnerDisclosure(href);
                return (
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0, width: 92 }}>Tickets</span>
                    <span style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>
                      Denmark's bigger attractions take timed entry in summer, so the queue is the thing worth planning around rather than availability. Buy direct from the attraction where you can.
                      <a href={href} target="_blank" rel={note ? "noreferrer sponsored nofollow" : "noreferrer"}
                        style={{ display: "block", marginTop: 5, color: C.gold, fontWeight: 700, textDecoration: "none" }}>
                        🎫 Browse Danish attraction tickets ↗
                      </a>
                      {note && <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>{note}</div>}
                    </span>
                  </div>
                );
              })()}
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
          // ── AND A NAME ALONE DOES NOT ANSWER HIS QUESTION ──────
          // "Did they include events" was answered with a list of names, which
          // is the same gap the stop cards had: Tivoli Halloween in a September
          // plan reads as a hit here and is a miss on the ground. The window
          // comes along, and so does a flag when the day the planner chose is
          // outside it, because this panel is where that gets noticed.
          const eventStops = (guide.days || [])
            .flatMap((d, i) => (d.stops || []).map(s => ({ s, dayNo: d.day || i + 1 })))
            .map(x => ({ ...x, real: lookupRealPlace(x.s.name) }))
            .filter(x => x.real?._src === "event")
            .map(x => {
              const w = stopEventWhen(x.real, tripDayDate(guide._arrivalDate, x.dayNo));
              if (!w) return x.s.name;
              return `${x.s.name} (${w.runs}${w.offWindow ? `, NOT on day ${x.dayNo}` : ""})`;
            });
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

        {/* Only what is worth interrupting somebody for. A degree of drift is
            not news; a dry day turning wet is, because it decides whether they
            take the walking day or the museum day. */}
        {weatherMoved.length > 0 && (
          <div style={{ background: C.surface, border: "1px solid #FFB34766", borderRadius: 12, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: C.text, lineHeight: 1.6 }}>
            <b style={{ color: "#FFB347" }}>The forecast moved since you saved this.</b> {weatherMoved.join(". ")}.
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
          // The calendar day this day of the trip falls on, computed ONCE for
          // the whole day and read by both the stop cards and the "Where to
          // stay" booking link below. It used to be built inside that booking
          // block alone, which was fine while it had one reader. See
          // tripDayDate in utils/guideReading.js for why it is not inline.
          const dayDate = tripDayDate(guide._arrivalDate, day.day || dayIdx + 1);
          // ── ONE BADGE, READ ONCE ──────────────────────────────────
          // This was `(freshWeather?.[dayIdx] || day.weather)` written out TEN
          // times across the badge below, and the repetition was not just
          // noise, it was hiding a crash. One of the ten read
          // `day.weather.years` instead of the resolved badge's — so a day whose
          // refresh-on-open produced a normals badge while the SAVED guide had
          // none (a guide saved before weather worked, or a day whose stop had
          // no coordinate at build time and resolves now) hit
          // `null.years` and took the whole page down on render.
          //
          // Hoisting it makes that impossible to write again, and it is what
          // the warnings below need anyway.
          const wx = freshWeather?.[dayIdx] || day.weather || null;
          // Measured warnings for this day: wind, rain in millimetres, the
          // cold-and-wet pair, frost, heat, what the sky is doing, and the belt
          // crossing if this is the day it happens on. Every one of them cites
          // the number it came from. See utils/weatherWarn.js.
          const wxWarnings = dayWarnings(wx, { mode: tripMode, crossing: crossings[dayIdx] || "" });
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
          // stopTown, not `.town` alone, for the reason written at the card's
          // meta line: the plan fills `town` when it happens to, and our own
          // published row knows the answer either way. This feeds the Maps links
          // and the coordinate resolution, so a stop the plan left untowned was
          // being geocoded on a bare name.
          const stopTownOf = (name) => {
            const s = (day.stops || []).find(x => x.name === name);
            const fromRow = s ? stopTown(s, lookupRealPlace(name)) : "";
            return fromRow || (dayIdx > 0 ? days[dayIdx - 1]?.stops?.slice(-1)[0]?.town : null);
          };
          // ── AND "PRECISE" HAS TO MEAN PRECISE ─────────────────────
          // This promised "NOT the town-center fallback" in its own comment and
          // then returned whatever row lookupRealPlace matched, town centres
          // included, with no look at the `precise` flag and no coordFitsTown.
          // That is how a Maps link for ARoS → Aarhus Ø opened with a bare pair
          // that Google labelled simply "Aarhus": the link and the chip were
          // built from the same wrong point, so they agreed with each other and
          // with nothing on the ground. resolveStopCoordsDetailed answers the
          // question this was trying to ask, and answers it with the flag.
          const preciseCoord = (name) => {
            const d = resolveStopCoordsDetailed(name, geo, stopTownOf(name));
            return d && d.precise ? { lat: d.lat, lon: d.lon } : null;
          };
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
            // ── TIVOLI TO TIVOLI NEEDS NO TRANSPORT ──────────────
            // Oliver, 17 Aug 2026, with a screenshot: "Tivoli Gardens" and
            // "Tivoli Christmas market" as two stops on one day, and between
            // them a chip reading "No direct route, check Rome2Rio". They are the
            // same grounds. The Christmas market IS Tivoli after dark, and the
            // entry's own text says so: "The same grounds transform once the
            // light drops."
            //
            // Nothing below could have caught it. Both stops resolve to the same
            // point, so Google was asked to route from a place to itself, came
            // back with no transit itinerary, and the no-route branch printed the
            // most alarming line in the file.
            //
            // Checked on the DISTANCE first, then on the name, because either one
            // alone misses a case: two stops on one site can carry different
            // coordinates a hundred metres apart, and two stops with the same
            // first word can be genuinely far apart ("Aarhus Domkirke" and
            // "Aarhus Ø"). The distance is the reliable half and the name only
            // speaks when there is no distance to read.
            if (isSameSpot(originName, destName, geo, stopTownOf(originName), (day.stops || []).find(s => s.name === destName)?.town)) {
              return (
                <div style={{ display: "flex", justifyContent: "center", padding: "2px 0 6px" }}>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Same place, nothing to travel</span>
                </div>
              );
            }
            let mode = resolveLegMode(how, guide._mode, originName, destName, guide._onlyWalking, geo);
            // Same-town transit legs are walks even when no coordinates ever
            // resolved (the Ribe VikingeCenter → Ribe Old Town report) — same
            // rule, same town source (stop.town) as fetchExactDurations, so
            // the cache key each computes always matches the other's.
            const legOriginTown = stopTownOf(originName);
            const legDestTown = (day.stops || []).find(s => s.name === destName)?.town;
            if (isSameTownWalk(mode, legOriginTown, legDestTown, how)) mode = "walking";
            // ── A STORED ZERO IS STILL A ZERO ────────────────────
            // Found on the live site minutes after the fix shipped. Refusing to
            // RECORD a zero minute leg stops the next guide having one; it does
            // nothing for the guides already saved carrying
            // "Faaborg Havn|Faaborg Camping|bicycling" at 0 minutes, which is
            // still rendering as "1 min by bike" for a 2.27 km ride. The same
            // rule has to apply on the way out, and then every already-built
            // guide heals the next time someone opens it, exactly like the
            // walking cap below.
            const storedExact = exactDurations[`${originName}|${destName}|${mode}`];
            const rawExact = storedExact && storedExact.durationMinutes >= 1 ? storedExact : null;
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
            const icon = usedMode === "bicycling" ? "🚲" : usedMode === "driving" ? "🚗" : usedMode === "walking" ? "🚶" : isFerryText(how) ? "⛴" : "🚆";
            // legDistanceKm, not kmBetween — when two stops only resolved to
            // the same town centre we do NOT know the distance, and saying so
            // (null → the AI's own leg text, or "Check route") is the honest
            // answer. kmBetween returned 0 there, which estimateDurationText
            // turned into a confident "~1 min" for legs that were really 30:
            // the exact bug Oliver has now reported four times.
            const km = legDistanceKm(originName, destName, geo, legOriginTown, legDestTown);
            const modeLabel = usedMode === "bicycling" ? "by bike" : usedMode === "driving" ? "by car" : usedMode === "walking" ? "on foot" : "by train/bus";
            const routeFailed = noRouteFound[`${originName}|${destName}|${mode}`];
            if (routeFailed) {
              // SHORT-LEG GUARD, also covers guides built before the fetch-side
              // fixes: a "no route" leg that is genuinely close together (or
              // inside one town) is a walk — show a real walking chip with a
              // walking Maps link, never "check Rome2Rio" for a five minute
              // stroll. Rome2Rio stays only for real long-distance dead ends
              // (island crossings needing ferry+train combinations).
              // THE CAP APPLIES HERE TOO, AND DID NOT. This branch accepted any
              // km up to 3, which at the route factor is up to about 54 minutes
              // printed as a "short leg" under a rule that says 20. It is the
              // same mistake as the fallback estimate below it, in the one
              // branch that runs when Google found nothing at all: the less we
              // know about a leg, the more careful the number has to be, not
              // less. walkEstimateTooFar is the single rule for this, already
              // used four lines further down.
              if ((km != null && !walkEstimateTooFar(km)) || (km == null && legOriginTown && legDestTown && legOriginTown.trim().toLowerCase() === legDestTown.trim().toLowerCase())) {
                return (
                  <a href={routeUrl(originName, destName, "walking")} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                    <span style={{ fontSize: 12 }}>🚶</span>
                    <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{km != null ? `${estimateDurationText(km, "walking")} on foot` : "A short walk"}</span>
                    <span style={{ fontSize: 9.5, color: C.light, fontWeight: 700 }}>· Maps ↗</span>
                  </a>
                );
              }
              // ── TWO THINGS WRONG WITH WHAT THIS USED TO SAY ─────────
              // Oliver, 19 Aug 2026, on a live guide: "for some reason there are
              // far more things in the actual guide... it suddenly mentions
              // rome2rio or whatever it is called."
              //
              // FIRST, IT NAMED A COMPETITOR. Rome2Rio is a booking aggregator.
              // Sending a reader off Gemlyx to one, in gold, on the guide they
              // just paid for, is the last link this page should carry. The
              // national journey planner covers every Danish operator at once —
              // trains, buses, the metro and the ferries — which is exactly why
              // operators.js already keeps it as the answer for a crossing where
              // naming one company would be a guess.
              //
              // SECOND, AND WORSE, IT STATED SOMETHING NOBODY CHECKED. "No
              // direct route" is a claim about the world. What actually happened
              // is that Google returned no itinerary for the mode we asked about
              // — and App.jsx's own prompt rules say, in as many words, that this
              // means UNCONFIRMED and NOT "no route exists", because rural Danish
              // bus links and island ferries are frequently missing from the
              // transit feed. The screenshot proves it: this chip sat on
              // Helsingør to Hillerød, a scheduled train the guide's own text
              // describes as "roughly 30-40 minutes with a change".
              //
              // So it says what is true — that this leg needs looking up — and
              // sends them to the authority for it.
              return (
                <a href={OPERATORS.rejseplanen.url} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                  <span style={{ fontSize: 12 }}>🚆</span>
                  <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>Check times on Rejseplanen</span>
                  <span style={{ fontSize: 9.5, color: C.light, fontWeight: 700 }}>↗</span>
                </a>
              );
            }
            // Transit times get an honest "~" even when they come from the real
            // Directions API — a transit journey's duration depends on when you
            // leave (the API answered for "now" at build time), so presenting it
            // as exact is what made "says 19, Maps says 27" feel like a bug
            // rather than schedule variance.
            const exactLabel = exact ? `${usedMode === "transit" ? "~" : ""}${exact.durationText} ${modeLabel}` : null;
            // ── THE CAP HAS TO APPLY TO THE GUESS TOO ────────────
            // Oliver, 9 Aug 2026: "maps still seem to get things wrong",
            // holding "~24 min on foot" for Christiania → Reffen next to
            // Google's 3.2 km and 44 minutes. WALK_MAX_MINUTES was checked
            // on `exact` above and nowhere else, so the branch that runs
            // when there is NO real answer was the one branch allowed to
            // print any walk it liked. With the detour factor now in
            // estimateMinutes the same leg comes out at 38, so it fails
            // here rather than rendering as a stroll. A traveler told 24
            // and handed 44 is not slightly inconvenienced, they have
            // missed something.
            const estIsImpossibleWalk = !exact && usedMode === "walking" && walkEstimateTooFar(km);
            // Nothing verified this leg: no Directions answer, and the two
            // stops never resolved to coordinates we would divide. What is
            // left is the model's own sentence, and the prompt asks it to
            // write "~18 min by bike" whether or not it knows. Shown,
            // because it is usually right and always better than a blank,
            // but never dressed as a measurement.
            const unverified = !exactLabel && !estIsImpossibleWalk && km === null;
            const estLabel = estIsImpossibleWalk
              ? `Too far to walk, check the route`
              : km !== null ? `${estimateDurationText(km, usedMode)} ${modeLabel}` : (how || "Check route");
            // ── "PERHAPS REFER THEM TO FLIXBUS OR DSB" ─────────
            // Oliver, 9 Aug 2026. A chip saying "~1h30 by train/bus" states a
            // fact and leaves the reader to work out who sells that seat, and
            // the Maps link cannot help with that: Google will show them the
            // journey and cannot put them on it. See utils/operators.js for
            // why a ferry gets the national planner and never a company name.
            const ferryLeg = isFerryText(how) || usedMode === "ferry";
            // ── WHICH LANDMASS EACH END OF THIS LEG IS ON ──────
            // Deliberately NOT preciseCoord. A precise coordinate is what the
            // Maps link needs, because the wrong side of a city is a wrong
            // journey. A town centre answers "is this stop in Jutland" perfectly
            // well, and demanding precision here would withhold Kombardo on
            // every leg whose stops only resolved to their town, which is most
            // of them. See isRegionCrossing in utils/operators.js.
            const partAtStop = (nm) => {
              const c = resolveStopCoordsDetailed(nm, geo, stopTownOf(nm));
              const lat = Number(c?.lat), lon = Number(c?.lon);
              return Number.isFinite(lat) && Number.isFinite(lon)
                ? (partOfCountry({ __lat: lat, __lon: lon }) || "")
                : "";
            };
            const ops = operatorsForLeg({
              km, mode: ferryLeg ? "ferry" : usedMode, how,
              fromPart: ferryLeg ? "" : partAtStop(originName),
              toPart: ferryLeg ? "" : partAtStop(destName),
            });
            const opsNote = operatorNote({ mode: ferryLeg ? "ferry" : usedMode, how });
            const chip = (
              <a href={routeUrl(originName, destName, estIsImpossibleWalk ? (guide._mode === "bike" ? "bicycling" : guide._mode === "car" ? "driving" : "transit") : usedMode)} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.bg, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                <span style={{ fontSize: 12 }}>{estIsImpossibleWalk ? "🗺" : icon}</span>
                <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
                  {exactLabel || estLabel}
                </span>
                <span style={{ fontSize: 9.5, color: unverified ? C.muted : C.light, fontWeight: 700 }}>{unverified ? "· Check Maps ↗" : "· Maps ↗"}</span>
              </a>
            );
            // ── AND THE JOURNEY IT ALREADY HAD ───────────────────
            // Oliver, 13 Aug 2026: "Why it is that our drafts refuse to give
            // the reader a proper guide for transport."
            //
            // The answer for the guide was never the ordering: its directions
            // genuinely already run last. It is that /api/directions returns
            // every step with its line, its operator, its two stops and its
            // minutes, fetchExactDurations stores the WHOLE response, and this
            // chip reads two fields out of it. A leg Google described as an IC
            // to Slagelse, a change, then bus 470R to Skælskør Busterminal was
            // sitting in the browser at full detail and reaching the reader as
            // "~1h 59 by train/bus 🚆".
            //
            // Nothing is fetched for this and nothing upstream changes. It
            // prints what was measured, and only when there is something to
            // print: one unnamed ride is already fully described by the chip.
            const journey = exact ? journeyFromStored(exact) : null;
            const steps = journey && worthShowingLegs(journey) ? legSteps(journey) : [];
            const legList = steps.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 340, width: "100%" }}>
                {steps.map((st, i) => (
                  <div key={`${st.kind}-${i}`} style={{ display: "flex", alignItems: "baseline", gap: 7, fontSize: 11, lineHeight: 1.5 }}>
                    <span style={{ fontSize: 10, opacity: 0.75 }}>
                      {st.kind === "walk" ? "🚶" : st.kind === "wait" ? "⏱" : st.vehicle === "ferry" ? "⛴" : st.vehicle === "bus" ? "🚌" : st.vehicle === "metro" ? "🚇" : "🚆"}
                    </span>
                    <span style={{ color: st.kind === "ride" ? C.light : C.muted, flex: 1 }}>
                      {st.text}
                      {st.mins ? <span style={{ color: C.muted }}> · {st.mins} min</span> : null}
                    </span>
                  </div>
                ))}
                {journey.hasFerry && (
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                    {journey.ferries.length
                      ? `Ferry: ${journey.ferries.map(f => [f.line, f.from && f.to ? `${f.from} to ${f.to}` : ""].filter(Boolean).join(", ")).filter(Boolean).join(" · ")}`
                      : "This journey includes a ferry crossing."}
                  </div>
                )}
                {/* ── WHO RAN IT, AND WHO MEASURED IT ──────────────────
                    The same licence line the place page carries, for the same
                    reason: this leg list is Google Directions data, and its
                    policy asks for a visible attribution plus "the names and
                    URLs of the transit agencies that supply the trip results".
                    A guide has no Google map on it either, so it is said in
                    words here too. See utils/journey.js for the readers. */}
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                  {journeyAgencies(journey).length > 0 && (
                    <span>
                      Run by{" "}
                      {journeyAgencies(journey).map((a, ai) => (
                        <span key={a.name}>
                          {ai > 0 ? ", " : ""}
                          {a.url
                            ? <a href={a.url} target="_blank" rel="noreferrer" style={{ color: C.light, textDecoration: "underline" }}>{a.name}</a>
                            : a.name}
                        </span>
                      ))}
                      {". "}
                    </span>
                  )}
                  {JOURNEY_SOURCE}
                </div>
              </div>
            );
            if (!ops.length && !legList) return chip;
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                {chip}
                {legList}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
                  {ops.map(op => (
                    <a key={op.id} href={op.url} target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", background: "none", border: `1px solid ${C.border}`, borderRadius: 100, padding: "4px 10px" }}>
                      <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>{op.name}</span>
                      <span style={{ fontSize: 9.5, color: C.muted }}>{op.what}</span>
                    </a>
                  ))}
                </div>
                {opsNote && (
                  <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5, maxWidth: 340, textAlign: "center" }}>{opsNote}</div>
                )}
              </div>
            );
          };
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
              {/* ── "WEATHER ICONS NEED TO BE MORE PROMINENT" ────
                  Oliver, 9 Aug 2026. It was an 11px chip with a 5px gap, the
                  same visual weight as everything else on the row, so the one
                  thing that changes what you pack read as a tag. The icon is
                  now 22px and the temperature 15px.
                  The label under it is the more important change: this badge
                  can now be a real forecast OR a ten year average, and those
                  are different promises. It says which. See utils/weather.js.
                  The old title attribute said "Forecast assumes the trip
                  starts today", which stopped being true the moment arrival
                  dates became real. */}
              {wx && (
                <div title={wx.source === "normals"
                  ? `Ten year average for this place and this week${wx.years ? `, from ${wx.years} years of records` : ""}. Not a forecast.`
                  : "Real forecast for this date"}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${wx.risk === "high" ? "#FFB34766" : C.border}`, borderRadius: 14, padding: "7px 13px", fontSize: 11 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{wx.icon}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                      <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{wx.temp}°</span>
                      <span style={{ color: C.muted, fontWeight: 700, fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase" }}>{wx.label || "forecast"}</span>
                    </span>
                    {wx.source === "normals" && wx.detail && (
                      <span style={{ color: C.muted, fontSize: 10, lineHeight: 1.35 }}>{wx.detail}</span>
                    )}
                  </span>
                  {/* The bare "rain likely" chip stays ONLY when nothing better
                      was measured. Where wind, millimetres or a symbol code came
                      through, the warnings below say the actual number and this
                      would be a vaguer duplicate of the same fact. */}
                  {wx.source !== "normals" && wx.risk === "high" && !wxWarnings.length && <span style={{ color: "#FFB347", fontWeight: 700 }}>· rain likely</span>}
                </div>
              )}
            </div>
            {/* ── THE WARNINGS ─────────────────────────────────────
                Oliver, 18 Aug 2026: "it shows the weather forecast, but nothing
                else. Surely it's able to give some warnings+"

                Under the header rather than inside the badge, because they are
                sentences and the badge is a glance. "warn" is gold and bordered
                — it changes what somebody does today. "watch" is quiet — it
                changes what they pack. Nothing renders at all when nothing
                crossed a threshold, which is most days: an "all clear" chip on
                every ordinary day would train people to stop reading the row
                that matters. */}
            {wxWarnings.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {wxWarnings.map(w => (
                  <div key={w.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    background: w.level === "warn" ? "#3D2A0A" : C.surface,
                    border: `1px solid ${w.level === "warn" ? "#FFB34766" : C.border}`,
                    borderRadius: 10, padding: "7px 11px",
                    fontSize: 11.5, lineHeight: 1.5,
                    color: w.level === "warn" ? "#FFB347" : C.muted,
                  }}>
                    <span style={{ flexShrink: 0, fontWeight: 700 }}>{w.level === "warn" ? "◷" : "·"}</span>
                    <span>{w.text}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: 1, background: C.border, margin: "10px 0 18px" }} />
            {/* If today only has one stop, the real journey worth showing is the leg
                connecting it to yesterday's last stop, not nothing at all.
                Skipped in light mode, same reasoning as the route map below. */}
            {!lightMode && day.stops?.length === 1 && dayIdx > 0 && days[dayIdx - 1]?.stops?.length > 0
              && days[dayIdx - 1].stops.slice(-1)[0].name.trim().toLowerCase() !== day.stops[0].name.trim().toLowerCase() && (
              <div style={{ marginBottom: 14 }}>{legChip(days[dayIdx - 1].stops.slice(-1)[0].name, day.stops[0].name, day.glance?.legs?.[0]?.how)}</div>
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
                // ── WHAT IS THIS PLACE, IN ONE WORD ──────────────────
                // Oliver asked whether the guide would overwhelm someone who
                // has never been to Denmark. This is the answer I was least
                // expecting and the cheapest to act on: to a visitor,
                // "Vikingeskibsmuseet", "Roskilde Domkirke" and "Faxe
                // Kalkbrud" are three long unpronounceable strings that look
                // identical, and you have to read a paragraph before you know
                // whether one is a museum, a church or a hole in the ground.
                // Danish compound names already carry the answer, so this costs
                // one small tag and no research at all.
                const kind = stopKind(stop.name, real);
                // ── AND WHEN IT RUNS, IF IT IS AN EVENT ──────────────
                // Null for everything that is not one, so a restaurant is
                // untouched. See stopEventWhen in utils/guideReading.js: this
                // card was the reason a correct Tivoli Halloween offer looked
                // wrong and could only be checked by leaving the site.
                const when = stopEventWhen(real, dayDate);
                // ── WHERE IT IS, AND THE APP ALREADY KNEW ────────────
                // Oliver, 17 Aug 2026: "I think you need to make it explicit
                // where these places are.. like 'JOJO'.. nobody knows that is in
                // Aarhus.."
                //
                // This line read `stop.town` alone, and the guide writer fills
                // that when it happens to. When it did not, the card printed a
                // bare name — while the published row underneath, the one he
                // wrote, carried the town all along in whichever of four fields
                // its content type uses. See stopTown in utils/guideEnrichment.js.
                const townLabel = stopTown(stop, real);
                const titleRow = (
                  <>
                    <div style={{ fontSize: real?.photo ? 17 : 15, fontWeight: 600, color: real ? C.gold : C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.2, textDecoration: real ? "underline" : "none", textDecorationColor: real ? `${C.gold}55` : "none", textUnderlineOffset: 3 }}>{stop.name}{real ? " ↗" : ""}</div>
                    {(kind || townLabel || stop.suggestedStay || (!real?.photo && stop.arrivalTime)) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
                        {kind && (
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: C.gold, background: `${C.gold}16`, border: `1px solid ${C.gold}33`, borderRadius: 100, padding: "2px 8px" }}>{kind}</span>
                        )}
                        <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.1 }}>
                          {[!real?.photo && stop.arrivalTime, townLabel, stop.suggestedStay].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    )}
                    {when && (
                      <div style={{ fontSize: 11.5, color: when.offWindow ? "#FFB347" : C.light, marginTop: 6, fontWeight: when.offWindow ? 700 : 400 }}>
                        {when.offWindow ? `⚠ Runs ${when.runs}, which is not the day this stop falls on` : `Runs ${when.runs}`}
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
                      {/* ── THE NUMBER THE CAPTION PROMISED ────────────
                          The map's caption has always said "every stop below is
                          numbered here in order", and nothing below the map was
                          numbered: this plate showed the first LETTER of the name.
                          The one function in the file that could print ① is defined
                          and called from nowhere.

                          pinNumber is the stop's real position among the pins that
                          were drawn, so tapping pin 4 and finding the fourth card
                          works. A stop that is not on the map keeps its letter,
                          because giving it a number would be the promise breaking
                          in the other direction. */}
                      <span style={{ fontFamily: "'Fraunces', serif", fontStyle: pinNumber(stop) ? "normal" : "italic", fontSize: 16, fontWeight: pinNumber(stop) ? 800 : 500, color: C.gold }}>{pinNumber(stop) || (stop.name || "◆").slice(0, 1)}</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>{titleRow}</div>
                  </div>
                  )}
                  {/* Connector: the leg chip sits ON the line between the two
                      stops it joins, centered — reads as "then you travel",
                      not as a stray label under a random card. */}
                  {/* ── A PLACE IS NOT A JOURNEY FROM ITSELF ───────────
                      "Ærøskøbing" appeared as Day 2's overnight stop and again
                      as Day 3, and the connector between them read "1 min on
                      foot". The Directions API had honestly answered zero for a
                      route from a point to itself. A stop repeated as a base is
                      not a leg and gets no chip. */}
                  {!lightMode && nextStop && nextStop.name.trim().toLowerCase() !== stop.name.trim().toLowerCase() && (
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
              // ── "IT'S NOT EXACTLY A 'DAY-TRIP' FROM COPENHAGEN" ───
              // Oliver, 17 Aug 2026. The arithmetic for this was written that
              // night and wired to nothing, which the next morning's grep found:
              // the guide went on printing the claim while the module that knew
              // better sat unimported. This is the call that closes it.
              //
              // The measurement is the FURTHEST stop of the day, not the nearest
              // — a day trip has to reach all of them, and the nearest one would
              // let a single close stop wave through a day that ends 200 km out.
              // See stayTextProblem in utils/accommodation.js.
              const stayProblem = stayTextProblem({
                text: day.glance.accommodation,
                mode: guide._mode,
                kmFromTown: (town) => {
                  const base = townPointFor(town);
                  if (!base) return null;
                  const reach = (day.stops || [])
                    .filter(st => st?.name)
                    .map(st => resolveStopCoords(st.name, geo, stopTown(st, lookupRealPlace(st.name))))
                    .filter(Boolean)
                    .map(pt => kmBetween(base, pt))
                    .filter(n => Number.isFinite(n));
                  // No measurable stop means no measurement, and dayTripHonest
                  // refuses an unmeasured claim rather than waving it through.
                  return reach.length ? Math.max(...reach) : null;
                },
              });
              const stayText = stayProblem ? stayProblem.repaired : day.glance.accommodation;
              // Logged, not printed. A READER should just get the honest
              // sentence — a page that narrates its own corrections is the
              // "People will think the draft is incorrect" failure again. The
              // reason a cut happened belongs where a founder looks, so it goes
              // to the console with the numbers behind it, same as the withheld
              // ready marker in App.jsx.
              if (stayProblem) console.warn("Gemlyx guide: day-trip claim removed from the stay line.", stayProblem.note);
              // The whole sentence was the false claim. A card with nothing
              // honest left in it is worse than no card.
              if (!stayText) return null;
              // dayDate is this day of the trip, computed once at the top of the
              // day render and shared with the stop cards. Checkout is the next
              // morning, through the same tested primitive rather than a second
              // mutating setDate.
              const nextDate = dayPlus(dayDate, 1);
              // ── AND toISOString UNDID THE LINE ABOVE IT ──────────
              // dayStart returns LOCAL midnight of the arrival day, and
              // toISOString converts that to UTC, which in Denmark is 22:00 the
              // evening before. So this sent Booking.com checkin=2026-09-05 for
              // somebody arriving on the 6th, and every later day booked night
              // N minus one.
              //
              // Wrong in Denmark and RIGHT in New York, which is the reverse of
              // the rest of this family and the reason it survived a seven
              // timezone sweep: the suite cannot reach a JSX render, and the one
              // person most likely to catch it by eye is sitting on the single
              // clock where it reads correctly.
              //
              // It also sat three lines under tonight's dayStart fix, on the
              // same value. dayKey formats from local getters, which is what it
              // exists for. See utils/calendarDay.js.
              const fmt = (d) => dayKey(d);
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
                    <span style={{ color: C.light }}>{stayText}</span>

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

            {/* ── AND THE JOURNEY TO TOMORROW ────────────────────────
                Oliver, 17 Aug 2026: "the route is even worse…"

                His guide read: 2 DAYS · 3 STOPS · 92 KM OF TRAVEL, Aalborg →
                Skagen. Day 1 ends in Aalborg. Day 2 opens at 15:00 in Skagen,
                ninety-two kilometres away, on a bicycle, with NOTHING drawn
                between them. Not a wrong estimate — no journey at all.

                The cause is one line above: `day.stops[stopIdx + 1]`. A leg is
                the gap between two stops IN A DAY, so the single largest journey
                of the trip was the one gap nothing looked at. The stat bar
                counted those kilometres and the itinerary never spent them.

                Rendered at the FOOT of the day rather than the head of the next
                one, because it is the thing that has to happen before tomorrow
                starts, and it belongs next to where they are sleeping. Silent
                when the next day begins where this one ended, which is most
                trips. See overnightMove in utils/routeOrder.js. */}
            {!lightMode && (() => {
              const nextDay = days[dayIdx + 1];
              const lastHere = (day.stops || []).filter(s => s?.name).slice(-1)[0];
              const firstThere = (nextDay?.stops || []).filter(s => s?.name)[0];
              if (!lastHere || !firstThere) return null;
              const fromT = stopTown(lastHere, lookupRealPlace(lastHere.name));
              const toT = stopTown(firstThere, lookupRealPlace(firstThere.name));
              const a = resolveStopCoords(lastHere.name, geo, fromT);
              const b = resolveStopCoords(firstThere.name, geo, toT);
              if (!a || !b) return null;
              const move = overnightMove({
                from: a, to: b, fromName: lastHere.name, toName: toT || firstThere.name,
                days: days.length, mode: guide._mode,
              });
              const line = describeOvernightMove(move);
              if (!line) return null;
              const heavy = move.eatsTheDay || move.band === REACH_FAR;
              return (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.surface, border: `1px solid ${heavy ? "#FFB347" : C.gold}44`, borderRadius: 12, padding: "12px 14px", marginTop: 14, maxWidth: 620 }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{heavy ? "⚠" : "→"}</span>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                    <span style={{ color: heavy ? "#FFB347" : C.gold, fontWeight: 700 }}>
                      Getting to Day {nextDay.day || dayIdx + 2}:{" "}
                    </span>
                    <span style={{ color: C.light }}>{line}</span>
                    {/* Same honesty as Getting back, and for the same reason:
                        every other distance on this page is a measured road
                        journey and this one is not. */}
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      Straight line distance, not a measured route, so treat it as the shape of the day rather than as a timetable.
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          );
        })}

        {/* ── AND THEN HOW DO THEY GET HOME ──────────────────────────
            A guide could end in Aalborg, five and a half hours from the airport
            it started at, and say nothing at all. The plan runs between the
            points the traveller named and stops at the last one.

            Printed AFTER every day rather than folded into the last one, because
            it is not part of the trip: it is what the trip leaves them holding.
            The ORDER is untouched, deliberately, per the note above routeOrder in
            utils/routeOrder.js. Silent when they end where they landed, and
            silent when nothing in the brief said where that was. */}
        {(() => {
          const stops = (days || []).flatMap(d => (d.stops || []).map(s => {
            const c = resolveStopCoords(s.name, guide._geo || {}, s.town);
            return c ? { name: s.name, lat: c.lat, lon: c.lon } : { name: s.name };
          }));
          const home = returnLeg({ ordered: stops, from: guide._arrivalPoint || null, days: (days || []).length, mode: guide._mode || null });
          const line = describeReturn(home);
          if (!line) return null;
          const far = home.band === REACH_FAR;
          return (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.surface, border: `1px solid ${far ? "#FFB347" : C.gold}44`, borderRadius: 12, padding: "12px 14px", marginTop: 20, maxWidth: 620 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{far ? "⚠" : "🧭"}</span>
              <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                <span style={{ color: far ? "#FFB347" : C.gold, fontWeight: 700 }}>Getting back: </span>
                <span style={{ color: C.light }}>{line}</span>
                {/* Said out loud rather than implied. Every other distance on
                    this page is a measured road journey and this one is not, so
                    it must not be allowed to look like one. */}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  Straight line distance, not a measured route, so treat it as the shape of the problem rather than as a timetable.
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── WHOSE WORDS THESE ARE ──────────────────────────────────
            Oliver, 17 Aug 2026: "I also want you to write on the pages that I
            claim copyright on my texts and guides. We need to make it strictly
            forbidden to share the guides online" / "or publically rather."

            At the foot of the guide, after the trip and after Getting back,
            because it is about the document and not about the journey. Small and
            quiet on purpose: a large legal box on a travel guide reads as a
            threat, gets skipped, and makes the page feel like a licence
            agreement. Two lines somebody will actually read beat six they will
            not. The wording, and what it deliberately does NOT claim, is in
            utils/rights.js. */}
        <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px solid ${C.border}`, maxWidth: 620 }}>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
            {GUIDE_RIGHTS_SHORT}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, opacity: 0.85 }}>
            {copyrightLine(new Date().getFullYear())}{" "}
            <a href="/terms.html" style={{ color: C.gold, textDecoration: "none" }}>Terms</a>
          </div>
        </div>

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
