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

export default async function handler(req, res) {
  const { q, limit, article, category } = req.query;
  if (!q || !String(q).trim()) return res.status(400).json({ error: "q required" });

  const term = String(q).trim();
  const articleTitle = String(article || term).trim();
  const categoryTitle = String(category || term).trim();
  const n = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 24);
  // Over-fetch hard. Most of what comes back is filtered out by mime, licence
  // and the not-a-photo rules, and the whole point of this change is to have
  // real candidates left at the end.
  const pool = Math.max(n * 6, 40);

  // THE ORDER OF THIS ARRAY IS THE PRIORITY ORDER. The pictures on the article
  // come first because they are the ones a person browsing Wikipedia has
  // actually seen and judged worth putting on the page.
  const queries = [
    `https://da.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&generator=images&titles=${encodeURIComponent(articleTitle)}&gimlimit=${pool}&${IMAGEINFO}`,
    `https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&generator=images&titles=${encodeURIComponent(articleTitle)}&gimlimit=${pool}&${IMAGEINFO}`,
    `https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&generator=categorymembers&gcmtitle=${encodeURIComponent("Category:" + categoryTitle)}&gcmtype=file&gcmlimit=${pool}&${IMAGEINFO}`,
    `https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&generator=search&gsrnamespace=6&gsrlimit=${pool}&gsrsearch=${encodeURIComponent(term)}&${IMAGEINFO}`,
  ];

  try {
    // In parallel, and a source that fails or has no article simply contributes
    // nothing. One missing Danish article must not cost the other three.
    const batches = await Promise.all(queries.map(fetchPages));

    const results = [];
    const seen = new Set();
    for (const pages of batches) {
      for (const p of pages) {
        if (results.length >= n) break;
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
        // ── THE ONE FILTER LEFT THAT IS A JUDGEMENT CALL ──────────
        // Commons flags some files with extra usage restrictions: a trademark
        // in shot, or "personality" for a photo with identifiable people in it.
        // Neither makes the file unfree, and a street scene with people in it
        // is exactly what a town page wants. But personality rights are a real
        // claim someone can bring against a commercial site, so anything
        // flagged is skipped rather than judged here. If Oliver wants the
        // street scenes back, this is the line to change, and it is his call
        // rather than mine.
        const restrictions = strip(m.Restrictions?.value);
        if (restrictions) continue;
        // A photographer we cannot name cannot be credited, and an uncreditable
        // CC BY image is not usable. Public domain is the exception: it genuinely
        // needs no author.
        const photographer = strip(m.Artist?.value);
        const isPD = /^(cc0|public domain|pd-)/i.test(license);
        if (!photographer && !isPD) continue;

        results.push({
          title,
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
      if (results.length >= n) break;
    }
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(200).json({ error: String(err).slice(0, 200) });
  }
}
