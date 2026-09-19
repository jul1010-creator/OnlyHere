// ── WHAT THE LOCALS ARE DOING, WHILE IT IS STILL ON ─────────────────
//
// Oliver, 17 Sep 2026, after seeing the first community sweep land as a draft:
// "This shouldn't be a massive blog. This should be little notifications you
// get as a paid account. 'Near you, locals on Sejerø is hosting an event at bla
// bla bla..' And when the event is over, then the draft is gone. No return."
//
// Then the shape: "It should be a notification and then with text under when it
// pops... And when you've clicked the notification, then the notification will
// be gone. But it will have its own tab under 'near you' in the account section
// where saved trips, General, about me, etc. is. and again, when the event is
// over, then it disappears. Only what is current."
//
// ── SO A NOTICE IS NOT AN ENTRY, AND THAT IS THE WHOLE DESIGN ───────
//
// Everything else this app publishes is written to be read in a year: a town, a
// festival, a restaurant, researched, fact-checked, sourced. A notice is the
// opposite of that on every axis. It is one line about one evening, it is true
// for a week, and then it is not there. It has no page, no URL of its own, no
// __sources block and no redraft. Nothing links to it and nothing should.
//
// That is why it lives in its own file and its own table rather than as a type
// on gemlyx_content. A notice sharing a table with the entries would arrive in
// the Explore lists, the search index, the sitemap and the guide builder, each
// of which would then need a rule to keep it out, and one of them would be
// forgotten. See the CONTENT_TYPES comment in sourcePolicy.js, which is the
// same argument about a different list.
//
// ── AND "GONE" IS A FILTER, NOT A JOB ───────────────────────────────
//
// The day after the event, the notice stops being returned. It is not swept, not
// archived, not marked. Nothing has to run for it to disappear, and nothing can
// forget to run. A cleanup job that deletes the rows can come later and change
// nothing about what a reader sees, which is the right order: correctness first,
// tidiness second.
import { parseEventDate, isPastDate } from "./eventDates";

// The same radius the Explore page's own near-you ranking uses for "close
// towns", quoted rather than re-chosen: two different numbers for one idea is
// how a reader ends up being told a place is near them on one screen and not on
// another. 30 km is a realistic same-day-trip radius in Denmark.
export const NOTICE_RADIUS_KM = 30;

// Flat earth, and it is fine at this scale: 111.32 km per degree of latitude,
// 62.06 per degree of longitude at Danish latitudes. The same constants the
// near-you ranking in App.jsx has used since it was written. Over 30 km the
// error is metres, and nothing here is deciding a route.
export const distanceKm = (a, b) => {
  const aLat = Number(a?.lat), aLon = Number(a?.lon), bLat = Number(b?.lat), bLon = Number(b?.lon);
  if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) return null;
  const dLat = (aLat - bLat) * 111.32;
  const dLon = (aLon - bLon) * 62.06;
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

export const cleanNotice = (row) => {
  const day = String(row?.day || row?.date || "").slice(0, 10);
  if (!parseEventDate(day)) return null;
  const headline = String(row?.headline || "").trim();
  if (!headline) return null;
  const endDay = String(row?.end_day || row?.endDay || "").slice(0, 10);
  const lat = Number(row?.lat), lon = Number(row?.lon);
  return {
    id: row?.id ?? null,
    headline: headline.slice(0, 120),
    // The post's own words, kept short. This is the "text under" he asked for,
    // and it is quoted rather than rewritten: a village post says what it means
    // better than a summary of it would, and nothing here has checked anything,
    // so putting it in our own voice would be claiming more than we know.
    body: String(row?.body || "").trim().slice(0, 400),
    // ── AND THE VILLAGE'S OWN DANISH, CARRIED BESIDE IT ───────────
    // Oliver, 19 Sep 2026: "it might want to get translated." The two fields
    // above hold the English a visitor reads; these hold the post exactly as
    // it was written, so a Dane standing on Sejerø gets the village rather
    // than a translation of it. Which of the two a reader sees is decided at
    // render, by noticeText in utils/noticeVoice.js.
    //
    // CARRIED RATHER THAN CHOSEN HERE, because this function has no idea what
    // language anybody is reading in and guessing would be worse than either
    // answer. A row added before the translation existed has these empty and
    // falls back to the other one, which is why noticeText never returns
    // nothing.
    headlineDa: String(row?.headline_da || row?.headlineDa || "").trim().slice(0, 120),
    bodyDa: String(row?.body_da || row?.bodyDa || "").trim().slice(0, 400),
    day,
    // A range keeps its last day, so a three day festival is current on its
    // middle Saturday rather than expiring after the first evening.
    endDay: parseEventDate(endDay) && endDay >= day ? endDay : day,
    place: String(row?.place || "").trim().slice(0, 60),
    sourceUrl: String(row?.source_url || row?.sourceUrl || "").trim(),
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
};

// Current means the last day has not passed. Today counts: an event this
// evening is the most useful one there is.
// cleanNotice UNCONDITIONALLY, and the first version of this did not. It read
// "already clean or clean it" off whether a field was present, and a raw row
// carries end_day while a clean one carries endDay, so a raw row skipped the
// cleaning and then had no endDay to read: a three day festival expired after
// its first evening. cleanNotice is idempotent, which is what makes this safe,
// and it costs nothing worth measuring.
export const noticeIsCurrent = (notice, today) => {
  const n = cleanNotice(notice);
  return !!n && !isPastDate(n.endDay, today);
};

// ── WHAT A READER GETS TOLD ─────────────────────────────────────────
//
// His own sentence, near enough word for word: "Near you, locals on Sejerø is
// hosting an event at bla bla bla". The place is named because "near you" on
// its own is the vaguest possible claim, and a reader who is in Kalundborg
// wants to know it is Sejerø before deciding whether that is near enough.
export const noticeTitle = (notice) => {
  const n = cleanNotice(notice);
  if (!n) return "";
  return n.place ? `Near you: something on ${n.place}` : "Near you";
};

const DA_MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "Saturday 19 September". No year, because everything here happens inside the
// next few weeks by construction, and a year on a date that close reads as a
// form field rather than as a plan.
export const noticeWhen = (notice) => {
  const n = cleanNotice(notice);
  const d = n ? parseEventDate(n.day) : null;
  if (!d) return "";
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
  const one = `${weekday} ${d.getDate()} ${DA_MONTH[d.getMonth()]}`;
  if (!n.endDay || n.endDay === n.day) return one;
  const end = parseEventDate(n.endDay);
  return end ? `${one} to ${end.getDate()} ${DA_MONTH[end.getMonth()]}` : one;
};

// ── WHICH ONES REACH THIS READER ────────────────────────────────────
//
// Three tests and all three are hard gates. Current, near, and not already
// dismissed. A notice with no coordinate reaches NOBODY rather than everybody:
// "near you" is the entire promise and a notice that cannot answer where it is
// cannot make it.
export const noticesNearby = (rows, coords, { today = null, dismissed = [], radiusKm = NOTICE_RADIUS_KM } = {}) => {
  const seen = new Set((Array.isArray(dismissed) ? dismissed : []).map(String));
  const here = coords && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lon)) ? coords : null;
  if (!here) return [];
  return (Array.isArray(rows) ? rows : [])
    .map(cleanNotice)
    .filter(Boolean)
    .filter(n => n.lat !== null && n.lon !== null)
    .filter(n => !seen.has(String(n.id)))
    .filter(n => noticeIsCurrent(n, today))
    .map(n => ({ ...n, km: distanceKm(n, here) }))
    .filter(n => n.km !== null && n.km <= radiusKm)
    // Soonest first, and the nearer one first when two share a day. What has a
    // deadline on it goes above what does not.
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.km - b.km));
};

// ── DISMISSAL IS PER DEVICE, DELIBERATELY ───────────────────────────
//
// "when you've clicked the notification, then the notification will be gone."
// Gone from the POP-UP. It is still in the Near you tab until the event passes,
// which is why this list is read by the popup and not by the tab.
//
// localStorage rather than a table: a dismissal is not worth a round trip, it
// is not worth a row per reader per notice, and the worst case of losing it is
// that one card appears once more on a new phone. Every read is wrapped,
// because a private window throws rather than returning nothing.
export const DISMISSED_KEY = "gemlyx.noticesSeen";

export const readDismissed = (store) => {
  try {
    const raw = store?.getItem?.(DISMISSED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(String) : [];
  } catch { return []; }
};

// Pruned against what is still live on every write, so this cannot grow
// forever: an id that no longer exists cannot be dismissed again.
export const writeDismissed = (store, ids, liveIds) => {
  const live = new Set((Array.isArray(liveIds) ? liveIds : []).map(String));
  const keep = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(id => !live.size || live.has(id));
  try { store?.setItem?.(DISMISSED_KEY, JSON.stringify(keep)); } catch { /* a private window is not a failure */ }
  return keep;
};
