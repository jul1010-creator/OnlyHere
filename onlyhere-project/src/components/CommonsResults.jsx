import { C } from "../utils/theme";

// ── "I CANNOT PICK OUT WIKIMEDIA" ───────────────────────────────────
//
// Oliver, 18 Sep 2026, of the fact generator: "the published 'facts' do not
// allow me to pick out Wikimedia. It just chooses one from Wiki itself."
//
// He is right and the button was lying about what it does. It is labelled
// Wikimedia and it asked api/commons-photo for `limit=1` and took results[0],
// which for a subject with a Wikipedia article is that article's own lead image.
// One photo, no choice, and no way to see that there were others. The Media
// panel and the draft panel have both asked for eight and shown a grid since
// the day they were written.
//
// ── ONE GRID, AND THIS IS THE FIRST FILE OF IT ──────────────────────
//
// The other two draw this grid inline, and each of them is welded to its own
// panel's wiring: a query input addressed by element id, a hero status line, an
// upload control, a busy flag with a different name. A third inline copy is
// what this codebase calls its signature failure, so the grid is a component
// from here on. The facts panel uses it now; moving the older two onto it is a
// named follow-up rather than a thing to do in the same edit as a bug fix,
// because the suite pins strings inside both of them and a refactor that also
// rewrites assertions is a refactor nobody can review.
//
// THE CREDIT IS NOT OPTIONAL. A CC BY or CC BY-SA file may only be republished
// WITH attribution, so the photographer and the licence are on the card the
// picking happens on, and `onUse` is handed the whole hit rather than a url:
// every caller writes the image and its credit in one go, which is the rule
// api/commons-photo exists to make possible.
export const CommonsResults = ({ finder, onUse, busy = false, busyUrl = "" }) => {
  if (!finder) return null;
  const { loading, error, results, sources, query, subject } = finder;
  if (loading) return <div style={{ fontSize: 11.5, color: C.muted }}>Searching Wikimedia…</div>;
  if (error) return <div style={{ fontSize: 11, color: "#FFB347", lineHeight: 1.5 }}>{error}</div>;
  if (Array.isArray(results) && results.length === 0) {
    return (
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
        Nothing usable found. Commons had no freely licensed photo for that search, or every match was non-commercial, no-derivatives, or had no nameable author. Try a different wording.
      </div>
    );
  }
  if (!Array.isArray(results) || !results.length) return null;

  // ── WHICH LOOKUPS ANSWERED ────────────────────────────────────────
  // A search that matched no article and no category has fallen through to the
  // blind text search, and nothing it returns has been judged to be about this
  // place at all. That is how four Rhine barges once ended up under a royal
  // palace, and it is the one warning this grid must carry wherever it is used.
  const live = (sources || []).filter(sc => sc.used > 0);
  const dead = (sources || []).filter(sc => sc.found === 0);
  const off = (sources || []).reduce((n, sc) => n + (sc.offSubject || 0), 0);
  const onlySearch = live.length === 1 && live[0].source === "Commons search";

  return (
    <>
      {(sources || []).length > 0 && (
        <div style={{ fontSize: 10, color: onlySearch ? "#FFB347" : C.muted, lineHeight: 1.55, marginBottom: 8 }}>
          {onlySearch
            ? `Only the blind text search found anything. No Wikipedia article and no Commons category matched "${query}", so nothing here has been judged to be about the right place.`
            : `From: ${live.map(sc => `${sc.source} (${sc.used})`).join(", ")}.`}
          {dead.length > 0 && !onlySearch && <span> Found nothing: {dead.map(sc => sc.source).join(", ")}.</span>}
          {off > 0 && <span> {off} text-search {off === 1 ? "result" : "results"} never mentioned {subject ? `"${subject}"` : "the subject"} and {off === 1 ? "was" : "were"} dropped.</span>}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
        {results.map(hit => (
          <div key={hit.url} style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: C.surface }}>
            <img src={hit.url} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: 78, objectFit: "cover", display: "block" }} />
            <div style={{ padding: "6px 7px" }}>
              {/* The description first, because "Ringkobing Kirkegard" tells you
                  what the picture is and "DSC00575.jpg" does not. */}
              {hit.caption && <div title={hit.caption} style={{ fontSize: 10, color: C.text, fontWeight: 700, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hit.caption}</div>}
              <div title={hit.title} style={{ fontSize: 9.5, color: hit.caption ? C.muted : C.text, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hit.title}</div>
              <div style={{ fontSize: 8.5, color: hit.source === "Commons search" ? "#FFB347" : C.muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hit.source}</div>
              <div style={{ fontSize: 9.5, color: C.light, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hit.credit?.photographer || hit.credit?.source || ""}</div>
              <div style={{ fontSize: 9, color: C.gold, marginBottom: 5 }}>{hit.credit?.license}</div>
              <button onClick={() => onUse(hit)} disabled={busy}
                style={{ width: "100%", background: C.gold, border: "none", color: C.onGold, borderRadius: 100, padding: "4px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {busyUrl === hit.url ? "Saving…" : "Use this"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
