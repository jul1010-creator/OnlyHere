// ── KLAIPĖDA'S TALKING SCULPTURES, JOINED UP ────────────────────────
//
// Oliver, 3 Oct 2026, going to bed: "after doing these fixes, try build some
// ideas and examples for how the sculpture structure could function.. I'll
// look at it tomorrow." And before that, asking how to improve the centre's
// sculpture journeys with AI: "I guess that won't be necessary?"
//
// WHAT EXISTS. The tourism centre has 13 talking sculptures. Each has a sign
// with a QR code, and scanning it plays the sculpture's story in Lithuanian,
// English or German (lithuania.travel, read 3 Oct 2026). Each story is on its
// own: after it, the visitor has to find the next sculpture by themselves.
//
// WHAT THIS ADDS, and none of it needs AI at the moment of the scan:
//   1. the next sculpture, and how far it is, after every story;
//   2. a count of how many the visitor has found ("3 of 13 - 10 still to go");
//   3. a trail that fits the time the visitor has, from where they stand;
//   4. the three across the water in Smiltynė, said plainly as a ferry trip;
//   5. for the centre, which sculptures are scanned, when, in which language.
// AI earns a place only where it does work nobody else would: putting the
// centre's texts into more languages, which entryTranslate.js already does.
//
// THE SCULPTURES ARE REAL; the counts on the centre's page are made up.
// Positions are OpenStreetMap's, read on 3 Oct 2026. A sculpture's line
// below is only what a page said about it; the rest is the centre's own story
// in its recording, which this page does not invent.
import { walkMinutes } from "../utils/nowPlanner";

export const KLAIPEDA_SCULPTURES_PATH = "/lithuania/sculptures";

// side: "city" for the mainland, "smiltyne" for across the strait (still
// Klaipėda city: Smiltynė belongs to the city municipality, not Neringa).
export const SCULPTURES = [
  { id: "annchen", name: "Ännchen of Tharau", lt: "Taravos Anikė", lat: 55.70792, lon: 21.13156, side: "city", where: "Theatre Square",
    line: "The girl from Simon Dach's 17th century love poem, in the middle of Theatre Square since 1989." },
  { id: "ghost", name: "The Black Ghost", lt: "Juodasis vaiduoklis", lat: 55.70660, lon: 21.12682, side: "city", where: "Castle harbour",
    line: "A dark figure rising out of the castle harbour. The legend says he warned a castle guard about grain and firewood." },
  { id: "kiss", name: "A Kiss", lt: "Bučinys", lat: 55.70617, lon: 21.12306, side: "city", where: "By the cruise terminal",
    line: "By Romualdas Kvintas, a few steps from where the cruise ships dock." },
  { id: "neringa", name: "Neringa", lt: "Neringa", lat: 55.70662, lon: 21.14067, side: "city", where: "Old Town",
    line: "The giant girl who, the legend says, made the Curonian Spit with her own hands." },
  { id: "fisherman", name: "The Fisherman", lt: "Žvejys", lat: 55.70990, lon: 21.13150, side: "city", where: "Danės street" },
  { id: "mermaid", name: "The Mermaid", lt: "Dangės undinė", lat: 55.71020, lon: 21.13312, side: "city", where: "By the Danė" },
  { id: "vydunas", name: "Vydūnas", lt: "Vydūnas", lat: 55.71251, lon: 21.12964, side: "city", where: "North of the river" },
  { id: "klaipedietis", name: "Klaipėdietis", lt: "Klaipėdietis", lat: 55.71411, lon: 21.13149, side: "city", where: "Mažvydo alley" },
  { id: "mazvydas", name: "Martynas Mažvydas", lt: "Martynas Mažvydas", lat: 55.71865, lon: 21.12883, side: "city", where: "Mažvydas sculpture park" },
  { id: "switchman", name: "The Switchman", lt: "Iešmininkas", lat: 55.71968, lon: 21.13570, side: "city", where: "By the old railway",
    line: "He tells of the city's first narrow-gauge railway, built in the late 19th century." },
  { id: "homestead", name: "Fishermen's Ethnographic Homestead", lt: "Etnografinė pajūrio žvejo sodyba", lat: 55.71409, lon: 21.10435, side: "smiltyne", where: "Smiltynė" },
  { id: "vessels", name: "Fishing Vessels Exposition", lt: "Žvejybos laivų ekspozicija", lat: 55.71301, lon: 21.10553, side: "smiltyne", where: "Smiltynė" },
  { id: "albatross", name: "The Albatross", lt: "Albatrosas", lat: 55.71754, lon: 21.10211, side: "smiltyne", where: "Smiltynė, by the Sea Museum" },
];

// The languages a story is told in today, and the ones Gemlyx could add. The
// centre's top visitors include Latvians and Poles (Atvira Klaipėda, 25 Sep
// 2026), who today hear the stories in none of their own.
export const STORY_LANGS = { today: ["Lietuvių", "English", "Deutsch"], next: ["Latviešu", "Polski", "Eesti"] };

// About how long a story and a look take at one sculpture.
export const LISTEN_MINUTES = 4;

// The old ferry across to Smiltynė (data/klaipedaDemo.js, keltas.lt).
export const FERRY = { name: "Old Ferry to Smiltynė", lat: 55.70645, lon: 21.12289, crossing: 10 };

const byId = (id) => SCULPTURES.find(s => s.id === id) || null;

// "3 of 13 - 4 still to go", the way Oliver writes a count against a total
// (14 Sep 2026: a hyphen there, not a comma).
export const progressLine = (found, total = SCULPTURES.length) => {
  const n = Math.max(0, Math.min(total, found));
  return n >= total ? `All ${total} found` : `${n} of ${total} - ${total - n} still to go`;
};

// The nearest sculpture on the same side of the water that the visitor has
// not found yet, and how many minutes on foot.
export const nextFrom = (id, found = []) => {
  const here = byId(id);
  if (!here) return null;
  const left = SCULPTURES.filter(s => s.side === here.side && s.id !== id && !found.includes(s.id));
  if (!left.length) return null;
  const best = left.map(s => ({ s, min: walkMinutes(here, s) })).sort((a, b) => a.min - b.min)[0];
  return { ...best.s, minutes: best.min };
};

// A trail from where the visitor stands, as many sculptures as fit in the
// time they have: nearest first each time, a few minutes at each, on this
// side of the water. The sculpture they scanned counts as the first stop.
export const trailFrom = (id, minutes, found = []) => {
  const start = byId(id);
  if (!start) return { stops: [], used: 0 };
  const stops = [{ ...start, arrive: 0, leg: 0 }];
  let here = start, t = LISTEN_MINUTES;
  const pool = SCULPTURES.filter(s => s.side === start.side && s.id !== id && !found.includes(s.id));
  while (pool.length) {
    const ranked = pool.map(s => ({ s, leg: walkMinutes(here, s) })).sort((a, b) => a.leg - b.leg);
    const { s, leg } = ranked[0];
    if (t + leg + LISTEN_MINUTES > minutes) break;
    stops.push({ ...s, arrive: t + leg, leg });
    t += leg + LISTEN_MINUTES;
    here = s;
    pool.splice(pool.indexOf(s), 1);
  }
  return { stops, used: t };
};

// From any mainland sculpture to the ferry, so the page can say how far the
// three across the water are.
export const ferryFrom = (id) => {
  const here = byId(id);
  if (!here || here.side !== "city") return null;
  return { walk: walkMinutes(here, FERRY), crossing: FERRY.crossing };
};

// Google Maps on foot from one point to another.
export const walkLink = (from, to) =>
  `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}`;

// ── WHAT THE CENTRE WOULD SEE, MADE UP ──────────────────────────────
// A week of scans, invented to show the shape of the page, never presented as
// real. The real numbers would come from counting the scans that open a page.
export const EXAMPLE_WEEK = {
  scans: { annchen: 412, ghost: 388, kiss: 301, fisherman: 176, mermaid: 164, neringa: 121, vydunas: 88, klaipedietis: 73, mazvydas: 41, switchman: 37, albatross: 96, homestead: 58, vessels: 52 },
  langs: [["English", 46], ["Deutsch", 27], ["Lietuvių", 19], ["Latviešu", 5], ["Polski", 3]],
  finished: 23,
  busiest: "Thursday 11:00, two ships in",
};
