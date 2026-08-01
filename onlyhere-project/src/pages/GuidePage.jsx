import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { GuideRouteMap } from "../components/GuideRouteMap";
import { DKLocator } from "../components/DKLocator";
import { towns } from "../data/towns";
import { TOWN_COORDS } from "../data/towns";
import { lookupRealPlace, resolveStopCoords, resolveLegMode, kmBetween, legModeIcon, legModeLabel } from "../utils/guideLookup";

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

// Small pill used on the preview step to say roughly what kind of stop this is,
// without repeating whatever's already in the short description.
const KIND_LABEL = { free: "Sight", craft: "Craft", food: "Food & Drink", nightlife: "Nightlife", event: "Event", town: "Town" };

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
  const geocodedCoords = location.state?.geocodedCoords || {};

  const [guide, setGuide] = useState(freshGuide || null);
  const [loading, setLoading] = useState(!freshGuide && !!guideId);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const isUnsaved = !!freshGuide && !guideId;
  // Saved/shared guides land straight on the roadmap — the preview/essentials steps
  // are only the "here's what I built you" onboarding for a guide someone just built.
  const [step, setStep] = useState(isUnsaved ? "preview" : "roadmap");

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

    return (
      <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 100 }}>
        <TopBar onBackClick={() => (onBack ? onBack() : navigate(-1))} backLabel="‹ Back to chat" />
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

          <div className="towns-grid">
            {stops.map(({ stop, real, townMatch }, i) => (
              <div key={i}>
                <div style={{ position: "relative", height: 150, borderRadius: 6, overflow: "hidden", background: "linear-gradient(135deg, #16233F 0%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {real?.photo ? (
                    <img src={real.photo} alt={stop.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : townMatch ? (
                    <DKLocator town={townMatch} color={C.gold} />
                  ) : (
                    <span style={{ fontSize: 32, opacity: 0.3 }}>{real?.emoji || "◆"}</span>
                  )}
                  {real && KIND_LABEL[real._src] && (
                    <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(10,15,30,0.8)", color: C.gold, fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 100 }}>{KIND_LABEL[real._src]}</div>
                  )}
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginTop: 10, lineHeight: 1.15 }}>{stop.name}</div>
                {stop.town && <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 }}>{stop.town}</div>}
                {/* SHORT description only, per the confirmed architecture — no times, route, or hotel info on this step */}
                {(() => {
                  const text = real?.desc || stop.note || "";
                  const short = text.length > 140 ? text.slice(0, 140).trim() + "…" : text;
                  return short ? <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginTop: 6 }}>{short}</div> : null;
                })()}
              </div>
            ))}
          </div>
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
              {stayAreas.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: i < stayAreas.length - 1 ? 8 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.stayArea || s.town}</span>
                  {s.recommendedStay && <span style={{ fontSize: 12, color: C.gold }}>· {s.recommendedStay}</span>}
                </div>
              ))}
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
              const a = resolveStopCoords(prevStop.name, geocodedCoords), b = resolveStopCoords(day.stops[0].name, geocodedCoords);
              const km = a && b ? kmBetween(a, b) : null;
              const rawExact = exactDurations[`${prevStop.name}|${day.stops[0].name}|${mode}`];
              const plausibleCap = mode === "walking" ? 180 : mode === "bicycling" ? 300 : Infinity;
              const exact = rawExact && rawExact.durationMinutes <= plausibleCap ? rawExact : null;
              const originText = prevStop.town ? `${prevStop.name}, ${prevStop.town}, Denmark` : `${prevStop.name}, Denmark`;
              const destText = day.stops[0].town ? `${day.stops[0].name}, ${day.stops[0].town}, Denmark` : `${day.stops[0].name}, Denmark`;
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originText)}&destination=${encodeURIComponent(destText)}&travelmode=${mode}`;
              return (
                <a href={mapsUrl} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px", marginBottom: 12 }}>
                  <span style={{ fontSize: 12 }}>{legModeIcon(mode, how)}</span>
                  <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>
                    {exact ? `${exact.durationText} ${legModeLabel(mode)}` : km !== null ? `${Math.round(km) === 0 ? "<1" : "~" + Math.round(km)} km ${legModeLabel(mode)}` : how || "Route from yesterday"}
                  </span>
                  <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>· {exact ? "Google Maps ↗" : "Exact route ↗"}</span>
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
                    const a = resolveStopCoords(stop.name, geocodedCoords), b = resolveStopCoords(nextStop.name, geocodedCoords);
                    const km = a && b ? kmBetween(a, b) : null;
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
                              {exact ? `${exact.durationText} ${legModeLabel(mode)}` : km !== null ? `${Math.round(km) === 0 ? "<1" : "~" + Math.round(km)} km ${legModeLabel(mode)}` : how || "Route"}
                            </span>
                            {exact && <span style={{ fontSize: 9, color: "#4CAF50", fontWeight: 700 }}>✓</span>}
                            <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>· Exact route ↗</span>
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
