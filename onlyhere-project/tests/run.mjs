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
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripNonCode, functionBody, useBeforeDeclare } from "./tdz.mjs";

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
  export { ARRIVAL_TYPES, hasArrivalField } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { FERRY, classifyFerry, ferryFindings } from ${JSON.stringify(join(root, "src/utils/transport.js"))};
  export { enforceScope, resolveField, classifyClaim, routeMessage, allowedFieldsFor, isEditRequest, factsIn, factsPreserved, editEntry, EDITABLE_FIELDS } from ${JSON.stringify(join(root, "src/utils/correction.js"))};
  export { studioPrompts } from ${JSON.stringify(join(root, "src/utils/studioPrompts.js"))};
  export { looksLikeTransit, kindFromName, findRealNearestStop, hasTransitType } from ${JSON.stringify(join(root, "src/utils/geo.js"))};
  export { licenseIsUsable } from ${JSON.stringify(join(root, "api/commons-photo.js"))};
  export { testTravelerLine } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { resolveStopCoordsDetailed, legDistanceKm, townInName, townKeyFor } from ${JSON.stringify(join(root, "src/utils/guideEnrichment.js"))};
  export { checkPlan, titlePromises, MAX_DAY_KM } from ${JSON.stringify(join(root, "src/utils/planGate.js"))};
  export { stopKind, tripScaleLine, tripCharacter, bookingActions } from ${JSON.stringify(join(root, "src/utils/guideReading.js"))};
  export { stripDashes, stripDashesDeep } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { routeTowns, countStops, orderedStops, shareSummary, shareMessage, shareTitle, metaDescription, hasMeasuredTravel, escapeHtml } from ${JSON.stringify(join(root, "src/utils/share.js"))};
  export { buildPreviewHtml, injectMeta, isCrawler, guideIdFromPath } from ${JSON.stringify(join(root, "src/utils/linkPreview.js"))};
  export { SITE_ORIGIN } from ${JSON.stringify(join(root, "src/config.js"))};
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

// ── "1 min on bike.. it says 13 on maps" ───────────────────────────
// Oliver, 7 Aug 2026, on the Faaborg Havn to Faaborg Camping leg of a real
// published guide. The two stops are 2.27 km apart and both had correct,
// freshly geocoded coordinates on file the whole time. The guide BUILD called
// this resolver without passing them, so both names fell through to the
// TOWN_COORDS entry for Faaborg, and the Directions API was asked to route
// from the centre of Faaborg to the centre of Faaborg. It said zero minutes.
//
// The rules below were already right. What follows pins them, so the next
// caller that forgets the second argument fails here instead of in a guide:
// a precise source must beat the town centre, and two stops that both landed
// on the same town centre are UNPLACED, not adjacent.
{
  const HAVN = { lat: 55.0975557, lon: 10.2326148 };
  const CAMP = { lat: 55.1164511, lon: 10.2463698 };
  const GEO = { "Faaborg Havn": HAVN, "Faaborg Camping": CAMP };

  const withGeo = M.resolveStopCoordsDetailed("Faaborg Havn", GEO);
  is("this guide's own geocode wins over the town centre", [withGeo.lat, withGeo.lon], [HAVN.lat, HAVN.lon]);
  ok("and is marked precise", withGeo.precise === true);

  const noGeo = M.resolveStopCoordsDetailed("Faaborg Havn", {});
  ok("without it the town centre stands in", noGeo !== null && noGeo.precise === false);
  ok("the town centre is not the harbour", Math.abs(noGeo.lat - HAVN.lat) > 0.0001);

  // The report itself, in both directions.
  const km = M.legDistanceKm("Faaborg Havn", "Faaborg Camping", GEO);
  ok("the real leg is a real distance, not zero", km > 2 && km < 3);
  is("two stops collapsed onto one town centre read as unknown, never as zero",
    M.legDistanceKm("Faaborg Havn", "Faaborg Camping", {}), null);

  // A stop with no town in its name and no geocode has no position at all, and
  // saying so beats inventing one.
  is("an unplaceable stop resolves to nothing", M.resolveStopCoordsDetailed("Vejlebrovej coast viewpoint", {}), null);
  is("and a leg to it has no distance", M.legDistanceKm("Faaborg Havn", "Vejlebrovej coast viewpoint", GEO), null);

  // ── "Vejlebrovej" IS NOT VEJLE ───────────────────────────────
  // The above used to resolve to Vejle, eighty kilometres away on the far side
  // of the Belt, because the town fallback asked `name.includes("Vejle")`. A
  // town only counts as a whole word now. Danish street names ending in -vej
  // make this a common shape, not a freak one.
  ok("a town inside a longer word does not count", !M.townInName("Vejlebrovej coast viewpoint", "Vejle"));
  ok("a town as its own word does", M.townInName("Faaborg Camping", "Faaborg"));
  ok("a town at the very start counts", M.townInName("Roskilde Domkirke", "Roskilde"));
  ok("a town at the very end counts", M.townInName("Havnen i Svendborg", "Svendborg"));
  ok("a hyphen is a boundary", M.townInName("Faaborg-Midtfyn Camping", "Faaborg"));
  // Danish letters are not word characters to a regex \b, which is why this
  // does not use one. If it ever starts to, these two fail.
  ok("a name that is only the town counts", M.townInName("Ærøskøbing", "Ærøskøbing"));
  ok("and Danish letters do not break the boundary", M.townInName("Ærøskøbing Havn", "Ærøskøbing"));
  // LONGEST MATCH WINS. A real case in the current data: "Nørresundby
  // (Aalborg)" contains "Aalborg", so plain .find() could answer with either
  // depending on key order, and they are different places on opposite banks of
  // the Limfjord.
  is("the fuller town name wins over one nested inside it", M.townKeyFor("Nørresundby (Aalborg) Havn"), "Nørresundby (Aalborg)");
  is("no town in the name means no town", M.townKeyFor("Vejlebrovej coast viewpoint"), null);
  is("the reported stop now resolves to nothing rather than to Vejle", M.townKeyFor("Vejlebrovej coast viewpoint"), null);
  is("a genuine Vejle stop still finds Vejle", M.townKeyFor("Vejle Fjord bridge"), "Vejle");

  // ZERO MINUTES IS NEVER AN ANSWER. The build applies this to whatever the
  // Directions API returns; the shape of the rule is pinned here.
  const usable = (d, a, b) => !(!d || d.error || !(d.durationMinutes >= 1) ||
    (a && b && !a.precise && !b.precise && Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lon - b.lon) < 1e-9));
  ok("a zero minute leg is refused", !usable({ durationMinutes: 0 }));
  ok("a one minute leg is kept", usable({ durationMinutes: 1 }));
  ok("an errored leg is refused", !usable({ error: "ZERO_RESULTS" }));
  ok("a leg between two identical town centres is refused",
    !usable({ durationMinutes: 4 }, { lat: 55.095, lon: 10.243, precise: false }, { lat: 55.095, lon: 10.243, precise: false }));
  ok("but the same reading between two precise points is kept",
    usable({ durationMinutes: 4 }, { ...HAVN, precise: true }, { ...CAMP, precise: true }));
}

// ── the plan gate ──────────────────────────────────────────────────
// Every rule here is checked against the real guide Oliver asked me to look at
// on 7 Aug: three days, three actual places, Ærøskøbing counted twice, and a
// middle day covering 172 km. Nothing sat between the planner and the writer,
// and the writer is good enough that a weak plan came back reading like a
// considered one.
{
  const REAL = [
    { day: 1, stops: [{ name: "Amalienborg Slot", town: "Copenhagen" }] },
    { day: 2, stops: [{ name: "Faxe Kalkbrud", town: "Faxe" }, { name: "Ærøskøbing", town: "Ærøskøbing" }] },
    { day: 3, stops: [{ name: "Ærøskøbing", town: "Ærøskøbing" }] },
  ];
  const GEO = {
    "Amalienborg Slot": { lat: 55.6846, lon: 12.5934 },
    "Faxe Kalkbrud": { lat: 55.2613, lon: 12.1288 },
    "Ærøskøbing": { lat: 54.8897, lon: 10.4112 },
  };
  const v = M.checkPlan(REAL, GEO);
  const codes = v.problems.map(p => p.code).sort();
  ok("the guide that started this does not pass", !v.ok);
  is("and it fails for the three real reasons", codes, ["REPEATED_STOP", "TOO_FEW_PLACES", "TOO_MUCH_TRAVEL"]);
  is("four stops, three places", [v.stats.stops, v.stats.distinct], [4, 3]);

  // A plan with no problems must come back clean, or the gate is just noise.
  const GOOD = [
    { day: 1, stops: [{ name: "Nyhavn" }, { name: "Christiania" }] },
    { day: 2, stops: [{ name: "Roskilde Domkirke" }, { name: "Vikingeskibsmuseet" }, { name: "Roskilde havn" }] },
    { day: 3, stops: [{ name: "Dragør Havn" }, { name: "Amager Strandpark" }] },
  ];
  const G2 = {
    "Nyhavn": { lat: 55.6797, lon: 12.5909 }, "Christiania": { lat: 55.6772, lon: 12.6105 },
    "Roskilde Domkirke": { lat: 55.6427, lon: 12.08 }, "Vikingeskibsmuseet": { lat: 55.6503, lon: 12.0836 },
    "Roskilde havn": { lat: 55.651, lon: 12.085 }, "Dragør Havn": { lat: 55.5925, lon: 12.672 },
    "Amager Strandpark": { lat: 55.6548, lon: 12.635 },
  };
  ok("a sensible plan passes clean", M.checkPlan(GOOD, G2).ok);

  // An edge day may hold one stop: you land at two in the afternoon. A day in
  // the middle may not.
  const EDGE = [{ day: 1, stops: [{ name: "A" }] }, { day: 2, stops: [{ name: "B" }, { name: "C" }] }, { day: 3, stops: [{ name: "D" }] }];
  ok("a single stop on the first or last day is allowed", !M.checkPlan(EDGE).problems.some(p => p.code === "THIN_DAY"));
  const MIDDLE = [{ day: 1, stops: [{ name: "A" }, { name: "B" }] }, { day: 2, stops: [{ name: "C" }] }, { day: 3, stops: [{ name: "D" }, { name: "E" }] }];
  ok("a single stop in the middle is not", M.checkPlan(MIDDLE).problems.some(p => p.code === "THIN_DAY" && p.day === 2));
  ok("an empty day is always a problem", M.checkPlan([{ day: 1, stops: [] }]).problems.some(p => p.code === "EMPTY_DAY"));

  // ── DISTANCE IS ALL OR NOTHING ────────────────────────────
  // A day total built from the legs that happened to resolve UNDERSTATES the
  // day, and understating is the exact direction that lets a bad plan through.
  const FAR = [{ day: 1, stops: [{ name: "X" }, { name: "Y" }] }];
  ok("a long day with both ends known is flagged",
    M.checkPlan(FAR, { X: { lat: 55.68, lon: 12.59 }, Y: { lat: 54.89, lon: 10.41 } }).problems.some(p => p.code === "TOO_MUCH_TRAVEL"));
  ok("the same day with one end unknown is not judged on distance",
    !M.checkPlan(FAR, { X: { lat: 55.68, lon: 12.59 } }).problems.some(p => p.code === "TOO_MUCH_TRAVEL"));
  ok("and a short day is left alone",
    !M.checkPlan(FAR, { X: { lat: 55.68, lon: 12.59 }, Y: { lat: 55.7, lon: 12.61 } }).problems.some(p => p.code === "TOO_MUCH_TRAVEL"));

  // ── the title is the first factual claim a reader meets ───
  is("chalk cliffs with no cliff anywhere", M.titlePromises("Cobbled Streets and Chalk Cliffs", ["Amalienborg Slot", "Faxe Kalkbrud"], ["Copenhagen", "Faxe"]), ["cliff"]);
  is("a castle title with a real castle passes", M.titlePromises("Castles of Funen", ["Nyborg Slot"], ["Nyborg"]), []);
  is("Danish delivers an English promise", M.titlePromises("Cathedral and Viking Ships", ["Roskilde Domkirke", "Vikingeskibsmuseet"], ["Roskilde"]), []);
  is("colour and mood are never the title's debt", M.titlePromises("Slow, Quiet Days in the North", ["Skagen"], ["Skagen"]), []);
  // SHORT TOKENS ARE A TRAP, and these two were in the first draft: "borg" is
  // inside Aalborg and Nyborg, which are towns, and a bare "ø" is inside half
  // the Danish map. Both would have marked a promise delivered when it was not.
  is("a town ending in -borg is not a castle", M.titlePromises("Castles of the North", ["Aalborg gamle by"], ["Aalborg"]), ["castle"]);
  is("an island promise is kept by a real island", M.titlePromises("Island Hopping in the South", ["Ærøskøbing havn"], ["Ærøskøbing"]), []);
  is("and broken by a place that is not one", M.titlePromises("Island Hopping", ["Nyhavn"], ["Copenhagen"]), ["island"]);
}

// ── the dash ban, enforced instead of requested ────────────────────
// Five em dashes shipped inside a saved guide payload on 7 Aug. The rule is in
// every prompt in this project and has been for weeks, which is the argument
// for doing it in code: anything the system already knows is enforced, never
// asked for.
{
  is("a dash used as punctuation becomes a comma",
    M.stripDashes("far cheaper than full-fare rail — book those ahead"),
    "far cheaper than full-fare rail, book those ahead");
  is("a dash between numbers becomes the word to",
    M.stripDashes("Open 09:00–17:00"), "Open 09:00 to 17:00");
  is("and so does a spaced range", M.stripDashes("12 – 15 minutes"), "12 to 15 minutes");
  is("hyphens are left alone", M.stripDashes("63-million-year-old fossils"), "63-million-year-old fossils");
  is("text with no dash is returned untouched", M.stripDashes("nothing to do here"), "nothing to do here");
  is("a non-string passes straight through", M.stripDashes(42), 42);
  ok("no dash survives anywhere", !/[–—−―]/.test(
    M.stripDashes("a — b – c − d ― e")));

  // THE GUARD MUST NOT BE A GLOBAL REGEX. The first version tested with a /g/
  // pattern, which carries lastIndex between calls, so it alternated true and
  // false and silently skipped every other string. Caught on the first run:
  // "12–15 minutes" came back untouched purely because the string before it had
  // matched. Three in a row is what proves it.
  is("three dashed strings in a row all get cleaned", [
    M.stripDashes("a — b"), M.stripDashes("c — d"), M.stripDashes("e — f"),
  ], ["a, b", "c, d", "e, f"]);

  const guide = { title: "A — B", _convoText: "keep — this", days: [{ title: "Day — one", stops: [{ note: "x — y" }] }] };
  const clean = M.stripDashesDeep(guide);
  is("prose is cleaned all the way down", clean.days[0].stops[0].note, "x, y");
  is("and so are titles", [clean.title, clean.days[0].title], ["A, B", "Day, one"]);
  is("but keys starting with _ are machinery and stay verbatim", clean._convoText, "keep — this");
}

// ── reading a guide when you have never been to Denmark ────────────
// Oliver, 7 Aug 2026: "Be honest, if you were a user, you had never been to
// Denmark, would it be too overwhelming?" It would, and not for the reason I
// had been fixing. To a visitor, Vikingeskibsmuseet, Roskilde Domkirke and
// Faxe Kalkbrud are three long unpronounceable strings that look identical.
{
  const k = (n, real) => M.stopKind(n, real);
  is("a compound name says what it is", k("Vikingeskibsmuseet"), "Viking ship museum");
  is("domkirke beats kirke", k("Roskilde Domkirke"), "Cathedral");
  is("a plain church is a church", k("Sønderho Kirke"), "Church");
  is("a quarry is not a cliff", k("Faxe Kalkbrud"), "Chalk quarry");
  is("slot is a castle", k("Kronborg Slot"), "Castle");
  is("havn is a harbour", k("Dragør Havn"), "Harbour");
  is("and Nyhavn is one too", k("Nyhavn"), "Harbour");
  is("a ferry port outranks a plain harbour", k("Odden Færgehavn"), "Ferry port");
  is("lufthavn is an airport, not a harbour", k("Billund Lufthavn"), "Airport");
  is("the definite article form works", k("Storebæltsbroen"), "Bridge");
  is("english names still resolve", k("Louisiana Museum of Modern Art"), "Museum");

  // THE BOUNDARY RULE, which this project has now been bitten by twice in one
  // day. A Danish compound glues the noun onto the END of a word, so letters
  // before a token are normal and letters after it are not.
  is("Broager is a town, not a bridge", k("Broager"), null);
  is("a name that says nothing says nothing", k("Christiania"), null);
  // When the name gives nothing away, the published entry's own category does.
  is("a matched town falls back to Town", k("Ærøskøbing", { _src: "town" }), "Town");
  is("a matched restaurant says Restaurant", k("Geranium", { _src: "food" }), "Restaurant");
  is("no name and no match is honestly nothing", k("Christiania", null), null);

  // ── SCALE, the thing a visitor has no way to judge ────────
  ok("a short trip is told Denmark is small",
    /Denmark is small/.test(M.tripScaleLine({ longest: { minutes: 38, text: "38 mins" } })));
  ok("a long haul is called a haul, not a hop",
    /haul/.test(M.tripScaleLine({ longest: { minutes: 95, text: "1 hour 35 mins" } })));
  ok("and half a day is said plainly",
    /most of a day/.test(M.tripScaleLine({ longest: { minutes: 240, text: "4 hours" } })));
  // Silence beats a guess: the longest journey is only known when every leg was
  // measured, and tripShape already withholds it otherwise.
  is("nothing measured means nothing claimed", M.tripScaleLine({}), null);
  is("and a zero is not a journey", M.tripScaleLine({ longest: { minutes: 0, text: "1 min" } }), null);

  // ── WHAT SHAPE OF TRIP IS THIS ────────────────────────────
  // Counted from where each day ENDS, because a day trip out and back is not a
  // change of base.
  const dayTrips = { _mode: "public transport", days: [
    { day: 1, stops: [{ name: "Nyhavn", town: "Copenhagen" }] },
    { day: 2, stops: [{ name: "Roskilde Domkirke", town: "Roskilde" }, { name: "Nyhavn", town: "Copenhagen" }] },
    { day: 3, stops: [{ name: "Dragør Havn", town: "Dragør" }, { name: "Nyhavn", town: "Copenhagen" }] },
  ] };
  const c1 = M.tripCharacter(dayTrips, { days: 3, towns: ["Copenhagen", "Roskilde", "Dragør"] });
  ok("out and back all three nights reads as one base", /One base/.test(c1));
  ok("and names the transport in the traveler's words", /train and bus/.test(c1));

  const moving = { _mode: "car", days: [
    { day: 1, stops: [{ name: "A", town: "Aarhus" }] },
    { day: 2, stops: [{ name: "B", town: "Ribe" }] },
    { day: 3, stops: [{ name: "C", town: "Odense" }] },
  ] };
  ok("changing town every night reads as a moving trip", /change town 2 times/.test(M.tripCharacter(moving, { days: 3, towns: ["Aarhus", "Ribe", "Odense"] })));
  // A ferry is the one leg that runs to a timetable you cannot argue with.
  const ferry = { _mode: "car", days: [
    { day: 1, stops: [{ name: "A", town: "Svendborg" }], glance: { legs: [{ how: "~1h by ferry" }] } },
    { day: 2, stops: [{ name: "B", town: "Ærøskøbing" }] },
  ] };
  ok("a ferry crossing is called out on its own", /ferry crossing/.test(M.tripCharacter(ferry, { days: 2, towns: ["Svendborg", "Ærøskøbing"] })));
  is("no plan, nothing said", M.tripCharacter(null, null), null);

  // ── WHAT ACTUALLY HAS TO BE BOOKED ────────────────────────
  // Only things the guide can stand up. A list that pads itself out is one a
  // traveler learns to skip.
  const lookup = (n) => n === "Roskilde Festival" ? { _src: "event", date: "2026-06-27", ticketStatus: "limited" } : null;
  const withEvent = { days: [{ day: 1, stops: [{ name: "Roskilde Festival" }, { name: "Some field" }], glance: { stayArea: "central Roskilde" } }] };
  const acts = M.bookingActions(withEvent, lookup);
  is("a dated event and a bed, nothing invented", acts.length, 2);
  ok("the limited event says so", /limited/i.test(acts[0].why));
  is("a trip with nothing to book says nothing",
    M.bookingActions({ days: [{ day: 1, stops: [{ name: "A walk" }] }] }, () => null).length, 0);
}

// ── "I would like to have Claude rewriting itself" ─────────────────
// Oliver, 7 Aug 2026. He could already say "the date is wrong, it is 25
// August" and have it applied. He could not say "this reads like an advert",
// because that went into the fact-checking pipeline, came back marked not
// checkable, and left the draft untouched. Three things a person can say to a
// draft, and the router has to tell them apart every time:
//   correct  a claim about the WORLD    edit  a claim about the WRITING
//   ask      a question
{
  const r = M.routeMessage;
  is("too long is an edit", r("This paragraph is too long"), "edit");
  is("reads like an advert is an edit", r("The reality check reads like an advert"), "edit");
  is("make it warmer is an edit", r("Make it warmer"), "edit");
  is("shorten is an edit", r("shorten the intro"), "edit");
  is("tighten is an edit", r("tighten this up, it waffles"), "edit");

  // A FACT ALWAYS WINS. "Rewrite" and "fix" live in both vocabularies, and the
  // rest of the sentence is the only thing that separates them. Getting this
  // backwards would send a real correction to a pass that never checks
  // anything against a source, which is the worst outcome available here.
  is("a stated correct value is never an edit", r("Rewrite it, the station should be Aarhus H"), "correct");
  is("wrong plus a value is a correction", r("The station is wrong. It should be Aarhus H."), "correct");
  is("a pasted fact-check is a correction", r("Google says the date is wrong, it is actually 25 August"), "correct");
  is("a denial is a correction", r("This says the ferry is required but that is not true"), "correct");
  is("fix the price is a correction", r("Fix the price, it should be 120 kr"), "correct");
  is("a question is still only answered", r("why does it say the ferry is required?"), "ask");
  is("an audit is still an audit", r("which ones need work?"), "audit");
  ok("an assertion is never an edit request", !M.isEditRequest("rewrite it, it should be 25 August"));

  // ── A REWRITE MAY NOT CHANGE A FACT ───────────────────────
  // The entire risk of this feature. Ask for something shorter and a model
  // will drop the price, round the year, or smooth "12 minutes" into "about an
  // hour", and it will read beautifully.
  const before = "Open 10:00 to 17:00, entry 120 kr. The Vikingeskibsmuseet is 12 minutes from Roskilde Domkirke. See vikingeskibsmuseet.dk";
  const facts = M.factsIn(before);
  ok("a price is a fact", facts.has("120 kr"));
  ok("a duration keeps its unit", facts.has("12 minutes"));
  ok("a clock time is one token", facts.has("10:00") && facts.has("17:00"));
  ok("a domain is a fact", facts.has("vikingeskibsmuseet.dk"));
  ok("a place name is a fact", facts.has("roskilde domkirke"));
  // UNITS ARE MATCHED LONGEST FIRST. With "km|m|minutes" in that order,
  // "12 minutes" tokenises as "12 m" and the refusal message becomes gibberish.
  ok("no truncated unit leaks through", ![...facts].includes("12 m"));

  ok("a pure rephrase is allowed", M.factsPreserved(before,
    "Opening 10:00 to 17:00, it costs 120 kr. The Vikingeskibsmuseet sits 12 minutes from Roskilde Domkirke. See vikingeskibsmuseet.dk").ok);
  // A LEADING ARTICLE IS NOT PART OF A NAME. Without stripping it, moving "the"
  // reads as losing the museum, and every honest rewrite gets refused.
  ok("restructuring around an article is allowed", M.factsPreserved(before,
    "It opens at 10:00 and closes at 17:00, and entry is 120 kr. You reach the Vikingeskibsmuseet in 12 minutes from Roskilde Domkirke, see vikingeskibsmuseet.dk").ok);

  const dropped = M.factsPreserved(before, "Open 10:00 to 17:00. The Vikingeskibsmuseet is 12 minutes from Roskilde Domkirke. See vikingeskibsmuseet.dk");
  ok("dropping the price is refused", !dropped.ok);
  ok("and the refusal names the price", dropped.lost.includes("120 kr"));

  const swapped = M.factsPreserved(before, "Open 10:00 to 17:00, entry 120 kr, about an hour from Roskilde Domkirke at the Vikingeskibsmuseet. See vikingeskibsmuseet.dk");
  ok("rounding 12 minutes into an hour is refused", !swapped.ok);
  ok("and it is named in the traveler's own words", swapped.lost.includes("12 minutes"));

  const invented = M.factsPreserved(before, before + " Founded in 1997.");
  ok("inventing a year is refused", !invented.ok);
  ok("and the invention is named", invented.invented.includes("1997"));
  // A new proper NAME is allowed: a rewrite may name the street the original
  // only described. A new NUMBER never is.
  ok("naming a street the original described is allowed",
    M.factsPreserved("A yellow town by the water.", "A yellow town along Vestergade by the water.").ok);
}

// ── EVERY TYPE NEEDS SOMEWHERE HONEST TO PUT THE VERDICT ───────────
// Oliver, 8 Aug 2026, holding a published Amalienborg entry next to a town:
// "Make it more similar to towns where we see brutal criticism as well... only
// towns seem to genuinely be good. Do you agree?"
//
// He was right, and the split was sharper than towns versus everything. Four
// types already had a reality check. Four did not: attractions, workshops,
// nightlife venues and nightlife towns. Those same four carried the two worst
// headings in the app, "Why People Love It" and "Perfect For". A model cannot
// write "skip this" under a heading that opens Why People Love It, so it was
// never disobeying: the schema was asking for praise and got it.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  // Each published type builds its page from one bb([...]) call listing its
  // section headings. Pulling them out of the source is the only way to check
  // the thing that actually ships.
  const headingSets = [...app.matchAll(/bb\(\s*(?:isClub \? )?\[\[([\s\S]{0,400}?)\]\]/g)]
    .map(m => [...m[1].matchAll(/"([^"]+)"|`([^`]+)`/g)].map(h => h[1] || h[2]));
  ok("every published type still builds a page", headingSets.length >= 7);

  // 1. NOTHING MAY PRESUPPOSE THE VERDICT. A heading is an instruction to the
  // writer before it is a label for the reader.
  const PRESUPPOSING = /why people love|perfect for|you'll love|what makes .* special|must see/i;
  const guilty = headingSets.flat().filter(h => PRESUPPOSING.test(h));
  is("no heading tells the writer the answer before it writes", guilty, []);

  // 2. AND EVERY TYPE NEEDS THE SLOT. Without one there is nowhere for an
  // honest negative to live, whatever the prompt asks for.
  const noVerdict = headingSets.filter(set => !set.some(h => /reality check/i.test(h)));
  is("every type has a reality check section", noVerdict, []);

  // 3. Named the same everywhere, or it reads as a different feature per page.
  const variants = [...new Set(headingSets.flat().filter(h => /reality check/i.test(h)))];
  is("and it is called the same thing on every one", variants, ["The Reality Check"]);

  // 4. The schema has to carry the field, or the heading renders empty forever.
  const prompts = readFileSync(join(root, "src/utils/studioPrompts.js"), "utf8");
  const TYPES = ["town", "festival", "free", "food", "foodStreet", "night", "nightTown", "booking"];
  const p = M.studioPrompts("Amalienborg Slot");
  TYPES.forEach(t => {
    ok(`${t} asks for a verdict field`, /realityCheck|gettingThereReality/.test(p[t]));
  });

  // 5. A DOWNSIDE IS NOT A LOGISTICS NOTE. The Amalienborg entry satisfied the
  // old rule with "get there by 11:45 for a clear view", which is advice for
  // somebody who has already decided to come.
  ok("the rule now says what a downside is not", /logistics note|already decided/i.test(prompts));
  ok("and names the useless kinds outright", /arrive by|book ahead|wear good shoes/i.test(prompts));
  ok("no manufactured complaint when a place is simply good", /rather than manufacturing a complaint/i.test(prompts));
  // The one that made the old rule toothless: a criticism immediately balanced
  // by a positive reads as marketing.
  ok("and it forbids pre-cushioning the criticism", /pre-cushioned|immediately balancing/i.test(prompts));
}

// ── the draft rewrite, tested end to end ───────────────────────────
// Oliver, 8 Aug 2026: "Can you please test if the AI client on the draft
// properly edits the draft? Check for any bugs among it." It did not, and
// running it against a realistic draft with a stubbed writer found seven.
{
  const DRAFT = {
    name: "Amalienborg Slot", city: "Copenhagen", type: "Royal palace",
    desc: "Four rococo palaces around an octagonal square. The square is free; the museum charges.",
    ticketsGlance: "125 DKK online, 135 at the door", nearestStation: "Marmorkirken",
    special: "The octagonal square feels like an outdoor room.",
    whoFor: "Anyone with an hour to spare around midday and a soft spot for pageantry.",
    realityCheck: "",
    thingsToKnow: ["The noon guard change pulls a crowd, get there by 11:45."],
    blogBody: [{ type: "h", text: "Being There" }],
  };
  const writer = (text) => async () => ({ text });
  const edit = (instruction, text) => M.editEntry({ entry: DRAFT, instruction, deps: { askClaude: writer(text) } });

  // BUG 1, THE WORST ONE. "Anyone" is capitalised, over six letters, and opens
  // the sentence, so it counted as a proper noun and EVERY rewrite of whoFor
  // was refused for "dropping anyone". Families, Visitors, Everyone and Sunday
  // all did the same, which quietly rejected most honest rewrites of most
  // fields. A single capitalised word only counts mid-sentence now.
  ok("a sentence-opening capital is not a name", !M.factsIn("Anyone with an hour to spare.").has("anyone"));
  ok("but the same word mid-sentence is", M.factsIn("Good for Anyone really").has("anyone"));
  ok("and a multi-word name counts wherever it falls", M.factsIn("Roskilde Domkirke is old.").has("roskilde domkirke"));
  const clean = await edit("rewrite the whoFor, it is bland", "For anyone near the square at noon. Skip it otherwise.");
  is("an honest rewrite is applied", clean.changed, ["whoFor"]);

  // BUG 2. Markdown fences round the reply used to survive into the comparison.
  const fenced = await edit("rewrite the whoFor", "```\nFor anyone near the square at noon.\n```");
  is("a fenced reply is unwrapped, not refused", fenced.changed, ["whoFor"]);

  // BUG 3. Every short key in the schema is a fragment of ordinary English, so
  // "rename nothing" resolved to `name` and "shorten the ticketsGlance" would
  // have rewritten the description instead. Naming a fact field is a refusal.
  const renamed = await edit("rename nothing, just tighten the writing", "X");
  ok("a style note may not rewrite the entry's name", /name.*verified value/.test(renamed.error || ""));
  const glance = await edit("shorten the ticketsGlance", "X");
  ok("nor a glance value", /ticketsGlance.*verified value/.test(glance.error || ""));
  ok("and it never silently rewrites something else instead", !glance.changed);
  ok("prose fields are editable", M.EDITABLE_FIELDS.has("realityCheck") && M.EDITABLE_FIELDS.has("desc"));
  ok("identity and glance fields are not", !M.EDITABLE_FIELDS.has("name") && !M.EDITABLE_FIELDS.has("nearestStation") && !M.EDITABLE_FIELDS.has("website"));

  // BUG 4. blogBody is built FROM the prose fields at publish, so rewriting it
  // reshapes the article and is then discarded. It was in the fallback list.
  const vague = await edit("this is too wordy", "Rewritten.");
  ok("a vague instruction never targets blogBody", !vague.targets.includes("blogBody"));

  // BUG 5. An empty field used to be skipped silently, which is now the single
  // most common thing to ask for: four types only just gained realityCheck.
  const fresh = await edit("write the realityCheck", "Away from noon this is a handsome empty square.");
  is("an empty field is written, not skipped", fresh.changed, ["realityCheck"]);

  // BUG 6. Invention was measured against the FIELD, so "mention the price in
  // the desc" was refused for inventing a price the entry already held.
  const moved = await edit("mention the price in the desc",
    "Four rococo palaces around an octagonal square. The square is free; the museum is 125 DKK online, 135 at the door.");
  is("moving a fact between fields is allowed", moved.changed, ["desc"]);
  // But conjuring one the entry has never contained is not.
  const conjured = await edit("rewrite the desc", "Four rococo palaces, built in 1750 for 4000 kr.");
  is("a fact from nowhere is refused", conjured.changed, []);
  ok("and the refusal names it", /1750|4000/.test(JSON.stringify(conjured.refused)));

  // BUG 7. A list field that comes back as prose is refused rather than saved.
  const wrongShape = await edit("rewrite the thingsToKnow", "Just a sentence, not an array.");
  is("a list that comes back as prose is refused", wrongShape.changed, []);
}

// ── "Logistik-Optimering v/Bo Trygve Mortensen" ────────────────────
// Oliver, 8 Aug: that shipped as a nearestStation. It is a freight consultancy
// named after the man who runs it. The old guard was a BLOCKLIST of non-transit
// words, so anything not on the list walked through, and the list of things
// that are not a bus stop cannot be finished. Google already answers this.
{
  const t = M.hasTransitType;
  is("a company is not a stop", t({ types: ["moving_company", "point_of_interest", "establishment"] }), false);
  is("a shop is not a stop", t({ types: ["grocery_store", "store"] }), false);
  is("a station is", t({ types: ["train_station", "transit_station"], primaryType: "train_station" }), true);
  is("a ferry terminal is", t({ types: ["ferry_terminal"] }), true);
  is("a bus stop is", t({ types: ["bus_stop"] }), true);
  // NEVER CONCLUDE FROM A MISSING LOOKUP. No types means not told, which falls
  // back to reading the name rather than rejecting a real stop.
  is("no types means unknown, not rejected", t({ name: "Ribe Station", types: [] }), null);
  is("and no place at all is unknown too", t(null), null);
}


// ── SENDING A TRIP TO SOMEBODY ─────────────────────────────────────
// Oliver, 8 Aug 2026: "Aight, let's try!" — sharing, the first of the four
// things the competitor research said were worth taking from the rest of the
// category. Every word of the share copy is COUNTED from the plan, never
// written, so all of it is testable and none of it can drift into something
// that reads well and is not true. It goes out in a message to somebody else's
// phone, where it cannot be corrected afterwards.
{
  const { shareSummary, shareMessage, shareTitle, metaDescription, routeTowns, countStops, orderedStops, hasMeasuredTravel, escapeHtml } = M;
  const guide = {
    title: "Islands & Harbours of South Funen",
    days: [
      { day: 1, stops: [{ name: "Ærøskøbing", town: "Ærøskøbing" }, { name: "Ærø Bryggeri", town: "Ærøskøbing" }] },
      { day: 2, stops: [{ name: "Svendborg Havn", town: "Svendborg" }] },
      { day: 3, stops: [{ name: "Egeskov Slot", town: "Kværndrup" }, { name: "Odense Domkirke", town: "Odense" }] },
    ],
  };
  is("each town appears once, in order", routeTowns(guide), ["Ærøskøbing", "Svendborg", "Kværndrup", "Odense"]);
  is("stops are counted across days", countStops(guide), 5);
  is("and flattened in travel order", orderedStops(guide).map(s2 => s2.name)[4], "Odense Domkirke");
  is("the summary is counted, not written", shareSummary(guide), "3 days, 5 stops, Ærøskøbing to Odense");
  ok("the message leads with the title", shareMessage(guide).startsWith("Islands & Harbours of South Funen — "));

  // ALL OR NOTHING, the same rule tripShape follows. A day count with no stops
  // behind it is a number, not a trip.
  is("days with no stops says nothing", shareSummary({ days: [{ day: 1, stops: [] }] }), null);
  is("no guide at all says nothing", shareSummary(null), null);
  is("and the message falls back to the title", shareMessage({ title: "Five days in Jutland", days: [] }), "Five days in Jutland");
  is("an untitled guide still has a name", shareTitle({}), "A Denmark guide");

  // A stop with no name is not a stop, in every function. These disagreed once:
  // countStops required a name and routeTowns did not, so a malformed day could
  // put a town in the route that contributed nothing to the count.
  const halfStop = { days: [{ day: 1, stops: [{ name: "Ribe Domkirke", town: "Ribe" }, { town: "Nowhere" }] }] };
  is("a nameless stop is not counted", countStops(halfStop), 1);
  is("and does not reach the route either", routeTowns(halfStop), ["Ribe"]);

  // ── A ROUND TRIP DOES NOT END WHERE THE DEDUPED LIST ENDS ────────
  // routeTowns names each town once, so its last entry is the last town FIRST
  // REACHED, not the last town of the trip. Almost every Denmark trip flies in
  // and out of Copenhagen, so almost every share message said "Copenhagen to
  // Odense" about a trip that starts and ends in Copenhagen. Naming the wrong
  // endpoint is not a shortened truth like dropping the middle towns.
  const loop = { title: "A week from Copenhagen", days: [
    { day: 1, stops: [{ name: "Nyhavn", town: "Copenhagen" }] },
    { day: 2, stops: [{ name: "Odense Domkirke", town: "Odense" }] },
    { day: 3, stops: [{ name: "Assistens Kirkegård", town: "Copenhagen" }] },
  ] };
  is("a round trip is named as one", shareSummary(loop), "3 days, 3 stops, a loop from Copenhagen");
  is("one town is just that town", shareSummary({ days: [{ day: 1, stops: [{ name: "Rundetaarn", town: "Copenhagen" }] }] }), "1 day, 1 stop, Copenhagen");

  // ── THE CARD MUST NOT CLAIM WHAT THE GUIDE DOES NOT HAVE ─────────
  // A "simple guide" is built deliberately without transport times (lightMode
  // on GuidePage), and the first version of metaDescription promised measured
  // travel times on every guide including those. The second version asked only
  // whether _exactDurations had ANY keys — it is keyed per leg, so one resolved
  // road leg out of nine made the card announce that every travel time was
  // measured, on a guide whose page showed no travel total at all because
  // tripShape withholds one unless every leg is known. The card would have
  // contradicted the page it linked to.
  is("a simple guide has no measured travel", hasMeasuredTravel(guide), false);
  ok("so the card does not claim any", !/travel time/i.test(metaDescription(guide)));
  const oneLeg = { ...guide, _exactDurations: { "Ærøskøbing|Ærø Bryggeri|walking": { durationMinutes: 7 } } };
  is("one leg out of four is not every leg", hasMeasuredTravel(oneLeg), false);
  const allLegs = { ...guide, _exactDurations: {
    "Ærøskøbing|Ærø Bryggeri|walking": { durationMinutes: 7 },
    "Ærø Bryggeri|Svendborg Havn|ferry": { durationMinutes: 75 },
    "Svendborg Havn|Egeskov Slot|transit": { durationMinutes: 41 },
    "Egeskov Slot|Odense Domkirke|transit": { durationMinutes: 38 },
  } };
  is("all four legs is", hasMeasuredTravel(allLegs), true);
  ok("and then the card says so", /measured rather than guessed/.test(metaDescription(allLegs)));
  ok("still leading with the counted facts", metaDescription(allLegs).startsWith("3 days, 5 stops"));
  // A zero-minute leg is the "1 min on bike, 13 on Maps" bug's own signature:
  // present in the map, not actually measured.
  const zeroLeg = { ...allLegs, _exactDurations: { ...allLegs._exactDurations, "Svendborg Havn|Egeskov Slot|transit": { durationMinutes: 0 } } };
  is("a zero-minute leg does not count as measured", hasMeasuredTravel(zeroLeg), false);

  // A guide title is text a person typed, going into an HTML attribute.
  is("attributes are escaped, ampersand first", escapeHtml(`"A" & <b>`), "&quot;A&quot; &amp; &lt;b&gt;");
}

// ── WHAT THE LINK LOOKS LIKE BEFORE ANYBODY CLICKS IT ──────────────
// The invisible half of sharing, and the reason a share button on its own would
// have been a silent failure that looked like a working feature: index.html
// carried no og: tags, so every Gemlyx link ever pasted into WhatsApp,
// iMessage, Slack or Discord arrived as a bare grey URL. None of those apps run
// JavaScript, so the app painting a beautiful page changes nothing.
{
  const { buildPreviewHtml, injectMeta } = M;
  const guide = { title: `Bornholm & the "smoked" east`, days: [{ day: 1, stops: [{ name: "Rønne Havn", town: "Rønne" }] }] };
  const html = buildPreviewHtml({ guide, url: "https://x.dev/guide/abc", image: "https://x.dev/og-default.jpg" });
  ok("the card carries a real og:title", /property="og:title" content="Bornholm &amp; the &quot;smoked&quot; east"/.test(html));
  ok("and an absolute og:image", /property="og:image" content="https:\/\//.test(html));
  ok("and a large twitter card", /name="twitter:card" content="summary_large_image"/.test(html));
  ok("and a canonical url", /rel="canonical" href="https:\/\/x.dev\/guide\/abc"/.test(html));
  ok("the title cannot break out of the attribute", !/content="[^"]*<[^"]*"/.test(html));

  // THE NORMAL RESPONSE IS THE REAL APP WITH TAGS FOLDED IN, for crawlers and
  // people alike. It used to be that anything matching the crawler list got a
  // script-less stub instead, which was a trap: several tokens on that list
  // ("Pinterest", "Tumblr", "Flipboard", "Viber", "Line/", "Signal") appear in
  // the user-agent of the browser EMBEDDED in those apps, which is exactly
  // where a link opens when a friend taps it. Tapping a guide inside LINE, the
  // default messenger across much of Asia, produced a page with no app on it
  // and an "open this guide" link pointing back at the same URL.
  const shell = `<!DOCTYPE html><html><head><title>Gemlyx — It exists nowhere else.</title>\n  </head><body><div id="root"></div><script src="/assets/index-abc.js"></script></body></html>`;
  const injected = injectMeta(shell, { guide, url: "https://x.dev/guide/abc", image: "https://x.dev/og.jpg" });
  ok("the app still boots", injected.includes('<div id="root"></div>') && injected.includes("/assets/index-abc.js"));
  ok("with the tags folded in", /property="og:description"/.test(injected));
  is("and nothing duplicated", (injected.match(/og:title/g) || []).length, 1);
  ok("the tab says which guide it is", /<title>Bornholm &amp; the &quot;smoked&quot; east — Gemlyx<\/title>/.test(injected));
  is("only one title survives", (injected.match(/<title>/g) || []).length, 1);
  // String.replace expands $& and $1 in a replacement. A guide called "$100 a
  // day" would otherwise inject the whole matched <title> tag into itself.
  const dollars = injectMeta(shell, { guide: { title: "$& $1 for $100 a day", days: guide.days }, url: "u", image: "i" });
  ok("a dollar sign in a title stays a dollar sign", dollars.includes("$1 for $100 a day"));
  is("and $& did not splice the match into it", (dollars.match(/<\/head>/g) || []).length, 1);
  is("a shell with no head is left alone", injectMeta("<p>hi</p>", { guide, url: "u", image: "i" }), "<p>hi</p>");
}

// ── WHO GETS THE TAGS, AND WHO MUST NEVER ──────────────────────────
// This gate used to be a regex string inside vercel.json, which could only be
// verified by deploying and squinting at a WhatsApp preview. It is ordinary
// JavaScript now (the deploy failed on the Hobby plan's 12-function limit, which
// forced the move to Edge Middleware and made the list testable as a side
// effect), so it can be checked here in a millisecond.
{
  const { isCrawler, guideIdFromPath } = M;
  ["WhatsApp/2.23.20 A",
   "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
   "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
   "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
   "TelegramBot (like TwitterBot)",
   "LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1)",
   "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  ].forEach(ua => ok(`recognised: ${ua.slice(0, 28)}`, isCrawler(ua)));

  // A PERSON MUST NEVER MATCH. Ordinary browsers were always fine; the ones that
  // caught us out were IN-APP browsers, whose user-agent carries the name of the
  // app that opened them — which is exactly where a shared link gets tapped.
  // Those app names are off the list and must not come back.
  [["Chrome on Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"],
   ["Safari on iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"],
   ["Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"],
   ["the LINE in-app browser", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1 Line/13.13.0"],
   ["the Viber in-app browser", "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/119 Mobile Safari/537.36 Viber/13.4.0.5"],
   ["the Pinterest in-app browser", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 [Pinterest/iOS]"],
   ["the Tumblr in-app browser", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Tumblr/24.5"],
   ["the Instagram in-app browser", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Instagram 320.0.1"],
   ["the Facebook in-app browser", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0]"],
   ["an empty user-agent", ""],
  ].forEach(([who, ua]) => ok(`${who} does not match`, !isCrawler(ua)));

  is("an id is read off the path", guideIdFromPath("/guide/81peftd1w67"), "81peftd1w67");
  is("a trailing slash is fine", guideIdFromPath("/guide/81peftd1w67/"), "81peftd1w67");
  // /guide/new is the confirm-before-saving screen. It is nobody's shared link
  // and there is nothing in the database to describe.
  is("the unsaved screen has no id", guideIdFromPath("/guide/new"), null);
  is("neither does the bare path", guideIdFromPath("/guide"), null);
  is("nor a deeper one", guideIdFromPath("/guide/a/b"), null);
  is("nor another page entirely", guideIdFromPath("/towns/ribe"), null);
}

// ── THE TAGS AND THE ROUTING, CHECKED AGAINST EACH OTHER ───────────
// og:image has to be absolute: a crawler fetches it in a separate request with
// no page context, so a relative path silently produces a card with no picture.
// That means the domain is hardcoded in index.html, and the day it changes is
// the day every shared link loses its preview with no error anywhere. This is
// what makes that loud.
{
  const { SITE_ORIGIN } = M;
  const html = readFileSync(join(root, "index.html"), "utf8");
  const img = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
  ok("index.html has an og:image at all", !!img);
  ok("index.html's og:image matches SITE_ORIGIN", !!img && img.startsWith(SITE_ORIGIN + "/"));
  ok("and it is a real file in public/", existsSync(join(root, "public", String(img || "").replace(SITE_ORIGIN + "/", ""))));
  ok("index.html has a description", /name="description" content="[^"]{40,}"/.test(html));
  ok("and a large twitter card", /name="twitter:card" content="summary_large_image"/.test(html));

  // ── THE HOBBY PLAN'S TWELVE ─────────────────────────────────────
  // This shipped as api/guide-preview.js and could not deploy at all:
  // "No more than 12 Serverless Functions can be added to a Deployment on the
  // Hobby plan." api/ held exactly 12 already. Edge Middleware does not count
  // against that limit, which is why the preview lives in middleware.js — but
  // the next person to add an api/ route deserves to find out here, in a second,
  // rather than from a failed deploy.
  const fns = readdirSync(join(root, "api")).filter(f => /\.(js|ts|mjs)$/.test(f));
  ok(`api/ holds ${fns.length} of the 12 serverless functions Hobby allows`, fns.length <= 12);
  ok("the preview is NOT one of them", !fns.includes("guide-preview.js"));

  // vercel.json is back to the plain single-page-app catch-all: no crawler
  // rewrite, because middleware runs ahead of routing and does that job.
  const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  is("one rewrite, the SPA catch-all", vercel.rewrites.map(r => r.source), ["/(.*)"]);

  const mw = readFileSync(join(root, "middleware.js"), "utf8");
  ok("middleware only runs on guide urls", /matcher:\s*"\/guide\/:path\*"/.test(mw));
  ok("and falls through to the app rather than erroring", /catch\s*{\s*[\s\S]{0,400}?return next\(\);/.test(mw));
}


// ── NOTHING IN App.jsx READS A CONST BEFORE IT EXISTS ──────────────
// Two crashes, three days apart, both this exact shape:
//   6 Aug — the FRONT PAGE, dead on every render, because a useEffect
//           dependency array named a const declared 600 lines below it. It
//           survived review because /guide/:id is a different component and
//           that route kept working perfectly.
//   8 Aug — the GUIDE BUILD, dead on every run:
//           "Guide build failed: ReferenceError: Cannot access 'qt' before
//            initialization"
//           because reordering the pipeline so accommodation lands before the
//           route fetch left enrichGuideDays(parsed.days, travelMode,
//           mixedModes) sitting above the two consts it reads.
//
// A temporal dead zone read is a thrown ReferenceError, not an undefined, so it
// takes the whole call down, and neither of these was findable by eye in a
// 774 KB file. This sweeps every function in it, in about a tenth of a second.
// See tests/tdz.mjs for why the stripping has to be a character walk and what
// it deliberately skips.
{
  const stripped = stripNonCode(readFileSync(join(root, "src/App.jsx"), "utf8"));
  ok("App.jsx parses far enough to find generateGuide", !!functionBody(stripped, "const generateGuide = async"));
  const names = new Set([...stripped.matchAll(/const ([A-Za-z_$][\w$]*) = (?:async )?\(/g)].map(m => m[1]));
  const bad = [];
  let swept = 0;
  for (const nm of names) {
    const body = functionBody(stripped, `const ${nm} = `);
    if (!body || body.length < 1200) continue;
    swept++;
    useBeforeDeclare(body).forEach(f => bad.push(`${nm}(): reads ${f.name} on line ${f.useLine}, declared on line ${f.declLine}`));
  }
  ok(`swept ${swept} functions in App.jsx for temporal dead zones`, swept > 20);
  is("nothing reads a const before it is declared", bad, []);

  // And the scanner itself, against the two shapes it exists to catch, so a
  // future refactor cannot quietly turn it into a function that always passes.
  const rigged = `const f = async () => {\n  const a = one(b);\n  const b = 2;\n  return a;\n};`;
  is("the scanner catches a real one", useBeforeDeclare(functionBody(stripNonCode(rigged), "const f = ")).map(x => x.name), ["b"]);
  // A property KEY is not a read. Every false positive left after the parameter
  // rule was this: setState({ running: true, fixed: 0 }) above a `const fixed`.
  const keys = `const f = async () => {\n  setState({ fixed: 0, failed: [] });\n  const fixed = 1; const failed = [];\n  return fixed;\n};`;
  is("a property key is not a read", useBeforeDeclare(functionBody(stripNonCode(keys), "const f = ")), []);
  // A word inside a prompt is not a read either — the whole reason the stripper
  // exists. This template literal mentions travelMode in prose AND interpolates
  // a real expression, and only the real one counts.
  const prose = "const f = async () => {\\n  const p = `plan the travelMode carefully ${name.trim()}`;\\n  const travelMode = 1;\\n  return p + travelMode;\\n};";
  is("a word inside a prompt is not a read", useBeforeDeclare(functionBody(stripNonCode(prose), "const f = ")), []);
}

// ── A TOWN HAS NO NEAREST STOP ─────────────────────────────────────
// Oliver, 8 Aug 2026, reading the published Copenhagen entry:
//   "nearestStation on a capital city is weird tbh. With major cities, that is
//    just odd. Maybe leave out nearest station on towns."
//
// The stored row said "Nørreport (9 mins walk)", which is nine minutes from the
// coordinate a geocoder picked for the middle of a city of 660,000 — a fact
// about that coordinate, not about Copenhagen, and misleading too, since the
// station a person actually plans a Copenhagen trip around is København H.
{
  const { hasArrivalField, ARRIVAL_TYPES } = M;
  is("a town has no arrival field", hasArrivalField("town"), false);
  is("nor does a town's nightlife page", hasArrivalField("nightTown"), false);
  // KEPT where the place genuinely IS one point on the map and the nearest stop
  // is the single most useful logistical fact about it.
  is("a festival does", hasArrivalField("festival"), true);
  is("a free attraction does", hasArrivalField("free"), true);
  is("a restaurant does", hasArrivalField("food"), true);
  is("a workshop does", hasArrivalField("craft"), true);
  is("and an unknown type does not", hasArrivalField("wat"), false);
  ok("town is not in the set under any name", !ARRIVAL_TYPES.has("town") && !ARRIVAL_TYPES.has("nightTown"));

  // BOTH HALVES, because 71 entries were already published with the field
  // filled in and a prompt change cannot reach those.
  const prompts = readFileSync(join(root, "src/utils/studioPrompts.js"), "utf8");
  const townPrompt = prompts.slice(prompts.indexOf("  town: `"), prompts.indexOf("  festival: `"));
  ok("the town prompt no longer asks for a station", !/nearestStation/.test(townPrompt));
  ok("but the festival prompt still does", /nearestStation/.test(prompts.slice(prompts.indexOf("  festival: `"), prompts.indexOf("  festival: `") + 9000)));

  const detail = readFileSync(join(root, "src/components/DetailPage.jsx"), "utf8");
  const townGlance = detail.slice(detail.indexOf('{kind === "town" && ('), detail.indexOf('{kind === "town" && (') + 1400);
  ok("and the town At a Glance card does not render one", !/arrivalRow/.test(townGlance));
  ok("while attractions still do", /arrivalRow\(item\.nearestStation\)/.test(detail));
}

// ── A PHOTO IS CREDITED WHERE IT IS SHOWN ──────────────────────────
// Oliver, 8 Aug 2026: "remember to show credit to pictures on loading screen."
// Not a nicety: several of the Denmark-facts photos are Wikimedia files under
// CC BY or CC BY-SA, and those licences require attribution wherever the image
// APPEARS. That screen shows one full size for a minute at a time and credited
// nobody.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const card = app.slice(app.indexOf("src={fact.photo}"), app.indexOf("src={fact.photo}") + 1800);
  ok("the loading card credits its photo", /<PhotoCredit\s+photo={fact\.photo}/.test(card));
  ok("and PhotoCredit is actually imported", /^import \{ PhotoCredit \} from/m.test(app));
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) { fails.forEach(f => console.log("  FAIL " + f + "\n")); process.exit(1); }
