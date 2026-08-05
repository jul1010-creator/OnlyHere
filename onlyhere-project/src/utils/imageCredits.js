// ── Image credits ─────────────────────────────────────────────────
// public/image-credits.json has existed for a while and already tracks every
// downloaded photo: the file it was saved as, where it came from, the
// photographer, the source URL, and the licence where one applies. Nothing in
// the app ever read it, so none of that reached a single visitor.
//
// Oliver's ask (Aug 5 2026): "I might wanna use some of the Wiki-pictures that
// aren't public domain. I need to somehow credit them onto these pictures."
//
// WHAT THE LICENCES ACTUALLY REQUIRE, since this is the part worth getting
// right rather than guessing at:
//   - CC BY and CC BY-SA: attribution is MANDATORY. You must name the author,
//     name the licence, and link to it. The credit has to be reasonably near
//     the work, which is why this renders as a caption under the photo and not
//     only on a credits page. CC BY-SA additionally means a derivative of the
//     image must carry the same licence (cropping and scaling for display is
//     fine; that is not a derivative work).
//   - Public domain / CC0: no credit required. Still shown when we know the
//     photographer, because crediting people who did not demand it is cheap.
//   - Pexels / Unsplash: attribution is not legally required but is asked for.
//     Also shown.
//
// The file lives in public/ so it is fetched at runtime rather than imported.
// That is deliberate: it means a corrected credit is a file change and a
// redeploy, with no code touched, and a missing or malformed file can never
// break a page (every failure path here resolves to "no credit shown").
let creditsPromise = null;
let creditsByFile = null;

const normalise = (p) => {
  if (typeof p !== "string") return "";
  const clean = p.trim().split("?")[0].split("#")[0];
  if (!clean) return "";
  return clean.startsWith("/") ? clean : `/${clean}`;
};

export const loadImageCredits = () => {
  if (!creditsPromise) {
    creditsPromise = fetch("/image-credits.json")
      .then(r => (r.ok ? r.json() : []))
      .then(list => {
        const map = {};
        (Array.isArray(list) ? list : []).forEach(entry => {
          const key = normalise(entry && entry.file);
          if (key) map[key] = entry;
        });
        creditsByFile = map;
        return map;
      })
      .catch(() => { creditsByFile = {}; return {}; });
  }
  return creditsPromise;
};

// Synchronous lookup, for render. Returns null until the file has loaded, which
// is why the component below re-renders once loadImageCredits resolves.
export const creditFor = (photoPath) => {
  const key = normalise(photoPath);
  if (!key || !creditsByFile) return null;
  const entry = creditsByFile[key];
  if (!entry) return null;
  // An entry with nobody to credit and nowhere to link is not a credit.
  if (!entry.photographer && !entry.source && !entry.license) return null;
  return entry;
};

export const allImageCredits = () => Object.values(creditsByFile || {});

// Canonical licence deed URLs, so the licence name in a caption is a real link
// to the real terms rather than plain text. Only the ones actually in use plus
// the obvious neighbours; anything unrecognised renders as text, not a guess.
const LICENSE_URLS = {
  "cc by 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "cc by 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "cc by 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "cc by-sa 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "cc by-sa 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "cc by-sa 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "cc0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "public domain": "https://en.wikipedia.org/wiki/Public_domain",
};

export const licenseUrl = (license) => LICENSE_URLS[String(license || "").trim().toLowerCase()] || null;

// True when the licence legally requires the credit to appear, as opposed to
// merely appreciating it. Used to decide whether a caption may be omitted for
// layout reasons. Right now nothing omits it, but the distinction is worth
// keeping explicit so a future layout change cannot quietly drop a required one.
export const creditIsRequired = (entry) => /^cc by/i.test(String((entry && entry.license) || "").trim());
