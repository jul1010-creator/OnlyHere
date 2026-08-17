// ── A REAL ADDRESS FOR EVERY PLACE ──────────────────────────────────
//
// Oliver, 10 Aug 2026, once gemlyxtravel.com went live: town pages for search,
// and the root should land on /denmark.
//
// Everything published today renders at no URL at all. Seventy-odd researched,
// fact-checked town entries live inside one page that a crawler sees as a
// single app shell, so none of them can be found, linked, or shared as itself.
// Given that paid acquisition is off the table until the cost per guide works,
// search is the only channel available, and this is the part that was missing.
//
// ── WHY NOT REUSE studioContent's slugify ───────────────────────────
// That one strips every non-alphanumeric character, so "Nykøbing Falster"
// becomes "nykobingfalster". It is correct for what it does, which is name
// photo FILES on disk, and those files already exist under those names. Change
// it and 71 photos stop resolving.
//
// A URL wants the opposite: word separation kept, because "nykobing-falster"
// is readable to a person and to a search engine and "nykobingfalster" is one
// long word to both. So this is a second function on purpose, and the two are
// allowed to differ because they answer different questions.
//
// Danish letters fold the same way both do, and the same way danishNames.js
// does: æ to ae, ø to o, å to aa. Ærø is aero everywhere in this codebase.
export const placeSlug = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/å/g, "aa")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    // Anything that is not a letter or a digit becomes ONE separator, so
    // "Nørresundby (Aalborg)" does not come out with an empty segment in it.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// The country segment is a constant rather than a literal sprinkled through the
// routes, the middleware and the sitemap, because those three disagreeing is
// how a link works in the app and 404s when somebody pastes it back.
export const COUNTRY = "denmark";
export const townPath = (name) => `/${COUNTRY}/${placeSlug(name)}`;

// Lookup is by comparing slugs, never by trying to turn a slug back into a
// name. Folding loses information (o could have been o or ø) so the reverse
// direction has no single answer, and a guess here is a 404 on a link somebody
// already shared.
export const findBySlug = (places, slug) => {
  const want = placeSlug(slug);
  if (!want) return null;
  return (Array.isArray(places) ? places : []).find(p => p?.name && placeSlug(p.name) === want) || null;
};

// ── TWO PLACES CANNOT SHARE AN ADDRESS ──────────────────────────────
// Folding makes collisions possible that the names themselves do not have:
// "Nykobing" and "Nykøbing" both fold to nykobing, and Denmark has several
// Nykøbings. A collision does not throw, it does something worse and quieter:
// findBySlug returns whichever entry happens to come first in the array, so one
// real place becomes permanently unreachable and its page silently shows the
// other one. Published in a sitemap, that is a duplicate-content problem too.
//
// So it is detectable, and a test walks the real published list.
export const slugCollisions = (places) => {
  const byslug = new Map();
  (Array.isArray(places) ? places : []).forEach(p => {
    if (!p?.name) return;
    const s = placeSlug(p.name);
    if (!s) return;
    byslug.set(s, [...(byslug.get(s) || []), p.name]);
  });
  return [...byslug.entries()]
    .filter(([, names]) => new Set(names).size > 1)
    .map(([slug, names]) => ({ slug, names: [...new Set(names)] }));
};

// ── AND AN ADDRESS FOR EVERYTHING THAT IS NOT A TOWN ────────────────
//
// Oliver, 16 Aug 2026, on Google and the blogs. The audit that night found the
// thing sitting underneath his question: the whole site was 33 URLs, /denmark
// plus 32 towns, because the route table and the sitemap knew about exactly one
// content type. Every attraction, festival, restaurant, food street, bar, bar
// street and workshop ever published existed only inside the app, at no address,
// so there was nothing for a search engine to index, nothing to link to and
// nothing to share. Those pages were not ranking badly. They were not pages.
//
// ── THE SEGMENT IS THE PUBLIC WORD, NOT THE INTERNAL ONE ────────────
// A URL is the most permanent thing a site publishes, so it gets the word a
// reader would use. Studio calls these types `free` and `booking`; a person
// looking for Koldinghus is not looking for a free, and /denmark/free/koldinghus
// would be the internal vocabulary leaking into the one place it can never be
// taken back from. So `attraction` and `workshop`.
//
// ── ONE SEGMENT CAN COVER TWO TYPES, DELIBERATELY ───────────────────
// A food street is a food place and a bar street is a nightlife place, and the
// app already treats them that way: both open through the same setter and sit in
// the same pool as their non-street siblings. Splitting them in the URL would
// invent a distinction the app does not make and put two nearly identical
// namespaces side by side for no reader's benefit.
//
// TOWNS KEEP /denmark/<slug> WITH NO SEGMENT. They are indexed there already,
// they are the top of the hierarchy rather than a thing inside it, and moving
// them would throw away whatever standing those 32 pages have earned in exchange
// for a symmetry nobody can see.
//
// nightTown and essential are absent on purpose: neither opens as a page in the
// app (a nightlife town is a list view, an essential is a row on the Essentials
// page), so an address for them would resolve to nothing. They need a page first.
export const ENTRY_KINDS = [
  { seg: "event", types: ["festival"], kind: "event" },
  { seg: "attraction", types: ["free"], kind: "free" },
  { seg: "food", types: ["food", "foodStreet"], kind: "food" },
  { seg: "nightlife", types: ["night", "nightStreet"], kind: "nightlife" },
  { seg: "workshop", types: ["booking"], kind: "craft" },
];

// A Studio type to its public URL segment. A town answers "" because its path
// carries no segment, and an unknown type answers null, which every caller
// treats as "this has no address" rather than as a segment to guess at.
export const segForType = (type) => {
  const t = String(type || "").trim();
  if (t === "town") return "";
  return ENTRY_KINDS.find(k => k.types.includes(t))?.seg ?? null;
};

// A URL segment to the app's own entry kind, which is the key ENTRY_SETTERS uses
// to decide which detail view opens.
export const kindForSeg = (seg) => ENTRY_KINDS.find(k => k.seg === String(seg || "").toLowerCase())?.kind ?? null;

// A URL segment to the Studio types behind it, for the one Supabase query that
// serves it. An empty array rather than null, so a caller can spread it without
// a guard and get no rows rather than every row.
export const typesForSeg = (seg) => ENTRY_KINDS.find(k => k.seg === String(seg || "").toLowerCase())?.types ?? [];

// The address of any published entry. Null when the type has no address, so a
// caller cannot link to a page that does not exist: a link to nowhere is worse
// than no link, and a sitemap full of them is worse still.
export const entryUrlPath = (type, name) => {
  const seg = segForType(type);
  if (seg === null) return null;
  const slug = placeSlug(name);
  if (!slug) return null;
  return seg ? `/${COUNTRY}/${seg}/${slug}` : `/${COUNTRY}/${slug}`;
};

// Reading one back. Returns the segment, the app's kind and the slug, or null for
// anything that is not an entry address. A town comes back with seg "" and kind
// "town", so one caller handles both shapes without a special case.
export const parseEntryUrl = (pathname) => {
  const path = String(pathname || "").split(/[?#]/)[0];
  const m = new RegExp(`^/${COUNTRY}/([^/]+)(?:/([^/]+))?/?$`).exec(path);
  if (!m) return null;
  const [, first, second] = m;
  if (!second) {
    const slug = placeSlug(decodeURIComponent(first));
    return slug ? { seg: "", kind: "town", slug } : null;
  }
  const kind = kindForSeg(first);
  if (!kind) return null;
  const slug = placeSlug(decodeURIComponent(second));
  return slug ? { seg: String(first).toLowerCase(), kind, slug } : null;
};

// Is this address already naming an entry. The app pushes "#/kind/slug" into the
// bar whenever a detail view opens, which on a cold arrival from search turned
// /denmark/ribe into /denmark/ribe#/town/ribe: one page wearing two addresses,
// shown to the one visitor who came from a search result. This is the guard.
export const isEntryUrl = (pathname) => !!parseEntryUrl(pathname);

// ── WHAT A CRAWLER CAN ACTUALLY FOLLOW ──────────────────────────────
// The Towns page renders each place as a <button onClick>, which is right for
// the app and invisible to a search engine: there is no href to follow, so
// making the URLs exist does not by itself make them findable. Something has to
// list them. This builds that list, and middleware.js serves it at
// /sitemap.xml, which costs no serverless function slot on the Hobby plan.
//
// lastmod is deliberately omitted rather than filled with today's date. A
// sitemap claiming every page changed today, every day, is a claim nothing
// checked, and search engines discount a feed that does it.
// ── AND IT TAKES EVERY TYPE NOW, NOT JUST TOWNS ─────────────────────
// An item is either a bare name, which is a town, or {type, name}. Both because
// the town-only shape is what the caller passed for a week and a signature change
// that silently drops the towns would be a worse bug than the one being fixed.
//
// ONLY PAGES WORTH LISTING GET LISTED, and that decision belongs to the caller
// rather than here, because it needs the payload and this function is a
// formatter. The rule the middleware applies is worthServing: a page with no real
// paragraph in it is not a page, and telling a search engine about a hundred
// stubs is the "scaled content" shape rather than an escape from it.
export const sitemapXml = (origin, entries) => {
  const seen = new Set();
  const urls = [`${origin}/${COUNTRY}`];
  (Array.isArray(entries) ? entries : []).forEach(e => {
    const path = typeof e === "string" ? entryUrlPath("town", e) : entryUrlPath(e?.type, e?.name);
    if (!path || seen.has(path)) return;
    seen.add(path);
    urls.push(`${origin}${path}`);
  });
  const body = urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};
