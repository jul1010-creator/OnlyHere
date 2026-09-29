// ── THE TOP BAR, GROUPED ────────────────────────────────────────────
//
// The dropdown menu Oliver asked for on 30 Sep 2026. See utils/navGroups.js
// for the grouping and why a group with one page left is just that page.
//
// THE PANEL IS FIXED, NOT ABSOLUTE. The bar sits inside NavStrip, which
// scrolls sideways and so clips anything hanging out of it. A panel placed
// from the button's own rectangle with position: fixed is outside that clip
// and still lines up under the button it belongs to.
import { useEffect, useRef, useState } from "react";
import { Ico } from "./Icon";
import { childActive, groupActive } from "../utils/navGroups";

export const NavGroupButtons = ({ groups = [], active, eventTab, onPick, C }) => {
  const [open, setOpen] = useState(null); // { id, left, top }
  const closeTimer = useRef(null);
  const hold = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const closeSoon = () => { hold(); closeTimer.current = setTimeout(() => setOpen(null), 180); };
  useEffect(() => () => hold(), []);
  useEffect(() => {
    if (!open) return undefined;
    const shut = (e) => { if (!e.target.closest?.("[data-navgroup]")) setOpen(null); };
    const esc = (e) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", shut);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", () => setOpen(null), { once: true });
    return () => { document.removeEventListener("mousedown", shut); document.removeEventListener("keydown", esc); };
  }, [open]);

  const place = (id, el) => {
    const r = el.getBoundingClientRect();
    setOpen({ id, left: Math.max(8, Math.min(r.left, window.innerWidth - 228)), top: r.bottom + 6 });
  };
  const pick = (child) => { setOpen(null); onPick?.(child); };
  const tabStyle = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none",
    borderBottom: `2px solid ${on ? C.gold : "transparent"}`, color: on ? C.text : C.light,
    padding: "8px 10px 6px", fontSize: 13, fontWeight: on ? 700 : 500, cursor: "pointer",
    whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif", flexShrink: 0,
  });

  const openGroup = groups.find(g => g.id === open?.id);
  return (
    <>
      {groups.map(g => {
        const on = groupActive(g, active, eventTab);
        if (g.single) {
          const c = g.children[0];
          return (
            <button key={g.id} data-testid={`nav-${g.id}`} onClick={() => pick(c)} style={tabStyle(on)}>
              {c.ico && <Ico name={c.ico} size={14} color={on ? C.gold : C.muted} />}
              {c.label}
            </button>
          );
        }
        const isOpen = open?.id === g.id;
        return (
          <button key={g.id} data-navgroup data-testid={`nav-${g.id}`} aria-haspopup="menu" aria-expanded={isOpen}
            onClick={(e) => (isOpen ? setOpen(null) : place(g.id, e.currentTarget))}
            onMouseEnter={(e) => { hold(); place(g.id, e.currentTarget); }}
            onMouseLeave={closeSoon}
            style={tabStyle(on)}>
            {g.ico && <Ico name={g.ico} size={14} color={on ? C.gold : C.muted} />}
            {g.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={on ? C.gold : C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        );
      })}
      {openGroup && (
        <div data-navgroup role="menu" onMouseEnter={hold} onMouseLeave={closeSoon}
          style={{ position: "fixed", left: open.left, top: open.top, zIndex: 1200, minWidth: 220, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
          {openGroup.children.map(c => {
            const on = childActive(c, active, eventTab);
            return (
              <button key={c.key} role="menuitem" data-testid={`nav-item-${c.key}`} onClick={() => pick(c)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: on ? `${C.accent}22` : "transparent", color: on ? C.text : C.light, border: "none", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, fontWeight: on ? 700 : 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {c.ico && <Ico name={c.ico} size={15} color={on ? C.gold : C.muted} />}
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
