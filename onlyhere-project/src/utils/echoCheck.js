// ── DID WE WRITE IT, OR DID WE MOVE IT ───────────────────────────────
//
// Oliver, 17 Aug 2026: "about sources we use. The ones we use, are we allowed to
// use them all? And do you rewrite it properly so we do not getting plagiat?"
//
// The second half of that question had no answer in this codebase, only an
// argument. The argument is a good one: a source's page text is fetched for
// TARGETED EXTRACTION (a price, a date, a ticket link), search results are kept
// as a title and a snippet, an OpenAI pass turns the research into organized
// notes, and Claude writes prose from the notes. Two abstraction layers, and
// nothing raw is stored on the published row. That is the right architecture and
// it was already here.
//
// It is still an argument. Nothing measured it. The invented-claim pass proves
// the opposite direction, that a claim traces back to the research, and a
// sentence can trace back perfectly while being the source's own sentence with
// two words changed. So this measures the direction nobody was looking at.
//
// ── WHAT IT COMPARES, AND WHY THAT IS THE RIGHT TEXT ────────────────
// The snippets the pipeline already holds, keyed by URL. They are short, and
// that is the point rather than a limitation: the organized notes were built
// from those snippets, so if a sentence is going to echo anything, it echoes
// them. Nothing new is fetched and nothing extra is stored.
//
// ── IT REPORTS. IT DOES NOT SENTENCE ────────────────────────────────
// Copyright protects expression and not facts, and where the line falls is a
// judgement a person makes with the words in front of them. So this returns the
// run it found, the field it is in and the URL it matches, and stops. A function
// here deciding "this is plagiarism" would be inventing a legal conclusion, in a
// codebase whose whole discipline is refusing to invent conclusions.
import { fold } from "./danishNames";

// Eight consecutive words. Short enough to catch a lifted clause, long enough
// that ordinary travel-writing phrasing does not trip it: "in the middle of the
// old town" is six, and a snippet is a few dozen words, so an accidental
// eight-word collision is a genuinely unlikely event rather than a daily one.
export const ECHO_RUN = 8;

// Folded, so æ ø å and case cannot hide a copy, and stripped of punctuation, so
// re-punctuating a sentence is not a rewrite. \p{L} keeps Danish letters as
// letters instead of splitting on them.
export const echoWords = (text) =>
  fold(String(text ?? ""))
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

// Padded on both ends so a match is always whole words. Without the padding,
// "esbjerg" matches inside "esbjergs" and the run reads one word longer than it is.
const haystack = (words) => ` ${words.join(" ")} `;

// The longest run of consecutive words from the draft that appears verbatim in
// the source. { run: 0 } when nothing of at least `min` words matches.
//
// Greedy rather than exhaustive: once a run is found it is extended as far as it
// goes and the scan continues AFTER it, because the same run shifted along by one
// word is the same finding and reporting it nine times would bury the real one.
export const longestEcho = (draftText, sourceText, { min = ECHO_RUN } = {}) => {
  const d = echoWords(draftText);
  const src = echoWords(sourceText);
  const none = { run: 0, words: "" };
  const step = Math.max(2, Math.trunc(Number(min) || ECHO_RUN));
  if (d.length < step || src.length < step) return none;
  const hay = haystack(src);
  let best = none;
  for (let i = 0; i + step <= d.length; i++) {
    if (!hay.includes(` ${d.slice(i, i + step).join(" ")} `)) continue;
    let len = step;
    while (i + len < d.length && hay.includes(` ${d.slice(i, i + len + 1).join(" ")} `)) len++;
    if (len > best.run) best = { run: len, words: d.slice(i, i + len).join(" ") };
    i += len - 1;
  }
  return best;
};

// ── A PLACE'S OWN NAME IS NOT A COPIED SENTENCE ─────────────────────
// The one false positive worth building for. "Det Nye Museum for Papirkunst i
// Hjørring" is seven words before anything is copied, and a source page about it
// contains that name too, of course it does. A run that is the name plus a word
// of glue is a name, and flagging it would train the reader of this report to
// ignore it, which is worse than not having the report.
//
// So the name's own words come out of the run first, and what is left has to
// still be long enough on its own.
const withoutName = (words, name) => {
  const drop = new Set(echoWords(name));
  return drop.size ? words.filter(w => !drop.has(w)) : words;
};

export const isNameEcho = (words, name, { min = ECHO_RUN } = {}) => {
  const w = String(words || "").split(/\s+/).filter(Boolean);
  if (!w.length) return false;
  // NO NAME MEANS NOTHING TO EXCUSE. Without this the function answers "yes" for
  // every short run, because withoutName returns the words unchanged and any run
  // under the threshold then reads as a name. Caught by its own test: a caller
  // that forgot to pass the name would have had every finding silently dropped,
  // which is the worst possible failure for a gate whose job is to report.
  const named = echoWords(name);
  if (!named.length) return false;
  return withoutName(w, name).length < Math.max(2, Math.trunc(Number(min) || ECHO_RUN));
};

// Every written field against every source, worst first.
//
// `fields` is what the WRITER wrote: pass App.jsx's writtenFields(t), which
// already strips the underscore fields and everything the pipeline measured. A
// measured field is supposed to match its source exactly, and checking a
// coordinate or a station name for "originality" is a category error, the same
// one the fact-checker made on 12 August.
//
// A value may be a string or an array of strings, because Things to Know is a
// list and a lifted bullet is exactly as much of a problem as a lifted sentence.
export const echoInDraft = (fields, saidByUrl, { name = "", min = ECHO_RUN } = {}) => {
  const said = saidByUrl instanceof Map ? [...saidByUrl.entries()]
    : Object.entries(saidByUrl && typeof saidByUrl === "object" ? saidByUrl : {});
  if (!said.length || !fields || typeof fields !== "object") return [];
  const hits = [];
  Object.entries(fields).forEach(([field, value]) => {
    const texts = Array.isArray(value) ? value : [value];
    texts.forEach(text => {
      if (typeof text !== "string" || !text.trim()) return;
      said.forEach(([url, sourceText]) => {
        const found = longestEcho(text, sourceText, { min });
        if (!found.run) return;
        if (isNameEcho(found.words, name, { min })) return;
        hits.push({ field, url: String(url || ""), run: found.run, words: found.words });
      });
    });
  });
  // Longest run first, then by field so one draft always produces one report.
  hits.sort((a, b) => (b.run - a.run) || String(a.field).localeCompare(String(b.field)));
  return hits;
};

// One line for the founder's notes. It quotes the run, because the whole point is
// that a person looks at the words and decides: a shared clause naming an opening
// time is a fact arriving intact, and a shared clause describing an atmosphere is
// somebody else's writing.
export const describeEcho = (hits, { min = ECHO_RUN } = {}) => {
  const list = Array.isArray(hits) ? hits.filter(h => h && h.run) : [];
  if (!list.length) return `No run of ${min} words or more in this draft appears in any source we read. Nothing here is lifted.`;
  const worst = list[0];
  const rest = list.length > 1 ? ` ${list.length - 1} other ${list.length === 2 ? "run" : "runs"} of ${min} or more, in ${[...new Set(list.slice(1).map(h => h.field))].join(", ")}.` : "";
  return `WORDING SHARED WITH A SOURCE. ${worst.run} consecutive words in ${worst.field} also appear on ${worst.url}: "${worst.words}". Facts arrive intact and that is fine; a described scene or an opinion in somebody else's words is not, so read the run and decide which this is.${rest}`;
};
