import { C } from "../utils/theme";
// ── AND THE WORDS ON IT, IN THE READER'S LANGUAGE ───────────────────
// Oliver, 7 Sep 2026: "translating more of the website from English to Danish
// and German, rather than just the interface." Every row on this card was
// English in all three languages, under a Danish nav, and this is the first
// block a reader meets on an entry.
//
// ONE PLACE, because this component renders every glance row in the app: the
// labels DetailPage builds inline, the arrival label helpers.arrivalRow works
// out from the stop's name, and the price bands. The VALUES pass through
// untouched, which is what keeps a Danish page and an English page saying the
// same thing about Denmark.
import { entryWord } from "../utils/entryWords";
import { t as uiT, DEFAULT_UI_LANGUAGE } from "../utils/uiLanguage";

export const AtAGlanceCard = ({ rows, lang = DEFAULT_UI_LANGUAGE }) => {
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
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>{uiT("glance.title", lang)}</div>
      {present.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < present.length - 1 ? 10 : 0 }}>
          <span style={{ flexShrink: 0, width: 20 }}>{r.icon}</span>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{entryWord(r.label, lang)}: </span>
            {r.value && <span style={{ fontSize: 12, color: C.light }}>{r.value}</span>}
            {r.link?.href && (
              <a href={r.link.href} target="_blank" rel={r.link.note ? "noreferrer sponsored nofollow" : "noreferrer"}
                style={{ fontSize: 12, fontWeight: 700, color: C.gold, textDecoration: "none", whiteSpace: "nowrap", marginLeft: r.value ? 8 : 0 }}>
                {entryWord(r.link.label || "Book tickets", lang)} ↗
              </a>
            )}
            {/* ── AND THE SENTENCE TRAVELS WITH THE LINK ─────────────
                The disclosure is under the button further down the page too,
                and this is not a duplicate to tidy away: this card sits ABOVE
                it, so a reader who takes this link would otherwise click a paid
                link having never passed the sentence. Whichever one they reach
                first is disclosed where they reach it. */}
            {/* ── AND WHOSE PRICE THE NUMBER IS ──────────────────────
                Oliver, 8 Sep 2026: "199.. you click link, and it says 289."
                Every row this decorates carries a price, and on 11 of the 11
                published rows that have a ticket link, the price was read
                somewhere other than the shop that sells it. Naming the source
                is what keeps those two numbers from reading as one.

                SEPARATE FROM THE NOTE, not appended to it, because `note` is
                the paid-link disclosure and this line is not: rel="sponsored"
                is set from the presence of that note, and a link earning
                nothing must not acquire one by carrying a price source. */}
            {r.link?.href && r.link?.source && (
              <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>
                {uiT("entry.priceFrom", lang)} {r.link.source}
              </div>
            )}
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