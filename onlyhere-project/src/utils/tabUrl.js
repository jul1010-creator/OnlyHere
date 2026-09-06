// ── EVERY PAGE HAS AN ADDRESS ───────────────────────────────────────
//
// Oliver, 6 Sep 2026, four screenshots of four different pages with the same
// URL in the bar: "Pages should have their individual .. but they don't. After
// being into Aarhus bar street, it just stays."
//
// He is describing two faults with one cause. Opening an entry pushes
// "#/nightlife/theaarhusriverfront", and NOTHING ELSE IN THE APP EVER WRITES AN
// ADDRESS. So the hash from the last entry he opened stayed in the bar while he
// walked through Attractions, Events and Tips, and the address named a bar
// street on the Events page.
//
// The missing half is the fix for both: when the pages have their own
// addresses, moving between them replaces the entry's, and the stale one cannot
// survive because something else always overwrites it.
//
// ── WHY THE WORD IS NOT THE ID ──────────────────────────────────────
//
// TAB_ORDER's ids are the routing key and the swipe order and they never move.
// Two of them do not say what the page is called: `home` is "Explore" and
// `visits` is "Towns", and `ai` is Gemlyx Detour. An address is read by people,
// so it gets the reader's word, and the pair is written down here rather than
// derived, because deriving it from the nav labels would make the URL change
// language when the reader does.
export const TAB_HASH = {
  home: "explore",
  essentials: "essentials",
  tips: "tips",
  attractions: "attractions",
  events: "events",
  food: "food",
  nightlife: "nightlife",
  visits: "towns",
  ai: "detour",
};

const BY_WORD = Object.fromEntries(Object.entries(TAB_HASH).map(([id, word]) => [word, id]));

export const hashForTab = (id) => {
  const word = TAB_HASH[String(id || "")];
  return word ? `#${word}` : "";
};

export const tabForHash = (hash) => {
  const word = String(hash || "").replace(/^#/, "").trim().toLowerCase();
  return BY_WORD[word] || "";
};

// ── THE TWO ADDRESSES THIS MUST NEVER TOUCH ─────────────────────────
//
//   #/town/ribe   an OPEN ENTRY. It is pushed by the entry effect and it is
//                 what Back reads to decide whether to close one. Overwriting
//                 it would strand a reader inside a page whose address says
//                 they are on the list behind it.
//   #studio       read at module scope to decide whether the whole Studio
//                 mounts. Replacing it navigates him out of Studio mid-edit,
//                 which is the worst available way to find this out.
//
// Anything else, including no hash at all, is a page address to be kept
// current.
export const isEntryHash = (hash) => String(hash || "").startsWith("#/");
export const STUDIO_HASH = "#studio";
export const ownsTheAddress = (hash) => !isEntryHash(hash) && String(hash || "") !== STUDIO_HASH;
