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
  export { enforceScope, resolveField, classifyClaim, routeMessage, allowedFieldsFor } from ${JSON.stringify(join(root, "src/utils/correction.js"))};
  export { studioPrompts } from ${JSON.stringify(join(root, "src/utils/studioPrompts.js"))};
  export { looksLikeTransit, kindFromName, findRealNearestStop } from ${JSON.stringify(join(root, "src/utils/geo.js"))};
  export { licenseIsUsable } from ${JSON.stringify(join(root, "api/commons-photo.js"))};
  export { testTravelerLine } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
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
is("arrivalRow ferry terminal", arrivalRow("Sælvig Ferry Terminal").label, "Ferry Terminal");
is("arrivalRow danish havn", arrivalRow("Hou Havn").label, "Ferry Terminal");
is("arrivalRow danish faerge", arrivalRow("Odden Færgehavn").label, "Ferry Terminal");
is("arrivalRow ferry beats bus", arrivalRow("Bus to Sælvig Ferry Terminal").label, "Ferry Terminal");
is("arrivalRow bus stop", arrivalRow("Bus stop at the village square").label, "Nearest Bus Stop");
is("arrivalRow rutebilstation", arrivalRow("Rutebilstation").label, "Nearest Bus Stop");
is("arrivalRow airport", arrivalRow("Kastrup Airport").label, "Nearest Airport");
is("arrivalRow metro", arrivalRow("Nørreport Metro").label, "Nearest Metro");
is("arrivalRow real station", arrivalRow("Ribe Station").label, "Nearest Station");
is("arrivalRow never rewrites value", arrivalRow("Hou Havn").value, "Hou Havn");

// ── "Nearest Stop", not "Nearest Station" ──────────────────────────
// Oliver, 7 Aug 2026: "Maybe it shouldn't be nearest station, but nearest stop.
// If it's an Island, this will often be awkward."
//
// A label promising a platform is wrong on every island page in Denmark. When
// the kind IS known the specific word is better and stays; the FALLBACK is what
// had to stop guessing "Station".
is("an unknown arrival point is a Stop, not a Station", arrivalRow("").label, "Nearest Stop");
is("a null arrival point is a Stop", arrivalRow(null).label, "Nearest Stop");
is("a name that says nothing is a Stop", arrivalRow("Sønderho Kirkevej").label, "Nearest Stop");
// The kind, when geo.js knows it from the Places category, beats reading a name.
is("a known ferry kind overrides the name", arrivalRow("Nordby", "ferry").label, "Ferry Terminal");
is("a known rail kind overrides the name", arrivalRow("Sælvig", "rail").label, "Nearest Station");
is("a known bus kind overrides the name", arrivalRow("Torvet", "bus").label, "Nearest Bus Stop");
is("an unknown kind falls back to reading the name", arrivalRow("Ribe Station", "other").label, "Nearest Station");
is("a known kind still never rewrites the value", arrivalRow("Nordby", "ferry").value, "Nordby");

// ── kindFromName ───────────────────────────────────────────────────
is("kindFromName rail", M.kindFromName("Ribe Station"), "rail");
is("kindFromName danish rail", M.kindFromName("Aarhus Banegård"), "rail");
is("kindFromName ferry", M.kindFromName("Hou Havn"), "ferry");
is("kindFromName bus", M.kindFromName("Rutebilstation"), "bus");
is("kindFromName air", M.kindFromName("Billund Lufthavn"), "air");

// ── two labels that had been wrong since the row was written ───────
// Both found by these tests rather than by a human, which is the whole point of
// having them. "lufthavn" ends in the Danish word for harbour, so every Danish
// airport was labelled a Ferry Terminal; and the same word hides inside
// "København", so the busiest railway station in the country was too.
is("lufthavn is an airport, not a harbour", arrivalRow("Billund Lufthavn").label, "Nearest Airport");
is("Copenhagen airport is an airport", arrivalRow("Københavns Lufthavn").label, "Nearest Airport");
is("Kobenhavn H is a station, not a quay", arrivalRow("København H").label, "Nearest Station");
is("Kobenhavn H reads as rail", M.kindFromName("København H"), "rail");
is("Odense St. is a station", arrivalRow("Odense St.").label, "Nearest Station");
is("a real harbour is still a harbour", arrivalRow("Hou Havn").label, "Ferry Terminal");
is("havnen is still a harbour", arrivalRow("Havnen").label, "Ferry Terminal");

// ── a reseller is never the official website ───────────────────────
// Oliver, 7 Aug 2026: "make getyourguide.com a must-research as well!!!"
//
// Making it a required research source and leaving it out of this blocklist
// would have been a net loss: the pipeline would start finding GetYourGuide
// URLs for every attraction, and the official-site picker would have happily
// published one as the venue's own website. It sells tickets to the place; it
// is not the place.
is("getyourguide is never the official site", M.officialSiteFromCandidates(["https://www.getyourguide.com/tivoli-gardens-l1234/"], "Tivoli"), null);
is("viator is never the official site", M.officialSiteFromCandidates(["https://www.viator.com/tours/Copenhagen/tivoli"], "Tivoli"), null);
is("tiqets is never the official site", M.officialSiteFromCandidates(["https://www.tiqets.com/en/tivoli-gardens"], "Tivoli"), null);
// And the real one still wins when it is in the same list.
is("the venue's own domain still wins", M.officialSiteFromCandidates(["https://www.getyourguide.com/tivoli-l1/", "https://www.tivoli.dk/en/"], "Tivoli"), "https://www.tivoli.dk");
is("kindFromName gives up honestly", M.kindFromName("Torvet"), "other");

// ── looksLikeTransit: a castle is not a station ────────────────────
// Bug: "Tranekær Slot (Langeland Kommune)" shipped as a nearest station.
ok("a kommune-suffixed landmark is rejected", !M.looksLikeTransit("Tranekær Slot (Langeland Kommune)"));
ok("a plain station is accepted", M.looksLikeTransit("Ribe Station"));
ok("a harbour is accepted", M.looksLikeTransit("Hou Havn"));
ok("an empty name is rejected", !M.looksLikeTransit(""));
// A church WITH a stop in the name is a real stop called after the church.
ok("a church bus stop survives", M.looksLikeTransit("Sønderho Kirke busstop"));

// ── findRealNearestStop: the tiers, and the island gate ────────────
// Network is stubbed, not called. These assert the ORDERING RULE and the
// WALKABILITY GATE, which are the two things that were actually wrong, and both
// are decided in geo.js rather than by Google.
{
  const realFetch = globalThis.fetch;
  // places[type] -> the place that search returns. walks[name] -> what
  // /api/directions says about walking there.
  const stub = (places, walks) => {
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.startsWith("/api/places")) {
        const type = decodeURIComponent(u.match(/type=([^&]*)/)[1]);
        const hit = places[type];
        return { json: async () => (hit || { error: "No nearby place found" }) };
      }
      const dest = u.match(/destination=([^&]*)/)[1];
      const w = walks[dest];
      return { json: async () => (w || { durationText: "8 mins", durationMinutes: 8 }) };
    };
  };
  const RAIL = "train_station,subway_station,light_rail_station";
  const station = { name: "Esbjerg Station", lat: 55.466, lon: 8.459 };
  const berth = { name: "Nordby Færgehavn", lat: 55.446, lon: 8.409 };
  const shelter = { name: "Sønderho busstop", lat: 55.35, lon: 8.42 };

  // 1. Rail wins even when a bus shelter is closer. This is the bug he reported.
  stub({ [RAIL]: station, transit_station: shelter }, {});
  let r = await M.findRealNearestStop(55.46, 8.45);
  is("rail beats a nearer bus stop", [r.name, r.kind], ["Esbjerg Station", "rail"]);

  // 2. THE ISLAND. Google finds a mainland station two km away across open
  // water. There is no footpath, so it must be rejected and the ferry berth
  // must win, rather than promising a platform nobody can reach.
  stub(
    { [RAIL]: station, ferry_terminal: berth, transit_station: shelter },
    { "55.466,8.459": { error: "ZERO_RESULTS" } }
  );
  r = await M.findRealNearestStop(55.44, 8.41);
  is("a station across water is rejected for the ferry berth", [r.name, r.kind], ["Nordby Færgehavn", "ferry"]);

  // 3. A bus stop is a fine answer when it is the only one, and it says so.
  stub({ transit_station: shelter }, {});
  r = await M.findRealNearestStop(55.35, 8.42);
  is("a bus stop is returned as a bus stop", [r.name, r.kind], ["Sønderho busstop", "bus"]);

  // 4. Nothing at all is null. Empty reads as "we do not know"; a landmark lies.
  stub({}, {});
  is("nothing found is null, never a guess", await M.findRealNearestStop(55.1, 9.1), null);

  // 5. A landmark returned by the transit search is still refused.
  stub({ transit_station: { name: "Tranekær Slot (Langeland Kommune)", lat: 55, lon: 10.9 } }, {});
  is("a castle is never the nearest stop", await M.findRealNearestStop(55, 10.9), null);

  // 6. NEVER CONCLUDE A FACT FROM A FAILED LOOKUP. A directions call that fails
  // for a reason other than "no route" says nothing about whether a path exists,
  // so the candidate stands and only the walk time is dropped.
  stub({ [RAIL]: station }, { "55.466,8.459": { error: "REQUEST_DENIED" } });
  r = await M.findRealNearestStop(55.46, 8.45);
  is("a denied directions call does not reject the stop", [r.name, r.walk], ["Esbjerg Station", null]);

  // 7. The walk time is returned separately and never glued onto the name.
  stub({ [RAIL]: station }, {});
  r = await M.findRealNearestStop(55.46, 8.45);
  is("the walk time stays out of the name", r.name, "Esbjerg Station");
  is("the walk time is its own field", r.walk, "8 mins");

  globalThis.fetch = realFetch;
}

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

// ── the Commons photo licence gate ─────────────────────────────────
// Oliver, 7 Aug 2026: "I searched up Wikipedia about Ringkøbing, there are a
// lot more pictures there than on Wikimedia. Why can't I take those and give
// credits as well??? ... It's the same license."
//
// He was right, and the reason was a full-text search that never looked in the
// article or the category. Fixing that meant more files reaching this gate, so
// the gate is now pinned in both directions. The MISSES matter as much as the
// leaks: a jurisdiction-ported CC BY-SA is the same licence written for another
// legal system, and rejecting it silently cost real usable photographs.
{
  const use = ["CC BY-SA 4.0", "CC BY-SA 3.0", "CC BY 2.0", "CC0", "Public domain", "PD-old-70",
    "Attribution", "CC BY-SA 2.5", "CC-BY-SA-3.0", "cc-by-sa-4.0", "No restrictions", "Copyrighted free use",
    // The ported and multi-version forms, all of which used to be rejected.
    "CC BY-SA 3.0 de", "CC BY-SA 2.0 fr", "CC BY-SA 3.0 es", "CC BY 3.0 us",
    "CC BY-SA 3.0,2.5,2.0,1.0", "CC BY-SA 4.0 International", "CC BY-SA 2.0 Generic"];
  const drop = ["CC BY-NC 3.0", "CC BY-ND 4.0", "CC BY-NC-SA 2.0", "CC BY-NC-ND 4.0", "CC BY-NC 2.0 de",
    "All rights reserved", "Fair use", "Non-free logo", "", null,
    // Free, but it needs the full licence text alongside the image, which a one
    // line photo credit does not provide. Excluded on purpose, not by accident.
    "GFDL", "GFDL 1.2"];
  use.forEach(l => ok(`licence usable: ${l}`, M.licenseIsUsable(l)));
  drop.forEach(l => ok(`licence refused: ${JSON.stringify(l)}`, !M.licenseIsUsable(l)));
}

// ── NOTHING MAY BE USED IN A HOOK BEFORE IT EXISTS ─────────────────
// 7 Aug 2026. The entire front page was throwing on every render, and had been
// since the entry-routing pass shipped:
//
//   ReferenceError: Cannot access 'entered' before initialization
//
// The deep-link effect listed `entered` in its dependency array. `entered` is
// declared with const about six hundred lines further down the same component.
// A dependency array is evaluated where it is written, so GemlyxApp threw
// before it could render anything and the ErrorBoundary took the page. It
// survived a whole pass because /guide/:id is a different component that never
// mounts GemlyxApp, so every guide link kept working perfectly while the front
// door was dead, and because nothing in this suite had ever executed a
// component. Every test here was a pure function.
//
// This does not execute anything either, which is the point: it is a text scan
// that costs nothing and catches the whole class. A name used in a dependency
// array whose only declaration comes LATER in the file is a temporal dead zone
// error at runtime, every time, with no exceptions.
{
  const declarationsIn = (src) => {
    const at = new Map();
    const note = (name, i) => { if (name && !at.has(name)) at.set(name, i); };
    for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) note(m[1], m.index);
    for (const m of src.matchAll(/\b(?:const|let|var)\s*\[([^\]]*)\]/g))
      m[1].split(",").forEach(x => note(x.trim().replace(/[:=].*$/, "").trim(), m.index));
    for (const m of src.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g))
      m[1].split(",").forEach(x => note(x.trim().split(":").pop().replace(/=.*$/, "").trim(), m.index));
    // function declarations and imports are hoisted, so they are never too late
    for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) note(m[1], 0);
    for (const m of src.matchAll(/\bimport\s*\{([^}]*)\}/g))
      m[1].split(",").forEach(x => note(x.trim().split(/\s+as\s+/).pop().trim(), 0));
    return at;
  };
  const GLOBALS = new Set(["true", "false", "null", "undefined", "this", "typeof", "void", "new", "await",
    "in", "of", "window", "document", "JSON", "Math", "Object", "Array", "String", "Number", "Boolean",
    "Date", "console", "localStorage", "navigator", "location", "fetch", "setTimeout", "clearTimeout"]);

  const forwardRefs = (src) => {
    const at = declarationsIn(src);
    const found = [];
    for (const m of src.matchAll(/\}\s*,\s*\[([^\]]*)\]\s*\)/g)) {
      for (const id of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) {
        const name = id[0];
        if (GLOBALS.has(name)) continue;
        const d = at.get(name);
        if (d !== undefined && d > m.index) {
          found.push(`${name} (used line ${src.slice(0, m.index).split("\n").length}, declared line ${src.slice(0, d).split("\n").length})`);
        }
      }
    }
    return found;
  };

  const FILES = ["src/App.jsx", "src/pages/GuidePage.jsx", "src/components/DetailPage.jsx",
    "src/components/StudioAssistant.jsx", "src/components/AskGemlyx.jsx",
    "src/components/GuidePreviewScreen.jsx", "src/components/WeatherHeaderStrip.jsx"];
  FILES.forEach(f => {
    const full = join(root, f);
    if (!existsSync(full)) return;
    const hits = forwardRefs(readFileSync(full, "utf8"));
    is(`${f} uses nothing in a hook before it is declared`, hits, []);
  });

  // And the scan itself is checked, because a checker that silently matches
  // nothing passes forever. This is the real bug, reduced.
  const REAL_BUG = [
    "const Comp = () => {",
    "  useEffect(() => { setEntered(true); }, [version, entered]);",
    "  const [entered, setEntered] = useState(false);",
    "};",
  ].join("\n");
  ok("the scan catches the bug it was written for", forwardRefs(REAL_BUG).length === 1);
  ok("and passes the same code with the order fixed",
    forwardRefs(REAL_BUG.replace(", entered]", "]")).length === 0);
}

// ── the random-guide test card describes a real traveler ───────────
// Oliver's screenshot: "4 days, based around , into coastal views and local
// food". The blank is the point. The random brief stopped naming published
// towns, on purpose, and one of the two screens printing that list was never
// updated. Both read testTravelerLine now, and a missing field must vanish
// rather than leave a gap with punctuation around it.
{
  const full = { days: 4, who: "me and my partner", arrival: "We land at Copenhagen airport in the morning",
    transport: "We are renting a car", moving: "We are happy to move hotel a couple of times",
    interests: ["castles", "local food"], budget: "We are on a tight budget" };
  const line = M.testTravelerLine(full);
  ok("the line names the party", line.includes("me and my partner"));
  ok("the line names the interests", line.includes("into castles and local food"));
  ok("the line pluralises days", line.startsWith("4 days"));
  is("one day is singular", M.testTravelerLine({ days: 1 }), "1 day");
  // The regression itself: nothing the profile does not carry may be printed.
  ok("no empty gap where towns used to be", !/·\s*·/.test(line) && !/,\s*,/.test(line));
  ok("an unstated budget is left out", !M.testTravelerLine({ days: 3, budget: "unstated" }).includes("unstated"));
  is("a profile with only interests still reads", M.testTravelerLine({ interests: ["beaches"] }), "into beaches");
  is("no profile is an empty string, never the word undefined", M.testTravelerLine(null), "");
  ok("an empty interests list is dropped entirely", M.testTravelerLine({ days: 2, interests: [] }) === "2 days");
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) { fails.forEach(f => console.log("  FAIL " + f + "\n")); process.exit(1); }
