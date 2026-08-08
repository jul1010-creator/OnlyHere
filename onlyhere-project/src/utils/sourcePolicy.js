// ── SOURCES YOU ADD, WITHOUT ASKING ANYONE TO EDIT CODE ─────────────
//
// Oliver, 8 Aug 2026: "I'd like to be able to write in sources that I demand
// Perplexity/Tavily research through. So I don't need to write directly to you
// all the time about sources that they have to include in their research.
// Perhaps it should be able to be applied universally for every research."
//
// The machinery already existed and was welded shut. `RESEARCH_SOURCE_RULES` in
// App.jsx has been appended to every research prompt for weeks, telling the
// models to check Wikipedia and the venue's own site, and how to break a tie
// between them. It is exactly the right shape and it is a hardcoded string, so
// changing it meant a commit, which meant asking me. This makes the same thing
// editable and stored, and leaves the hardcoded rules underneath as the floor.
//
// ── "I'M NOT SAYING ONLY.. I'M SAYING INCLUDE" ──────────────────────
// Oliver, correcting me the moment I described this as a restriction, and he is
// right. This is a list of pages he has found and vouched for, growing as he
// finds more: "so if I find new tourism pages, I'll use that." The instruction
// is ADD THESE, not USE ONLY THESE.
//
// The distinction is not pedantry, it decides whether the feature helps. Point a
// search model at four domains and a small Danish village with no page on any of
// them comes back empty, when an unrestricted search would have found the parish
// council's PDF. An empty research pass is not a safer answer than a sourced
// one, it is just a worse one.
//
// So: include them every time, prefer them over an anonymous aggregator when
// they disagree, and keep searching everything else exactly as before.
//
// ── AND IT MAY NOT OVERRIDE THE VENUE ON THE VENUE ──────────────────
// The standing rule already says the official site wins on anything current: a
// price, an opening hour, a ferry departure. A founder list that quietly
// outranked that would let a tourist board's stale page beat the operator's own
// timetable, which is the single error class this project has spent the most
// time on. The block below says so out loud, every time.

const clean = (v) => String(v == null ? "" : v).trim();

// Accepts whatever gets pasted: a full URL, a bare host, a host with www, a
// trailing slash. Returns the bare host, or "" when it is not a domain at all.
// Deliberately strict about the shape, because a typo here is a rule the models
// will dutifully try to honour on every draft forever.
export const normaliseDomain = (input) => {
  let s = clean(input).toLowerCase();
  if (!s) return "";
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");   // protocol
  s = s.split(/[/?#]/)[0];                        // path, query, fragment
  s = s.replace(/^www\./, "").replace(/\.+$/, "");
  s = s.split("@").pop();                          // somebody pasting an email
  if (s.includes(" ") || s.length < 4 || s.length > 100) return "";
  // A real host: at least one dot, sane characters, and a TLD of letters.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(s)) return "";
  return s;
};

// A note is what the source is FOR, and it is not decoration: "the operator's
// own timetable" tells the model when to reach for it, which is most of the
// value. Capped because it lands in every prompt.
export const cleanNote = (v) => clean(v).replace(/\s+/g, " ").slice(0, 160);

// "" means every content type. Anything else must be a type the Studio actually
// drafts, or the rule is dead and nobody can tell.
export const CONTENT_TYPES = ["town", "festival", "free", "food", "foodStreet", "night", "nightTown", "booking"];
export const TYPE_LABEL = {
  "": "Everything", town: "Towns", festival: "Events", free: "Attractions", food: "Food",
  foodStreet: "Food streets", night: "Nightlife", nightTown: "Nightlife towns", booking: "Workshops",
};

export const cleanSource = (row) => {
  const domain = normaliseDomain(row?.domain);
  if (!domain) return null;
  const appliesTo = clean(row?.applies_to ?? row?.appliesTo);
  return {
    id: row?.id,
    domain,
    note: cleanNote(row?.note),
    appliesTo: CONTENT_TYPES.includes(appliesTo) ? appliesTo : "",
    enabled: row?.enabled !== false,
  };
};

// The ones that apply to this draft: everything universal, plus anything scoped
// to this type. A ferry operator matters for a town on an island and is noise on
// a cocktail bar, which is why the per-type half exists.
export const sourcesFor = (rows, type) => {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(rows) ? rows : []) {
    const s = cleanSource(raw);
    if (!s || !s.enabled) continue;
    if (s.appliesTo && s.appliesTo !== type) continue;
    const key = `${s.domain}|${s.appliesTo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  // Universal first, then the type-specific ones, so the general policy reads
  // before the exception to it.
  return out.sort((a, b) => (a.appliesTo === b.appliesTo ? a.domain.localeCompare(b.domain) : a.appliesTo ? 1 : -1));
};

// Returns "" when there is nothing to say. An empty heading in every prompt
// teaches the model that this section is usually noise.
export const sourceRulesBlock = (rows, type) => {
  const list = sourcesFor(rows, type);
  if (!list.length) return "";
  const lines = list.map(s => `- ${s.domain}${s.note ? ` — ${s.note}` : ""}${s.appliesTo ? ` (for ${TYPE_LABEL[s.appliesTo] || s.appliesTo} specifically)` : ""}`);
  return `\nSOURCES THE FOUNDER HAS FOUND AND WANTS INCLUDED, in this research and every other:
${lines.join("\n")}

INCLUDE these in your search every time, in addition to everything you would normally look at. They are pages he has read and vouches for, so they are worth reading rather than worth obeying.

THIS IS AN ADDITION, NOT A RESTRICTION. Search everything else exactly as you normally would. If one of them has nothing about this place, that is ordinary and expected: keep looking elsewhere rather than reporting that nothing was found. A small village with no page on any of these still has real facts somewhere, and finding them is still the job.

WHERE SOURCES DISAGREE, one of these outranks an anonymous aggregator or a content farm, because somebody has actually looked at it.

BUT THEY DO NOT OUTRANK A VENUE ON ITS OWN DETAILS. For anything current, a price, an opening hour, a departure time, the venue's or operator's own website is still the authority, exactly as stated above. A tourist board page beating an operator's own timetable is the specific error this rule exists to prevent.`;
};
