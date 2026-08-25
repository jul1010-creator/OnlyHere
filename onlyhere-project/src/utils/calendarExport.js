// ── PUTTING THE TRIP WHERE PEOPLE ALREADY LOOK ──────────────────────
//
// 25 August 2026. Of eighteen AI travel products censused, ONE exports to a
// calendar. Not one in eighteen because it is hard: an .ics file is a text
// format from 1998 and this file is the whole of it. One in eighteen because it
// is plumbing, and plumbing is what everyone skips.
//
// The argument for it is the same as the argument for the whole in-trip half.
// A guide sits in a browser tab somebody has to remember to open. A calendar
// entry appears on the phone that is already in their hand at 08:40 on the
// Tuesday, next to the flight they booked somewhere else.
//
// ── WHAT GOES IN, AND WHAT DELIBERATELY DOES NOT ────────────────────
//
// One event per STOP, not one per day. A day is not a thing you attend, and a
// calendar full of "Day 3" tells nobody anything at 8am.
//
// The description carries the stop's own note and, where the row has them, the
// real travel time and the address. NOT the whole guide: a calendar entry is
// read on a lock screen and anything past a few lines is never seen.
//
// NO PRICES AND NO OPENING HOURS. Both are perishable, an .ics file is a COPY
// that leaves the product and can never be corrected, and the live-layer rules
// written this afternoon apply hardest to the one artefact that cannot be
// updated. A price frozen into somebody's calendar in August, read in October,
// is exactly the failure this codebase spends its time preventing. The event
// carries a link back to the guide, which can be corrected, instead.
//
// ── AND EVERY TIME IS FLOATING, ON PURPOSE ──────────────────────────
//
// A stop at "9:00" means nine in the morning WHERE THE TRAVELLER IS, and Denmark
// is not where they are when they build the trip. Writing it as UTC turns 9:00
// into 11:00 for somebody who planned from New York, and writing a timezone
// requires shipping a VTIMEZONE block for Europe/Copenhagen and getting daylight
// saving right for the dates in question.
//
// A FLOATING time, which is what a local time with no Z and no TZID is called in
// RFC 5545, means exactly "9:00 wherever this is read". That is what the guide
// means, so that is what this writes. Apple, Google and Outlook all handle it.

const said = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// RFC 5545 section 3.3.11. A backslash, a semicolon, a comma and a newline all
// have meaning inside a property value, so all four are escaped. Getting this
// wrong does not error, it silently mangles every description containing a
// comma, which is all of them.
//
// AND IT MAY NOT COLLAPSE WHITESPACE, which the first version did by running
// `said` first. `said` normalises every run of whitespace to a single space, so
// every newline in a description was gone BEFORE this had a chance to escape it,
// and the whole description arrived as one paragraph. Caught by reading the
// generated file rather than by reading the function.
export const icsEscape = (v) => String(v ?? "").trim()
  .replace(/\\/g, "\\\\")
  .replace(/;/g, "\\;")
  .replace(/,/g, "\\,")
  .replace(/\r?\n/g, "\\n");

// Section 3.1: lines longer than 75 OCTETS must be folded, and a reader that
// does not fold produces a file some calendars accept and others reject with no
// message. Folded with CRLF and a leading space, which is what the spec says and
// what every parser expects.
//
// ── OCTETS, NOT CHARACTERS, AND IN DANISH THAT IS NOT THE SAME ──────
//
// Found by generating a real file for a Ribe guide and reading it, not by
// reading this function. The first version counted `s.length`, which is UTF-16
// code units. "Borgertårn" is ten characters and eleven bytes: æ, ø, å and every
// other non-ASCII letter is two bytes in UTF-8, so a Danish line measuring 75
// here can be 85 octets on disk. The comment above already said "octets". The
// code said length. A spec quoted in a comment and not implemented below it is
// worse than no comment, because it stops anybody checking.
//
// AND A FOLD MUST NEVER SPLIT A CHARACTER. Slicing by code unit can cut a
// surrogate pair in half — any emoji, and a note can carry one — which produces
// two lone surrogates and invalid UTF-8 that a strict parser rejects outright.
// Cutting on a code POINT boundary makes that impossible.
const byteLen = (s) => {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
};

// The longest prefix of `s` that fits in `max` octets, cut only between whole
// characters. Returns the prefix; the caller takes the rest.
const takeBytes = (s, max) => {
  let n = 0, out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0);
    const w = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    if (n + w > max) break;
    out += ch;
    n += w;
  }
  return out;
};

export const icsFold = (line) => {
  const s = String(line ?? "");
  if (byteLen(s) <= 75) return s;
  const first = takeBytes(s, 75);
  const out = [first];
  let rest = s.slice(first.length);
  // 74, not 75: the continuation's leading space is itself one of the octets.
  while (byteLen(rest) > 74) {
    const piece = takeBytes(rest, 74);
    // A single character wider than the budget would loop forever. It cannot
    // happen at 74 octets — the widest code point is 4 — but a guard that costs
    // nothing beats a hang in somebody's browser.
    if (!piece) break;
    out.push(" " + piece);
    rest = rest.slice(piece.length);
  }
  if (rest.length) out.push(" " + rest);
  return out.join("\r\n");
};

const pad = (n) => String(n).padStart(2, "0");

// "2026-10-13" plus "9:00" or "~9:00" or "09:00" becomes 20261013T090000.
// A stop with no usable time gets a whole-day event rather than a guessed hour:
// nine in the morning invented by a formatter is a fact nobody stated.
export const icsStamp = (isoDay, clock) => {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDay || ""));
  if (!d) return null;
  const day = `${d[1]}${d[2]}${d[3]}`;
  const t = /(\d{1,2})[:.](\d{2})/.exec(String(clock || ""));
  if (!t) return { value: day, allDay: true };
  const h = Number(t[1]), m = Number(t[2]);
  if (!(h >= 0 && h < 24 && m >= 0 && m < 60)) return { value: day, allDay: true };
  return { value: `${day}T${pad(h)}${pad(m)}00`, allDay: false };
};

// "1-1.5 hours", "2-3 hours", "30 min", "half a day". Returns minutes, or null
// when the text does not say. A stop whose length nobody stated gets the
// default rather than a number this file made up.
export const stayMinutes = (text) => {
  const s = said(text).toLowerCase();
  if (!s) return null;
  const hrs = /(\d+(?:[.,]\d+)?)\s*(?:-|to|–)?\s*(\d+(?:[.,]\d+)?)?\s*(?:hours?|hrs?|h\b|timer?)/.exec(s);
  if (hrs) {
    const hi = Number(String(hrs[2] || hrs[1]).replace(",", "."));
    if (Number.isFinite(hi) && hi > 0) return Math.round(hi * 60);
  }
  const mins = /(\d+)\s*(?:-|to|–)?\s*(\d+)?\s*(?:min|minutes?|minutter)/.exec(s);
  if (mins) {
    const hi = Number(mins[2] || mins[1]);
    if (Number.isFinite(hi) && hi > 0) return hi;
  }
  if (/half a day|halv dag/.test(s)) return 240;
  if (/full day|whole day|hele dagen/.test(s)) return 480;
  return null;
};

export const DEFAULT_STAY_MINUTES = 90;

const addMinutes = (stamp, minutes) => {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(stamp);
  if (!m) return stamp;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
};

const nextDay = (yyyymmdd) => {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(yyyymmdd);
  if (!m) return yyyymmdd;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
};

// A UID has to be stable, so re-exporting the same trip UPDATES the events
// already in somebody's calendar instead of adding a second copy of every stop.
// That is the difference between an export you can use twice and one you can use
// once. Built from the guide id, the day and the stop position rather than from
// the name, because a renamed stop is the same stop in the same slot.
export const icsUid = (guideId, dayNo, index) =>
  `gemlyx-${said(guideId) || "trip"}-d${dayNo}-s${index}@gemlyxtravel.com`;

// ── THE ONE PLACE THAT DECIDES WHAT A TRAVELLER SEES ────────────────
export const stopEvent = (stop, { dayDate, dayNo, index, guideId, guideUrl } = {}) => {
  const name = said(stop?.name);
  if (!name) return null;
  const start = icsStamp(dayDate, stop?.arrivalTime);
  if (!start) return null;

  const town = said(stop?.town);
  const lines = [
    said(stop?.note),
    said(stop?.how) ? `Getting there: ${said(stop.how)}` : "",
    guideUrl ? `Your Gemlyx guide: ${guideUrl}` : "",
    // Said out loud on every event, because this file is a COPY and the thing it
    // was copied from can change after it leaves.
    "Times and details were correct when this was exported. Check the guide before you go.",
  ].filter(Boolean);

  const ev = {
    uid: icsUid(guideId, dayNo, index),
    summary: town && !name.includes(town) ? `${name}, ${town}` : name,
    location: said(stop?.mapHint) || town || "",
    description: lines.join("\n"),
    allDay: start.allDay,
  };
  if (start.allDay) {
    ev.start = start.value;
    ev.end = nextDay(start.value);   // DTEND is exclusive for a whole-day event
  } else {
    ev.start = start.value;
    ev.end = addMinutes(start.value, stayMinutes(stop?.suggestedStay) || DEFAULT_STAY_MINUTES);
  }
  return ev;
};

export const guideEvents = (guide, { dayDateFor, guideUrl = "" } = {}) => {
  const days = Array.isArray(guide?.days) ? guide.days : [];
  const out = [];
  days.forEach((d, di) => {
    const dayNo = Number(d?.day) || di + 1;
    const dayDate = typeof dayDateFor === "function" ? dayDateFor(dayNo) : null;
    if (!dayDate) return;              // no date, no calendar entry, and no invented one
    (Array.isArray(d?.stops) ? d.stops : []).forEach((s, si) => {
      const ev = stopEvent(s, { dayDate, dayNo, index: si, guideId: guide?.id || guide?._id, guideUrl });
      if (ev) out.push(ev);
    });
  });
  return out;
};

// ── THE FILE ────────────────────────────────────────────────────────
// CRLF everywhere, because RFC 5545 says so and Outlook enforces it.
export const buildIcs = (events, { name = "Gemlyx trip", stamp = "" } = {}) => {
  const dtstamp = /^\d{8}T\d{6}Z$/.test(stamp) ? stamp : `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gemlyx//Denmark trip//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(name)}`,
  ];
  (events || []).filter(Boolean).forEach(ev => {
    rows.push("BEGIN:VEVENT");
    rows.push(`UID:${ev.uid}`);
    rows.push(`DTSTAMP:${dtstamp}`);
    if (ev.allDay) {
      rows.push(`DTSTART;VALUE=DATE:${ev.start}`);
      rows.push(`DTEND;VALUE=DATE:${ev.end}`);
    } else {
      rows.push(`DTSTART:${ev.start}`);
      rows.push(`DTEND:${ev.end}`);
    }
    rows.push(`SUMMARY:${icsEscape(ev.summary)}`);
    if (ev.location) rows.push(`LOCATION:${icsEscape(ev.location)}`);
    if (ev.description) rows.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    rows.push("END:VEVENT");
  });
  rows.push("END:VCALENDAR");
  return rows.map(icsFold).join("\r\n") + "\r\n";
};

// A filename somebody can find again in a downloads folder six weeks later.
//
// DANISH LETTERS FOLD BEFORE THE STRIP, not after. The first version lowercased
// and then removed everything outside a-z, which turns "Ribe, Ærø and Langeland"
// into "ribe-r-and-langeland": æ and ø are not in a-z, so the whole word
// collapsed to its one surviving letter. Same fold placeUrl.js already does, and
// the same bug its own comment warns about.
export const icsFilename = (title) => {
  const slug = String(title ?? "").toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "aa")
    .replace(/ä/g, "ae").replace(/ö/g, "o").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    // TRIM, CUT, TRIM AGAIN — and the second trim is the one that matters.
    // Found by an assertion written after mutation testing showed the 60-char
    // cap had none. Trimming before the cut cannot know where the cut lands, so
    // a title whose 60th character happens to be a word boundary produced
    // "gemlyx-four-days-in-.ics", which reads to anybody looking at a downloads
    // folder as a file that failed to finish writing.
    .slice(0, 60).replace(/-$/, "");
  return `gemlyx-${slug || "trip"}.ics`;
};

// ── AND THE DOWNLOAD, WHICH IS THE PART THAT MAKES IT REAL ──────────
//
// Everything above this line is a pure function and was, for several hours,
// finished, tested, mutation-tested and called by nothing — which is this
// repository's signature failure and the reason the audit that produced this
// file exists. So the door ships in the same file as the room.
//
// Same shape as downloadReport in utils/previewReport.js. Not imported from
// there because that one JSON-stringifies its argument, and an .ics is text.
export const downloadIcs = (text, filename) => {
  if (typeof document === "undefined" || !text) return false;
  try {
    // text/calendar, not text/plain: on a phone the MIME type is what decides
    // whether this opens in a calendar or in a text viewer, and a trip that
    // downloads as a wall of BEGIN:VEVENT is not an export.
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "gemlyx-trip.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch { return false; }
};

// ── WHAT TO SAY WHEN THERE IS NOTHING TO EXPORT ─────────────────────
//
// A trip with no arrival date produces no events, correctly: guideEvents will
// not invent a day. The failure mode to avoid is downloading an empty calendar
// and calling it done, which is the same silence the logistics census was
// written to break this evening. A limit hit is not a limit reported.
//
// Returns "" when there IS something to export, so the caller renders nothing.
export const icsBlocked = (guide, events) => {
  const days = Array.isArray(guide?.days) ? guide.days.length : 0;
  if (!days) return "There are no days in this trip yet.";
  if (events && events.length) return "";
  return "This trip has no dates on it, so there is nothing to put in a calendar. Rebuild it with your arrival date and the stops will carry real days.";
};
