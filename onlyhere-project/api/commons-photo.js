import { fold } from "../src/utils/danishNames.js";
// /api/commons-photo.js
// ── Find a freely licensed photo on Wikimedia Commons, WITH its credit ──
//
// Oliver, 6 Aug 2026: "Is it possible for us to install an automatic uploader?
// So it will search through Wiki as an example to find pictures and then
// automatically credit."
//
// Commons is the right source for this because the credit is not something we
// have to guess at afterwards: every file carries structured metadata naming
// the author and the licence, so the attribution CC BY and CC BY-SA legally
// require can be captured at the same moment as the image, from the same
// response. That is the whole difference between this and grabbing a picture
// off a search engine, where the credit is a research problem of its own.
//
// SERVER-SIDE ON PURPOSE, for two reasons. Wikimedia's API policy asks for a
// descriptive User-Agent identifying the application and a contact, which a
// browser cannot set. And keeping it here means the licence filtering below
// cannot be bypassed by anything running in the page.
//
// ── WHY THE WIKIPEDIA ARTICLE HAS MORE PICTURES THAN THIS DID ────────
// Oliver, 7 Aug 2026: "I searched up Wikipedia about Ringkøbing, there are a
// lot more pictures there than on Wikimedia. Why can't I take those and give
// credits as well???" And then, correctly: "It's the same license."
//
// He is right on both counts, and the cause was here, not in the licensing.
// Almost every photograph on a Wikipedia article IS a Commons file. The
// difference was HOW this asked for them: one full-text search of the File:
// namespace, which only finds files whose title or description text happens to
// contain the word. It never sees a photo filed in Category:Ringkøbing under a
// name like "Vester Strandgade 12.jpg", and it never sees the historic Danish
// spelling Ringkjøbing that a lot of older photographs are titled with.
//
// So it now asks three ways and merges them, in the order that matches what he
// was actually looking at:
//   1. THE IMAGES ON THE WIKIPEDIA ARTICLE ITSELF, Danish first then English.
//      These are literally the pictures on the page he opened.
//   2. THE COMMONS CATEGORY for the place, which is where a photograph gets
//      filed regardless of what its filename says.
//   3. The original full-text search, still useful for anything the other two
//      miss, and the only one that works for a subject with no article.
//
// One thing genuinely IS on Wikipedia and not on Commons: non-free files used
// under a fair-use style exemption, such as company logos and book covers.
// Those are the exception to "it's the same license", they cannot be reused
// here, and they are excluded below by the media and title filters rather than
// by hoping none turn up.

// Licences we will actually use. Everything here is free to publish with
// attribution. Deliberately an ALLOW-list rather than a block-list: a licence
// nobody here recognises is treated as unusable, because the failure mode of
// guessing wrong is publishing someone's photo without the right to do so.
// NC and ND are checked FIRST and rejected outright. Testing caught an earlier
// version of this letting both through: "CC BY-NC 3.0" matched the "cc by" head
// and the trailing groups were optional, so it passed. That is not a cosmetic
// bug. NC forbids commercial use and Gemlyx is a commercial product, and ND
// forbids derivative works, which a cropped card image arguably is.
const FORBIDDEN = /\bn[cd]\b|noncommercial|non-commercial|noderiv|no[ -]deriv/i;

// ── AND THE ALLOW-LIST WAS REJECTING REAL CREATIVE COMMONS FILES ─────
// Measured against the licence strings Commons actually returns, the previous
// pattern dropped eight usable ones, because it demanded the string END right
// after the version number. Every JURISDICTION PORT failed: "CC BY-SA 3.0 de",
// "CC BY-SA 2.0 fr", "CC BY-SA 3.0 es". So did the multi-version dual licences
// Commons writes as "CC BY-SA 3.0,2.5,2.0,1.0", and so did the spelled-out
// "CC BY-SA 4.0 International". These are ordinary CC BY-SA files with ordinary
// CC BY-SA terms, and a German-ported licence is not a different licence for
// our purposes, it is the same licence written for a different legal system.
// Denmark gets a great many photographs from German visitors, so this was not
// a rare miss.
//
// GFDL IS STILL EXCLUDED, deliberately and not by oversight. It is a free
// licence, but it requires the full licence text to travel with the image,
// which a one-line photo credit does not do. Excluded until there is somewhere
// to put that text.
const CC = /^cc[ -]?by([ -]sa)?(?:[ -][0-9.,]+)*(?:\s+(?:[a-z]{2}|international|unported|generic))?\s*$/i;
const OTHER_FREE = /^(cc0|public domain|pd-|no restrictions|attribution\s*$|copyrighted free use)/i;
export const licenseIsUsable = (l) => {
  const s = String(l || "").trim();
  if (!s || FORBIDDEN.test(s)) return false;
  return CC.test(s) || OTHER_FREE.test(s);
};

// ── NOT EVERY IMAGE ON AN ARTICLE IS A PHOTOGRAPH ────────────────────
// Reading the article's images gets the photographs, and also the coat of arms,
// the locator map, the Commons logo in the footer and any non-free logo the
// article uses under an exemption. A travel card wants none of those, and the
// non-free ones must never be published at all.
const NOT_A_PHOTO = /\bflag\b|flag[ _-]|coat[ _-]of[ _-]arms|wappen|\bcrest\b|\blogo\b|\bicon\b|\bseal\b|\bmap\b|locator|\bchart\b|\bdiagram\b|commons|wiki(pedia|media|source|quote)|question[ _-]book|\bsymbol\b|\bemblem\b|^file:.*\.svg$/i;

// extmetadata values are HTML fragments, and the entities in them are usually
// SOMEONE'S NAME. The first version of this replaced every entity with a space,
// which turned "R&uuml;diger Stehn" into "R diger Stehn". Mangling a
// photographer's name is not a formatting slip, it is a broken credit, so the
// entities that actually show up in European names are decoded rather than
// deleted, and anything unrecognised is dropped without eating the letters
// around it.
const ENTITIES = {
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü",
  aring: "å", Aring: "Å", oslash: "ø", Oslash: "Ø", aelig: "æ", AElig: "Æ",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", aacute: "á", iacute: "í",
  oacute: "ó", uacute: "ú", ntilde: "ñ", ccedil: "ç", szlig: "ß",
  amp: "&", quot: '"', apos: "'", nbsp: " ", ndash: "-", mdash: "-", lt: "<", gt: ">",
};
export const strip = (s) => String(s || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, name) => (Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : ""))
  .replace(/\s+/g, " ")
  .trim();

// ── WHY THIS RETURNED FOUR RHINE BARGES FOR A ROYAL PALACE ──────────
// Oliver, 8 Aug 2026, searching "Amalienborg Slot" from the media panel and
// getting a painting, four cargo ships photographed on the Rhine by the same
// man, and then the palace at positions six and seven.
//
// Nothing was broken. Three of the four sources SILENTLY RETURNED NOTHING, and
// the fourth's raw relevance ranking was presented as if they had all worked:
//
//   da/en Wikipedia   titles=Amalienborg Slot, and the article is "Amalienborg".
//                     Without redirects=1 the API answers "missing" and the
//                     generator yields zero images. It does not error.
//   Commons category  Category:Amalienborg Slot does not exist. The real one is
//                     Category:Amalienborg. Zero files, no error.
//   full-text search  the only survivor, matching DESCRIPTION TEXT with no
//                     notion of subject or country. "Slot" is an ordinary word
//                     on Dutch and German waterway photographs, where it means
//                     a lock.
//
// So the fixes are three, and the third is the one that matters most:
//
//   1. redirects=1, so a name that is a redirect finds its article.
//   2. THE RESOLVED ARTICLE TITLE BECOMES THE CATEGORY NAME. "Amalienborg Slot"
//      resolves to "Amalienborg", and Category:Amalienborg is right there. One
//      mechanism fixes both misses, because a Commons category is almost always
//      named after the article.
//   3. A full-text hit must MENTION THE SUBJECT. Matching any word of the query
//      is not evidence; matching the distinctive one is.
//
// And every result now says which source it came from, because a search that
// quietly falls back to its worst source and returns seven confident-looking
// results is exactly the failure this codebase keeps shipping.

// The words that describe what KIND of thing a place is, in the two languages
// these names come in. They are the words most likely to collide with something
// unrelated, so they are never the token a result is judged on.
const TYPE_WORDS = new Set([
  "slot", "slottet", "kirke", "kirken", "kirkegaard", "museet", "museum", "havn", "havnen",
  "borg", "gaard", "gard", "taarn", "sogn", "by", "plads", "torv", "strand", "fyr", "kro",
  "palace", "castle", "church", "cathedral", "harbour", "harbor", "tower", "square", "beach",
  "lighthouse", "the", "of", "and", "og", "i", "in", "denmark", "danmark", "danish", "dansk",
]);

// The word a result has to actually mention. Longest non-type token wins, for
// the same reason resolveField sorts by length: a short token is a fragment of
// ordinary language and proves nothing.
export const distinctiveToken = (term) => {
  const tokens = String(term || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(t => t.length >= 4 && !TYPE_WORDS.has(t));
  if (!tokens.length) return null;
  return tokens.sort((a, b) => b.length - a.length)[0];
};

// Danish compounds mean the subject can appear glued to something else
// ("Amalienborgs", "Amalienborg-pladsen"), so this is a substring test rather
// than a word test. Accents and case are normalised because file titles are
// written by everybody.
// ── THIS WAS BUG A AGAIN, IN A SECOND FILE ──────────────────────────
// The local copy normalised to NFD FIRST and replaced ø/æ/å after. NFD
// decomposes å into a + combining ring, the ring is then stripped as an accent,
// and the å rule never gets to run. So this folded "Ålborg" to "alborg" where
// the shared rule gives "aalborg", and "Århus" to "arhus" instead of "aarhus".
//
// Verified by running both: mentionsSubject("Ålborg Slot", "Aalborg") returned
// FALSE here and TRUE with the shared fold. Every Commons file titled with Å is
// rejected for an Aa-spelled Danish place, so the photo finder silently falls
// through to worse sources for exactly the places whose names need it.
//
// danishNames.js line 38 documents this fix in prose ("The Danish letters are
// now replaced BEFORE decomposition, so the rule reaches them") and this file
// still carried the pre-fix ordering. Imported now instead of restated, which
// is the only version of this that cannot drift again.
// (import hoisted to the top of the file, see below)

export const mentionsSubject = (token, ...texts) => {
  if (!token) return true;                       // nothing distinctive to test against
  const needle = fold(token);
  return texts.some(t => fold(t).includes(needle));
};

// ── A PAINTING IS NOT A PHOTOGRAPH ──────────────────────────────────
// The Danish article on Amalienborg opens with "Sophie Amalienborg (1740
// painting)", a 1768 engraving of a statue being raised, and two more 18th
// century works. All correct for an encyclopaedia, all wrong for a travel card,
// and between them they filled half the results.
//
// Demoted rather than dropped: for a ruin or a lost building a painting may be
// the only image that exists, and refusing it would leave the card blank.
const HISTORICAL = /\bpainting\b|\bmaleri\b|\bengraving\b|\bkobberstik\b|\betching\b|\blithograph\b|\blitografi\b|\bdrawing\b|\btegning\b|\bwoodcut\b|\bportrait\b|\bportr(æ|ae)t\b|\bby [A-Z][a-z]+ \d{4}\b/i;
// A year before photography was ordinary in Denmark, written in the title, is
// the strongest signal of all: "Moltkes Palais 1756 by de Lode".
const OLD_YEAR = /\b1[0-8]\d{2}\b/;
export const looksHistorical = (title, description, categories) => {
  const t = `${title || ""} ${categories || ""}`;
  if (HISTORICAL.test(t) || HISTORICAL.test(description || "")) return true;
  return OLD_YEAR.test(title || "");
};

// ── WHAT THE PICTURE ACTUALLY IS ────────────────────────────────────
// Oliver, 8 Aug 2026: "Sometimes these pictures have a description like
// 'Ringkøbing Kirkegård'. Maybe I should be able to include that."
//
// Commons stores it and this endpoint was throwing it away. Half the good
// photographs on Commons are called DSC00575.jpg, and the description is the
// only thing that says what you are looking at. It is also the caption the
// entry wants: DetailPage already renders `block.caption` and nothing has ever
// given it one.
//
// IT IS MULTILINGUAL HTML, not a string. A Danish file typically carries
//   <div class="description en" lang="en"><span>English:</span> Ringkøbing churchyard</div>
//   <div class="description da" lang="da"><span>Dansk:</span> Ringkøbing Kirkegård</div>
// and stripping the tags off the lot glues every translation into one line.
// So the language is chosen first, English then Danish, and only then stripped.
const langChunk = (html, lang) => {
  const parts = String(html || "").split(/<div\b/i);
  const hit = parts.find(p => new RegExp(`lang=["']${lang}["']`, "i").test(p));
  return hit ? "<div" + hit : "";
};

// The "English:" label Commons prints in front of its own description is part
// of the markup, not part of what the photographer wrote.
const LANG_LABEL = /^(english|dansk|danish|deutsch|german|fran(ç|c)ais|french|espa(ñ|n)ol|spanish|italiano|italian|svenska|swedish|norsk|norwegian)\s*:\s*/i;

export const pickDescription = (html) => {
  const raw = String(html || "");
  const chosen = langChunk(raw, "en") || langChunk(raw, "da") || raw;
  let t = strip(chosen).replace(LANG_LABEL, "").trim();
  // A caption, not an essay. Cut on a word boundary so it never ends mid-name.
  if (t.length > 180) t = t.slice(0, 180).replace(/\s+\S*$/, "") + "…";
  return t;
};

// ── ONE FLATTENING, APPLIED TO BOTH SIDES ───────────────────────────
// Commons filenames use underscores where the title has spaces, so the two have
// to be flattened to a common shape before they can be compared at all. The
// flattening was being applied to the FILENAME ONLY, and it turned every
// separator into a space:
//
//     "The Swing Carousel - Flickr - Stig Nygaard"   <- ObjectName, untouched
//     "The Swing Carousel   Flickr   Stig Nygaard"   <- filename, hyphens gone
//
// Not equal, so the guard concluded the ObjectName was a real title and handed
// the filename back as the caption. Any Commons filename containing a hyphen
// defeated it, which is not an edge case: "<subject> - Flickr - <photographer>"
// is the naming convention Commons' own Flickr import bot uses, on tens of
// thousands of files, and it is how "The Swing Carousel - Flickr - Stig Nygaard"
// ended up printed above "Photo: Stig Nygaard / wikimedia" on a live page.
//
// Flattened the same way on both sides now. Whitespace goes into the same class
// as the separators, so " - " and "_" and "  " all collapse to one space and the
// comparison is about the words rather than the punctuation between them.
const flatten = (s) => String(s || "").replace(/[_\s-]+/g, " ").trim().toLowerCase();

// ObjectName is Commons' own short title for the file and is usually the
// cleanest thing available. Ignored when it is just the filename again, which is
// what it holds for the many files nobody titled.
export const bestCaption = (objectName, description, title) => {
  const on = strip(objectName).replace(LANG_LABEL, "").trim();
  const bare = String(title || "").replace(/\.(jpe?g|png|webp)$/i, "");
  if (on && flatten(on) !== flatten(bare) && on.length <= 120) return on;
  return pickDescription(description);
};

const UA = {
  // Wikimedia asks for this. A generic agent gets rate limited or blocked.
  "User-Agent": "Gemlyx/1.0 (https://gemlyx.com; hello@gemlyx.com) travel-guide-photo-lookup",
  "Accept": "application/json",
};

// Every query below asks for the same image fields, so the merge downstream can
// treat a file from any of the three sources identically.
const IMAGEINFO = "prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1400";

const fetchPages = async (url) => {
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return [];
    const d = await r.json();
    const pages = d?.query?.pages;
    return Array.isArray(pages) ? pages : [];
  } catch { return []; }
};

// ── ONE REQUEST THAT MAKES THE OTHER FOUR WORK ──────────────────────
// Resolves redirects and normalisation to the title the wiki actually uses.
// Returns null rather than throwing, because a place with no article is normal
// and must cost nothing.
const resolveTitle = async (host, title) => {
  try {
    const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&action=query&redirects=1&titles=${encodeURIComponent(title)}`, { headers: UA });
    if (!r.ok) return null;
    const d = await r.json();
    const page = d?.query?.pages?.[0];
    if (!page || page.missing) return null;
    return String(page.title || "") || null;
  } catch { return null; }
};

const uniq = (list) => {
  const seen = new Set(); const out = [];
  for (const v of list) {
    const k = String(v || "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(String(v).trim());
  }
  return out;
};

import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";

export default async function handler(req, res) {
  // ── SECURITY, 17 AUG 2026 ─────────────────────────────────────────
  // Studio calls this and nothing else does, so it gets both halves: the request
  // has to come from the site, and it has to carry a real Supabase session.
  // See src/utils/apiGuard.js.
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  {
    // ── AND THE NAME OF THE KEY IS THE WHOLE BUG ──────────────────────
    // Oliver, 17 Aug 2026, minutes after this shipped: "'Could not verify your
    // session just now.' on instagram uploads."
    //
    // That string is `resolveUser`'s 503, and it fires on exactly one condition
    // reaching production: NO SERVICE KEY. The guard read SUPABASE_SERVICE_KEY,
    // which is a name that exists nowhere in this project. api/ask.js, which has
    // worked for a week, reads SUPABASE_SERVICE_ROLE_KEY. I invented a plausible
    // variable name instead of reading the one file that already did this, and
    // shut the founder out of his own photo finder with a guard meant to keep
    // strangers out.
    //
    // SUPABASE_SERVICE_ROLE_KEY comes FIRST because it is the one proven to be
    // set. The other two stay as fallbacks: the anon key is also accepted by
    // /auth/v1/user alongside a user's JWT, so it is a real fallback and not
    // decoration. The suite now asserts these names against ask.js's.
    const who = await resolveUser(req.headers, {
      supabaseUrl: process.env.SUPABASE_URL || "https://vpxfahjnerkkkoueovhl.supabase.co",
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "",
    });
    if (!who.ok) return res.status(who.status).json({ error: who.error });
    if (!isFounder(who.userId, process.env.GEMLYX_FOUNDER_IDS)) {
      return res.status(403).json({ error: "This account cannot run Studio research." });
    }
  }
  const { q, limit, article, category } = req.query;
  if (!q || !String(q).trim()) return res.status(400).json({ error: "q required" });

  const term = String(q).trim();
  const articleHint = String(article || term).trim();
  const n = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 24);
  // Over-fetch hard. Most of what comes back is filtered out by mime, licence
  // and the not-a-photo rules, and the whole point of this change is to have
  // real candidates left at the end.
  const pool = Math.max(n * 6, 40);
  const token = distinctiveToken(term);

  try {
    // Danish first: a Danish place is likelier to have the better article there,
    // and its title is the better category guess.
    const [daTitle, enDirect] = await Promise.all([
      resolveTitle("da.wikipedia.org", articleHint),
      resolveTitle("en.wikipedia.org", articleHint),
    ]);
    // ── A DANISH NAME IS OFTEN NOT AN ENGLISH TITLE AT ALL ──────────
    // Oliver, 8 Aug 2026, with a link to a photo on the English article:
    // "why is this not shown in the media? it's CC BY 2.0".
    //
    // It was never fetched. "Amalienborg Slot" resolves on da.wikipedia, and
    // English Wikipedia has "Amalienborg" with no redirect from the Danish
    // name, so redirects=1 had nothing to follow and the English article
    // resolved to null. Every photograph on it, including the aerial view he
    // linked, was invisible to this endpoint.
    //
    // One extra lookup fixes it, on the title the Danish wiki already resolved
    // to. It is the same trick that fixed the category: let the wiki that DOES
    // know the place tell us its real name.
    const enTitle = enDirect
      || (daTitle && daTitle.toLowerCase() !== articleHint.toLowerCase()
            ? await resolveTitle("en.wikipedia.org", daTitle)
            : null);

    // A Commons category is almost always named after the article, so the
    // RESOLVED title is a far better guess than the raw search box contents.
    // The caller's explicit category still wins when it gave one.
    const catCandidates = uniq([String(category || "").trim(), daTitle, enTitle, term]).slice(0, 3);

    // THE ORDER OF THIS ARRAY IS THE PRIORITY ORDER. The pictures on the article
    // come first because they are the ones a person browsing Wikipedia has
    // actually seen and judged worth putting on the page. The full-text search
    // is last because it is the only one with no idea what it is looking at.
    const queries = [
      daTitle && { source: "Danish Wikipedia article", url: `https://da.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&redirects=1&generator=images&titles=${encodeURIComponent(daTitle)}&gimlimit=${pool}&${IMAGEINFO}` },
      enTitle && { source: "English Wikipedia article", url: `https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&redirects=1&generator=images&titles=${encodeURIComponent(enTitle)}&gimlimit=${pool}&${IMAGEINFO}` },
      ...catCandidates.map(c => ({ source: `Commons category "${c}"`, url: `https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&generator=categorymembers&gcmtitle=${encodeURIComponent("Category:" + c)}&gcmtype=file&gcmlimit=${pool}&${IMAGEINFO}` })),
      { source: "Commons search", url: `https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&generator=search&gsrnamespace=6&gsrlimit=${pool}&gsrsearch=${encodeURIComponent(term)}&${IMAGEINFO}`, isSearch: true },
    ].filter(Boolean);

    // In parallel, and a source that fails or has no article simply contributes
    // nothing. One missing Danish article must not cost the other three.
    const batches = await Promise.all(queries.map(qy => fetchPages(qy.url)));

    // ── ONE SOURCE MUST NOT MONOPOLISE THE RESULTS ─────────────────
    // The old merge filled the list from source one, then broke out of the loop
    // entirely. For "Amalienborg Slot" the Danish article alone supplied all
    // eight slots, four of them 18th-century paintings, and the English
    // article's photographs could not have appeared no matter how good they
    // were. Priority meant "first source wins everything" rather than "first
    // source goes first".
    //
    // So every source is filtered in full, and the slots are dealt round-robin.
    // Order within a round is still the priority order, so the article's best
    // photo is still the first result; the difference is that the second source
    // is guaranteed a place at the table.
    //
    // AND THE REPORTING IS NOW TRUE. Breaking out early left `found: 0` on
    // sources that were never looked at, which read as "that source has
    // nothing" when it meant "we stopped before asking". A diagnostic that
    // cannot tell those apart is the failure this endpoint exists to stop.
    const seen = new Set();
    const sources = queries.map(qy => ({ source: qy.source, found: 0, usable: 0, used: 0, offSubject: 0 }));
    const perSource = [];

    for (let b = 0; b < batches.length; b++) {
      const pages = batches[b];
      const qy = queries[b];
      sources[b].found = pages.length;
      const keep = [];
      for (const p of pages) {
        const title = String(p.title || "").replace(/^File:/, "");
        const key = title.toLowerCase();
        if (!title || seen.has(key)) continue;
        seen.add(key);

        const ii = p.imageinfo?.[0];
        if (!ii) continue;
        // Photographs only. Commons is full of diagrams, coats of arms, PDFs and
        // audio, none of which belong on a travel card. This also happens to be
        // the first line of defence against a non-free logo pulled off an
        // article, since those are overwhelmingly SVG or small PNG.
        if (!/^image\/(jpeg|png|webp)$/i.test(ii.mime || "")) continue;
        if (NOT_A_PHOTO.test(title)) continue;
        // A 200px wide file is an icon whatever it is called.
        if (typeof ii.width === "number" && ii.width < 640) continue;

        const m = ii.extmetadata || {};
        const license = strip(m.LicenseShortName?.value);
        if (!licenseIsUsable(license)) continue;

        // ── A SEARCH HIT MUST MENTION THE SUBJECT ─────────────────
        // Only the full-text search is gated. A file on the article, or filed in
        // the category, is already about the place whatever its filename says,
        // which is the entire reason those sources exist. A search hit has no
        // such standing: it matched some word somewhere, and "Slot" matched four
        // barges on the Rhine.
        if (qy.isSearch && !mentionsSubject(token, title, strip(m.ImageDescription?.value), strip(m.Categories?.value))) {
          sources[b].offSubject++;
          continue;
        }

        // ── THE ONE FILTER LEFT THAT IS A JUDGEMENT CALL ──────────
        // Commons flags some files with extra usage restrictions: a trademark
        // in shot, or "personality" for a photo with identifiable people in it.
        // Neither makes the file unfree, and a street scene with people in it
        // is exactly what a town page wants. But personality rights are a real
        // claim someone can bring against a commercial site, so anything
        // flagged is skipped rather than judged here.
        const restrictions = strip(m.Restrictions?.value);
        if (restrictions) continue;
        // A photographer we cannot name cannot be credited, and an uncreditable
        // CC BY image is not usable. Public domain is the exception: it genuinely
        // needs no author.
        const photographer = strip(m.Artist?.value);
        const isPD = /^(cc0|public domain|pd-)/i.test(license);
        if (!photographer && !isPD) continue;

        keep.push({
          title,
          // What the picture IS, which the filename usually does not say. Shown
          // on the card so a choice is informed, and offered as the caption.
          caption: bestCaption(m.ObjectName?.value, m.ImageDescription?.value, title),
          // Where it came from, shown in Studio. A result from the article and a
          // result from a blind text search are not the same kind of evidence
          // and must never look the same.
          source: qy.source,
          // A travel card wants a PHOTOGRAPH. The Danish article on Amalienborg
          // leads with four 18th-century paintings, which are the right images
          // for an encyclopaedia and the wrong ones for a card. Not excluded,
          // because sometimes a painting is all there is: pushed behind the
          // photographs within its own source.
          historical: looksHistorical(title, strip(m.ImageDescription?.value), strip(m.Categories?.value)),
          // thumburl is a scaled render, which is what a card should load. The
          // original can be several megabytes.
          url: ii.thumburl || ii.url,
          fullUrl: ii.url,
          width: ii.thumbwidth || ii.width,
          height: ii.thumbheight || ii.height,
          credit: {
            photographer: photographer || "Public domain",
            source: "wikimedia",
            sourceUrl: ii.descriptionurl || "",
            license,
            licenseUrl: strip(m.LicenseUrl?.value),
          },
        });
      }
      // Photographs first, order otherwise untouched.
      keep.sort((a, b2) => (a.historical === b2.historical ? 0 : a.historical ? 1 : -1));
      sources[b].usable = keep.length;
      perSource.push(keep);
    }

    const results = [];
    for (let round = 0; results.length < n; round++) {
      let dealt = false;
      for (let b = 0; b < perSource.length && results.length < n; b++) {
        const hit = perSource[b][round];
        if (!hit) continue;
        dealt = true;
        sources[b].used++;
        results.push(hit);
      }
      if (!dealt) break;
    }

    return res.status(200).json({ results, subject: token, sources, resolved: { da: daTitle, en: enTitle, categories: catCandidates } });

  } catch (err) {
    return res.status(200).json({ error: String(err).slice(0, 200) });
  }
}
