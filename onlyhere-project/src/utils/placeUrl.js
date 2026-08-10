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
export const sitemapXml = (origin, names) => {
  const seen = new Set();
  const urls = [`${origin}/${COUNTRY}`];
  (Array.isArray(names) ? names : []).forEach(n => {
    const s = placeSlug(n);
    if (!s || seen.has(s)) return;
    seen.add(s);
    urls.push(`${origin}/${COUNTRY}/${s}`);
  });
  const body = urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};
