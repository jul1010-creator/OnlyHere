// ── ONE APP, MORE THAN ONE COUNTRY ──────────────────────────────────
//
// Oliver, 29 Sep 2026: "Can we prepare to build something that I can present
// to Klaipeda? Not build museums and bla bla bla, but the template that we have
// on Denmark, and put it onto Klaipeda." Then, of the plan in
// LITHUANIA_PLAN_29SEP.md: "Yes, we just need something I can present to my
// old supervisor."
//
// This file is Phase 0 of that plan: the country as a thing the app knows
// about, with Denmark exactly as it was. Every fact that differs between two
// countries lives in one profile here, so a later phase that needs "the
// currency" or "the time zone" reads it from the active country instead of
// writing "DKK" or "Europe/Copenhagen" into one more file.
//
// THE RULE THAT KEEPS DENMARK SAFE: a row with no `country` is Danish. Every
// row published before today has none, and none of them is touched. Only a
// row drafted for another country carries the field at all.
//
// Nothing in here imports from the rest of the app, so anything can import it
// without a cycle.

export const DEFAULT_COUNTRY = "DK";

// Bounds are a box around the whole country with a little sea on each side, so
// an island or a spit at the edge is inside. They answer "is this point in the
// right country", never "is it on land".
export const COUNTRY_PROFILES = {
  DK: {
    code: "DK",
    slug: "denmark",
    name: "Denmark",
    adjective: "Danish",
    currency: "DKK",
    zone: "Europe/Copenhagen",
    bounds: { latMin: 54.4, latMax: 57.9, lonMin: 7.9, lonMax: 15.3 },
    googleLanguage: "da",
    googleRegion: "DK",
    wikiLanguage: "da",
    // Where a visitor usually arrives, and so where a town's journey is
    // measured from. See journeyScope.
    hub: "Copenhagen",
  },
  // The Curonian Spit reaches to about 20.95 east at Nida, so the west edge
  // sits at 20.8 to keep Smiltynė and the whole spit inside.
  LT: {
    code: "LT",
    slug: "lithuania",
    name: "Lithuania",
    adjective: "Lithuanian",
    currency: "EUR",
    zone: "Europe/Vilnius",
    bounds: { latMin: 53.85, latMax: 56.5, lonMin: 20.8, lonMax: 26.9 },
    googleLanguage: "lt",
    googleRegion: "LT",
    wikiLanguage: "lt",
    hub: "Vilnius",
  },
};

export const countryProfile = (code) => COUNTRY_PROFILES[code] || COUNTRY_PROFILES[DEFAULT_COUNTRY];

// The country a row belongs to. Missing, empty or unknown all mean Denmark,
// because that is what every row meant before this file existed.
export const rowCountry = (payload) => {
  const c = String(payload?.country || "").trim().toUpperCase();
  return COUNTRY_PROFILES[c] ? c : DEFAULT_COUNTRY;
};

// Which country an address is about. Only a path that starts with another
// country's slug leaves Denmark: "/", "/denmark/ribe", "/guide/abc" and
// "/support" all stay Danish, so no existing address changes meaning.
export const countryFromPath = (pathname) => {
  const seg = String(pathname || "").split("/").filter(Boolean)[0] || "";
  const hit = Object.values(COUNTRY_PROFILES).find(c => c.code !== DEFAULT_COUNTRY && c.slug === seg.toLowerCase());
  return hit ? hit.code : DEFAULT_COUNTRY;
};

// The country the page is showing, read from the address at the moment it is
// asked. Outside a browser (the test suite, a server route) it is Denmark.
export const activeCountry = () => (
  typeof window !== "undefined" && window.location ? countryFromPath(window.location.pathname) : DEFAULT_COUNTRY
);

// Is a point inside a country's box. Accepts { lat, lon } like the rest of the
// app's coordinates.
export const isInCountry = (coords, code = DEFAULT_COUNTRY) => {
  if (!coords || typeof coords !== "object") return false;
  const lat = Number(coords.lat), lon = Number(coords.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  const b = countryProfile(code).bounds;
  return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
};

// ── THE COUNTRY STUDIO IS DRAFTING FOR ──────────────────────────────
//
// Phase 1 of LITHUANIA_PLAN_29SEP.md. Studio lives on the Danish site, so the
// address says Denmark while a Klaipėda draft is running. The draft sets this
// for as long as it runs and clears it when it ends, and the helpers a draft
// calls (the geocoder, the Google lookups) ask workingCountry() instead of
// assuming Denmark. Nothing but a Studio draft ever sets it, so on the public
// site it is always the country of the page.
let working = null;
export const setWorkingCountry = (code) => { working = COUNTRY_PROFILES[code] ? code : null; };
export const workingCountry = () => working || activeCountry();
export const workingProfile = () => countryProfile(workingCountry());

// The query string the API routes read. Nothing for Denmark, so every URL the
// Danish site builds is exactly the one it built before.
export const countryParam = (code = workingCountry()) => (code && code !== DEFAULT_COUNTRY && COUNTRY_PROFILES[code] ? `&country=${code}` : "");

// ── WHERE A COUNTRY'S PAGES START ───────────────────────────────────
// Phase 2 of LITHUANIA_PLAN_29SEP.md. Denmark's home is "/", as it always was;
// another country's is its slug, so "/lithuania#attractions" stays Lithuanian
// when a tab changes and "/#attractions" stays Danish.
export const homePath = (code = activeCountry()) => (code === DEFAULT_COUNTRY || !COUNTRY_PROFILES[code] ? "/" : `/${COUNTRY_PROFILES[code].slug}`);
