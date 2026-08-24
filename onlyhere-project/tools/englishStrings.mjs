// ── THE ENGLISH FRAME, COUNTED ──────────────────────────────────────
//
// HANDOFF_NEXT.md point 2: "Around ninety hardcoded English strings on the
// guide surface, no t() and no catalogue anywhere." The 23 August handoff says
// ~150. Neither number came from counting, and the difference between ninety
// and a hundred and fifty is the difference between an evening and a weekend.
//
// This counts them. It is a REPORT, not an assertion: it is not part of
// `node tests/run.mjs` and nothing fails because of it, for the same reason
// tests/comment-audit.mjs is kept out of the run.
//
// Comments are stripped with tests/tdz.mjs `stripComments`, not with a regex
// and not at all. Both mistakes are recorded in the 23 August handoff:
// scanning raw source finds the explanatory comment above a fix and reports the
// bug report as the bug, and `stripNonCode` blanks string CONTENTS, which is
// every single thing this file is looking for.
//
//   node tools/englishStrings.mjs            summary by file
//   node tools/englishStrings.mjs --list     every string, with line numbers
//   node tools/englishStrings.mjs --json     machine readable, for the catalogue
//
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../tests/tdz.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The guide surface, which is what a traveller reads after the conversation
// ends, plus the two screens they read before it. App.jsx is included whole
// because the guide render lives inside it; that is the 1.5 MB problem, not a
// choice made here.
const FILES = [
  "src/pages/GuidePage.jsx",
  "src/components/GuidePreviewScreen.jsx",
  "src/components/AskGemlyx.jsx",
  "src/components/ChatPlaceCards.jsx",
  "src/components/EventMatchCard.jsx",
  "src/components/JourneyCard.jsx",
  "src/components/GuideRouteMap.jsx",
  "src/components/WeatherStrip.jsx",
  "src/components/WeatherHeaderStrip.jsx",
  "src/components/LiveEventsHeaderStrip.jsx",
  "src/components/AtAGlanceCard.jsx",
  "src/components/GemlyxFindCard.jsx",
  "src/components/DetailPage.jsx",
  "src/components/ReviewsSection.jsx",
  "src/components/PhotoCredit.jsx",
  "src/components/HowWeKnow.jsx",
  "src/App.jsx",
];

// ── WHAT COUNTS AS A READER-FACING ENGLISH STRING ───────────────────
//
// The test is deliberately conservative in one direction: a false positive
// costs somebody ten seconds of reading, and a false negative is a string that
// stays English in a Danish guide forever. So the filters below refuse only
// things that CANNOT be copy, and never guess about things that might be.

const isUrlish = (s) => /^(https?:|\/|#|mailto:|data:|tel:)/i.test(s) || /^[\w.-]+\.(com|dk|org|net|io|jpg|png|svg|webp|json|js|jsx|css|html)$/i.test(s);
const isCssish = (s) =>
  /^#[0-9a-f]{3,8}$/i.test(s) ||
  /^-?\d[\d.]*(px|rem|em|%|vh|vw|deg|ms|s|fr)?$/i.test(s) ||
  /^(rgba?|hsla?|linear-gradient|calc|translate|scale|rotate|blur|var)\(/i.test(s) ||
  /^(flex|grid|block|inline(-\w+)?|none|auto|center|left|right|start|end|space-between|space-around|column|row|wrap|nowrap|absolute|relative|fixed|sticky|hidden|visible|pointer|default|bold|normal|italic|uppercase|lowercase|capitalize|ellipsis|contain|cover|border-box|content-box|scroll|smooth|transparent|currentColor|inherit|initial|unset)$/i.test(s) ||
  /^\d+px\s+/.test(s) ||
  /^(solid|dashed|dotted)\s/.test(s);
// A key, an identifier, an event name, a locale tag. One token, no space.
const isIdentifierish = (s) => !/\s/.test(s) && (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(s) || /^[a-z0-9_]+$/i.test(s) || /^[a-z]{2}(-[A-Z]{2})?$/.test(s));
// Danish or German already. Not perfect and not meant to be: a string carrying
// æ ø å ß or a Danish function word is not the English frame.
const looksNordicOrGerman = (s) => /[æøåÆØÅßäöüÄÖÜ]/.test(s) || /\b(og|eller|ikke|kan|skal|din|dit|dine|jeg|vi|hvor|hvad|når|som|med|til|for den|har|ved|und|oder|nicht|dein|deine|mit|für|beim|ist)\b/i.test(s);

// Two or more words, or a single word long enough to be a label rather than a
// key. "Overview" is copy. "gold" is a token.
const READER_WORD = /^(overview|tickets?|events?|map|weather|transport|essentials|days?|today|tomorrow|book|booking|save|saved|share|shared|close|back|next|cancel|retry|loading|more|less|free|open|closed|from|to|by|walk|walking|drive|driving|cycle|cycling|train|bus|ferry|hotel|stay|food|drink|nightlife|towns?|attractions?|price|budget|area|type|style|all|none|yes|no)$/i;

// JavaScript that a text harvester mistook for prose. `>` is the JSX closing
// bracket and it is also greater-than, so `{items.length > 0 && (` reads as a
// text node sitting between two tags. No sentence a traveller reads contains
// any of these.
const isCode = (s) => /(&&|\|\||=>|===|!==|\?\?|\.length\b|\.map\(|\.includes\(|\.filter\(|\{\{|\}\}|=\{)/.test(s);

// A fragment: the harvester started or stopped inside an expression. Real copy
// does not open with a comma, a colon or a closing bracket, and does not carry
// the leftovers of a `${` it was cut at.
const isFragment = (s) => /^[,:;)\]}?.]/.test(s) || /[$`]/.test(s) || /\)\}$/.test(s) || /^\w+[:,]$/.test(s);

const looksLikeCopy = (s) => {
  const t = s.trim();
  if (t.length < 2 || t.length > 400) return false;
  if (isCode(t) || isFragment(t)) return false;
  if (isUrlish(t) || isCssish(t) || isIdentifierish(t)) return false;
  if (looksNordicOrGerman(t)) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  // Mostly-symbol strings: separators, emoji-only labels, arrows.
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters / t.length < 0.4) return false;
  if (/\s/.test(t)) return true;
  return READER_WORD.test(t);
};

// ── FINDING THEM ────────────────────────────────────────────────────
// Two harvests, because JSX puts copy in two places and a scan for one of them
// reports half a file as clean.

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

// A backtick pattern that stops at `$` and nothing else swallows whole blocks
// of JSX: the engine fails on the first `${`, restarts past it, and pairs THIS
// template's closing backtick with the NEXT template's opening one. The first
// run of this file reported forty lines of styling as one string that way. A
// lone `$` is allowed through; only `${` ends a plain template.
const PLAIN_BACKTICK = "`((?:\\\\.|\\$(?!\\{)|[^\\\\`$])*)`";

// ── AND A LITERAL IN A RENDERED SLOT IS COPY, NOT A GUESS ───
//
// The difference between the 734 below and the number that matters is that a
// bare string literal in this file might be a label, a diagnostic nobody sees,
// or a few-shot example inside a prompt. A literal sitting in one of these
// slots is on the screen, and there is nothing to argue about. Same discipline
// as the rest of the repo: prefer the check that cannot be satisfied by
// something adjacent to the thing you meant.
const RENDERED_SLOT = /(placeholder|aria-label|title|alt|label|heading|subtitle|cta|button|tooltip|caption|empty|error)\s*[=:]\s*$/i;

const harvestLiterals = (stripped) => {
  const out = [];
  // Single and double quoted, and backticks with no interpolation. A template
  // holding ${} is a sentence assembled at runtime and belongs in the catalogue
  // as a shape rather than as a string, so it is reported separately below.
  const re = new RegExp(`(['"])((?:\\\\.|(?!\\1)[^\\\\\\n])*)\\1|${PLAIN_BACKTICK}`, "g");
  let m;
  while ((m = re.exec(stripped))) {
    const raw = m[2] !== undefined ? m[2] : m[3];
    if (raw === undefined) continue;
    // A literal spanning real newlines is this harvester having swallowed code,
    // never a label. Checked before the escapes are unfolded, since "\n" inside
    // a sentence is legitimate and a raw newline is not.
    if (/\n/.test(raw)) continue;
    const s = raw.replace(/\\n/g, " ").replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
    if (looksLikeCopy(s)) out.push({ kind: RENDERED_SLOT.test(stripped.slice(Math.max(0, m.index - 40), m.index)) ? "attr" : "literal", text: s, at: m.index });
  }
  return out;
};

const harvestJsxText = (stripped) => {
  const out = [];
  // Text sitting between tags. Crude on purpose: it over-collects rather than
  // under-collects, and everything it collects still has to pass looksLikeCopy.
  const re = />([^<>{}]{2,300})</g;
  let m;
  while ((m = re.exec(stripped))) {
    const s = m[1].replace(/\s+/g, " ").trim();
    if (looksLikeCopy(s)) out.push({ kind: "jsx", text: s, at: m.index + 1 });
  }
  return out;
};

const harvestTemplates = (stripped) => {
  const out = [];
  const re = /`((?:\\.|[^\\`])*)`/g;
  let m;
  while ((m = re.exec(stripped))) {
    const raw = m[1];
    if (!raw.includes("${")) continue;
    const skeleton = raw.replace(/\$\{[^}]*\}/g, "{}").replace(/\s+/g, " ").trim();
    // The words around the holes are the copy. Judge those, not the whole.
    const words = skeleton.replace(/\{\}/g, " ").trim();
    if (looksLikeCopy(words)) out.push({ kind: "template", text: skeleton, at: m.index });
  }
  return out;
};

// ── AND A PROMPT IS NOT COPY EITHER ─────────────────────────
//
// Most of the long English in App.jsx is addressed to a model, not to a
// traveller: STUDIO_VOICE, the guide build instructions, the JSON shape blocks.
// Those must stay in one language and translating them would break the guide,
// so counting them as "the English frame" inflates the job several times over.
//
// The 23 August handoff records the argument for the ONE exception already
// made: `nativeBlock` in readerLanguage.js is written in Danish on purpose,
// because an instruction ABOUT Danish written IN English is the fault it warns
// about. That is a deliberate per-language prompt, not a UI string, and it is
// not what this count is for.
const looksLikePrompt = (s) => {
  if (s.length > 120) return true;
  if (/\b(JSON|Respond with|Return ONLY|DO NOT|NEVER|ALWAYS|strict JSON|You are)\b/.test(s)) return true;
  // Three or more consecutive shouted words is an instruction, not a label.
  if (/\b[A-Z]{3,}\b(\s+\b[A-Z]{2,}\b){2,}/.test(s)) return true;
  return false;
};

// ── AND THE STUDIO IS NOT PART OF THIS ──────────────────────
//
// App.jsx holds the traveller's whole app AND the founder Studio in one file,
// so a raw count over it answers the wrong question by a wide margin. The
// Studio is one person's admin tool, in one language, and translating it would
// be work with no reader.
//
// The boundary is found by balancing braces out from each `isStudio &&` render
// block rather than by a line number, because a line number in a 1.5 MB file is
// wrong by the end of the week that writes it.
const studioSpans = (stripped) => {
  const spans = [];
  const re = /\{\s*isStudio\s*&&/g;
  let m;
  while ((m = re.exec(stripped))) {
    let depth = 0, i = m.index;
    for (; i < stripped.length; i++) {
      const c = stripped[i];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) break; }
    }
    spans.push([m.index, i]);
  }
  return spans;
};
const inSpans = (spans, at) => spans.some(([a, b]) => at >= a && at <= b);

const report = [];
for (const rel of FILES) {
  let src;
  try { src = readFileSync(join(root, rel), "utf8"); } catch { continue; }
  const stripped = stripComments(src);
  const spans = rel.endsWith("App.jsx") ? studioSpans(stripped) : [];
  const found = [...harvestLiterals(stripped), ...harvestJsxText(stripped), ...harvestTemplates(stripped)];
  const seen = new Set();
  const rows = [];
  for (const f of found) {
    const key = f.kind + " " + f.text;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ file: rel, line: lineOf(stripped, f.at), kind: f.kind, text: f.text, studio: inSpans(spans, f.at), prompt: looksLikePrompt(f.text) });
  }
  rows.sort((a, b) => a.line - b.line);
  const reader = rows.filter(r => !r.studio && !r.prompt);
  if (rows.length) report.push({
    file: rel,
    rows: reader,
    studioCount: rows.filter(r => r.studio).length,
    promptCount: rows.filter(r => !r.studio && r.prompt).length,
  });
}

const total = report.reduce((n, r) => n + r.rows.length, 0);
const arg = process.argv[2] || "";

if (arg === "--json") {
  console.log(JSON.stringify({ total, files: report }, null, 2));
} else if (arg === "--list") {
  for (const { file, rows } of report) {
    console.log(`\n=== ${file}  (${rows.length}) ===`);
    for (const r of rows) console.log(`  ${String(r.line).padStart(6)}  ${r.kind.padEnd(8)}  ${r.text}`);
  }
  console.log(`\n${total} strings across ${report.length} files.`);
} else {
  for (const { file, rows, studioCount, promptCount } of report) {
    const byKind = rows.reduce((a, r) => (a[r.kind] = (a[r.kind] || 0) + 1, a), {});
    const parts = Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(", ");
    const extra = [
      studioCount ? `${studioCount} Studio` : "",
      promptCount ? `${promptCount} model prompt` : "",
    ].filter(Boolean).join(", ");
    console.log(`${String(rows.length).padStart(5)}  ${file}  (${parts})${extra ? `  [excluded: ${extra}]` : ""}`);
  }
  const certain = report.reduce((n, r) => n + r.rows.filter(x => x.kind === "jsx" || x.kind === "attr").length, 0);
  console.log(`\n${total} unique reader-facing English strings across ${report.length} files.`);
  console.log(`${certain} of them are certainly on a screen: a JSX text node, or a literal in a rendered slot.`);
  console.log(`The remaining ${total - certain} are bare literals and templates, which are a mix of labels and`);
  console.log(`internal diagnostics. Read those before translating; do not translate the list wholesale.`);
  console.log(`Run with --list for every one of them, or --json for the catalogue.`);
}
