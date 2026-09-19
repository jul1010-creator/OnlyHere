// ── A STOP THE MAP CANNOT PLACE ─────────────────────────────────────
//
// Oliver's own guide, tbfeb7jemku, read on 19 Sep 2026. Two of its stops,
// "Haderslev Cathedral" and "Haderslev Old Town", drew no pin. They sat in the
// day like every other stop, with a time and a stay length, and the map beside
// them simply had nothing on it where they should have been. Nothing in the
// build said so, to the reader or to the founder.
//
// Three separate things had to miss for that:
//
//   the name    "Haderslev Cathedral" is the English for Haderslev Domkirke,
//               and "Haderslev Old Town" is a description rather than an
//               address, so a geocoder finds neither
//   the town    townKeyFor("Haderslev") is null, because Gemlyx holds no page
//               for the town, so the town-centre fallback had no town
//   the plan    the planner offered a town the app cannot draw, which the chat
//               prompt already forbids for OFFERS and the planner is not bound
//               by in the same way
//
// The first two are fixed where they belong: the build geocodes an unknown town
// once and falls back to that point. This file is the third, and it is a
// REPORT rather than a repair, because a stop nothing can place is a hole in
// the content and the answer to it is a page for that town, which is Oliver's
// to write and not a guess this build can make.

// A stop, for this purpose, is a name and the town the planner put it in.
const stopsOf = (days) => (Array.isArray(days) ? days : []).flatMap((d, i) => {
  const dayNo = d?.day || i + 1;
  return (Array.isArray(d?.stops) ? d.stops : [])
    .map(s => ({ name: String(s?.name || "").trim(), town: String(s?.town || "").trim(), day: dayNo }))
    .filter(s => s.name);
});

// `placed` is asked rather than computed, for the reason everything in this
// family is injected: resolving a stop's coordinate means the live published
// rows, this build's geocoding and the curated town table, and a second reader
// of that question is how the pin and the distance came to disagree twice
// already. The build hands in the resolver it is about to draw with.
//
// ONE ROW PER NAME. A stop that appears on three days is one missing place and
// three lines about it is a list nobody reads to the end.
export const unplaceableStops = (days, placed) => {
  const ask = typeof placed === "function" ? placed : () => true;
  const seen = new Set();
  const out = [];
  for (const s of stopsOf(days)) {
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    if (!ask(s.name, s.town)) out.push(s);
  }
  return out;
};

// ── WHAT HE IS TOLD ─────────────────────────────────────────────────
//
// planProblems' voice: this run's own measurements disagreeing with this run's
// own output. Named rather than counted, because "2 stops missing" is not
// something anybody can act on and a name with a town beside it is: it says
// which page to write.
export const mapGapNote = (rows) => {
  const list = Array.isArray(rows) ? rows.filter(r => r && r.name) : [];
  if (!list.length) return "";
  return `${list.length === 1 ? "A stop has" : "Some stops have"} no coordinate, so ${list.length === 1 ? "it draws" : "they draw"} no pin and every leg touching ${list.length === 1 ? "it" : "them"} is unmeasured: `
    + list.map(r => `day ${r.day}, ${r.name}${r.town ? ` (${r.town})` : ""}`).join("; ")
    + ". The venue could not be geocoded and the town has no page in Gemlyx, which is the pair of gaps that has to close for a pin to appear.";
};
