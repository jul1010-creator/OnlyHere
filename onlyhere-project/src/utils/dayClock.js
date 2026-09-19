// ── A DAY THAT CANNOT BE WALKED ─────────────────────────────────────
//
// Oliver's own guide, tbfeb7jemku, South Jutland by car, day 2, read on
// 19 Sep 2026:
//
//   10:30  Møgeltønder            1 to 1.5 hours
//          8 mins on foot
//   12:00  Schackenborg Slotskro  1 to 1.5 hours
//          1 hour 20 mins by car
//   14:00  Esbjerg Street Food
//
// Leave Møgeltønder at the late end and you are at the inn at 12:08, eight
// minutes after the card says you arrived. Leave the inn at the late end and
// you reach Esbjerg at 14:50, fifty minutes after the card says you are there.
// The guide names the leg that breaks it in its own header: "Longest single
// journey: 1 hour 20 mins, Schackenborg Slotskro to Esbjerg Street Food."
//
// A ChatGPT critique of the same guide, which Oliver sent with it, put this
// third from last in a list of fifteen and framed it as a writing problem:
// "If those times are merely suggested pacing, label them as suggested." It is
// not a writing problem. The times are a claim the pipeline can check against
// its own measurements, and the measurements were already in the payload.
//
// ── WHY THIS IS THE MODEL'S FAILURE AND NOT THE MODEL'S JOB ─────────
//
// The planner is asked for an "arrivalTime" per stop and a "suggestedStay", in
// one pass, before any leg has been measured. It is guessing a timetable for a
// route whose distances it does not have. Asking it to do arithmetic it has no
// inputs for is how you get 14:00. The legs are fetched afterwards, and by then
// the answer is a subtraction.
//
// ── IT MOVES THE CLOCK, IT DOES NOT MOVE THE DAY ────────────────────
//
// The only thing this file changes is a stated time that the stop before it
// cannot reach, and it changes it to the earliest time that IS reachable. It
// never reorders stops, never drops one, never shortens a visit and never
// invents a leg it was not given. A day that then finishes late is reported
// rather than rearranged, because which stop to lose is a judgement and this is
// arithmetic.
//
// THE LATE END OF EVERY RANGE. "1 to 1.5 hours" is planned as 1.5, because a
// schedule that only works if every visit is cut short is a schedule that does
// not work. That is the same reading the critique asks for elsewhere and it is
// the honest one: the traveller is the one standing in the car park.

// ── READING A CLOCK TIME THE PLANNER WROTE ──────────────────────────
//
// It is asked for "suggested clock time, e.g. '9:00' or '~9:00'", so both
// shapes turn up, and so do "09:00", "9.00" and the odd "9 am". Anything this
// cannot read returns null and the stop is left exactly as it is: a time
// nothing can parse is not a time this file may rewrite.
const CLOCK = /^\s*[~≈about ]*?(\d{1,2})\s*[:.]\s*(\d{2})\s*(am|pm)?\s*$/i;
const BARE_HOUR = /^\s*[~≈about ]*?(\d{1,2})\s*(am|pm)\s*$/i;

export const readClock = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const m = CLOCK.exec(raw) || BARE_HOUR.exec(raw);
  if (!m) return null;
  let h = Number(m[1]);
  const mins = m[2] && /^\d{2}$/.test(m[2]) ? Number(m[2]) : 0;
  const ampm = String(m[3] || m[2] || "").toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (!Number.isFinite(h) || h > 23 || mins > 59) return null;
  return h * 60 + mins;
};

// Back to what the card shows. Twenty four hour, zero padded, because that is
// what every time already in these guides looks like and a day that suddenly
// mixed "9:00" with "2:50 pm" would read as two different systems.
export const showClock = (minutes) => {
  const n = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(n / 60) % 24, m = n % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// ── AND HOW LONG THEY ARE THERE ─────────────────────────────────────
//
// "1-1.5 hours", "30 min", "45 min-1 hour", "2-3 hours". The planner is told to
// vary it, so the vocabulary is small but the shapes are not. Returns the LATE
// end, for the reason in the header, and null when nothing can be read, which
// leaves the stop's own time alone.
const HOURS = /(\d+(?:[.,]\d+)?)\s*(?:-|–|to)?\s*(\d+(?:[.,]\d+)?)?\s*(?:hours?|hrs?|timer?)/i;
const MINUTES = /(\d+)\s*(?:-|–|to)?\s*(\d+)?\s*(?:min(?:ute)?s?)/i;
const num = (v) => (v == null ? null : Number(String(v).replace(",", ".")));

export const readStay = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  // ── THE HOUR PATTERN FIRST, ALWAYS ──────────────────────────────
  // "45 min-1 hour" carries both units and its late end is the HOUR. Trying
  // minutes first on a string like that returns forty five, and the stop is
  // then planned at the short end of a range it was given the long end of.
  const h = HOURS.exec(raw);
  const m = MINUTES.exec(raw);
  if (h) {
    const late = num(h[2]) ?? num(h[1]);
    if (Number.isFinite(late)) return Math.round(late * 60);
  }
  if (m) {
    const late = num(m[2]) ?? num(m[1]);
    if (Number.isFinite(late)) return Math.round(late);
  }
  return null;
};

// The leg between two stops, off the same measurements the header reads. One
// lookup, exported, because GuidePage does this by hand and two readers of
// "how long is this leg" is how the summary and the schedule come to disagree.
export const legMinutes = (from, to, durations) => {
  const table = durations && typeof durations === "object" ? durations : {};
  const hit = Object.keys(table).find(k => k.startsWith(`${from}|${to}|`));
  const mins = hit ? table[hit]?.durationMinutes : null;
  // ── null IS NOT ZERO ──────────────────────────────────────────────
  // `Number(null)` is 0 and `Number.isFinite(0)` is true, so the first version
  // of this line turned every unmeasured leg into an instant one. That is the
  // exact failure the walk's own comment warns about, manufactured by its own
  // lookup: a day with no measurements would have come back with every stop
  // reachable and nothing to report. Caught by the assertion for a pair nothing
  // measured.
  if (mins === null || mins === undefined || mins === "") return null;
  return Number.isFinite(Number(mins)) ? Number(mins) : null;
};

// ── THE WALK ITSELF ─────────────────────────────────────────────────
//
// Carries the clock forward through one day and reports, per stop, the time it
// says and the earliest time the stop before it allows. `late` is the only
// finding: a stop whose stated time is earlier than it can be reached.
//
// AN UNMEASURED LEG BREAKS THE CHAIN RATHER THAN BEING GUESSED AT ZERO. A leg
// with no duration means the next stop's time cannot be checked, so the walk
// restarts from that stop's own stated time. Treating a missing leg as instant
// would manufacture findings on exactly the days the app knows least about.
export const walkDay = (stops, durations) => {
  const list = Array.isArray(stops) ? stops : [];
  const out = [];
  // The earliest the traveller can be at THIS stop, carried from the one
  // before. Null at the first stop and after any leg the app did not measure.
  let earliest = null;
  for (let i = 0; i < list.length; i++) {
    const s = list[i] || {};
    const stated = readClock(s.arrivalTime);
    // Where they are, which is their own time unless they cannot be there yet.
    const at = stated == null ? earliest : (earliest == null ? stated : Math.max(stated, earliest));
    const late = stated != null && earliest != null && earliest > stated;
    out.push({
      name: s.name || "",
      stated,
      earliest,
      at,
      late,
      shortBy: late ? earliest - stated : 0,
    });
    const stay = readStay(s.suggestedStay);
    const leg = i + 1 < list.length ? legMinutes(s.name, list[i + 1]?.name, durations) : null;
    earliest = at != null && stay != null && leg != null ? at + stay + leg : null;
  }
  return out;
};

// ── AND THE CORRECTION ───────────────────────────────────────────────
//
// The same walk, writing the reachable time back onto the stop. Returns a new
// array and never mutates the one it was given, because the caller hands this
// the parsed payload and a mutation there would be a change nothing announced.
//
// A stop whose time was already reachable is returned untouched, object
// identity and all, so a day with nothing wrong in it is the same day.
export const fixDay = (stops, durations) => {
  const rows = walkDay(stops, durations);
  const list = Array.isArray(stops) ? stops : [];
  const moved = [];
  const out = list.map((s, i) => {
    const row = rows[i];
    if (!row || !row.late) return s;
    moved.push({ name: row.name, was: showClock(row.stated), now: showClock(row.at), by: row.shortBy });
    return { ...s, arrivalTime: showClock(row.at) };
  });
  return { stops: out, moved };
};

// Every day of a guide, and what had to move. `days` is the planner's own
// array, each with a `stops`, which is the shape App.jsx holds at the moment
// the durations come back.
export const fixClock = (days, durations) => {
  const list = Array.isArray(days) ? days : [];
  const moved = [];
  const out = list.map((d, i) => {
    const fixed = fixDay(d?.stops, durations);
    fixed.moved.forEach(m => moved.push({ ...m, day: i + 1 }));
    return fixed.moved.length ? { ...d, stops: fixed.stops } : d;
  });
  return { days: moved.length ? out : list, moved };
};

// ── WHAT HE IS TOLD ABOUT IT ────────────────────────────────────────
//
// One line per stop that moved, in planProblems' voice: a measurement of this
// run disagreeing with this run's own prose, which is the only kind of problem
// this app can be certain about. Named rather than counted, because "3 times
// moved" is not something anybody can check and a stop with a time beside it
// is.
export const clockNote = (moved) => {
  const rows = Array.isArray(moved) ? moved.filter(m => m && m.name) : [];
  if (!rows.length) return "";
  return `The day's own legs do not allow ${rows.length === 1 ? "one of its times" : "some of its times"}, so ${rows.length === 1 ? "it was" : "they were"} moved to the earliest the stop before allows: `
    + rows.map(m => `day ${m.day}, ${m.name} ${m.was} to ${m.now}`).join("; ")
    + ". Planned at the long end of every stay, because a schedule that only works if every visit is cut short does not work.";
};

// ── AND A DAY THAT NOW FINISHES TOO LATE ────────────────────────────
//
// Moving a time forward can push the end of a day past the point where the last
// stop is worth having. That is not arithmetic any more, it is a judgement
// about which stop to lose, so it is reported and nothing is rearranged.
//
// 18:00 as the hour a day's last arrival stops being reasonable: a Danish
// attraction that closes at 17:00 is the common case, and a stop begun after
// six is an evening rather than a visit. Only ever a note.
export const LATE_DAY_HOUR = 18;
export const lateDays = (days, durations) => {
  const list = Array.isArray(days) ? days : [];
  const out = [];
  list.forEach((d, i) => {
    const rows = walkDay(d?.stops, durations);
    const last = rows[rows.length - 1];
    if (last && Number.isFinite(last.at) && last.at >= LATE_DAY_HOUR * 60) {
      out.push({ day: i + 1, name: last.name, at: showClock(last.at) });
    }
  });
  return out;
};

export const lateDayNote = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return "";
  return `After the times were corrected, ${list.length === 1 ? "a day reaches" : "some days reach"} its last stop late: `
    + list.map(r => `day ${r.day}, ${r.name} at ${r.at}`).join("; ")
    + ". The stops are unchanged, because which one to drop is a decision rather than a measurement.";
};
