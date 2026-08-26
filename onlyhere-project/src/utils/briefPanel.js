// ── WHAT GEMLYX HAS UNDERSTOOD, SAID BACK AS A TRIP ─────────────────
//
// Oliver, 25 Aug 2026, looking at Layla's trip checklist: "it notes down the
// checklist of what Layla knows to plan the trip." Then, a minute later:
// "It's quite robotic tbf.. that's something I want ours to do better."
//
// Both halves are right. The IDEA is good and we should take it: showing the
// traveller what has been understood, before ninety seconds of generation, is
// the cheapest way to catch a misunderstanding while it still costs nothing.
// The EXECUTION is a data-capture form, and it reads like one.
//
// ── WHY THEIRS READS ROBOTIC, PRECISELY ─────────────────────────────
//
//   2 of 5 captured
//   ● WHO'S COMING        Two travelers
//   ● WHEN YOU'D GO       10-17 October 2026, 7 days
//   ○ WHERE FROM          I'll ask where you're setting off from
//
// Four separate things are doing it, and none of them is the layout:
//
//   IT COUNTS. "2 of 5 captured" turns a person into a completion percentage,
//   and puts a progress ring on them. The word "captured" is lead-generation
//   language, and the signup wall demanding a phone number two screens later
//   says what the five slots are actually for.
//
//   THE LABELS ARE FIELD NAMES. WHERE TO, WHERE FROM, WHO'S COMING. Uppercase,
//   terse, and named after the column rather than after the trip.
//
//   THE EMPTY SLOTS TALK ABOUT THE INTERVIEWER. "I'll ask where you're setting
//   off from" is the system narrating its own process. It says nothing about
//   what the answer would change.
//
//   IT IS THE SAME SHAPE WHETHER IT IS EMPTY OR FULL. A form does not become
//   a trip by having its fields filled in.
//
// ── SO THIS SHOWS AN UNDERSTANDING, NOT A CAPTURE ───────────────────
//
// Same information, composed as a sentence about THEIR trip:
//
//   Two of you, driving, 10 to 17 October, in and out of Billund.
//   Small places over cities.
//
//   I can't work out the ferries until I know whether you're driving.
//
// No count, no ring, no field names. The progress is legible from the sentence
// getting longer, which is how a person can already tell.
//
// AND THE GAP IS STATED AS A CONSEQUENCE RATHER THAN AS AN EMPTY BOX, which is
// the part that is not just tone. BRIEF_SLOTS already carries the reason inside
// every `ask`: dates "decide which events are on while you are here", a child's
// age "matters more than you would think", a booked hotel means "the whole plan
// should sit around it". Those reasons were written for the question and they
// work just as well for the gap. Layla's empty slot promises a question. This
// one says what is missing FROM THE TRIP.
//
// ── AND THE ONE LINE THEY WILL NEVER WRITE ──────────────────────────
//
// Under Layla's button: "Layla builds it now and fills anything you haven't
// covered." This codebase does the opposite and has done since 21 August, when
// Oliver said "I never said the dates to it. Despite it asking me. It assumed
// October." Dates and who is coming are HARD_SLOTS: being asked does not satisfy
// them and nothing builds until they are answered.
//
// That behaviour already exists. It has never been shown to anybody, which is
// what `willNotAssume` is for.
import { BRIEF_SLOTS, HARD_SLOTS, BLOCKING_SLOTS } from "./tripBrief";

const said = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// ── THE FOURTH STATE, WHICH IS THE ONE LAYLA'S PANEL CANNOT HAVE ────
//
// readOrigin and readParty both return the literal string "said in the
// conversation" when they can tell the topic WAS answered but will not invent
// the answer. readParty's own comment says why: "2 kids and my wife" is the real
// shape of that reply and it carries no number for the adults, so the reader
// reports that somebody said something rather than pretending to a headcount.
//
// That is the right call for a gate and it is fatal for a panel, because
// rendering it produces "in and out of said in the conversation", which is what
// the first run of this file did.
//
// So a brief has FOUR states per slot, not two:
//
//   known precisely      10 to 17 October
//   known loosely        sometime in October
//   ANSWERED, NOT READ   you've said, and it stays in your words
//   missing              nothing yet
//
// The third is the honest one and it is worth showing rather than hiding. A tick
// beside a value Gemlyx invented would be worse than a line admitting the
// sentence is being carried forward whole.
export const ACKNOWLEDGED = "said in the conversation";
export const isAcknowledged = (v) => said(v?.value) === ACKNOWLEDGED;
const slotOf = (key) => BRIEF_SLOTS.find(s => s.key === key) || null;

// ── SAYING A MONTH WITHOUT PRETENDING IT IS A DATE ──────────────────
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// ── AND readWhen HANDS BACK A DATE, NOT A STRING ────────────────────
//
// Caught by running the panel end to end, 25 Aug 2026, and it is worth writing
// down because of HOW it hid. A debug dump of the brief showed
// `"value": "2026-10-10T00:00:00.000Z"`, which reads as an ISO string and is
// not one: JSON.stringify renders a Date that way. String(date) is
// "Fri Oct 10 2026 00:00:00 GMT+0000", which this regex does not match, so the
// dates silently vanished from the sentence while every isolated test of
// whenPhrase passed.
//
// The isolated test passed BECAUSE I wrote the fixture as a string, from the
// dump. A fixture copied out of JSON.stringify is a fixture of the wrong type,
// and it is the same class as asserting the disclosure table instead of asking
// what a reader sees.
const isoOf = (v) => v instanceof Date ? (isNaN(v) ? "" : v.toISOString()) : String(v || "");

const dayMonth = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoOf(iso));
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : "";
};

const sameMonth = (a, b) => isoOf(a).slice(0, 7) === isoOf(b).slice(0, 7);

export const whenPhrase = (when) => {
  if (!when?.value) return "";
  if (when.precision === "month") {
    const m = /^(\d{4})-(\d{2})/.exec(isoOf(when.value));
    const name = m ? MONTHS[Number(m[2]) - 1] : "";
    // NOT "in October", which reads as settled. It is a month and the week
    // inside it decides which events exist, so the phrase says so itself.
    return name ? `sometime in ${name}` : "";
  }
  const from = dayMonth(when.value);
  if (!from) return "";
  const to = when.end ? dayMonth(when.end) : "";
  if (!to || to === from) return from;
  // "10 to 17 October" rather than "10 October to 17 October".
  return sameMonth(when.value, when.end)
    ? `${from.split(" ")[0]} to ${to}`
    : `${from} to ${to}`;
};

// ── ONE CLAUSE PER THING KNOWN ──────────────────────────────────────
//
// Written as clauses rather than as "Label: value" so they can be joined into a
// sentence. Every one of them is about the trip; not one of them names a field.
const PARTY_PHRASE = {
  solo: "on your own",
  alone: "on your own",
  couple: "two of you",
  family: "with the children",
};

const TRANSPORT_PHRASE = {
  car: "driving",
  driving: "driving",
  bike: "on a bike",
  cycling: "on a bike",
  transit: "by train and bus",
  public: "by train and bus",
  walk: "on foot",
  walking: "on foot",
};

export const clauseFor = (key, known) => {
  const v = known?.[key];
  if (!v?.value && v?.value !== 0) return "";
  // Never rendered as a value. It is not one.
  if (isAcknowledged(v)) return "";
  const raw = said(v.value);
  switch (key) {
    case "party": {
      const k = raw.toLowerCase();
      if (PARTY_PHRASE[k]) return PARTY_PHRASE[k];
      // A number of people, said their way: "two of you", "4 of you".
      return /^\d+$/.test(raw) ? `${raw} of you` : raw;
    }
    case "when": return whenPhrase(v);
    case "days": return /^\d+$/.test(raw) ? `${raw} days` : raw;
    case "origin": return `in and out of ${raw}`;
    case "transport": {
      const k = said(v.mode || raw).toLowerCase();
      return TRANSPORT_PHRASE[k] || raw;
    }
    case "stay": return raw === "booked" ? "with somewhere already booked" : "";
    case "interests": return raw;
    case "budget": return `around ${raw} a day`;
    default: return raw;
  }
};

// The order a person would say it in, which is not the order the slots are
// declared in. Interests go last because they are the one thing said in the
// traveller's own words and they read as the point rather than as a parameter.
const SENTENCE_ORDER = ["party", "transport", "when", "days", "origin", "stay", "budget"];

const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

// ── THE SENTENCE ────────────────────────────────────────────────────
//
// Returns "" when nothing is known, which is correct and is not an empty state
// to be filled with encouragement. A panel that says "Your trip is taking
// shape" over five empty slots is describing nothing.
export const briefSentence = (brief) => {
  const known = brief?.known || {};
  const shape = SENTENCE_ORDER.map(k => clauseFor(k, known)).filter(Boolean);
  const interests = clauseFor("interests", known);
  const out = [];
  if (shape.length) out.push(cap(shape.join(", ")) + ".");
  // Their own words get their own sentence rather than being appended to a
  // list of parameters, because that is what they are.
  if (interests) out.push(cap(interests.replace(/\.\s*$/, "")) + ".");
  return out.join(" ");
};

// ── THE GAPS, AS CONSEQUENCES ───────────────────────────────────────
//
// Not "I'll ask you about X". What is missing FROM THE TRIP, and what it costs.
// The reason for each is the one already written into the slot's own `ask`.
const GAP_COST = {
  origin: "I don't know where you're starting, so I can't tell you whether the first day is a drive or a train.",
  days: "I don't know how long you've got, so I can't tell you what fits.",
  when: "Without dates I can't tell you what's actually on while you're there.",
  party: "I don't know who's coming, and that changes the pace more than anything else here.",
  interests: "I'd be guessing at what to put in.",
  transport: "I can't work out the ferries and the crossings until I know how you're getting around.",
  stay: "If you've already booked somewhere, the whole plan should sit around it.",
  budget: "",
};

export const briefGaps = (brief) => {
  const keys = [...(brief?.missing || []), ...(brief?.unanswered || [])]
    .filter((k, i, a) => a.indexOf(k) === i);
  return keys
    .map(k => ({ key: k, hard: HARD_SLOTS.includes(k), say: GAP_COST[k] || "", ask: slotOf(k)?.ask || "" }))
    .filter(g => g.say);
};

// A month is still a month after somebody has asked about it. Kept separate
// from the gaps because it is not missing, it is imprecise, and the two want
// different words.
export const briefVagueNote = (brief) =>
  (brief?.vague || []).includes("when")
    ? "You've said the month but not the week, and the week is what decides which events exist."
    : "";

// ── THE LINE LAYLA WILL NEVER WRITE ─────────────────────────────────
//
// Theirs: "Layla builds it now and fills anything you haven't covered."
// Ours, and it has been the code's behaviour since 21 August:
export const willNotAssume = (brief) => {
  const open = HARD_SLOTS.filter(k => !brief?.known?.[k]);
  if (!open.length) return "";
  const names = open.map(k => slotOf(k)?.label || k);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `I won't guess ${list}. Everything else I'll fill in and tell you I did.`;
};

// ── THE CORRECTABLE LINES ───────────────────────────────────────────
//
// One per known fact, so a misunderstanding can be fixed BEFORE the build
// rather than found in the guide afterwards. This is the whole practical point
// of showing the brief at all.
//
// `source` comes through untouched, and it is the thing no competitor's panel
// has: every reader in tripBrief.js already records whether a value was TYPED
// by the traveller or TICKED in the intake form. The same distinction
// answerInLanguage leans on for the language rule, because a ticked box is not
// somebody's own words and must not be read as though it were.
export const briefLines = (brief) =>
  BRIEF_SLOTS
    .map(s => ({ slot: s, v: brief?.known?.[s.key] }))
    .filter(x => x.v && (x.v.value || x.v.value === 0))
    .map(({ slot, v }) => ({
      key: slot.key,
      label: slot.label,
      say: isAcknowledged(v) ? `you've told me ${slot.label}, and it stays in your own words` : clauseFor(slot.key, brief.known),
      acknowledged: isAcknowledged(v),
      typed: v.source === "said",
      hard: HARD_SLOTS.includes(slot.key),
    }))
    .filter(l => l.say);

// ── AND WHAT THE WHOLE PANEL SAYS, IN ONE CALL ──────────────────────
// A single shape so the render cannot assemble a different panel from the one
// the suite checks. Same reason AI_CHAT_SURFACES is a named list.
// ── "IT IS STILL GOOD TO SHOW IF EVERYTHING IS COMPLETE OR NOT" ─────
//
// Oliver, 26 Aug 2026: "we still haven't added in the method Layla uses with
// 4/5 questions answered or whatever. Yes we have filters and tick boxes. But
// it's still good to show if everything is complete or not."
//
// THIS REVERSES A DECISION MADE IN THIS FILE, and the old one is quoted rather
// than deleted so nobody re-argues it from scratch: "Deliberately NOT a count
// and NOT a fraction. '2 of 5 captured' is the thing Oliver called robotic, and
// a ratio is the most robotic possible way to describe how well somebody has
// been understood."
//
// Both are true, and they are answers to different questions. The objection was
// to a ratio standing IN PLACE OF being understood — a progress bar where a
// sentence should be. What he is asking for now is a ratio standing BESIDE it:
// somebody four questions into a conversation cannot tell whether they are
// nearly done or nowhere near, and the sentence, which is about what Gemlyx
// heard, does not answer that. So the count goes on and the sentence stays.
//
// ── COUNTED AGAINST WHAT ACTUALLY BLOCKS A BUILD ────────────────────
//
// Not all eight slots. Budget is optional and always has been, so counting it
// would show 7/8 on a brief that is complete and ready — a bar that never fills
// is worse than no bar. The denominator is BLOCKING_SLOTS, which is the same
// list `ready` is computed from, so "7 of 7" and "ready to build" cannot
// disagree.
//
// ── AND IT NAMES THE LAST ONE ───────────────────────────────────────
//
// "6 of 7" tells somebody they are nearly there and not what to do about it.
// The remaining slot's own label is right there, and one clause of it is the
// difference between a progress bar and a next step. When several are open it
// stays a count, because listing four things is the wall of questions the whole
// intake design is trying not to be.
export const briefProgress = (brief) => {
  const total = BLOCKING_SLOTS.length;
  const ready = !!brief?.ready;
  // ── AND `unanswered` IS NOT A SECOND SOURCE ─────────────────────
  //
  // The first version unioned `brief.unanswered` in here, on the reasoning that
  // a hard slot asked and dodged must not count as done. Mutation testing
  // deleted the union and the suite stayed green, and reading tripBrief.js says
  // why it had to: `unanswered = HARD_SLOTS.filter(k => !known[k] && asked)`.
  // Every member is already absent from `known`, so the union could never add a
  // key the first filter had not already found. The rule is real and it was
  // being enforced twice.
  //
  // Left as one filter rather than two, because a second reader of the same
  // question that happens to agree today is how two readers come to disagree
  // later — which is the failure this whole file keeps finding elsewhere.
  const stillOpen = BLOCKING_SLOTS.filter(k => !brief?.known?.[k]);
  return {
    done: ready ? total : Math.max(0, total - stillOpen.length),
    total,
    ready,
    open: stillOpen,
    // The label of the one thing left, or "" when it is none or many.
    last: stillOpen.length === 1 ? (slotOf(stillOpen[0])?.label || "") : "",
  };
};

// The sentence a reader sees. Kept here rather than in the render so the suite
// reads the same words the screen does.
export const progressLine = (progress) => {
  const p = progress || {};
  if (p.ready) return `Everything I need — ${p.total} of ${p.total}`;
  const n = Math.max(0, Number(p.done) || 0);
  if (p.last) return `${n} of ${p.total} — I still need ${p.last}`;
  const left = Array.isArray(p.open) ? p.open.length : 0;
  if (!left) return `${n} of ${p.total}`;
  return `${n} of ${p.total} — ${left} still to go`;
};

export const briefPanel = (brief) => ({
  sentence: briefSentence(brief),
  lines: briefLines(brief),
  gaps: briefGaps(brief),
  vague: briefVagueNote(brief),
  wontAssume: willNotAssume(brief),
  ready: !!brief?.ready,
  // The count sits BESIDE the sentence, never instead of it. See briefProgress.
  progress: briefProgress(brief),
});

// ── "MAKE A 76% COMPLETE" ────────────────────────────────────────────
//
// Oliver, 26 Aug 2026, with a red line drawn under the chat composer on the
// front page: "I want you to make a (eg.) '76% complete' depending on how much
// more the AI needs to have a result ready for the user."
//
// briefProgress above answers the same question as "6 of 7", and the two are
// deliberately separate functions rather than one returning both. A count is
// read as a list of things — six done, one to go — so its `done` has to stay a
// whole number or "6.5 of 7" appears on the screen. A percentage is read as a
// distance, and a distance can be half-travelled.
//
// ── THE ONE RULE THAT MAKES THE NUMBER MEAN ANYTHING ─────────────────
//
// 100% MEANS THE GUIDE CAN BE BUILT NOW, and nothing else may produce it. That
// is what "how much more the AI needs to have a result ready" asks, and it is
// why the denominator is BLOCKING_SLOTS and not all eight: counting the optional
// budget would cap an otherwise complete brief at 88% and a bar that never fills
// is worse than no bar. The clamp below is the same rule from the other side —
// a rounding that reaches 100 while the brief is not ready would promise a
// button that is not there.
//
// ── AND A VAGUE ANSWER IS HALF AN ANSWER ─────────────────────────────
//
// "Sometime in October" fills `when` and does not settle it, which is why
// tripBrief.js keeps `vague` as its own list. Counting it whole overstates what
// Gemlyx knows; counting it as nothing throws away a real answer and makes the
// bar jump backwards when somebody narrows a date they already gave. Half is
// the honest reading, and it has the side effect Oliver's example implies: the
// number moves in steps of about seven rather than fourteen.
export const briefPercent = (brief) => {
  const total = BLOCKING_SLOTS.length;
  if (!total) return 0;
  if (brief?.ready) return 100;
  const known = BLOCKING_SLOTS.filter(k => brief?.known?.[k]);
  const vague = known.filter(k => (brief?.vague || []).includes(k));
  const score = known.length - (vague.length * 0.5);
  const pct = Math.round((score / total) * 100);
  // Never 100 without `ready`, and never below 0. The first is the promise; the
  // second is only reachable if a future reader counts something negative, and
  // a bar that renders at -14% is a worse bug than the one that caused it.
  return Math.max(0, Math.min(99, pct));
};

// The words beside the bar. Here rather than in the render so the suite reads
// the same sentence the screen does, same as progressLine above.
export const percentLine = (brief) => {
  const pct = briefPercent(brief);
  if (brief?.ready) return "Ready to build";
  const open = BLOCKING_SLOTS.filter(k => !brief?.known?.[k]);
  const last = open.length === 1 ? (slotOf(open[0])?.label || "") : "";
  if (last) return `${pct}% complete — I still need ${last}`;
  // A vague answer is the other thing worth naming, because narrowing it is the
  // cheapest way for somebody to move the bar.
  const loose = BLOCKING_SLOTS.filter(k => brief?.known?.[k] && (brief?.vague || []).includes(k));
  if (!open.length && loose.length) return `${pct}% complete — pin down ${slotOf(loose[0])?.label || "the dates"} and I can build`;
  return `${pct}% complete`;
};
