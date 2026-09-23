// ── WHAT A LOCAL KNOWS, WRITTEN DOWN ────────────────────────────────
//
// Oliver, 23 Sep 2026: "I want it to learn from me. Like I might tell it
// 'Both Kombardo Ekspressen and Flixbus are budget alternatives to DSB.'
// Then it can further investigate that. If it determines that is wrong at
// certain days, well then it won't obey to that. I can also say that it would
// be a good idea to get to know a local. Do you think it is possible to make
// something like this? I want Gemlyx AI to actually be as close to a local as
// possible."
//
// Everything the chat says today came off a page somebody else wrote. That is
// what makes it safe and it is also what makes it a search engine with a
// friendly voice: the one thing it cannot say is the thing a local would say
// first. This file is the other source. He writes a sentence, it is checked,
// and what survives reaches the prompt as what a local told us.
//
// ── THE RULE THAT DECIDES WHO WINS ──────────────────────────────────
//
// Agreed with him the same day: ON HOW A THING IS, HE WINS. ON WHAT IT COSTS,
// THE PAGE WINS. He has stood in the bar and the page has not, so a page that
// never mentions the queue does not beat him on the queue. A price is the
// other way round: what he paid in March is what it cost in March, and a page
// stating a different figure is stating today's.
//
// ── AND THE CONDITION, WHICH IS THE PART WORTH PAYING FOR ───────────
//
// Oliver, 23 Sep 2026, of his own example: "With the Flixbus, Kombardo, and
// Orange billet.. it really depends on how far ahead you order it. Because
// what I'm talking about is like a DSB ticket is very expensive if ordered
// from day-to-day.. but if ordered several weeks ahead, then it's cheap."
//
// So a note is never a sentence with a true or false against it. His own
// first example is true this week and false in six weeks, and WHICH of those
// the traveller is in is the whole value of knowing it. A note carries the
// condition it holds under, and the research pass is not marking him right or
// wrong: it is looking for what NARROWS the sentence. "depends" is the most
// useful answer it can come back with, not a failure.
import { fold } from "./danishNames";
import { hostOf } from "./pageScan";

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

// The row type in gemlyx_content. Out of CONTENT_TYPES for the same reason a
// gem is: nothing drafts one through the normal pipeline, and the only way a
// note is made is him writing it.
export const NOTE_TYPE = "note";

// ── THE THREE SORTS OF THING HE CAN SAY ─────────────────────────────
//
// The sort decides who wins a disagreement, how long it lasts, and whether
// there is anything to check at all.
export const NOTE_KINDS = ["how", "cost", "advice"];
export const NOTE_KIND_LABEL = {
  how: "How a thing is",
  cost: "What a thing costs",
  advice: "Something worth doing",
};
export const NOTE_KIND_MEANING = {
  how: "What a place is like, when it is busy, who goes there, what the walk from the station is. You win this one: a page that does not mention it has not contradicted it.",
  cost: "A price, a fare, one thing being cheaper than another. The page wins the figure, and a page stating a different one is stating today's.",
  advice: "Something you would tell a friend to do. Nothing to check, because it is not a claim about the world.",
};

// ── WHAT THE PASS MADE OF IT ────────────────────────────────────────
//
// holds      a page says the same thing
// depends    a page narrows it, and the narrowing is the interesting half
// against    a page says something else about the same thing
// notfound   no page says either way, which for a note is ordinary
export const NOTE_CHECKS = ["holds", "depends", "against", "notfound"];

// ── HOW LONG A SENTENCE IS GOOD FOR ─────────────────────────────────
//
// A price moves and how a street feels does not, so the two do not go stale
// at the same speed. Advice never does: "get to know a local" was true before
// Gemlyx existed.
export const NOTE_LIFE = { how: 540, cost: 150, advice: 0 };
export const NOTE_RECHECK = { how: 270, cost: 90, advice: 0 };

const dayOf = (v) => {
  const s = clean(v);
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const noteAgo = (note, today = new Date()) => {
  const d = dayOf(note?.checkedAt);
  if (!d) return null;
  return Math.round((startOf(today).getTime() - startOf(d).getTime()) / 86400000);
};

// ── THE ONE INSERT SHAPE ────────────────────────────────────────────
export const shapeNote = (t = {}) => {
  const kind = NOTE_KINDS.includes(clean(t.kind)) ? clean(t.kind) : "";
  return {
    // HIS SENTENCE, IN HIS WORDS. Never rewritten by the pass and never
    // rewritten by the chat: the prompt quotes it, so a model that improves
    // it is improving something he said.
    said: clean(t.said).slice(0, 300),
    kind,
    // WHEN IT HOLDS. Empty means always, which is a real answer for "the walk
    // from Aalborg station takes ten minutes" and a wrong one for most prices.
    when: clean(t.when).slice(0, 200),
    // What the sentence is about, for the matcher. Written by him or filled
    // from his own words: see noteSubjects.
    about: clean(t.about).slice(0, 160),
    // Where it applies. Empty is all of Denmark.
    towns: (Array.isArray(t.towns) ? t.towns : []).map(clean).filter(Boolean).slice(0, 12),
    check: NOTE_CHECKS.includes(clean(t.check)) ? clean(t.check) : "",
    // WHAT THE PASS FOUND, in the page's words. A narrowing when it depends,
    // the other figure when it is against, empty otherwise.
    found: ["depends", "against"].includes(clean(t.check)) ? clean(t.found).slice(0, 300) : "",
    source: clean(t.source),
    checkedAt: clean(t.checkedAt).slice(0, 10),
  };
};

// The words a note is found by. His own subject line first, then the sentence
// itself, because he will not always write one and the sentence is where the
// subject was anyway.
const SKIP = /^(a|an|and|the|at|on|in|of|is|are|be|it|its|to|for|from|with|you|your|they|their|them|that|this|then|than|when|if|but|so|or|as|by|not|no|can|could|would|should|will|shall|do|does|did|get|gets|got|go|goes|going|have|has|had|all|any|very|just|also|more|most|much|many|like|about|into|over|out|up|down|there|here|what|which|who|how|why|one|two|good|idea|og|er|det|den|de|du|man|kan|til|med|for|på|som|har|ikke|hvis|når)$/i;
// A PLURAL IS THE SAME SUBJECT. He writes "trains and buses" and the
// traveller types "is the train expensive", and a matcher comparing whole
// words finds nothing in common between those two sentences. So both sides
// lose a trailing s and then a trailing e, which turns train/trains and
// bus/buses into one token and is as far as this needs to go: the words being
// matched are his subject line, not a language.
const stem = (w) => {
  let s = fold(w);
  if (s.length > 3 && s.endsWith("s")) s = s.slice(0, -1);
  if (s.length > 3 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
};
const words = (text) => String(text || "")
  .replace(/[^\p{L}\p{N}\s]+/gu, " ")
  .split(/\s+/)
  .filter(w => w.length > 2 && !SKIP.test(w))
  .map(stem)
  .filter(Boolean);

export const noteSubjects = (note = {}) =>
  [...new Set(words(`${clean(note.about)} ${clean(note.said)}`))];

// ── WHAT A NOTE STILL OWES ──────────────────────────────────────────
//
// Sentences rather than a boolean, the same as a gem. `blocks` is true when
// the note must not reach a traveller at all.
export const noteProblems = (payload = {}, today = new Date()) => {
  const n = shapeNote(payload);
  const out = [];
  let blocks = false;
  if (!n.said) { out.push("Nothing written."); blocks = true; }
  if (!n.kind) { out.push("Not marked as how a thing is, what it costs, or something worth doing."); blocks = true; }
  if (n.kind === "advice") {
    // Nothing to check, so nothing below applies. Advice is not a claim about
    // the world and a page agreeing with it would not make it truer.
    if (n.source) out.push("Advice needs no page behind it, and the one here is ignored.");
    return { problems: out, blocks };
  }
  if (!n.check) out.push("Not checked yet. It reaches nobody until the pass has looked.");
  // ── HIS RULE, ENFORCED ──────────────────────────────────────────
  //
  // A price the page disagrees with does not go out in his words, because on
  // a figure the page wins and the note would be stating the wrong one. How a
  // thing IS goes out anyway, carrying what the page said, because a page has
  // never stood in the room.
  if (n.check === "against") {
    if (n.kind === "cost") {
      out.push(`A page says ${n.found || "something else"}. On what a thing costs the page wins, so reword this to the page's figure or drop it.`);
      blocks = true;
    } else {
      out.push(`A page says ${n.found || "something else"}. On how a thing is you win, so this goes out with that noted beside it.`);
    }
  }
  if (n.check === "depends" && !n.when) {
    out.push(`The pass found this holds only sometimes. Write when, or the traveller gets the half of it that is wrong for them.`);
    blocks = true;
  }
  if (n.kind === "cost" && !n.when) {
    out.push("A price with no when. Say what it depends on, even if the answer is the day of the week.");
  }
  if (n.source && !/^https:\/\//i.test(n.source)) out.push("The page behind it is not an https address.");
  const ago = noteAgo(n, today);
  const life = NOTE_LIFE[n.kind] || 0;
  const again = NOTE_RECHECK[n.kind] || 0;
  if (ago == null) { out.push("No date on it."); blocks = true; }
  else if (life && ago > life) out.push(`Written ${ago} days ago, which is too long ago for ${n.kind === "cost" ? "a price" : "this"}. Say it again or let it go.`);
  else if (again && ago > again) out.push(`Written ${ago} days ago. Worth reading back before somebody travels on it.`);
  return { problems: out, blocks };
};

// Whether a traveller may be told it. Same argument as gemLive: a decision, so
// it can be asserted without a browser.
export const noteLive = (payload, today = new Date()) => {
  const n = shapeNote(payload);
  if (noteProblems(n, today).blocks) return false;
  if (n.kind === "advice") return true;
  if (!n.check) return false;
  const ago = noteAgo(n, today);
  const life = NOTE_LIFE[n.kind] || 0;
  return ago != null && ago >= 0 && (!life || ago <= life);
};

// ── PICKED BEFORE THE CALL, NEVER DURING IT ─────────────────────────
//
// Oliver, 23 Sep 2026: "Is that how the AI will work? That it will look
// through it while chatting with the person?"
//
// No. A store the model queries costs a call per message and lets a page put
// a note into a conversation it has no business being in. So code picks the
// few that match what the traveller wrote, before the model is called, the
// same way every other block in that prompt is built. Nothing matches,
// nothing goes in.
//
// THREE AT MOST. A block of eleven notes is a block the model writes a reply
// out of rather than a reply of its own, and the point of this was a local
// who knows a thing, not a local who recites.
export const MAX_NOTES = 3;

export const notesFor = (travellerText = "", rows = [], { town = "", today = new Date(), max = MAX_NOTES } = {}) => {
  if (!clean(travellerText)) return [];
  const said = new Set(words(travellerText));
  const text = ` ${fold(clean(travellerText))} `;
  const here = fold(clean(town));
  const scored = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!noteLive(row, today)) continue;
    const n = shapeNote(row);
    const towns = n.towns.map(fold);
    // A note about one town is that town's. It reaches a conversation that
    // names the town, and no other: a note about Aalborg nightlife in a
    // Copenhagen trip is noise wearing a local's clothes.
    const townHit = towns.length ? towns.some(t => t === here || text.includes(t)) : true;
    if (!townHit) continue;
    const score = noteSubjects(n).filter(w => said.has(w)).length
      + (towns.length && towns.some(t => t === here) ? 1 : 0);
    if (!score) continue;
    scored.push({ note: n, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.note.said.localeCompare(b.note.said))
    .slice(0, Math.max(0, max))
    .map(s => s.note);
};

// ── AND HANDED OVER AS SOMEBODY'S WORDS, NOT AS A FACT ──────────────
//
// The model is told three things about every line: who said it, when it
// holds, and what a page made of it. A note that no page backs is still worth
// saying and is not worth saying as though it were checked, and the
// difference between those two is the whole reason this is safe.
export const NOTE_LINE = (n) => {
  const bits = [`"${n.said}"`];
  if (n.when) bits.push(`HOLDS: ${n.when}`);
  if (n.kind === "advice") bits.push("THIS IS ADVICE, not a fact to check");
  else if (n.check === "holds") bits.push(`A page says the same${n.source ? ` (${hostOf(n.source)})` : ""}`);
  else if (n.check === "depends") bits.push(`BUT a page narrows it: ${n.found}. Say that part too`);
  else if (n.check === "against") bits.push(`A page says ${n.found}. Say his and say the page's, and let them choose`);
  else bits.push("No page says either way, so say it as something a local told us");
  if (n.towns.length) bits.push(`ONLY FOR: ${n.towns.join(", ")}`);
  return `- ${bits.join(". ")}`;
};

export const notesBlock = (notes = []) => {
  const list = (Array.isArray(notes) ? notes : []).filter(Boolean);
  if (!list.length) return "";
  return `\n── WHAT A LOCAL TOLD US, WHICH IS NOT ON ANY PAGE ──\n`
    + `These are from the Dane who built Gemlyx, about the thing this traveller is asking about. They are the half a search cannot give them, so use the ones that fit and leave the rest.\n`
    + `SAY IT IN YOUR OWN WORDS, never as a quotation and never crediting a founder or a website: you are the local here, so this is something you know.\n`
    + `THE CONDITION IS PART OF THE CLAIM. A line that holds only when something is true is wrong without that something, and stating it bare is worse than not stating it: "the bus is cheaper than the train" is a lie to somebody booking six weeks out.\n`
    + `NEVER STATE ONE AS CHECKED when the line says no page backs it. It is a local's word, it is worth having, and it is not a timetable.\n\n`
    + `${list.map(NOTE_LINE).join("\n")}\n`;
};

// ── THE PASS THAT LOOKS FOR WHAT NARROWS IT ─────────────────────────
//
// Oliver, 23 Sep 2026: "Then it can further investigate that. If it
// determines that is wrong at certain days, well then it won't obey to that."
//
// Not a fact checker. A fact checker asked whether the bus is cheaper than
// the train answers yes or no and both answers are wrong. This is asked what
// the sentence DEPENDS ON, and the useful run is the one that comes back with
// a condition he had not written down.
export const noteSearches = (note = {}) => {
  const n = shapeNote(note);
  const said = clean(n.said);
  if (!said) return [];
  const subject = clean(n.about) || noteSubjects(n).slice(0, 3).join(" ");
  const where = n.towns.length ? ` ${n.towns[0]}` : "";
  return [
    `${said}${where}`.slice(0, 140),
    `${subject}${where} pris sammenligning`.slice(0, 140),
    `${subject}${where} ${n.kind === "cost" ? "how much does it cost" : "what to expect"}`.slice(0, 140),
  ].filter(Boolean);
};

export const NOTE_PROMPT = (note, results = []) => {
  const n = shapeNote(note);
  const list = results.map((r, i) => `[${i}] ${clean(r.title)}\n${clean(r.url)}\n${clean(r.snippet)}`).join("\n\n");
  return `A Dane who lives in Denmark says this, and a travel guide is about to repeat it to visitors:\n\n"${n.said}"\n`
    + (n.when ? `They say it holds ${n.when}.\n` : "")
    + (n.towns.length ? `It is about ${n.towns.join(", ")}.\n` : "")
    + `\nYOU ARE NOT MARKING THEM RIGHT OR WRONG. You are looking for what the sentence DEPENDS ON, because the sentence is about the real world and most sentences about the real world hold under some conditions and not others. A condition you find is the most useful thing you can come back with.\n\n`
    + `Respond with ONLY strict JSON: {"check":"holds|depends|against|notfound","found":"","when":"","source":0}\n\n`
    + `"holds": a result says the same thing, under no condition worth naming.\n`
    + `"depends": a result shows it is true some of the time and not the rest. FOUND is what the result says, in under thirty words, and WHEN is the condition the sentence holds under, written as you would say it to a traveller.\n`
    + `"against": a result says something different about the same thing. FOUND is what the result says, in under thirty words.\n`
    + `"notfound": no result says either way. This is an ordinary answer. A result about something else is not a result about this.\n\n`
    + `SOURCE IS THE NUMBER OF THE RESULT you used, or -1 when there is none. Never an address.\n`
    + `A PAGE NOT MENTIONING SOMETHING HAS NOT DENIED IT. Only a result stating something different is "against".\n`
    + `Write plain English. No dashes of any kind.\n\n${list}`;
};

export const settleNote = (json, note, results = [], { today = new Date() } = {}) => {
  const n = shapeNote(note);
  const at = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // A pass that answers with something else answered notfound. Never "holds":
  // a silence must not be readable as agreement.
  const check = NOTE_CHECKS.includes(clean(json?.check)) ? clean(json.check) : "notfound";
  const i = Number(json?.source);
  const hit = Number.isInteger(i) && i >= 0 && i < results.length ? results[i] : null;
  const url = hit && /^https?:\/\//i.test(clean(hit.url)) ? clean(hit.url) : "";
  // A verdict standing on a page it cannot name is a verdict about nothing.
  const settled = (check === "holds" || check === "depends" || check === "against") && !url ? "notfound" : check;
  return shapeNote({
    ...n,
    check: settled,
    found: settled === "notfound" ? "" : clean(json?.found),
    // HIS CONDITION SURVIVES THE PASS. What it found is added where he wrote
    // nothing, and never written over what he did write: he is the one who
    // has been doing this for years.
    when: n.when || (settled === "depends" ? clean(json?.when) : ""),
    source: settled === "notfound" ? "" : url,
    checkedAt: at,
  });
};

// What the Studio says about a run, one line per thing he should know.
export const noteRunNotes = (note = {}) => {
  const n = shapeNote(note);
  if (n.kind === "advice") return ["Advice, so nothing was checked. It goes up as something you would tell a friend."];
  if (n.check === "holds") return [`A page says the same thing${n.source ? `, on ${hostOf(n.source)}` : ""}.`];
  if (n.check === "depends") return [`It holds some of the time: ${n.found}`, n.when ? `Written down as holding ${n.when}.` : "Write when it holds before this goes up."];
  if (n.check === "against") {
    return n.kind === "cost"
      ? [`A page says ${n.found}. On a figure the page wins, so this one does not go up as you wrote it.`]
      : [`A page says ${n.found}. On how a thing is you win, so it goes up with that noted beside it.`];
  }
  return ["No page says either way. It goes up as a local's word, and the chat will say so rather than stating it as checked."];
};
