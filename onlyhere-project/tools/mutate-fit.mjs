// Mutants restoring the two bugs he reported by eye: a nightclub offered as
// nature, and "room for 2" said when only one event exists.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const FILES = ["src/utils/interestFit.js", "src/utils/tripEvents.js", "src/components/GuidePreviewScreen.jsx"];
const originals = new Map(FILES.map(f => [f, readFileSync(f, "utf8")]));
const md5 = (s) => createHash("md5").update(s).digest("hex");
const manifest = new Map([...originals].map(([f, s]) => [f, md5(s)]));
const restore = () => originals.forEach((s, f) => writeFileSync(f, s));
["SIGTERM","SIGINT","SIGHUP"].forEach(s => process.on(s, () => { restore(); process.exit(1); }));
const M = [
  ["I", 'export const rowThemeWords = (theme) =>\n  (THEME_WORDS[theme] || []).filter(w => !ARRIVAL_WORDS.has(w));',
        'export const rowThemeWords = (theme) => (THEME_WORDS[theme] || []);'],
  ["I", '"walk", "walks", "walking", "bike", "bikes", "biking", "cycle", "cycling", "green",',
        '"bike", "bikes", "biking", "cycle", "cycling", "green",'],
  ["I", '"walk", "walks", "walking", "bike", "bikes", "biking", "cycle", "cycling", "green",',
        '"walk", "walks", "walking", "bike", "bikes", "biking", "cycle", "cycling",'],
  ["I", '"walk", "walks", "walking", "bike", "bikes", "biking", "cycle", "cycling", "green",',
        '"walk", "walks", "walking", "bike", "bikes", "biking", "cycle", "cycling", "green", "park", "parks",'],
  ["T", 'if (avail <= n) {', 'if (false) {'],
  ["T", 'export const describePicks = (limit, picked, tickable = Infinity) => {',
        'export const describePicks = (limit, picked, tickable = 0) => {'],
  ["T", '? "One event added, and it is the only one running while you are here."',
        '? "One event added."'],
  ["G", 'describePicks(eventPlan.limit, picked.length, eventPlan.rows.filter(r => r.tickable).length)',
        'describePicks(eventPlan.limit, picked.length)'],
];
const F = { I: "src/utils/interestFit.js", T: "src/utils/tripEvents.js", G: "src/components/GuidePreviewScreen.jsx" };
let s2 = 0, k = 0, na = 0;
M.forEach(([t, from, to], i) => {
  const f = F[t], src = originals.get(f);
  if (!src.includes(from)) { na++; console.log(`  ?? ${i} NOT FOUND: ${from.slice(0,50)}`); return; }
  writeFileSync(f, src.replace(from, to));
  let green = true;
  try { execFileSync("node", ["tests/run.mjs"], { stdio: "pipe" }); } catch { green = false; }
  restore();
  for (const [g, h] of manifest) if (md5(readFileSync(g, "utf8")) !== h) { console.error("RESTORE FAILED " + g); process.exit(2); }
  if (green) { s2++; console.log(`  SURVIVED ${i} [${f}] ${from.slice(0,60)}`); } else k++;
});
console.log(`\n  ${k} killed, ${s2} survived, ${na} not applicable\n`);
process.exit(s2 ? 1 : 0);
