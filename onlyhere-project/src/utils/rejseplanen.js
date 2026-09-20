// ── THE JOURNEY PLANNER, PREFILLED ──────────────────────────────────
//
// Oliver, 20 Sep 2026, after reading what the API costs: "that is going to be a
// crazy price we're not going to be able to manage. However, I want you to
// integrate this into the system." And then: "So the alternative is deep link."
//
// It is, and for this app it is the better half of the two. Rejseplanen
// publishes an "intelligent link" format: parameters on rejseplanen.dk that
// prefill the search and run it. No key, no approval, no quota, no contract,
// nothing to go down at three in the morning, and nothing to pay. The whole
// integration is a URL builder.
//
// ── WHAT IT REPLACES, WHICH IS A DEAD SENTENCE ──────────────────────
//
// "Check Rejseplanen for this leg" is written into this codebase in eight
// places as an honest fallback, and every one of them hands the reader a
// homework assignment: open a site, find the stop names, type them in, set the
// date, set the time. entryAudit flags that phrasing as a defect when a draft
// writes it, journey.js lists it as a tell, and the guide prints it anyway
// because there was nothing better to print.
//
// There is now. The same sentence becomes a link that arrives with both ends,
// the day and the hour already in it.
//
// ── AND IT IS THE RIGHT ANSWER FOR DENMARK SPECIFICALLY ─────────────
//
// operators.js already says why Rejseplanen is what a crossing gets rather
// than a named company: it covers every operator in the country at once,
// trains, buses, the metro and the ferries. That is also what makes the
// prefill worth more here than a flight search would be. "Havnsø to Sejerø on
// a Tuesday in October, does the bus meet the boat" is the question this app
// exists for, and it is one question on one page.

// The base, and the parameter names, taken from Rejseplanen Labs' own
// documentation of the format rather than from a URL seen in the wild.
export const RP_BASE = "https://www.rejseplanen.dk/";

const clean = (v) => String(v == null ? "" : v).trim();

// ── DD.MM.YYYY, FROM LOCAL GETTERS ──────────────────────────────────
//
// Rejseplanen wants the Danish order. Built from getFullYear, getMonth and
// getDate rather than from toISOString, which is the mistake this repository
// has now made four times: toISOString converts local midnight to the previous
// evening in Denmark, so a link for the 6th would open the planner on the 5th
// and every departure on it would be wrong by a day.
export const rpDate = (d) => {
  const x = d instanceof Date ? d : new Date(String(d || ""));
  if (Number.isNaN(x.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}`;
};

// ── TT:MM, OUT OF WHATEVER THE GUIDE WROTE ──────────────────────────
//
// The times in a guide are written for a reader, not for a form: "~9:00",
// "9.30", "14:05". A tilde is the app's own convention for an approximate
// arrival and appears on nearly every stop. Anything that is not a clock comes
// back empty rather than guessed, because a wrong departure time on a journey
// planner is worse than none: the reader gets a connection that does not exist
// instead of an empty field they can fill in themselves.
export const rpTime = (v) => {
  const m = String(v == null ? "" : v).match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return "";
  const h = Number(m[1]), min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

// ── THE LINK ────────────────────────────────────────────────────────
//
// `S` is where you leave from, `Z` where you are going, and both take a stop, an
// address or a place name, which is what makes this usable from a guide: the
// app holds town and stop names, not Rejseplanen's internal ids.
//
// `start=1` RUNS THE SEARCH, and that is the whole convenience. Without it the
// reader lands on a filled form and still has to press Find, which is the one
// step this exists to remove. Only sent when both ends are known, because the
// documentation is explicit that it starts the search when the from and to
// fields are filled, and asking a half-filled form to search itself is a way to
// land somebody on an error.
//
// ENCODED, even though the documentation's own example carries a bare space in
// "Aarhus H". A Danish stop name has spaces, slashes and letters outside ASCII
// in it, and hoping a browser fixes that is how a link to "Kongens Nytorv" ends
// up somewhere else.
export const journeyUrl = ({ from = "", to = "", date = null, time = "", timeSel = "depart", fromHere = false } = {}) => {
  const S = clean(from), Z = clean(to);
  // fromHere is the in-trip case: the planner fills the from-field off the
  // reader's own GPS, which is the one thing a guide written last week cannot
  // know. It replaces S rather than joining it.
  if (!Z || (!S && !fromHere)) return "";
  const parts = [];
  if (fromHere) parts.push("actualPosition=1");
  else parts.push(`S=${encodeURIComponent(S)}`);
  parts.push(`Z=${encodeURIComponent(Z)}`);
  const d = rpDate(date);
  if (d) parts.push(`date=${encodeURIComponent(d)}`);
  const t = rpTime(time);
  if (t) {
    parts.push(`time=${encodeURIComponent(t)}`);
    // depart or arrive, and the difference is the whole point on a guide: a
    // stop with an opening time wants to ARRIVE by then, and a day that ends
    // at a ferry wants to arrive before it sails.
    parts.push(`timeSel=${timeSel === "arrive" ? "arrive" : "depart"}`);
  }
  parts.push("start=1");
  return `${RP_BASE}?${parts.join("&")}`;
};

// ── AND WHAT THE BUTTON SAYS ────────────────────────────────────────
//
// Names both ends, because a button that says "Rejseplanen" tells a reader
// which website they are about to open and nothing about what it will show
// them. Danish for a Danish reader: this is a Danish site and the person
// reading in Danish is the one most likely to press it.
export const journeyLabel = ({ from = "", to = "", fromHere = false, lang = "en" } = {}) => {
  const da = String(lang || "").toLowerCase().startsWith("da");
  const S = clean(from), Z = clean(to);
  if (!Z) return "";
  if (fromHere) return da ? `Rejseplanen: herfra til ${Z}` : `Rejseplanen: from here to ${Z}`;
  if (!S) return da ? `Rejseplanen: til ${Z}` : `Rejseplanen: to ${Z}`;
  return da ? `Rejseplanen: ${S} til ${Z}` : `Rejseplanen: ${S} to ${Z}`;
};

// ── AND THE SENTENCE THIS REPLACES IS NOT MATCHED HERE ──────────────
//
// A HEDGE matcher was written in this file and taken out again the same hour.
// journey.js and entryAudit.js both already own that rule and already call
// "check rejseplanen" a defect in a draft, and a second copy of a regex is how
// two parts of one app come to disagree about what it means. The suite caught
// the same mistake in this batch over hostOf. One reader, in the file that had
// it first.
