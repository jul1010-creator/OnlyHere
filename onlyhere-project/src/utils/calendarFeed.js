// ── "I NEED TO PUT THEM INTO THE COMMUNITY LINK, BUT I CAN'T" ───────
//
// Oliver, 19 Sep 2026, with two island calendars open:
//
//   oenendelave.dk/arrangementer  an embedded public Google Calendar. The
//                                 entries have no page on the site at all;
//                                 clicking one goes to google.com.
//   sejero.dk/arrangementer       a WordPress list plugin. Each entry does have
//                                 its own page.
//
//   "show a lot of different events on this calender. However, I can't put that
//    into the community events.. because it's not events, but just a calender."
//   "Primitive calenders"
//
// Studio drafts ONE subject at a time from a name: you type "Tønder Festival",
// it researches that festival, you publish it. A calendar is a list of thirty
// things with four fields each and no page per entry, so there is nothing to
// type into that box. That is the whole of what he cannot do.
//
// ── AND A CALENDAR IS NOT LESS THAN AN EVENT ────────────────────────
//
// It is exactly what the community tier is allowed to use. That tier already
// forbids the writer from pricing a row, promising it, or building a day around
// it: all it may do is say that something is on in this village on the day the
// plan stands there. For that, a title, a date and a place is the whole
// requirement, and a calendar has all three. Promoting these to published
// events is the thing not to do, and he had already decided that.
//
// So nothing downstream changes. This file turns a feed into rows of the shape
// data/events.js already holds, and communityOnDay reads them without knowing
// where they came from.
import { fold } from "./danishNames";

// ── THE ONE FACT A CALENDAR CANNOT BE TRUSTED FOR ───────────────────
//
// Endelave's entries give their venue as "Vesterby 1, 8789 Horsens". Horsens is
// the POSTAL town. It is on the mainland, across a ferry, and an hour away from
// the village hall the entry is about. communityOnDay matches a row against the
// towns a day stands in, so a row filed under Horsens would offer an Endelave
// harbour night to somebody standing in Horsens and would never once reach
// anybody on Endelave.
//
// So the place is NOT read off the row. It is given once for the whole feed,
// because that is the one thing a person knows and a postcode does not: which
// island this calendar belongs to. Every row takes it, unconditionally. The
// address is kept as a venue, which is where in the village to go, and is never
// allowed to decide which village.
export const placeFor = (feedPlace) => String(feedPlace || "").trim();

// ── UNFOLDING, WHICH ICS REQUIRES BEFORE ANYTHING ELSE ──────────────
//
// RFC 5545 wraps any line past 75 octets and continues it on the next line
// beginning with a space or a tab. A parser that reads lines as written gets a
// SUMMARY cut in half and a second line it cannot identify, and Google wraps
// almost every real description. This has to happen first or nothing after it
// is reading whole values.
export const unfold = (text) => String(text || "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");

// The escapes an ics value carries. Backslash last, or an escaped backslash
// before an n would be turned into a newline by the line above it.
const unescapeIcs = (v) => String(v || "")
  .replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\\\/g, "\\");

// ── A DATE, WHICHEVER OF THE THREE SHAPES IT IS IN ──────────────────
//
// DTSTART;VALUE=DATE:20260905          an all day event
// DTSTART;TZID=Europe/Copenhagen:20260905T190000
// DTSTART:20260905T170000Z
//
// Only the DATE is kept. A community row is matched against a day of the plan,
// and the time of day is a detail the writer may mention rather than something
// this file has to be right about across a timezone. Keeping the clock would
// mean carrying Europe/Copenhagen through a build that runs wherever the
// traveller is, for no gain at all.
export const icsDate = (value) => {
  const m = /(\d{4})(\d{2})(\d{2})/.exec(String(value || ""));
  if (!m) return "";
  const [, y, mo, d] = m;
  const mm = Number(mo), dd = Number(d);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  return `${y}-${mo}-${d}`;
};

// The time, when there is one, for the venue line. Empty for an all day event,
// which is what VALUE=DATE means and what most village entries are.
export const icsTime = (value) => {
  const m = /\d{8}T(\d{2})(\d{2})/.exec(String(value || ""));
  return m ? `${m[1]}:${m[2]}` : "";
};

// ── AND DTEND IS EXCLUSIVE ON AN ALL DAY EVENT ──────────────────────
//
// RFC 5545 again, and it is the mistake that would put every village fête on an
// extra day: a one day event on the 5th is written DTSTART;VALUE=DATE:20260905
// with DTEND;VALUE=DATE:20260906. Read as written, runsOn would answer yes on
// the 6th, and a guide would tell somebody to turn up the morning after it
// finished. A timed event's DTEND is the real end and is not moved.
const dayBefore = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// ── THE PARSE ───────────────────────────────────────────────────────
//
// VEVENT blocks only, and three of them are refused outright:
//
//   CANCELLED     STATUS:CANCELLED is the village saying it is off. A row
//                 published from it is the one failure this tier cannot afford,
//                 because somebody would go.
//   RECURRING     an RRULE is a rule, not a date. Expanding one correctly takes
//                 BYDAY, UNTIL, COUNT, EXDATE and a timezone, and an expansion
//                 that is slightly wrong claims something is on when it is not.
//                 They are counted and reported rather than guessed at.
//   UNDATED       nothing to test against a day of the plan, which is the only
//                 question this tier answers.
export const parseIcs = (text) => {
  const lines = unfold(text).split("\n");
  const out = [];
  const skipped = { cancelled: 0, recurring: 0, undated: 0 };
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { cur = { props: {} }; continue; }
    if (line === "END:VEVENT") {
      if (cur) {
        const p = cur.props;
        if (p.RRULE) skipped.recurring += 1;
        else if (/CANCELLED/i.test(p.STATUS || "")) skipped.cancelled += 1;
        else {
          const date = icsDate(p.DTSTART);
          if (!date) skipped.undated += 1;
          else {
            const allDay = /VALUE=DATE(?![-\w])/i.test(p.__DTSTART_PARAMS || "") || !/T\d{6}/.test(p.DTSTART || "");
            const rawEnd = icsDate(p.DTEND);
            const end = rawEnd && allDay && rawEnd > date ? dayBefore(rawEnd) : rawEnd;
            out.push({
              uid: unescapeIcs(p.UID || ""),
              name: unescapeIcs(p.SUMMARY || "").trim(),
              date,
              dateEnd: end && end !== date ? end : "",
              time: allDay ? "" : icsTime(p.DTSTART),
              venue: unescapeIcs(p.LOCATION || "").trim(),
              desc: unescapeIcs(p.DESCRIPTION || "").trim(),
            });
          }
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const at = line.indexOf(":");
    if (at < 1) continue;
    const head = line.slice(0, at);
    const value = line.slice(at + 1);
    const key = head.split(";")[0].toUpperCase();
    cur.props[key] = value;
    // The parameters, kept beside the value, because VALUE=DATE is what says an
    // event is all day and it lives in the parameter rather than the value.
    if (key === "DTSTART") cur.props.__DTSTART_PARAMS = head;
  }
  return { events: out.filter(e => e.name), skipped };
};

// ── AND THE TITLE IS THE WHOLE SENTENCE ─────────────────────────────
//
// Sejerø's, verbatim: "Fredag 25. september kl. 19.30, Halvvejs". The date, the
// time and the venue are all in the title AND all in their own fields. Used as
// a name, the guide would write "Halvvejs on Friday 25 September at 19:30 on
// 2026-09-25", which is the same fact three times and reads as a machine.
//
// So a leading date, a leading weekday and a leading clock time come off, in
// Danish and in English, and what is left is the name. If nothing is left, the
// original stands: a title that is only a date is a poor name and an empty one
// is not a name at all.
const DA_DAYS = "mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag";
const EN_DAYS = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";
const DA_MONTHS = "januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december";
const EN_MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";
const LEAD = new RegExp(
  "^\\s*(?:"
  + `(?:${DA_DAYS}|${EN_DAYS})\\b` + "|"
  + `\\d{1,2}\\.?\\s*(?:${DA_MONTHS}|${EN_MONTHS})\\b` + "|"
  + `(?:${DA_MONTHS}|${EN_MONTHS})\\s*\\d{1,2}\\b` + "|"
  + "(?:kl\\.?|at|den|d\\.)\\s*\\d{1,2}(?:[.:]\\d{2})?" + "|"
  + "\\d{1,2}[.:]\\d{2}"
  + ")[\\s,:;.\\-]*", "i");
// ── AND THE PREPOSITION THE TIME WAS ATTACHED TO ─────────────
//
// Sejerø's "kl. 20 på Minigolfen" loses its clock and is left starting with a
// dangling "på". The word belonged to the time rather than to the name, so it
// goes with it, and only ever at the very front of what is left.
// \b IS ASCII IN JAVASCRIPT, so there is no word boundary after the å in
// "på" and a \b here matched nothing at all. A space or the end of the string
// is what actually ends one of these words.
const LEAD_PREP = /^\s*(?:på|paa|i|ved|hos|omkring|at|in|on|by|the)(?=\s|$)[\s,:;.-]*/i;

export const cleanTitle = (title) => {
  let t = String(title || "").trim();
  // Repeatedly, because the real shape is three of these in a row. Bounded, so
  // a title that is nothing but dates cannot spin.
  for (let i = 0; i < 6; i++) {
    const next = t.replace(LEAD, "").trim();
    if (next === t) break;
    t = next;
  }
  // Only after a date actually came off. "I Kroens have" is a name that starts
  // with a preposition and must keep it; "kl. 20 på Minigolfen" is a time whose
  // preposition is left behind, and the difference is whether anything was
  // stripped at all.
  if (t !== String(title || "").trim()) t = t.replace(LEAD_PREP, "").trim();
  // Nothing left means the title WAS the date. Keep what the village wrote.
  return t || String(title || "").trim();
};

// ── WHAT A COMMUNITY ROW LOOKS LIKE ─────────────────────────────────
//
// Exactly the shape data/events.js already holds, so communityOnDay and
// communityBlock read these without knowing a calendar exists. `source` and
// `fetchedAt` are the two additions, and they are here because these rows are
// the only ones in Gemlyx that go stale: every other row is a PLACE, and a
// place is there next year. A harbour night is true for one evening.
export const MOST_PER_PLACE = 40;

export const communityRowsFrom = ({ events = [], place = "", source = "", today = new Date(), limit = MOST_PER_PLACE } = {}) => {
  const town = placeFor(place);
  if (!town) return [];
  const from = dayKeyOf(today);
  return (Array.isArray(events) ? events : [])
    .filter(e => e && e.name && e.date)
    // A row whose last day is behind us is dead weight: this tier exists only
    // for "the plan stands here on this day", and no plan stands in the past.
    .filter(e => (e.dateEnd || e.date) >= from)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, Math.max(0, limit))
    .map(e => ({
      name: cleanTitle(e.name),
      // FORCED, never read off the row. See placeFor above for the Horsens case.
      town,
      date: e.date,
      dateEnd: e.dateEnd || "",
      // The venue is where in the village to go and is never allowed to decide
      // which village. Kept beside the row rather than folded into the name.
      venue: e.venue || "",
      time: e.time || "",
      desc: e.desc || "",
      source: String(source || ""),
      fetchedAt: new Date().toISOString(),
      __scale: "Community",
    }));
};

const dayKeyOf = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "0000-00-00";
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

// ── AND WHAT HE IS TOLD BEFORE HE PRESSES ADD ───────────────────────
//
// A calendar is somebody else's noticeboard and nothing in it has been checked
// the way a published entry is. This is the honest report on what came back, in
// the voice planProblems uses: what was read, what was refused and why, and the
// one thing that is always worth seeing once per feed.
export const feedProblems = ({ place = "", rows = [], skipped = {}, events = [] } = {}) => {
  const out = [];
  if (!placeFor(place)) {
    out.push("No place given. Every row takes the place from the feed rather than from its own address, so there is nothing to file these under yet.");
    return out;
  }
  if (!rows.length) out.push("Nothing dated ahead of today came back, so there is nothing to add.");
  if (skipped.recurring) {
    out.push(`${skipped.recurring} repeating ${skipped.recurring === 1 ? "entry was" : "entries were"} left out. A repeat rule is a rule rather than a date, and an expansion that is slightly wrong claims something is on when it is not.`);
  }
  if (skipped.cancelled) out.push(`${skipped.cancelled} cancelled ${skipped.cancelled === 1 ? "entry" : "entries"} left out.`);
  if (skipped.undated) out.push(`${skipped.undated} ${skipped.undated === 1 ? "entry has" : "entries have"} no date, so nothing can be said about when they are on.`);
  // ── THE POSTAL TOWN, SAID ONCE ────────────────────────────────────
  // Every Endelave row gives its address as "8789 Horsens". That is correct
  // post and wrong geography, and it is the single thing most likely to make
  // somebody wonder whether the import went to the right place. Said once per
  // feed rather than per row.
  const other = postalTownsIn(events, place);
  if (other.length) {
    out.push(`The addresses on these name ${other.slice(0, 3).join(", ")}, which is the postal town rather than the place. They are filed under ${placeFor(place)} and the address is kept as the venue.`);
  }
  return out;
};

// The towns named in the venue addresses that are not the place itself. Read off
// a Danish postcode followed by a name, which is how every one of these is
// written, rather than by guessing at the last comma.
const COUNTRY_WORD = /^(?:danmark|denmark|dänemark|danemark|dk)$/i;
const POSTCODE_TOWN = /\b\d{4}\s+([A-Za-zÆØÅæøåÄÖäöéèü' -]{2,40})/g;
export const postalTownsIn = (events, place) => {
  const here = fold(placeFor(place));
  const seen = new Set();
  for (const e of Array.isArray(events) ? events : []) {
    const v = String(e?.venue || "");
    for (const m of v.matchAll(POSTCODE_TOWN)) {
      const t = String(m[1] || "").replace(/,.*$/, "").trim();
      // A Danish address ends "4592 Danmark" as often as it ends "8789
      // Horsens", and the country is not a town somebody could be standing in.
      if (t && fold(t) !== here && !COUNTRY_WORD.test(t)) seen.add(t);
    }
  }
  return [...seen];
};

// ── AND FINDING THE FEED FROM WHAT IS ON THE PAGE ───────────────────
//
// Endelave's calendar has no visible feed URL anywhere: the page is an embed
// and every entry links to google.com/calendar/event?eid=... So the one thing
// he can copy off that page is an EVENT link, and the calendar's own address is
// inside it.
//
// A Google eid is base64 of "<event id> <calendar address>", space separated.
// The address is what a public calendar's .ics is keyed by, so one copied event
// link is enough to reach the whole feed. Nothing here needs a Google account,
// an API key or a scrape: a public calendar publishes its own ics.
//
// NOTHING IS GUESSED. Anything this cannot read returns an empty string and the
// panel asks for the feed URL instead, because a wrong calendar address fetches
// somebody else's calendar.
const b64 = (v) => {
  const s = String(v || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  // atob and nothing else. A Buffer fallback was written here and taken out: it
  // is a Node global in a file that runs in a browser, and the scope checker
  // was right to refuse it. atob is in every browser and in Node since 16.
  try {
    if (typeof atob === "function") return atob(padded);
  } catch { /* not base64, which is an answer */ }
  return "";
};

export const calendarIdFromEid = (eid) => {
  const decoded = b64(eid);
  const at = decoded.indexOf(" ");
  if (at < 0) return "";
  const id = decoded.slice(at + 1).trim();
  // An address, and nothing that merely contains an @. A calendar id is an
  // email shaped string and anything else is a misread.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id) ? id : "";
};

export const ICS_FOR = (id) => `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;

// What he pastes, in the three shapes it comes in: the ics URL itself, a
// calendar address, or any event link off the embedded page.
export const icsUrlFor = (input) => {
  const v = String(input || "").trim();
  if (!v) return "";
  if (/^https:\/\/[^\s]+\.ics(\?.*)?$/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return ICS_FOR(v);
  const eid = /[?&]eid=([^&\s]+)/.exec(v);
  if (eid) {
    const id = calendarIdFromEid(decodeURIComponent(eid[1]));
    if (id) return ICS_FOR(id);
  }
  return "";
};

// ── AND THE CALENDARS WITH NO FEED BEHIND THEM ──────────────────────
//
// Oliver, 19 Sep 2026: "On the calender, you can perhaps attempt using
// firecrawl API."
//
// Right, and it is the other half. Endelave's calendar is a real Google
// Calendar, so it has an .ics and everything above reads it exactly. Sejerø's
// is a WordPress list plugin: no feed, no ics, a page. api/scan-source already
// has the two tier read this needs, a plain fetch and then Firecrawl when the
// plain fetch came back unreadable, and it is the same route Studio uses for
// every other page. So the page path is that route plus one extraction.
//
// ── THE EXTRACTION IS ALLOWED TO READ AND NOT TO DECIDE ─────────────
//
// It reads a page's own text and returns what it found. It may not name a town,
// because the place is given once for the whole feed and this file has a case
// about why. It may not invent a year. It may not round a date.
export const PAGE_ROWS_PROMPT = (place, text) =>
  `This is the text of a village calendar page for ${place}, Denmark. Pull out every entry that has a REAL DATE on the page.\n\n`
  + `Respond with ONLY strict JSON: {"events":[{"name":"the entry as written","date":"YYYY-MM-DD","dateEnd":"YYYY-MM-DD or empty","time":"HH:MM or empty","venue":"the place in the village, or empty"}]}\n\n`
  + `NEVER INVENT A DATE AND NEVER INVENT A YEAR. If the page says "Fredag 25. september" and nothing on the page says which year, leave that entry OUT entirely. A guide built on a guessed year tells somebody to turn up twelve months late, and an entry left out costs nothing.\n`
  + `NEVER RETURN A TOWN OR A POSTCODE. The place is already known and these addresses carry the postal town, which for an island is on the mainland across a ferry.\n`
  + `The name is the entry as the village wrote it. Do not improve it, do not translate it, do not add a description it does not have.\n`
  + `An entry with no date at all is left out rather than given today's.\n\n${text}`;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{1,2}:\d{2}$/;

// The model's answer, back into the shape parseIcs produces, so everything
// downstream is one path. Anything that is not a real date is dropped here
// rather than trusted: this is the half that came out of a model.
export const rowsFromExtract = (json) => {
  const list = Array.isArray(json?.events) ? json.events : [];
  const out = [];
  let dropped = 0;
  for (const e of list) {
    const name = String(e?.name || "").trim();
    const date = String(e?.date || "").trim();
    if (!name || !ISO_DAY.test(date)) { dropped += 1; continue; }
    const end = String(e?.dateEnd || "").trim();
    const time = String(e?.time || "").trim();
    out.push({
      uid: "",
      name,
      date,
      dateEnd: ISO_DAY.test(end) && end > date ? end : "",
      time: CLOCK.test(time) ? time : "",
      venue: String(e?.venue || "").trim(),
      desc: "",
    });
  }
  return { events: out, skipped: { cancelled: 0, recurring: 0, undated: dropped } };
};

// ── "IT'S FROM THEIR OWN WEBSITES. BUT YOU CAN'T CLICK THE EVENTS" ──
//
// Oliver, 19 Sep 2026, telling me to go and look rather than take a page
// summary's word for it. He was right and the summary was wrong in the one way
// that mattered.
//
// WHAT IS REALLY ON THOSE TWO PAGES, read in his own Chrome:
//
//   oenendelave.dk   WordPress, Divi, and the Simple Calendar plugin
//                    (google-calendar-events), rendering a table with class
//                    simcal-calendar-grid. NOT an iframe embed.
//   sejero.dk        WordPress, The Events Calendar (tribe_events), through an
//                    Elementor widget.
//
// ── AND THE eid PATH ABOVE CANNOT WORK ON ENDELAVE ──────────────────
//
// It has google.com/calendar links in it and the calendar address inside every
// one of them is TRUNCATED: decoded, it reads "oenendelave@m" and stops. That
// is not a truncation by whatever read the page, it is what the page carries.
// So the .ics behind that calendar is unreachable from the page, and the eid
// reader stays for the calendars that do carry a whole one rather than being
// the answer for this one.
//
// ── WHAT BOTH PAGES DO CARRY IS SCHEMA.ORG MARKUP ───────────────────
//
// Two different plugins, one standard, and it is in the raw HTML: itemprop
// name, startDate, endDate, location. No model, no guessing at a year, no
// stripping to prose. The two readers below are named after the two plugins on
// purpose rather than pretending to be a generic microdata reader: a generic
// one would break silently on the third plugin, and these say which markup they
// know. The model extraction stays as the last resort, which is what it is for.

// ── THE EVENTS CALENDAR, WHICH PUBLISHES A REST API ─────────────────
//
// The commonest event plugin on WordPress, and its API is open on sejero.dk
// without a key: title, start_date, end_date, venue, description, all clean.
// This is the best read of the four paths and it is tried before the HTML.
//
// start_date is "YYYY-MM-DD HH:MM:SS" in the site's own timezone, which is what
// a village means by the time of its own event.
export const tribeApiFor = (pageUrl, from = new Date()) => {
  let u;
  try { u = new URL(String(pageUrl || "")); } catch { return ""; }
  if (u.protocol !== "https:") return "";
  const start = dayKeyOf(from);
  return `${u.origin}/wp-json/tribe/events/v1/events?per_page=50&start_date=${start}`;
};

const splitStamp = (v) => {
  const s = String(v || "").trim();
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s);
  return m ? { date: m[1], time: m[2] ? `${m[2]}:${m[3]}` : "" } : { date: "", time: "" };
};

// HTML entities and tags out of a field the plugin stores as post content.
const plain = (v) => String(v || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

export const rowsFromTribe = (json) => {
  const list = Array.isArray(json?.events) ? json.events : [];
  const out = [];
  let dropped = 0;
  for (const e of list) {
    const name = plain(e?.title);
    const { date, time } = splitStamp(e?.start_date);
    if (!name || !date) { dropped += 1; continue; }
    const end = splitStamp(e?.end_date).date;
    out.push({
      uid: String(e?.id || ""),
      name,
      date,
      dateEnd: end && end > date ? end : "",
      time: e?.all_day ? "" : time,
      // The venue's NAME, never its city. The city is on this object and it is
      // the one field that must not be read: the place is given once for the
      // whole feed, for the reason placeFor has a case about.
      venue: plain(e?.venue?.venue),
      desc: plain(e?.description).slice(0, 400),
    });
  }
  return { events: out, skipped: { cancelled: 0, recurring: 0, undated: dropped } };
};

// ── SIMPLE CALENDAR, WHICH PUTS IT IN THE PAGE ──────────────────────
//
// Endelave. Each event is an <li class="simcal-event ..."> carrying a title
// span with itemprop="name" and a start span with itemprop="startDate" and a
// content attribute holding the real date. Read off the raw HTML rather than a
// DOM, because this same function has to run under the suite with no browser.
//
// THE PAGE IS ONE MONTH. Simple Calendar draws the month it is asked for and
// the rest are behind an ajax call, so this reads what the page shows. Said in
// feedProblems rather than hidden, because a calendar with four months in it
// and one month imported looks like a calendar with one month in it.
const LI_BLOCK = /<li[^>]*class="[^"]*simcal-event[^"]*"[\s\S]*?<\/li>/gi;
const PROP = (name) => new RegExp(`itemprop=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
const NAME_TEXT = /itemprop=["']name["'][^>]*>([^<]+)</i;
const LOC_TEXT = /itemprop=["']location["'][\s\S]{0,400}?itemprop=["']name["'][^>]*>([^<]+)</i;

export const rowsFromSimcal = (html) => {
  const blocks = String(html || "").match(LI_BLOCK) || [];
  const out = [];
  const seen = new Set();
  let dropped = 0;
  for (const b of blocks) {
    const startAttr = PROP("startDate").exec(b);
    const name = plain((NAME_TEXT.exec(b) || [])[1] || "");
    const { date, time } = splitStamp(startAttr ? startAttr[1] : "");
    if (!name || !date) { dropped += 1; continue; }
    // The same event is drawn twice on this grid, once as the day's entry and
    // once inside its own tooltip, so the list would be every event doubled.
    const key = `${date}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const endAttr = PROP("endDate").exec(b);
    const end = splitStamp(endAttr ? endAttr[1] : "").date;
    out.push({
      uid: "",
      name,
      date,
      dateEnd: end && end > date ? end : "",
      time,
      venue: plain((LOC_TEXT.exec(b) || [])[1] || ""),
      desc: "",
    });
  }
  return { events: out, skipped: { cancelled: 0, recurring: 0, undated: dropped } };
};

// Whether a page is worth handing to one of the two readers above, from its own
// markup. Asked rather than guessed at from the domain, because these plugins
// are on thousands of sites and none of them is this one.
export const readerFor = (html) => {
  const h = String(html || "");
  if (/class="[^"]*simcal-event/i.test(h)) return "simcal";
  if (/tribe[-_]events/i.test(h)) return "tribe";
  return "";
};
