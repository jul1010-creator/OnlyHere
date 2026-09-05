import { useRef, useState, useEffect, useCallback } from "react";

// ── THE PAGES SCROLL, THE DETOUR BUTTON NEVER DOES ──────────────────
//
// Oliver, 5 Sep 2026: "at the header, Gemlyx Detour should ALWAYS be visible as
// a whole. However, the rest of the header panel can have <-rd word word wo->..
// so basically <-fe(nightlife) events tips (essentials)ess-> Gemlyx Detour."
// And: "It doesn't even need to be a arrow you click. just when holding your
// mouse over the arrow it strifes."
//
// He is right, and the important half is structural rather than visual. Gemlyx
// Detour was the ninth entry in NAV_ITEMS, so it lived INSIDE the row that
// clips, and it was the last thing in it, which makes it the first casualty:
// his own screenshot reads "✦ Gemlyx Det". Taking it out of the strip is what
// makes "always visible" true by construction rather than by choosing a
// breakpoint carefully enough.
//
// ── AND IT RETIRES THE BREAKPOINTS ──────────────────────────────────
//
// This is the part worth having. The nav has now been given a width twice, and
// both times the number was wrong for a language: 1180 was measured for English
// and hid the Danish and German navs, and 1240/1300/1400 hid them harder. A
// strip that SCROLLS does not need a number at all. It fits at every width by
// definition, so the per-language media queries go, and with them the whole
// class of bug where translating the site quietly removed its navigation.
//
// One breakpoint survives, and it answers a different question: is this a
// screen that should have a top nav at all, or does the burger hold it. That is
// about the shape of the device and not about how long a word is in German.
//
// ── WHY A SLIVER RATHER THAN WHOLE WORDS ────────────────────────────
//
// He offered both and preferred the sliver: "it might annoy people to click
// through". Agreed, and there is a second reason. A half-word at the edge is
// what TELLS you the strip scrolls. Snapping to whole words hides that there is
// more, so the arrow has to carry the whole message on its own, and a person
// who does not notice the arrow never learns the rest of the nav exists.
export const NavStrip = ({ children, C }) => {
  const ref = useRef(null);
  const timer = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Both edges, recomputed on scroll, on resize and when the children change.
  // The language switch changes every label at once, so the last of those is
  // not theoretical: without it the arrows describe the previous language's
  // widths until something else happens to nudge them.
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return undefined;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { el.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [measure, children]);

  // Held, not clicked. Cleared on leave AND on unmount: an interval that
  // outlives the component would go on scrolling an element that no longer
  // exists, which is a thrown error on every tick rather than a slow leak.
  const stop = useCallback(() => { if (timer.current) { clearInterval(timer.current); timer.current = null; } }, []);
  useEffect(() => stop, [stop]);
  const strafe = (dir) => {
    stop();
    timer.current = setInterval(() => {
      const el = ref.current;
      if (!el) return stop();
      el.scrollLeft += dir * 6;
    }, 16);
  };

  // The arrow, and the fade under it. The fade is the honest half: it is what
  // makes a word cut in two read as "there is more this way" rather than as a
  // rendering fault, which is exactly how the clipped version read.
  const arrow = (side) => (
    <div
      onMouseEnter={() => strafe(side === "left" ? -1 : 1)}
      onMouseLeave={stop}
      onClick={() => { const el = ref.current; if (el) el.scrollLeft += (side === "left" ? -1 : 1) * 140; }}
      aria-hidden="true"
      style={{
        position: "absolute", top: 0, bottom: 0, [side]: 0, width: 34,
        display: "flex", alignItems: "center", justifyContent: side === "left" ? "flex-start" : "flex-end",
        cursor: "pointer", zIndex: 2,
        background: `linear-gradient(to ${side === "left" ? "right" : "left"}, ${C.bg} 35%, transparent)`,
      }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {side === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </div>
  );

  return (
    <div className="gx-topnav" style={{ position: "relative", minWidth: 0, flex: 1 }}>
      {edges.left && arrow("left")}
      {/* gx-navstrip hides the scrollbar. Touch needs no arrows at all: a strip
          that scrolls is already swipeable, and hover does not exist there. */}
      <div ref={ref} className="gx-navstrip"
        style={{ display: "flex", alignItems: "center", gap: 2, overflowX: "auto", overscrollBehaviorX: "contain", scrollBehavior: "auto" }}>
        {children}
      </div>
      {edges.right && arrow("right")}
    </div>
  );
};
