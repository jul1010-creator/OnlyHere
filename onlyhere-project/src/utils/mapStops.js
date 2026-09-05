// ── PINS ON TOP OF ONE ANOTHER, AND WHAT IS UNDER THEM ──────────────
//
// Oliver, 5 Sep 2026, with five screenshots of his own route map:
//
//   "If something is on top of oneanother, then when you click it, you should
//   zoom down towards them all. And then when you click one, you zoom into that
//   and you get a short explanation of the place. You can include what is close
//   by, but explain what this is with a short 50 words resume. And when you
//   click out of it, you zoom out again."
//
// Three things, and the map did none of them.
//
//   OVERLAPPING PINS WERE UNREACHABLE. His own screenshot has a starburst at
//   Tønder where two stops sit within a few hundred metres of each other at
//   national zoom. Leaflet draws the second on top of the first, so a click can
//   only ever reach one of them and nothing tells a reader the other is there.
//
//   THE PANEL NEVER SAID WHAT THE PLACE WAS. It read "Nothing else in our own
//   guides is within a 1200 m walk of Day 2 · LEGO House yet." — a true sentence
//   about the neighbours of a place it never describes. He asked what it was, and
//   the guide already answers that: every stop carries a note the writer wrote
//   for it. It was on the page and not on the map.
//
//   AND THERE WAS NO WAY BACK. Clicking flew down to zoom 15 and left you there.
//   Closing the panel closed a panel.
//
// ── WHERE THE FIFTY WORDS COME FROM ─────────────────────────────────
//
// Asked, he picked the guide's own words over a fresh summary, which is the same
// call this codebase makes everywhere else: a sentence already written and
// already fact-checked cannot become a new claim about Denmark, and a model
// asked for fifty words about LEGO House would produce fifty words that nothing
// in the pipeline has ever read.

// ── WHICH PINS WOULD LAND ON EACH OTHER ─────────────────────────────
//
// In SCREEN pixels, not in kilometres, because that is the actual question. Two
// stops 800 m apart are one blob at national zoom and comfortably separate in a
// town, and a kilometre threshold would have to be re-guessed for every zoom
// level. Web Mercator is what the tiles are drawn in, so this is the same
// arithmetic Leaflet does.
const TILE = 256;

export const pixelAt = (lat, lon, zoom) => {
  const scale = TILE * Math.pow(2, Number(zoom) || 0);
  const x = ((Number(lon) + 180) / 360) * scale;
  const rad = (Math.max(-85.05112878, Math.min(85.05112878, Number(lat))) * Math.PI) / 180;
  const y = (0.5 - Math.log((1 + Math.sin(rad)) / (1 - Math.sin(rad))) / (4 * Math.PI)) * scale;
  return { x, y };
};

// A pin is 26-30 px across, so two centres inside 30 px overlap. 34 is that plus
// a little, because two pins that merely touch are already unreadable.
export const OVERLAP_PX = 34;

// Groups of pins that a reader cannot tell apart at this zoom. Every point comes
// back in exactly one group, in route order, and a group of one is a lone pin —
// callers do not have to special-case anything.
export const clusterPins = (points, zoom, { px = OVERLAP_PX } = {}) => {
  const list = (Array.isArray(points) ? points : [])
    .map((p, i) => ({ p, i, ...pixelAt(p?.lat, p?.lon, zoom) }))
    .filter(e => Number.isFinite(e.x) && Number.isFinite(e.y));
  const taken = new Set();
  const out = [];
  for (const seed of list) {
    if (taken.has(seed.i)) continue;
    taken.add(seed.i);
    const members = [seed];
    // Single pass from the seed, not transitive: a chain of pins each 30 px from
    // the last would otherwise swallow a whole coastline into one group, and the
    // reader would click a pin in Ribe and be flown to a box containing Aarhus.
    for (const other of list) {
      if (taken.has(other.i)) continue;
      if (Math.hypot(other.x - seed.x, other.y - seed.y) <= px) {
        taken.add(other.i);
        members.push(other);
      }
    }
    out.push({ indexes: members.map(m => m.i).sort((a, b) => a - b), points: members.map(m => m.p) });
  }
  return out.sort((a, b) => a.indexes[0] - b.indexes[0]);
};

// The box a cluster needs to be readable, in lat/lon, for a flyToBounds.
export const clusterBounds = (points) => {
  const list = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
  if (!list.length) return null;
  const lats = list.map(p => p.lat), lons = list.map(p => p.lon);
  return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
};

// ── FIFTY WORDS OF WHAT THE GUIDE ALREADY SAID ──────────────────────
//
// Cut at a SENTENCE, not at a word, whenever a sentence ends anywhere near the
// limit. "It suits people who want real medieval streets and Viking history
// without a crowd, and it will bore anyone hoping for…" is the shape a
// word-count trim produces, and it is worse than either a shorter whole thought
// or a longer one.
export const BLURB_WORDS = 50;
// Half. Below that a sentence break is not a shorter version of the note, it is
// a different note, and the word cut with an ellipsis says more.
//
// Two thirds was the first number and it was wrong on the first real note tried
// against it: LEGO House's first sentence is 29 words of a 50 word budget, a
// complete and useful thought, and 29 fell one word under the bar — so the card
// showed fifty words ending "expect the adults…" instead. The threshold exists to
// stop a one-line opener standing in for a paragraph, and half a card of finished
// prose is not that.
const MIN_SENTENCE_SHARE = 0.5;

export const stopBlurb = (note, { words = BLURB_WORDS } = {}) => {
  const text = String(note ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const all = text.split(" ");
  if (all.length <= words) return text;
  const cut = all.slice(0, words).join(" ");
  // The last sentence end inside the budget, if it is far enough in to still be
  // most of what was written.
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (end > 0) {
    const head = cut.slice(0, end + 1);
    if (head.split(" ").length >= words * MIN_SENTENCE_SHARE) return head;
  }
  return `${cut.replace(/[,;:.\s]+$/, "")}…`;
};

// ── AND THE WHOLE CARD, IN ORDER ────────────────────────────────────
//
// What it is first, where it is second. He asked for the explanation and said
// the neighbours "can" be included, which is the right order for both: a reader
// who has just flown down to a pin wants to know what they are looking at before
// they are told what is 400 m from it.
//
// `where` is describeLocation's sentence, passed in rather than computed, so
// this file does not have to know about the published library and there is still
// exactly one function that measures a distance.
export const stopCard = (stop, where = "", { words = BLURB_WORDS } = {}) => {
  const blurb = stopBlurb(stop?.note, { words });
  const place = String(where ?? "").trim();
  return [blurb, place].filter(Boolean).join(" ");
};

// ── WHAT THE CLUSTER SAYS BEFORE IT IS OPENED ───────────────────────
//
// A cluster pin is not a stop and must not be labelled as one: it is the answer
// to "why is there one dot where the list says there are three".
export const clusterLabel = (n) => `${n} stops here`;
export const clusterHint = (n) =>
  `${n} stops are on top of each other at this zoom. Open it to see them apart.`;
