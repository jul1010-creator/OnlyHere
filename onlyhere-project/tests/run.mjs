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
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
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
  export { hostMatchesName, officialSiteFromCandidates } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { FERRY, classifyFerry, ferryFindings } from ${JSON.stringify(join(root, "src/utils/transport.js"))};
  export { enforceScope, resolveField, classifyClaim, routeMessage, offersCorrection, allowedFieldsFor, APPLIED_VERDICTS, correctEntry } from ${JSON.stringify(join(root, "src/utils/correction.js"))};
  export { studioPrompts } from ${JSON.stringify(join(root, "src/utils/studioPrompts.js"))};
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

// ── the ferry that was not required (PASS 63) ──────────────────────
// The Aarhus Festuge draft said a Copenhagen to Aarhus drive crosses a ferry.
// It does, if you let Google optimise for time, and it does not if you want the
// bridge. Only the second answer is a fact about Aarhus.
{
  const cph2aarhus = { hasFerry: true, durationMinutes: 168, ferries: [] };
  const bridgeRoute = { durationMinutes: 190, durationText: "3 hours 10 mins", distanceText: "310 km" };
  const v = M.classifyFerry({ base: cph2aarhus, avoid: bridgeRoute });
  is("Aarhus: a road route exists with ferries banned, so the ferry is optional", v.status, M.FERRY.OPTIONAL);
  is("Aarhus: the boat saves 22 minutes", v.savedMinutes, 22);
  ok("the optional wording forbids calling it an island", /DO NOT call this place an island/.test(M.ferryFindings(v)));

  // Samso, Fano, Bornholm: no road at all, so Google searched and found nothing.
  const island = M.classifyFerry({ base: { hasFerry: true, durationMinutes: 196 }, avoid: { error: "ZERO_RESULTS" } });
  is("an island with no road route reads as required", island.status, M.FERRY.REQUIRED);
  ok("the required wording still forbids 'unreachable'", /Never write that it is unreachable/.test(M.ferryFindings(island)));

  // THE ONE THAT MATTERS MOST. A broken key, a quota, a network blip: none of
  // these are evidence about geography, and turning them into "this is an
  // island" would be the same class of bug in a new place.
  ["REQUEST_DENIED", "OVER_QUERY_LIMIT", "UNKNOWN_ERROR"].forEach(e =>
    is(`a ${e} probe claims nothing`, M.classifyFerry({ base: { hasFerry: true }, avoid: { error: e } }).status, M.FERRY.UNKNOWN));
  is("a probe that threw claims nothing", M.classifyFerry({ base: { hasFerry: true }, probeRan: false }).status, M.FERRY.UNKNOWN);
  is("no ferry anywhere on the route stays none", M.classifyFerry({ base: { hasFerry: false }, avoid: null }).status, M.FERRY.NONE);
  is("the unknown verdict says nothing either way", /do not state that a ferry is needed/.test(M.ferryFindings({ status: M.FERRY.UNKNOWN })), true);
}

// ── the website that was sitting right there (PASS 63) ─────────────
{
  ok("aarhusfestuge.dk is Aarhus Festuge", M.hostMatchesName("https://www.aarhusfestuge.dk/program", "Aarhus Festuge"));
  ok("Danish letters normalise", M.hostMatchesName("https://moegeltoender.dk", "Møgeltønder"));
  ok("a longer real name still matches its shorter domain", M.hostMatchesName("https://schackenborg.dk", "Schackenborg Slotskro"));
  ok("a different place does not match", !M.hostMatchesName("https://visitaarhus.dk", "Aarhus Festuge"));
  ok("a short name cannot match by substring", !M.hostMatchesName("https://denmarkholidays.com", "Ry"));
  ok("nonsense input is not a match", !M.hostMatchesName("not a url", "Aarhus Festuge"));

  // Aggregators and ticket sellers are never the official site, however well
  // the domain reads. This is the case that would quietly publish a reseller.
  is("a ticket site never wins",
    M.officialSiteFromCandidates(["https://billetlugen.dk/aarhusfestuge", "https://aarhusfestuge.dk/en"], "Aarhus Festuge"),
    "https://aarhusfestuge.dk");
  is("facebook is never the official site",
    M.officialSiteFromCandidates(["https://facebook.com/aarhusfestuge"], "Aarhus Festuge"), null);
  is("no match returns null rather than a guess",
    M.officialSiteFromCandidates(["https://visitdenmark.dk/x", "https://tripadvisor.com/y"], "Aarhus Festuge"), null);
  is("a deep link is trimmed to the domain",
    M.officialSiteFromCandidates(["https://www.aarhusfestuge.dk/program/2026/whatever"], "Aarhus Festuge"),
    "https://www.aarhusfestuge.dk");
}

// ── the correction pass cannot become a redraft (PASS 63) ──────────
// The whole safety property of "correct it" rather than "draft it again": a
// rewrite that improves an untouched paragraph gets that paragraph put back.
{
  const before = { name: "Nysted", desc: "Original desc.", nearestStation: "Aarhus", atmosphere: "Untouched paragraph." };
  const after = { name: "Nysted", desc: "Rewritten desc.", nearestStation: "Aarhus H", atmosphere: "Improved paragraph." };
  const { patched, reverted } = M.enforceScope(before, after, ["nearestStation"]);
  is("the corrected field is kept", patched.nearestStation, "Aarhus H");
  is("an unasked-for prose edit is put back", patched.atmosphere, "Untouched paragraph.");
  is("an unasked-for desc edit is put back", patched.desc, "Original desc.");
  is("and the attempt is reported, not swallowed", reverted.sort(), ["atmosphere", "desc"]);

  // A key the rewrite invented is removed, not kept. A correction that can add
  // fields can add a field nobody reviewed.
  const added = M.enforceScope({ a: 1 }, { a: 1, sneaky: "new" }, ["a"]);
  is("an invented key is dropped", added.patched.sneaky, undefined);
  is("dropping it is reported", added.reverted, ["sneaky"]);
  // Deleting a key is a change too.
  const removed = M.enforceScope({ a: 1, b: 2 }, { a: 1 }, ["a"]);
  is("a deleted key is restored", removed.patched.b, 2);
}

// ── claims land on real keys, or on prose, never on a glance field ──
{
  const entry = { name: "X", nearestStation: "", ticketInfo: "", atmosphere: "", uncertainties: [] };
  is("a spaced label resolves", M.resolveField(entry, "Nearest Station"), "nearestStation");
  is("a sentence naming the key resolves", M.resolveField(entry, "the nearestStation field"), "nearestStation");
  is("longest match wins over a prefix", M.resolveField(entry, "ticketInfo"), "ticketInfo");
  is("an unknown field resolves to nothing", M.resolveField(entry, "vibe rating"), null);

  // An unresolvable claim may touch prose only. A glance field must never be
  // filled from a claim nobody could pin to it: that is how "check
  // rejseplanen.dk" became a station name.
  const allowed = M.allowedFieldsFor(entry, [{ field: "vibe rating", verdict: "confirmed" }]);
  ok("an unpinned claim can touch prose", allowed.includes("atmosphere"));
  ok("an unpinned claim cannot touch a glance field", !allowed.includes("nearestStation"));
  ok("uncertainties is always writable", allowed.includes("uncertainties"));
  is("a rejected claim opens no fields at all",
    M.allowedFieldsFor(entry, [{ field: "nearestStation", verdict: "rejected" }]), ["uncertainties"]);
}

// ── transport claims go to the API, not to a model ─────────────────
{
  is("a ferry claim is measurable", M.classifyClaim({ field: "prose", says: "there is no mandatory ferry to Aarhus" }), "transport");
  is("a travel time claim is measurable", M.classifyClaim({ field: "travelTime", says: "the journey time is wrong" }), "transport");
  // A station NAME is not measurable by a route query. "Aarhus H" comes from
  // DSB, so it needs a source like any other named fact, and sending it to the
  // routing probe would return a duration and call it a station.
  is("a station name claim needs a source, not a route probe", M.classifyClaim({ field: "nearestStation", says: "should be Aarhus H" }), "general");
  is("a website claim is its own kind", M.classifyClaim({ field: "website", says: "the official site is aarhusfestuge.dk" }), "website");
  is("a history claim is general", M.classifyClaim({ field: "prose", says: "the founding year is wrong" }), "general");
  // A transport claim that happens to mention a URL is still transport.
  is("a route claim mentioning a URL stays transport",
    M.classifyClaim({ field: "prose", says: "the ferry route on molslinjen.dk is wrong" }), "transport");
}

// ── the box decides between answering and editing ──────────────────
// When it is unclear, it answers. The wrong guess in that direction costs a
// sentence; the wrong guess the other way edits published content.
{
  is("an explicit instruction corrects", M.routeMessage("Google AI says this is wrong. Correct it."), "correct");
  is("a question answers", M.routeMessage("why does this say the ferry is required?"), "ask");
  is("a scan request audits", M.routeMessage("which ones need work?"), "audit");
  is("an empty message answers", M.routeMessage("   "), "ask");
  is("a bare observation answers rather than edits", M.routeMessage("this looks off to me"), "ask");
  // A pasted fact-check with no covering sentence is still a correction.
  const paste = "Inaccuracies to correct. ".repeat(20) + " the nearestStation field should be Aarhus H";
  is("a long paste with no instruction still corrects", M.routeMessage(paste), "correct");
}

// ── the prompts survived being moved out of App.jsx (PASS 63) ──────
// 37 KB of prompt text was lifted out of generateArea verbatim. These are the
// invariants that would break if a future edit quietly damaged one: a prompt
// that silently loses the voice rules, or stops asking for JSON, or starts
// interpolating the wrong thing, still LOOKS fine and produces worse drafts for
// weeks before anyone notices.
{
  const TYPES = ["town", "festival", "free", "food", "foodStreet", "night", "nightTown", "booking"];
  const p = M.studioPrompts("Aarhus Festuge");
  is("all eight draft types still have a prompt", Object.keys(p).sort(), TYPES.slice().sort());
  TYPES.forEach(t => {
    ok(`${t} still carries the voice rules`, p[t].includes("NEVER USE THE EM DASH"));
    ok(`${t} still demands strict JSON`, /Respond with ONLY strict JSON/.test(p[t]));
    ok(`${t} interpolates the real name`, p[t].includes("Aarhus Festuge"));
  });
  ok("the town prompt still refuses the copied example coordinate", /NEVER copy a number out of this schema/.test(p.town));
  ok("the town prompt still bans a guessed travel time", /never guess/.test(p.town));

  // A name carrying a quote and a backtick must come through the JSON-escaping
  // helper intact, or the model is handed broken JSON to copy into its answer.
  const q = String.fromCharCode(34), tick = String.fromCharCode(96), apos = String.fromCharCode(39);
  const trickyName = "Chickie" + apos + "s " + q + "Best" + q + " " + tick + "Bar" + tick;
  const tricky = M.studioPrompts(trickyName);
  ok("a quoted name is JSON-escaped into the schema", tricky.food.includes('"name": ' + JSON.stringify(trickyName)));
}

// ── OPENAI NEVER WRITES PROSE, enforced on the source itself ───────
// The standing rule: Perplexity and Tavily research, OpenAI plans queries and
// sorts findings into notes, CLAUDE writes every published sentence. It was
// written in comments in four places and still got broken, because a comment
// cannot fail a build. This block reads App.jsx as text and does what a comment
// could not.
//
// What actually happened (found 7 Aug 2026): the Studio fact generator called
// askOpenAI to write the fact text a traveler reads on the loading screen. It
// had been that way since PASS 40, under a comment two functions above saying
// OpenAI is never the writer. Separately, the Studio panel told Oliver on screen
// that entries were drafted "via Tavily + OpenAI" long after Claude took over,
// which is how he came to believe the pipeline was still wrong.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");

  // Every legitimate askOpenAI call site is a PLANNER or a STRUCTURER: research
  // query planning, note organizing, candidate extraction, and flag-only prose
  // scans that never write the replacement themselves. There are seven. This
  // count is not a style rule — a new one means someone gave OpenAI a new job,
  // and that job has to be checked against the rule by a human before it ships.
  const openAiCalls = (app.match(/askOpenAI\(/g) || []).length;
  is("askOpenAI call sites stay at the seven audited planning/structuring ones", openAiCalls, 7);

  // The specific regression: the fact generator writes PUBLISHED prose.
  const factWriter = app.slice(app.indexOf("const draftOneFact"), app.indexOf("const generateFacts"));
  ok("draftOneFact exists to be checked", factWriter.length > 500);
  ok("the fact generator writes with Claude", /await askClaude\(writePrompt/.test(factWriter));
  ok("the fact generator never writes with OpenAI", !/askOpenAI/.test(factWriter));

  // Every raw /api/openai body must use max_completion_tokens. "gpt-5.6-sol"
  // REJECTS max_tokens outright, so a body carrying it is not a slow path or a
  // degraded path, it is a 400 every single time. Two shipped that way: the
  // source scanner surfaced it as an OpenAI error, the AI voice scan swallowed
  // it in a catch and looked like it simply found nothing.
  const rawOpenAiBodies = app.split('fetch("/api/openai"').slice(1).map(chunk => chunk.slice(0, 3000));
  ok("at least one raw OpenAI call still exists to check", rawOpenAiBodies.length >= 2);
  rawOpenAiBodies.forEach((body, i) => {
    const line = (body.match(/^\s*max_tokens:.*$/m) || [])[0];
    ok(`raw OpenAI call ${i + 1} does not send the rejected max_tokens parameter`, !line);
  });

  // The panel Oliver actually reads while drafting must not name the wrong
  // writer. This is the exact text that made him report the pipeline as broken.
  ok("the Studio panel no longer claims entries are drafted via OpenAI",
    !/complete entry[^<]*via Tavily \+ OpenAI/.test(app));
  ok("the Studio panel names Claude as the writer",
    /Claude writes every word of the actual entry/.test(app));
}

// ── the assistant hears a correction the way he actually types one ─
// Oliver, 7 Aug 2026: "the AI assistant that is meant to put in the newly
// fact-checked things is not thaaat great... I would like to have an AI I can
// write to after the draft where I can say 'Fact-checkers say bla bla bla is
// wrong, and that really bla bla bla is true.'"
//
// The router demanded an imperative verb, so five of six realistic correction
// messages, INCLUDING HIS OWN EXAMPLE, routed to "ask" and got discussed
// instead of applied. A correction is an assertion, not a command.
{
  const corrects = [
    "Fact-checkers say bla bla bla is wrong, and that really bla bla bla is true.",
    "The station is wrong. It should be Aarhus H.",
    "Google says the date is wrong, it is actually 25 August.",
    "This says the ferry is required but that is not true, it is optional.",
    "The fact-checkers found that the nearestStation should be Aarhus H, not Aarhus.",
    "Google AI says this is wrong. Correct it.",
  ];
  corrects.forEach(t => is(`corrects: ${t.slice(0, 42)}`, M.routeMessage(t), "correct"));

  // The other direction matters just as much. Wondering aloud must never fire a
  // verification pass, and an explicit instruction must beat a question mark.
  is("a question about wrongness still answers", M.routeMessage("is the ferry thing right on this one?"), "ask");
  is("a bare observation still answers", M.routeMessage("this looks off to me"), "ask");
  is("a question with an instruction in it corrects", M.routeMessage("why is this wrong? fix it"), "correct");
  is("a plain lookup still answers", M.routeMessage("what does the entry say about tickets?"), "ask");
  is("an audit request is untouched", M.routeMessage("which ones need work?"), "audit");

  // The escape hatch for whatever the router still gets wrong: one tap, never a
  // retype. Offered only where it is plausible, so it is not on every answer.
  ok("an ambiguous wrongness question offers the button", M.offersCorrection("Is this wrong?"));
  ok("a plain lookup does not offer it", !M.offersCorrection("what does the entry say about tickets?"));
}

// ── silence does not block him, but evidence still overrules him ────
// Rule 1 of correction.js ("the criticism is a lead, not a source") was written
// about a MODEL's criticism and is still right about that. Applied to Oliver it
// produced a tool that ignored him: he states the real value, no primary source
// turns up, the claim lands unresolved and NOTHING CHANGES. Handoff 6 records
// the opposite instinct, "he is right more often than the fact-checker is".
//
// These four cases are the whole trust model, and the second one is the reason
// the other three are safe.
{
  const entry = { name: "Aarhus Festuge", nearestStation: "Aarhus", desc: "A festival in Aarhus.", uncertainties: [] };
  // Fake deps so this stays a pure, offline test: the split step returns one
  // claim, the verification step returns whichever verdict the case is about,
  // and the patch step applies it.
  const deps = (verdict, proposed = "Aarhus H") => ({
    askClaude: async (prompt) => prompt.includes("Break the criticism into SEPARATE, ATOMIC claims")
      ? { text: JSON.stringify({ claims: [{ field: "nearestStation", says: "the station is wrong", proposed, checkable: "yes" }] }) }
      : { text: JSON.stringify({ ...entry, nearestStation: proposed || "Aarhus" }) },
    askPerplexity: async () => ({ text: JSON.stringify({ verdict, correctValue: "", evidence: "nothing decisive", sourceUrl: "" }) }),
    parseJSON: async (t) => JSON.parse(t),
    directions: async () => ({ error: "not used in this claim" }),
  });
  const criticism = "The station is wrong, it is really Aarhus H.";

  const unresolved = await M.correctEntry({ entry, criticism, deps: deps("unresolved") });
  is("nothing settled it, so his own value is applied", unresolved.patched?.nearestStation, "Aarhus H");
  is("and it is counted as asserted, never as confirmed", [unresolved.asserted.length, unresolved.confirmed.length], [1, 0]);
  ok("the audit trail says whose word it rests on", /asserted by the founder/.test(JSON.stringify(unresolved.patched.__corrections)));
  ok("and it stays flagged as unconfirmed for the next reviewer", unresolved.patched.uncertainties.some(u => /still UNCONFIRMED/.test(u)));

  // THE ONE THAT KEEPS THIS SAFE. A source actively contradicting the claim
  // still wins, which is what caught Gemini's 90-minute Samso ferry. Applying
  // on his word is about SILENCE, never about overriding evidence.
  const rejected = await M.correctEntry({ entry, criticism, deps: deps("rejected") });
  is("a source that contradicts him still wins", rejected.patched, null);
  is("and the rejection is reported, not swallowed", rejected.rejected.length, 1);

  const novalue = await M.correctEntry({ entry, criticism: "The station is wrong.", deps: deps("unresolved", "") });
  is("wrong with no replacement value changes nothing", novalue.patched, null);

  ok("asserted is an applicable verdict", M.APPLIED_VERDICTS.has("asserted") && M.APPLIED_VERDICTS.has("confirmed"));
  is("an asserted claim opens its field for patching",
    M.allowedFieldsFor(entry, [{ field: "nearestStation", verdict: "asserted" }]).sort(), ["nearestStation", "uncertainties"]);
}

// ── a background queue run never touches the editor ────────────────
// Oliver, 7 Aug 2026: "the /#studio queues are good but, whenever it is the
// next in queue, it can't publish because the other is published."
//
// He found one symptom of a shared-state bug with three of them. generateArea
// wrote the finished draft, the photo name, the publish status, the verified
// coordinates and both warnings into the SAME state the editor renders from,
// and the queue calls it in the background while he reviews something else.
//
//   1. loadQueueResult never reset publishStatus, so the next draft inherited
//      the last one's "✓ Published" line, which RENDERS IN PLACE OF the button.
//   2. A background item completing could replace the draft under review.
//   3. Silent and expensive: publishDraft force-overrides the published station
//      and coordinates from studioFrozenGeo, so publishing Ribe after the queue
//      moved on to Skagen published Ribe with Skagen's station.
//
// These are text assertions on App.jsx because the logic lives in component
// state that no offline test can drive. They are still worth having: each one
// pins a specific line that, if it goes back, reintroduces a named bug.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  // Slice generateArea's real body only: up to its own `return draftOutcome`,
  // not as far as runDraftQueue, or addToDraftQueue's setters land in the slice
  // and read as leaks.
  const gaStart = app.indexOf("const generateArea = async");
  const generateArea = app.slice(gaStart, app.indexOf("return draftOutcome;", gaStart));
  const loadQueue = app.slice(app.indexOf("const loadQueueResult"), app.indexOf("const loadQueueResult") + 3000);

  ok("generateArea takes a queued flag", /const generateArea = async \(overrideTown, overrideType, opts\)/.test(app));
  ok("and derives it into a guard", /const queued = !!\(opts && opts\.queued\)/.test(generateArea));
  ok("the queue runner marks its runs as background", /generateArea\(item\.name, item\.type, \{ queued: true \}\)/.test(app));

  // Every write to editor state must go through ui(). The lock and the progress
  // stage are the only two that may fire during a background run.
  const bareSetters = [...generateArea.matchAll(/(?<![\w$.])(set[A-Za-z]+)\(/g)].map(m => m[1]);
  // setter( is the ui() helper invoking whatever it was handed, which is the
  // guard itself, not a leak.
  const allowed = new Set(["setStudioLoading", "setStudioStage", "setTimeout", "setter"]);
  const leaked = [...new Set(bareSetters.filter(x => !allowed.has(x)))];
  is("no editor state is written directly during a queued run", leaked, []);

  // The three specific regressions, each pinned to the line that fixes it.
  ok("opening a queue draft clears the previous publish state", /setPublishStatus\(null\)/.test(loadQueue));
  ok("opening a queue draft clears editingId so Publish cannot PATCH the wrong row", /setEditingId\(null\)/.test(loadQueue));
  ok("opening a queue draft restores ITS OWN verified geo", /setStudioFrozenGeo\(r\.frozenGeo \|\| null\)/.test(loadQueue));
  ok("and its own warnings rather than the last draft's", /setStudioInventedWarning\(r\.inventedWarning \|\| null\)/.test(loadQueue));

  // The draft has to carry its verified geo, or there is nothing to restore.
  ok("a finished draft returns its verified geo", /draftOutcome = \{ ok: true, draft: t, code, frozenGeo, identityWarning, inventedWarning \}/.test(generateArea));
  ok("the queue result stores it", /frozenGeo: res\?\.frozenGeo \|\| null/.test(app));

  // A fourth bug found while fixing these: the auto-correction pass updated the
  // editor but not `t`, and `t` is what a queued run returns, so every queued
  // draft was stored and later published in its UNCORRECTED form.
  ok("an auto-correction is written back into the returned draft", /t = corrected;/.test(generateArea));
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) { fails.forEach(f => console.log("  FAIL " + f + "\n")); process.exit(1); }
