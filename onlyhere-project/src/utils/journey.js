// ── WHAT A MEASURED JOURNEY ACTUALLY MEASURES ───────────────────────
//
// Oliver, 8 Aug 2026: "transport is constantly somewhat wrong. I don't
// understand why that is." With two examples from one draft:
//
//   "Direct trains run from København H to Odense in about 1h50min"
//        the Lyntog is about 1h22
//   "Odense railway station is about 5 minutes on foot from the city centre"
//        the station IS the city centre
//
// Both come from the same place, and the measurement is not wrong. The DRAFTING
// PIPELINE asks Google Directions for
//
//   origin      55.6761,12.5683   a point in central Copenhagen, not København H
//   destination the geocoded centroid of the town, not its station
//
// so the figure it gets back is DOOR TO DOOR: walk to the station, wait for the
// departure, ride, walk from the arrival station to wherever a geocoder decided
// the middle of the town is. For Copenhagen to Odense that is legitimately about
// 1h50 while the train itself is about 1h22. Then the writer was handed that
// number under the heading "BY PUBLIC TRANSPORT" and told to use it "for
// anything you say about getting there", so it wrote a sentence about TRAINS and
// attached a DOOR TO DOOR figure to it.
//
// This is the ranking bug wearing a timetable. The house rule already says a
// superlative is only true against a stated measure; a duration is exactly the
// same. 1h50 is true door to door and false for the train, and the sentence did
// not say which one it meant, so it could not be checked and it read as wrong to
// anyone who has taken the train.
//
// The second error is the same number's other half. The walk at the ends is
// measured from a geocoded CENTROID, which for a city of any size is an
// arbitrary point somebody's geocoder picked. "Five minutes from the city
// centre" is not a fact about Odense station, it is a fact about that point, and
// it is the "Nørreport, 9 mins walk" nearest-stop bug again in prose.
//
// So: split the journey into its named parts, hand the writer all of them with
// their names attached, and forbid the two sentences that conflate them. The
// numbers were always in the response; only the total was being passed on.

import { durationsIn } from "./claimCheck";
import { containsName } from "./danishNames";
// The stored journey's date is a calendar DAY, written by dayKey, so it is read
// and printed by the same file that wrote it. See journeyStamp at the end.
import { dayStart, dayLabel } from "./calendarDay";
// One threshold for "too old to state as current", shared with the page reader
// rather than redeclared here. See journeyStamp.
import { MAX_FACT_AGE_MONTHS } from "./pageScan";
// ── ONE LIST OF FERRY WORDS, READ TWICE ─────────────────────────────
// FERRY_TEXT is the union seven separate patterns in this codebase were each
// reaching for, and helpers.js records what the split cost: a leg saying "boat"
// made the trip summary announce a crossing while the book-before-you-go list
// left it out, from two reads of the SAME field 34 lines apart. This file had
// an eighth copy, below, and it was missing "boat" and "sail" exactly as the
// others had been. geo.js makes the argument in one line: two lists of Danish
// transport nouns will always drift, and one list read twice cannot.
import { FERRY_TEXT } from "./helpers";

const mins = (s) => (Number.isFinite(Number(s?.mins)) ? Number(s.mins) : 0);

// Google's vehicle types, in the words a traveller uses.
const VEHICLE_WORD = {
  HEAVY_RAIL: "train", COMMUTER_TRAIN: "train", HIGH_SPEED_TRAIN: "train", LONG_DISTANCE_TRAIN: "train",
  RAIL: "train", METRO_RAIL: "metro", SUBWAY: "metro", TRAM: "tram", LIGHT_RAIL: "tram",
  BUS: "bus", INTERCITY_BUS: "bus", TROLLEYBUS: "bus", SHARE_TAXI: "bus",
  FERRY: "ferry", CABLE_CAR: "cable car", FUNICULAR: "funicular",
};
export const vehicleWord = (v) => VEHICLE_WORD[String(v || "").toUpperCase()] || "";

// Splits one Directions leg into the parts a sentence can honestly be built on.
// Returns null when there are no steps to read, because a made-up breakdown is
// worse than none: the caller then says only what it really has.
export const journeyParts = (steps, totalMinutes) => {
  const list = Array.isArray(steps) ? steps : [];
  if (!list.length) return null;
  const rides = list.filter(s => s.mode === "transit" && mins(s) > 0);
  const walks = list.filter(s => s.mode === "walking" && mins(s) > 0);
  const onBoard = rides.reduce((n, s) => n + mins(s), 0);
  const onFoot = walks.reduce((n, s) => n + mins(s), 0);
  const longest = rides.slice().sort((a, b) => mins(b) - mins(a))[0] || null;
  const total = Number.isFinite(Number(totalMinutes)) ? Number(totalMinutes) : onBoard + onFoot;
  return {
    total,
    onBoard,
    onFoot,
    // WAITING IS THE REST, and naming it matters: it is usually the difference
    // between the timetable and the journey, and it is the part a traveller can
    // shrink by checking departures. Never negative, because rounding each step
    // to whole minutes can otherwise overshoot the total by one.
    waiting: Math.max(0, total - onBoard - onFoot),
    changes: Math.max(0, rides.length - 1),
    // ── WHERE YOU CHANGE, NOT JUST HOW OFTEN ────────────────────────
    // Oliver, 12 Aug 2026, on an Esbjerg draft: "We got maps directions.."
    // The draft said "one change in Odense", which is right, and nothing in
    // this file could have told it so. `changes` was a COUNT and the only
    // place a station name survived was the longest leg's endpoints, so the
    // interchange had to be inferred. It happened to be inferred correctly.
    // Getting the right answer from a guess is not the same as knowing, and
    // the name was in the response the whole time: you get off ride i at
    // rides[i].to and onto ride i+1 there.
    interchanges: rides.slice(0, -1).map(s => s.to || "").filter(Boolean),
    longest: longest ? { mins: mins(longest), vehicle: vehicleWord(longest.vehicle), line: longest.line || "", from: longest.from || "", to: longest.to || "" } : null,
    // ── AND EVERY LEG, IN ORDER, WHICH IS THE ACTUAL GUIDE ──────────
    //
    // Oliver, 13 Aug 2026: "Why it is that our drafts refuse to give the reader
    // a proper guide for transport."
    //
    // Part of the answer is right here. Everything above this line is a
    // SUMMARY: how long, how many changes, where you change, and the single
    // longest ride. A reader does not want the longest ride. They want the
    // sequence: this train to there, then that bus to there, then the walk.
    // Google returns exactly that, and it was being reduced to a maximum.
    //
    // Ordered, whole and unsummarised, so whatever renders it can say the thing
    // a person actually needs and nothing has to infer a leg it was never
    // given. Same reason `interchanges` was added on 12 August: the names were
    // in the response the whole time.
    legs: rides.map(s => ({
      vehicle: vehicleWord(s.vehicle), line: s.line || "",
      from: s.from || "", to: s.to || "", mins: mins(s),
      // ── WHO RUNS IT, WHICH IS A LICENCE TERM AND ALSO USEFUL ────────
      // 17 Aug 2026. Google's Directions policy requires an application
      // displaying these results to "display the names and URLs of the transit
      // agencies that supply the trip results", and this function was dropping
      // the agency on the floor: api/directions.js has captured the name since 6
      // August and the leg it built here never carried it.
      //
      // It is worth having for its own sake too. "train IC 137 to Odense St."
      // becomes something a traveller can act on when it says DSB and links to
      // the timetable, and this app already believes that: operators.js exists to
      // name an operator per leg, by inference, from the towns. This is the same
      // answer from the source that actually knows.
      agencies: (Array.isArray(s.agencies) ? s.agencies : [])
        .map(a => ({ name: String(a?.name || "").trim(), url: String(a?.url || "").trim() }))
        .filter(a => a.name)
        .slice(0, 3),
    })),
    vehicles: [...new Set(rides.map(s => vehicleWord(s.vehicle)).filter(Boolean))],
  };
};

const hm = (n) => {
  const t = Math.max(0, Math.round(Number(n) || 0));
  const h = Math.floor(t / 60), m = t % 60;
  return h ? `${h}h${m ? ` ${m}min` : ""}` : `${m}min`;
};

// ── WHERE THE JOURNEY PUTS YOU DOWN ─────────────────────────────────
//
// Oliver's Græskarfestival draft, 14 Aug 2026:
//
//   "nearestStation": "Agersø Omø Færgerne"
//
// which is a car ferry slip to two islands in the Great Belt. A reader sent
// there to reach a pumpkin festival in the middle of Skælskør has been sent to
// the wrong side of the water for the wrong reason.
//
// AND NOTHING IN THAT DRAFT WAS BROKEN EXCEPT THE QUESTION BEING ASKED.
// nearestStationName does exactly what it says: the closest place carrying a
// transit type. ferry_terminal is a transit type, correctly, and the slip is
// genuinely the nearest one to Havnevej. The function is right. "Nearest
// transit infrastructure by distance" is simply not the question a traveller
// has, and it never was: a freight siding, a park and ride nobody uses and an
// island ferry all win it, and none of them is where you get off.
//
// THE ANSWER WAS ALREADY IN THE SAME PAYLOAD, THREE TIMES OVER. The draft's own
// __journey ends:
//
//   { vehicle: "bus", line: "470R",
//     from: "Slagelse St. (Ndr.Stationsvej)",
//     to:   "Skælskør Busterminal (Stationsvej)", mins: 34 }
//
// The model independently wrote "Skælskør Busterminal" into the field and had
// it stripped for carrying advice alongside it. And Google named the stop in
// the route it measured.
//
// So the nearest arrival point is not a radius search. IT IS WHERE THE MEASURED
// JOURNEY ENDS, which is measured, is the stop a person actually stands on, and
// cannot be won by a ferry slip that no itinerary uses.
//
// The trailing parenthetical is Google's transit feed disambiguating a stop by
// its street, so it is dropped for a field that wants a name. Nothing is lost:
// the full form stays in __journey where it was measured.
export const arrivalStop = (parts) => {
  const legs = Array.isArray(parts?.legs) ? parts.legs.filter(l => l && l.to) : [];
  if (!legs.length) return "";
  const last = String(legs[legs.length - 1].to || "").trim();
  // Only a TRAILING parenthetical, and only when something is left in front of
  // it. "Nørreport St. (Metro)" becomes "Nørreport St."; a stop whose whole
  // name is bracketed keeps it rather than becoming an empty string.
  const bare = last.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return bare || last;
};

// The block handed to the writer. Every figure carries the name of what it
// measures, which is the whole fix.
export const journeyBlock = (parts) => {
  if (!parts) return "";
  const bits = [`DOOR TO DOOR: ${hm(parts.total)}. This is the whole journey between a point in central Copenhagen and a point in the middle of the destination, INCLUDING the walk at both ends and the wait for the departure. It is the figure travelTime takes.`];
  if (parts.longest) {
    const l = parts.longest;
    bits.push(`ON BOARD: ${hm(parts.onBoard)} of that is actually moving${parts.changes ? `, across ${parts.changes + 1} legs with ${parts.changes} change${parts.changes === 1 ? "" : "s"}` : ""}. The longest single leg is ${hm(l.mins)}${l.vehicle ? ` by ${l.vehicle}` : ""}${l.line ? ` on ${l.line}` : ""}${l.from && l.to ? `, ${l.from} to ${l.to}` : ""}.`);
  }
  if (parts.interchanges?.length) {
    bits.push(`CHANGE AT: ${parts.interchanges.map(x => x.replace(/\.$/, "")).join(", then ")}. These are the interchange stations Google returned. Name them if you name any, and never name one that is not on this list.`);
  }
  if (parts.onFoot) bits.push(`ON FOOT: ${hm(parts.onFoot)} of walking across both ends combined. This is the walk at BOTH ends added together, measured to a geocoded centroid, so it is not "the station is N minutes from the centre" and must never be written as that.`);
  if (parts.waiting) bits.push(`WAITING: about ${hm(parts.waiting)} of connection and platform time.`);
  return bits.join("\n");
};

// ── AND NOW THE SAME THING WHERE IT CANNOT FAIL ─────────────────────
//
// Everything above is a PROMPT. The header of this file diagnosed the exact
// bug on 8 August and fixed it by explaining the difference to the model, and
// on 12 August an Esbjerg draft wrote "2h51min by train with one change in
// Odense" over a DOOR TO DOOR figure anyway. DSB's own page says the train is
// 2t 36min station to station; the 15 minutes are the walks. Neither number is
// wrong and the sentence does not say which it means, which is the same defect
// the header describes, four days and one explanation later.
//
// The first standing rule of this codebase is that anything the system already
// knows is enforced in code, because a request has a failure rate. The system
// knows: journeyParts holds every figure and every name. Nothing compared them
// to the sentence.

// Two passes so "3-hour-15-minute" and "51 mins" both read correctly without
// the minutes half of an H+M form being counted twice. Bare "m" is NOT a
// minute here: "500 m" is a distance, and reading it as eight hours of walking
// is a worse error than missing a duration written that way.
// ── BUILT ON THE EXTRACTOR THAT ALREADY EXISTS ──────────────────────
// The first version of this was a second duration parser with its own pair of
// regexes, written without checking, and the bundler caught it: claimCheck.js
// has exported durationsIn since it was written. That is the same mistake as
// the duplicate pricesIn earlier the same day, and this codebase's own note on
// that one says a second extractor would have been the seventh duplicated
// function of the week and a worse one. So this reads its tokens and adds the
// one thing it does not do.
//
// WHAT IT ADDS: composition. claimCheck reads "2 hours 51 mins" as two claims,
// which is right for its job, because it checks one duration against one
// distance in a sentence and a range like "10 to 15 minutes" is one claim
// centred on 12. Here "2 hours 51 mins" is ONE journey figure, and comparing
// 120 against a measured 171 would invent a disagreement out of English.
const JOINER = /^[\s-]*(?:and\s+)?$/;
const isHours = (tok) => /(hours?|hrs?)(?![a-z])/i.test(tok.raw) || /\d\s*h(?![a-z])/i.test(tok.raw);

export const journeyDurations = (text) => {
  const t = String(text || "");
  const toks = durationsIn(t);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i], b = toks[i + 1];
    const gap = b ? t.slice(a.at + a.raw.length, b.at) : null;
    // An hours token immediately followed by a minutes token, with nothing
    // between them but a space, a hyphen or "and", is one figure.
    if (b && isHours(a) && !isHours(b) && JOINER.test(gap)) {
      out.push({ at: a.at, mins: a.minutes + b.minutes, text: t.slice(a.at, b.at + b.raw.length).trim() });
      i++;
      continue;
    }
    // ── AND THE COMPACT FORM, WHICH IS WHAT THE DRAFTS ACTUALLY WRITE ──
    // Oliver's Esbjerg run of 12 Aug, with this gate live: "about 2h51 by
    // train" and "roughly 3h15 by car". No unit after the minutes, so there is
    // no second token to compose with, and "2h51" read as 2h. That produced
    // THREE false uncertainties on his draft AND hid the true one: 120 minutes
    // is nowhere near the 171 the route was measured at, so the door-to-door
    // conflation this gate exists to catch went unnoticed while it complained
    // about a figure nobody wrote. My tests used "2h51min", which the drafts
    // do not write.
    //
    // No space allowed before the digits: "2h51" is one figure, and "2h 51" on
    // its own is ambiguous enough that absorbing it would be a guess.
    if (isHours(a)) {
      const after = t.slice(a.at + a.raw.length);
      const c = after.match(/^(\d{1,2})(?!\w)/);
      if (c) {
        out.push({ at: a.at, mins: a.minutes + Number(c[1]), text: t.slice(a.at, a.at + a.raw.length + c[0].length) });
        continue;
      }
    }
    out.push({ at: a.at, mins: a.minutes, text: a.raw.trim() });
  }
  return out;
};

// A word that makes a sentence about being ON something rather than about the
// whole trip. "Togr" is not a typo: fold() maps ø to o, and Danish prose in
// this product mixes both spellings.
// ── AND IN DANISH, INCLUDING THE DEFINITE FORMS ─────────────────────
// This read /tog r?/ and could not match "toget", which is how a Danish
// sentence actually says "the train". A gate that silently stops checking half
// the prose in a Danish travel product is the fold() bug in api/commons-photo.js
// wearing a timetable. Found by writing the Danish test, not by reading it.
const RIDE_WORDS = /\b(train|rail|lyntog|intercity|bus(?:sen|ser)?|coach|ferry|metro(?:en)?|tram|tog(?:et|ene)?|f[æa]?erge[nr]?|færge[nr]?|faerge[nr]?)\b/i;
const DOOR_WORDS = /\b(door to door|door-to-door|all in|in total|altogether|including the walk)\b/i;
const DIRECT_WORDS = /\b(direct|non-?stop|straight through|without (?:a |any )?chang(?:e|es|ing)|no chang(?:e|es))\b/i;
const CHANGE_COUNT = /\b(?:(one|two|three|four|\d{1,2}))\s+chang(?:e|es)\b/i;
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4 };

const WALK_WORDS = /\b(walk|walks|walking|on foot|stroll)\b/i;
// "St." and "H" are how a Danish station is actually written on every sign and in
// every timetable — Aalborg St., Odense St., Aarhus H, København H. The list held
// only the spelled-out forms, so the rule below was reading English prose in a
// Danish product. Anchored on a preceding capitalised word so "st." inside an
// ordinary sentence cannot match.
const STOP_WORDS = /\b(station|banegård|banegaard|railway|rail stop|bus stop|terminal|platform)\b|[A-ZÆØÅ][\wÆØÅæøå-]+\s(?:St\.|H\b)/;

// ── "AALBORG ST." IS NOT THE END OF A SENTENCE ──────────────────────
//
// Found on the live Aalborg page, 25 Aug 2026. Its Reality Check reads:
//
//   "once you're there, Aalborg St. is a 7-minute walk from the centre so the
//    town itself is easy to cover on foot"
//
// and two paragraphs below, the page prints its own measurement: 16 minutes
// walking at BOTH ends together, and 7 minutes waiting and connecting. The
// 7-minute walk is the waiting time wearing a different hat.
//
// This is the third recorded instance of one bug. Odense: "the station is about
// 5 minutes on foot from the city centre", where the station IS the centre.
// Esbjerg: "the station is a 7-minute walk from the centre", where 7 happened to
// land within a minute of the measured waiting time and a bag-of-numbers check
// waved it through. The rule that catches it — a walk between a named stop and a
// town centre, which nothing in this pipeline measures — has been live since
// then. It did not fire on Aalborg, for two reasons, both in this file.
//
// ONE: THE SPLITTER CUT THE SENTENCE IN HALF. Every check here splits prose on
// `(?<=[.!?])\s+`, and "Aalborg St." ends in a full stop. So the walk landed in
// one fragment and the station in another, and a rule that needs both words in
// one sentence can never see them.
//
// TWO: "ST." IS NOT IN STOP_WORDS. It is how every Danish station is written —
// Aalborg St., Odense St., Aarhus H — and the list held only the spelled-out
// forms. A gate for Danish railway prose that cannot read a Danish railway
// abbreviation was checking English sentences in a Danish product.
//
// The splitter is shared now, so fixing it fixes all six call sites at once.
// Splitting on a period followed by a capital, EXCEPT after a known abbreviation
// and except after a single capital letter (which is an initial, not an end).
const ABBREV = /(?:^|\s)(?:st|sct|skt|hpt|str|nr|kl|ca|bl\.a|f\.eks|dvs|osv|ift|mr|mrs|ms|dr|prof|no|vs|approx|e\.g|i\.e|etc|jf|inkl|ekskl)\.$/i;

export const sentences = (text) => {
  const t = String(text ?? "");
  const out = [];
  let buf = "";
  // Split on the boundary, then glue back any piece whose end was an
  // abbreviation rather than a full stop.
  for (const piece of t.split(/(?<=[.!?])\s+/)) {
    buf = buf ? `${buf} ${piece}` : piece;
    // A single capital before the dot is an initial ("J. Bang"), never an end.
    if (ABBREV.test(buf) || /(?:^|\s)[A-ZÆØÅ]\.$/.test(buf)) continue;
    out.push(buf);
    buf = "";
  }
  if (buf) out.push(buf);
  // Empty input is no sentences, not one empty one. A caller iterating this and
  // testing every fragment gets a free pass on "" in every regex that allows it.
  return out.filter(x => x.trim());
};

const near = (a, b, slack = 2) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= slack;

// Interchange names come back as "Odense St." and get joined into a sentence
// that already ends in a full stop.
const stripDot = (s) => String(s || "").replace(/\.$/, "");

// Returns a list of problems, each already phrased as the sentence a reader
// would get in uncertainties. Empty list means the prose agrees with what was
// measured, which is a real answer and is logged as one.
// ── AND IT ONLY SPEAKS ABOUT THE JOURNEY IT MEASURED ────────────────
// Also from the Esbjerg run. gemlyxFind said "Ribe is only about 30 minutes
// away by train", and this gate reported that 30 minutes "was not measured by
// anything in this run" and listed the Copenhagen-to-Esbjerg figures beside
// it. Esbjerg to Ribe is a DIFFERENT JOURNEY. Nothing measured it, so this
// gate has nothing to say about it, and saying something anyway is the exact
// failure it was built to stop: a check reporting on its own search as though
// it were a fact about the entry.
const ORIGIN_NAMED = /\b(copenhagen|k[oø]benhavn|cph)\b/i;

export const transitProblems = (prose, { parts, drivingMins } = {}) => {
  if (!parts) return [];
  const out = [];
  const measured = [parts.total, parts.onBoard, parts.onFoot, parts.waiting, parts.longest?.mins, drivingMins]
    .filter(n => Number.isFinite(Number(n)) && Number(n) > 0)
    .map(Number);
  // Split on sentence ends, because attribution is a sentence-level property:
  // the duration and the word "train" have to be in the same claim to be one.
  for (const s of sentences(prose)) {
    const ride = RIDE_WORDS.test(s) && !DOOR_WORDS.test(s);
    // Is this sentence about the journey that was measured, or another one?
    const ours = ORIGIN_NAMED.test(s);
    for (const d of journeyDurations(s)) {
      // ── THE CONFLATION ────────────────────────────────────────────
      // Only when the two figures actually differ. On a short hop where the
      // ride IS the journey there is nothing to confuse and nothing to flag.
      if (ride && near(d.mins, parts.total) && parts.onBoard > 0 && !near(parts.total, parts.onBoard, 5)) {
        out.push(`"${d.text}" is presented as time on board, and it is the DOOR TO DOOR figure: it includes the walk at both ends and the wait. The measured time actually moving is ${hm(parts.onBoard)}. Say which one the sentence means, or a reader who checks the timetable will read this as wrong.`);
      } else if (ours && !measured.some(m => near(d.mins, m))) {
        out.push(`"${d.text}" was not measured by anything in this run. The figures that were: ${measured.map(hm).join(", ")}. Either name a source for it or take it out.`);
      }
    }
    // ── THE WALK FROM THE STATION TO THE CENTRE, WHICH IS NEVER MEASURED ──
    // The second error in this file's header, still shipping four days later:
    // "Odense railway station is about 5 minutes on foot from the city centre",
    // where the station IS the centre. Esbjerg's version was "the station is a
    // 7-minute walk from the centre".
    //
    // This is not caught by asking whether the number was measured, and the
    // Esbjerg run proves why: 7 minutes happened to land within a minute of the
    // measured WAITING time, so a bag-of-numbers check waved it through. The
    // quantity claimed here is a walk between one named stop and a town centre.
    // Nothing in this pipeline measures that. What it measures is the walk at
    // BOTH ends added together, to a geocoded centroid that is whatever point
    // somebody's geocoder picked. The claim is wrong in KIND, so no value of
    // the number can rescue it.
    if (WALK_WORDS.test(s) && STOP_WORDS.test(s) && journeyDurations(s).length) {
      out.push(`This draft puts a time on the walk between a station and the centre. Nothing measured that: the ${hm(parts.onFoot)} on foot is the walk at BOTH ends of the journey added together, to a geocoded centroid rather than to the town centre. Drop the figure or measure that specific walk.`);
    }
    // ── DIRECT, WHEN IT IS NOT ────────────────────────────────────
    if (ours && parts.changes > 0 && DIRECT_WORDS.test(s) && RIDE_WORDS.test(s)) {
      out.push(`This draft calls the journey direct. The measured route has ${parts.changes} change${parts.changes === 1 ? "" : "s"}${parts.interchanges?.length ? `, at ${parts.interchanges.map(stripDot).join(" and ")}` : ""}.`);
    }
    const cc = ours ? s.match(CHANGE_COUNT) : null;
    if (cc) {
      const said = WORD_NUM[String(cc[1]).toLowerCase()] ?? Number(cc[1]);
      if (Number.isFinite(said) && said !== parts.changes) {
        out.push(`This draft states ${said} change${said === 1 ? "" : "s"}. The measured route has ${parts.changes}${parts.interchanges?.length ? `, at ${parts.interchanges.map(stripDot).join(" and ")}` : ""}.`);
      }
    }
  }
  // ── A STATION NAMED THAT IS NOT ON THE ROUTE ──────────────────────
  // Only checked when Google gave us names to check against. With no
  // interchange list this says nothing, rather than accusing the draft of
  // something no measurement can settle.
  if (parts.interchanges?.length) {
    const named = String(prose || "").match(/\bchange (?:trains? )?(?:at|in) ([A-ZÆØÅ][\wÆØÅæøå-]+(?: [A-ZÆØÅ][\wÆØÅæøå-]+)?)/g) || [];
    for (const phrase of named) {
      const place = phrase.replace(/^change (?:trains? )?(?:at|in) /, "").trim();
      if (!parts.interchanges.some(i => i.toLowerCase().includes(place.toLowerCase()) || place.toLowerCase().includes(i.toLowerCase()))) {
        out.push(`This draft says you change at ${place}. The measured route changes at ${parts.interchanges.map(stripDot).join(" and ")}.`);
      }
    }
  }
  return [...new Set(out)];
};

// ── AN EMPTY FIELD IS NOT EVIDENCE OF AN ABSENCE ────────────────────
//
// Oliver, 12 Aug 2026. Two drafts, hours apart, from the same null:
//
//   "Ribe has no train station of its own"
//   "Public transport to the exact festival ground isn't clearly mapped"
//
// Ribe Station exists. It is on the Bramming to Tønder line and both
// GoCollective and DSB publish it. Nothing measured its absence, because
// NOTHING IN THIS PIPELINE CAN. nearestStation came back empty, and an empty
// field means "we do not know", which the writer read as "there is none".
//
// That makes the rule total rather than conditional, and this is the part
// worth being exact about: there is no measurement that could license these
// sentences. Google returning no transit itinerary is already documented three
// hundred lines up as meaning UNCONFIRMED and not "no route exists", because
// rural Danish bus links and island ferry operators are routinely missing from
// the feed. So a stated transport absence is always unproven, and the check
// needs no measurement to run.
//
// A HEDGE IS NOT AN ABSENCE, and the difference is the whole design. "The
// connection could not be confirmed" is a statement about this run and is
// exactly what the pipeline is supposed to say. "There is no connection" is a
// statement about Denmark. Only the second is caught.
// ── AND "there's" IS NOT "there\u2009is" ────────────────────────────────
//
// Oliver's Vestergade and Aarhus Riverfront runs, 1 Sep. Both drafts carried a
// flat absence claim — "there\u2019s no real after-hours scene once the bars shut"
// — and both passed this gate, which exists for exactly that sentence.
//
// Three separate holes, all in the same few characters:
//
//   `there\s+(?:is|are|'s)` demanded WHITESPACE before the 's, and nobody
//   writes "there 's". The apostrophe form has therefore never matched once.
//   It only accepted a STRAIGHT apostrophe, and a model writing English prose
//   types the curly one.
//   `(?:\w+\s+){0,4}` cannot cross a hyphen, so "real after-hours scene"
//   broke the filler two words short of the noun.
//
// And the transport list below had no apostrophe form at all.
//
// Written once and read by both lists, because two lists of the same English
// contraction will drift, and these two already had.
const THERE_IS_NO = `there(?:\\s+(?:is|are)|\\s*['\u2019]s)\\s+no`;
// Filler words, hyphens included. "after-hours", "sit-down", "late-night" are
// single words to a reader and two to \\w+.
const GAP = (n) => `(?:[\\w-]+\\s+){0,${n}}`;
// isn't / isn\u2019t / isnt, all three.
const NOT = `n[o'\u2019]?t`;

const ABSENCE = [
  /\b(?:has|have|with)\s+no\s+(?:[\w-]+\s+){0,3}(?:train station|railway station|station|stop|bus|buses|public transport|transport|rail)\b/i,
  new RegExp(`\\b${THERE_IS_NO}\\s+${GAP(3)}(?:train station|railway station|station|stop|bus|buses|public transport|transport|rail)\\b`, "i"),
  /\bno\s+(?:[\w-]+\s+){0,3}(?:train station|railway station|public transport|transport links?|rail link|rail connection|bus route)\b/i,
  new RegExp(`\\b(?:is|are)\\s*${NOT}\\s+${GAP(2)}(?:mapped|served|connected|accessible by public transport)\\b`, "i"),
  /\bnot\s+(?:[\w-]+\s+){0,2}(?:reachable|served)\s+by\s+(?:public transport|train|bus)\b/i,
  /\bonly\s+(?:option|way)\s+is\s+to\s+drive\b/i,
];
// Said about the RESEARCH rather than about the world. These are the sentences
// this pipeline is built to produce, and flagging them would teach it to stop
// admitting what it does not know, which is the opposite of the point.
// ── A HEDGE IS A HEDGE WHEREVER THE NEGATION SITS ───────────────────
// "No signature annual festival could be confirmed" is the CORRECT sentence and
// was being flagged as an absence claim, because the negation is the subject
// ("no festival") rather than the verb ("could not be confirmed") and this
// pattern only knew the second shape. A gate that fires on its own fix teaches
// the pipeline to write worse in order to pass — the rule tracePrices earned the
// hard way. `could be confirmed` and `turned up` are added as bare forms.
const HEDGED = /\b(?:could ?n[o']?t be|was ?n[o']?t|were ?n[o']?t|not)\s+(?:\w+\s+){0,2}(?:confirmed|verified|found|established)\b|\bcould be (?:confirmed|verified|found|established)\b|\bturned up\b|\bin (?:our |the |this )?research\b|\bwe could ?n[o']?t\b|\bunconfirmed\b|\bmay (?:well )?exist\b|\b(?:was|were|has been|have been) (?:confirmed|verified|found|established)\b/i;

// ── AND THE RULE WAS WRITTEN FOR ONE SUBJECT ────────────────────────
//
// Oliver, 25 Aug 2026, reading the live Aalborg page: "No single annual event?
// Seriously? It has the biggest carnival in Northern Europe."
//
// The page says: "There's no single big annual festival tying the city
// together." Aalborg Karneval runs the last week of every May and is the largest
// carnival in Scandinavia. The claim is not a matter of taste. It is wrong, and
// checkably so.
//
// THE GATE FOR THIS ALREADY EXISTED AND COULD NOT SEE IT. Every pattern in
// ABSENCE above is about transport — station, stop, bus, rail, public transport
// — because that is the sentence that was in front of me the day it was written.
// The REASONING in its own header is general and always was: an empty field is
// not evidence of an absence. A search that returned no festivals is a fact about
// the search.
//
// A rule implemented for one subject when its reasoning is general is this
// project's signature failure in its third form — after the unwired function and
// the fix applied to one door and not its sibling. Same shape, one level up.
//
// So the families are named separately, because the SENTENCE each one earns is
// different: the transport version can point at nearestStation and at Google
// returning no route, and this one has to point at the app's own library.
const ABSENCE_CULTURE = [
  new RegExp(`\\b${THERE_IS_NO}\\s+${GAP(4)}(?:festival|festivals|carnival|event|events|market|markets|museum|museums|nightlife|bars?|restaurants?|scene)\\b`, "i"),
  /\b(?:has|have|with)\s+no\s+(?:[\w-]+\s+){0,4}(?:festival|festivals|carnival|event|events|market|markets|museum|museums|nightlife|scene)\b/i,
  /\bno\s+(?:single\s+)?(?:[\w-]+\s+){0,3}(?:annual|yearly|major|big|real|proper|notable|signature)\s+(?:[\w-]+\s+){0,2}(?:festival|carnival|event|celebration)\b/i,
  /\bnothing\s+(?:[\w-]+\s+){0,3}(?:on|happening|going on)\s+(?:in|at|during)\b/i,
  new RegExp(`\\b(?:is|are)\\s*${NOT}\\s+(?:known|famous|noted)\\s+for\\b`, "i"),
];

// ── AND "no shortage of" IS AN ABUNDANCE ────────────────────────────
//
// English builds several idioms out of "no X" that assert the OPPOSITE of an
// absence. They have always matched these patterns and it never cost anything
// while the finding only went to the founder's tray. It costs something now:
// these findings are handed to the correction as contradicted claims, so a
// false one buys a rewrite of a correct sentence, which is the failure the
// out-of-scope filter was built to stop on the checker's side.
const ABUNDANCE = /\bno\s+(?:shortage|lack|end|want)\s+of\b|\bnot\s+short\s+of\b/i;

export const absenceClaims = (prose) => {
  const out = [];
  for (const s of sentences(prose)) {
    if (HEDGED.test(s)) continue;
    if (ABUNDANCE.test(s)) continue;
    if (ABSENCE.some(re => re.test(s))) {
      out.push(`"${s.trim().slice(0, 120)}" states that something does not exist. Nothing in this run measured an absence and nothing could: an empty nearestStation means the pipeline does not know, and Google returning no itinerary means it could not route this, neither of which is evidence that no station or no service exists. Say it could not be confirmed, or take the sentence out.`);
      continue;
    }
    if (ABSENCE_CULTURE.some(re => re.test(s))) {
      out.push(`"${s.trim().slice(0, 120)}" states that something does not exist, and nothing in this run could establish that. A search that came back with no festivals is a fact about the search. Aalborg's own page shipped "no single big annual festival" about a city with the largest carnival in Scandinavia. Check the Events library for this town, or take the sentence out.`);
    }
  }
  return [...new Set(out)];
};

// ── AND WHEN THE APP ITSELF ALREADY DISAGREES ───────────────────────
//
// The warning above is what can be said with no data. This is what can be said
// WITH it, and it is a different kind of statement: not "nothing established
// this" but "our own library contradicts it".
//
// `rowsForTown` is injected — a list of published event rows for this town, which
// App.jsx already holds after ensureLiveContentLoaded. A draft claiming no
// festivals for a town whose Events tab lists four is not an unbacked claim. It
// is a wrong one, and it can be named as wrong.
export const contradictedAbsence = (prose, { rowsForTown = [], town = "" } = {}) => {
  const rows = (Array.isArray(rowsForTown) ? rowsForTown : []).filter(r => String(r?.name || "").trim());
  if (!rows.length) return [];
  const out = [];
  for (const s of sentences(prose)) {
    if (HEDGED.test(s)) continue;
    if (!ABSENCE_CULTURE.some(re => re.test(s))) continue;
    const names = rows.slice(0, 3).map(r => String(r.name).trim()).join(", ");
    out.push(`"${s.trim().slice(0, 120)}" is contradicted by this app's own library: ${rows.length} published event${rows.length === 1 ? "" : "s"} for ${town || "this town"}, including ${names}. Take the sentence out.`);
  }
  return [...new Set(out)];
};

// ── THE LAST LEG WAS MEASURED AND THROWN AWAY ───────────────────────
//
// Oliver, 12 Aug 2026: "Mind you, I'm looking for a universal fix here. We need
// more accuracy... we need to figure out the logistics." Then, one message
// later, the fix itself: "make a rule, tell it that less than 10 minutes walk
// will never be suggested public transport or taxi?"
//
// He is right, and there was a gap under it worth naming. findRealNearestStop
// already runs a REAL WALKING-ROUTE QUERY from the venue to the stop it
// returns, and hands back { name, walk, walkMinutes, kind }. App.jsx then wrote
//
//   frozenGeo = { lat, lon, station, stopKind }
//
// and dropped walkMinutes on the floor. Every draft measured the one number
// that decides walk-or-bus and kept none of it. That is the same shape as the
// interchange names, and as every price before tracePrices existed: the
// pipeline measures, keeps a fragment, and lets the writer describe the rest.
//
// So the universal part is not a new rule, it is KEEPING THE MEASUREMENT. His
// rule is the enforcement clause on top of it, and ten minutes is the right
// number: it is short enough that no Dane would board a bus for it and long
// enough not to argue with.
export const SHORT_WALK_MINUTES = 10;

// A sentence is about the arrival if it names the stop, or talks about getting
// to the place at all. Without this the check would police a town entry's
// sentence about city buses, which is a different subject.
const ARRIVAL_TALK = /\b(station|banegård|banegaard|stop|terminal|platform|arriv\w*|getting (?:there|here)|from the (?:station|stop|terminal)|to the (?:venue|festival|site|ground|grounds|entrance|gates))\b/i;
// The modes and errands that a ten-minute walk makes wrong.
const NOT_FOR_A_SHORT_WALK = [
  [/\btaxis?\b|\bcab\b/i, "suggests a taxi"],
  [/\bbus(?:sen|ser|es)?\b|\bshuttle\b/i, "suggests a bus"],
  [/\brejseplanen\b|\bjourney planner\b/i, "sends the reader to a journey planner"],
  [/\bdriv\w+\b|\bby car\b/i, "suggests driving"],
];

// Returns problems, or nothing at all when the walk was never measured. Same
// discipline as the rest of this file: no measurement, no accusation.
export const lastLegProblems = (prose, { stop, walkMinutes } = {}) => {
  const mins = Number(walkMinutes);
  if (!Number.isFinite(mins) || mins <= 0 || mins > SHORT_WALK_MINUTES) return [];
  const out = [];
  for (const s of sentences(prose)) {
    const named = stop && s.toLowerCase().includes(String(stop).toLowerCase());
    if (!named && !ARRIVAL_TALK.test(s)) continue;
    for (const [re, why] of NOT_FOR_A_SHORT_WALK) {
      if (!re.test(s)) continue;
      out.push(`This ${why} for the last leg, and the last leg was MEASURED at ${mins} minute${mins === 1 ? "" : "s"} on foot from ${stop || "the nearest stop"}. A walk that short is the connection. Say the walk, or say nothing: "${s.trim().slice(0, 110)}"`);
      break;
    }
  }
  return [...new Set(out)];
};

// ── AND THE VEHICLE STANDING NEXT TO A LINE WE MEASURED ─────────────
//
// Oliver's Gilleleje draft, 20 Aug 2026. The prose reads:
//
//   "...the A-line to Hillerod, then bus 950R into Gilleleje Ost"
//
// and four hundred characters further down the same file, in the draft's own
// __journey, sits the leg it is describing:
//
//   { "vehicle": "train", "line": "950R", "from": "Hillerod",
//     "to": "Gilleleje Ost", "mins": 32 }
//
// travelTime was even overruled from a bus emoji to a train one by that same
// measurement. So the pipeline knew. Gemini caught it off its own knowledge of
// Danish local rail and he wrote it up as Gemini being right about transport,
// which it was, and it is worth being exact about what that means: it did not
// know something we lacked. It compared two things we had and nothing here was
// comparing them.
//
// Every gate above reads ONE field at a time, which is this codebase's oldest
// recurring shape. lastLegProblems compares the prose to the WALK. absenceClaims
// compares the prose to nothing. guideLogisticsProblems compares DURATIONS to
// the legs. Not one of them looks at the vehicle, and the vehicle is the part a
// traveller acts on: somebody who reads "bus" stands at a bus stop.
//
// No model, no network. Two strings and a comparison.
//
// ── AND ONLY WHERE BEING WRONG IS REALLY BEING WRONG ────────────────
// Calling a metro a train is how people speak. Calling a train a bus sends them
// to the wrong platform. So the families are what is compared, and a
// disagreement inside a family is not a finding.
const VEHICLE_FAMILY = [
  [/\b(?:bus(?:sen|ser|es)?|coach|shuttle|rutebil)\b/i, "road"],
  [/\b(?:train|rail|s-?train|s-?tog|lokaltog|letbane|metro(?:en)?|tram|tog(?:et|ene)?|lyntog|intercity)\b/i, "rail"],
  [FERRY_TEXT, "water"],
];

const familyOf = (word) => (VEHICLE_FAMILY.find(([re]) => re.test(String(word || ""))) || [])[1] || "";

// How far in front of the line number a vehicle word may sit and still be
// describing it. "then bus 950R" is four characters; "the replacement bus
// service 950R" is twenty six. Past that it is a different clause.
const VEHICLE_NEAR = 28;

// A line is only usable here if it can be found in prose without matching
// something else. Line A of the S-tog is a real line and a bare "A" is the
// commonest word in English, so a line needs a digit in it or two characters
// that are not both letters. Skipping a leg costs nothing; matching the wrong
// word costs a false accusation, and a gate that cries wolf gets switched off.
const usableLine = (line) => {
  const l = String(line || "").trim();
  return l.length >= 2 && /\d/.test(l);
};

// Takes the prose and the MEASURED legs, so it is testable without a network
// and without a draft. Returns one finding per contradicted leg, never more.
export const vehicleMismatches = (prose, legs) => {
  const text = String(prose || "");
  if (!text.trim()) return [];
  const out = [];
  for (const leg of Array.isArray(legs) ? legs : []) {
    const line = String(leg?.line || "").trim();
    const measured = familyOf(leg?.vehicle);
    if (!measured || !usableLine(line)) continue;
    const re = new RegExp(`\\b${line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    for (const m of text.matchAll(re)) {
      const before = text.slice(Math.max(0, m.index - VEHICLE_NEAR), m.index);
      // Every word in the window, not only the one immediately in front,
      // because "then the replacement bus 950R" puts two words between them.
      // The LAST vehicle word wins, since that is the nearest one.
      const words = (before.match(/\b[\wÆØÅæøå-]+\b/g) || []).slice(-4);
      const claimed = words.map(familyOf).filter(Boolean).slice(-1)[0] || "";
      if (!claimed || claimed === measured) continue;
      out.push(
        `THE VEHICLE DOES NOT MATCH THE MEASUREMENT. The draft calls ${line} a ${claimed === "road" ? "bus" : claimed === "water" ? "ferry" : "train"}`
        + `, and Google measured that leg as a ${leg.vehicle}${leg.from ? ` from ${leg.from}` : ""}${leg.to ? ` to ${leg.to}` : ""}.`
        + ` The measurement is in this draft's own __journey. Use the vehicle it names, or name no vehicle.`,
      );
      break;
    }
  }
  return [...new Set(out)];
};

// ── AND ALL OF IT AGAIN, ON THE PIPELINE PEOPLE ACTUALLY READ ───────
//
// Oliver, 12 Aug 2026: "Have you put this rule on everything? Also the guide?"
// No. Every gate above was called from generateArea, the Studio draft pipeline.
// generateGuide had none of them, and its only pass over the finished writing
// is a STYLE scan hunting marketing verbs.
//
// The guide is not short of measurements. fetchExactDurations runs a real
// Directions call per leg, re-routes any leg Google says is over
// WALK_MAX_MINUTES on foot, and returns a map keyed "origin|dest|mode". Then
// the prose describing those legs was never compared to them. Same shape as
// everything else today, one pipeline over.
//
// Takes the prose fields and the leg map, so it is testable without a network
// and without a guide.
const TRAVEL_TALK = /\b(walk|walks|walking|on foot|ride|rides|journey|travel|get(?:ting)? (?:there|here|to|between|around)|from .{2,30} to |train|bus|ferry|metro|tram|taxi|drive|driving|by car|tog(?:et)?|f[æa]?erge)\b/i;

export const legMinutesIn = (legs) => {
  const out = [];
  for (const [key, d] of Object.entries(legs || {})) {
    const mins = Number(d?.durationMinutes);
    if (!Number.isFinite(mins) || mins <= 0) continue;
    const [from = "", to = "", keyMode = ""] = String(key).split("|");
    out.push({ key, mins, from, to, mode: String(d.modeUsed || keyMode || "") });
  }
  return out;
};

// Every named ride in the guide's leg map, flattened, so the vehicle check has
// the same shape it gets from a draft's stored __journey. journeyParts is what
// turns Google's steps into rides with a vehicle word and a line, and it is
// already the function both pipelines use; reading the steps a second way here
// is how the two would come to disagree.
export const guideRides = (legs) => {
  const out = [];
  for (const d of Object.values(legs || {})) {
    for (const leg of journeyParts(d?.steps)?.legs || []) out.push(leg);
  }
  return out;
};

export const guideLogisticsProblems = (fields, legs) => {
  const measured = legMinutesIn(legs);
  const minutes = measured.map(l => l.mins);
  const rides = guideRides(legs);
  const out = [];
  for (const f of Array.isArray(fields) ? fields : []) {
    const id = f?.id || "field";
    const text = String(f?.text || "");
    if (!text.trim()) continue;

    // 1. A STATED ABSENCE needs no measurement to be wrong, which is why this
    //    half runs even on a guide where every route lookup failed.
    for (const a of absenceClaims(text)) out.push(`${id}: ${a}`);

    // 2. A DURATION THAT MATCHES NO LEG THIS GUIDE MEASURED. Scoped to
    //    sentences about travel, because "the museum takes about an hour" is a
    //    real sentence and not a route claim, and flagging it would get this
    //    switched off inside a week.
    if (measured.length) {
      for (const s of sentences(text)) {
        if (!TRAVEL_TALK.test(s)) continue;
        for (const d of journeyDurations(s)) {
          if (minutes.some(m => near(d.mins, m, 3))) continue;
          out.push(`${id}: "${d.text}" matches no leg this guide measured. The legs it did measure are ${minutes.map(hm).join(", ")}. Use a measured figure or leave the number out.`);
        }
      }
    }

    // 3b. AND THE VEHICLE, against the leg it names. A different question from
    //     rule 2: that one asks whether a NUMBER matches a leg, this asks
    //     whether the VEHICLE does. See vehicleMismatches.
    //
    //     `rides`, not `legs`. An adversarial pass found the first version
    //     passing `legs` straight through with an Array.isArray guard, and
    //     `legs` here is a MAP keyed "origin|dest|mode" whose values carry
    //     steps, not a list of rides. The guard made it silently pass [] on
    //     every guide ever built: the gate existed, ran, and could not fire.
    //     legMinutesIn two lines up already knew the shape, which is what made
    //     the mistake invisible.
    for (const v of vehicleMismatches(text, rides)) out.push(`${id}: ${v}`);

    // 3. HIS TEN MINUTE RULE, per leg. A leg Google routed as a walk of ten
    //    minutes or less may not be answered with a bus, a taxi or a planner.
    for (const l of measured) {
      if (!/walk/i.test(l.mode) || l.mins > SHORT_WALK_MINUTES) continue;
      if (!l.to || !text.toLowerCase().includes(l.to.toLowerCase())) continue;
      out.push(...lastLegProblems(text, { stop: l.to, walkMinutes: l.mins }).map(p => `${id}: ${p}`));
    }
  }
  return [...new Set(out)];
};

// ── AND IT PLANNED TWO HOURS SOMEWHERE IT SAID WAS SHUT ─────────────
//
// Off the same live guide as the leg numbers, 15 Aug 2026. KEEP IN MIND, in
// the guide's own words: "Note also that Trapholt is currently closed for
// renovation, so check its official site for the latest reopening details
// before including it in your plans."
//
// Trapholt is Day 3's 13:30 stop, for two hours. The model that wrote the
// warning is the model that built the day, and it told the reader to decide
// something it had already decided for them. Nothing compared the two, because
// the warning and the plan are different fields and every gate reads one field
// at a time.
//
// THE HARD PART IS NOT FINDING THE WORD "CLOSED". It is the difference between
// these two sentences, both of which are in that guide:
//
//   "Trapholt is currently closed for renovation"           a fact, and it
//                                                           contradicts the plan
//   "they may already be closed or on reduced winter hours" a caution, and it
//                                                           is the honest thing
//                                                           to say about a
//                                                           26 October visit
//
// A gate that cannot tell those apart flags the useful sentence too and gets
// switched off in a week. So the test runs on the CLAUSE, not the sentence: the
// stop has to be named in the same clause as the closure, and that clause has to
// state it rather than hedge it. "so check its official site" sits in a later
// clause and cannot rescue the first one, which is right, because a reader who
// has been given the stop at 13:30 for two hours has already been told it is on.
const CLAUSE_SPLIT = /[,;:]|\bso\b|\bbut\b|\balthough\b|\bthough\b|\bhowever\b|\bunless\b/i;
const CLOSED_NOW = /\b(?:is|are|has|have|had|remains?|stays?|sits?)\s+(?:been\s+|currently\s+|now\s+|still\s+)?(?:closed|shut)\b|\b(?:currently|permanently|temporarily|indefinitely)\s+closed\b|\bclosed\s+(?:for|until|due to|since)\b/i;
// Any of these in the same clause turns a statement into a caution, and a
// caution about a stop is a service rather than a contradiction.
const CLOSURE_HEDGED = /\b(?:may|might|could|can|possibly|perhaps|likely|probably|check|verify|confirm|if|whether|risk|expect(?:ed)? to|due to (?:re)?open|reopen(?:s|ed|ing)?)\b/i;

export const closedButPlanned = (fields, stopNames) => {
  const stops = (Array.isArray(stopNames) ? stopNames : []).map(s => String(s || "").trim()).filter(Boolean);
  if (!stops.length) return [];
  const out = [];
  for (const f of Array.isArray(fields) ? fields : []) {
    const id = f?.id || "field";
    const text = String(f?.text || "");
    if (!text.trim()) continue;
    for (const sentence of sentences(text)) {
      for (const clause of sentence.split(CLAUSE_SPLIT)) {
        if (!CLOSED_NOW.test(clause) || CLOSURE_HEDGED.test(clause)) continue;
        for (const stop of stops) {
          if (!containsName(clause, stop)) continue;
          out.push(`${id}: this says ${stop} is closed, and ${stop} is a planned stop. Either drop it from the day or say what is open about it. A reader given a stop at a time, for a length of time, has been told it is on.`);
        }
      }
    }
  }
  return [...new Set(out)];
};

// ── THE GUIDE HAD THE WHOLE JOURNEY AND PRINTED A NUMBER ────────────
//
// Oliver, 13 Aug 2026: "Why it is that our drafts refuse to give the reader a
// proper guide for transport." That got `legs` onto an ENTRY, and the guide
// pipeline was left alone because its directions genuinely already run last.
//
// They do, and it was never the ordering. /api/directions returns every step
// with its line, its operator, its two stops and its minutes, and
// fetchExactDurations stores the WHOLE response on the guide object. GuidePage
// reads two fields out of it, durationText and durationMinutes, and draws
// "~1h 59 by train/bus 🚆". A leg Google described as an IC to Slagelse, a
// change, then bus 470R to Skælskør Busterminal is sitting in the browser at
// full detail and reaching the reader as one number and an emoji.
//
// Same defect as the entry side, one pipeline over, and the fix is the same
// one: stop summarising something that was already a sequence.
//
// Reader-facing, unlike journeyBlock above, which is a prompt: short lines a
// person reads while standing on a platform, in the order they happen.
export const legSteps = (parts) => {
  if (!parts) return [];
  const out = [];
  const rides = Array.isArray(parts.legs) ? parts.legs : [];
  rides.forEach((leg, i) => {
    const vehicle = leg.vehicle || "service";
    // THE LINE IS THE THING YOU LOOK FOR ON THE FRONT OF THE BUS, so it leads
    // when there is one. "Bus 470R" beats "bus towards Skælskør".
    const named = leg.line ? `${vehicle} ${leg.line}` : vehicle;
    out.push({
      kind: "ride",
      vehicle,
      text: leg.to ? `${named} to ${leg.to}` : named,
      mins: leg.mins || 0,
      // Where you get off this one is where you get on the next, so the change
      // is stated between them rather than left to be inferred from two stops.
      change: i < rides.length - 1 ? leg.to || "" : "",
    });
  });
  // Walking and waiting are totals across the whole journey, not steps in it,
  // so they come last and say so. journeyParts sums the walk at BOTH ends,
  // which is why this must never read as "the station is N minutes away".
  if (parts.onFoot > 0) out.push({ kind: "walk", text: "walking, both ends together", mins: parts.onFoot });
  if (parts.waiting > 0) out.push({ kind: "wait", text: "waiting and connections", mins: parts.waiting });
  return out;
};

// The one call the guide needs: a stored /api/directions response in, the same
// parts an entry gets out. Kept here rather than in the page so the page has no
// opinion about the shape of a directions response.
export const journeyFromStored = (stored) => {
  const steps = stored && Array.isArray(stored.steps) ? stored.steps : null;
  if (!steps || !steps.length) return null;
  const parts = journeyParts(steps, stored.durationMinutes);
  if (!parts) return null;
  return { ...parts, ferries: Array.isArray(stored.ferries) ? stored.ferries : [], hasFerry: !!stored.hasFerry, ferryUnnamed: !!stored.ferryUnnamed };
};

// A journey worth spelling out. One unnamed ride with no walk and no wait is
// already fully described by the chip above it, and repeating it as a single
// bullet is noise on every short leg in a guide.
export const worthShowingLegs = (parts) => {
  if (!parts) return false;
  const rides = Array.isArray(parts.legs) ? parts.legs : [];
  if (rides.length > 1) return true;                       // a change is always worth stating
  if (rides.some(l => l.line || l.to)) return true;        // a line or a stop to look for
  return false;
};

// ── AND THE PLACE PAGE, WHICH HAS NEVER SHOWN ANY OF IT ─────────────
//
// Oliver, 16 Aug 2026, asking what the page needs. This is the answer that was
// already paid for and never delivered.
//
// Every row drafted since 13 August carries a measured journey from Copenhagen:
// every leg in order with its vehicle, its line and its two stops, the named
// interchange stations, the walking, the waiting, and how long the same trip
// takes by car. The writer's own comment in App.jsx says it is stored and
// "reader-facing only when something chooses to render it". Nothing chose. It
// has been sitting in gemlyx_content, on every entry drafted since, seen by
// nobody at all.
//
// "How do I get there from Copenhagen, and where do I get off" is the question
// almost every traveller in this country has, and no aggregator answers it for a
// harbour town of nine hundred people. Gemlyx measured it. Showing it costs no
// API call and no research pass, which makes it the cheapest real thing there is
// to add to a page.
//
// THE STEP LIST IS NOT RE-IMPLEMENTED. legSteps above already turns these legs
// into lines, and the guide has rendered them since 13 August off its own live
// measurement, so the stored shape goes through the same reader. What a place
// page needs and a guide does not is the SENTENCES around it: a leg inside a
// planned trip is a different claim from "this is how you reach this place, and
// this is when somebody checked".
//
// EVERY ONE OF THESE RETURNS "" RATHER THAN A HEDGE, so the card is built from
// the sentences that exist and a figure nobody measured has none.
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];
const upperFirst = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

// THE GATE. A stored journey is renderable only when it has a real total, at
// least one leg, and a DATE.
//
// The date is not a nicety, and this is the rule __hours is already stored
// under: an hours array with no date is a claim that quietly ages into a lie,
// and a timetable is worse, because a line number that no longer exists sends
// somebody to a platform rather than merely misinforming them. So a journey
// nobody can date is not shown. Rows drafted before `at` existed render nothing,
// which is the honest outcome: nobody knows when they were measured.
export const storedJourney = (j) => {
  if (!j || typeof j !== "object") return null;
  const total = Number(j.total);
  if (!Number.isFinite(total) || total <= 0) return null;
  const legs = (Array.isArray(j.legs) ? j.legs : []).filter(l => l && (Number(l.mins) > 0 || l.line || l.to));
  if (!legs.length) return null;
  if (!dayStart(j.at)) return null;
  return { ...j, total, legs };
};

// Door to door, and it says so. This is the figure travelTime takes and the one
// people compare against a car, and it is NOT the time on the train: it includes
// the walk at both ends and the wait for the departure. A number this size with
// nothing naming what it measures reads as a train time and makes the trip look
// slow, which is the misreading this whole file exists because of.
export const journeyReach = (parts) => {
  if (!parts) return "";
  const total = Number(parts.total);
  if (!Number.isFinite(total) || total <= 0) return "";
  const from = String(parts.from || "").trim() || "Copenhagen";
  return `${hm(total)} from ${from}, door to door`;
};

// ── NAMED ONLY WHEN EVERY CHANGE HAS A NAME ─────────────────────────
// interchanges drops the blanks Google sometimes returns, so it can be shorter
// than `changes`. Naming two of three reads as the complete list, and somebody
// stands on the wrong platform at the change nobody mentioned. So either every
// change is named or the count stands on its own.
export const journeyChanges = (parts) => {
  if (!parts) return "";
  const changes = Math.max(0, Math.trunc(Number(parts.changes) || 0));
  if (changes === 0) return "Direct, no changes";
  // ── A NAME IS PRINTED AS IT WAS MEASURED ────────────────────────
  // journeyBlock above strips a trailing full stop before handing these to a
  // model, which is right for a prompt sentence and wrong for a reader: "St." is
  // the Danish abbreviation for station, so stripping it turns Odense St. into
  // Odense St, and a page that mangles the name of the platform somebody is
  // looking for has broken the one thing it was there to do. The double full
  // stop that strip exists to avoid is handled where it belongs, in the card,
  // which joins this sentence to the next with a separator rather than a period.
  const names = (Array.isArray(parts.interchanges) ? parts.interchanges : [])
    .map(s => String(s || "").trim()).filter(Boolean);
  const word = COUNT_WORDS[changes] || String(changes);
  const label = `${word} change${changes === 1 ? "" : "s"}`;
  return names.length === changes ? `${upperFirst(label)}, at ${names.join(" then ")}` : upperFirst(label);
};

// Where the walking figure comes from matters more than the figure. journeyParts
// sums the walk at BOTH ends into one number, so this must never be allowed to
// read as "the station is 12 minutes away", which is the shape a traveller will
// assume and act on.
export const journeyBreakdown = (parts) => {
  if (!parts) return "";
  const bits = [];
  if (Number(parts.onBoard) > 0) bits.push(`${hm(parts.onBoard)} on board`);
  if (Number(parts.onFoot) > 0) bits.push(`${hm(parts.onFoot)} walking, both ends together`);
  if (Number(parts.waiting) > 0) bits.push(`${hm(parts.waiting)} waiting and connecting`);
  return bits.join(", ");
};

// The car comparison, when Google gave one. It is the first question after "how
// long by train", and answering it honestly sometimes means admitting the train
// loses, which is the kind of thing this app is supposed to say out loud.
export const journeyDriving = (parts) => {
  const m = Number(parts?.drivingMins);
  if (!Number.isFinite(m) || m <= 0) return "";
  return `${hm(m)} by car`;
};

// ── WHO RAN THE TRIP, ONCE, WITH THEIR LINKS ────────────────────────
// Google's Directions policy: an application displaying these results "must
// display the names and URLs of the transit agencies that supply the trip
// results". So this is not a nicety, it is the condition on showing the journey
// at all, and it is also the most useful line on the card for anybody who wants
// a timetable.
//
// Deduplicated by name, because a four-leg journey on DSB is one agency and
// printing it four times reads as clutter rather than as attribution. A name
// with no URL is still printed: the requirement is names AND urls, and half of
// the requirement met honestly beats a name suppressed because Google's feed
// happened to omit a link.
//
// EMPTY FOR EVERY ROW DRAFTED BEFORE 17 AUG, and that is the honest state of
// them: the agency was never stored, so nobody knows who ran those trips. The
// card handles that by naming Google as the source and nobody else.
export const journeyAgencies = (parts) => {
  const seen = new Set();
  const out = [];
  (Array.isArray(parts?.legs) ? parts.legs : []).forEach(l => {
    (Array.isArray(l?.agencies) ? l.agencies : []).forEach(a => {
      const name = String(a?.name || "").trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      out.push({ name, url: /^https?:\/\//i.test(String(a?.url || "").trim()) ? String(a.url).trim() : "" });
    });
  });
  return out;
};

// The attribution itself, in the words the policy asks for. Google's guidelines
// accept the text "Google Maps" where the logo is impractical, and this is the
// same sentence on every card so a reader learns what it means once.
export const JOURNEY_SOURCE = "Route and times measured with Google Maps.";

// ── THE DATE, WHICH IS WHAT MAKES THE REST PUBLISHABLE ──────────────
// `today` is a parameter and not a call to the clock, for the reason
// calendarDay.js and eventDates.js both give: a date helper that reads the clock
// cannot be tested against a fixed calendar.
//
// The threshold is MAX_FACT_AGE_MONTHS, imported rather than redeclared, because
// the codebase has already decided what "too old to state as current" means for
// a fact off a page and a timetable is not a different question. The month
// arithmetic uses the same average-month divisor factAge uses, for the same
// reason: two definitions of a month drift apart.
//
// The day is printed by dayLabel, which formats the LOCAL parts of a day-only
// string, so it reads the same in every timezone. Formatting the raw value
// instead would print the day before west of Greenwich, which is the bug
// calendarDay.js exists because of.
export const journeyStamp = (parts, today = new Date()) => {
  const day = dayStart(parts?.at);
  if (!day) return "";
  const when = `Measured on ${dayLabel(parts.at)}`;
  const now = today instanceof Date ? today : new Date(today);
  if (!Number.isFinite(now.getTime())) return `${when}.`;
  const months = (now.getTime() - day.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  return months >= MAX_FACT_AGE_MONTHS
    ? `${when}, over ${MAX_FACT_AGE_MONTHS} months ago. Treat it as the rough shape of the trip and not as a timetable.`
    : `${when}. Timetables change, so check departures before you travel.`;
};

// ── ONE LEG MEASURED, A WHOLE DRAFT OF LOGISTICS ────────────────────
//
// Oliver, 25 Aug 2026: "the pipeline still tends to get the logistics wrong,
// despite using directions. Its draft on Aarhus was called out by Gemini."
//
// He is right, and transitProblems is not the thing that is wrong. It is
// CORRECT, and its correctness is what hides the problem.
//
// THE PIPELINE MEASURES EXACTLY ONE JOURNEY: Copenhagen to the frozen
// coordinate, transit and driving, once. Every other movement claim in an entry
// — the light rail across Aarhus, the walk from Store Torv to the harbour, how
// often the 1A runs, forty minutes to Moesgaard — is prose. Nothing measures it,
// because nothing asked.
//
// transitProblems knows this and refuses to speak about journeys it did not
// measure. That refusal was added deliberately, after the Esbjerg run flagged
// "Ribe is only about 30 minutes away by train" as unmeasured and listed the
// Copenhagen figures beside it, which is a check reporting on its own search as
// though it were a fact about the entry. The rule is right.
//
// ── BUT THE LOG SENTENCE IS NOT ─────────────────────────────────────
//
// With no problems found, the run log records:
//
//   "every duration and change in the prose matches the measured route"
//
// which is TRUE of the one journey and reads as a statement about the draft. A
// founder scanning a green run has no way to learn that five of the six
// logistics claims on the page were never checked by anything, because the
// silence of a gate that correctly declined to speak is identical to the
// silence of a gate that looked and found nothing wrong.
//
// A LIMIT HIT IS NOT A LIMIT REPORTED. Found twice already today, in the chat
// truncation and in the run-log quota. This is the third and the most expensive,
// because the thing not being reported is the size of the unchecked surface.
//
// So this counts rather than accuses. It makes no claim about whether an
// unmeasured sentence is right — it cannot know — and says only how much of the
// draft's logistics rests on nothing. That is a fact about the run, which is
// exactly what a run log is for.

// Is this sentence making a claim about MOVEMENT — how long something takes, how
// far it is, how often it runs? Anything else in the prose is not logistics and
// is none of this function's business.
const MOVEMENT = /\b(walk|walks|walking|on foot|stroll|cycle|cycling|bike|ride|rides|drive|drives|driving|journey|trip|travel|takes?|away|reach|reaches|runs?|departs?|leaves?|connection|service)\b/i;
const FREQUENCY = /\b(every \d+|\d+ times an hour|hourly|half-?hourly|twice an hour|each hour|per hour)\b/i;
const DISTANCE = /\b\d+(?:[.,]\d+)?\s?(?:km|kilometers?|kilometres?|m|miles?)\b/i;
// A distance is only a LOGISTICS claim when it is a distance BETWEEN two things.
// "The beach is 8 km long" is a fact about a beach; "Moesgaard is 8 km from the
// centre" is a claim about a journey somebody has to make. Without this the
// census counted the first as an unmeasured logistics claim, which is the false
// positive that got the Esbjerg gate trimmed and is not worth repeating.
const SPATIAL = /\b(from|to|away|outside|north|south|east|west|of the (?:centre|center|town|city)|apart)\b/i;

// ── WHAT COUNTS AS BACKED ───────────────────────────────────────────
// A claim is MEASURED when it names the origin this run actually routed from AND
// its figure matches one of the figures that came back. Everything else is
// unmeasured — including claims that are perfectly true. "Unmeasured" is a
// statement about this run, never about the world.
export const journeyCensus = (prose, { parts, drivingMins } = {}) => {
  const measured = [parts?.total, parts?.onBoard, parts?.onFoot, parts?.waiting, parts?.longest?.mins, drivingMins]
    .filter(n => Number.isFinite(Number(n)) && Number(n) > 0)
    .map(Number);
  const claims = [];
  for (const s of sentences(prose)) {
    const sentence = s.trim();
    if (!sentence) continue;
    const durations = journeyDurations(sentence);
    // A DISTANCE BETWEEN TWO PLACES IS ITSELF A MOVEMENT CLAIM and needs no
    // verb: "Moesgaard is 8 km from the centre" names a journey without ever
    // saying walk, drive or take. Requiring a movement word missed every one of
    // those, which is a large share of how a town entry actually states its
    // logistics.
    const spatialDistance = DISTANCE.test(sentence) && SPATIAL.test(sentence);
    const isMovement = MOVEMENT.test(sentence) || RIDE_WORDS.test(sentence) || spatialDistance;
    const hasFigure = durations.length > 0 || spatialDistance || FREQUENCY.test(sentence);
    if (!isMovement || !hasFigure) continue;
    // A duration that matches a measured figure IN A SENTENCE THAT NAMES THE
    // ORIGIN. Both halves are required: 40 minutes appearing in an Aarhus
    // sentence and in the Copenhagen measurement is a coincidence, not a check.
    // That is the bag-of-numbers mistake the Esbjerg walk figure got through on.
    const backed = ORIGIN_NAMED.test(sentence)
      && durations.length > 0
      && durations.every(d => measured.some(m => near(d.mins, m, 3)));
    claims.push({
      text: sentence.length > 120 ? `${sentence.slice(0, 117)}…` : sentence,
      backed,
      // Named so the note can say WHY it is unbacked, which is the difference
      // between a warning and something actionable.
      why: backed ? "" : ORIGIN_NAMED.test(sentence)
        ? "names the measured origin, but its figure is not one of the measured figures"
        : "is about a journey this run never measured",
    });
  }
  const unbacked = claims.filter(c => !c.backed);
  return { total: claims.length, measured: claims.length - unbacked.length, unmeasured: unbacked.length, claims, unbacked };
};

// The sentence for the run log and for __notes. Empty when there is nothing to
// say, so a draft that makes no logistics claims at all reports nothing rather
// than "0 of 0 measured", which is the tone this project keeps having to remove.
//
// WRITTEN FOR THE FOUNDER, NOT FOR A LOG. It says what is true, what is not
// known, and what it would cost to know it, in that order.
export const censusNote = (census, { origin = "Copenhagen" } = {}) => {
  const c = census || {};
  if (!c.total) return "";
  if (!c.unmeasured) return c.total === 1
    ? "The one logistics claim in this draft was checked against the measured route."
    : `All ${c.total} logistics claims in this draft were checked against the measured route.`;
  const head = c.measured
    ? `${c.unmeasured} of ${c.total} logistics claims here were never measured by anything in this run.`
    : `None of the ${c.total} logistics ${c.total === 1 ? "claim" : "claims"} here was measured by anything in this run.`;
  // The reason, said once, rather than repeated per claim.
  const why = `The only journey this pipeline measures is ${origin} to this place. Anything about getting around locally, or to anywhere else, is the model's prose.`;
  const list = c.unbacked.slice(0, 4).map(u => `· "${u.text}"`).join("\n");
  const more = c.unbacked.length > 4 ? `\n· and ${c.unbacked.length - 4} more` : "";
  return `${head} ${why}\n${list}${more}`;
};
