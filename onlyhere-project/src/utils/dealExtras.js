// ── WHAT A DEAL NEEDS WHEN SOMEBODY HAS FOUR HOURS ──────────────────
//
// Oliver, 1 Oct 2026, on the Klaipėda pilot: "I do think we should pay well
// attention to making it convinient. That shall be the main feature.
// Remember, these are people stepping off a cruise."
//
// Two things a place can carry next to its deal, each set in Studio:
//
//   __booking  where to book a table: the restaurant's own page, or a phone
//              number. Gemlyx takes no booking itself (terms clause 4.3).
//   __busy     how busy the place usually is, hour by hour, from BestTime,
//              fetched in Studio about once a month (api/busyness.js).
//
// Pure, so the suite can drive all of it.

// ── NO DEAL CODE ────────────────────────────────────────────────────
// There was a dealCode here: a short "GX-XXXX" worked out from the place,
// shown under every deal for the guest to say at the counter. Oliver, 5 Oct
// 2026: "I think the 'code' is stupid.. nobody will agree to that at start..
// too complicated." So a deal is the offer and nothing to show or check: the
// guest asks for it, the way they would ask for a lunch special.

// ── WHERE TO BOOK ───────────────────────────────────────────────────
// A web address (https only, as typed or with the scheme added) or a phone
// number. Anything else is refused rather than guessed at, because a broken
// button on a phone outside a restaurant is worse than no button.
export const cleanBooking = (raw) => {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  const digits = v.replace(/[\s().-]/g, "");
  if (/^\+?\d{6,15}$/.test(digits)) return { kind: "phone", href: `tel:${digits}`, value: v };
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!/\.[a-z]{2,}$/i.test(u.hostname)) return null;
    return { kind: "web", href: u.href.replace(/^http:/i, "https:"), value: v };
  } catch {
    return null;
  }
};

export const bookingProblem = (raw) => {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  return cleanBooking(v) ? "" : `"${v}" is neither a web address nor a phone number, so no Book a table button would work. Paste the restaurant's booking page, or a number such as +370 600 00000.`;
};

// ── HOW BUSY IT USUALLY IS ──────────────────────────────────────────
//
// Stored as { fetchedAt, week } where week has seven arrays, indexed the way
// Date#getDay counts (0 is Sunday), of 24 values from 0 to 100, indexed by the
// hour on the clock (0 is midnight). BestTime sends its days from Monday and
// its hours from 6 in the morning; busyFromBestTime turns that around once, on
// the way in, so nothing else has to know.
export const busyFromBestTime = (json, now = new Date()) => {
  if (!json || json.status !== "OK" || !Array.isArray(json.analysis)) return null;
  const week = Array.from({ length: 7 }, () => Array(24).fill(0));
  let any = false;
  for (const day of json.analysis) {
    const di = Number(day?.day_info?.day_int);
    const raw = Array.isArray(day?.day_raw) ? day.day_raw : null;
    if (!Number.isInteger(di) || di < 0 || di > 6 || !raw || raw.length !== 24) continue;
    // Monday 0 → getDay 1 ... Sunday 6 → getDay 0.
    const js = (di + 1) % 7;
    raw.forEach((v, i) => {
      // Index 0 is 06:00. Hours after midnight belong to the next calendar
      // day, which is where a reader standing there at 01:00 would look.
      const hour = (6 + i) % 24;
      const dayIdx = i >= 18 ? (js + 1) % 7 : js;
      const n = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
      week[dayIdx][hour] = n;
      if (n > 0) any = true;
    });
  }
  if (!any) return null;
  return { fetchedAt: now.toISOString().slice(0, 10), week, venue: String(json?.venue_info?.venue_name || "") };
};

export const cleanBusy = (raw) => {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.week) || raw.week.length !== 7) return null;
  if (!raw.week.every(d => Array.isArray(d) && d.length === 24 && d.every(v => Number.isFinite(Number(v))))) return null;
  return raw;
};

// The hour and weekday where the place is, which for Klaipėda is an hour ahead
// of Denmark. A reader in Copenhagen planning tomorrow still gets Klaipėda's.
export const localClock = (date = new Date(), timeZone = "Europe/Vilnius") => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const wd = parts.find(p => p.type === "weekday")?.value;
    const hour = Number(parts.find(p => p.type === "hour")?.value);
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
    if (day >= 0 && Number.isFinite(hour)) return { day, hour };
  } catch { /* fall through */ }
  return { day: date.getDay(), hour: date.getHours() };
};

// "quiet" under 35, "some" up to 65, "busy" above. A 0 is a closed hour or no
// data, and says nothing rather than "quiet", because quiet at a locked door
// is not a reason to walk there. quieterAt is the next hour today, within four
// hours, that drops to quiet, so a busy answer comes with somewhere to go.
export const busyAt = (busy, date = new Date(), timeZone = "Europe/Vilnius") => {
  const b = cleanBusy(busy);
  if (!b) return null;
  const { day, hour } = localClock(date, timeZone);
  const v = Number(b.week[day][hour]) || 0;
  if (v <= 0) return null;
  const level = v < 35 ? "quiet" : v <= 65 ? "some" : "busy";
  let quieterAt = null;
  if (level !== "quiet") {
    for (let h = hour + 1; h <= Math.min(23, hour + 4); h++) {
      const n = Number(b.week[day][h]) || 0;
      if (n > 0 && n < 35) { quieterAt = `${String(h).padStart(2, "0")}:00`; break; }
    }
  }
  return { level, value: v, quieterAt };
};
