// ── STANDING SOMEWHERE ELSE ─────────────────────────────────────────
//
// Oliver, 17 Sep 2026, on testing the community-event notices: "In order for me
// to test this, you need to create a studio that allows me to 'pretend' i'm in
// certain areas. Like a VPN."
//
// He is describing the one thing that cannot be tested from a desk. Everything
// the app says about where a reader is standing, the travel labels, the nearest
// towns, the live events strip, and now "locals near you are hosting this",
// comes from one browser coordinate, and his is in Nørresundby every day of the
// year. A feature about Sejerø cannot be seen from Nørresundby, so it either
// ships untested or the coordinate becomes something he can move.
//
// ── ONE COORDINATE, AND EVERYTHING ELSE READS IT UNCHANGED ──────────
//
// The whole design is that nothing downstream learns about this. The app has a
// single `userCoords`, and about a dozen places read it: the near-you ranking,
// travelLabel, the craft "nearest first" sort, the events strip. Every one of
// them keeps working exactly as written, because what moves is the value, not
// the question. Anything that took a flag instead would be a second code path
// that only he ever runs, which is the kind of test rig that passes while the
// real path breaks.
//
// ── AND IT HAS TO BE IMPOSSIBLE TO FORGET ───────────────────────────
//
// This is the part that matters more than the feature. A coordinate quietly
// stuck on Sejerø makes every travel time on the site wrong, and wrong in a way
// that looks like a bug rather than like a setting. Today already cost hours to
// a file written to a folder nobody was reading, so: it says so on screen,
// constantly, in a colour that is not the brand's, with the way out on the same
// line. A test mode you cannot see is a bug you have not found yet.
import { isInDenmark } from "./helpers";

// localStorage, deliberately, so it survives the reloads he will do while
// testing. It is per-browser and per-person and it changes nothing for any
// reader: the worst a stranger can do by setting it is move their own map.
export const PRETEND_KEY = "gemlyx.pretendAt";

// "55.95, 11.15" as typed, in either order of separators. A coordinate is the
// escape hatch for anywhere the library has never heard of, which for islands
// is most of them.
const COORD = /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/;

const num = (s) => Number(String(s).replace(",", "."));

// A place list is [{ name, lat, lon }], built by the caller from whatever it
// holds: TOWN_COORDS, the published rows, both. This file does not know where
// coordinates come from and does not want to.
export const findPlace = (text, places) => {
  const want = String(text || "").trim().toLowerCase();
  if (!want) return null;
  const list = Array.isArray(places) ? places : [];
  const exact = list.find(p => String(p?.name || "").toLowerCase() === want);
  if (exact) return exact;
  // A prefix, so "sejer" finds Sejerø, and the SHORTEST match wins: typing
  // "aar" should not land on "Aarhus Festuge" when Aarhus is on the list.
  const starts = list.filter(p => String(p?.name || "").toLowerCase().startsWith(want));
  if (starts.length) return starts.sort((a, b) => a.name.length - b.name.length)[0];
  const has = list.filter(p => String(p?.name || "").toLowerCase().includes(want));
  return has.length ? has.sort((a, b) => a.name.length - b.name.length)[0] : null;
};

// Returns { name, lat, lon } or null. Null means "I could not turn that into a
// place", which the panel says out loud rather than silently doing nothing.
export const parsePretend = (text, places) => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const m = COORD.exec(raw);
  if (m) {
    const lat = num(m[1]), lon = num(m[2]);
    // IN DENMARK, and this is not fussiness. Every consumer of this coordinate
    // is gated on isInDenmark, so a coordinate outside it would be accepted,
    // stored, shown as "pretending", and then change nothing on any page. That
    // is the worst shape a setting can have.
    return isInDenmark({ lat, lon }) ? { name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon } : null;
  }
  const found = findPlace(raw, places);
  if (!found) return null;
  const lat = Number(found.lat), lon = Number(found.lon);
  return isInDenmark({ lat, lon }) ? { name: found.name, lat, lon } : null;
};

export const cleanPretend = (value) => {
  if (!value || typeof value !== "object") return null;
  const lat = Number(value.lat), lon = Number(value.lon);
  if (!isInDenmark({ lat, lon })) return null;
  return { name: String(value.name || "").slice(0, 60) || `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon };
};

export const readPretend = (store) => {
  try {
    const raw = store?.getItem?.(PRETEND_KEY);
    return raw ? cleanPretend(JSON.parse(raw)) : null;
  } catch { return null; }
};

export const writePretend = (store, value) => {
  try {
    const clean = cleanPretend(value);
    if (clean) store?.setItem?.(PRETEND_KEY, JSON.stringify(clean));
    else store?.removeItem?.(PRETEND_KEY);
    return clean;
  } catch { return cleanPretend(value); }
};

// What the banner says. One sentence, and it names the place rather than the
// numbers, because "Sejerø" is what he set and "55.9, 11.1" is what he would
// have to decode at a glance.
export const pretendBanner = (value) => {
  const at = cleanPretend(value);
  return at ? `Pretending you are in ${at.name}` : "";
};
