// ── WALKABLE IN TOWN, NOT BEYOND IT ─────────────────────────────────
//
// Oliver, 1 Oct 2026: "while Klaipeda City is walkable, 'greater' Klaipeda is
// not. Even if you like walking. Because many places have no streets."
//
// So a country can name the centres where walking between stops is fine. A
// walk is a walk when both ends are inside the same centre. A leg that leaves
// one, or runs between two places outside any, is not planned on foot however
// much the traveller likes walking: the model is told so when it writes the
// guide, and the guide itself relabels such a leg rather than trusting it.
//
// Circles, not borders, and generous ones: the point is to stop a walk to the
// seaside villages, not to argue about which street the centre ends on. A
// country with no list here (Denmark) keeps the rules it already has.
const R = 6371;
const toRad = (d) => (d * Math.PI) / 180;
export const kmApart = (a, b) => {
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const WALKABLE_CENTRES = {
  // Theatre Square, with the Old Town, the centre north of the Danė, the cruise
  // terminal and the Sculpture Park inside. Melnragė, Giruliai, Smiltynė across
  // the water, and everything further out, are not.
  //
  // 2 Oct 2026: the point was 55.7127, half a kilometre north of the square.
  // Corrected to OpenStreetMap's Teatro aikštė, read off the map rather than
  // remembered, which is how the first one went wrong.
  LT: [{ name: "Klaipėda city centre", lat: 55.7078, lon: 21.1316, km: 2.5 }],
};

// A leg shorter than this is a walk wherever it is: two doors on one village
// street, or the beach in front of a café.
export const SHORT_HOP_KM = 1.2;

const point = (p) => {
  const lat = Number(p?.lat), lon = Number(p?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};

export const centreOf = (code, p) => {
  const pt = point(p);
  if (!pt) return null;
  return (WALKABLE_CENTRES[String(code || "").toUpperCase()] || []).find(c => kmApart(c, pt) <= c.km) || null;
};

// True when walking this leg is not a sensible plan in that country: both
// ends known, longer than a short hop, and not inside one walkable centre.
// False whenever it cannot tell, so a guide is never relabelled on a guess.
export const offTownWalk = ({ country, from, to, km = null } = {}) => {
  const list = WALKABLE_CENTRES[String(country || "").toUpperCase()];
  if (!list) return false;
  const a = point(from), b = point(to);
  if (!a || !b) return false;
  const dist = Number.isFinite(Number(km)) && km !== null ? Number(km) : kmApart(a, b);
  if (dist <= SHORT_HOP_KM) return false;
  const ca = centreOf(country, a), cb = centreOf(country, b);
  return !(ca && cb && ca === cb);
};

// What the model is told, written per country.
export const WALK_RULES = {
  LT: "WALKING. Klaipėda's Old Town and city centre are walkable. Greater Klaipėda is not: beyond the centre, places such as Melnragė, Giruliai, Smiltynė and the Curonian Spit, Karklė and the towns further out are far apart, and many of the ways between them have no pavement or no street at all. Never plan a walk from the centre to one of them, or between two of them, even for a traveller who loves walking. Use the bus, a Bolt, a car or, for Smiltynė, the ferry, and say which. Walking inside one of those places, once there, is fine.",
};
