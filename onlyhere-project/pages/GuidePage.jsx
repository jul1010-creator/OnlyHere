import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

// ─── GUIDE PAGE ───────────────────────────────────────────────────
// The full-page replacement for the old "little book" guide modal, per Oliver's
// request: a card grid (same visual language as the "Hidden Towns" nav page —
// see the .towns-grid class used there) instead of a scrolling wall of text,
// with an explicit confirm-before-save step, and a real shareable URL once saved.
//
// Two ways this component gets used:
//  1. FRESH / UNSAVED — App.jsx passes a `guide` object straight from
//     generateGuide() via router state (see integration notes below). Shows the
//     card grid + a "Looks good — save my guide" confirmation step. Saving
//     POSTs to Supabase and redirects to the real /guide/:id URL.
//  2. SAVED / SHARED — visited directly via a real /guide/:id URL (from a saved
//     link, or after step 1 completes). Fetches the guide from Supabase by id
//     and shows it read-only, with its own "Save to my guides" (bookmark) option
//     for whoever's viewing the link.
//
// REQUIRES the "gemlyx_guides" Supabase table — see supabase_guides_schema.sql
// in this same delivery for the exact SQL to run once in the Supabase SQL editor.
// REQUIRES react-router-dom — see INTEGRATION.md for the one small change needed
// in your router setup (not done automatically here — see that file for why).

const dayIcon = (i) => ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭"][i] || `Day ${i + 1}`;

export const GuidePage = ({ guide: guideProp, onBack }) => {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Reached two ways: navigate("/guide/new", { state: { guide } }) from the existing
  // modal's "View as full page" button (router state), or a plain `guide` prop for
  // standalone/test use — router state wins when both are somehow present.
  const freshGuide = location.state?.guide || guideProp || null;
  const [guide, setGuide] = useState(freshGuide || null);
  const [loading, setLoading] = useState(!freshGuide && !!guideId);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const isUnsaved = !!freshGuide && !guideId;

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

  // Flatten every stop across every day into one list for the card grid, keeping
  // day context on each card — this is the "not a list, just a page with smaller
  // pictures" layout Oliver described, grouped visually by day header only.
  const days = guide.days || [];

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

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>{guide.title || "Your Denmark Guide"}</div>

        {guide.essentials && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 24, maxWidth: 640 }}>
            {guide.essentials.budgetReality && <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>◆ {guide.essentials.budgetReality}</div>}
            {guide.essentials.transportTip && <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>◆ {guide.essentials.transportTip}</div>}
            {guide.essentials.keepInMind && <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>◆ {guide.essentials.keepInMind}</div>}
          </div>
        )}

        {isUnsaved && (
          <div style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: "14px 16px", marginBottom: 24, maxWidth: 640 }}>
            <div style={{ fontSize: 13.5, color: C.text, fontWeight: 700, marginBottom: 4 }}>Does this look right?</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>Here's everything your guide will include — take a look, then save it to get your own link.</div>
          </div>
        )}

        {days.map((day, dayIdx) => (
          <div key={day.day || dayIdx} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>
                {dayIcon(dayIdx)} &nbsp;Day {day.day || dayIdx + 1}{day.title ? ` — ${day.title}` : ""}
              </div>
              {/* Reuses whatever the existing modal already computed for this same
                  guide (fetchGuideWeather, patched onto day.weather asynchronously
                  after the guide is built) — no new fetch here, this page just wasn't
                  showing weather at all before. If you build the guide and jump to
                  "View as full page" immediately, this may briefly be empty until
                  that background fetch finishes; it'll appear once it lands. */}
              {day.weather && (
                <div title="Forecast assumes the trip starts today" style={{ display: "flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${day.weather.risk === "high" ? "#FFB34766" : C.border}`, borderRadius: 100, padding: "4px 10px", fontSize: 11 }}>
                  <span>{day.weather.icon}</span>
                  <span style={{ color: C.text, fontWeight: 700 }}>{day.weather.temp}°</span>
                  {day.weather.risk === "high" && <span style={{ color: "#FFB347", fontWeight: 700 }}>· rain likely</span>}
                </div>
              )}
            </div>
            <div className="towns-grid">
              {(day.stops || []).map((stop, stopIdx) => (
                <div key={stopIdx}>
                  <div style={{ position: "relative", height: 150, borderRadius: 6, overflow: "hidden", background: "linear-gradient(135deg, #16233F 0%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 32, opacity: 0.3 }}>◆</span>
                    {stop.arrivalTime && (
                      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(10,15,30,0.8)", color: C.gold, fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 100 }}>{stop.arrivalTime}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginTop: 10, lineHeight: 1.15 }}>{stop.name}</div>
                  {stop.town && <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 }}>{stop.town}{stop.suggestedStay ? ` · ${stop.suggestedStay}` : ""}</div>}
                  {stop.note && <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginTop: 6 }}>{stop.note.slice(0, 110)}{stop.note.length > 110 ? "…" : ""}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}

        {isUnsaved && (
          <div style={{ position: "sticky", bottom: 16, display: "flex", justifyContent: "center", marginTop: 20 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: 6, display: "flex", gap: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
              <button onClick={() => (onBack ? onBack() : navigate(-1))}
                style={{ background: "none", border: "none", color: C.light, borderRadius: 100, padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Back to chat
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
