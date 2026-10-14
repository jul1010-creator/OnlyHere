// ── THE BANNER ACROSS THE TOP OF EXPLORE ────────────────────────────
//
// Oliver, 14 Oct 2026, with lidl.dk's front page: "We need such a top banner.
// And then we'll put 'nightlife' 'attractions' etc. under it. Then when you
// click the navigations, the video will replace the banner." And: "Under it
// that explore page banner, you then have the navigations. That is how the PC
// shall look like anyway."
//
// So, as Lidl's: the full width of the page, a few slides that move on by
// themselves, arrows at the sides on a computer, a swipe on a phone, dots
// under it and a pause button in the corner. The first slide is Gemlyx's own
// (the deals, only here, and the turning mark); the others are deals that are
// on now. Tapping a kind of place puts that kind's film in the same box with
// its name over it, the way Lidl's "Mad og drikke" page opens, and the slides
// wait underneath until the film goes again.
//
// The slides stop by themselves for anybody whose phone asks for less motion,
// and while the page is not being looked at.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { GemlyxMarkFine } from "./GemlyxLogo";
import { CategoryVideo, CATEGORY_VIDEO } from "./CategoryVideo";
import { CATEGORY_ICON } from "./CategoryFilter";

export const SLIDE_SECONDS = 7;
export const MAX_DEAL_SLIDES = 3;

const CSS = `
.gx-banner { height: clamp(300px, 30vw, 520px); }
.gx-banner-arrow { display: none; }
@media (hover: hover) and (min-width: 720px) { .gx-banner-arrow { display: flex; } }
@media (max-width: 719px) {
  .gx-banner { height: min(112vw, 470px); }
  .gx-banner-text { align-items: flex-end !important; padding-bottom: 72px; }
  .gx-brand-mark { top: 6% !important; height: 42% !important; right: auto !important; left: 50% !important; transform: translateX(-50%) !important; }
  .gx-deal-icon { top: 8% !important; right: 6% !important; height: 30% !important; transform: none !important; opacity: 0.14 !important; }
}
@keyframes gx-banner-spin { to { transform: rotate(360deg); } }
.gx-banner-spin { animation: gx-banner-spin 120s linear infinite; }
@media (prefers-reduced-motion: reduce) { .gx-banner-spin { animation: none; } }
`;

const safePhoto = (p) => { const s = String(p || ""); return /^https:\/\//i.test(s) || /^\/[A-Za-z0-9_\-./]+$/.test(s) ? s : ""; };

const roundBtn = () => ({
  width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
  background: "rgba(14,14,17,0.62)", color: "#FFFFFF", backdropFilter: "blur(6px)",
  alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1, padding: 0,
});

// Gemlyx's own slide: the headline on the left, the mark turning on the right.
const BrandSlide = ({ lang }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 140% at 85% 40%, #2A2216 0%, #16130E 45%, ${C.bg} 100%)` }}>
    {/* Inside the banner, ring and all (14 Oct 2026: "that circle should be
        inside the banner"). */}
    <div aria-hidden="true" className="gx-brand-mark" style={{ position: "absolute", top: "9%", height: "82%", aspectRatio: "1 / 1", right: "clamp(24px, 7vw, 140px)", opacity: 0.95 }}>
      <div className="gx-banner-spin" style={{ width: "100%", height: "100%" }}>
        <GemlyxMarkFine id="gx-banner" />
      </div>
    </div>
    <div className="gx-banner-text" style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, display: "flex", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 1120, margin: "0 auto", padding: "0 clamp(20px, 5vw, 64px)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", color: C.gold, marginBottom: 14 }}>Klaipėda</div>
        <h1 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "clamp(34px, 5.2vw, 72px)", lineHeight: 1.04, letterSpacing: -0.6, color: "#F4EFE6", maxWidth: 680 }}>
          {uiT("trips.dealsH", lang)}<br /><span style={{ color: C.gold }}>{uiT("banner.only", lang)}</span>
        </h1>
        <div style={{ marginTop: 16, fontSize: "clamp(14px, 1.3vw, 17px)", lineHeight: 1.5, color: "rgba(244,239,230,0.78)", maxWidth: 460 }}>{uiT("banner.sub", lang)}</div>
      </div>
    </div>
  </div>
);

// A deal that is on now. Its photo when it has one; otherwise its kind of
// place drawn large and quiet on the right, in gold like the circles.
const DealSlide = ({ s, lang, onOpen }) => {
  const photo = safePhoto(s.photo);
  const colour = C.gold;
  const Icon = CATEGORY_ICON[s.cat];
  return (
    <div style={{ position: "absolute", inset: 0, background: photo ? "#0B0A08" : `radial-gradient(120% 140% at 85% 45%, ${colour}38 0%, #15130F 50%, ${C.bg} 100%)` }}>
      {photo ? (
        <>
          <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 100%)" }} />
        </>
      ) : Icon && (
        <svg aria-hidden="true" className="gx-deal-icon" viewBox="0 0 24 24" style={{ position: "absolute", top: "50%", right: "6%", height: "62%", transform: "translateY(-50%)", opacity: 0.3 }}>
          {Icon(colour, 1.2)}
        </svg>
      )}
      <div className="gx-banner-text" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 1120, margin: "0 auto", padding: "0 clamp(20px, 5vw, 64px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            {s.badge && <span style={{ background: "#FFFFFF", color: "#111111", borderRadius: 100, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>{s.badge}</span>}
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "rgba(244,239,230,0.75)" }}>{[s.tag, s.name].filter(Boolean).join(" · ")}</span>
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "clamp(28px, 4.2vw, 58px)", lineHeight: 1.08, letterSpacing: -0.4, color: "#F4EFE6", maxWidth: 760, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.offer}</div>
          <button type="button" onClick={() => onOpen?.(s.key)} data-testid="banner-deal-open"
            style={{ marginTop: 22, background: C.gold, color: C.onGold || "#111", border: "none", borderRadius: 100, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {uiT("banner.see", lang)}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExploreBanner = ({ slides = [], cat = null, catLabel = "", lang = "en", examples = false, onOpen = null }) => {
  const n = Math.max(1, slides.length);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [calm] = useState(() => { try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; } catch { return false; } });
  const film = !!(cat && CATEGORY_VIDEO[cat]);
  const [filmPaused, setFilmPaused] = useState(false);
  useEffect(() => { setFilmPaused(false); }, [cat]);
  useEffect(() => { if (idx >= n) setIdx(0); }, [n, idx]);
  // Moves on by itself, unless paused, calm, showing a film, or hidden.
  useEffect(() => {
    if (paused || calm || film || n < 2) return undefined;
    const t = setInterval(() => { if (typeof document === "undefined" || document.visibilityState !== "hidden") setIdx(i => (i + 1) % n); }, SLIDE_SECONDS * 1000);
    return () => clearInterval(t);
  }, [paused, calm, film, n, idx]);
  const step = (d) => setIdx(i => (i + d + n) % n);
  // A swipe on a phone.
  const touch = useRef(null);
  const onTouchStart = (e) => { touch.current = e.touches?.[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; };
  const onTouchEnd = (e) => {
    const a = touch.current; touch.current = null;
    const b = e.changedTouches?.[0];
    if (!a || !b || film) return;
    const dx = b.clientX - a.x, dy = b.clientY - a.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) { e.stopPropagation(); step(dx < 0 ? 1 : -1); }
  };
  const pauseLabel = film ? (filmPaused ? uiT("banner.play", lang) : uiT("banner.pause", lang)) : (paused ? uiT("banner.play", lang) : uiT("banner.pause", lang));
  const isPaused = film ? filmPaused : paused;

  return (
    <div data-testid="explore-banner" data-film={film ? cat : ""}>
      <style>{CSS}</style>
      <div className="gx-banner" data-own-swipe="" role="region" aria-roledescription="carousel" aria-label={uiT("trips.dealsH", lang)}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position: "relative", width: "100%", overflow: "hidden", background: C.bg }}>
        {slides.map((s, i) => (
          <div key={s.key || s.kind} data-testid={`banner-slide-${i}`} aria-hidden={i !== idx}
            style={{ position: "absolute", inset: 0, opacity: i === idx ? 1 : 0, transition: "opacity 600ms ease", pointerEvents: i === idx && !film ? "auto" : "none" }}>
            {s.kind === "brand" ? <BrandSlide lang={lang} /> : <DealSlide s={s} lang={lang} onOpen={onOpen} />}
          </div>
        ))}
        <CategoryVideo k={cat} playing={!filmPaused} />
        {/* The kind of place, over its film, as Lidl names its own. */}
        <div aria-hidden={!film} style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3, pointerEvents: "none", opacity: film ? 1 : 0, transition: "opacity 450ms ease" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(20px, 5vw, 64px) clamp(18px, 3vw, 36px)" }}>
            <h1 data-testid="banner-film-title" style={{ margin: 0, fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "clamp(36px, 5.5vw, 76px)", lineHeight: 1, letterSpacing: -0.6, color: "#FFFFFF", textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}>{film ? catLabel : ""}</h1>
          </div>
        </div>
        {examples && (
          <span data-testid="deals-near-examples" style={{ position: "absolute", top: 14, left: 14, zIndex: 4, fontSize: 10, fontWeight: 700, color: "#F4EFE6", background: "rgba(14,14,17,0.55)", border: "1px solid rgba(244,239,230,0.35)", borderRadius: 100, padding: "4px 10px", letterSpacing: 0.6, textTransform: "uppercase", backdropFilter: "blur(6px)" }}>{uiT("deals.example", lang)}</span>
        )}
        {!film && n > 1 && (
          <>
            <button type="button" className="gx-banner-arrow" onClick={() => step(-1)} aria-label={uiT("banner.prev", lang)} data-testid="banner-prev"
              style={{ ...roundBtn(), position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 4 }}>‹</button>
            <button type="button" className="gx-banner-arrow" onClick={() => step(1)} aria-label={uiT("banner.next", lang)} data-testid="banner-next"
              style={{ ...roundBtn(), position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 4 }}>›</button>
          </>
        )}
        {(film || n > 1) && (
          <button type="button" onClick={() => (film ? setFilmPaused(v => !v) : setPaused(v => !v))} aria-label={pauseLabel} aria-pressed={isPaused} data-testid="banner-pause"
            style={{ ...roundBtn(), display: "flex", position: "absolute", right: 16, bottom: 16, zIndex: 4, width: 40, height: 40, fontSize: 13 }}>
            {isPaused ? "▶" : "❚❚"}
          </button>
        )}
      </div>
      {/* The dots under it, as Lidl's. Gone while a film is shown. */}
      <div role="tablist" aria-label={uiT("trips.dealsH", lang)} style={{ display: "flex", justifyContent: "center", gap: 6, height: 26, alignItems: "center", opacity: film || n < 2 ? 0 : 1, transition: "opacity 300ms ease" }}>
        {n > 1 && slides.map((s, i) => (
          <button key={s.key || s.kind} type="button" role="tab" aria-selected={i === idx} aria-label={`${i + 1} / ${n}`} onClick={() => setIdx(i)} tabIndex={film ? -1 : 0}
            style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 100, border: "none", padding: 0, cursor: "pointer", background: i === idx ? C.gold : `${C.muted}88`, transition: "width 250ms ease, background 250ms ease" }} />
        ))}
      </div>
    </div>
  );
};

export default ExploreBanner;
