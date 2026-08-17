// ── WHAT MAKES A SET OF PAGES LOOK MACHINE-MADE ──────────────────────
//
// Oliver, 16 Aug 2026, going to bed: "Google hides pages that are too
// AI-generated. And apparently my blogs are not safe from this (according to
// Gemini), I need you to figure out how we solve this."
//
// THE PREMISE IS NOT QUITE THE MECHANISM, and getting that right decides what to
// build. Google's own spam policy does not name AI writing. What it names is
// SCALED CONTENT ABUSE: "when many pages are generated for the primary purpose
// of manipulating search rankings and not helping users", with the first example
// being "using generative AI tools or other similar tools to generate many pages
// without adding value for users". Its separate guidance on generative AI says,
// in as many words, that how content is made is not the test.
//
// So no detector is looking for the word "vibrant". What a system CAN see across
// a whole site, cheaply and at scale, is SAMENESS. The policy's thin-affiliate
// section describes the shape it looks for out loud: "cookie-cutter sites or
// templates with the same or similar content replicated within the same site".
//
// AND THAT IS THE ONE THING THIS SITE GUARANTEES BY CONSTRUCTION. shapeForLive
// builds blogBody from a FIXED heading list per type, so every attraction ever
// published carries "Being There", "Who It's For", "The Reality Check" and
// "Things to Know", in that order, and the drafting prompt asks each of them to
// land inside the same hundred-word band. Nobody chose that as a fingerprint; it
// is a template doing what a template does, and it is invisible from inside a
// single draft. Every scanner this project has, scanForAITells and the deep
// voice pass, reads ONE entry at a time and cannot see it.
//
// This file is the missing view: the corpus, not the draft. It measures rather
// than judges, deliberately. Google publishes no threshold, so a function here
// claiming one would be inventing the very kind of fact this codebase refuses to
// invent. It counts, it names what it counted, and the decision stays a person's.
//
// Everything is pure and everything optional-chains, because these read whatever
// shape a published row happens to be in, including the ones from before a field
// existed.

const textOf = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// The ordered heading list of one entry: its skeleton. Not the prose, not the
// facts, just the shape a reader scrolls past.
//
// ── THE ENTRY'S OWN NAME COMES OUT FIRST, AND THIS IS THE WHOLE TRICK ──
// Measured before this existed, towns reported three distinct skeletons out of
// three, and every other type reported one out of three. Towns were not varied.
// Their first heading is "What to Do in ${t.name}", so Ribe, Skagen and Mariager
// each looked unique while being the identical template with a word substituted.
// That is exactly the sameness this file exists to see, and a version of it that
// scored a name as variety would have reported the towns as the healthy type and
// sent the next pass looking in the wrong place.
export const headingSkeleton = (payload) => {
  const name = textOf(payload?.name);
  const bare = (h) => {
    if (!name) return h;
    // Escaped, because a real Danish place name carries regex characters: a dot
    // in "Odense St.", brackets in "Nørresundby (Aalborg)".
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // ── WHOLE WORDS, AND \b CANNOT DO IT HERE ───────────────────────
    // Two reasons, both Danish. \b is defined on ASCII word characters, so it
    // sees a boundary in the MIDDLE of Ærø and Nørresundby, and it finds no
    // boundary at all after a name ending in a bracket. "Around Nørresundby
    // (Aalborg)" went unmatched with \b on both ends.
    //
    // So the separator on the left is CONSUMED and put back, which needs no
    // lookbehind (Safari only gained that in 2023 and this runs on real phones),
    // and the right side is a lookahead, which every engine has had for years.
    // A town called "By" still leaves "Bygning" and "Byen" alone.
    const NOT_WORD = "[^\\p{L}\\p{N}]";
    return h.replace(new RegExp(`(^|${NOT_WORD})${safe}(?=$|${NOT_WORD})`, "giu"), "$1{name}");
  };
  return (Array.isArray(payload?.blogBody) ? payload.blogBody : [])
    .filter(b => b?.type === "heading")
    .map(b => bare(textOf(b?.content)))
    .filter(Boolean);
};

// One comparable string. " > " because a heading can contain almost anything
// else, and two entries whose headings differ only in ORDER are two different
// skeletons: order is most of what makes a template feel like one.
export const skeletonKey = (payload) => headingSkeleton(payload).join(" > ");

// ── THE OPENING WORDS, WHICH ARE THE OTHER HALF ──────────────────────
// A template repeats headings. A writer with one favourite sentence shape
// repeats openings, and the drafting prompt already bans the worst of them
// ("[Name] is your spot for X") without being able to see that fifty entries
// still open the same WAY. Four words is enough to catch "Tucked into the",
// "Set on the edge", "Just outside the centre" and short enough that two entries
// genuinely starting with a place name are not counted as a pattern.
//
// The entry's own name is stripped first, because "Ribe is one of" and "Skagen
// is one of" are the same opening and would otherwise look like two.
export const openingKey = (payload, words = 4) => {
  const name = textOf(payload?.name);
  let desc = textOf(payload?.desc);
  if (name && desc.toLowerCase().startsWith(name.toLowerCase())) desc = desc.slice(name.length).trim();
  const parts = desc.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const n = Math.max(1, Math.trunc(Number(words) || 4));
  return parts.length >= n ? parts.slice(0, n).join(" ") : "";
};

// ── THE MEASUREMENT ──────────────────────────────────────────────────
// Rows in, groups out, biggest group first. `keyOf` is a parameter so the same
// counting serves both skeletons and openings rather than being written twice.
//
// A row with no key at all is counted as `unkeyed` and never grouped: an entry
// with no headings has no skeleton, and folding those together would report a
// crowd of empty pages as the site's most repeated template.
export const spreadBy = (rows, keyOf) => {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const groups = new Map();
  let unkeyed = 0;
  list.forEach(row => {
    const payload = row?.payload && typeof row.payload === "object" ? row.payload : row;
    const key = textOf(keyOf?.(payload));
    if (!key) { unkeyed++; return; }
    const names = groups.get(key) || [];
    names.push(textOf(payload?.name) || "(unnamed)");
    groups.set(key, names);
  });
  const ordered = [...groups.entries()]
    .map(([key, names]) => ({ key, count: names.length, names }))
    // Biggest first, and ties broken by the key so the report is stable rather
    // than depending on insertion order.
    .sort((a, b) => (b.count - a.count) || a.key.localeCompare(b.key));
  const keyed = list.length - unkeyed;
  return {
    pages: list.length,
    keyed,
    unkeyed,
    distinct: ordered.length,
    groups: ordered,
    largest: ordered[0] || null,
    // The share of the pages that COULD be compared, not of every row. A site
    // with fifty skeletonless pages is a different problem and this number
    // should not quietly become an average of the two.
    share: keyed > 0 && ordered[0] ? ordered[0].count / keyed : 0,
  };
};

export const skeletonSpread = (rows) => spreadBy(rows, skeletonKey);
export const openingSpread = (rows, words = 4) => spreadBy(rows, p => openingKey(p, words));

// ── SAYING IT WITHOUT INVENTING A VERDICT ────────────────────────────
// Google publishes no percentage, so this states the count and what it is a
// count OF, and stops. "3 of 4 pages carry the identical heading sequence" is a
// fact a person can act on. "This page will be deindexed" would be a guess
// wearing a policy's clothes, and the whole reason this project is trusted is
// that it does not do that.
export const describeSameness = (spread, { what = "pages", of = "heading sequence" } = {}) => {
  if (!spread || !spread.keyed) return "";
  const top = spread.largest;
  if (!top) return "";
  const pct = Math.round(spread.share * 100);
  const one = top.count === 1;
  const head = one
    ? `No two of the ${spread.keyed} ${what} share a ${of}.`
    : `${top.count} of the ${spread.keyed} ${what} carry the identical ${of} (${pct}%): ${top.key}.`;
  const rest = spread.distinct > 1
    ? ` ${spread.distinct} distinct ${of}s across the set.`
    : ` One ${of} for the whole set.`;
  const skipped = spread.unkeyed > 0 ? ` ${spread.unkeyed} had none to compare.` : "";
  return `${head}${rest}${skipped}`;
};

// One call for a report over a whole corpus, so a caller does not have to know
// which measurements exist. Grouped BY TYPE as well as overall, because a
// template is a per-type object: every attraction sharing a skeleton is the
// finding, and an attraction sharing one with a festival would be a different
// and stranger one.
export const samenessReport = (rows) => {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const byType = new Map();
  list.forEach(row => {
    const t = textOf(row?.type) || "unknown";
    byType.set(t, [...(byType.get(t) || []), row]);
  });
  return {
    overall: {
      skeleton: skeletonSpread(list),
      opening: openingSpread(list),
    },
    types: [...byType.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([type, rows2]) => ({
        type,
        pages: rows2.length,
        skeleton: skeletonSpread(rows2),
        opening: openingSpread(rows2),
      })),
  };
};
