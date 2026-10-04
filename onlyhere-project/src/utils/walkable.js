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

// ── AND ACROSS THE WATER IS NOT IN TOWN ─────────────────────────────
// The circle around Theatre Square also covers Smiltynė, across the strait on
// the Curonian Spit, where the Sea Museum is. Two kilometres as the crow
// flies and a ferry in between: nobody walks there and no Bolt drives there
// without the car ferry. Found in review on 2 Oct 2026. The strait runs from
// about 21.116 east at the old ferry to about 21.103 at its mouth.
export const ACROSS_WATER = {
  LT: (p) => p.lat > 55.55 && p.lat < 55.727 && p.lon < 21.116 - (p.lat - 55.705) * 0.6,
};
// ── AND THE FERRY THAT CROSSES IT ───────────────────────────────────
// Oliver, 4 Oct 2026, from the work list: let a walk take the ferry to
// Smiltynė. The old ferry carries people on foot from the North Horn by the
// castle to Smiltynė. Both landings were read off Google Maps on 4 Oct 2026
// ("Old Ferry Terminal, North Horn" and "Old Ferry Terminal, Smiltynė"); the
// crossing is the ten minutes the sculpture page already uses (keltas.lt).
// Klaipėda's tourist office (klaipedon.lt, read 4 Oct 2026): every 30 minutes
// in the warmer season, every hour in the colder one. It does not say which
// months, so the warm timetable is assumed only from May to September, and
// the wait counted is the whole gap between two ferries: a walker who just
// missed one still gets back in time.
export const FERRIES = {
  LT: {
    name: "the old ferry to Smiltynė",
    near: { lat: 55.70634, lon: 21.12303 },
    far: { lat: 55.70574, lon: 21.11288 },
    crossing: 10,
    timetable: "keltas.lt",
  },
};
export const ferryOf = (code) => FERRIES[String(code || "").toUpperCase()] || null;
// The longest wait for the next ferry in a given month (1 to 12). Unknown is
// the colder timetable, the longer of the two.
export const ferryWait = (code, month) => {
  if (!ferryOf(code)) return null;
  const m = Number(month);
  return m >= 5 && m <= 9 ? 30 : 60;
};

export const acrossWater = (code, p) => {
  const pt = point(p);
  const test = ACROSS_WATER[String(code || "").toUpperCase()];
  return !!(pt && test && test(pt));
};

export const centreOf = (code, p) => {
  const pt = point(p);
  if (!pt) return null;
  if (acrossWater(code, pt)) return null;
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

export const walkRule = (code) => {
  const r = WALK_RULES[String(code || "").toUpperCase()];
  return r ? `\n\n${r}` : "";
};
