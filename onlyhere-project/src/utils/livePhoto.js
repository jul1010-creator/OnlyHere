// ── A PLACE'S OWN PHOTO, FROM ITS PUBLISHED PAGE ────────────────────
//
// Oliver, 6 Oct 2026, of the new map pins: "Then with the photos of the
// attractions inside", and of where the photos come from: "I'll replace the
// pictures if Klaipeda gives me some." Until then, a place on an example walk
// or on the sculpture trail takes the photo from the same place's page as
// published in the Studio, where its credit already is. A place is the same
// place when it stands within a few metres, or close by and sharing a word of
// its name. Nothing is guessed beyond that: no match, no photo, and the pin
// shows the place's sign.
import { haversineKm } from "./helpers";
const kmBetween = (a, b) => haversineKm(a, b);

export const PHOTO_NEAR_M = 40;
export const PHOTO_CLOSE_M = 160;

const plain = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const COMMON = new Set(["klaipeda", "klaipedos", "museum", "muziejus", "square", "aikste", "street", "gatve", "park", "parkas", "the", "and", "old", "town", "senamiestis"]);
const wordsOf = (s) => new Set(plain(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !COMMON.has(w)));

export const sameNameish = (a, b) => {
  const A = wordsOf(a), B = wordsOf(b);
  for (const w of A) if (B.has(w)) return true;
  return false;
};

const pointOf = (r) => {
  const lat = Number(r?.__lat ?? r?.lat), lon = Number(r?.__lon ?? r?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon) ? { lat, lon } : null;
};
export const usablePhoto = (url) => /^https:\/\/\S+$/i.test(String(url || "").trim());

// The published row for a place, if one is plainly the same place and has a
// photo: { photo, credit } or null. `place` has a name and a position;
// `rows` are published entries.
export const livePhotoFor = (place, rows = []) => {
  const at = pointOf(place);
  if (!at) return null;
  let best = null;
  for (const r of rows) {
    if (!usablePhoto(r?.photo)) continue;
    const p = pointOf(r);
    if (!p) continue;
    const m = kmBetween(at, p) * 1000;
    const named = sameNameish(place.name, r.name) || sameNameish(place.name, r.localName) || sameNameish(place.localName || place.lt, r.name);
    if (!(m <= PHOTO_NEAR_M || (m <= PHOTO_CLOSE_M && named))) continue;
    const score = m - (named ? 1000 : 0);
    if (!best || score < best.score) best = { score, photo: String(r.photo).trim(), credit: r.__photoCredit || null };
  }
  return best ? { photo: best.photo, credit: best.credit } : null;
};
