import { stripReadyMarker, stripMarkdown, isFullPlanText } from "./helpers";
import { readMapBeats } from "./mapDirections";
import { foundAt, samePlaceName, containsName, matchVariantsOf } from "./danishNames";
import { mentionsPlace, isRejectedPlace, onlyAskedAbout, isPassedThrough } from "./previewMatch";
import { ruledOutFor, isExcluded } from "./exclusions";

// ── WHAT THE CHAT PROMISED, AGAINST WHAT THE GUIDE CONTAINS ─────────
//
// On the open list for days, 14 Sep 2026: "Nothing in the app compares what
// the chat promised a traveller against what the built plan contains."
//
// Measured before anything was written, on three replies shaped the way the
// app itself asks for them: a week written out day by day (the shape of the
// 23 Aug Faxe transcript, and the prompt still says "Default to a full, clear
// day-by-day plan"), "I'll work Kongens Have into the first afternoon"
// (the prompt's own rule, "IF SOMEONE NAMES A SPECIFIC PLACE, IT MUST BE IN
// THE PLAN", answered in the first person), and "You'll be there for Aalborg
// Karneval, so I've built the Saturday around it". Each was paired with a
// guide that left the place out, and every post-build check the app has was
// run on the pair: constraintViolations, checkPlan, titlePromises and the
// chosen-events check. Zero findings, three times. The planner is handed the
// whole conversation and asked to use "real place names mentioned in the
// conversation", so a promise usually lands, and a request has a failure
// rate while code does not. That is the argument the chosen-events check
// already made about a tick, applied to a sentence.
//
// ── A MENTION IS NOT A PROMISE ──────────────────────────────────────
//
// The same measurement run the other way: every verbatim Gemlyx sentence the
// repo holds, eighteen of them, against a reader that took any published
// name in a reply as a promise. Fifteen of the eighteen name a published
// place. Not one of them is a promise. "I'll assume you're landing at
// Copenhagen Airport" is an assumption the traveller then corrected, "I'd go
// with Kronborg" is an opinion, "keeps you clear of Oktoberfest in Aalborg"
// is a fact about dates, "most people driving straight to Copenhagen never
// stop for" is a foil. A reader that fired on those would accuse the guide
// on nearly every trip, and a check that cries wolf is switched off inside a
// week. So the rule this file lives by is the one exclusions.js lives by,
// with the sign flipped: a false accusation is worse than a missed promise.
//
// ── SO THREE SHAPES, AND NOTHING HEDGED ─────────────────────────────
//
//   DAY    a published place named inside a day structure, "Day 2: Stevns
//          Klint", in a reply isFullPlanText already recognises as a plan
//   WILL   a first-person commitment with the place as its object, "I'll
//          work Kongens Have in", "I've built the Saturday around Aalborg
//          Karneval", or the place first, "Tivoli is going in"
//   THERE  "you'll be there for Roskilde Festival", which is an event said as
//          a fact about their trip
//
// Every one is gated on the GAZETTEER, the same published pools the preview
// screen and the chat map read, so a capitalised word the app has never heard
// of can never become a promise. Every one refuses the sentence when it
// carries a hedge, in the way the sentence hedges: "if you fancy it",
// "otherwise", "or", "could". And every one reuses the chat's own three
// readers of "is this name being recommended" (isRejectedPlace,
// onlyAskedAbout, isPassedThrough) rather than growing a fourth, because a
// second reader of one question is this repository's signature bug.
//
// ── AND A PROMISE THE CONVERSATION MOVED ON FROM IS NOT ONE ─────────
//
// "Day 2: Tivoli" followed by "hmm, what else is there?" followed by
// "Louisiana instead, then" is a plan that changed, and the guide honouring
// the change is the guide being right. So a promise is void the moment the
// conversation reopens it: the traveller rules the place out (readExclusions,
// typed or tapped), rejects it near its name (isRejectedPlace over their own
// words), names it again after the promise (the question is open and
// Gemlyx's last word on it is unknown), or either side uses a re-planning
// word after it ("instead", "something else", "swap"). A later day structure
// from Gemlyx replaces every promise before it, because a new plan written
// out is the plan. And an event the traveller left unticked on the preview
// screen, having touched that section, is a recommendation they declined,
// which is what that screen's own comment says an untouched tick means.
//
// What this deliberately still cannot read, each of which is a miss rather
// than an accusation: a pronoun ("you'll be there for it"), because
// resolving one is the antecedent machinery that grew exclusions.js by two
// hundred lines; a commitment in Danish, which a day header handles and a
// verb frame does not yet; and "X on day 2" said inside a sentence with a
// hedge anywhere in it, which is the price of the hedge test being a
// sentence rather than a window.

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// The words the reader sees, and nothing the reader does not. The same triple
// App.jsx applies to a reply before the cards and the map read it: the ready
// marker and the map beats are machine strings, and "**Day 2:**" is "Day 2:".
// Read with the markers in, "[[MAP_IN:Copenhagen]]" would be a mention of
// Copenhagen sitting hard against a colon, which is a header to nothing.
const words = (text) => readMapBeats(stripMarkdown(stripReadyMarker(String(text ?? "")))).clean;

export const DAY = "day";
export const WILL = "will";
export const THERE = "there";

// ── THE DAY HEADER ──────────────────────────────────────────────────
//
// The number, then at most a parenthetical, then the separator. Nothing else
// may sit between the number and the colon, so "Day 1 and day 2 are in
// Copenhagen, day 3: Roskilde" is a sentence and not a header for Roskilde.
// "Dag" is the Danish, Norwegian, Swedish and Dutch word, and the app writes
// Danish guides. The separators are the three isFullPlanText matches, because
// the model has not always listened to the rule about dashes: the two dashes
// are built from their code points so the source carries none, and the
// hyphen is escaped so the class cannot become a range from the colon to the
// en dash. Doubled escapes throughout, because this is a template literal
// and a single one would reach the regex as a backspace.
const DASHES = String.fromCharCode(0x2013, 0x2014);
const DAY_HEADER = new RegExp(`(?:^|\\n|(?<=[.!?]\\s))[ \\t]*(day|dag)\\s*(\\d{1,2})\\s*(?:\\([^)\\n]{0,40}\\))?\\s*[:\\x2d${DASHES}]\\s*`, "gi");

// A hedge anywhere up to and including the clause the name sits in, and see
// hedgedAt for the clause after it. "Ribe, and Rømø if you want the beach"
// keeps Ribe and drops Rømø; "if you fancy it, Tivoli" drops Tivoli, because
// the hedge came first. English and Danish, since the reply is in whichever
// the traveller writes.
// "worth" is not here on purpose: "Ribe, worth the drive" is praise for a
// place being planned, and the hedged form of it ("worth a look if there is
// time") carries its own "if".
const HEDGE = /\b(?:if|unless|maybe|perhaps|possibly|probably|likely|optional(?:ly)?|could|would|might|may|can|or|otherwise|alternatively|alternative|option|options|consider|suggest(?:ion)?s?|recommend(?:ation)?s?|idea|thinking|tempted|lean(?:ing)?|nearby|close by|not far|skip|avoid|whether|depending|either|rather|else|hvis|måske|maaske|evt|eventuelt|kunne|kan|eller|ellers|alternativt|overvej|foreslå|foreslaa|anbefal(?:er)?|tæt på|taet paa|i nærheden|i naerheden)\b|\b(?:i|we|you)'d\b|\?/i;

// A name that is only ever the front half of a longer proper name is not that
// place. "Land at Copenhagen Airport" is not a day in Copenhagen, and "Aalborg
// Karneval" is the event, not the town. Read off the RAW text because the
// folded one has no capitals to see. Every occurrence has to be followed by a
// capital for the name to be refused, so a reply that says both "Copenhagen
// Airport" and "Copenhagen" still promises the city.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const onlyInsideALongerName = (text, name) => {
  let found = 0, longer = 0;
  for (const v of matchVariantsOf(name)) {
    const re = new RegExp(`(?<![\\p{L}])${escapeRe(v)}(?![\\p{L}])(\\s+[A-ZÆØÅ])?`, "gu");
    for (const m of text.matchAll(re)) { found++; if (m[1]) longer++; }
  }
  return found > 0 && longer === found;
};

// The rows a reply could be promising, longest name first so "Aalborg
// Karneval" is tried before "Aalborg" and a run matching both is read as the
// event. A row with no name, or a craft product, is not a place a day holds.
const candidates = (pools) =>
  (Array.isArray(pools) ? pools : [])
    .filter(p => p && clean(p.name).length >= 3 && p._src !== "craft")
    .sort((a, b) => clean(b.name).length - clean(a.name).length);

// A place name in prose carries its capital. "Fur" is an island and "a fur
// coat" is not, and the folded matcher underneath every reader here cannot
// tell them apart, so the RAW text has to show the name opening with a
// capital at least once. A row whose own name opens lowercase is exempt from
// a rule about capitals.
const writtenAsAName = (text, name) => {
  if (!/^[A-ZÆØÅ]/.test(name)) return true;
  return matchVariantsOf(name).some(v => {
    const re = new RegExp(`(?<![\\p{L}])${escapeRe(v)}(?![\\p{L}])`, "giu");
    return [...String(text || "").matchAll(re)].some(m => /^[A-ZÆØÅ]/.test(m[0]));
  });
};

// The three readers the chat already has for "is this name being recommended",
// asked of the same text. A name every mention of which is refused, asked
// about or driven past is not being promised either.
const recommended = (text, name) =>
  mentionsPlace(text, name) && writtenAsAName(text, name)
  && !isRejectedPlace(text, name) && !onlyAskedAbout(text, name) && !isPassedThrough(text, name);

// ── SHAPE ONE: A PLACE INSIDE A DAY STRUCTURE ───────────────────────
//
// Only in a reply isFullPlanText already calls a plan, so the gate for "is
// this a plan written out" has one reader. The block for a day runs to the
// next header or the next blank line, which is where a bulleted day ends and
// a paragraph of advice begins.
const dayBlocks = (text) => {
  const out = [];
  const heads = [...text.matchAll(DAY_HEADER)];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const from = h.index + h[0].length;
    const to = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const block = text.slice(from, to).split(/\n\s*\n/)[0] || "";
    // The header as written, "Day 2" or "Dag 2", so the quote in the note
    // reads the way the reply did.
    const label = `${h[1]} ${h[2]}`;
    out.push({ day: Number(h[2]), label, block });
  }
  return out;
};

// A clause that opens with a conditional word modifies the clause before it:
// "Skagen, if the weather holds" hedges Skagen, while "Ribe, and Rømø if you
// want the beach" hedges only Rømø, because that clause opens with "and".
const CONDITIONAL_START = /^\s*(?:if|unless|should|provided|assuming|depending|weather permitting|when|hvis|medmindre|såfremt|saafremt|når|naar|afhængig|afhaengig)\b/i;

// Whether the name at `at` is hedged: a hedge anywhere up to and including
// its clause, or a conditional opening the clause after it. Sentences end at
// . ; ! ? or a line break; clauses at commas.
const hedgedAt = (sentence, at) => {
  const cut = sentence.indexOf(",", at);
  const upTo = cut < 0 ? sentence : sentence.slice(0, cut);
  if (HEDGE.test(upTo)) return true;
  const next = cut < 0 ? "" : sentence.slice(cut + 1).split(",")[0];
  return CONDITIONAL_START.test(next);
};

const sentencesOf = (block) => block.split(/(?<=[.;!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);

// Every place a name appears in a sentence, in any of its spellings, with the
// folded sentence the indices belong to. Walking the row's own spelling alone
// would find nothing in "Dag 2: København" for a row called Copenhagen, and a
// mention nobody located is a mention nobody tested for a hedge.
const mentionsAt = (sentence, name) => {
  const out = [];
  for (const v of matchVariantsOf(name)) {
    const { hay, at, len } = foundAt(sentence, v);
    for (const i of at) out.push({ hay, i, len });
  }
  return out;
};

const readDayPromises = (text, pools) => {
  if (!isFullPlanText(text)) return [];
  const out = [];
  for (const { day, label, block } of dayBlocks(text)) {
    for (const sentence of sentencesOf(block)) {
      for (const row of candidates(pools)) {
        const name = clean(row.name);
        if (!recommended(sentence, name)) continue;
        if (onlyInsideALongerName(sentence, name)) continue;
        const found = mentionsAt(sentence, name);
        if (!found.length) continue;
        // Every mention has to be unhedged. One clean mention beside one hedged
        // one is a sentence that changed its mind halfway, and that is not a
        // promise either.
        if (found.some(({ hay, i }) => hedgedAt(hay, i))) continue;
        if (out.some(p => p.name.toLowerCase() === name.toLowerCase())) continue;
        out.push({ name, row, shape: DAY, day, said: `${label}: ${clean(sentence)}` });
      }
    }
  }
  return out;
};

// ── SHAPES TWO AND THREE: A COMMITMENT WITH THE PLACE AS ITS OBJECT ─
//
// Anchored hard against the name, the way REJECT_BEFORE in previewMatch is,
// so the frame has to finish immediately in front of it. Written for the
// FOLDED text foundAt returns: lowercase, apostrophes straightened, Danish
// letters spelled out.
//
// "I'll put you in Ribe" does not match, because "you in" is not on the path
// from the verb to the name; a promise to sleep somewhere is a different
// promise and this file makes none about beds. "I'd include Tivoli" does not
// match, because "I'd" is a conditional and the sentence is an opinion.
const COMMIT_BEFORE = /\b(?:i|we)(?:'ll| will| have|'ve| am| are|'m|'re)\s+(?:also\s+|definitely\s+|already\s+|now\s+|of course\s+|happily\s+|going to\s+|gonna\s+)?(?:includ(?:e|ed|ing)|add(?:ed|ing)?|put(?:ting)?|work(?:ed|ing)?|slot(?:ted|ting)?|fit(?:ted|ting)?|fold(?:ed|ing)?|pencil(?:led|ling|ed|ing)?|keep(?:ing)?|kept|lock(?:ed|ing)?|squeez(?:e|ed|ing))\s+(?:in\s+)?(?:the\s+|a\s+)?$/;
// "I've built the Saturday around Aalborg Karneval", "I'll plan day 2 around
// Tivoli". The thing built around the place has to be a DAY or a part of one:
// "I've planned the route around Copenhagen" means a route that avoids it,
// and "day around" never does.
const AROUND_BEFORE = /\b(?:i|we)(?:'ll| will| have|'ve)\s+(?:also\s+)?(?:build|built|building|plan|planned|planning|base|based|basing|organis(?:e|ed)|organiz(?:e|ed)|arrang(?:e|ed)|shap(?:e|ed)|centr(?:e|ed)|center(?:ed)?|wrap(?:ped)?)\s+(?:the\s+|that\s+|this\s+|your\s+|a\s+)?(?:(?:first|second|third|last|final|whole|full|middle)\s+)?(?:day\s*\d{0,2}|morning|afternoon|evening|night|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+around\s+(?:the\s+)?$/;
// "Your Saturday is Aalborg Karneval", "Day 2 is Ribe". A day named as the
// subject and the place as its complement.
// A bare "Saturday is Aalborg Karneval" is a fact about the town's calendar
// and could be a warning about crowds, so the day has to be THEIRS: "your
// Saturday", "day 2", "the last day".
const DAY_IS_BEFORE = /\b(?:your\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|first day|second day|third day|last day|final day|middle day)|day\s*\d{1,2}|the\s+(?:first|second|third|last|final|middle)\s+day)\s+(?:is|will be|becomes|is all about|is for)\s+(?:the\s+|a\s+|all about\s+)?$/;
// "you'll be there for Roskilde Festival". An event said as a fact about the
// trip. "there for it" is a pronoun and is not read.
const THERE_BEFORE = /\b(?:you|you'll|you will|you're|you are|you'd|we'll|we will|we're|we are)\s+(?:all\s+)?(?:be\s+)?(?:there|in town|around|here|in \w+)\s+(?:just\s+)?(?:for|in time for|right for)\s+(?:the\s+)?$/;

// The place first: "Tivoli is going in", "Tivoli goes in on day 2", "Tivoli
// will be on day 3". "Tivoli is in Copenhagen" is a fact about a map and does
// not match, because "in" has to be followed by the plan or a day.
const COMMIT_AFTER = /^\s*(?:(?:is|are)\s+(?:going\s+in|in\s+(?:the\s+)?(?:plan|guide|itinerary|route|trip)|on\s+day\s*\d{1,2}|your\s+day\s*\d{1,2})|goes\s+in|go\s+in|will\s+be\s+(?:in\s+(?:the\s+)?(?:plan|guide|itinerary|route|trip)|on\s+day\s*\d{1,2}))\b/;

// A commitment undone by its own tail. "I'll keep Tivoli out", "I'll add
// Tivoli as an option", "I'll put Tivoli aside", "I'll keep Ribe in mind".
const UNDONE_AFTER = /^\s*(?:out|off|aside|in mind|in reserve|as\s+(?:an?\s+)?(?:option|backup|maybe|alternative|possibility)|for\s+(?:another|next|a future)\s+(?:time|trip|day|visit)|only\s+if|in\s+case)\b/;

const COMMIT_WINDOW_BEFORE = 90;
const COMMIT_WINDOW_AFTER = 60;

// Sentence by sentence, so the quote in the note is the sentence as written
// rather than the folded one the frames are tested on, and so the hedge test
// reads the whole sentence the commitment sits in: a commitment with a
// condition on it is an offer.
const readCommitments = (text, pools) => {
  const out = [];
  const sentences = sentencesOf(text);
  for (const row of candidates(pools)) {
    const name = clean(row.name);
    if (!recommended(text, name)) continue;
    if (onlyInsideALongerName(text, name)) continue;
    for (const sentence of sentences) {
      let shape = "";
      for (const { hay, i, len } of mentionsAt(sentence, name)) {
        if (HEDGE.test(hay)) break;
        const before = hay.slice(Math.max(0, i - COMMIT_WINDOW_BEFORE), i);
        const after = hay.slice(i + len, i + len + COMMIT_WINDOW_AFTER);
        if (UNDONE_AFTER.test(after)) continue;
        if (THERE_BEFORE.test(before)) shape = THERE;
        else if (COMMIT_BEFORE.test(before) || AROUND_BEFORE.test(before) || DAY_IS_BEFORE.test(before) || COMMIT_AFTER.test(after)) shape = shape || WILL;
      }
      if (!shape) continue;
      if (out.some(p => p.name.toLowerCase() === name.toLowerCase())) break;
      out.push({ name, row, shape, day: null, said: clean(sentence) });
      break;
    }
  }
  return out;
};

// Re-planning words. Narrow on purpose: "change" is what you do to trains at
// Fredericia and "drop" is what you do with bags, so neither is here. The
// removals that name a place are read by readExclusions and isRejectedPlace
// instead, which is where they belong.
const REPLAN = /\b(?:instead|rather than|swap|swapped|switch|switched|scrap|scrapped|replace|replaced|in place of|something else|anything else|what else|other options|rethink|start over|start again|redo|i stedet|noget andet|andre muligheder)\b/i;

// ── THE READER ──────────────────────────────────────────────────────
//
// `messages` is the thread as App.jsx holds it, greeting already sliced off:
// { role, text, isError, hidden }. Assistant turns are read for promises;
// traveller turns are read only for what voids one. `pools` is previewPools,
// the gazetteer. `ownWords` is the traveller's own text, the same string the
// exclusions reader is handed, `tapped` the No list, `pickedEvents` the
// preview screen's tick list, null when they never touched it.
//
// Returns the promises that still stand, oldest first, each carrying the row
// it resolved to, the shape that read it and the sentence it came from.
export const readPromises = (messages, pools, { ownWords = "", tapped = [], pickedEvents = null } = {}) => {
  const thread = (Array.isArray(messages) ? messages : []).filter(m => m && !m.isError && !m.hidden);
  let standing = [];
  thread.forEach((m, i) => {
    if (m.role !== "assistant") return;
    const text = words(m.text);
    if (!text.trim()) return;
    const inDays = readDayPromises(text, pools);
    // A new plan written out replaces everything promised before it.
    if (inDays.length) standing = [];
    const fresh = [...inDays, ...readCommitments(text, pools)].map(p => ({ ...p, at: i }));
    for (const p of fresh) {
      if (standing.some(s => s.name.toLowerCase() === p.name.toLowerCase())) continue;
      standing.push(p);
    }
  });
  if (!standing.length) return [];

  const own = String(ownWords || "");
  const ruledOut = ruledOutFor(own, tapped, { known: candidates(pools).map(p => p.name) });
  const ticked = Array.isArray(pickedEvents) ? pickedEvents.map(clean) : null;

  return standing.filter(p => {
    // They ruled it out, typed or tapped, or a town it sits in.
    if (isExcluded(p.row, ruledOut)) return false;
    // They rejected it beside its name, in their own words.
    if (own && isRejectedPlace(own, p.name)) return false;
    // The conversation moved on after the promise: they named the place again,
    // or either side reached for a re-planning word, or Gemlyx walked it back.
    for (let j = p.at + 1; j < thread.length; j++) {
      const later = thread[j];
      const text = later.role === "assistant" ? words(later.text) : String(later.text || "");
      if (REPLAN.test(text)) return false;
      if (later.role === "user" && mentionsPlace(text, p.name)) return false;
      if (later.role === "assistant" && mentionsPlace(text, p.name) && isRejectedPlace(text, p.name)) return false;
    }
    // An event has its own tick on the preview screen. Ticked, the
    // chosen-events check owns it; touched and left unticked, they declined
    // it; never touched, Gemlyx's word is the only word there is.
    if (p.row?._src === "event" && ticked) return false;
    return true;
  }).map(({ at, ...rest }) => rest);
};

// ── THE COMPARISON ──────────────────────────────────────────────────
//
// A promise is kept when any stop's name or town is that place, in either
// spelling. In both directions on purpose: "Tivoli Gardens" promised and
// "Tivoli" planned is kept, and so is "Legoland" promised and "Legoland
// Billund Resort" planned. The direction that is loose ("Copenhagen Zoo"
// promised, a stop called "Copenhagen" planned) errs towards kept, which is a
// missed promise and not an accusation.
const keptBy = (days, name) => {
  const variants = matchVariantsOf(name);
  return (Array.isArray(days) ? days : []).some(d =>
    (Array.isArray(d?.stops) ? d.stops : []).some(s => {
      const sName = clean(s?.name), sTown = clean(s?.town);
      return variants.some(v =>
        (sName && (samePlaceName(sName, v) || containsName(sName, v) || containsName(v, sName)))
        || (sTown && (samePlaceName(sTown, v) || containsName(sTown, v))));
    }));
};

// The sentence, short enough to quote. Cut at a word, never mid-name.
const QUOTE_CAP = 120;
const quoted = (said) => {
  const s = clean(said).replace(/[.;:!,]+$/, "");
  if (s.length <= QUOTE_CAP) return s;
  const cut = s.lastIndexOf(" ", QUOTE_CAP);
  return `${s.slice(0, cut > 40 ? cut : QUOTE_CAP)}...`;
};

// Every promise the guide does not keep, each carrying what was SAID and what
// was FOUND, in the shape constraintCheck's violations use so the same report
// rules apply: a finding that only names the rule cannot be argued with.
export const brokenPromises = (promises, days) =>
  (Array.isArray(promises) ? promises : [])
    .filter(p => p && p.name && !keptBy(days, p.name))
    .map(p => ({
      kind: "promise", shape: p.shape, said: quoted(p.said), found: "",
      day: p.day, name: p.name,
      why: `In the chat I wrote "${quoted(p.said)}", and no day here has ${p.name}.`,
      fixable: true,
    }));

// ── AND SAY IT, IN THE VOICE OF THE ONE WHO SAID IT ─────────────────
//
// constraintNote opens "does not match what you told me", and that sentence
// is wrong here: a promise is something Gemlyx told them. Same shape, same
// tail, the other speaker. Quoting the sentence is what makes the finding
// checkable by the person reading it.
export const promiseNote = (broken) => {
  const v = (Array.isArray(broken) ? broken : []).filter(x => x && x.why);
  if (!v.length) return "";
  const head = v.length === 1
    ? "One thing here is not what I said in the chat."
    : `${v.length} things here are not what I said in the chat.`;
  return `${head} ${v.map(x => x.why).join(" ")} Say the word and I will rebuild around it.`;
};

// ── AND THE ONE MORE CALL, WHICH IS WHAT "FIXABLE" MEANS ────────────
//
// The exclusions audit asks the writer once more with the failure named and
// takes the rebuild only if it helped. This is that rule for a promise: fewer
// broken promises than before, every day kept, no day empty. Whether the
// rebuild added a violation of something the traveller SAID is the swap
// gate's question, and App.jsx asks it through swapIsAllowed rather than a
// copy here.
export const rebuildKeptMore = (before, after, promises) => {
  if (!Array.isArray(after?.days) || !Array.isArray(before?.days)) return false;
  if (after.days.length < before.days.length) return false;
  if (!after.days.every(d => Array.isArray(d?.stops) && d.stops.length > 0)) return false;
  return brokenPromises(promises, after.days).length < brokenPromises(promises, before.days).length;
};

export const promiseRetryBlock = (broken) => {
  const v = (Array.isArray(broken) ? broken : []).filter(x => x && x.why);
  if (!v.length) return "";
  return `YOUR LAST ATTEMPT LEFT OUT A PLACE THE CONVERSATION HAD ALREADY PROMISED. ${v.map(x => x.why).join(" ")} Add each of them as a real stop on the day where it fits the route, keep every other stop and every other day as it was, keep the same number of days, and never leave a day empty.`;
};
