// ── THE CALENDAR, A MONTH AT A TIME ─────────────────────────────────
//
// Oliver, 1 Oct 2026: the navigation row gets "Activities" with "Calendar"
// and "Events" under it. Events is our picks. Calendar is everything on, in
// date order, and a list in date order reads as a calendar only once it is cut
// into months with the month written above each.
//
// An event already running sits under the month it is running in (today's),
// not the month it opened, so a festival that began last week is not filed
// under a month the page has already left.
import { parseEventDate } from "./eventDates.js";

const LOCALES = { en: "en-GB", da: "da-DK", de: "de-DE", lt: "lt-LT" };

export const monthLabel = (date, lang = "en") => {
  try {
    const s = new Intl.DateTimeFormat(LOCALES[lang] || "en-GB", { month: "long", year: "numeric" }).format(date);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
};

// events: already filtered and sorted. Returns [{ key, label, events }] in the
// order given; an event with no readable date goes in a last group, "".
export const groupByMonth = (events = [], { now = new Date(), lang = "en" } = {}) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const groups = [];
  const byKey = new Map();
  for (const e of events) {
    const start = parseEventDate(e?.date);
    const at = start ? (start < today ? today : start) : null;
    const key = at ? `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}` : "";
    if (!byKey.has(key)) {
      const g = { key, label: at ? monthLabel(at, lang) : "", events: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    byKey.get(key).events.push(e);
  }
  // Dated months in calendar order, whatever order the list arrived in, and
  // anything undated after them.
  return groups.sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.key.localeCompare(b.key)));
};
