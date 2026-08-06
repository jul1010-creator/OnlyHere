// ── Gemlyx regression tests ────────────────────────────────────────
// Oliver, 6 Aug 2026, agreeing these were the highest-leverage missing thing.
//
// WHY THESE EXIST, stated plainly so nobody deletes them later: every rule in
// this file is a bug that actually shipped and was actually found by a human
// fact-checking a live entry. Without a test, each one can come back silently
// and nobody learns about it until the next fact-check months later.
//
// Two of these caught bugs in my OWN fixes on the day they were written: a lazy
// regex quantifier that turned "5 hours 53 mins" into "5h", and a licence gate
// that let CC BY-NC through. Both looked fine by eye.
//
// Deliberately zero dependencies and no test framework. `node tests/run.mjs`
// runs it. Adding vitest would mean a config file, a dev dependency and a
// version to keep current, for a suite this size.
//
// Only PURE functions are tested. Nothing here touches the network, Supabase,
// or React, so it always runs in about a second and can never be flaky.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let passed = 0, failed = 0;
const fails = [];
const is = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; } else { failed++; fails.push(`${name}\n     expected ${e}\n     actual   ${a}`); }
};
const ok = (name, cond) => is(name, !!cond, true);

// The app's modules use Vite-style extensionless imports ("../data/towns"),
// which bare Node cannot resolve, so everything is bundled once with the esbuild
// that already ships inside Vite. No new dependency, and it keeps the tests
// running against the REAL source rather than a copy that could drift.
const root = fileURLToPath(new URL("../", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "gemlyx-test-"));
const entry = join(dir, "entry.js");
const bundle = join(dir, "bundle.mjs");
writeFileSync(entry, `
  export { arrivalRow, transitDepartureAnchor, departureParam, scanForAITells } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { auditEntry, auditAll } from ${JSON.stringify(join(root, "src/utils/entryAudit.js"))};
  export { mergeSaves } from ${JSON.stringify(join(root, "src/utils/userSaves.js"))};
  export { licenseUrl, creditIsRequired } from ${JSON.stringify(join(root, "src/utils/imageCredits.js"))};
  export { STUDIO_VOICE } from ${JSON.stringify(join(root, "src/utils/studioContent.js"))};
`);
const esbuild = [
  join(root, "node_modules/.bin/esbuild"),
  join(root, "node_modules/esbuild/bin/esbuild"),
].find(existsSync);
if (!esbuild) {
  console.error("\n  Could not find esbuild in node_modules. Run `npm install` first.\n");
  process.exit(1);
}
try {
  execFileSync(esbuild, [entry, "--bundle", "--format=esm", "--platform=node", `--outfile=${bundle}`], { stdio: "pipe" });
} catch (e) {
  console.error("\n  Bundling failed:\n" + String(e.stderr || e.message));
  process.exit(1);
}
const M = await import("file://" + bundle);
const { arrivalRow, transitDepartureAnchor, departureParam, auditEntry, auditAll, mergeSaves, licenseUrl, creditIsRequired } = M;

// ── arrivalRow: label the arrival point for what it IS ─────────────
// Bug: every content type was hardcoded to "🚆 Nearest Station", so
// "Sælvig Ferry Terminal" appeared under a train icon and the word Station.
is("arrivalRow ferry terminal", arrivalRow("Sælvig Ferry Terminal").label, "Nearest Terminal");
is("arrivalRow danish havn", arrivalRow("Hou Havn").label, "Nearest Terminal");
is("arrivalRow danish faerge", arrivalRow("Odden Færgehavn").label, "Nearest Terminal");
is("arrivalRow ferry beats bus", arrivalRow("Bus to Sælvig Ferry Terminal").label, "Nearest Terminal");
is("arrivalRow bus stop", arrivalRow("Bus stop at the village square").label, "Nearest Bus Stop");
is("arrivalRow rutebilstation", arrivalRow("Rutebilstation").label, "Nearest Bus Stop");
is("arrivalRow airport", arrivalRow("Kastrup Airport").label, "Nearest Airport");
is("arrivalRow metro", arrivalRow("Nørreport Metro").label, "Nearest Metro");
is("arrivalRow real station", arrivalRow("Ribe Station").label, "Nearest Station");
is("arrivalRow empty", arrivalRow("").label, "Nearest Station");
is("arrivalRow null", arrivalRow(null).label, "Nearest Station");
is("arrivalRow never rewrites value", arrivalRow("Hou Havn").value, "Hou Havn");

// ── transit departure anchor ───────────────────────────────────────
// Bug: no departure_time meant "if you left right now", so a town's PERMANENT
// travel time depended on the minute the draft ran. Nysted published as a 6
// hour journey when it is 2.
{
  const ts = transitDepartureAnchor();
  const d = new Date(ts * 1000);
  ok("anchor is in the future", ts * 1000 > Date.now());
  is("anchor lands on a Tuesday", d.getDay(), 2);
  is("anchor is 09:00 local", [d.getHours(), d.getMinutes()], [9, 0]);
  ok("anchor is within 8 days", ts * 1000 - Date.now() < 8 * 864e5);
}
ok("departureParam anchors transit", departureParam("transit").startsWith("&departure_time="));
is("departureParam leaves driving alone", departureParam("driving"), "");
is("departureParam leaves walking alone", departureParam("walking"), "");

// ── mergeSaves: an account must never destroy a trip ───────────────
{
  const P = (k, i) => ({ kind: k, id: i, name: `p${i}` });
  const G = (i, d) => ({ id: i, savedAt: d });
  let r = mergeSaves([P("town", 1)], [P("town", 2)], [G(1, "2026-08-01")], [G(2, "2026-07-01")]);
  is("merge keeps both sides", [r.places.length, r.guides.length], [2, 2]);
  r = mergeSaves([P("town", 1)], [P("town", 1)], [G(1, "2026-08-01")], [G(1, "2026-08-01")]);
  is("merge dedupes", [r.places.length, r.guides.length], [1, 1]);
  is("merge same id other kind kept", mergeSaves([P("town", 5)], [P("food", 5)], [], []).places.length, 2);
  is("merge empty cloud keeps local", mergeSaves([P("town", 1), P("town", 2)], [], [], []).places.length, 2);
  is("merge empty local pulls cloud", mergeSaves([], [P("town", 1)], [], []).places.length, 1);
  is("merge respects the 40 cap", mergeSaves(
    Array.from({ length: 35 }, (_, i) => P("town", i)),
    Array.from({ length: 35 }, (_, i) => P("town", 100 + i)), [], []).places.length, 40);
  is("merge newest guide first", mergeSaves([], [], [G(1, "2026-01-01"), G(2, "2026-09-01")], []).guides[0].id, 2);
  is("merge survives junk", mergeSaves([null, { name: "no id" }, P("town", 1)], undefined, [undefined], null).places.length, 1);
}

// ── image credits ──────────────────────────────────────────────────
is("licence deed url", licenseUrl("CC BY-SA 3.0"), "https://creativecommons.org/licenses/by-sa/3.0/");
is("unknown licence has no url", licenseUrl("Some Custom Licence"), null);
is("CC BY-SA requires credit", creditIsRequired({ license: "CC BY-SA 4.0" }), true);
is("CC0 does not require credit", creditIsRequired({ license: "CC0" }), false);
is("missing licence does not require credit", creditIsRequired({}), false);

// ── entryAudit: which published entries need redrafting ────────────
{
  const base = { name: "Test", blogBody: [{ type: "paragraph", content: "x ".repeat(200) }], photo: "/a.jpg", uncertainties: [] };
  const clean = auditEntry({ id: 1, type: "town", payload: { ...base, __lat: 55.1, __lon: 9.1 } });
  is("clean entry passes", clean.verdict, "Looks fine");
  is("clean entry has no findings", clean.findings.length, 0);

  const noTransport = auditEntry({ id: 2, type: "town", payload: { ...base, __lat: 55.1, __lon: 9.1,
    gettingThereReality: "There is no confirmed public transport route from Copenhagen, so a car is the only bet." } });
  is("no-transport claim is critical", noTransport.findings[0].severity, "critical");
  is("no-transport verdict", noTransport.verdict, "Redraft now");

  const schemaCoord = auditEntry({ id: 3, type: "town", payload: { ...base, __lat: 56.09, __lon: 8.24 } });
  ok("copied schema coordinate is caught", schemaCoord.findings.some(f => f.field === "coordinates" && f.severity === "critical"));

  const dashed = auditEntry({ id: 4, type: "town", payload: { ...base, __lat: 55.1, __lon: 9.1, desc: "A town — with a dash." } });
  ok("em dash is caught", dashed.findings.some(f => f.field === "voice"));

  const lazy = auditEntry({ id: 5, type: "free", payload: { ...base, ticketsGlance: "See website", extraCosts: "Check locally", accessibility: "Unknown" } });
  ok("placeholder fields are caught", lazy.findings.some(f => f.field === "research" && f.severity === "high"));

  const thin = auditEntry({ id: 6, type: "town", payload: { name: "Thin", __lat: 55, __lon: 9 } });
  ok("thin entry is caught", thin.findings.some(f => f.field === "body"));
  ok("missing photo is caught", thin.findings.some(f => f.field === "photo"));

  // A true statement that is NOT an absence claim must not be flagged. This
  // distinction is the whole point: one is honest, one is a lie.
  const honest = auditEntry({ id: 7, type: "town", payload: { ...base, __lat: 55.1, __lon: 9.1,
    gettingThereReality: "Public transport is limited outside the main bus routes, and there is no train station in the village itself." } });
  ok("honest limitation is NOT flagged", !honest.findings.some(f => f.field === "getting there"));

  // The two Odense failures, as tests.
  const rank = auditEntry({ id: 8, type: "town", payload: { ...base, __lat: 55.4, __lon: 10.4,
    desc: "Odense is Denmark's third-largest city and the birthplace of H.C. Andersen." } });
  ok("unqualified ranking is caught", rank.findings.some(f => f.field === "ranking" && f.severity === "high"));
  const rankOk = auditEntry({ id: 9, type: "town", payload: { ...base, __lat: 55.4, __lon: 10.4,
    desc: "Odense is Denmark's third-largest city by municipality." } });
  ok("qualified ranking is NOT flagged", !rankOk.findings.some(f => f.field === "ranking"));

  const year = auditEntry({ id: 10, type: "town", payload: { ...base, __lat: 55.4, __lon: 10.4,
    desc: "The town was founded in 988 and grew around the cathedral." } });
  ok("bare year claim is caught", year.findings.some(f => f.field === "history" && f.severity === "high"));
  const yearOk = auditEntry({ id: 11, type: "town", payload: { ...base, __lat: 55.4, __lon: 10.4,
    desc: "Odense appears in the first written mention of the name in 988." } });
  ok("named historical event is NOT flagged", !yearOk.findings.some(f => f.field === "history"));

  // The Kliplev case: advice in a glance field.
  const glance = auditEntry({ id: 12, type: "festival", payload: { ...base,
    nearestStation: "No train station in Kliplev; likely via Aabenraa by bus, check rejseplanen.dk" } });
  ok("advice in nearestStation is caught", glance.findings.some(f => f.field === "nearest stop" && f.severity === "high"));
  ["Ribe St.", "Aabenraa Rutebilstation", "Hou Havn", "Kastrup Lufthavn", "Nørreport Station"].forEach(n => {
    const okRow = auditEntry({ id: 13, type: "festival", payload: { ...base, nearestStation: n } });
    ok(`real stop name "${n}" is NOT flagged`, !okRow.findings.some(f => f.field === "nearest stop"));
  });
  const empty = auditEntry({ id: 14, type: "festival", payload: { ...base, nearestStation: "" } });
  ok("empty nearestStation is NOT flagged", !empty.findings.some(f => f.field === "nearest stop"));

  const sorted = auditAll([
    { id: 1, type: "town", payload: { ...base, __lat: 55, __lon: 9 } },
    { id: 2, type: "town", payload: { ...base, __lat: 56.09, __lon: 8.24 } },
  ]);
  is("worst entry sorts first", sorted[0].id, 2);
  is("auditAll survives junk", auditAll(null).length, 0);
}

// ── nearest-station validation ─────────────────────────────────────
// Bug: the At a Glance row read "Tranekær Slot (Langeland Kommune) (9 mins
// walk)" as the nearest STATION. It is a castle. Google's transit_station search
// falls back to the most prominent landmark where there is no station, and the
// old code trusted it and glued the walk time into the name.
{
  const NOT_TRANSIT = /\(.*kommune\)|\bslot\b|\bkirke\b|\bmuseum\b|\bkro\b|\bcamping\b|\bstrand\b|\bfyr\b|\bmølle\b|\bcastle\b|\bchurch\b/i;
  const LOOKS_TRANSIT = /\bst\.?\b|station|banegård|banegaard|havn|terminal|færge|faerge|ferry|holdeplads|busstop|bus stop|rutebil|lufthavn|airport|metro|letbane/i;
  const keep = (n) => !(NOT_TRANSIT.test(n) && !LOOKS_TRANSIT.test(n));
  ["Tranekær Slot (Langeland Kommune)", "Rudkøbing (Langeland Kommune)", "Møgeltønder Kirke", "Moesgaard Museum", "Nysted Strand"]
    .forEach(n => is(`station rejects "${n}"`, keep(n), false));
  ["Ribe St.", "Odense Banegård Center", "Hou Havn", "Sælvig Færgehavn", "Rudkøbing Rutebilstation", "Kastrup Lufthavn", "Tranekær Slot Station"]
    .forEach(n => is(`station keeps "${n}"`, keep(n), true));
}

// ── the dash ban, enforced on the files themselves ─────────────────
// The rule is absolute in published prose, and the deterministic strip only
// covers generated text. This checks the SOURCE of the rule files, since a
// dash reintroduced into a prompt teaches every future draft to use one.
{
  const dashes = (M.STUDIO_VOICE.match(/[—–]/g) || []).length;
  // THIS TEST FAILED ON ITS FIRST EVER RUN, and the failure was real: the prompt
  // that says "NEVER USE THE EM DASH" contained 41 of them in its own prose. The
  // model was reading its instructions and seeing 41 counter-examples. Only the
  // one inside the rule that names the character should survive, so anything
  // above a couple means prose has crept back in.
  ok(`STUDIO_VOICE dash count stays at 1 (found ${dashes})`, dashes <= 2);
  ok("STUDIO_VOICE still bans the em dash", /NEVER USE THE EM DASH/.test(M.STUDIO_VOICE));
  ok("STUDIO_VOICE still carries the island rule", /ISLANDS AND FERRIES/.test(M.STUDIO_VOICE));
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) { fails.forEach(f => console.log("  FAIL " + f + "\n")); process.exit(1); }
