import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { GuideRouteMap } from "../components/GuideRouteMap";
import { DKLocator } from "../components/DKLocator";
import { towns } from "../data/towns";
import { TOWN_COORDS } from "../data/towns";
import { lookupRealPlace, resolveStopCoords, resolveLegMode, legModeIcon, legModeLabel } from "../utils/guideLookup";
import { askClaude, parseClaudeJSON, geocodeOne } from "../utils/aiClient";

// ─── GUIDE PAGE ───────────────────────────────────────────────────
// The full-page replacement for the old "little book" guide modal/popup, per
// Oliver's redesign notes: "drop 'view full page' at the end... push us onto a
// new page... just show towns, attractions, diners with short descriptions...
// THEN essentials and recommended stay areas... THEN the roadmap." Confirmed via
// AskUserQuestion this session (see GEMLYX_HANDOFF_2.md): the preview step is a
// real full page (not a step inside the chat popup), and the eventual full
// day-by-day roadmap becomes THE full-page view — the old separate "View as
// full page ↗" step is gone, folded into this same flow as its final step.
//
// Two ways this component gets used:
//  1. FRESH / UNSAVED — App.jsx's generateGuide() now navigates here itself, the
//     moment a guide (INCLUDING its background travel-time/accommodation/weather
//     enrichment — see App.jsx's generateGuide for why that's awaited first) is
//     ready, via router state: navigate("/guide/new", { state: { guide,
//     exactDurations, noRouteFound, geocodedCoords } }). Walks through three
//     internal steps — preview → essentials → roadmap — ending in the same
//     "Looks good — save my guide" confirmation as before, which POSTs to
//     Supabase and redirects to the real /guide/:id URL.
//  2. SAVED / SHARED — visited directly via a real /guide/:id URL (from a saved
//     link, or right after step 1's save completes). Fetches the guide from
//     Supabase by id and shows it read-only, landing straight on the roadmap
//     step (the preview/essentials steps are onboarding for the person BUILDING
//     the guide, not something a link recipient needs to click through).
//
// REQUIRES the "gemlyx_guides" Supabase table — see supabase_guides_schema.sql.
// REQUIRES react-router-dom.

const dayIcon = (i) => ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭"][i] || `Day ${i + 1}`;

export const GuidePage = ({ guide: guideProp, onBack }) => {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Reached two ways: navigate("/guide/new", { state: { guide, ... } }) straight out
  // of generateGuide() in App.jsx (router state), or a plain `guide` prop for
  // standalone/test use — router state wins when both are somehow present.
  const freshGuide = location.state?.guide || guideProp || null;
  // These only exist on the fresh/unsaved path (App.jsx passes them alongside the
  // guide) — a guide loaded from Supabase by id never carries them, since they're
  // transient lookup caches, not part of what gets saved. Falling back to {} means
  // the roadmap step's route links just show the km-estimate ("Exact route ↗")
  // version instead of the Directions-API-confirmed one — same graceful fallback
  // the old in-chat popup already relied on.
  const exactDurations = location.state?.exactDurations || {};
  const noRouteFound = location.state?.noRouteFound || {};
  // Merged with anything "Include more"/"Make it simpler" geocodes for newly-added
  // stops below — the router-state map is fixed at navigation time, so freshly
  // regenerated stops need somewhere to land too.
  const [localGeocodedCoords, setLocalGeocodedCoords] = useState({});
  const geocodedCoords = { ...(location.state?.geocodedCoords || {}), ...localGeocodedCoords };

  const [guide, setGuide] = useState(freshGuide || null);
  const [loading, setLoading] = useState(!freshGuide && !!guideId);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const isUnsaved = !!freshGuide && !guideId;
  // Saved/shared guides land straight on the roadmap — the preview/essentials steps
  // are only the "here's what I built you" onboarding for a guide someone just built.
  const [step, setStep] = useState(isUnsaved ? "preview" : "roadmap");

  // ── "Include more" / "Make it simpler" / "Gemlyx AI" — new this pass, per your
  // ask for controls on every step. Scoped to the fresh/unsaved guide only (shown
  // when isUnsaved) — adjusting a guide someone already saved and shared would need
  // its own re-save flow, which is a separate ask; flagging that scoping choice here
  // rather than silently expanding it.
  const [regenerating, setRegenerating] = useState(null); // null | "more" | "simpler"
  const [regenerateError, setRegenerateError] = useState(null);
  const regenerateGuide = async (direction) => {
    if (regenerating || !guide) return;
    setRegenerating(direction);
    setRegenerateError(null);
    try {
      const instruction = direction === "more"
        ? "The traveler wants MORE — add genuinely worthwhile additional real stops to one or more days (never invent a day count change unless it clearly helps), using only real places consistent with the original conversation below. Keep every stop already in the plan; only ADD, never remove what's already there."
        : "The traveler wants it SIMPLER — trim to fewer, more relaxed stops per day (roughly 2-3 stops per day at most), keeping only the most worthwhile stops already in the plan and dropping the rest. Do not invent any new stop — only remove/trim from what's already here.";
      const currentSlim = {
        title: guide.title,
        essentials: guide.essentials,
        days: (guide.days || []).map(d => ({ day: d.day, title: d.title, stops: (d.stops || []).map(s => ({ name: s.name, town: s.town, arrivalTime: s.arrivalTime, suggestedStay: s.suggestedStay, note: s.note })) })),
      };
      const prompt = `Here is a Denmark trip guide already built, as strict JSON:\n${JSON.stringify(currentSlim)}\n\n${instruction}\n\nOriginal conversation this trip was built from, for context on what's real and consistent with it:\n${(guide._convoText || "").slice(0, 3000)}\n\nRespond with ONLY the complete, updated guide as strict JSON in this exact shape, no markdown fences, no commentary: {"title": "...", "essentials": {"budgetReality": "...", "transportTip": "...", "keepInMind": "..."}, "days": [{"day": 1, "title": "...", "stops": [{"name": "...", "town": "...", "arrivalTime": "...", "suggestedStay": "...", "note": "..."}]}]}. Use only real place names — never invent one that isn't implied by the original conversation.`;
      const result = await askClaude(prompt, 6000, "claude-opus-4-8");
      if (result.error) throw new Error(result.error);
      const parsed = await parseClaudeJSON(result.text, 6000);
      if (!parsed.days || parsed.days.length === 0) throw new Error("empty");
      // Geocode any stop name that's genuinely new (not already resolvable via real
      // content or a coordinate we already have) — new stops from "Include more"
      // otherwise wouldn't show on the route map. Legs to/from them just fall back
      // to the neutral "Check exact route" link (see the roadmap step) until a real
      // Directions lookup happens — same graceful degradation as everywhere else.
      const allNames = [...new Set(parsed.days.flatMap(d => (d.stops || []).map(s => s.name)))];
      const newlyNamed = allNames.filter(n => !resolveStopCoords(n, geocodedCoords));
      const freshlyGeocoded = {};
      for (const name of newlyNamed) {
        const town = parsed.days.flatMap(d => d.stops || []).find(s => s.name === name)?.town;
        const coord = await geocodeOne(name, town);
        if (coord) freshlyGeocoded[name] = coord;
      }
      if (Object.keys(freshlyGeocoded).length > 0) setLocalGeocodedCoords(prev => ({ ...prev, ...freshlyGeocoded }));
      setGuide(prev => ({ ...prev, title: parsed.title || prev.title, essentials: { ...(prev.essentials || {}), ...(parsed.essentials || {}) }, days: parsed.days }));
    } catch {
      setRegenerateError("Couldn't update the guide just now — try again in a moment.");
      setTimeout(() => setRegenerateError(null), 3500);
    } finally {
      setRegenerating(null);
    }
  };

  const [assistOpen, setAssistOpen] = useState(false);
  const [assistMessages, setAssistMessages] = useState([]); // {role: "user"|"assistant", text}
  const [assistInput, setAssistInput] = useState("");
  const [assistLoading, setAssistLoading] = useState(false);
  const askAssist = async () => {
    const q = assistInput.trim();
    if (!q || assistLoading || !guide) return;
    setAssistInput("");
    const nextMessages = [...assistMessages, { role: "user", text: q }];
    setAssistMessages(nextMessages);
    setAssistLoading(true);
    const guideSummary = `Trip title: ${guide.title}\n` + (guide.days || []).map(d => `Day ${d.day}${d.title ? ` (${d.title})` : ""}: ${(d.stops || []).map(s => s.name).join(", ")}`).join("\n");
    const history = nextMessages.slice(-6).map(m => `${m.role === "user" ? "Traveler" : "Gemlyx"}: ${m.text}`).join("\n");
    const prompt = `You are Gemlyx, a direct, honest Denmark travel guide helping a traveler with the specific trip below — not a generic assistant. Answer their question plainly and usefully, real practical help, no filler, no markdown headers or bullet lists, just a short direct reply. If something needs a fact you're not confident about, say so plainly rather than guessing.\n\nTheir trip:\n${guideSummary}\n\nConversation so far:\n${history}\n\nRespond with just your reply, nothing else.`;
    const result = await askClaude(prompt, 500);
    setAssistMessages(prev => [...prev, { role: "assistant", text: result.error ? "Sorry — couldn't reach Gemlyx AI just now. Try again in a moment." : result.text }]);
    setAssistLoading(false);
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
      navigate(`/guide/${id}`, { replace: true });
    } catch {
      setSaveError("Couldn't save this guide — check your connection and try again.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.gold, animation: "gemlyxSpin 0.9s linear infinite" }} />
        <style>{`@keyframes gemlyxSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError || !guide) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 16, color: C.text, fontWeight: 700, marginBottom: 8, fontFamily: "'Cormorant Garamond', serif" }}>Guide not found</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{loadError || "Something went wrong loading this guide."}</div>
        <button onClick={() => navigate("/")} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 100, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Back to Gemlyx</button>
      </div>
    );
  }

  const days = guide.days || [];

  // ── Shared "top bar" (back / step position / copy link) ──────────────────
  const TopBar = ({ backLabel = "‹ Back", onBackClick }) => (
    <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${C.bg}ee`, backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onBackClick}
        style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
        {backLabel}
      </button>
      {isUnsaved && step !== "preview" && (
        <div style={{ display: "flex", gap: 5 }}>
          {["preview", "essentials", "roadmap"].map(s => (
            <div key={s} style={{ width: 6, height: 6, borderRadius: "50%", background: s === step ? C.gold : C.border }} />
          ))}
        </div>
      )}
      {!isUnsaved && (
        <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          Copy link ↗
        </button>
      )}
    </div>
  );

  // ── "Include more" / "Gemlyx AI" / "Make it simpler" — a slim toolbar under the
  // top bar, on every step of a fresh/unsaved guide, per your ask. The two pills sit
  // on each side, Gemlyx AI in the middle/top. Regenerating replaces the guide's
  // days in place (whichever step you're on keeps showing, just with updated data);
  // Gemlyx AI opens a small scoped help chat about this specific trip.
  // IMPORTANT: this is a plain JSX value, NOT a component function (no "() =>" wrapping
  // it, not called as <GuideToolbar />) — that was a real, confirmed bug. Defining it as
  // a function INSIDE this component's render body meant React saw a brand-new component
  // type on every single re-render (a fresh function reference each time), which forced
  // React to unmount and remount the whole toolbar — including the chat <input> — on
  // every keystroke, since typing updates assistInput state and re-renders this component.
  // That's exactly what "can't write without being thrown off the keyboard" was: the
  // input element itself got destroyed and recreated after every character, losing focus
  // each time. Keeping this as plain JSX (computed fresh each render, same as any other
  // element below) means React diffs it in place instead of remounting it — same content,
  // stable DOM nodes, no more lost focus.
  const guideToolbar = (
    <div style={{ position: "sticky", top: 57, zIndex: 9, background: `${C.bg}ee`, backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
      <button onClick={() => regenerateGuide("simpler")} disabled={!!regenerating}
        style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: regenerating ? "default" : "pointer", opacity: regenerating ? 0.6 : 1 }}>
        {regenerating === "simpler" ? "Simplifying…" : "− Make it simpler"}
      </button>
      <button onClick={() => setAssistOpen(o => !o)}
        style={{ background: assistOpen ? `${C.gold}22` : "none", border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "6px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
        ✦ Gemlyx AI
      </button>
      <button onClick={() => regenerateGuide("more")} disabled={!!regenerating}
        style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: regenerating ? "default" : "pointer", opacity: regenerating ? 0.6 : 1 }}>
        {regenerating === "more" ? "Adding more…" : "+ Include more"}
      </button>
      {regenerateError && <div style={{ width: "100%", textAlign: "center", color: "#FFB347", fontSize: 11 }}>{regenerateError}</div>}
      {assistOpen && (
        <div style={{ width: "100%", maxWidth: 560, margin: "10px auto 0", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 12, padding: 12 }}>
          <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 8 }}>
            {assistMessages.length === 0 && (
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>Ask me anything about this trip — a stop, the route, whether something's worth the detour.</div>
            )}
            {assistMessages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8, textAlign: m.role === "user" ? "right" : "left" }}>
                <span style={{ display: "inline-block", maxWidth: "85%", fontSize: 12.5, lineHeight: 1.5, color: m.role === "user" ? "#fff" : C.light, background: m.role === "user" ? C.accent : C.bg, border: m.role === "user" ? "none" : `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", textAlign: "left" }}>
                  {m.text}
                </span>
              </div>
            ))}
            {assistLoading && <div style={{ fontSize: 12, color: C.muted }}>✨ thinking…</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={assistInput} onChange={e => setAssistInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") askAssist(); }}
              placeholder="Ask Gemlyx about this trip…"
              style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "8px 12px", fontSize: 12.5, color: C.text }} />
            <button onClick={askAssist} disabled={assistLoading || !assistInput.trim()}
              style={{ background: C.gold, color: "#0A0F1E", border: "none", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── STEP 1: PREVIEW — deduped towns/attractions/diners, short descriptions only ──
  if (step === "preview") {
    const seen = new Set();
    const stops = [];
    days.forEach(day => (day.stops || []).forEach(stop => {
      if (seen.has(stop.name)) return;
      seen.add(stop.name);
      const real = lookupRealPlace(stop.name);
      const townMatch = towns.find(t => t.name === stop.name)?.name || (real?._src === "town" ? real.name : null) || Object.keys(TOWN_COORDS).find(t => stop.name.includes(t));
      stops.push({ stop, real, townMatch });
    }));
    // Grouped by kind, per your "pour the towns and attractions together, instead
    // of one long line of random things" note — was a single flat grid of whatever
    // order the itinerary happened to mention things in; now every town sits with
    // the other towns, every sight with the other sights, etc.
    const GROUP_ORDER = [
      { key: "town", label: "Towns" },
      { key: "free", label: "Sights & Attractions" },
      { key: "craft", label: "Craft & Shops" },
      { key: "food", label: "Food & Drink" },
      { key: "nightlife", label: "Nightlife" },
      { key: "event", label: "Events" },
      { key: "other", label: "Other Stops" },
    ];
    const grouped = GROUP_ORDER.map(g => ({
      ...g,
      items: stops.filter(({ real }) => (real?._src || "other") === g.key),
    })).filter(g => g.items.length > 0);

    return (
      <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 100 }}>
        <TopBar onBackClick={() => (onBack ? onBack() : navigate(-1))} backLabel="‹ Back to chat" />
        {isUnsaved && guideToolbar}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
            <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05 }}>{guide.title || "Your Denmark Guide"}</div>
            {/* "Gemlyx in the top right corner" narrating the handoff, per Oliver's notes */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 14, padding: "10px 14px", maxWidth: 300 }}>
              <span style={{ fontSize: 16 }}>✦</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 0.5, marginBottom: 2 }}>Gemlyx</div>
                <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5 }}>Here's everything I found worth your time — take a look, then I'll walk you through the essentials and the full day-by-day plan.</div>
              </div>
            </div>
          </div>

          {grouped.map(group => (
            <div key={group.key} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>{group.label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {group.items.map(({ stop, real, townMatch }, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                    {/* Small SQUARE thumbnail, not a full-width horizontal crop — per your
                        note that the source photos are extremely wide/horizontal, stretching
                        one across a whole card looked wrong. This mirrors the same compact
                        thumbnail size the roadmap step's stop rows already use. */}
                    <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0, borderRadius: 8, overflow: "hidden", background: "linear-gradient(135deg, #16233F 0%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {real?.photo ? (
                        <img src={real.photo} alt={stop.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : townMatch ? (
                        <DKLocator town={townMatch} color={C.gold} />
                      ) : (
                        <span style={{ fontSize: 22, opacity: 0.4 }}>{real?.emoji || "◆"}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.15 }}>{stop.name}</div>
                      {stop.town && <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 3 }}>{stop.town}</div>}
                      {/* SHORT description only, per the confirmed architecture — no times, route, or hotel info on this step */}
                      {(() => {
                        const text = real?.desc || stop.note || "";
                        const short = text.length > 110 ? text.slice(0, 110).trim() + "…" : text;
                        return short ? <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.5, marginTop: 5 }}>{short}</div> : null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: "sticky", bottom: 16, display: "flex", justifyContent: "center", marginTop: 20 }}>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: 6, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setStep("essentials")}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 100, padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: ESSENTIALS — budget/transport/keep-in-mind/weather + recommended stay areas ──
  if (step === "essentials") {
    const e = guide.essentials || {};
    const lines = [
      e.budgetReality && { icon: "💰", text: e.budgetReality },
      e.transportTip && { icon: "🚆", text: e.transportTip },
      e.keepInMind && { icon: "✦", text: e.keepInMind },
      e.weatherNote && { icon: "🌧", text: e.weatherNote },
    ].filter(Boolean);
    // Unique towns actually visited, in day order, each with its best available
    // "where to stay" line — glance.stayArea/recommendedStay when a day's own
    // enrichment named one, otherwise just the town name itself.
    const seenTowns = new Set();
    const stayAreas = [];
    days.forEach(day => {
      const dayTowns = new Set((day.stops || []).map(s => s.town).filter(Boolean));
      dayTowns.forEach(t => {
        if (seenTowns.has(t)) return;
        seenTowns.add(t);
        stayAreas.push({ town: t, recommendedStay: day.glance?.recommendedStay, stayArea: day.glance?.stayArea });
      });
    });

    return (
      <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 100 }}>
        <TopBar onBackClick={() => setStep("preview")} />
        {isUnsaved && guideToolbar}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px" }}>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, marginBottom: 18 }}>Before you go</div>

          {lines.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Essentials</div>
              {lines.map((line, i) => (
                <div key={i} style={{ fontSize: 13.5, color: C.light, lineHeight: 1.65, marginBottom: i < lines.length - 1 ? 10 : 0 }}>
                  {line.icon} {line.text}
                </div>
              ))}
            </div>
          )}

          {stayAreas.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Recommended areas to stay</div>
              {stayAreas.map((s, i) => {
                // Same Booking.com search pattern as the roadmap step's accommodation
                // card — NOT an affiliate link yet. Once the Booking.com Affiliate
                // Partner Program account is approved, add "&aid=YOUR_AID_HERE" to
                // this URL (and the matching one in the roadmap step) and both become
                // real earning links with zero other changes needed.
                const searchTerm = s.recommendedStay || s.stayArea || s.town;
                const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(searchTerm + ", Denmark")}`;
                return (
                  <div key={i} style={{ marginBottom: i < stayAreas.length - 1 ? 10 : 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.stayArea || s.town}</span>
                      {s.recommendedStay && <span style={{ fontSize: 12, color: C.gold }}>· {s.recommendedStay}</span>}
                    </div>
                    <a href={bookingUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, textDecoration: "none" }}>
                      🔎 See {searchTerm} on Booking.com ↗
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ position: "sticky", bottom: 16, display: "flex", justifyContent: "center", marginTop: 20 }}>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: 6, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setStep("roadmap")}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 100, padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              See the full plan →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: ROADMAP — the day-by-day plan; also the final saved/shared state ──
  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 60 }}>
      <TopBar onBackClick={() => (isUnsaved ? setStep("essentials") : (onBack ? onBack() : navigate("/")))} />
      {isUnsaved && guideToolbar}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>{guide.title || "Your Denmark Guide"}</div>

        {isUnsaved && (
          <div style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: "14px 16px", marginBottom: 24 }}>
            <div style={{ fontSize: 13.5, color: C.text, fontWeight: 700, marginBottom: 4 }}>Does this look right?</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>Here's the full day-by-day route — take a look, then save it to get your own link.</div>
          </div>
        )}

        {days.map((day, dayIdx) => (
          <div key={day.day || dayIdx} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>
                {dayIcon(dayIdx)} &nbsp;Day {day.day || dayIdx + 1}{day.title ? ` — ${day.title}` : ""}
              </div>
              {day.weather && (
                <div title="Forecast assumes the trip starts on the guide's arrival date" style={{ display: "flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${day.weather.risk === "high" ? "#FFB34766" : C.border}`, borderRadius: 100, padding: "4px 10px", fontSize: 11 }}>
                  <span>{day.weather.icon}</span>
                  <span style={{ color: C.text, fontWeight: 700 }}>{day.weather.temp}°</span>
                  {day.weather.risk === "high" && <span style={{ color: "#FFB347", fontWeight: 700 }}>· rain likely</span>}
                </div>
              )}
            </div>

            {/* Inter-day connector — a single-stop day continues yesterday's last stop, same logic as the original popup */}
            {(() => {
              if (day.stops.length > 1 || dayIdx === 0) return null;
              const prevDay = days[dayIdx - 1];
              const prevStop = prevDay?.stops?.[prevDay.stops.length - 1];
              if (!prevStop) return null;
              const how = day.glance?.legs?.[0]?.how || "";
              const mode = resolveLegMode(how, guide._mode, prevStop.name, day.stops[0].name, guide._onlyWalking, geocodedCoords);
              const rawExact = exactDurations[`${prevStop.name}|${day.stops[0].name}|${mode}`];
              const plausibleCap = mode === "walking" ? 180 : mode === "bicycling" ? 300 : Infinity;
              const exact = rawExact && rawExact.durationMinutes <= plausibleCap ? rawExact : null;
              const originText = prevStop.town ? `${prevStop.name}, ${prevStop.town}, Denmark` : `${prevStop.name}, Denmark`;
              const destText = day.stops[0].town ? `${day.stops[0].name}, ${day.stops[0].town}, Denmark` : `${day.stops[0].name}, Denmark`;
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originText)}&destination=${encodeURIComponent(destText)}&travelmode=${mode}`;
              // Google Maps is the source of truth for any time shown here — per your
              // "it's around 15 minutes... *searches* it's 30" note, a straight-line km
              // guess is NOT shown as if it were a real time anymore. Real Directions-API
              // number (exact) when we have it; otherwise a neutral "Check on Google
              // Maps" link with no number claimed at all, rather than a guess that could
              // be wildly wrong.
              return (
                <a href={mapsUrl} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px", marginBottom: 12 }}>
                  <span style={{ fontSize: 12 }}>{legModeIcon(mode, how)}</span>
                  <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>
                    {exact ? `${exact.durationText} ${legModeLabel(mode)}` : "Check exact route"}
                  </span>
                  {exact && <span style={{ fontSize: 9, color: "#4CAF50", fontWeight: 700 }}>✓</span>}
                  <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>· Google Maps ↗</span>
                </a>
              );
            })()}

            {/* Route map for this day */}
            {(() => {
              const prevDay = dayIdx > 0 ? days[dayIdx - 1] : null;
              const prevStop = prevDay?.stops?.[prevDay.stops.length - 1];
              const leadIn = day.stops.length === 1 && prevStop ? [prevStop] : [];
              const routePoints = [...leadIn, ...day.stops].map(s => {
                const c = resolveStopCoords(s.name, geocodedCoords);
                return c ? { name: s.name, ...c } : null;
              }).filter(Boolean);
              if (routePoints.length < 2) return null;
              return (
                <div style={{ height: 160, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 14 }}>
                  <GuideRouteMap points={routePoints} />
                </div>
              );
            })()}

            {day.stops.map((stop, i) => {
              const real = lookupRealPlace(stop.name);
              const townMatch = towns.find(t => t.name === stop.name)?.name || (real?._src === "town" ? real.name : null) || Object.keys(TOWN_COORDS).find(t => stop.name.includes(t));
              return (
                <div key={i}>
                  <div style={{ display: "flex", gap: 12 }}>
                    {real?.photo ? (
                      <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        <img src={real.photo} alt={stop.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ) : townMatch ? (
                      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}` }}>
                        <DKLocator town={townMatch} color={C.gold} />
                      </div>
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, border: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        {real?.emoji || "📍"}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: real ? C.gold : C.text }}>{stop.name}</div>
                        {(stop.arrivalTime || stop.suggestedStay) && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, whiteSpace: "nowrap" }}>
                            {stop.arrivalTime ? `⏰ ${stop.arrivalTime}` : ""}{stop.arrivalTime && stop.suggestedStay ? " · " : ""}{stop.suggestedStay ? `${stop.suggestedStay}` : ""}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginBottom: real ? 4 : 0 }}>{stop.note}</div>
                      {real && real.name === stop.name && (
                        <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
                          {real.price ? `${real.price}` : real.popularityTag === "Hidden Gem" ? "◆ Free — Hidden Gem" : real._src === "free" ? "Free entry" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < day.stops.length - 1 ? (() => {
                    const nextStop = day.stops[i + 1];
                    const how = day.glance?.legs?.[i]?.how || "";
                    const mode = resolveLegMode(how, guide._mode, stop.name, nextStop.name, guide._onlyWalking, geocodedCoords);
                    const rawExact = exactDurations[`${stop.name}|${nextStop.name}|${mode}`];
                    const plausibleCap = mode === "walking" ? 180 : mode === "bicycling" ? 300 : Infinity;
                    const exact = rawExact && rawExact.durationMinutes <= plausibleCap ? rawExact : null;
                    const routeFailed = noRouteFound[`${stop.name}|${nextStop.name}|${mode}`];
                    const originText = stop.town ? `${stop.name}, ${stop.town}, Denmark` : `${stop.name}, Denmark`;
                    const destText = nextStop.town ? `${nextStop.name}, ${nextStop.town}, Denmark` : `${nextStop.name}, Denmark`;
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originText)}&destination=${encodeURIComponent(destText)}&travelmode=${mode}`;
                    const rome2rioUrl = `https://www.rome2rio.com/map/${encodeURIComponent(stop.name)}/${encodeURIComponent(nextStop.name)}`;
                    return (
                      <div style={{ borderLeft: `2px dashed ${C.border}`, marginLeft: 31, padding: "7px 0 9px 14px", minHeight: 14 }}>
                        {routeFailed ? (
                          <a href={rome2rioUrl} target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                            <span style={{ fontSize: 12 }}>⛴</span>
                            <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>No direct route — check Rome2Rio</span>
                            <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>↗</span>
                          </a>
                        ) : (
                          <a href={mapsUrl} target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                            <span style={{ fontSize: 12 }}>{legModeIcon(mode, how)}</span>
                            <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>
                              {exact ? `${exact.durationText} ${legModeLabel(mode)}` : "Check exact route"}
                            </span>
                            {exact && <span style={{ fontSize: 9, color: "#4CAF50", fontWeight: 700 }}>✓</span>}
                            <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>· Google Maps ↗</span>
                          </a>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ height: 12 }} />
                  )}
                </div>
              );
            })}

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
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.surface, border: `1px solid ${C.gold}33`, borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>🏡</span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                    <span style={{ color: C.muted, fontWeight: 700 }}>Where to stay: </span>
                    <span style={{ color: C.light }}>{day.glance.accommodation}</span>
                    {day.glance.recommendedStay && (
                      <div style={{ marginTop: 2 }}><span style={{ color: C.gold, fontWeight: 700 }}>{day.glance.recommendedStay}</span></div>
                    )}
                    {bookingUrl && (
                      // NOT an affiliate link yet — plain Booking.com search. Once the
                      // Booking.com Affiliate Partner Program account is approved, add
                      // "&aid=YOUR_AID_HERE" here and this becomes a real earning link.
                      <a href={bookingUrl} target="_blank" rel="noreferrer"
                        style={{ display: "block", marginTop: 4, color: C.gold, fontWeight: 700, textDecoration: "none" }}>
                        🔎 {day.glance.recommendedStay ? `See ${day.glance.recommendedStay} on Booking.com` : `Search stays near ${day.glance.stayArea}`} ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}

        {isUnsaved && (
          <div style={{ position: "sticky", bottom: 16, display: "flex", justifyContent: "center", marginTop: 20 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: 6, display: "flex", gap: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
              <button onClick={() => setStep("essentials")}
                style={{ background: "none", border: "none", color: C.light, borderRadius: 100, padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                ‹ Back
              </button>
              <button onClick={saveGuide} disabled={saving}
                style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 100, padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Looks good — save my guide"}
              </button>
            </div>
          </div>
        )}
        {saveError && <div style={{ textAlign: "center", color: "#FFB347", fontSize: 12.5, marginTop: 12 }}>{saveError}</div>}
      </div>
    </div>
  );
};
