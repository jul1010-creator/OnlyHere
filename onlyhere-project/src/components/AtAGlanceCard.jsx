import { C } from "../utils/theme";

export const AtAGlanceCard = ({ rows }) => {
  // NULL ROWS ARE ALLOWED, and they have to be. Every caller builds this list
  // inline, so the natural way to express "this row only sometimes applies" is a
  // conditional that evaluates to null — which is exactly what the town card's
  // relationLine row does, since almost no town is inside another place. The old
  // `rows.filter(r => r.value)` threw "Cannot read properties of null" on the
  // first one of those, taking the whole detail page down. Fixed here rather
  // than by making every caller remember to filter, because the next caller
  // will not.
  // ── A ROW CAN BE A LINK WITH NOTHING TO SAY ───────────────────────
  //
  // Oliver, 7 Sep 2026: "is it possible to put the 'book tickets' on the 'at a
  // glance'? So people won't miss it. Like a hyperlink on the price or
  // something." The Book tickets button sits below the fold on a long entry and
  // this card is the first thing under the title.
  //
  // A row with a link and no value still renders, because "Tickets: Book
  // tickets ↗" is complete and true, and an entry that carries a bookable link
  // but no ticket sentence would otherwise show nothing at all.
  const present = (Array.isArray(rows) ? rows : []).filter(r => r && (r.value || r.link?.href));
  if (present.length === 0) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>At a Glance</div>
      {present.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < present.length - 1 ? 10 : 0 }}>
          <span style={{ flexShrink: 0, width: 20 }}>{r.icon}</span>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.label}: </span>
            {r.value && <span style={{ fontSize: 12, color: C.light }}>{r.value}</span>}
            {r.link?.href && (
              <a href={r.link.href} target="_blank" rel={r.link.note ? "noreferrer sponsored nofollow" : "noreferrer"}
                style={{ fontSize: 12, fontWeight: 700, color: C.gold, textDecoration: "none", whiteSpace: "nowrap", marginLeft: r.value ? 8 : 0 }}>
                {r.link.label || "Book tickets"} ↗
              </a>
            )}
            {/* ── AND THE SENTENCE TRAVELS WITH THE LINK ─────────────
                The disclosure is under the button further down the page too,
                and this is not a duplicate to tidy away: this card sits ABOVE
                it, so a reader who takes this link would otherwise click a paid
                link having never passed the sentence. Whichever one they reach
                first is disclosed where they reach it. */}
            {r.link?.href && r.link?.note && (
              <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>{r.link.note}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Gemlyx Find — a distinct, branded callout for the one curated recommendation
// per entry, set apart visually from the rest of the writeup so it reads as
// "we picked this specifically for you," not just another paragraph.