// ── IS THIS ASSERTION PASSING ON A COMMENT? ────────────────────────
//
// Run it by hand: `node tests/comment-audit.mjs`. It is not part of the suite,
// and the last section of this file says why.
//
// 23 Aug 2026. tests/run.mjs asserts a lot of things by reading source text,
// which is the only instrument available for a 1.5 MB React component. The
// house style here is that a fix carries a comment quoting the line it removed,
// so a positive assertion can be satisfied by the comment explaining the bug
// rather than by the code that fixed it. It is green, it looks right, and it
// would stay green if somebody deleted the thing it claims to be checking.
//
// Two were found this way on the day it was written:
//
//   • AuthSheet: `ok("it says what is actually stored", /a few optional details
//     about yourself/.test(asheet))`. That wording had been REPLACED, and the
//     comment above the new sentence quoted the old one to explain why. The
//     whole paragraph could have gone with the assertion still green.
//
//   • FilterBar: `ok("and the sort still says it is not a filter", /changes the
//     ORDER of.../)`. That sentence is a comment in FilterBar explaining the
//     layout. No reader has ever seen it. The assertion was a reading of the
//     source's own explanation of itself.
//
// HOW IT WORKS: every positive `/re/.test(VAR)` in the suite where VAR is bound
// to a readFileSync of a project file gets its regex run twice, once on the raw
// file and once with the comments blanked by stripComments. A pattern that
// matches raw and not stripped is living in a comment.
//
// ── AND WHY IT IS NOT AN ASSERTION ─────────────────────────────────
//
// About nineteen hits are DELIBERATE: assertions that a documented decision is
// still documented, like the empty `catch { /* metering must never be able to
// break a request */ }` in apiCost.js, or the four rule headings in
// profileLearning.js. Those are the point, not a defect.
//
// Telling them apart needs a person, and an allow-list of nineteen patterns
// inside a green suite is a maintenance cost with no owner. Two of the current
// hits are also false positives from parsing regex literals with a regex: a
// negative written `!/fetch(\`\/api\/directions/` gets read from the middle. So
// this stays a sweep somebody runs while working on the suite, and the one
// check strict enough to be permanent lives in run.mjs instead: no negative
// about copy may be scanned with the strings blanked out.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "./tdz.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const suite = readFileSync(join(root, "tests/run.mjs"), "utf8");
const lines = suite.split("\n");

const binds = [];
lines.forEach((l, i) => {
  const m = l.match(/const\s+(\w+)\s*=\s*readFileSync\(join\(root,\s*"([^"]+)"\)/);
  if (m) binds.push({ v: m[1], file: m[2], line: i + 1 });
});

const cache = new Map();
const load = (f) => {
  if (!cache.has(f)) {
    const p = join(root, f);
    cache.set(f, existsSync(p) ? readFileSync(p, "utf8") : null);
  }
  return cache.get(f);
};

const findings = [];
lines.forEach((l, i) => {
  for (const m of l.matchAll(/(?<![!\\])\/((?:[^/\\\n]|\\.)+)\/([gimsuy]*)\.test\((\w+)\)/g)) {
    const [, pat, flags, v] = m;
    const b = binds.filter(x => x.v === v && x.line <= i + 1).pop();
    if (!b) continue;
    const raw = load(b.file);
    if (raw == null) continue;
    let re;
    try { re = new RegExp(pat, flags); } catch { continue; }
    if (re.test(raw) && !re.test(stripComments(raw))) {
      findings.push({ line: i + 1, file: b.file, pat });
    }
  }
});

console.log(`${findings.length} positive assertion${findings.length === 1 ? "" : "s"} matched only inside a comment.`);
console.log("Each one is either a deliberate check that a decision is still documented, or a bug.\n");
for (const f of findings) {
  console.log(`  run.mjs:${f.line}  [${f.file}]`);
  console.log(`    /${f.pat.length > 100 ? f.pat.slice(0, 100) + "…" : f.pat}/`);
}
