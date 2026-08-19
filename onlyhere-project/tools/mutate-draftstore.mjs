// Mutation run over src/utils/studioDraftStore.js and its wiring in App.jsx.
// A green suite proves the tests RUN; a mutation run proves they MEASURE.
//
// SIGNAL HANDLERS AND A MANIFEST, both standard here since 19 Aug: a `finally`
// does not run on SIGTERM (node's default handler exits immediately), and a run
// killed by a tool timeout left a mutant applied in previewCoverage.js. The next
// thing that would have appeared is a green suite over a file that was quietly
// wrong. The md5 check after every run is the belt to that brace.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const FILES = ["src/utils/studioDraftStore.js", "src/App.jsx", "src/components/DetailPage.jsx", "src/utils/helpers.js"];
const originals = new Map(FILES.map(f => [f, readFileSync(f, "utf8")]));
const md5 = (s) => createHash("md5").update(s).digest("hex");
const manifest = new Map([...originals].map(([f, s]) => [f, md5(s)]));
const restore = () => originals.forEach((s, f) => writeFileSync(f, s));
["SIGTERM", "SIGINT", "SIGHUP"].forEach(sig =>
  process.on(sig, () => { restore(); process.exit(1); }));

const M = [
  // ── The three that must ride with a draft ──
  ["S", 'frozenGeo: isObj(r.frozenGeo) ? r.frozenGeo : null,', 'frozenGeo: null,'],
  ["S", 'identityWarning: r.identityWarning ?? null,', 'identityWarning: null,'],
  ["S", 'inventedWarning: r.inventedWarning ?? null,', 'inventedWarning: null,'],
  ["S", 'draft: r.draft,', 'draft: {},'],
  // ── Refusals ──
  ["S", 'if (!isObj(r.draft)) return null;', 'if (false) return null;'],
  ["S", 'if (!name) return null;', ''],
  ["S", 'if (typeof r.type !== "string" || !r.type) return null;', ''],
  ["S", 'if (parsed.v !== STORE_VERSION) return { store: null, problem: STORE_PROBLEMS.WRONG_VERSION };', ''],
  ["S", 'if (age < 0 || age > DRAFT_TTL_MS)', 'if (age > DRAFT_TTL_MS)'],
  ["S", 'if (age < 0 || age > DRAFT_TTL_MS)', 'if (age < 0)'],
  ["S", 'if (!Number.isFinite(at) || at <= 0) return { store: null, problem: STORE_PROBLEMS.UNREADABLE };', ''],
  ["S", 'if (!isObj(parsed)) return { store: null, problem: STORE_PROBLEMS.UNREADABLE };', ''],
  // ── Constants ──
  ["S", 'export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;', 'export const DRAFT_TTL_MS = 1 * 24 * 60 * 60 * 1000;'],
  ["S", 'export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;', 'export const DRAFT_TTL_MS = 400 * 24 * 60 * 60 * 1000;'],
  ["S", 'export const MAX_RESULTS = 40;', 'export const MAX_RESULTS = 4;'],
  ["S", 'export const STORE_VERSION = 1;', 'export const STORE_VERSION = 2;'],
  // ── The cap ──
  ["S", 'return { results: list.slice(list.length - max), dropped: list.length - max };', 'return { results: list.slice(0, max), dropped: list.length - max };'],
  ["S", 'return { results: list.slice(list.length - max), dropped: list.length - max };', 'return { results: list.slice(list.length - max), dropped: 0 };'],
  // ── Quota ──
  ["S", 'catch { return { ok: false, problem: STORE_PROBLEMS.QUOTA, dropped: 0 }; }', 'catch { return { ok: true, dropped: 0 }; }'],
  ["S", 'if (!results.length) return { ok: false, problem: STORE_PROBLEMS.QUOTA, dropped };', 'if (!results.length) return { ok: true, dropped };'],
  ["S", 'try { storage.removeItem(DRAFT_STORE_KEY); return { ok: true, cleared: true, dropped: 0 }; }', 'try { return { ok: true, dropped: 0 }; }'],
  // ── The words ──
  ["S", '? " It comes back as a fresh draft, not as an edit of a published row, so check the prices and hours before publishing."', '? " Ready to publish."'],
  ["S", 'if (mins < 2) return "just now";', 'if (mins < 0) return "just now";'],
  ["S", 'if (!Number.isFinite(ms) || ms < 0) return "an unknown time ago";', 'if (false) return "an unknown time ago";'],
  ["S", 'if (days === 1) return "yesterday";', 'if (false) return "yesterday";'],
  ["S", 'return days === 1 ? "yesterday" : `${days} days ago`;', 'return `${days} days ago`;'],
  ["S", 'case STORE_PROBLEMS.EXPIRED:', 'case "never":'],
  // ── Never pay twice ──
  ["S", '.map(r => `${r.type}::${String(r.name).toLowerCase()}`);', '.map(r => `${r.type}::${String(r.name)}`);'],
  ["S", '.filter(r => r && r.name && r.type)', '.filter(() => true)'],
  // ── The wiring in App.jsx ──
  ["A", 'const doneRef = useRef(new Set(doneKeysFrom(restoredStudioDrafts().store?.results)));', 'const doneRef = useRef(new Set());'],
  ["A", '(restoredStudioDrafts().store?.results || []).map(r => ({ ...r, ok: true, error: null })));', '[]);'],
  ["A", 'const res = writeStore(storage, store);', 'const res = { ok: true };'],
  ["A", 'setDraftSaveProblem(res.ok ? null : problemNote(res.problem));', ''],
  ["A", 'if (typeof saved.text === "string" && saved.text.trim()) setStudioDraftText(saved.text);', ''],
  // ── The removed field ──
  ["H", '// stayDurationForCategory lived here until 19 Aug 2026.', 'export const stayDurationForCategory = () => "2 to 3 hours";\n//'],
  ["D", '{ icon: "💰", label: "Extra Costs", value: item.extraCosts },', '{ icon: "\\u23F1\\uFE0F", label: "Time Needed", value: item.timeNeeded },\n            { icon: "💰", label: "Extra Costs", value: item.extraCosts },'],
];
const FILE_OF = { S: "src/utils/studioDraftStore.js", A: "src/App.jsx", H: "src/utils/helpers.js", D: "src/components/DetailPage.jsx" };

let survived = 0, killed = 0, inapplicable = 0;
M.forEach(([tag, from, to], i) => {
  const f = FILE_OF[tag];
  const src = originals.get(f);
  if (!src.includes(from)) { inapplicable++; console.log(`  ?? ${i} NOT FOUND in ${f}: ${from.slice(0, 60)}`); return; }
  writeFileSync(f, src.replace(from, to));
  let green = true;
  try { execFileSync("node", ["tests/run.mjs"], { stdio: "pipe" }); } catch { green = false; }
  restore();
  // The manifest, checked after EVERY run and not only at the end.
  for (const [g, h] of manifest) if (md5(readFileSync(g, "utf8")) !== h) { console.error(`RESTORE FAILED on ${g}`); process.exit(2); }
  if (green) { survived++; console.log(`  SURVIVED ${i} [${f}] ${from.slice(0, 70)}`); }
  else killed++;
});
console.log(`\n  ${killed} killed, ${survived} survived, ${inapplicable} not applicable\n`);
process.exit(survived ? 1 : 0);
