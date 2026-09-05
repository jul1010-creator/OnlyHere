// ── THE ENTRY DISAGREEING WITH ITS OWN DATE FIELD ───────────────────
//
// Two rows published on the afternoon of 5 Sep 2026, both from the same
// drafting run, both wrong in a way nothing checked:
//
//   Bork Vikingemarked, id 234.  date 2026-03-23 to 2026-04-23.
//   Its own description opens "Every August, more than 300 Vikings set up camp
//   at Bork Vikingehavn." The entry states the month and the date field is five
//   months away from it.
//
//   Køge Festuge, id 231.  date 2026-07-25 to 2026-07-26.
//   Its own description calls it "Køge's week-long summer festival". Two days.
//
// Every other date rule in this project asks whether a date is PLAUSIBLE: has it
// passed, is the end before the start, is it the next edition. All of those pass
// on both rows. Nothing has ever asked the cheapest question available, which is
// whether the entry agrees with itself.
//
// ── AND IT IS THE ONE CHECK THAT NEEDS NOTHING ──────────────────────
//
// No search, no model, no page read. The claim and the contradiction are both
// already inside the row, written by the same pass, and comparing them is string
// work. sweeps.js's second rule: the cheapest resolver that can answer, answers.
//
// ── WHY IT IS NARROW ON PURPOSE ─────────────────────────────────────
//
// The obvious version reads every month named anywhere and flags any date not
// among them. That fires on "the harbour was built in March 1878" and on "book
// in January for the summer season", and a check that cries wolf on a correct
// entry is worse than no check: it teaches the reader to click past it. See
// glanceExtract's note on false caveats.
//
// So a month only counts when the sentence says the EVENT happens then, and a
// span only counts when the entry states how long the EVENT runs.
import { parseEventDate } from "./eventDates";

const MONTHS = [
  ["january", "januar"], ["february", "februar"], ["march", "marts"], ["april", "april"],
  ["may", "maj"], ["june", "juni"], ["july", "juli"], ["august", "august"],
  ["september", "september"], ["october", "oktober"], ["november", "november"], ["december", "december"],
];
export const MONTH_NAMES = MONTHS.map(m => m[0]);

// ── WHEN A MONTH IS A CLAIM ABOUT THE EVENT ─────────────────────────
//
// It has to be introduced by a word that puts the event IN it: every, each, in,
// during, held, runs, takes place, or the Danish equivalents. "Every August" is
// a claim. "August 1878" is history, which is why a four-digit year immediately
// after disqualifies it.
const LEAD = "(?:every|each|in|during|through|held(?:\\s+\\w+){0,2}|runs?(?:\\s+\\w+){0,2}|takes?\\s+place(?:\\s+\\w+){0,2}|returns?(?:\\s+\\w+){0,2}|hvert\\s+år\\s+i|hver|i|afholdes\\s+i|finder\\s+sted\\s+i)";

// ── AND A MONTH LIST IS ONE CLAIM, NOT ONE CLAIM AND SOME NOISE ─────
//
// The first version tested each month separately for a lead word in front of
// it, so "Held in July or August depending on the tides" registered July alone
// and then reported a correct August date as a contradiction. A check that
// cries wolf on a right entry is worse than no check, and that is the exact
// failure this file's own opening paragraph promises not to make. Caught by
// running it over an invented disjunction before it shipped.
//
// So the lead introduces a LIST: one month, then any number of months joined by
// or, and, to, through, a comma or a dash, in either language.
const MONTH_ALT = `(?:${[...new Set(MONTHS.flat())].join("|")})`;
const JOIN = "(?:\\s*(?:,|or|and|to|through|til|og|eller|[\\u2013-])\\s*)";

export const statedMonths = (text) => {
  const s = String(text ?? "");
  const found = new Set();
  // The year guard sits after the WHOLE list, so "in August 1878" is history and
  // "in July or August" is a claim.
  const re = new RegExp(`\\b${LEAD}\\s+(${MONTH_ALT}(?:${JOIN}${MONTH_ALT})*)\\b(?!\\s+\\d{4})`, "gi");
  let m;
  while ((m = re.exec(s)) !== null) {
    const inner = new RegExp(MONTH_ALT, "gi");
    let w;
    while ((w = inner.exec(m[1])) !== null) {
      const name = w[0].toLowerCase();
      const i = MONTHS.findIndex(([en, da]) => en === name || da === name);
      if (i >= 0) found.add(i);
    }
  }
  return [...found].sort((a, b) => a - b);
};

// ── AND HOW LONG THE ENTRY SAYS IT RUNS ─────────────────────────────
//
// A range rather than a number, because "a weekend" is two days or three
// depending on whether the Friday counts, and flagging a correct entry over one
// day is exactly the noise this file is trying not to make. Only a claim that
// cannot be stretched to fit is reported.
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7 };
export const statedSpan = (text) => {
  const s = String(text ?? "").toLowerCase();
  if (/\bweek[- ]?long\b|\ba full week\b|\ben hel uge\b|\buge[- ]?lang/.test(s)) return { min: 5, max: 9, said: "a week" };
  if (/\btwo[- ]week|\bfortnight\b/.test(s)) return { min: 12, max: 16, said: "two weeks" };
  const n = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|to|tre|fire|fem|seks|syv|\d{1,2})[- ](?:day|days|dage|dags)\b/);
  if (n) { const v = WORD_NUM[n[1]] ?? Number(n[1]); if (v >= 1 && v <= 31) return { min: v, max: v, said: `${v} day${v === 1 ? "" : "s"}` }; }
  // A weekend last, because "a three-day weekend" should be read as three days
  // by the rule above rather than as a weekend by this one.
  if (/\bweekend\b/.test(s)) return { min: 2, max: 3, said: "a weekend" };
  return null;
};

// NOT exported, and not a second copy either. utils/tripEvents.js already
// exports a daysBetween with exactly this behaviour, and two exports of one
// name is a build error the suite caught the moment this file was registered.
// Both are built on calendarDay's dayStart, which is the one reader that
// matters; this stays local because it is an implementation detail of the span
// rule and nothing outside this file should be counting days from here.
const daysBetween = (start, end) => {
  const a = parseEventDate(start), b = parseEventDate(end || start);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000) + 1;   // inclusive: one day is 1, not 0
};

const monthWord = (i) => MONTH_NAMES[i] ? MONTH_NAMES[i][0].toUpperCase() + MONTH_NAMES[i].slice(1) : "";

// ── THE FINDINGS ────────────────────────────────────────────────────
//
// Shaped for auditEntry, which means {severity, field, detail}. HIGH rather than
// critical: the entry is definitely inconsistent and it is not certain WHICH
// half is wrong, so the detail says both and asks rather than asserting.
export const dateClaimProblems = (payload) => {
  const p = payload || {};
  const out = [];
  const start = String(p.date ?? p.dateStart ?? "").trim();
  const d = parseEventDate(start);
  if (!d) return out;
  const text = [p.desc, p.gemlyxFind, p.ticketInfo, p.camping, p.accommodationTip,
    ...(Array.isArray(p.blogBody) ? p.blogBody.map(b => (typeof b?.content === "string" ? b.content : "")) : [])]
    .filter(Boolean).join("  ");
  if (!text.trim()) return out;

  const months = statedMonths(text);
  if (months.length && !months.includes(d.getMonth())) {
    out.push({
      severity: "high", field: "date",
      detail: `The entry says this happens in ${months.map(monthWord).join(" or ")}, and the date field says ${monthWord(d.getMonth())} (${start}). One of the two is wrong. The prose is usually the researched half and the date the guessed one, so check the operator's own page before trusting the field.`,
    });
  }

  const span = statedSpan(text);
  const ran = daysBetween(start, String(p.dateEnd ?? "").trim());
  if (span && ran != null && (ran < span.min || ran > span.max)) {
    out.push({
      severity: "high", field: "dateEnd",
      detail: `The entry calls this ${span.said} and the dates cover ${ran} day${ran === 1 ? "" : "s"} (${start}${p.dateEnd && p.dateEnd !== start ? ` to ${p.dateEnd}` : ""}). Either the range is wrong or the description is.`,
    });
  }
  return out;
};
