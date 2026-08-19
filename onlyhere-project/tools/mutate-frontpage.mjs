// Mutations over the three reader-facing fixes of 19 August evening: the front
// page lenses, the one filter surface, and the event month buckets. Each mutant
// restores the original bug.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const FILES = ["src/App.jsx", "src/utils/eventDates.js", "src/components/FilterBar.jsx"];
const originals = new Map(FILES.map(f => [f, readFileSync(f, "utf8")]));
const md5 = (s) => createHash("md5").update(s).digest("hex");
const manifest = new Map([...originals].map(([f, s]) => [f, md5(s)]));
const restore = () => originals.forEach((s, f) => writeFileSync(f, s));
["SIGTERM", "SIGINT", "SIGHUP"].forEach(sig => process.on(sig, () => { restore(); process.exit(1); }));
const M = [
  ["E", 'if (!b || b.getTime() < a.getTime()) return [first];', 'if (!b) return [first];'],
  ["E", 'while (cur.getTime() <= last.getTime() && out.length < MAX_EVENT_MONTHS) {', 'while (cur.getTime() <= last.getTime()) {'],
  ["E", 'while (cur.getTime() <= last.getTime()', 'while (cur.getTime() < last.getTime()'],
  ["E", 'return [...new Set(out)];', 'return out;'],
  ["E", 'export const eventMonths = (e) => eventMonthsShort(e?.date ?? e?.dateStart, e?.dateEnd);',
        'export const eventMonths = (e) => eventMonthsShort(e?.date ?? e?.dateStart, "");'],
  ["A", 'const inEventMonth = (e, m) => (m === UNDATED ? isUndated(e.date) : eventMonths(e).includes(m));',
        'const inEventMonth = (e, m) => (m === UNDATED ? isUndated(e.date) : eventMonthShort(e.date) === m);'],
  ["A", '...MONTHS.filter(m => upcomingInTab.some(e => eventMonths(e).includes(m))),',
        '...MONTHS.filter(m => upcomingInTab.some(e => eventMonthShort(e.date) === m)),'],
  ["A", "pick: (x) => x.popularityTag === \"Hidden Gem\" || tierOf(x)?.id === \"worth\" },",
        "pick: (x) => x.popularityTag === \"Hidden Gem\" || x.tier === \"Worth Considering\" },"],
  ["A", "const shown = ranked ? rows : fallback;", "const shown = rows;"],
  ["A", "const fallback = !ranked && pool.length > 0", "const fallback = false && pool.length > 0"],
  ["F", "{facets.map(f => {", "{[].map(f => {"],
];
const FILE_OF = { A: "src/App.jsx", E: "src/utils/eventDates.js", F: "src/components/FilterBar.jsx" };
let survived = 0, killed = 0, na = 0;
M.forEach(([tag, from, to], i) => {
  const f = FILE_OF[tag];
  const src = originals.get(f);
  if (!src.includes(from)) { na++; console.log(`  ?? ${i} NOT FOUND in ${f}: ${from.slice(0, 60)}`); return; }
  writeFileSync(f, src.replace(from, to));
  let green = true;
  try { execFileSync("node", ["tests/run.mjs"], { stdio: "pipe" }); } catch { green = false; }
  restore();
  for (const [g, h] of manifest) if (md5(readFileSync(g, "utf8")) !== h) { console.error(`RESTORE FAILED on ${g}`); process.exit(2); }
  if (green) { survived++; console.log(`  SURVIVED ${i} [${f}] ${from.slice(0, 70)}`); }
  else killed++;
});
console.log(`\n  ${killed} killed, ${survived} survived, ${na} not applicable\n`);
process.exit(survived ? 1 : 0);
