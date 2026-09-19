// ── "IT SHOULD POINT THAT OUT. AS A WARNING." ───────────────────────
//
// Oliver, 19 Sep 2026, after reading a conversation where Gemlyx offered
// Gilleleje to a family arriving on 2 December and said nothing about it:
//
//   "if the user says they want to go to some area, but it's usually only worth
//    going in the summer, then it should point that out. As a warning. Like
//    Gilleje is very summer-dependent. Many islands are as well tbh."
//
// And then, which is the wider half and the one this file is named for:
//
//   "So if someone says 'I want to go there in January', then make them aware of
//    what they should and should not expect."
//
// ── A WARNING, NOT A FILTER ─────────────────────────────────────────
//
// Nothing here removes a place. A seaside town in January is a real thing to do
// and some people want exactly that; what is not acceptable is arriving to find
// out. The whole output of this file is a sentence, and the caller decides where
// to put it.
//
// ── AND IT IS READ, NOT GUESSED ─────────────────────────────────────
//
// Two sources and no third. The entry's OWN WORDS when they say a season, which
// is the strong answer and comes with the sentence it was read from, and the
// entry's THEMES when they do not, which is the weaker one and says so. A list
// of place names somebody typed into this file would be a third instrument, out
// of date the first time a new coast town is published, and this app has paid
// for that shape more than once.
//
// The opposite mistake is the one to watch: a museum in Aarhus is not a summer
// place because it happens to be near water, and a warning that fires on
// everything is one nobody reads. So the theme rule is narrow, and it is the
// only one that fires without the entry having said something itself.
import { themesOf } from "./placeThemes";

// ── THE THREE SEASONS THIS ANSWERS IN ───────────────────────────────
//
// Not the meteorological four. The question is "is the thing I am being offered
// going to be open and worth it", and in Denmark that has three answers: the
// season, the edges of it, and the months when the coast is closed and it is
// dark at four in the afternoon.
//
// APRIL AND OCTOBER ARE THE EDGES, because that is where Danish seasonal
// opening actually lands: most seasonal places open around Easter and close
// after the autumn school holiday. May to September is the season.
export const SUMMER_MONTHS = [5, 6, 7, 8, 9];
export const SHOULDER_MONTHS = [4, 10];

export const seasonOf = (date) => {
  // ── NOTHING IS NOT JANUARY ────────────────────────────────────────
  //
  // `new Date(null)` is the first of January 1970, and `new Date(0)` is the
  // same day. Without this line a brief with no date at all reported the
  // deepest off season there is, and every coast place in the country came back
  // warned about a month nobody had mentioned. Caught by the assertion for "no
  // date, no warning", which is the case it would have been quietly wrong about
  // for as long as nobody typed a date.
  if (date === null || date === undefined || date === "") return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const m = d.getMonth() + 1;
  if (SUMMER_MONTHS.includes(m)) return "summer";
  if (SHOULDER_MONTHS.includes(m)) return "shoulder";
  return "off";
};

// ── WHAT AN ENTRY SAYS ABOUT ITS OWN YEAR ───────────────────────────
//
// The same shape openingHours.js reads off a venue's website during research,
// narrowed to the one question this file asks. Danish and English, because those
// are the two languages published entries are written in, and a third language
// here would be a vocabulary nobody in this project can check.
const MONTHS = "(?:january|february|march|april|may|june|july|august|september|october|november|december"
  + "|januar|februar|marts|maj|juni|juli|oktober|november)";
const SEASON_SPAN = new RegExp(
  `\\b(?:open|opens|åben|åbent|åbner|geöffnet)\\b[^.\\n]{0,40}?\\b${MONTHS}\\b[^.\\n]{0,15}?(?:to|until|till|til|-|–)\\s*\\b${MONTHS}\\b`, "i");
const SEASON_WORDS = /\b(?:summer (?:season|months|only)|only in summer|during the summer season|seasonal opening|open in the summer|kun om sommeren|om sommeren|sommersæson|sommerhalvåret|i sæsonen)\b/i;
const WINTER_CLOSED = /\b(?:closed (?:in |for |over |during )?(?:the )?winter|winter closure|lukket om vinteren|vinterlukket)\b/i;

// One sentence around the match, so the caller can quote the entry rather than
// paraphrase it. Bounded, because this ends up in a prompt.
const sentenceAt = (text, index) => {
  const from = Math.max(0, text.lastIndexOf(".", index) + 1);
  const dot = text.indexOf(".", index);
  const to = dot === -1 ? Math.min(text.length, index + 160) : Math.min(dot + 1, index + 200);
  return text.slice(from, to).replace(/\s+/g, " ").trim().slice(0, 180);
};

// Every field an entry might carry its prose in, joined once. Not the name and
// not the town: "Sommersted" is a place in South Jutland and has nothing to do
// with summer, and a substring match on a name is how that becomes a warning.
const proseOf = (entry) => [entry?.desc, entry?.description, entry?.highlight, entry?.gemlyxFind, entry?.practical, entry?.body]
  .filter(v => typeof v === "string" && v.trim())
  .join(" ");

// ── AND THE ONE THEME THAT MEANS IT WITHOUT SAYING IT ───────────────
//
// "coast" is the only theme that carries a season on its own. A coast town in
// Denmark in January is a real place with a shut harbour front, and everybody
// who has been to one in July and one in January knows they are two different
// towns. Nature, history, food and the rest are year-round by default, and a
// warning on a museum because it is in a coastal kommune is the noise that gets
// the whole thing switched off.
const SEASONAL_THEME = "coast";

// What an entry says about its own year, and how firmly.
//
//   said     the entry states a season, and `quote` is the sentence
//   leaning  the entry is a coast row and says nothing either way
//   ""       nothing to say
export const summerLeaning = (entry) => {
  const text = proseOf(entry);
  if (text) {
    const span = SEASON_SPAN.exec(text);
    if (span) return { level: "said", quote: sentenceAt(text, span.index) };
    const closed = WINTER_CLOSED.exec(text);
    if (closed) return { level: "said", quote: sentenceAt(text, closed.index) };
    const words = SEASON_WORDS.exec(text);
    if (words) return { level: "said", quote: sentenceAt(text, words.index) };
  }
  if (themesOf(entry).includes(SEASONAL_THEME)) return { level: "leaning", quote: "" };
  return { level: "", quote: "" };
};

// ── WHAT TO EXPECT IN THE MONTH THEY NAMED ──────────────────────────
//
// His second message, and it is the more useful half: "So if someone says 'I
// want to go there in January', then make them aware of what they should and
// should not expect."
//
// About the MONTH and never about the place, which is what makes it safe to
// state flatly. Daylight is arithmetic and the same for the whole country: the
// sun sets before half past four in Copenhagen through December, and a traveller
// planning two outdoor stops a day in January is planning one.
//
// No claim about any particular place being shut. That is the entry's own words
// or nothing, which is what summerLeaning above is for.
export const monthNote = (date) => {
  const season = seasonOf(date);
  if (season === "summer") return "";
  const d = date instanceof Date ? date : new Date(date);
  const m = d.getMonth() + 1;
  if (season === "shoulder") {
    return m === 4
      ? "April is the edge of the season: many seasonal places open around Easter and some are still on winter hours."
      : "October is the end of the season: seasonal places start closing after the autumn school holiday.";
  }
  const dark = [11, 12, 1].includes(m)
    ? " It is dark by about half past four in the afternoon, so an outdoor stop and an indoor one is a full day."
    : " Daylight is short and the weather decides the day.";
  return `This is outside the season.${dark}`;
};

// ── THE WARNING ITSELF ──────────────────────────────────────────────
//
// Returns null when there is nothing to warn about, which is most of the time:
// a summer trip, a year-round place, or a date nobody has given yet. A caller
// that gets null says nothing, rather than saying everything is fine.
//
// `expect` is the month's line and is the same for every place on the trip, so a
// caller putting several of these on one screen prints it once.
export const seasonWarning = (entry, date) => {
  const season = seasonOf(date);
  if (!season || season === "summer") return null;
  const leaning = summerLeaning(entry);
  if (!leaning.level) return null;
  return {
    name: entry?.name || "",
    season,
    // "said" carries the entry's own sentence, which is a fact about that place.
    // "leaning" carries no quote and must not be written as though it did.
    level: leaning.level,
    quote: leaning.quote,
    expect: monthNote(date),
  };
};

// Every warning a set of places earns, in the order they were given, with the
// month's line lifted out because it is said once rather than once each.
export const seasonWarnings = (entries, date) => {
  const rows = (Array.isArray(entries) ? entries : [])
    .map(e => seasonWarning(e, date))
    .filter(Boolean);
  return { rows: rows.map(({ expect, ...rest }) => rest), expect: rows.length ? rows[0].expect : "" };
};

// ── AND THE BLOCK THE CHAT READS ────────────────────────────────────
//
// The prompt half, and it is deliberately not a sentence for Gemlyx to repeat.
// A warning written here and read out would be the same six words on every
// coast town in the country, which is the brochure voice this app spends most
// of its rules avoiding. What goes in is the FINDING and the instruction to say
// it once, in its own words, without turning it into a refusal: the place is
// still worth offering, and somebody who wants a quiet winter coast should be
// able to say so and keep it.
export const seasonBlock = (entries, date) => {
  const { rows, expect } = seasonWarnings(entries, date);
  if (!rows.length) return "";
  const lines = rows.map(r => (r.level === "said" && r.quote
    ? `  ${r.name}: its own entry says "${r.quote}"`
    : `  ${r.name}: a coast place, which in Denmark is a different town out of season`));
  return `── WHAT THE SEASON DOES TO WHAT YOU ARE OFFERING ──\n`
    + `${expect}\n`
    + `These of the places in play are affected:\n${lines.join("\n")}\n`
    + `SAY IT ONCE, PLAINLY, AND KEEP THE PLACE ON THE TABLE. This is a heads-up, not a refusal: a quiet coast in winter is what some people come for, and they can say so. Never claim a specific place is closed unless the line above quotes its own entry saying so. Do not repeat this in later turns.`;
};
