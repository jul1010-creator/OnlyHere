// ── WHAT TIME IT IS THERE, AND WHETHER IT IS DARK ───────────────────
//
// Oliver, 27 Sep 2026, looking at the front page at 20:18: "Put time in
// Denmark on front page and the weather need a 'night' demonstration.." The
// Copenhagen card showed a sun an hour and a half after sunset, because the
// icon read "clearsky" and threw away the "_night" that MET Norway puts on it.
//
// The time is Denmark's, whatever the reader's own clock says: somebody
// planning from Sydney wants to know it is evening there, not here.
export const DK_ZONE = "Europe/Copenhagen";

export const denmarkClock = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: DK_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
};

// ── DARK, FROM THE SUN AND NOT FROM A GUESS AT THE HOUR ─────────────
//
// MET marks clear, fair and partly cloudy skies with _day or _night. Cloud,
// rain, fog and snow carry no suffix, so a card showing "cloudy" at 22:00 has
// nothing in its code to say it is night. The sun's height answers that for
// every card the same way: the standard solar position arithmetic (NOAA's
// simplified form), dark once the sun is below the horizon allowance of
// -0.833 degrees, which is what an almanac calls sunset.
const RAD = Math.PI / 180;
export const sunElevation = (lat, lon, date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(d.getTime()) || !Number.isFinite(la) || !Number.isFinite(lo)) return null;
  const days = d.getTime() / 86400000 + 2440587.5 - 2451545.0;   // days since J2000
  const meanLon = (280.46 + 0.9856474 * days) % 360;
  const meanAnom = ((357.528 + 0.9856003 * days) % 360) * RAD;
  const eclLon = (meanLon + 1.915 * Math.sin(meanAnom) + 0.02 * Math.sin(2 * meanAnom)) * RAD;
  const obliq = (23.439 - 0.0000004 * days) * RAD;
  const ra = Math.atan2(Math.cos(obliq) * Math.sin(eclLon), Math.cos(eclLon));
  const dec = Math.asin(Math.sin(obliq) * Math.sin(eclLon));
  const gmst = (18.697374558 + 24.06570982441908 * days) % 24;
  const hourAngle = ((gmst * 15 + lo) * RAD) - ra;
  const elev = Math.asin(Math.sin(la * RAD) * Math.sin(dec) + Math.cos(la * RAD) * Math.cos(dec) * Math.cos(hourAngle));
  return elev / RAD;
};
export const SUNSET_ELEVATION = -0.833;

// The code's own word wins when it has one; the sun decides when it does not.
export const isNightThere = ({ condition = "", lat = null, lon = null, date = new Date() } = {}) => {
  const c = String(condition || "");
  if (/_night\b/.test(c)) return true;
  if (/_day\b/.test(c) || /_polartwilight\b/.test(c)) return false;
  const e = sunElevation(lat, lon, date);
  return e != null && e < SUNSET_ELEVATION;
};
