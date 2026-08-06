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
// EVIDENCE THIS MAPPING IS RIGHT: public/image-credits.json already contains
// two Commons images recorded by an earlier session, and their photographer /
// sourceUrl / license values line up exactly with the extmetadata fields read
// below ("Rüdiger Stehn from Kiel, Deutschland" / CC BY-SA 2.0, and
// "Beethoven9" / CC BY-SA 3.0).
//
// SERVER-SIDE ON PURPOSE, for two reasons. Wikimedia's API policy asks for a
// descriptive User-Agent identifying the application and a contact, which a
// browser cannot set. And keeping it here means the licence filtering below
// cannot be bypassed by anything running in the page.

// Licences we will actually use. Everything here is free to publish with
// attribution. Deliberately an ALLOW-list rather than a block-list: a licence
// nobody here recognises is treated as unusable, because the failure mode of
// guessing wrong is publishing someone's photo without the right to do so.
// NC and ND are checked FIRST and rejected outright. Testing caught the earlier
// version of this letting both through: "CC BY-NC 3.0" matched the "cc by" head
// and the trailing groups were optional, so it passed. That is not a cosmetic
// bug. NC forbids commercial use and Gemlyx is a commercial product, and ND
// forbids derivative works, which a cropped card image arguably is. Publishing
// under either would be using someone's photo without the right to.
const FORBIDDEN = /\bn[cd]\b|noncommercial|non-commercial|noderiv|no[ -]deriv/i;
const USABLE = /^(cc0|cc[ -]by([ -]sa)?([ -][0-9.]+)?\s*$|public domain|pd-|no restrictions|attribution\s*$)/i;
const licenseIsUsable = (l) => {
  const s = String(l || "").trim();
  if (!s || FORBIDDEN.test(s)) return false;
  return USABLE.test(s);
};

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
const strip = (s) => String(s || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, name) => (Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : ""))
  .replace(/\s+/g, " ")
  .trim();

export default async function handler(req, res) {
  const { q, limit } = req.query;
  if (!q || !String(q).trim()) return res.status(400).json({ error: "q required" });

  const n = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 12);
  const url = "https://commons.wikimedia.org/w/api.php"
    + "?format=json&formatversion=2&action=query"
    + "&generator=search&gsrnamespace=6&gsrlimit=" + n * 2   // over-fetch, some get filtered out
    + "&gsrsearch=" + encodeURIComponent(String(q).trim())
    + "&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1400";

  try {
    const r = await fetch(url, {
      headers: {
        // Wikimedia asks for this. A generic agent gets rate limited or blocked.
        "User-Agent": "Gemlyx/1.0 (https://gemlyx.com; hello@gemlyx.com) travel-guide-photo-lookup",
        "Accept": "application/json",
      },
    });
    if (!r.ok) return res.status(200).json({ error: `Commons returned ${r.status}` });
    const data = await r.json();
    const pages = data?.query?.pages || [];
    if (!Array.isArray(pages) || pages.length === 0) return res.status(200).json({ results: [] });

    const results = [];
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      // Photographs only. Commons is full of diagrams, coats of arms, PDFs and
      // audio, none of which belong on a travel card.
      if (!/^image\/(jpeg|png|webp)$/i.test(ii.mime || "")) continue;
      const m = ii.extmetadata || {};
      const license = strip(m.LicenseShortName?.value);
      if (!licenseIsUsable(license)) continue;
      // Some files carry extra usage restrictions (trademark, personality
      // rights, non-free logo). If anything is flagged, skip it rather than
      // making a judgement call about someone else's rights.
      const restrictions = strip(m.Restrictions?.value);
      if (restrictions) continue;
      // A photographer we cannot name cannot be credited, and an uncreditable
      // CC BY image is not usable. Public domain is the exception: it genuinely
      // needs no author.
      const photographer = strip(m.Artist?.value);
      const isPD = /^(cc0|public domain|pd-)/i.test(license);
      if (!photographer && !isPD) continue;

      results.push({
        title: String(p.title || "").replace(/^File:/, ""),
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
      if (results.length >= n) break;
    }
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(200).json({ error: String(err).slice(0, 200) });
  }
}
