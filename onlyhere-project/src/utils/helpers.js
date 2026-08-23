import { TOWN_COORDS } from "../data/towns";
// Its own file, not inlined here and not imported from eventDates.js, which
// already imports daCompare from this one. See utils/calendarDay.js.
import { dayStart, dayWithin } from "./calendarDay";
// The six-language month vocabulary, so a numbered-list marker and a European
// date can be told apart. See utils/travellerWords.js.
import { MONTH_PATTERN } from "./travellerWords";

// ── ONE ANSWER TO "IS THIS LEG A BOAT" ───────────────────────────────
// Audited 10 Aug 2026: this question was being asked in SEVEN places in FIVE
// different spellings, and two of those pairs tested the same variable.
//
//   operators.js       /\bferry|færge|faerge|\bboat\b|sail/i
//   guideEnrichment.js /ferry|boat|færge/i        (twice)
//   guideReading.js    /ferry|færge|boat/i  AND  /ferry|færge/i   ← no "boat"
//   GuidePage.jsx      /ferry|boat/i        AND  /ferry|færge|boat/i  ← no "færge"
//   helpers.js         /ferry|boat/i                              ← no "færge"
//
// The consequences were real and all in the same direction, because FÆRGE is
// the Danish word for ferry and this is a Danish travel guide:
//
//   detectLegMode("Take the færge to Ærø", "bike") returned "bicycling", which
//   is a bike route across open water. That is the exact failure the comment
//   under this block says the function exists to prevent, and it was verified
//   by running it, not by reading it.
//
//   GuidePage's legChip tested the SAME `how` twice, 69 lines apart, with two
//   different patterns. A leg saying "færge" got the ferry booking notice under
//   a train icon.
//
//   guideReading tested the SAME `l.how` twice, 34 lines apart. A leg saying
//   "boat" made the trip summary announce a ferry crossing while the
//   book-before-you-go list left it out.
//
// One pattern now, and it is the union of what the seven were reaching for.
// "sail" and the Danish definite form "færgen" are both covered, and \bboat\b
// keeps it off words like "boathouse".
export const FERRY_TEXT = /\bferry\b|\bferries\b|færge|færgen|faerge|\bboat\b|\bsail\b|\bsailing\b/i;
export const isFerryText = (how) => FERRY_TEXT.test(String(how || ""));

// Works out the real travel mode for ONE leg of a guide, instead of assuming
// the traveler's whole-trip primary mode applies to every leg. This is what
// lets a mostly-bike trip correctly show/fetch a ferry leg to Bornholm (etc.)
// instead of asking Google Directions for a "bike route" across open water,
// which fails and silently falls back to a wrong straight-line estimate.
export const detectLegMode = (how, primaryMode) => {
  const text = how || "";
  if (isFerryText(text)) return "transit"; // closest Directions API mode — transit itineraries can include ferry legs
  if (/bike|cycl/i.test(text)) return "bicycling";
  if (/drive|car\b/i.test(text)) return "driving";
  if (/walk/i.test(text)) return "walking";
  if (/train|bus|transit/i.test(text)) return "transit";
  return primaryMode === "bike" ? "bicycling" : primaryMode === "car" ? "driving" : "transit";
};

export const getSeason = () => {
  const m = new Date().getMonth(); // 0=Jan
  if ([11, 0, 1].includes(m)) return "winter";
  if ([2, 3, 4].includes(m)) return "spring";
  if ([5, 6, 7].includes(m)) return "summer";
  return "autumn";
};

// ── THE YEAR IS THE PART THE READER NEEDED ──────────────────────────
// Found 12 Aug 2026 walking the live site. Two entries, side by side:
//
//     Skanderborg Festival    "2 Aug to 9 Aug"     finished three days ago
//     Copenhell               "23 Jun to 26 Jun"   happens in JUNE 2027
//
// Neither string contains a year, so both read to somebody planning a trip
// today as "this summer, roughly now". One is over and one is eleven months
// out, and the page gave a reader no way to tell either of those things, or to
// tell them apart. Skanderborg was even wearing a "Can't Miss Out" badge.
//
// A day and a month are enough ONLY while the year is the current one. Any
// other year has to say so, so the year is printed whenever it is not this
// one. `today` is a parameter rather than a call to the clock so this can be
// tested against a fixed calendar, which is the same rule utils/eventDates.js
// already lives by.
export const getEventDate = (dateStr, dateEnd, today = new Date()) => {
  // "Dates TBA" read like an abbreviation nobody had explained. It means the
  // entry has no confirmed date: either the organiser has not announced one, or
  // the drafting pipeline stripped a date it could not stand up (a festival date
  // already in the past is treated as a guess and removed rather than shown).
  // Saying that plainly is also more honest than a three letter acronym.
  // ── AND IT PRINTED THE WRONG DAY WEST OF GREENWICH ──────────────
  // `new Date("2026-06-23")` is UTC midnight, and every line below reads it
  // back with getFullYear, getMonth and toLocaleDateString, all of which are
  // LOCAL. In New York that is 20:00 on the 22nd, so this function printed
  // "Mon 22 Jun" for a festival opening on Tuesday the 23rd. Not a rounding
  // error: the wrong date and the wrong weekday, on the card a reader plans
  // around, for everyone in the Americas.
  //
  // dayStart reads a stored date as the calendar day it names, which is what
  // these values are. See utils/calendarDay.js, written when the same mistake
  // turned up for the fourth time in two days.
  if (!dateStr) return "Dates not confirmed";
  const d = dayStart(dateStr);
  if (!d) return "Dates not confirmed";
  const thisYear = today.getFullYear();
  const opts = { day: "numeric", month: "short" };
  const show = (date) => date.toLocaleDateString("en-GB",
    date.getFullYear() === thisYear ? opts : { ...opts, year: "numeric" });
  // THE DASH BAN NEVER SAW THIS ONE (12 Aug, Oliver's Copenhell screenshot,
  // reading "23 Jun – 26 Jun" on the live site). stripDashes exists to clean
  // what a MODEL wrote, and this string is assembled by us, after any cleaning
  // would have run, so it reached the page untouched every time a festival ran
  // for more than one day. Its own rule for a range is the word "to", which is
  // what this now says.
  const end = dateEnd ? dayStart(dateEnd) : null;
  // A RANGE THAT RUNS BACKWARDS IS NOT A RANGE. Row 62, TinderBox, is stored
  // with date 2027-06-24 and dateEnd 2026-06-26: somebody bumped the start to
  // next year's edition and left the end on last year's. Printed as a range
  // that read "24 Jun to 26 Jun", which is a coherent looking sentence about a
  // festival that ends before it begins. One date is better than a confident
  // wrong two, so the end is dropped and the start speaks for itself.
  // ── AND A ONE DAY EVENT IS NOT A RANGE ──────────────────────────
  // Live on the front page, 15 Aug 2026: "Ribelund Festival, 19 Aug to 19 Aug".
  // A range whose two ends are the same day is a single day, and printing it
  // twice reads as a template that was not finished. Compared on the DAY, not
  // on the timestamp, because a row stored with a midnight start and an evening
  // end is still one day.
  // dayStart returns null for an unreadable date rather than an Invalid Date,
  // so these are null checks now. Same meaning, one fewer way to be wrong: an
  // Invalid Date is truthy and quietly poisons every comparison it touches.
  const sameDay = !!end
    && end.getFullYear() === d.getFullYear() && end.getMonth() === d.getMonth() && end.getDate() === d.getDate();
  if (end && end.getTime() >= d.getTime() && !sameDay) return show(d) + " to " + show(end);
  if (d.getFullYear() === thisYear) return d.toLocaleDateString("en-GB", { ...opts, weekday: "short" });
  return show(d);
};

// Finished means the LAST day is behind us, not the first. A festival that
// opened yesterday and runs all week has not finished, and isUpcoming, which
// only ever looks at the start, says it is not upcoming either. Both of those
// can be true at once, which is exactly why this is its own question.
// ── AND IT HAD HALF THE SAME BUG ────────────────────────────────────
// This compared `new Date(last)`, which is UTC midnight for a date-only ISO
// string, against LOCAL midnight today. In Denmark the two are close enough
// that it always looked right. In New York, UTC midnight on the 16th is 20:00
// on the 15th local, so an event ending today read as finished for every reader
// in the Americas, which is most of the people this English guide is written
// for. It was failing in the suite under TZ=America/New_York before tonight and
// nobody was running the suite in another timezone.
//
// dayStart reads the value as the local calendar day it names, so both sides of
// the comparison are now the same kind of thing.
export const hasFinished = (e, today = new Date()) => {
  const last = e?.dateEnd || e?.date || e;
  if (!last) return false;
  const d = dayStart(last);
  if (!d) return false;
  return d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
};

// ── A BARE DOMAIN IS NOT A LINK ─────────────────────────────────────
// Seven live festivals store `website` with no scheme: "copenhell.dk",
// "groenkoncert.dk", "randersfestuge.dk" and four more. Rendered straight into
// href, the browser reads that as a RELATIVE path, so the "Visit website"
// button on Copenhell resolved to
//
//     https://www.gemlyxtravel.com/copenhell.dk
//
// which the Vercel rewrite serves as the app shell. The reader pressed the one
// button on the page that promised to take them to the festival and landed
// back on the Gemlyx landing screen, with nothing to tell them anything had
// gone wrong. Verified in his browser on the live site.
//
// The scheme is added here, at render, rather than fixed in the rows: it
// repairs all seven immediately and it holds for the eighth.
// ── "THE DOWNLOAD LIKE WITH THE DSB APP IS NOT THERE" ────────────────
//
// Oliver, 16 August 2026, on his published Nightpay essential. DSB App shows an
// App Store and a Google Play badge; Nightpay shows neither.
//
// Not a missing field. A FIELD ASKED FOR AS ONE THING AND RENDERED AS ANOTHER.
// The essential prompt asks for `link` as "the official URL ONLY if it is present
// in the research context", which is a WEBSITE, and the Essentials page renders
// that same value as `<StoreBadge type="ios" href={item.link} />`. So a drafted
// essential either shows nothing, when the research found no URL, or shows a
// company homepage behind a button that says "Download on the App Store". DSB App
// works because it is one of the few hardcoded rows and somebody put a real store
// URL in there by hand.
//
// Decided by the HOST, which is the rule the same block already applies to paid
// links one branch down: "Decided by the link's HOST rather than by a flag on the
// row, so adding a second paid link needs nobody to remember this."
export const storeKindOf = (url) => {
  let host = "";
  try { host = new URL(String(url)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
  if (!host) return "";
  if (host === "apps.apple.com" || host === "itunes.apple.com" || host.endsWith(".apple.com")) return "ios";
  if (host === "play.google.com") return "android";
  return "web";
};

export const externalHref = (value) => {
  const s = String(value || "").trim();
  if (!s) return null;
  // Only ever http(s). javascript:, data: and mailto: have no business in a
  // field a draft filled in, and a scheme we do not recognise is not something
  // to guess a prefix onto.
  if (/^https?:\/\//i.test(s)) return s;
  // THIS LINE IS DELIBERATELY REDUNDANT AND I AM SAYING SO RATHER THAN
  // PRETENDING OTHERWISE. Nothing carrying a scheme can survive the host test
  // below either: a colon cannot appear in `[\w-]+(\.[\w-]+)+` at all. I tried
  // to mutation-kill this line and could not, because there is no input it
  // rejects that the host test would accept.
  //
  // It stays because the two guards fail in opposite directions. The host test
  // exists to recognise a domain, and the day somebody widens it to allow a
  // port, or a colon in a path, is the day "javascript:alert(1)" becomes a
  // link on a page if this line is gone. A redundant guard against script
  // injection is worth keeping; the honest thing is to label it as one, so the
  // next person does not go looking for the test that proves it.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null;
  // A host, optionally with a path: at least one dot, a real TLD, no spaces.
  if (!/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return null;
  if (!/\.[a-z]{2,}(\/|$)/i.test(s)) return null;
  return "https://" + s;
};

// NOTE THE `!d`: an entry with NO date counts as upcoming here, deliberately,
// because a festival whose dates have not been announced has not finished
// either and should still be findable on the Events page.
// dayStart, not new Date(d): the date-only ISO form parses as UTC while
// `new Date()` is local, so this ran two hours out through a Danish summer and a
// whole day out for a reader in the Americas. See utils/calendarDay.js, which
// exists because that is the second copy of the same mistake found in two days.
export const isUpcoming = (d, today = new Date()) => {
  if (!d) return true;
  const s = dayStart(d);
  return s ? s.getTime() >= today.getTime() : true;
};

// ── "Don't have it showing it in 'coming events' then" ─────────────
// Oliver, 7 Aug, on seeing "Dates not confirmed" inside a list headed COMING
// EVENTS. He is right: a browse page can honestly list something whose dates
// are unannounced, but a strip promising what is COMING cannot, because the one
// thing it claims is the one thing that entry does not have. isUpcoming stays
// as it is, since the Events page still wants those entries; this is the
// stricter test for anywhere that presents a date as the point.
export const hasConfirmedDate = (e) => {
  const d = e?.date ?? e;
  if (!d) return false;
  const parsed = new Date(d);
  return !isNaN(parsed);
};
export const isConfirmedUpcoming = (e) => hasConfirmedDate(e) && isUpcoming(e?.date ?? e);

// ── AND A FESTIVAL IS ON, ON ITS LAST DAY ───────────────────────────
//
// This read `now <= new Date(end)`, which is midnight at the START of the end
// day, so every festival read as over from the first minute of its final day.
// A closing Saturday is a day people go.
//
// It also disagreed with hasFinished, seventy lines up in this same file, which
// compares against LOCAL midnight today and correctly says a festival ending
// today has not finished. On 16 August 2026 the site would have told you both
// things at once about one event: not finished, and not happening.
//
// Found by the suite going red overnight rather than by anybody reading it. The
// fixture ran 10 to 16 August and had passed every day until the 16th, which is
// the only day of the year it could fail.
//
// `today` is a parameter for that exact reason. A date helper that reads the
// clock cannot be tested against a fixed calendar, and this bug lives on one
// specific day.
export const isCurrentlyLive = (start, end, today = new Date()) => dayWithin(start, end, today);


export const weatherIcon = (code) => {
  if (!code) return "🌤";
  if (code.includes("rain") || code.includes("sleet")) return "🌧";
  if (code.includes("snow")) return "❄️";
  if (code.includes("thunder")) return "⛈";
  if (code.includes("cloudy") || code.includes("fog")) return "☁️";
  if (code.includes("clearsky") || code.includes("fair")) return "☀️";
  return "⛅";
};



export const isInDenmark = (coords) => coords && typeof coords === "object" &&
  coords.lat >= 54.4 && coords.lat <= 57.9 && coords.lon >= 7.9 && coords.lon <= 15.3;

// ── "THE AVERAGE TRAVELLER DOESN'T KNOW WHAT MID-BUDGET IS IN
//     DENMARK" ─────────────────────────────────────────────────────
//
// Oliver, 16 Aug 2026, and it retires the whole vocabulary.
//
// Budget, Mid-range and Splurge are defined relative to Denmark, so reading one
// requires already knowing what things cost in Denmark. That is exactly the
// reader who does not need this site. A German sees 250 kr and thinks
// expensive, a Norwegian thinks cheap, and an American has to open a converter
// either way. The word carries none of it.
//
// STUDIO_VOICE says the same thing without noticing the consequence: "Budget
// language must match real Danish price norms, a 200-300 DKK dinner or sub-100
// DKK entry point is affordable/mid-tier here". That rule is right for the
// WRITER, it stops a model calling a normal Copenhagen dinner expensive. It
// also makes the reader-facing label more Denmark-relative, not less, in a file
// whose next rule is "write for an ordinary international traveller".
//
// So the adjective goes and the money stays. The bands below were always in
// kroner; they were just hidden behind words. "Under 100 kr" needs no
// calibration and converts in one tap.
//
// ── AND UNKNOWN IS NULL, NOT THE MIDDLE BAND ────────────────────────
// The old version returned "Mid-range" for any price with no digits in it, so
// "See website" and "Varies by stall" were filed as a real tier. Reffen, whose
// own uncertainties say no reliable prices were found, sat in the Mid-range tab
// on the strength of nothing: returned by a reader filtering for Mid-range, and
// withheld from one filtering for Budget, on a measurement nobody made.
//
// The intent behind that default was right and worth keeping: an unpriced row
// must not vanish. Null does that better. It belongs to no band, so it shows
// under All and is claimed by nothing.
export const PRICE_BANDS = [
  { id: "under-100", label: "Under 100 kr" },
  { id: "100-250", label: "100 to 250 kr" },
  { id: "over-250", label: "Over 250 kr" },
];

// The same three cuts the old function made, spelled out rather than derived
// from the table, so the boundary at exactly 250 stays where it was: 250 is
// inside the middle band, as it has always been.
// ── WHICH NUMBERS IN A PRICE FIELD ARE MONEY ────────────────────────
//
// Found 17 Aug 2026 by running his own seven drafts through this. It read EVERY
// number, averaged them, and banded that:
//
//   "3-course lunch menu 795 DKK; 4-course lunch menu 1,095 DKK"
//      -> numbers 3, 795, 4, 1, 095 -> average 179.6 -> "100 to 250"
//
// So Henne Kirkeby Kro, two Michelin stars and 795 kroner for lunch, was filed in
// the mid-range tab, by the course count and a thousands separator. Kok og Vin's
// 152-character price sentence bands the same way. On the Food page that is a
// traveller filtering for a cheap lunch and being shown a destination restaurant.
//
// A number is money when a currency follows it, which is exactly how these fields
// are written: "795 DKK", "425 kr", "1.095 kroner". "3-course" and a comma group
// are not. When no number carries a currency the old behaviour stands, because a
// bare "425" in a price field is still a price and refusing to band it would empty
// the tabs for every entry written before this.
//
// A RANGE SHARES ITS CURRENCY, and this cost an existing assertion before it was
// noticed: "50-450 DKK" writes the unit once, at the end, so reading only the
// number the currency touches gives 450 and bands a place with 50-kroner dishes
// over 250. Both ends are money. The second group is the low-end capture.
// "N TO M" IS THE SAME RANGE, and it is the shape the pipeline actually produces:
// stripDashesDeep runs over every published payload at read time and rewrites
// "50–450 DKK" to "50 to 450 DKK", so the dash form this was written against
// largely does not survive to the tab. Found 18 Aug by an adversarial review, which
// measured it: the dash form banded 100-250 and the stripped form banded over-250,
// on the same row.
const MONEY = /(\d[\d.,]*)\s*(?:(?:[–—-]|to)\s*(\d[\d.,]*)\s*)?(?:dkk|kr\b|kroner|,-)/gi;

// A thousands separator is not a decimal point in Danish, and either way the band
// only cares about the magnitude: strip the groupings, keep a real decimal.
const kroner = (raw) => Number(String(raw).replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));

export const priceBand = (priceStr) => {
  const text = String(priceStr || "");
  const withCurrency = [...text.matchAll(MONEY)]
    // m[2] is the low end of a range and is undefined on a single figure, which
    // becomes NaN and is dropped by the finite test below. A `.filter(Boolean)`
    // stood here first; mutation testing showed removing it changed no result,
    // so it was reassurance rather than a guard, and it is gone.
    .flatMap(m => [m[1], m[2]])
    .map(kroner)
    .filter(n => Number.isFinite(n));
  const nums = withCurrency.length
    ? withCurrency
    : (text.match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;                 // nothing to band, and that is an answer
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (avg < 100) return "under-100";
  if (avg <= 250) return "100-250";
  return "over-250";
};

export const priceBandLabel = (id) => (PRICE_BANDS.find(b => b.id === id) || {}).label || "";

// Straight-line km between two {lat,lon} points — used as a sanity check on leg
// transport mode, since an AI-written "how" description (e.g. "on foot") can be
// geographically wrong in a way regex text-matching alone can never catch.
export const haversineKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Straight-line km distance from the user to a named town, falling back to the
// existing "from Copenhagen" travel-time string whenever it can't be resolved.
// ── NOWHERE IS A JOURNEY FROM ITSELF ────────────────────────────────
// Oliver, 8 Aug 2026, looking at the Copenhagen card: "13min from CPH in
// Copenhagen city.. fix that as well."
//
// He is right and it is the same bug twice over.
//
// FIRST, THE ORIGIN. Copenhagen IS CPH. The figure is not even wrong in an
// interesting way: travelTime is written from a real Directions measurement,
// and for Copenhagen that measures a route from the CPH origin to whatever
// coordinate a geocoder picked for the middle of a city of 660,000. Thirteen
// minutes to a point inside the place you are already standing in. This is
// exactly the "Nørreport (9 mins walk)" nearest-stop bug, which was fixed on
// 8 Aug by suppressing it at RENDER so all 71 published entries were fixed at
// once rather than needing 71 redrafts. Same fix, same reason.
//
// It extends to anywhere INSIDE Copenhagen: once Nyhavn carries
// partOf: "Copenhagen", "X minutes from CPH" is wrong about Nyhavn too, because
// you are already there. Same self-reference class as relationLine, areasInside
// and dayTripsFrom, all of which needed this guard and all of which shipped
// without it first.
//
// SECOND, THE MISSING FIGURE. Dragør has no travelTime, and the template
// interpolated it anyway, so the card read "CAPITAL REGION OF DENMARK · FROM
// CPH": a label with nothing in front of it, and "undefined from CPH" one
// missing field away. That breaks the all-or-nothing rule. A figure we do not
// have is withheld whole, including its label.
//
// Returns "" rather than a placeholder, and every call site joins on the
// non-empty parts, so an absent journey costs no dangling separator either.
export const TRAVEL_ORIGIN = "Copenhagen";
const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// A string is treated as a name. An entry is asked about its parent too,
// because being inside Copenhagen is being in Copenhagen.
export const isAtTravelOrigin = (place) => {
  if (!place) return false;
  if (typeof place === "string") return sameName(place, TRAVEL_ORIGIN);
  return sameName(place.name, TRAVEL_ORIGIN) || sameName(place.partOf, TRAVEL_ORIGIN);
};

export const travelLabel = (userCoords, place, fallbackTravelTime) => {
  const townName = typeof place === "string" ? place : place?.name;
  // Distance from where the reader is standing is honest even in Copenhagen:
  // "~2 km from you" is a real answer to a real question.
  if (isInDenmark(userCoords) && townName && TOWN_COORDS[townName]) {
    const [tLat, tLon] = TOWN_COORDS[townName];
    const dLat = (tLat - userCoords.lat) * 111.32;
    const dLon = (tLon - userCoords.lon) * 62.06;
    const km = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
    return km < 2 ? "~2 km from you" : `~${km} km from you`;
  }
  if (isAtTravelOrigin(place)) return "";
  const t = String(fallbackTravelTime ?? "").trim();
  if (!t) return "";
  return `${t} from CPH`;
};

// A card subtitle is a list of things that may each be absent. Joining with a
// separator first and hoping is how "· FROM CPH" got onto the page.
export const dotJoin = (...parts) => parts.map(p => String(p ?? "").trim()).filter(Boolean).join(" · ");

// A message counts as a "full plan" once it lays out 2+ days — these get collapsed
// to a short line in chat; the real detail only appears inside the generated guide.
// The chat reply no longer needs to BE a day-by-day breakdown to signal "ready to
// build" — that forced a full itinerary into the plain-text chat, duplicating what
// the actual guide (with real routes/maps) shows once built. Instead the model ends
// a genuinely-ready summary with a hidden marker string; this checks for that marker
// instead of counting "Day N:" occurrences. isFullPlanText is kept for any content
// that still uses the old day-by-day format (e.g. already-sent messages).
export const READY_MARKER = "[[GEMLYX_READY_TO_BUILD]]";

// ── TOLERANT ON PURPOSE ─────────────────────────────────────────────
// 22 Aug 2026, from Oliver's father using Gemlyx in Danish: a finished plan,
// then "Den er klar.", and no button anywhere. The marker is an ASCII string
// defined in an English prompt, and the reply wrapped around it is written in
// the traveller's own language. A model composing Danish drops the brackets,
// lowercases it, spaces it out, or renders it as prose often enough that an
// exact `includes` is a coin toss, and the cost of losing that toss is the one
// button the whole product funnels into.
//
// So anything unmistakably this marker counts. The core sequence GEMLYX READY
// TO BUILD cannot occur in a real reply about Denmark by accident, which is
// what makes loosening it safe rather than reckless.
// ── TOLERANT, BUT NOT SO TOLERANT IT EATS ENGLISH ───────────────────
// The first version was `\\[{0,2}...GEMLYX[\\s_-]*READY[\\s_-]*TO[\\s_-]*BUILD...`,
// which made every bracket and every separator optional at once. That matches
// the ordinary sentence "I'll have Gemlyx ready to build your guide", and
// because stripReadyMarker also swallowed the spaces on both sides it rendered
// as "I'll haveyour guide". Every assistant message goes through the strip, so
// the damage was not limited to the ready case.
//
// So it is EITHER bracketed, with any separator, OR unbracketed with separators
// no human writes between those four words. A model that mangles the marker
// still gets caught; a model writing prose about being ready does not.
const READY_PATTERN = /\[\[?\s*GEMLYX[\s_-]*READY[\s_-]*TO[\s_-]*BUILD\s*\]?\]|\bGEMLYX[_-]+READY[_-]+TO[_-]+BUILD\b/i;
export const isReadyToBuild = (text) => !!text && READY_PATTERN.test(text);
// Replaced with a SPACE, not with nothing. Removing the match outright fused
// the words on either side of it.
export const stripReadyMarker = (text) =>
  text
    ? text.replace(new RegExp(READY_PATTERN.source, "gi"), " ")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : text;

// Common AI-writing tells — surface-level phrases that read as generic AI filler
// rather than a real person's voice. Case-insensitive, checked as whole phrases
// so "great" alone doesn't false-positive on "Great Belt Bridge" etc.
export const AI_TELL_PHRASES = [
  "great!", "certainly!", "absolutely!", "i'd be happy to", "you're in for a",
  "it's worth noting", "it is worth noting", "in today's world", "in this day and age",
  "not just", "but also", "elevate", "elevated", "unparalleled", "nestled", "vibrant",
  "boasts a", "boasts", "a testament to", "delve into", "dive into", "unlock", "unleash",
  "whether you're", "look no further", "when it comes to", "in conclusion",
  "moreover", "furthermore", "additionally", "it's important to note",
  "rich history", "hidden gem" /* ironic here, but still an overused shorthand */,
  "picture this", "imagine", "let's explore", "journey through", "tapestry of",
  // From the editorial style guide (fancy adjectives, travel clichés, corporate language):
  "meticulously", "artisanal", "curated", "handcrafted", "refined", "sophisticated",
  "nuanced", "intricate", "exemplary", "exceptional", "remarkable", "outstanding",
  "world-class", "unforgettable", "seamless", "ultimate", "premium",
  "immerse", "immerse yourself", "iconic", "bustling", "picturesque", "quaint",
  "enchanting", "captivating", "renowned", "must-visit", "timeless charm",
  "breathtaking", "perfect blend", "not to be missed", "leaves a lasting impression",
  "something for everyone", "leverage", "facilitate", "optimise", "optimize",
  "maximise", "maximize", "holistic", "dynamic", "innovative", "robust",
  "comprehensive", "enhance", "delicately", "lively energy", "to perfection",
];

// ── "IT'S SUCH A NERD WORD TO BE USING SO MUCH" ─────────────────────
// Oliver, 8 Aug 2026, on "actually".
//
// KEPT OUT OF AI_TELL_PHRASES ON PURPOSE, and the distinction matters. Every
// word in that list is never right: nothing is improved by "nestled". These are
// different. "actually" is a real word when it corrects an expectation the
// reader already holds, and the entrance that looks closed but is round the
// back is exactly the kind of thing this site exists to say. What makes it a
// tell is not the word, it is the FREQUENCY, so frequency is what gets counted.
//
// Substring matching would be wrong here too, so this uses word boundaries.
// AI_TELL_PHRASES can use indexOf because its entries are multi-word or
// distinctive enough not to collide; a bare word cannot.
export const FILLER_WORDS = ["actually", "truly", "genuinely", "simply"];

// Twice in one entry is the signal. Once can be doing real work, and flagging a
// considered use is how a review tool teaches its owner to ignore it.
export const FILLER_REPEAT = 2;

export const fillerWordCounts = (text, words = FILLER_WORDS) => {
  const out = {};
  if (!text) return out;
  for (const w of words) {
    const n = (String(text).match(new RegExp(`\\b${w}\\b`, "gi")) || []).length;
    if (n >= FILLER_REPEAT) out[w] = n;
  }
  return out;
};

export const scanForAITells = (text, extraPhrases = []) => {
  if (!text) return [];
  const found = [];
  const lower = text.toLowerCase();
  for (const phrase of [...AI_TELL_PHRASES, ...extraPhrases.map(p => p.toLowerCase())]) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      found.push({ phrase, index: idx, match: text.slice(idx, idx + phrase.length) });
      idx = lower.indexOf(phrase, idx + phrase.length);
    }
  }
  return found.sort((a, b) => a.index - b.index);
};

export const isFullPlanText = (text) => {
  if (!text) return false;
  const dayHeaders = (text.match(/day\s*\d+\s*[:\-–]/gi) || []).length;
  return dayHeaders >= 2 || (dayHeaders >= 1 && text.length > 500);
};

// ── THREE THINGS IT GOT WRONG, ON A DANISH TRAVEL PRODUCT ───────────
//
// Found 22 Aug 2026 by an adversarial pass over the previous night's work, all
// three demonstrated by execution rather than by reading.
//
// 1. IT ATE DANISH DATES. `^\d+\.\s+` is the markdown numbered-list marker and
//    it is also, letter for letter, how Danish, German and Dutch write a date.
//    "1. maj er en helligdag" came out as "maj er en helligdag". The product is
//    a guide to Denmark; public holidays and festival dates are most of what it
//    says, and this ran on EVERY assistant message.
//
//    The guard is the month name, read from the same six-language vocabulary
//    the traveller parsers use, so "1. maj", "15. Mai" and "3. oktober" survive
//    while "1. Book the ferry first" is still stripped. It is not complete: "3.
//    sal" and "1. klasse" are ordinals too and still lose their number. The
//    month case is the one that was reaching readers.
//
// 2. IT PAIRED STRAY ASTERISKS ACROSS A SENTENCE. `\*(.+?)\*` matched from the
//    star in "a 4* hotel" to the star in "5* reviews", so a sentence about a
//    four-star hotel and five-star reviews came out about a 4 hotel and 5
//    reviews. Real italics have no whitespace immediately inside the markers,
//    which is what the \S anchors now require.
//
// 3. IT MISSED THE MOST COMMON BULLET THERE IS. The class was [-•], so a `* `
//    bullet, a `+ ` bullet and any indented bullet all survived, which is the
//    exact thing the function was added to remove.
// A numbered-list marker, EXCEPT when the thing after it is a month name, in
// which case it is a date somebody wrote the way most of Europe writes one.
const NUMBERED_LIST_RE = new RegExp(`^[ \\t]*\\d+\\.[ \\t]+(?!(?:${MONTH_PATTERN})\\b)`, "gmi");

export const stripMarkdown = (text) => {
  if (!text) return text;
  return text
    .replace(/^#{1,6}\s+/gm, "")                    // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")                 // bold
    .replace(/\*(\S(?:.*?\S)?)\*/g, "$1")            // italics, no space inside
    .replace(/^[ \t]*[-*+•]\s+/gm, "")              // bullets, indented or not
    .replace(NUMBERED_LIST_RE, "");                 // numbered lists, not dates
};


// ── AND IT COMPARED A UTC MIDNIGHT TO A LOCAL CLOCK ─────────────────
// `Math.ceil((new Date(d) - new Date()) / 86400000)` mixes two different kinds
// of thing: a stored date parsed as UTC midnight, and the actual instant right
// now. The remainder then depends on the time of day, so the answer changed as
// the evening wore on.
//
// Measured in New York at 22:20 on 15 August: daysUntil("2026-08-16") returned
// -0, so the Events grid pilled tomorrow's festival "Happening now" from about
// 20:00 every evening while the date printed beside it still read 16 Aug. The
// mirror case in Denmark is between midnight and 02:00, where an event on today
// reads "Tomorrow".
//
// Whole days between two calendar days now, so it is the same number all day
// and the pill agrees with the date next to it. `today` is a parameter for the
// reason the rest of this file already takes one.
export const daysUntil = (d, today = new Date()) => {
  const then = dayStart(d);
  if (!then) return NaN;
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((then.getTime() - now.getTime()) / 86400000);
};

// ── normName and dedupeAgainstExisting USED TO LIVE HERE ────────────
// They are gone, and the deletion is the fix, not a tidy-up.
//
// normName ran NFD and then stripped everything outside [a-z0-9 ]. NFD does not
// decompose æ, ø or å, so those letters survived the normalise and were then
// deleted as punctuation: "Ærø" came out as "r", "Møn" as "mn", "Læsø" as "ls".
// dedupeAgainstExisting dropped any candidate whose normalised name contained an
// existing one, so with Ærø published it discarded every discovery result with
// the letter r in it. Four of five, on a realistic list, and counted nowhere.
// Worst precisely for the small-island content discovery targeting exists to find.
//
// utils/danishNames.js has held a correct fold the whole time, and
// utils/discovery.js had isAlreadyCovered built on top of it: written, tested,
// and imported by nothing. The single answer now lives there as
// splitAlreadyCovered. Two functions answering one question is how they came to
// disagree, so one of them had to go rather than be repaired in parallel.

export const getEnclosingJSONStringBounds = (text, index) => {
  let start = index;
  while (start > 0 && !(text[start] === '"' && text[start - 1] !== "\\")) start--;
  let end = index;
  while (end < text.length && !(text[end] === '"' && text[end - 1] !== "\\")) end++;
  return { start: start + 1, end };
};

export const nextWeekdayTimestamp = (dayOfWeek, hour) => {
  const now = new Date();
  const d = new Date(now);
  let diff = (dayOfWeek - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7; // always the NEXT occurrence, not today
  d.setDate(now.getDate() + diff);
  d.setHours(hour, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
};

// Realistic stay-duration by category — never let the model guess this from
// language probability (which is how a "Half day" ended up attached to a
// hot dog stand with no seats). Applied AFTER the draft, keyed off the
// category the AI itself determined, overriding whatever it guessed.
//
// ── AND FOOD LOST IT ALTOGETHER, 17 AUG 2026 ──────────────────────
// Oliver: "At food, let's get rid of the 'time needed' section.. it's stupid
// tbh." He is right, and the reason is stronger than stupid. These were the
// branches that stood here:
//
//   if (/hot dog|stand|kiosk/.test(c)) return "15 to 30 mins";
//   if (/bakery|café|coffee/.test(c))  return "30 to 45 mins";
//   return "60 to 90 mins";
//   if (studioType === "foodStreet")   return "60 to 120 mins";
//
// So the figure a reader saw on a food entry was never researched. The writer's
// estimate was asked for, paid for, and then overwritten by one of four constants
// picked by matching a word in the category, and every food street in the country
// showed the same "60 to 120 mins" because that branch never even read the
// category. A constant rendered as a fact about one place, in an At a Glance card
// beside a real price and a real neighbourhood, is the invented number this app
// exists to refuse. It is also unfixable rather than wrong: how long a meal takes
// is decided by the person eating it.
//
// Gone from the prompt, from shapeForLive, from the codegen, from the card, and
// these two branches with it. `free` keeps its mapping, because a castle really
// does take longer than a public square and that is a fact about the place.
// stayDurationForCategory lived here until 19 Aug 2026. It answered "how long
// does this take" with one of three hardcoded strings chosen by a regex over a
// category word, and publishDraft wrote its answer over whatever the writer had
// estimated. Oliver: "I think we should get rid of 'time-needed'." Deleted
// rather than left unwired: this codebase has found five duplicated or
// never-wired helpers in two weeks, and every one of them looked harmless the
// day before it was used by mistake.

export const parsePrice = (str) => {
  if (!str) return 0;
  const m = str.replace(/,/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const d = R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return d < 1 ? Math.round(d*1000)+"m" : d.toFixed(1)+"km";
};
export const getDistanceRaw = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ── 3D TILT (shared) ─────────────────────────────────────────
// Redesign pass: cards tilt toward the cursor in real 3D with no library and
// no re-renders — handlers write transforms straight onto the element. Touch
// devices never fire mousemove, so phones are unaffected.
export const tiltMove = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  el.style.transform = `perspective(950px) rotateX(${((0.5 - py) * 5).toFixed(2)}deg) rotateY(${((px - 0.5) * 7).toFixed(2)}deg) translateY(-2px)`;
};
export const tiltLeave = (e) => { e.currentTarget.style.transform = ""; };

// ── What kind of arrival point is this, actually? ──────────────────
// Oliver, 5 Aug 2026: "if the nearest station is just a terminal and bus stop,
// then the 'station' just gotta be changed to terminal and bus stop."
//
// The At a Glance row was hardcoded to 🚆 "Nearest Station" for every content
// type, so a value like "Sælvig Ferry Terminal" was presented under a train
// icon and the word Station. The value was true and the label was not, which
// is the kind of small wrongness that makes someone stand on a quay looking
// for a platform.
//
// The value itself is never rewritten, only labelled for what it is. Order
// matters: ferry beats bus beats train, because a value like "Bus to Sælvig
// Ferry Terminal" is fundamentally a ferry arrival. Danish and English terms
// both, since published entries genuinely use both.
//
// ── AND THE FALLBACK IS "STOP", NOT "STATION" ──────────────────────
// Oliver, 7 Aug 2026: "Maybe it shouldn't be nearest station, but nearest stop.
// If it's an Island, this will often be awkward."
//
// Right, and the awkwardness is not cosmetic. "Nearest Station" on an Ærø or
// Samsø page promises a platform that does not exist anywhere on the island.
// The specific labels below stay, because when we DO know it is rail, "Nearest
// Station" is the more useful word. What changes is the case where we do not
// know: that now reads Nearest Stop, which is true of a platform, a quay and a
// roadside shelter alike.
//
// The optional `kind` argument comes from geo.js, which knows the answer from
// the Places category rather than from guessing at a name. When it is present
// it wins; when it is absent the name is read, which is all any of the already
// published entries can offer.
const ARRIVAL_BY_KIND = {
  rail:  { icon: "🚆", label: "Nearest Station" },
  ferry: { icon: "⛴", label: "Ferry Terminal" },
  bus:   { icon: "🚌", label: "Nearest Bus Stop" },
  air:   { icon: "✈️", label: "Nearest Airport" },
};

// ── WHO GETS AN ARRIVAL POINT, AND WHY A TOWN DOES NOT ──────────────
// Oliver, 8 Aug 2026, looking at the published Copenhagen entry:
//   "nearestStation on a capital city is weird tbh. With major cities, that is
//    just odd. Maybe leave out nearest station on towns."
//
// He is right, and the reason is worth writing down because it is not about
// Copenhagen. For an attraction, a workshop, a restaurant or a festival, the
// nearest stop is a real answer to a real question: that place sits at one point
// on the map and there is one sensible way to arrive at it.
//
// A TOWN IS NOT A POINT. It is the destination itself, and it has as many
// arrival points as it has edges. The stored Copenhagen row said
//   "nearestStation": "Nørreport (9 mins walk)"
// which is nine minutes' walk from the coordinate a geocoder happened to pick
// for the middle of a city of 660,000 people. It is a fact about that
// coordinate, not about Copenhagen, and it is misleading in the bargain:
// Nørreport is a local S-train stop, while the station a traveller actually
// plans a Copenhagen trip around is København H. The field was answering a
// question nobody asked with a value that was never checked against the
// question.
//
// What replaces it is what was already there and already true: travelTime says
// how long it takes to get there, region and mapHint say where it is, and the
// Reality Check paragraph says how you arrive in prose, where there is room to
// say "by ferry, twice a day" instead of naming a quay.
//
// KEPT for festivals and venues, because a festival ground genuinely is one
// point in a field somewhere and the nearest stop is the single most useful
// logistical fact about it.
// ── AND THE SET HAD TO MATCH THE SCHEMA, WHICH IT DID NOT ───────────
// 15 Aug 2026. This set held eight names in two different vocabularies, and
// three of them were false. `food`, `foodStreet` and `night` were listed as
// having an arrival field, and nearestStation is in NONE of their draft schemas
// and is dropped by shapeForLive for all three. Its only caller uses it to
// decide whether to tell the model "put ONLY that station name in the
// nearestStation field", so every restaurant, food street and bar draft was
// instructed to fill a field that could not publish, spending prompt on it and
// inviting an invention nothing downstream would catch.
//
// Three Studio types genuinely carry it, in both the schema and the shape:
// festival, free, booking.
//
// `craft` and `attraction` are the RENDER vocabulary rather than the Studio
// one, kept deliberately and named as such, because DetailPage asks this same
// question about a place it is drawing, where a workshop is "craft" and a free
// attraction is "attraction". Both of those do have the field. Every entry
// below is now true of the thing it names, which is the only property that made
// this set worth having.
export const ARRIVAL_TYPES = new Set(["festival", "free", "booking", "craft", "attraction"]);
export const hasArrivalField = (type) => ARRIVAL_TYPES.has(String(type || ""));

export const arrivalRow = (value, kind) => {
  const v = String(value || "").toLowerCase();
  if (kind && ARRIVAL_BY_KIND[kind]) return { ...ARRIVAL_BY_KIND[kind], value };
  if (!v.trim()) return { icon: "🚆", label: "Nearest Stop", value };
  // ── AIRPORT BEFORE FERRY, AND \bhavn NOT havn ──────────────────
  // Found by the tests on 7 Aug, and it had been shipping the whole time:
  // "Billund Lufthavn" was labelled a Ferry Terminal, because "lufthavn" ends in
  // the Danish word for harbour. So did "København H", for the same reason
  // hiding inside the city's name. Both are among the most likely arrival
  // points in the country, and both were being sent to a quay.
  //
  // Two fixes, because either alone leaves the other case broken: airport is
  // tested first, and the harbour pattern now requires a word boundary before
  // "havn" so it matches "Hou Havn" and refuses "lufthavn" and "København".
  // (Danish letters are non-word characters to \b, so this had to be checked
  // rather than assumed: in "københavn" the h follows an n, which is a word
  // character, so no boundary exists there. It holds.)
  if (/airport|lufthavn/.test(v)) return { icon: "✈️", label: "Nearest Airport", value };
  if (/ferry|færge|faerge|terminal|\bhavn(en)?\b|harbour|harbor|quay|kaj\b/.test(v)) {
    return { icon: "⛴", label: "Ferry Terminal", value };
  }
  if (/bus stop|busstop|busstoppested|stoppested|rutebil|coach stop/.test(v)) {
    return { icon: "🚌", label: "Nearest Bus Stop", value };
  }
  // "Bus" without "stop" usually means a bus route serves it, still not a train.
  if (/\bbus\b|\bcoach\b/.test(v) && !/station|banegård|banegaard/.test(v)) {
    return { icon: "🚌", label: "Nearest Bus Stop", value };
  }
  if (/metro/.test(v)) return { icon: "🚇", label: "Nearest Metro", value };
  // "København H" and "Aarhus H" are the real names of those two stations: H is
  // short for hovedbanegård, central station. Without this they read as an
  // unknown stop, which is a strange thing to say about the busiest railway
  // station in the country. Same for the "St." suffix on smaller ones.
  if (/station|banegård|banegaard|\bst\.?$|\bh$/.test(v)) return { icon: "🚆", label: "Nearest Station", value };
  // Something real, but nothing in the name says what it is. Do not promise a
  // platform.
  return { icon: "📍", label: "Nearest Stop", value };
};

// ── When a transit query should pretend to depart ──────────────────
// A Google Directions transit query with NO departure_time means "if you left
// right this second". That is almost never the question being asked, and it
// caused the worst accuracy bug of the 5 Aug 2026 session: published town travel
// times were whatever Google returned at the accidental moment a draft ran.
// Measured live at 22:38 against the same routes anchored to a weekday morning:
// Nysted 6h08 vs 2h03, Thorup Strand 12h27 vs 7h08, Møgeltønder 5h53 vs 4h39,
// Ribe 4h40 vs 3h33, Ærøskøbing 4h14 vs 3h04, Viborg 5h47 vs 5h01. Every single
// one inflated, because late-evening timetables are sparse.
//
// The next Tuesday at 09:00: a plain weekday mid-morning. No rush hour, no
// weekend timetable, no public holiday, and it is the journey a traveler
// actually makes. Reproducible within a week, which also means two runs of the
// same draft agree with each other.
//
// ONLY for transit. Driving is deliberately left unanchored, because without
// departure_time Google returns its typical duration rather than a live-traffic
// snapshot, and a typical duration is the right thing to publish.
// ── ASK GOOGLE ABOUT THE RIGHT DAY ──────────────────────────────────
// Oliver, 11 Aug 2026: "How do we make Gemlyx act as intelligent as Google AI
// on Google? Google AI has access to Google maps and always seem to be very
// strong on logistics."
//
// Part of the answer is that Google is not reasoning better, it is reading the
// timetable. But part of it was that Gemlyx was asking about the wrong day.
//
// This anchored EVERY transit query to next Tuesday at 09:00, including every
// leg of a real traveller's real itinerary. Meanwhile fetchGuideWeather, called
// FOUR LINES LATER in the same function, already took the trip's real arrival
// date and fetched the forecast for the right days. So a guide for a Sunday in
// January showed January's weather over a Tuesday-in-August timetable.
//
// In Denmark that is not a rounding error. Sunday service is thinner across the
// regional network, several routes do not run at all, and seasonal ferries stop
// for the winter. A Tuesday-morning answer about a Sunday in January is the
// wrong answer delivered confidently, which is the thing this codebase exists
// to avoid.
//
// EACH LEG GETS ITS OWN DAY, because a five-day trip crosses a weekend and day
// four's Sunday bus is a different question from day one's Wednesday train.
export const transitDepartureAnchor = (tripDate, dayOffset = 0) => {
  if (tripDate) {
    const d = new Date(tripDate);
    if (!Number.isNaN(d.getTime())) {
      d.setDate(d.getDate() + (Number(dayOffset) || 0));
      d.setHours(9, 0, 0, 0);
      // Google rejects a departure_time in the past, so a trip already under
      // way, or one whose date has slipped, falls back rather than erroring.
      // Falling back is honest: it is a generic answer, and it says so by being
      // the same generic answer every other undated query gets.
      if (d.getTime() > Date.now()) return Math.floor(d.getTime() / 1000);
    }
  }
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 2);
  return Math.floor(d.getTime() / 1000);
};

// Appends the anchor only for a transit leg, so call sites stay one-liners and
// cannot accidentally anchor a driving query.
export const departureParam = (mode, tripDate, dayOffset) =>
  (mode === "transit" ? `&departure_time=${transitDepartureAnchor(tripDate, dayOffset)}` : "");

// ── Is this domain literally the place's own name ───────────────────
// Oliver, 6 Aug 2026, on the Aarhus Festuge draft that published with an empty
// website field: "how could it not find the website of aarhus festuge.. it was
// literally called that as a website."
//
// He is right, and the failure is not a search failure. A query for the
// official site of a well-known Danish festival returns aarhusfestuge.dk near
// the top. The URL was almost certainly in the research. What failed is that
// the WRITER was asked to pick the official site out of a list, and it declined
// to commit, which is the safe behaviour we deliberately trained into it
// everywhere else.
//
// So this stops asking. A domain that IS the name, with the punctuation and the
// Danish letters normalised out, is not a judgement call: aarhusfestuge.dk for
// "Aarhus Festuge" is the same string. That gets applied in code, like the
// coordinates and the travel time, and the model is left out of it.
//
// Deliberately strict about short names. A three-letter place name would match
// half the internet on a substring rule, so containment needs at least six
// characters on the side doing the containing.
export const hostMatchesName = (url, name) => {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  host = host.replace(/^www\./, "");
  const bare = host.replace(/\.(dk|com|net|org|eu|info|travel)$/i, "").replace(/[^a-z0-9]/g, "");
  const n = String(name || "").toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/[^a-z0-9]/g, "");
  if (!bare || !n) return false;
  if (bare === n) return true;
  if (n.length >= 6 && bare.includes(n)) return true;
  if (bare.length >= 6 && n.includes(bare)) return true;
  return false;
};

// Aggregators, booking sites and social platforms are never "the official
// site", however well their URL happens to match. Kept next to the matcher so
// the two cannot drift apart.
//
// THE EXPERIENCE RESELLERS WERE MISSING FROM THIS LIST. Added 7 Aug 2026, the
// same hour GetYourGuide became a required research source: the two changes
// have to land together. Telling the pipeline to go and read getyourguide.com
// for every attraction, while this list still let a getyourguide.com URL
// through as an official website, would have put a checkout page in the field
// that is supposed to send a reader to the museum. Viator, Tiqets and Headout
// are the same business and were missing for the same reason.
const NOT_OFFICIAL = /facebook|instagram|tripadvisor|booking\.com|expedia|getyourguide|viator|tiqets|headout|klook|musement|wikipedia|wikimedia|youtube|tiktok|eventbrite|ticketmaster|billetlugen|visitdenmark|visitaarhus|google\.|yelp|foursquare|reddit/i;

// The first candidate URL whose domain is the name. Returns null rather than a
// best guess, because an empty website field is honest and a wrong one is not.
export const officialSiteFromCandidates = (candidateUrls, name) => {
  for (const u of candidateUrls || []) {
    if (typeof u !== "string") continue;
    if (NOT_OFFICIAL.test(u)) continue;
    if (hostMatchesName(u, name)) {
      // Normalise to the site root. A deep link into a programme page ages out
      // in a season; the domain does not.
      try { const p = new URL(u); return `${p.protocol}//${p.hostname}`; } catch { return u; }
    }
  }
  return null;
};

// ── Danish alphabetical order ───────────────────────────────────────
// Oliver, 7 Aug 2026, relaying a friend's review of the site: "We need
// alphabetical order."
//
// It has to be DANISH alphabetical, not a plain sort. Æ, Ø and Å come after Z
// in Danish, so a default sort files Ærø, Ørsted and Ålborg up among the A's
// and O's, which is the one ordering mistake a Danish reader spots instantly on
// a site about Denmark. Å and the older spelling Aa are the same letter, and
// the Danish collator already knows it, so Aarhus lands with Århus instead of
// at the very top of every list.
//
// numeric:true so "Café 2" comes before "Café 10". sensitivity:"base" so case
// and spelling variants of the same word sit together rather than splitting the
// list in two.
export const daCompare = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), "da", { sensitivity: "base", numeric: true });

// The usual case: a list of content rows, ordered by the name a reader reads.
export const byName = (a, b) => daCompare(a?.name, b?.name);

// ── IS THIS A GOOD TIME TO GO ───────────────────────────────────────
// Oliver, 7 Aug 2026: "it has to be places that are considered great during the
// season. Visiting Bonbon Land during winter is not great."
//
// THE RULE THAT KEEPS THIS HONEST: this only ever says "not now" when the entry
// itself gives a POSITIVE reason to think so. Silence is never treated as
// evidence. An entry with nothing to say about seasons comes back "unknown" and
// is left alone, because demoting a perfectly good year-round place on a guess
// is the same class of mistake as recommending a closed water park, and this
// app does not get to make either one quietly.
//
// Two signals, both read off text the entry already carries:
//   1. It says so. "Year-round" is a clear yes. A named open season, "open May
//      to September", is a clear window.
//   2. It is obviously an outdoor summer thing. A Danish sommerland, a water
//      park, a beach, a lido, an open-air pool. These are not open in January
//      and everyone in Denmark knows it, which is exactly why a guide that
//      suggests one in January looks like it has never been there.
// And the reverse: a Christmas market is wonderful in December and meaningless
// in June.
const MONTH_WORDS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Outdoor and warm-weather by nature. Deliberately short and specific: every
// word here is a thing that genuinely shuts or stops being pleasant in a Danish
// winter. Museums, castles, bars and restaurants are NOT on this list, because
// they are fine in February and a longer list would start guessing.
const SUMMER_ONLY = /\b(sommerland|summerland|water\s?park|vandland|aquapark|amusement park|theme park|forlystelsespark|tivoli friheden|beach|strand(en)?\b|lido|open-air pool|friluftsbad|outdoor pool|badeland|mini ?golf|surf|kayak|kajak|camping|campsite|teltplads)\b/i;
const WINTER_ONLY = /\b(christmas market|julemarked|jul(e|emarked)?\b.*market|advent|christmas fair|ice rink|skøjtebane|winter market)\b/i;
const YEAR_ROUND  = /\b(year[-\s]?round|all year|open all year|hele året|året rundt)\b/i;

// Danish summer, generously: the parks are typically open from spring holidays
// to the end of the school break, so May through September is the honest window
// rather than a meteorological one.
const SUMMER_MONTHS = [4, 5, 6, 7, 8];      // May..September, zero indexed
const WINTER_SEASON = [10, 11];             // November, December

export const seasonFit = (item, month) => {
  const m = Number.isFinite(month) ? month : new Date().getMonth();
  const text = [item?.bestTimeGlance, item?.desc, item?.type, item?.category, item?.name, item?.tag,
    ...(Array.isArray(item?.thingsToKnow) ? item.thingsToKnow : [])].filter(Boolean).join(" ").toLowerCase();
  if (!text) return { fit: "unknown", why: "" };

  if (YEAR_ROUND.test(text)) return { fit: "good", why: "open year round" };

  if (WINTER_ONLY.test(text)) {
    return WINTER_SEASON.includes(m)
      ? { fit: "good", why: "this is its season" }
      : { fit: "poor", why: "a Christmas market outside December" };
  }
  if (SUMMER_ONLY.test(text)) {
    return SUMMER_MONTHS.includes(m)
      ? { fit: "good", why: "this is its season" }
      : { fit: "poor", why: "an outdoor summer place in the cold half of the year" };
  }

  // "Open May to September", "best June to August". Only trusted when the text
  // is actually talking about opening or the best time, so a passing mention of
  // a month in a history sentence cannot close a place for nine months.
  const windowish = /\b(open|opens|opening|season|best time|best in|closed)\b/i.test(text);
  if (windowish) {
    const named = MONTH_ABBR.map((a, i) => (text.includes(MONTH_WORDS[i]) || new RegExp(`\\b${a}\\b`).test(text) ? i : -1)).filter(i => i >= 0);
    // Two or more named months read as a range. One is an anecdote.
    if (named.length >= 2) {
      const lo = Math.min(...named), hi = Math.max(...named);
      const inWindow = m >= lo && m <= hi;
      return inWindow ? { fit: "good", why: "inside its stated season" } : { fit: "poor", why: "outside the season the entry names" };
    }
  }
  return { fit: "unknown", why: "" };
};

// Sorting helper: good first, unknown next, out of season last. Used to shape
// the front page picks without ever hiding something outright on a guess.
export const seasonRank = (item, month) => ({ good: 0, unknown: 1, poor: 2 }[seasonFit(item, month).fit]);

// ── WHAT THE RANDOM-GUIDE TEST ACTUALLY PICKED ─────────────────────
// Oliver, 7 Aug 2026, on the preview screen: "we definitely gotta fix that."
// The card read "4 days, based around , into coastal views and local food",
// with nothing between "around" and the comma.
//
// The blank is my fault and it is the visible half of a deliberate change. The
// random brief used to NAME published entries ("the person wanted Amalienborg
// and Planetarium included"), which pre-solved the hardest thing the pipeline
// does, so it stopped naming them. Two screens were printing that list, and
// only one of them was updated.
//
// So the description lives HERE now, in one place both screens read, because
// two copies of the same sentence built from the same object will drift again
// the next time the object changes. Anything the profile does not carry is
// simply left out rather than printed as an empty gap.
export const testTravelerLine = (p) => {
  if (!p) return "";
  return [
    typeof p.days === "number" ? `${p.days} day${p.days !== 1 ? "s" : ""}` : null,
    // The arrival DATE, which the brief now always carries. Without it on the
    // card there is no way to tell a dateless test run from a dated one, and a
    // dateless run is the bug this was added to make impossible.
    p.arrivingOn ? `arriving ${p.arrivingOn}` : null,
    p.who,
    p.arrival,
    p.transport,
    p.moving,
    (p.interests || []).length ? `into ${(p.interests || []).join(" and ")}` : null,
    p.budget && p.budget !== "unstated" ? p.budget : null,
  ].filter(Boolean).join(" · ");
};

// ── THE DASH BAN, ENFORCED RATHER THAN REQUESTED ───────────────────
// Five em dashes shipped inside a saved guide payload on 7 Aug, in text a
// traveler reads. The rule is in every prompt in this project and has been for
// weeks. Asking a model not to do something is not a guarantee, and this
// project already has a standing rule for exactly that situation: anything the
// system knows is enforced in code, never requested in a prompt.
//
// A dash is not simply deleted. "Faxe is on Zealand, Ærø is off Funen — so this
// is a cross country trip" has to keep reading as a sentence, so a dash acting
// as punctuation becomes a comma and a dash acting as a range becomes "to".
// Hyphens are untouched, because "63-million-year-old" is correct.
const EN = "\u2013", EM = "\u2014", MINUS = "\u2212", HORIZ = "\u2015";
// NOT global, and that is the entire point. A /g/ regex carries lastIndex
// between calls, so using one as a guard makes .test() alternate true and false
// across strings and silently skip every other one. Caught by the first run of
// this function: "12–15 minutes" came back untouched purely because the string
// before it had matched. The replacements below are built fresh per call.
const HAS_DASH = new RegExp(`[${EN}${EM}${MINUS}${HORIZ}]`);
export const stripDashes = (text) => {
  if (typeof text !== "string" || !HAS_DASH.test(text)) return text;
  return text
    // 12–15, 2024–2026, 09:00–17:00: a range, and the word is "to".
    .replace(new RegExp(`(\\d)\\s*[${EN}${EM}${MINUS}${HORIZ}]\\s*(\\d)`, "g"), "$1 to $2")
    // ── THE TWO RULES BELOW WERE ADDED 12 AUG, FROM THE LIVE ROWS ───
    // Before wiring stripDashes to published content I ran it over all 72
    // dashes that were actually live, and the comma rule further down was
    // wrong on eleven of them. It is right for an em dash and wrong for an en
    // dash, because those are two different marks doing two different jobs:
    //
    //     "495 DKK – 595 DKK"    →  "495 DKK, 595 DKK"      TWO PRICES
    //     "May 1 – August 31"    →  "May 1, August 31"      two dates
    //     "Moderate–High"        →  "Moderate, High"        two ratings
    //     "Mid-June–Sept"        →  "Mid-June, Sept"        two months
    //     "Rødekro–Kliplev"      →  "Rødekro, Kliplev"      two towns
    //
    // Every one is a range or a route, and the price one is the reason this
    // could not ship as it was: a reader shown "495 DKK, 595 DKK" reads two
    // prices, which is a worse error than the dash it replaced.
    //
    // A range whose ends carry a unit or a month name. EN DASH ONLY, because
    // with an em dash "200 DKK — about 25 euros" is punctuation and this rule
    // would turn it into a range.
    .replace(new RegExp(`(\\d\\s*[A-Za-zÆØÅæøå.%]{0,6})\\s*[${EN}${MINUS}${HORIZ}]\\s*([A-Za-zÆØÅæøå.]{0,9}\\s*\\d)`, "g"), "$1 to $2")
    // And an UNSPACED en dash between two words, which is a range or a route.
    // Unspaced only: a SPACED en dash is British punctuation and the comma is
    // right for it ("serene beaches – a true escape" is on the site too).
    .replace(new RegExp(`([\\wÆØÅæøåéèü])[${EN}${MINUS}${HORIZ}]([\\wÆØÅæøåéèü])`, "g"), "$1 to $2")
    // Spaced, or hugging a word on both sides: punctuation. A comma carries it.
    .replace(new RegExp(`\\s*[${EN}${EM}${MINUS}${HORIZ}]\\s*`, "g"), ", ")
    // Two clauses now separated by ", ," or a comma landing before another one.
    .replace(/,\s*,+/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*([.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
};

// Walks a whole guide object and cleans every string a traveler can read.
// Deliberately recursive and type-blind: the guide shape has grown several
// times this month, and a hand-listed set of fields would miss the next one.
export const stripDashesDeep = (value) => {
  if (typeof value === "string") return stripDashes(value);
  if (Array.isArray(value)) return value.map(stripDashesDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // Keys beginning with _ are machinery, not prose: coordinates, cached
      // durations, the raw conversation. Leave them exactly as they are.
      out[k] = k.startsWith("_") ? v : stripDashesDeep(v);
    }
    return out;
  }
  return value;
};
