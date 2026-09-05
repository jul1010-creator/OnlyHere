// ── THE WEATHER NOTICE THAT WOULD NOT GO AWAY ───────────────────────
//
// Oliver, 5 Sep 2026, with a screenshot of the corner of his own front page:
// "this tip in the right corner keeps popping up. And 'clearer than before'..
// be more specific. And Let it be a notification like this" (a bell with a
// count on it).
//
// Three complaints and three different faults, which is why this file exists
// rather than the render being nudged.
//
//   IT KEEPS COMING BACK. Dismissing it did `setWeatherAlerts(prev => filter)`,
//   and nothing else. That is a variable in a component, so the next mount
//   re-ran the check, re-fetched the forecast and pushed the identical card
//   back. He was not dismissing a notice, he was hiding it until the next
//   render, forever.
//
//   IT SAID NOTHING. "Day 1 now looks clearer than before" is the shape of a
//   fact without being one. The slot it was built from carries the temperature,
//   the millimetres of rain and the wind speed, and the card threw all three
//   away to write a comparative adjective.
//
//   IT TOOK THE CORNER. A card 300px wide, over the page, for something that is
//   by definition not urgent: it is about a day that has not happened yet, on a
//   trip that is not today.
//
// The pure parts live here so the suite can drive them, and the storage pair is
// the same shape runLog.js uses for the same reason.

// ── WHAT COUNTS AS THE SAME NOTICE ──────────────────────────────────
//
// The risk is IN the key, deliberately. Dismissing "day 3 turned to rain" must
// not silence "day 3 turned back to dry" three days later: that is a different
// fact about the same day and it is the one a traveller would want. Keying on
// the guide and the day alone would have traded a notice that never leaves for
// one that never returns, which is the same bug pointing the other way.
export const alertKey = (guideId, dayIndex, newRisk) =>
  `${String(guideId ?? "")}-${Number(dayIndex) || 0}-${String(newRisk ?? "")}`;

export const SEEN_KEY = "gemlyx_weather_seen";
// Bounded, because this grows by one per weather change per saved guide and
// nothing ever removes an entry. Oldest out first: a notice from a trip that
// has been and gone cannot fire again anyway.
export const MAX_SEEN = 200;

export const usableSeen = (raw) => {
  let parsed = null;
  try { parsed = JSON.parse(String(raw ?? "") || "[]"); } catch { return []; }
  return Array.isArray(parsed) ? parsed.filter(k => typeof k === "string" && k) : [];
};

export const seenAlerts = () => {
  try { return usableSeen(localStorage.getItem(SEEN_KEY)); }
  catch { return []; }
};

export const markAlertSeen = (key) => {
  if (!key) return false;
  try {
    const next = [...seenAlerts().filter(k => k !== key), key].slice(-MAX_SEEN);
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    return true;
  } catch { return false; }
};

// Pure, so the filter can be asserted without a browser.
export const unseenAlerts = (alerts, seen) => {
  const done = new Set(Array.isArray(seen) ? seen : []);
  return (Array.isArray(alerts) ? alerts : []).filter(a => a && !done.has(a.id));
};

// ── AND WHAT IT ACTUALLY SAYS ───────────────────────────────────────
//
// The numbers the old sentence threw away. Every one of them is already on the
// forecast slot the alert was built from: temperature_c, precipitation_mm and
// wind_speed_ms.
//
// "when the guide was built" rather than "than before", because that IS what
// the comparison is against: day.weather.risk is what was stored at build time,
// and naming it tells a reader why the app has an opinion about their Tuesday.
const round1 = (n) => (Math.round(n * 10) / 10);
const DRY_MM = 0.2;

export const describeWeatherChange = ({ dayLabel = "That day", oldRisk = "", newRisk = "", slot = null } = {}) => {
  const t = Number.isFinite(slot?.temperature_c) ? `${Math.round(slot.temperature_c)}°` : "";
  const mm = Number.isFinite(slot?.precipitation_mm) ? Math.max(0, slot.precipitation_mm) : null;
  const wind = Number.isFinite(slot?.wind_speed_ms) ? `${Math.round(slot.wind_speed_ms)} m/s wind` : "";
  const wet = newRisk === "high";
  // A figure when there is one, the word when there is not. "0 mm of rain" is
  // a worse sentence than "dry" and "rain" is a worse one than "6 mm of rain".
  const head = wet
    ? (mm !== null && mm > DRY_MM ? `${round1(mm)} mm of rain` : "rain")
    : (mm !== null && mm > DRY_MM ? `${round1(mm)} mm` : "dry");
  const now = [head, t, wind].filter(Boolean).join(", ");
  const was = oldRisk === "high" ? "rain" : oldRisk === "low" ? "cloud" : "dry";
  return `${dayLabel}: ${now}. It was ${was} when the guide was built.`;
};

// ── READ IS NOT DISMISSED ───────────────────────────────────────────
//
// Oliver, 5 Sep 2026, looking at the deployed bell: "when clicking
// notifications, the '3' should go away. There should be a clear indicator of a
// new update."
//
// He is describing two states that the first version collapsed into one. SEEN
// above means DISMISSED: the traveller pressed the cross, the notice is gone for
// good, and it is stored so a remount cannot rebuild it. READ is much lighter
// and it is what a badge counts: they opened the bell and looked at the list.
//
// Collapsing them meant the badge could only go down by dismissing every notice
// one at a time, so a bell with three unread and three read looked identical to
// a bell with three unread. A count that never falls is a count nobody reads.
export const READ_KEY = "gemlyx_weather_read";

export const readAlerts = () => {
  try { return usableSeen(localStorage.getItem(READ_KEY)); }
  catch { return []; }
};

// Bounded the same way and for the same reason as the seen list.
export const markAlertsRead = (ids) => {
  const add = (Array.isArray(ids) ? ids : []).filter(k => typeof k === "string" && k);
  if (!add.length) return false;
  try {
    const next = [...readAlerts().filter(k => !add.includes(k)), ...add].slice(-MAX_SEEN);
    localStorage.setItem(READ_KEY, JSON.stringify(next));
    return true;
  } catch { return false; }
};

// Pure, so the badge can be asserted without a browser.
export const unreadAlerts = (alerts, read) => {
  const done = new Set(Array.isArray(read) ? read : []);
  return (Array.isArray(alerts) ? alerts : []).filter(a => a && !done.has(a.id));
};

// ── AND SAYING WHAT THE NOTICE IS ABOUT ─────────────────────────────
//
// Oliver, same message, reading his own bell: "I also sent a picture here, is
// this an ungoing trip I got going or?"
//
// He could not tell what he was being told. The card named a guide and gave
// three numbers, and nothing on it said WHY he was seeing it. He is the person
// who built the feature, so a traveller had no chance.
//
// It fires for a saved guide whose first day falls inside the eight-day forecast
// window, which is a specific and explicable thing, and now the card says it.
export const tripLine = (startsInDays, dayLabel = "") => {
  const n = Number(startsInDays);
  const when = !Number.isFinite(n) ? ""
    : n <= 0 ? "Starts today"
    : n === 1 ? "Starts tomorrow"
    : `Starts in ${n} days`;
  return [when, dayLabel].filter(Boolean).join(" · ");
};

// The label above the title, so the card says what KIND of thing it is before it
// says which one.
export const SAVED_TRIP_LABEL = "SAVED TRIP";

// The bell's own line, which is all it says while it is closed.
export const alertCountLine = (n) =>
  n === 1 ? "1 weather change on a saved trip" : `${n} weather changes on saved trips`;
