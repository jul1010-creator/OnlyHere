import { useState } from "react";
// ── "MAKE THE BLOGS A 'READ MORE'" ──────────────────────────────────
//
// Oliver, 5 Sep 2026, on the Aarhus nightlife town page: "can you make the
// blogs a 'read more'? Right under the gemlyx find. So people can instantly
// click into bars."
//
// The nightTown prompt asks for Who It's For, After Dark, The Reality Check and
// three What to Be Aware Of bullets, and all of it renders between the Gemlyx
// Find and the list of bars. That is 230 to 330 words of prose standing between
// somebody who came to find a bar and the bars. The words are good and they are
// in the wrong place for the job the page is doing.
//
// SO NOTHING IS CUT. The prose is one press away rather than one scroll away,
// and the press is where he asked for it, directly under the Gemlyx Find.
//
// ── AND THE BODY IS NOT MOUNTED WHILE IT IS CLOSED ──────────────────
//
// Rendered conditionally rather than hidden with CSS, because BlogBody can
// mount an InstagramEmbed and an iframe nobody can see still costs the reader
// their data. A page whose whole point is getting out of the way should not
// load an embed on the way past.
export default function ReadMore({ children, C, more = "Read more", less = "Show less", style }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={style}>
      <button onClick={() => setOpen(v => !v)} aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "10px 0 0", fontFamily: "'Inter', sans-serif" }}>
        {open ? less : more}
        {/* Turned rather than swapped, so the control reads as one thing in two
            states instead of two controls that happen to share a spot. */}
        <span style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s ease", fontSize: 11 }}>▾</span>
      </button>
      {open && children}
    </div>
  );
}
