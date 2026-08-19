// Mutation run over the eight pipeline bug fixes of 19 August 2026.
// A green suite proves the tests RUN; a mutation run proves they MEASURE. Each
// mutant below restores the ORIGINAL BUG, so a survivor means the fix is not
// actually held in place by anything.
//
// Signal handlers plus an md5 manifest, standard here since the run that was
// killed by a tool timeout and left a mutant applied.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const FILES = ["src/App.jsx", "src/utils/planGate.js", "src/utils/glanceExtract.js"];
const originals = new Map(FILES.map(f => [f, readFileSync(f, "utf8")]));
const md5 = (s) => createHash("md5").update(s).digest("hex");
const manifest = new Map([...originals].map(([f, s]) => [f, md5(s)]));
const restore = () => originals.forEach((s, f) => writeFileSync(f, s));
["SIGTERM", "SIGINT", "SIGHUP"].forEach(sig => process.on(sig, () => { restore(); process.exit(1); }));

const M = [
  // 1. the negated mode
  ["A", "const modeText = withoutNonModes(lc);", "const modeText = lc;"],
  ["A", "const travelMode = mentionedModes.includes(primaryKey) ? primaryKey : (mentionedModes[0] || null);", "const travelMode = mentionedModes[0] || null;"],
  // 2. the arrival resolver
  ["A", "arrivalPoint(convoText, { townPoint: townPointFor })", "arrivalPoint(convoText)"],
  // 3. the ticketmaster date stamp
  ["A", 'by: "ticketmaster",', 'source: "ticketmaster",'],
  ["A", "dates: [off.start, off.end].filter(Boolean).map(String),", "dates: [],"],
  // 4. the date gate's key
  ["A", '${editingId !== null ? "date" : "dateStart"}', 'dateStart'],
  // 5. the town centre published as a pin
  ["A", "if (!editedCoord && frozenCoord && !studioFrozenGeo.fromTownCentre) {", "if (!editedCoord && frozenCoord) {"],
  // 6. the tier gate
  ["A", 'if ("tier" in shaped && !tierOf(shaped)) {', "if (false) {"],
  // 7. the codegen defaults
  ["A", "tier: ${J(t.tier)}", 'tier: ${J(t.tier || "Worth Considering")}'],
  ["A", "popularityTag: ${J(t.popularityTag)}", 'popularityTag: ${J(t.popularityTag || "Hidden Gem")}'],
  ["A", "ticketStatus: ${J(t.ticketStatus)}", 'ticketStatus: ${J(t.ticketStatus || "on_sale")}'],
  // 8. the island matcher
  ["P", "if ((words.named || []).some(w => namedIn(haystack, w))) continue;", ""],
  ["P", 'island: { claim: ["island", "islands", "øen", "øer"], deliver: ["island", "islands", "øen", "øer"], named: DK_ISLANDS },',
        'island: { claim: ["island", "islands", "øen", "øer"], deliver: ["island", "islands", "øen", "øer", ...DK_ISLANDS] },'],
  ["P", 'if (hay[end] === "s") end += 1;', ""],
  ["P", "const startsWord = !isLetter(hay[i - 1]);", "const startsWord = true;"],
  ["P", "if (startsWord && (ownsCompounds || !isLetter(hay[end]))) return true;", "if (startsWord) return true;"],
  ["P", 'export const ISLAND_KOMMUNE_NAMES = ["ærø", "samsø", "fanø", "læsø", "langeland", "bornholm", "mors"];',
        'export const ISLAND_KOMMUNE_NAMES = ["ærø", "samsø", "fanø", "læsø", "langeland", "bornholm", "mors", "møn"];'],
  // 9. the glance describe crash
  ["G", "Array.isArray(x?.missing) && x.missing.length", "false"],
  ["A", "Array.isArray(x.missing) && x.missing.length", "true"],
];
const FILE_OF = { A: "src/App.jsx", P: "src/utils/planGate.js", G: "src/utils/glanceExtract.js" };

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
