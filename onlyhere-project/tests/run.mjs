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
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripNonCode, functionBody, useBeforeDeclare, namedFunctions, hookDepsBeforeDeclaration } from "./tdz.mjs";

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
  export { PARTS, PART_ANCHORS, RESOLVED_PARTS, RESOLVED_SHAPE_INDEXES, partOfCountry, partsPresent, unplaced, matchesSearch, fold, pointInPoly, MAX_OFFSHORE_KM } from ${JSON.stringify(join(root, "src/utils/geography.js"))};
  export { PLACE_THEMES, THEME_LABEL, THEME_EMOJI, cleanThemes, themesOf, hasTheme, themesPresent, tierOf, tierLabel, MAX_THEMES } from ${JSON.stringify(join(root, "src/utils/placeThemes.js"))};
  export { travelLabel, isAtTravelOrigin, dotJoin } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
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
  export { licenseIsUsable, distinctiveToken, mentionsSubject } from ${JSON.stringify(join(root, "api/commons-photo.js"))};
  export { testTravelerLine } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { resolveStopCoordsDetailed, legDistanceKm, townInName, townKeyFor } from ${JSON.stringify(join(root, "src/utils/guideEnrichment.js"))};
  export { checkPlan, titlePromises, MAX_DAY_KM } from ${JSON.stringify(join(root, "src/utils/planGate.js"))};
  export { stopKind, tripScaleLine, tripCharacter, bookingActions } from ${JSON.stringify(join(root, "src/utils/guideReading.js"))};
  export { stripDashes, stripDashesDeep } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { routeTowns, countStops, orderedStops, shareSummary, shareMessage, shareTitle, metaDescription, hasMeasuredTravel, escapeHtml } from ${JSON.stringify(join(root, "src/utils/share.js"))};
  export { buildPreviewHtml, injectMeta, isCrawler, guideIdFromPath } from ${JSON.stringify(join(root, "src/utils/linkPreview.js"))};
  export { SITE_ORIGIN } from ${JSON.stringify(join(root, "src/config.js"))};
  export { placeKindOf, kindLabel, isArea, baseTownFor, relationLine, collapseToParent, areasInside, dayTripsFrom, PLACE_KINDS } from ${JSON.stringify(join(root, "src/utils/placeKind.js"))};
  export { SWEEP_INTENT, SWEEP_PROMPT } from ${JSON.stringify(join(root, "src/utils/correction.js"))};
  export { SWEEPS, sweepById, selectRows, applyCap, knownPlacesFor, parentheticalHint, deterministicTaxonomy, quoteIsInEntry, entryText, cleanPatch, looksLikePlaceName, dropSelfReferences, applySweepPatch, buildSnapshot, readSnapshot, snapshotFilename, proposeSweep, parseLooseFields, MARKS, weakestMark, openFields } from ${JSON.stringify(join(root, "src/utils/sweeps.js"))};
  export { shapeForLive } from ${JSON.stringify(join(root, "src/utils/studioContent.js"))};
  export { costContradictions, pricesIn, priceForNoun } from ${JSON.stringify(join(root, "src/utils/entryAudit.js"))};
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
  // THE FIXTURE HAS TO CONTAIN A "<". The old one was `Bornholm & the "smoked"
  // east` — no angle bracket anywhere in it, so this regex could not match no
  // matter how broken the escaping was. Verified: gutting escapeHtml to the
  // identity function left the assertion green.
  const hostile = buildPreviewHtml({ guide: { ...guide, title: `5 < 6 days <script>alert(1)</script>` }, url: "u", image: "i" });
  ok("a title cannot break out of the attribute", !/content="[^"]*<[^"]*"/.test(hostile));
  ok("nor close it early", !/content="[^"]*"[^"\/>]*"/.test(hostile));
  ok("and the escaped form is what ships", /content="5 &lt; 6 days &lt;script&gt;/.test(hostile));

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
   "TelegramBot/1.0",
   "Mozilla/5.0 (compatible; TwitterBot/1.0)",
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
  // existsSync on a DIRECTORY is true, so a deleted og:image tag made img
  // undefined, the path collapse to public/ itself, and this pass.
  ok("and it is a real file in public/", !!img && img.startsWith(SITE_ORIGIN + "/") && statSync(join(root, "public", img.slice(SITE_ORIGIN.length + 1)), { throwIfNoEntry: false })?.isFile() === true);
  ok("index.html has a description", /name="description" content="[^"]{40,}"/.test(html));
  ok("and a large twitter card", /name="twitter:card" content="summary_large_image"/.test(html));

  // ── THE HOBBY PLAN'S TWELVE ─────────────────────────────────────
  // This shipped as api/guide-preview.js and could not deploy at all:
  // "No more than 12 Serverless Functions can be added to a Deployment on the
  // Hobby plan." api/ held exactly 12 already. Edge Middleware does not count
  // against that limit, which is why the preview lives in middleware.js — but
  // the next person to add an api/ route deserves to find out here, in a second,
  // rather than from a failed deploy.
  const fns = existsSync(join(root, "api")) ? readdirSync(join(root, "api")).filter(f => /\.(js|ts|mjs)$/.test(f)) : [];
  // fns.length > 0 matters: an empty or missing api/ would otherwise satisfy
  // "<= 12" and read as a pass.
  ok(`api/ holds ${fns.length} functions, within the Hobby limit of 12`, fns.length > 0 && fns.length <= 12);
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
//           dependency array named a const declared 600 lines below it.
//   8 Aug — the GUIDE BUILD, dead on every run: "Cannot access 'qt' before
//           initialization", because reordering the pipeline left
//           enrichGuideDays(parsed.days, travelMode, mixedModes) above the two
//           consts it reads.
//
// TWO DIFFERENT INSTRUMENTS, because the two live in different kinds of scope.
// A plain function like generateGuide IS its own scope, so comparing positions
// inside it is exact. A React component is not: GemlyxApp's body is 558 KB of
// nested closures, and a callback on line 2333 reading a const declared on line
// 2401 is normal and safe, because it runs after both exist. Position-comparing
// there produced nine findings and zero bugs — and a check nobody believes is
// worse than none. A HOOK DEPENDENCY ARRAY is the exception: it is evaluated
// during render, in the body's own scope, which is exactly the 6 Aug bug, so it
// gets its own exact check that nothing nested can trip.
//
// JSX IS TRANSFORMED AWAY FIRST. The character walk lexes JavaScript, and JSX
// text is not JavaScript: `<div>Denmark's capital</div>` opened a single-quoted
// string that ran on for thousands of characters, and `</div>` looked like the
// start of a regex literal. Between them GemlyxApp's braces never balanced and
// the largest function in the file could not be extracted at all. esbuild is
// already required above, so the file is run through it first and the scan reads
// real JavaScript.
{
  const appPath = join(root, "src/App.jsx");
  const transformed = join(dir, "app.transformed.js");
  execFileSync(esbuild, [appPath, "--loader:.jsx=jsx", "--format=esm", `--outfile=${transformed}`], { stdio: "pipe" });
  const stripped = stripNonCode(readFileSync(transformed, "utf8"));
  const fns = namedFunctions(stripped);
  ok(`${fns.length} named functions discovered in App.jsx`, fns.length > 100);

  // The component itself, by the exact check.
  const component = functionBody(stripped, "function GemlyxApp(");
  ok("GemlyxApp's body can actually be extracted", !!component && component.length > 100000);
  is("no hook depends on a const declared later", hookDepsBeforeDeclaration(component).map(f => `${f.hook} reads ${f.name}`), []);

  // Every plain function, by position. The component is excluded by size for the
  // reason above; everything else is small enough that its body is its scope.
  const bad = [];
  let swept = 0;
  for (const [nm, decl] of fns) {
    const body = functionBody(stripped, decl);
    if (!body || body.length < 1200 || body.length > 200000) continue;
    swept++;
    useBeforeDeclare(body).forEach(f => bad.push(`${nm}(): reads ${f.name} on line ${f.useLine}, declared on line ${f.declLine}`));
    hookDepsBeforeDeclaration(body).forEach(f => bad.push(`${nm}(): ${f.hook} depends on ${f.name}, declared ${f.declLine - f.useLine} lines later`));
  }
  ok(`swept ${swept} functions in App.jsx for temporal dead zones`, swept >= 20);
  is("nothing reads a const before it is declared", bad, []);
  // generateGuide by name, because it is where the 8 Aug crash was and a
  // discovery regression must not quietly drop it.
  ok("generateGuide is among them", fns.some(([nm]) => nm === "generateGuide") && (functionBody(stripped, "const generateGuide = ") || "").length > 20000);
  // Same for a function with a defaulted parameter, which the first version of
  // functionBody truncated to its parameter list and then silently skipped.
  ok("so is a function with a defaulted parameter", (functionBody(stripped, "const fetchExactDurations = ") || "").length > 2000);

  // ── THE SCANNER, AGAINST BOTH SHAPES IT EXISTS FOR ───────────────
  const bodyOf = (src, d) => functionBody(stripNonCode(src), d);
  const rigged = `const f = async () => {\n  const a = one(b);\n  const b = 2;\n  return a;\n};`;
  is("it catches a plain one", useBeforeDeclare(bodyOf(rigged, "const f = ")).map(x => x.name), ["b"]);
  const hook = `function C() {\n  useEffect(() => { go(); }, [later]);\n  const later = 1;\n  return later;\n}`;
  is("and the 6 Aug hook shape", hookDepsBeforeDeclaration(bodyOf(hook, "function C(")).map(x => x.name), ["later"]);
  // A property KEY is not a read: setState({ fixed: 0 }) above a `const fixed`
  // was every false positive left after the parameter rule.
  const keys = `const f = async () => {\n  setState({ fixed: 0, failed: [] });\n  const fixed = 1; const failed = [];\n  return fixed;\n};`;
  is("a property key is not a read", useBeforeDeclare(bodyOf(keys, "const f = ")), []);
  // THE STRIPPER IS WHAT IS BEING TESTED HERE, so this fixture has to have a
  // real read INSIDE an interpolation and prose OUTSIDE it. The earlier version
  // asserted [] and passed against a stripper that blanked ${...} too — which
  // is the whole thing the character walk exists to avoid.
  const prose = ["const f = async () => {", "  const p = `plan the travelMode carefully ${travelMode}`;", "  const travelMode = 1;", "  return p;", "};"].join("\n");
  is("prose is ignored but ${…} is not", useBeforeDeclare(bodyOf(prose, "const f = ")).map(x => x.name), ["travelMode"]);
  // And JSX must survive both hazards that broke it on the real file.
  const jsx = `function C() {\n  const t = <div>Denmark's capital</div>;\n  useEffect(() => { go(); }, [later]);\n  const later = 1;\n  return t;\n}`;
  const jsxBody = bodyOf(execFileSync(esbuild, ["--loader=jsx", "--format=esm"], { input: jsx, encoding: "utf8" }), "function C(");
  ok("an apostrophe in JSX text does not swallow the body", !!jsxBody && jsxBody.length > 80);
  is("and the hook check still fires through it", hookDepsBeforeDeclaration(jsxBody).map(x => x.name), ["later"]);
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
  // ANCHORS ARE ASSERTED BEFORE THEY ARE USED. indexOf returns -1 when it misses,
  // slice(-1, -1) is "", and !/x/.test("") is true — so a JSX or prompt reformat
  // silently converts a real guard into a passing one. This suite has already
  // been bitten by an anchor that moved.
  ok("the town prompt anchor is found", prompts.indexOf("town: `") >= 0 && prompts.indexOf("festival: `") > prompts.indexOf("town: `"));
  const townPrompt = prompts.slice(prompts.indexOf("town: `"), prompts.indexOf("festival: `"));
  ok("the town prompt no longer asks for a station", !/nearestStation/.test(townPrompt));
  ok("but the festival prompt still does", /nearestStation/.test(prompts.slice(prompts.indexOf("festival: `"), prompts.indexOf("festival: `") + 9000)));

  const detail = readFileSync(join(root, "src/components/DetailPage.jsx"), "utf8");
  ok("the town glance anchor is found", detail.indexOf('{kind === "town" && (') >= 0);
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
  ok("the loading card anchor is found", app.indexOf("src={fact.photo}") >= 0);
  const card = app.slice(app.indexOf("src={fact.photo}"), app.indexOf("src={fact.photo}") + 2400);
  ok("the loading card credits its photo", /<PhotoCredit\s+photo={fact\.photo}/.test(card));
  ok("and PhotoCredit is actually imported", /^import \{ PhotoCredit \} from/m.test(app));
}


// ── NYHAVN IS NOT A TOWN ───────────────────────────────────────────
// Oliver, 8 Aug 2026: "Nyhavn is 'technically' a town, but it is within
// Copenhagen. How do we categorize this? Ticking Filters? Categories? What do we
// do?" — and then the part that decided the shape: "There are also villages in
// the 'towns' that are under other towns you know.."
//
// His TOWN_COORDS held three different relationships under one label: Nyhavn
// (inside Copenhagen), "Nørresundby (Aalborg)" (a district, with the
// relationship stuffed into the NAME STRING where nothing can query it), and
// Dragør (its own municipality, twelve kilometres out). Filters cannot fix that,
// because you cannot tick a filter that is not backed by a field.
{
  const { placeKindOf, kindLabel, isArea, baseTownFor, relationLine, collapseToParent, areasInside, dayTripsFrom } = M;
  const nyhavn = { name: "Nyhavn", partOf: "Copenhagen" };
  const cph = { name: "Copenhagen", isMajorCity: true };
  const dragoer = { name: "Dragør", dayTripFrom: "Copenhagen" };
  const soenderho = { name: "Sønderho", placeKind: "village", dayTripFrom: "Nordby" };
  const plain = { name: "Ærøskøbing" };

  is("a place inside another is an area", placeKindOf(nyhavn), "area");
  is("isMajorCity still means city", placeKindOf(cph), "city");
  is("a stated village is a village", placeKindOf(soenderho), "village");
  is("a day trip is still its own town", placeKindOf(dragoer), "town");
  is("and anything unmarked is a town", placeKindOf(plain), "town");
  is("a stated kind wins over inference", placeKindOf({ partOf: "Copenhagen", placeKind: "town" }), "town");
  is("nonsense in the field is ignored", placeKindOf({ placeKind: "hamlet" }), "town");

  // NEVER GUESSED. A place is a village only because somebody said so — and the
  // one thing a traveller uses that word to decide is whether there is anywhere
  // to eat.
  is("smallness is not inferred from a name", placeKindOf({ name: "Thorup Strand" }), "town");

  is("only areas are areas", [nyhavn, cph, dragoer, soenderho, plain].filter(isArea).map(t => t.name), ["Nyhavn"]);
  is("labels read plainly", [cph, plain, soenderho, nyhavn].map(kindLabel), ["City", "Town", "Village", "Area"]);

  // partOf wins for "where do I sleep": if this is a district of Copenhagen then
  // Copenhagen is the answer whatever else the entry says.
  is("a district sleeps in its parent", baseTownFor(nyhavn), "Copenhagen");
  is("a village sleeps in its base", baseTownFor(soenderho), "Nordby");
  is("and a real town sleeps in itself", baseTownFor(plain), null);
  is("partOf beats dayTripFrom", baseTownFor({ partOf: "Aalborg", dayTripFrom: "Aarhus" }), "Aalborg");

  // TWO DIFFERENT SENTENCES. "Inside Copenhagen" and "base yourself in Nordby"
  // are not the same fact, and running them together is how somebody ends up
  // looking for a hotel in a canal.
  is("an area says inside", relationLine(nyhavn), { label: "Inside", value: "Copenhagen" });
  is("a village says where to stay", relationLine(soenderho), { label: "Where to base yourself", value: "Nordby" });
  is("and a town says nothing at all", relationLine(plain), null);

  // ── ONLY AN AREA COLLAPSES ──────────────────────────────────────
  // A route through Copenhagen and Nyhavn visits ONE town. A route through
  // Nordby and Sønderho visits TWO, even though you sleep in one of them,
  // because Sønderho is genuinely somewhere else. Counting them the same way
  // either inflates the trip or hides a real stop, and both go out in a share
  // message where they cannot be corrected.
  const all = [nyhavn, cph, dragoer, soenderho, plain];
  const lookup = (n) => all.find(t => t.name.toLowerCase() === String(n).toLowerCase()) || null;
  is("a district resolves to its parent", collapseToParent("Nyhavn", lookup), "Copenhagen");
  is("a village does NOT", collapseToParent("Sønderho", lookup), "Sønderho");
  is("nor does a day trip", collapseToParent("Dragør", lookup), "Dragør");
  is("an unknown name is returned as given", collapseToParent("Nowhere", lookup), "Nowhere");
  // With nothing to resolve against, the honest answer is the name itself.
  is("no lookup means no guessing", collapseToParent("Nyhavn"), "Nyhavn");

  // The reverse lists, which are what the parent's own page is built from.
  is("Copenhagen contains Nyhavn", areasInside("Copenhagen", all).map(t => t.name), ["Nyhavn"]);
  is("and Dragør is a trip from it", dayTripsFrom("Copenhagen", all).map(t => t.name), ["Dragør"]);
  is("matching ignores case", areasInside("COPENHAGEN", all).map(t => t.name), ["Nyhavn"]);
  is("a place inside somewhere is not also a day trip to it", dayTripsFrom("Copenhagen", [{ name: "X", partOf: "Copenhagen", dayTripFrom: "Copenhagen" }]), []);
  is("nothing published means empty, not a crash", areasInside("Copenhagen", null), []);

  // Both halves wired: the field has to exist in the draft schema or nothing can
  // ever carry it.
  const prompts = readFileSync(join(root, "src/utils/studioPrompts.js"), "utf8");
  const townPrompt = prompts.slice(prompts.indexOf("town: `"), prompts.indexOf("festival: `"));
  ok("the town prompt asks for placeKind", /"placeKind"/.test(townPrompt));
  ok("and partOf", /"partOf"/.test(townPrompt));
  ok("and dayTripFrom", /"dayTripFrom"/.test(townPrompt));
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("and the publish template carries all three", /placeKind: \$\{J\(t\.placeKind[\s\S]{0,120}partOf: \$\{J\(t\.partOf[\s\S]{0,120}dayTripFrom: \$\{J\(t\.dayTripFrom/.test(app));
  // EXACT, not a floor: >= 2 let one of the three call sites be deleted with the
  // test still green.
  is("areas are kept out of both peer town grids", (app.match(/!isArea\(t\)/g) || []).length, 3);
  ok("and the publish path carries the fields into Supabase", /placeKind: t\.placeKind[\s\S]{0,120}partOf: t\.partOf[\s\S]{0,120}dayTripFrom: t\.dayTripFrom/.test(readFileSync(join(root, "src/utils/studioContent.js"), "utf8")));

  // A row that does not apply is null, and almost no town has a relationship, so
  // this crashed every town page: "Cannot read properties of null (reading
  // 'value')".
  const glance = readFileSync(join(root, "src/components/AtAGlanceCard.jsx"), "utf8");
  ok("AtAGlanceCard tolerates a null row", /filter\(r => r && r\.value\)/.test(glance));
}

// ── A SMALL CHANGE, APPLIED TO MANY ROWS ───────────────────────────
// Oliver, 8 Aug 2026: "is there a possibility we can create something where we
// just add on these minor changes to all of them?"
//
// Every assertion in this block was checked by breaking the thing it guards and
// watching it go red, because this suite has already shipped six assertions
// that could not fail and they all looked exactly like these do. Where a line
// could NOT be isolated by a mutation it says so in a comment rather than
// pretending, which is the same rule.
{
  const { SWEEPS, sweepById, selectRows, applyCap, knownPlacesFor, parentheticalHint, deterministicTaxonomy,
          quoteIsInEntry, cleanPatch, looksLikePlaceName, dropSelfReferences, applySweepPatch, buildSnapshot,
          readSnapshot, proposeSweep, parseLooseFields, MARKS, weakestMark, openFields, shapeForLive } = M;

  // ── THE RULE THAT STOPS THIS BECOMING BUG #2 AGAIN ───────────────
  // Publishing an edit bypasses shapeForLive, so a sweep can write a field the
  // allow-list omits: it saves, it renders, and it is silently thrown away the
  // next time that row is redrafted. Asserted against the REAL shapeForLive
  // output rather than a copy of the field list, because a copy drifts.
  for (const sweep of SWEEPS) {
    for (const type of sweep.types) {
      const shapedKeys = Object.keys(shapeForLive(type, { name: "X" }) || {});
      ok(`sweep "${sweep.id}" writes nothing shapeForLive would drop from a ${type}`,
         sweep.fields.every(f => shapedKeys.includes(f)));
    }
  }
  ok("...and that check can fail", !Object.keys(shapeForLive("town", { name: "X" })).includes("inventedField"));
  ok("no sweep may ever declare the audit trail writable", SWEEPS.every(s => !s.fields.includes("__corrections")));

  // ── selection ────────────────────────────────────────────────────
  const rows = [
    { id: 1, type: "town", payload: { name: "Copenhagen", isMajorCity: true } },
    { id: 2, type: "town", payload: { name: "Nyhavn" } },
    { id: 3, type: "town", payload: { name: "Ribe", placeKind: "town" } },
    { id: 4, type: "festival", payload: { name: "Roskilde Festival" } },
    { id: 5, type: "town", payload: {} },
    { id: 6, type: "town", payload: { name: "Aalborg" } },
    { id: 7, type: "town", payload: { name: "Samsø" } },
  ];
  const tax = sweepById("taxonomy");
  is("only the right type is selected", selectRows(rows, tax).map(r => r.id), [1, 2, 6, 7]);
  is("a row that already has the field is left alone", selectRows(rows, tax).some(r => r.id === 3), false);
  is("a payload with no name is not a row we can work on", selectRows(rows, tax).some(r => r.id === 5), false);
  is("no sweep means no rows", selectRows(rows, null), []);

  // ── what counts as a place a relationship may name ───────────────
  // Built from the sweep's OWN types, so a festival cannot become a town's
  // parent, and it keeps each entry's real spelling.
  const places = knownPlacesFor(rows, tax);
  is("only places of the swept type count", [...places.values()].sort(), ["Aalborg", "Copenhagen", "Nyhavn", "Ribe", "Samsø"]);
  ok("a festival is not a place a town can be inside", !places.has("roskilde festival"));
  is("lookup is case-insensitive but the spelling is theirs", places.get("aalborg"), "Aalborg");

  // ── NO SILENT CAPS ───────────────────────────────────────────────
  is("under the cap nothing is skipped", applyCap([1, 2, 3], 40), { batch: [1, 2, 3], skipped: 0 });
  is("over it, the number dropped is RETURNED", applyCap([1, 2, 3, 4, 5], 3), { batch: [1, 2, 3], skipped: 2 });
  is("and the two always account for the whole list", applyCap([1, 2, 3, 4, 5], 3).batch.length + applyCap([1, 2, 3, 4, 5], 3).skipped, 5);
  // A fractional cap used to report "2.5 more were not looked at".
  is("a fractional cap still accounts for every row", applyCap([1, 2, 3, 4, 5], 2.5).batch.length + applyCap([1, 2, 3, 4, 5], 2.5).skipped, 5);

  // ── tier 1: derived, never guessed ───────────────────────────────
  is("isMajorCity means city", deterministicTaxonomy({ name: "Copenhagen", isMajorCity: true }, places).patch, { placeKind: "city" });
  is("a stated partOf means area", deterministicTaxonomy({ name: "Nyhavn", partOf: "Copenhagen" }, places).patch, { placeKind: "area" });
  is("a small-sounding name derives NOTHING", deterministicTaxonomy({ name: "Sønderho" }, places), null);

  // ── WHAT A PARENTHETICAL IS NOT ──────────────────────────────────
  // "Nørresundby (Aalborg)" is a district inside a city. "Ballen (Samsø)" is a
  // village ON an island. They are written identically, and partOf is the one
  // relationship that COLLAPSES route counting, so guessing wrong quietly loses
  // a town out of a shared trip. The bracket is a place to LOOK, not evidence.
  is("a parenthetical never becomes a parent on its own", deterministicTaxonomy({ name: "Nørresundby (Aalborg)" }, places).patch, null);
  is("not even for the island case that made this rule", deterministicTaxonomy({ name: "Ballen (Samsø)" }, places).patch, null);
  ok("it is reported so the entry can settle it", deterministicTaxonomy({ name: "Nørresundby (Aalborg)" }, places).notes.some(n => /related but not how/.test(n)));
  ok("and the rename is flagged as its own job", deterministicTaxonomy({ name: "Nørresundby (Aalborg)" }, places).notes.some(n => /photo path is slugified/.test(n)));
  ok("the sweep never renames anything itself", !("name" in (deterministicTaxonomy({ name: "Nørresundby (Aalborg)" }, places).patch || {})));

  // The hint itself, which is what tier 2 is told to check.
  is("a bracket naming a published place is a hint", parentheticalHint({ name: "Nørresundby (Aalborg)" }, places), { bare: "Nørresundby", parent: "Aalborg" });
  is("a bracket naming nothing published is not", parentheticalHint({ name: "Ribe (Jutland)" }, places), null);
  is("nor is a bracket repeating the name", parentheticalHint({ name: "Aalborg (Aalborg)" }, places), null);
  is("nor a year", parentheticalHint({ name: "Sankt Hans (2026)" }, places), null);
  is("an unbalanced bracket is not parsed", parentheticalHint({ name: "Sankt Hans (Copenhagen" }, places), null);
  is("nor a nested one", parentheticalHint({ name: "Foo (Bar (Aalborg))" }, places), null);
  is("a name that is only a bracket is not", parentheticalHint({ name: "(Aalborg)" }, places), null);
  is("a plain name with a full stop is not", parentheticalHint({ name: "Nykøbing F." }, places), null);
  // The parent is written in the PUBLISHED entry's spelling, never the bracket's.
  is("case comes from the published entry", parentheticalHint({ name: "X (aalborg)" }, places).parent, "Aalborg");

  // ── tier 2: the quote is the whole point ─────────────────────────
  const nyhavn = { name: "Nyhavn", desc: "The painted houses along the old canal in central Copenhagen, packed from noon.", blogBody: [{ type: "paragraph", content: "Walk down from Kongens Nytorv and it is five minutes." }] };
  ok("a quote that is really in the entry counts", quoteIsInEntry(nyhavn, "the old canal in central Copenhagen"));
  ok("line wrapping and case do not break it", quoteIsInEntry(nyhavn, "The Old   Canal\nin Central Copenhagen"));
  ok("a quote in a nested body block counts too", quoteIsInEntry(nyhavn, "Walk down from Kongens Nytorv"));
  ok("a quote that is NOT in the entry is refused", !quoteIsInEntry(nyhavn, "Nyhavn is a district of Copenhagen municipality"));
  ok("a quote too short to prove anything is refused", !quoteIsInEntry(nyhavn, "canal"));
  ok("no quote at all is refused", !quoteIsInEntry(nyhavn, null));

  // ── WHAT COUNTS AS "THE ENTRY" ───────────────────────────────────
  // __corrections is the log of things that were WRONG. uncertainties is the
  // list of things nobody could confirm. Both live inside the payload, and
  // quoting either passes a naive check while citing, literally, a claim
  // recorded because it was false.
  const corrected = {
    name: "Dragør",
    desc: "A cobbled harbour village of yellow houses at the edge of the airport approach.",
    photo: "/towns/dragor-by-the-water.jpg",
    mapHint: "Dragør, Denmark and nowhere else",
    uncertainties: ["Whether Dragør is administratively part of Copenhagen is unconfirmed"],
    __corrections: [{ at: "2026-08-01", field: "partOf", was: "Dragør is a district of Copenhagen", source: "x" }],
  };
  ok("a quote from the error log is refused", !quoteIsInEntry(corrected, "Dragør is a district of Copenhagen"));
  ok("a quote from the unconfirmed list is refused", !quoteIsInEntry(corrected, "is administratively part of Copenhagen is unconfirmed"));
  ok("a quote of the photo path is refused", !quoteIsInEntry(corrected, "/towns/dragor-by-the-water.jpg"));
  ok("a quote of the map hint is refused", !quoteIsInEntry(corrected, "Dragør, Denmark and nowhere else"));
  // Assembled out of the seam between two fields, so it exists in neither.
  ok("a quote spanning two fields is refused", !quoteIsInEntry({ a: "the edge of the airport", b: "approach and the sea" }, "the edge of the airport approach and the sea"));
  ok("even when the fields are adjacent in the payload", !quoteIsInEntry({ desc: "yellow houses by the harbour", highlight: "and a long walk out to the fort" }, "yellow houses by the harbour and a long walk out to the fort"));
  ok("but real prose still passes", quoteIsInEntry(corrected, "A cobbled harbour village of yellow houses"));

  // ── only real values survive ─────────────────────────────────────
  is("an empty answer is not an answer", cleanPatch({ placeKind: "  ", partOf: "" }, ["placeKind", "partOf"], places), {});
  is("a model's idea of null is not a value", cleanPatch({ placeKind: "unknown", partOf: "N/A" }, ["placeKind", "partOf"], places), {});
  // dayTripFrom is the ONLY field with no second guard behind it: it takes any
  // place-name-shaped string, published or not, and "unknown" is exactly the
  // word RESEARCH_PROMPT tells the model to use. Without this line it lands on
  // a published page as "Where to base yourself: unknown".
  is("and 'unknown' is the word the research prompt ASKS for", Object.keys(cleanPatch({ dayTripFrom: "unknown" }, ["dayTripFrom"], places)), []);
  is("so are none and nothing", Object.keys(cleanPatch({ dayTripFrom: "None" }, ["dayTripFrom"], places)).concat(Object.keys(cleanPatch({ dayTripFrom: "nothing" }, ["dayTripFrom"], places))), []);
  is("a placeKind outside the four kinds is dropped", cleanPatch({ placeKind: "hamlet" }, ["placeKind"], places), {});
  is("a real one is kept, lowercased", cleanPatch({ placeKind: "Village" }, ["placeKind"], places), { placeKind: "village" });
  is("a field the sweep did not declare never appears", cleanPatch({ placeKind: "town", desc: "new prose" }, ["placeKind"], places), { placeKind: "town" });

  // A REAL PERPLEXITY REPLY. It answers in prose however it is asked, and this
  // exact string would have rendered as "Inside None, it is not inside a larger
  // place" on the published page.
  is("a relationship written as a sentence is not a place",
     cleanPatch({ partOf: "None, it is not inside a larger place", dayTripFrom: "Nordby" }, ["partOf", "dayTripFrom"], places), { dayTripFrom: "Nordby" });
  is("nor is a polite refusal", cleanPatch({ partOf: "not applicable" }, ["partOf"], places), {});
  ok("a place name is a place name", looksLikePlaceName("Nørresundby") && looksLikePlaceName("Sankt Hans Torv"));
  ok("a sentence is not", !looksLikePlaceName("None, it is not inside a larger place"));
  ok("nor is anything with a number in it", !looksLikePlaceName("Region 5"));
  ok("nor a paragraph", !looksLikePlaceName("A".repeat(60)));

  // partOf COLLAPSES route counting and drives areasInside, both matched on the
  // stored name, so a parent Gemlyx does not publish is a dead line on the page
  // AND a lost stop in a shared trip. This is the real Copenhagen answer.
  // KEYS, not the object: `is()` compares JSON, and JSON.stringify drops an
  // undefined value, so a guard writing `undefined` instead of dropping the key
  // looked exactly like one that worked.
  is("a parent nobody publishes is refused", Object.keys(cleanPatch({ partOf: "Capital Region of Denmark" }, ["partOf"], places)), []);
  is("and it is DROPPED, not written as undefined", Object.keys(cleanPatch({ partOf: "Nowhere At All" }, ["partOf"], places)).length, 0);
  is("a published one is kept, in its own spelling", cleanPatch({ partOf: "copenhagen" }, ["partOf"], places), { partOf: "Copenhagen" });
  is("with no known places at all, no parent can be trusted", Object.keys(cleanPatch({ partOf: "Copenhagen" }, ["partOf"], undefined)), []);
  // dayTripFrom renders as plain text, so somewhere unpublished is still useful.
  is("a base town nobody publishes is still an answer", cleanPatch({ dayTripFrom: "Nordby" }, ["dayTripFrom"], places), { dayTripFrom: "Nordby" });
  // ...but it still has to be a NAME. This field takes anything published or
  // not, so the shape check is the only thing standing in front of it.
  is("a base written as a sentence is not", Object.keys(cleanPatch({ dayTripFrom: "Nordby, but only in summer when the ferry runs" }, ["dayTripFrom"], places)), []);

  // "[object Object]" reached a published field before this line existed.
  is("a nested answer is not a string and is dropped", cleanPatch({ partOf: { name: "Copenhagen" } }, ["partOf"], places), {});
  is("nor is an array of them", cleanPatch({ partOf: ["Copenhagen", "Aalborg"] }, ["partOf"], places), {});
  is("nor a boolean", Object.keys(cleanPatch({ partOf: true }, ["partOf"], places)), []);
  // ["village"] stringifies to "village", which passes the enum check. The type
  // check is the only thing that catches it.
  is("nor a placeKind arriving as an array", Object.keys(cleanPatch({ placeKind: ["village"] }, ["placeKind"], places)), []);

  is("nowhere is inside itself", dropSelfReferences({ partOf: "Ribe", dayTripFrom: "Ribe" }, "Ribe"), {});
  is("nor is it a day trip from itself, whatever the case", dropSelfReferences({ dayTripFrom: "RIBE" }, "Ribe"), {});
  is("a real relationship survives", dropSelfReferences({ partOf: "Copenhagen" }, "Nyhavn"), { partOf: "Copenhagen" });

  // ── a field can be settled without being filled ──────────────────
  is("a city needs no parent and no base", openFields(tax, { name: "Copenhagen" }, { placeKind: "city" }), []);
  is("an area with a parent already says where you sleep", openFields(tax, { name: "Nyhavn" }, { placeKind: "area", partOf: "Copenhagen" }), []);
  // The first version closed dayTripFrom on the KIND alone, so an entry that
  // came back "area" without a parent was never asked where to sleep and ended
  // up with neither, in no peer grid and under nobody's heading.
  is("an area with NO parent still needs both", openFields(tax, { name: "X" }, { placeKind: "area" }), ["partOf", "dayTripFrom"]);
  is("a village still needs a base", openFields(tax, { name: "Sønderho" }, { placeKind: "village" }), ["partOf", "dayTripFrom"]);
  is("a field already stored is not open", openFields(tax, { name: "X", placeKind: "town", partOf: "Y", dayTripFrom: "Z" }, {}), []);

  // ── the scope lock ───────────────────────────────────────────────
  const before = { name: "Nyhavn", desc: "original prose", placeKind: "" };
  const out = applySweepPatch(before, { placeKind: "area", desc: "REWRITTEN" }, tax, { at: "2026-08-08" });
  is("the declared field is written", out.patched.placeKind, "area");
  is("a field outside the scope is put BACK", out.patched.desc, "original prose");
  is("and the attempt is reported, not swallowed", out.reverted, ["desc"]);
  is("only what really changed is listed as changed", out.changed, ["placeKind"]);
  is("the audit trail records where it came from", out.patched.__corrections.map(c => [c.field, c.source]), [["placeKind", "sweep: taxonomy"]]);
  is("and what it was before", out.patched.__corrections[0].was, "(empty)");
  is("a stored null reads as empty, not as the word null", applySweepPatch({ placeKind: null }, { placeKind: "town" }, tax, {}).patched.__corrections[0].was, "(empty)");
  const forged = applySweepPatch({ name: "X", placeKind: "", __corrections: [{ at: "old", field: "desc", was: "x", source: "real" }] },
                                 { placeKind: "town", __corrections: [{ at: "forged", field: "everything", was: "", source: "trust me" }] }, tax, { at: "2026-08-08" });
  is("a resolver cannot write its own history", forged.patched.__corrections.map(c => c.source), ["real", "sweep: taxonomy"]);
  is("the trail keeps what was really there and adds only this run", forged.patched.__corrections.length, 2);
  ok("and the forged entry is nowhere in it", !JSON.stringify(forged.patched.__corrections).includes("trust me"));
  const noop = applySweepPatch({ name: "X", placeKind: "town" }, { placeKind: "town" }, tax, { at: "2026-08-08" });
  is("an unchanged row gets no entry in the trail", noop.changed, []);
  ok("and its payload is returned untouched", !("__corrections" in noop.patched));

  // ── snapshots, which gate everything else ────────────────────────
  const snapRows = [
    { id: 7, type: "town", payload: { name: "Ribe", placeKind: "town", nested: { a: [1, 2] } } },
    { id: 8, type: "town", payload: { name: "Dragør" } },
  ];
  const snap = buildSnapshot("taxonomy", snapRows, "2026-08-08T14:22:00Z");
  const round = readSnapshot(JSON.stringify(snap));
  is("a snapshot round-trips byte for byte", round.rows, snapRows);
  is("and remembers which sweep it belongs to", round.sweep, "taxonomy");
  const refuses = (label, input, pattern) => {
    let msg = "";
    try { readSnapshot(input); } catch (e) { msg = e.message; }
    ok(label, pattern.test(msg));
  };
  refuses("a file that is not JSON is refused loudly", "not json at all", /not valid JSON/);
  refuses("and so is a file that is not a Gemlyx snapshot", JSON.stringify({ rows: [] }), /not a Gemlyx snapshot/);
  refuses("a row with no id is refused rather than skipped", JSON.stringify({ gemlyxSnapshot: 1, rows: [{ id: 1, payload: {} }, { type: "town" }] }), /Row 2 /);
  // The id is interpolated straight into a PostgREST filter. Number.isFinite
  // says yes to null, "", false and [], all of which coerce to 0, and the
  // restore then PATCHed `?id=eq.null` on every row.
  refuses("a null id is refused", JSON.stringify({ gemlyxSnapshot: 1, rows: [{ id: null, payload: {} }] }), /Row 1 /);
  refuses("a boolean id is refused", JSON.stringify({ gemlyxSnapshot: 1, rows: [{ id: true, payload: {} }] }), /Row 1 /);
  refuses("an array id is refused", JSON.stringify({ gemlyxSnapshot: 1, rows: [{ id: [5], payload: {} }] }), /Row 1 /);
  refuses("a non-numeric id is refused", JSON.stringify({ gemlyxSnapshot: 1, rows: [{ id: "12abc", payload: {} }] }), /Row 1 /);
  refuses("an array where a payload should be is refused", JSON.stringify({ gemlyxSnapshot: 1, rows: [{ id: 5, payload: [] }] }), /Row 1 /);
  is("a numeric string id is fine, because that is what PostgREST returns", readSnapshot(JSON.stringify({ gemlyxSnapshot: 1, rows: [{ id: "12", payload: { a: 1 } }] })).rows[0].id, "12");

  // ── provenance is per VALUE, not per row ─────────────────────────
  is("a row is only as trustworthy as its weakest value", weakestMark([MARKS.deterministic, MARKS.research]), MARKS.research);
  is("all read from the entry reads as read from the entry", weakestMark([MARKS.entry, MARKS.entry]), MARKS.entry);
  is("nothing at all is unresolved", weakestMark([]), MARKS.unresolved);

  // ── the orchestrator writes nothing, and escalates properly ──────
  const calls = [];
  const askClaude = async (prompt) => {
    calls.push("claude");
    if (/Nyhavn/.test(prompt)) return { text: JSON.stringify({ placeKind: "area", partOf: "Copenhagen", quote: "the old canal in central Copenhagen", evidence: "the description" }) };
    return { text: JSON.stringify({ placeKind: "village", quote: "Sønderho is a village of about 300 people", evidence: "general knowledge" }) };
  };
  const askPerplexity = async () => { calls.push("perplexity"); return { text: "placeKind: village\ndayTripFrom: Nordby", citations: ["https://example.dk/fano"] }; };
  const soenderho = { name: "Sønderho", desc: "Thatched roofs and a long beach on the south end of the island." };

  const props = await proposeSweep({
    sweep: tax,
    rows: [{ id: 1, type: "town", payload: { name: "Copenhagen", isMajorCity: true } },
           { id: 2, type: "town", payload: nyhavn },
           { id: 3, type: "town", payload: soenderho }],
    knownPlaces: places,
    deps: { askClaude, askPerplexity, parseJSON: (t) => JSON.parse(t) },
  });

  is("a row answered in code never reaches a model", props[0].mark, MARKS.deterministic);
  // A CITY IS NOBODY'S DISTRICT, so Copenhagen never reaches a model at all.
  is("and it costs nothing", calls.filter(c => c === "claude").length, 2);
  is("a row answered from the entry is marked as read, not researched", props[1].mark, MARKS.entry);
  is("and carries the value", props[1].patch, { placeKind: "area", partOf: "Copenhagen" });
  // THE ONE THAT MATTERS: an answer whose quote is not in the entry is thrown
  // away and escalated, not written.
  is("an answer from the model's own memory is refused", props[2].patch, { placeKind: "village", dayTripFrom: "Nordby" });
  ok("and it is reported as having happened", props[2].notes.some(n => /without a quote that is actually in the entry/.test(n)));
  is("the researched values are marked as researched, per field", props[2].detail.map(d => [d.field, d.mark]), [["placeKind", MARKS.research], ["dayTripFrom", MARKS.research]]);
  is("with its source", props[2].detail[0].sourceUrl, "https://example.dk/fano");
  is("the entry tier is tried before the paid one", calls, ["claude", "claude", "perplexity"]);
  is("a partOf found in the entry closes dayTripFrom without paying for it", calls.filter(c => c === "perplexity").length, 1);
  ok("nothing is pre-ticked that could not be answered", props.every(p => p.accepted === (p.detail.length > 0)));

  // A row whose values come from two different tiers must not wear one mark:
  // a green tick with a verbatim quote next to a value the entry never
  // contained is a lie told exactly when he is deciding whether to accept it.
  const mixed = await proposeSweep({
    sweep: tax, rows: [{ id: 11, type: "town", payload: soenderho }], knownPlaces: places,
    deps: {
      askClaude: async () => ({ text: JSON.stringify({ placeKind: "village", quote: "Thatched roofs and a long beach", evidence: "the description" }) }),
      askPerplexity: async () => ({ text: "dayTripFrom: Nordby", citations: [] }),
      parseJSON: (t) => JSON.parse(t),
    },
  });
  is("each value keeps its own provenance", mixed[0].detail.map(d => [d.field, d.mark]), [["placeKind", MARKS.entry], ["dayTripFrom", MARKS.research]]);
  is("and the row wears the weaker of the two", mixed[0].mark, MARKS.research);

  // Nothing settled it: left alone, reported, and NOT written as "".
  const quiet = await proposeSweep({
    sweep: tax, rows: [{ id: 9, type: "town", payload: { name: "Nowhere" } }], knownPlaces: places,
    deps: { askClaude: async () => ({ text: '{"placeKind": null, "quote": null}' }), askPerplexity: async () => ({ text: "placeKind: unknown" }), parseJSON: (t) => JSON.parse(t) },
  });
  is("an unanswerable row proposes nothing", quiet[0].patch, {});
  is("is marked unresolved", quiet[0].mark, MARKS.unresolved);
  is("and is not ticked", quiet[0].accepted, false);

  // Stopping means stopping. A run left going after the panel says it stopped
  // keeps paying for rows nobody is going to look at.
  let seen = 0;
  const stopped = await proposeSweep({
    sweep: tax, rows: [1, 2, 3, 4].map(id => ({ id, type: "town", payload: { name: `T${id}` } })), knownPlaces: places,
    deps: { askClaude: async () => { seen++; return { text: "{}" }; }, askPerplexity: async () => ({ text: "" }), parseJSON: (t) => JSON.parse(t), isCancelled: () => seen >= 2 },
  });
  is("a cancelled run stops reading rows", stopped.length, 2);

  // ── THE DOOR THAT DECIDES BETWEEN ONE ROW AND A COLUMN ───────────
  const { routeMessage, SWEEP_PROMPT } = M;
  is("a set is a sweep", routeMessage("every town that is inside a bigger city should say so"), "sweep");
  is("so is 'all of them'", routeMessage("can you set the place kind on all of them"), "sweep");
  is("and 'all the published entries'", routeMessage("fix the place kind on all the published entries"), "sweep");
  is("and 'them all'", routeMessage("I want to add partOf to them all"), "sweep");
  is("one entry being wrong is still a correction", routeMessage("the station is wrong, it should be Aarhus H"), "correct");
  is("a rewrite of the open draft is still an edit", routeMessage("rewrite the intro so it is less like an advert"), "edit");
  is("asking which need work is still an audit", routeMessage("which ones need a redraft"), "audit");
  is("a plain question is still a question", routeMessage("why does this say the ferry is required?"), "ask");
  is("an empty message still answers", routeMessage(""), "ask");
  // "all" ON ITS OWN IS NOT A SET. He says "this is all wrong" about ONE entry
  // constantly, and routing that to a bulk pass would put a fact about one town
  // in front of him as a column-wide proposal.
  is("'all wrong' about one entry is a correction", routeMessage("this is all wrong, the station should be Aarhus H"), "correct");
  is("'all of it' about one entry is too", routeMessage("all of it reads like an advert, rewrite it"), "edit");
  is("naming a set needs a plural to name", routeMessage("check all the information again"), "ask");
  const sp = SWEEP_PROMPT(SWEEPS, "make every town say what kind of place it is");
  ok("the prompt lists the real registry", sp.includes(SWEEPS[0].id) && sp.includes(SWEEPS[0].fields.join(", ")));
  ok("and asks for an id, not a field list", /"sweep": "the id, or null"/.test(sp));
  ok("and says null is a normal answer", /answer null/i.test(sp));

  // ── TWO INTENTS ARE ABOUT THE LIBRARY, NOT THE SCREEN ────────────
  // Both operate on everything published, so neither may be gated on a draft
  // being open. Read off the component, because the routing lives in JSX state
  // no unit test can reach.
  const assistant = readFileSync(join(root, "src/components/StudioAssistant.jsx"), "utf8");
  ok("a sweep and an audit are routed together", /const wholeLibrary = routed === "sweep" \|\| routed === "audit";/.test(assistant));
  ok("neither is gated on a draft being open", /wholeLibrary \? \(sweepMode \? routed : "ask"\)/.test(assistant));
  // Reading a blog entry still wins: there he is a reader, and a question gets
  // an answer, never an action.
  ok("an open entry still answers rather than acting", /const intent = item \? "ask"/.test(assistant));

  // ── Perplexity answers in prose whatever you ask for ─────────────
  is("field lines are read out of markdown", parseLooseFields("**placeKind:** village\n- dayTripFrom: Nordby", ["placeKind", "dayTripFrom"]), { placeKind: "village", dayTripFrom: "Nordby" });
  is("a field it did not answer is absent, not empty", parseLooseFields("placeKind: town", ["placeKind", "partOf"]), { placeKind: "town" });
  // The field name is data, not a pattern. An unescaped bracket used to throw
  // and discard the whole run.
  // A REPORTED failure, not a thrown one: an unescaped bracket used to throw out
  // of proposeSweep and discard the whole run, and a test that dies takes the
  // rest of the suite's output with it.
  let looseOut = "threw";
  try { looseOut = parseLooseFields("day(Trip: Nordby", ["day(Trip"]); } catch { /* reported below */ }
  is("a field name with a bracket does not blow up the run", looseOut, { "day(Trip": "Nordby" });
}

// ── ONE ENTRY, TWO CONTRADICTORY ANSWERS ───────────────────────────
// The Copenhagen entry, found by eye on 8 Aug: the hot dog price in the glance
// field is the water price from the body.
{
  const { costContradictions, pricesIn, priceForNoun } = M;

  const copenhagen = {
    name: "Copenhagen",
    typicalCosts: "Bottled water around 4 EUR, a hot dog about 1,20, coffee 5 EUR.",
    blogBody: [{ type: "paragraph", content: "Bottled water runs 1.20 to 1.50 EUR from a kiosk, and a hot dog from a pølsevogn is about 7 EUR standing up." }],
  };
  const found = costContradictions(copenhagen);
  is("both crossed figures are found", found.map(f => f.noun).sort(), ["a hot dog", "water"]);
  // `?? null` rather than a bare .find(): a regression here should REPORT a
  // failure, not throw and take the rest of the suite's output with it.
  is("and both sides are named so a human can pick", found.find(f => f.noun === "water") ?? null, { noun: "water", glance: "4 EUR", body: "1.2 to 1.5 EUR" });
  is("the hot dog too", found.find(f => f.noun === "a hot dog")?.glance ?? null, "1.2 EUR");
  // Coffee appears once, in the glance field only. Nothing to disagree with.
  ok("a price stated once is not a contradiction", !found.some(f => f.noun === "coffee"));

  // An entry that agrees with itself must come back clean, or this finding is
  // noise on all 71.
  is("an entry that agrees with itself is clean", costContradictions({
    name: "Ribe",
    typicalCosts: "Coffee about 4 EUR, a beer 6 EUR.",
    blogBody: [{ type: "paragraph", content: "Coffee is 4 EUR at the square and a beer runs 6 EUR." }],
  }), []);
  is("rounding is not a contradiction", costContradictions({
    typicalCosts: "Coffee 4 EUR.",
    desc: "Coffee is 4.50 EUR most places.",
  }), []);
  is("a range that contains the glance figure is not a contradiction", costContradictions({
    typicalCosts: "Water 1.50 EUR.",
    desc: "Water runs 1.20 to 1.80 EUR.",
  }), []);
  // The zero boundary, where "they overlap" is the only thing standing between
  // an honest entry and a finding: the gap maths reads a low edge of 0 as free
  // and calls anything else a contradiction.
  is("free-to-something against free is not a contradiction", costContradictions({
    typicalCosts: "Bottled water 0 to 5 EUR depending where you buy it.",
    desc: "Bottled water is 0 EUR from the drinking fountains.",
  }), []);
  is("but free at a glance and priced in the text IS", costContradictions({
    typicalCosts: "Bottled water 0 EUR.",
    desc: "Bottled water costs 5 EUR from a kiosk.",
  }).map(f => f.noun), ["water"]);
  // 30 kr and 4 EUR are the same price written twice.
  is("two currencies are not two answers", costContradictions({
    typicalCosts: "Water 30 DKK.",
    desc: "Water is about 4 EUR.",
  }), []);
  is("an entry with no glance cost field is skipped entirely", costContradictions({ desc: "Water is 4 EUR and also 40 EUR." }), []);

  // The extractor itself, because a false positive here would poison the audit
  // for every entry.
  is("a decimal comma is danish, not a thousands separator", pricesIn("about 1,20 EUR").map(p => p.lo), [1.2]);
  is("a thousands comma is not a decimal", pricesIn("2,400 DKK").map(p => p.lo), [2400]);
  is("a range is one price, not two", pricesIn("1.20 to 1.50 EUR").map(p => [p.lo, p.hi]), [[1.2, 1.5]]);
  is("a duration is not a price", pricesIn("a 15 minute walk").length, 0);
  is("a distance is not a price", pricesIn("12 km from the centre").length, 0);
  is("a bare year is not a price", pricesIn("the church dates to 1840").length, 0);
  is("but a year-sized number with a currency is", pricesIn("1840 DKK").map(p => p.lo), [1840]);

  // The rule that made the Copenhagen case readable at all: a price belongs to
  // the noun before it, and the next noun ends its reach.
  is("water takes its own price, not the hot dog's",
     priceForNoun("water 1.20 to 1.50 EUR and hotdog 7", /\bwater\b/gi), { at: 6, lo: 1.2, hi: 1.5, currency: "eur" });
  is("and the hot dog takes the one after it",
     priceForNoun("water 1.20 to 1.50 EUR and hotdog 7", /\bhotdog\b/gi).lo, 7);
  is("a price written before its noun still lands", priceForNoun("7 EUR for a hot dog", /\bhot\s?dog\b/gi).lo, 7);
  is("a noun with no price nearby gets none", priceForNoun("the water is cold and the walk is long", /\bwater\b/gi), null);
  // The bound that matters: a noun with no price of its own must not quietly
  // adopt the next noun's. This is how the Copenhagen figures got crossed in
  // the first place, and reading them back the same way would hide it.
  is("a noun with no price does not borrow the next one's", priceForNoun("water is free here but a hot dog costs 7 EUR", /\bwater\b/gi), null);
  // A price far enough away belongs to something the noun list does not know
  // about. Both reaches are bounded, and both bounds are load-bearing.
  is("a price sixty characters later is not this noun's",
     priceForNoun("water is free at every fountain in the old centre and nobody charges for it, unlike the 12 EUR ferry", /\bwater\b/gi), null);
  is("nor is one well before it",
     priceForNoun("the ferry costs 30 EUR and it takes a while to get across, then you find water", /\bwater\b/gi), null);
  // The whole field lends its currency to a figure that has none.
  is("a figure inherits the field's currency when there is only one",
     priceForNoun("Prices in EUR. Water 4, coffee 5.", /\bwater\b/gi).currency, "eur");
  is("a field mixing currencies lends nothing",
     priceForNoun("Water 4, tickets 30 DKK, coffee 5 EUR.", /\bwater\b/gi).currency, null);

  // And it is wired into the audit rather than only existing.
  const audited = M.auditEntry({ id: 1, type: "town", payload: copenhagen });
  ok("the audit reports it", audited.findings.some(f => f.field === "costs"));
  is("as critical, because a reader budgets from the glance row", audited.findings.find(f => f.field === "costs")?.severity ?? null, "critical");
}

// ── FOUR RHINE BARGES UNDER A ROYAL PALACE ─────────────────────────
// Oliver, 8 Aug 2026, searching "Amalienborg Slot" from the media panel. Three
// of the four sources returned nothing without erroring, and the fourth's raw
// text-search ranking was shown as if they had all worked.
{
  const { distinctiveToken, mentionsSubject } = M;

  // The word a result actually has to mention. "Slot" is the type, not the
  // subject, and it is an ordinary word on Dutch and German waterway photos
  // where it means a lock.
  is("the subject beats the type word", distinctiveToken("Amalienborg Slot"), "amalienborg");
  is("and the language of the type word does not matter", distinctiveToken("Kronborg Castle"), "kronborg");
  is("nor does the country", distinctiveToken("Ribe Domkirke Denmark"), "domkirke");
  is("a bare name is its own subject", distinctiveToken("Ringkøbing"), "ringkøbing");
  // Nothing distinctive left means nothing to test against, and a gate that
  // cannot judge must not reject.
  is("a query that is all type words has no subject", distinctiveToken("the castle"), null);
  is("nor does an empty one", distinctiveToken(""), null);

  ok("a file naming the subject passes", mentionsSubject("amalienborg", "Amalienborg Palace 2019.jpg", "", ""));
  ok("so does one that only mentions it in the description", mentionsSubject("amalienborg", "DSC00575.jpg", "The square at Amalienborg in winter", ""));
  ok("or only in its categories", mentionsSubject("amalienborg", "DSC00575.jpg", "", "Amalienborg|Copenhagen"));
  // The four barges. Whatever they are called, they do not say it.
  ok("a Rhine barge does not", !mentionsSubject("amalienborg", "Rolf Heinrich Koeln MS Vertrouwen.jpg", "Cargo ship on the Rhine near Cologne", "Ships in Köln"));
  // Danish compounds glue the subject to other words, so this is a substring
  // test on purpose.
  ok("a compound still counts", mentionsSubject("amalienborg", "Amalienborgs kolonnade.jpg", "", ""));
  ok("and folded spelling counts", mentionsSubject("ringkøbing", "Ringkobing havn 1912.jpg", "", ""));
  ok("with no subject to test, nothing is rejected", mentionsSubject(null, "anything.jpg", "", ""));

  // ── THE THREE SILENT MISSES ──────────────────────────────────────
  // Read off the source, because none of this is reachable without a network.
  const api = readFileSync(join(root, "api/commons-photo.js"), "utf8");
  const artQueries = api.match(/wikipedia\.org\/w\/api\.php[^`]*generator=images/g) || [];
  is("both article lookups exist", artQueries.length, 2);
  ok("and BOTH follow redirects, which is why 'Amalienborg Slot' found nothing",
     artQueries.every(u => /redirects=1/.test(u)));
  // The resolved article title becomes the category guess. One mechanism, both
  // misses: "Amalienborg Slot" resolves to "Amalienborg", and
  // Category:Amalienborg is right there.
  ok("the category is guessed from the RESOLVED title, not the search box",
     /uniq\(\[String\(category[^\]]*daTitle[^\]]*enTitle[^\]]*term\]\)/.test(api));
  // Only the blind source is gated. A file on the article or in the category is
  // already about the place, whatever its filename says.
  ok("only the text search has to prove its subject", /qy\.isSearch && !mentionsSubject\(/.test(api));
  ok("and a dropped result is counted rather than swallowed", /sources\[b\]\.offSubject\+\+/.test(api));
  const pushBlock = api.slice(api.indexOf("results.push({"), api.indexOf("credit: {"));
  ok("the results.push block was found at all", pushBlock.length > 40);
  ok("every RESULT says which lookup found it", /source: qy\.source,/.test(pushBlock));
  // A dead source must be visible in the panel, not inferred from odd results.
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the panel warns when only the text search answered", /Only the blind text search found anything/.test(app));
  ok("and every card shows its filename", /title=\{hit\.title\}/.test(app));
}

// ── NOWHERE IS A JOURNEY FROM ITSELF ───────────────────────────────
// Oliver, 8 Aug 2026: "13min from CPH in Copenhagen city.. fix that as well."
{
  const { travelLabel, isAtTravelOrigin, dotJoin } = M;
  const far = null;   // reader not in Denmark, so the CPH fallback is what renders

  is("a real journey still reads normally", travelLabel(far, { name: "Asaa" }, "5h 59min 🚂"), "5h 59min 🚂 from CPH");
  // THE ONE HE SAW. Copenhagen is CPH, and the figure was a measurement from the
  // CPH origin to whatever coordinate a geocoder picked for the middle of it.
  is("Copenhagen is not thirteen minutes from Copenhagen", travelLabel(far, { name: "Copenhagen" }, "13min 🚂"), "");
  is("and the name alone is enough to know that", travelLabel(far, "Copenhagen", "13min 🚂"), "");
  // Same class as relationLine and dayTripsFrom: inside it counts as being there.
  is("nor is anywhere inside it", travelLabel(far, { name: "Nyhavn", partOf: "Copenhagen" }, "9min 🚂"), "");
  is("case does not rescue it", travelLabel(far, { name: "COPENHAGEN" }, "13min"), "");
  // Dragør: no travelTime, and the card still printed "· FROM CPH".
  is("a missing figure withholds its label too", travelLabel(far, { name: "Dragør" }, ""), "");
  is("and so does an absent one", travelLabel(far, { name: "Dragør" }, undefined), "");
  // A field holding only whitespace is a field nobody filled in. Trimming is what
  // makes the guard above catch it rather than rendering " · from CPH".
  is("whitespace is not a figure", travelLabel(far, { name: "Dragør" }, "   "), "");
  is("and a real figure keeps its spacing tidy", travelLabel(far, { name: "Asaa" }, "  2h 10min  "), "2h 10min from CPH");
  is("rather than printing the word undefined", travelLabel(far, { name: "Dragør" }, undefined).includes("undefined"), false);
  // Distance from the reader is honest even in Copenhagen.
  const inCph = { lat: 55.6761, lon: 12.5683 };
  ok("standing in Denmark still gets a distance", /from you$/.test(travelLabel(inCph, "Copenhagen", "13min")));

  is("being the origin is being the origin", isAtTravelOrigin("Copenhagen"), true);
  is("being inside it counts", isAtTravelOrigin({ name: "Nyhavn", partOf: "Copenhagen" }), true);
  is("somewhere else does not", isAtTravelOrigin({ name: "Aalborg", partOf: "" }), false);
  is("and nothing is not somewhere", isAtTravelOrigin(null), false);

  // The separator is joined over what exists, not written and hoped for.
  is("empty parts cost no separator", dotJoin("Capital Region of Denmark", "", ""), "Capital Region of Denmark");
  is("real parts are joined", dotJoin("Village", "North Jutland", "5h 59min 🚂 from CPH"), "Village · North Jutland · 5h 59min 🚂 from CPH");
  is("and nothing at all is nothing", dotJoin("", null, undefined), "");

  // Wired, not merely written: the town card passes the ENTRY so partOf is
  // visible, and no card builds its subtitle with a bare separator any more.
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the town card hands travelLabel the whole entry", /travelLabel\(userCoords, town, town\.travelTime\)/.test(app));
  // Nowhere, card or prompt. The prompt one was worse: that list is fed to the
  // model that writes plans, so "Copenhagen (..., 13min from CPH)" did not just
  // look wrong on screen, it taught a false fact to the thing doing the writing.
  ok("nothing writes 'from CPH' by hand any more", !/travelTime\}? from CPH/.test(app));
  ok("and the plan prompt runs the same guard", /travelLabel\(null, t, t\.travelTime\)/.test(app));
  // The detail page has its OWN render, and it was live on Dragør's page today
  // as a line reading nothing but "from CPH".
  const detail = readFileSync(join(root, "src/components/DetailPage.jsx"), "utf8");
  ok("the detail page hands over the whole entry too", /travelLabel\(userCoords, item, item\.travelTime\)/.test(detail));
  ok("and renders no row at all when there is no journey", /\{travelLabel\(userCoords, item, item\.travelTime\) && \(/.test(detail));
}

// ── "THE FILTERS GOTTA CHANGE. THIS IS JUST A LONG MESS" ───────────
// Oliver, 8 Aug 2026. The Region row was built from a free-text field, so
// "Langeland, Region Syddanmark" and "Langeland, Southern Denmark" were two
// pills for one region. The axis changed, not the widget.
{
  const { PARTS, PART_ANCHORS, RESOLVED_PARTS, partOfCountry, partsPresent, unplaced,
          matchesSearch, fold, MAX_OFFSHORE_KM, RESOLVED_SHAPE_INDEXES } = M;

  // ── THE SHAPES ARE FOUND BY ANCHOR, NOT BY INDEX ─────────────────
  // DK_SHAPES is a bare array. Reading it positionally means one reordering
  // silently relabels the whole country and every page still looks fine.
  is("every landmass still resolves from the town that identifies it", RESOLVED_PARTS, PARTS);
  // The real invariant. Two names landing on one shape means the map has been
  // reordered or a shape lost, and half the country is quietly mislabelled while
  // every page still renders perfectly.
  is("and each lands on a DIFFERENT shape", new Set(RESOLVED_SHAPE_INDEXES).size, 5);
  // A DOCUMENTED COINCIDENCE. PART_ANCHORS is currently written in the same
  // order DK_SHAPES happens to be in, which is why resolving by anchor and
  // resolving by array index give identical answers today and no mutation can
  // tell them apart. If this line ever fails, nothing is broken: it means
  // DK_SHAPES was reordered and the anchors quietly did the job they exist for.
  is("anchor order and shape order agree, for now", RESOLVED_SHAPE_INDEXES, [0, 1, 2, 3, 4]);
  is("and there are five of them", PARTS.length, 5);
  is("named as a traveller thinks about the country", PARTS, ["Jutland", "Funen", "Zealand", "Lolland-Falster", "Bornholm"]);

  const at = (lat, lon) => partOfCountry({ __lat: lat, __lon: lon });
  is("Aarhus is in Jutland", at(56.1629, 10.2039), "Jutland");
  is("Odense is on Funen", at(55.4038, 10.4024), "Funen");
  is("Copenhagen is on Zealand", at(55.6761, 12.5683), "Zealand");
  is("Rønne is on Bornholm", at(55.0999, 14.7016), "Bornholm");
  is("Nykøbing F is on Lolland-Falster", at(54.7691, 11.8743), "Lolland-Falster");
  is("Ribe is in Jutland", at(55.3300, 8.7686), "Jutland");
  is("Aalborg is in Jutland", at(57.0488, 9.9217), "Jutland");

  // ── THE ISLANDS ARE THE WHOLE POINT OF THIS SITE ─────────────────
  // The five outlines are coarse and contain none of these. A plain
  // point-in-polygon test would have answered "nowhere" for most of the best
  // entries on the site, so a point outside every outline takes the nearest.
  is("Ærøskøbing is in the Funen part of the country", at(54.8869, 10.4108), "Funen");
  is("Sønderho on Fanø is in the Jutland part", at(55.3417, 8.4869), "Jutland");
  is("Samsø is nearest Jutland", at(55.8700, 10.6000), "Jutland");
  is("Gudhjem is on Bornholm", at(55.2100, 14.9700), "Bornholm");
  is("Møn is nearest Zealand", at(54.9800, 12.3000), "Zealand");

  // NULL IS NOT A BUCKET. An entry this cannot place must stay visible under
  // All and be counted, never quietly filtered out of every view.
  is("no coordinate means no answer", partOfCountry({ name: "Somewhere" }), null);
  is("nor does half a coordinate", partOfCountry({ __lat: 55.5 }), null);
  is("nor a coordinate that is not a number", partOfCountry({ __lat: "north", __lon: "east" }), null);
  // Berlin is 200km past the cap, so it is refused rather than called Jutland.
  is("somewhere far outside Denmark is refused", at(52.52, 13.40), null);
  ok("and the cap is a real distance", MAX_OFFSHORE_KM > 0 && MAX_OFFSHORE_KM < 100);

  const townSet = [
    { name: "Aarhus", __lat: 56.1629, __lon: 10.2039, region: "Central Denmark" },
    { name: "Odense", __lat: 55.4038, __lon: 10.4024, region: "Southern Denmark" },
    { name: "Nowhere", region: "Himmerland, Region Nordjylland" },
  ];
  is("only parts something is published in get a chip", partsPresent(townSet), ["Jutland", "Funen"]);
  is("and an unplaceable entry is counted, not hidden", unplaced(townSet).map(t => t.name), ["Nowhere"]);

  // ── SEARCH IS THE OTHER HALF OF THE DEAL ─────────────────────────
  // Himmerland lost its pill. It must not lose its towns.
  ok("the written region is still findable by typing it", matchesSearch(townSet[2], "Himmerland"));
  ok("nobody types the Danish letters", matchesSearch({ name: "Ærøskøbing" }, "aeroskobing"));
  ok("and they do not have to", matchesSearch({ name: "Ærøskøbing" }, "ærø"));
  ok("a tag is searchable too", matchesSearch({ name: "Asaa", tag: "small harbor town" }, "harbor"));
  ok("every word must land, so a second word narrows", !matchesSearch({ name: "Aarhus", region: "Central Denmark" }, "aarhus bornholm"));
  ok("an empty search matches everything", matchesSearch({ name: "X" }, "   "));
  is("folding is consistent", fold("Ærøskøbing"), "aeroskobing");
}

// ── "WHAT CATEGORY IT FITS INTO. LIKE NATURE, HISTORY, NIGHTLIFE" ──
{
  const { PLACE_THEMES, THEME_LABEL, THEME_EMOJI, cleanThemes, themesOf, hasTheme,
          themesPresent, tierOf, tierLabel, MAX_THEMES, shapeForLive, SWEEPS } = M;

  // A CLOSED VOCABULARY, for the same reason placeKind is one. The `tag` field
  // it replaces said "small harbor town" on one card and something differently
  // worded on the next, so it could never be filtered on or compared.
  ok("every theme has a label and an icon", PLACE_THEMES.every(t => THEME_LABEL[t] && THEME_EMOJI[t]));
  is("a real theme survives", cleanThemes(["history", "food"]), ["history", "food"]);
  is("an invented one does not", cleanThemes(["history", "vibes", "wellness"]), ["history"]);
  is("case and spacing do not matter", cleanThemes([" History ", "FOOD"]), ["history", "food"]);
  is("a comma-separated string is accepted too", cleanThemes("nature, coast"), ["nature", "coast"]);
  is("duplicates collapse", cleanThemes(["food", "food", "food"]), ["food"]);
  // A place that is about five things is about nothing, and five chips is
  // unreadable at the size these render.
  is("no more than three", cleanThemes(["nature", "coast", "history", "food", "art"]).length, MAX_THEMES);
  is("nothing usable is an empty list, never a guess", cleanThemes(["something else"]), []);
  is("and neither is null", cleanThemes(null), []);

  ok("a theme filter matches", hasTheme({ themes: ["history", "food"] }, "history"));
  ok("and refuses what is not there", !hasTheme({ themes: ["history"] }, "nightlife"));
  ok("no filter matches everything", hasTheme({ themes: [] }, null));
  is("only themes something carries get a chip", themesPresent([{ themes: ["food"] }, { themes: ["food", "art"] }]), ["food", "art"]);

  // ── THE TIER WAS STORED AND INVISIBLE ────────────────────────────
  // It only ever surfaced as a Top Pick badge on the very highest tier, so
  // "Can't Miss Out" and "Best If You're Already Nearby" were the same card.
  is("the top tier reads short", tierLabel({ tier: "Can't Miss Out" }), "★ Can't miss");
  is("written 71 different ways over several weeks, still matched", tierLabel({ tier: "can't miss out" }), "★ Can't miss");
  is("and without the apostrophe", tierLabel({ tier: "Cant miss out" }), "★ Can't miss");
  is("the middle tiers read plainly", tierLabel({ tier: "Worth Considering" }), "Worth a look");
  is("and the bottom one", tierLabel({ tier: "Best If You're Already Nearby" }), "If you're nearby");
  // A card showing an invented rank is worse than a card showing none.
  is("an unrecognised tier shows nothing rather than a guess", tierLabel({ tier: "Quite Good Actually" }), null);
  is("and so does a missing one", tierLabel({}), null);
  is("tierOf agrees with the label", tierOf({ tier: "Highly Recommended" }).id, "high");

  // THE RULE, again: a sweep may only write a field shapeForLive carries. themes
  // was added to the town shape in the same pass as the sweep, deliberately.
  ok("shapeForLive carries themes", "themes" in shapeForLive("town", { name: "X" }));
  is("and it defaults to a list, not a string", shapeForLive("town", { name: "X" }).themes, []);
  is("a draft's themes are capped on the way in too", shapeForLive("town", { name: "X", themes: ["a", "b", "c", "d"] }).themes.length, 3);
  ok("the themes sweep exists and declares only that field", SWEEPS.some(sw => sw.id === "themes" && sw.fields.length === 1 && sw.fields[0] === "themes"));
  // What a place is FOR is a judgement about writing that already exists. A web
  // search saying "Ribe is historic" is an opinion with a citation stapled on,
  // and it would arrive marked as researched, which is worse than not arriving.
  ok("and it never reaches the paid research tier", SWEEPS.find(sw => sw.id === "themes").noResearch === true);

  // Wired into the card, not merely written.
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  // The CHIP, not just a mention of the function: the outer guard names
  // tierLabel too, so a loose match proved the guard and said nothing about
  // whether anything actually rendered.
  // ONE DEFINITION, READ BY EVERY TOWN GRID. The first version was pasted inline
  // and landed in the Major Cities grid, which renders nothing because no
  // published entry carries isMajorCity. It shipped and was invisible on every
  // card on the site. EXACT count, not a floor: >= 1 would let two of the three
  // grids lose it silently, which is the same bug again.
  ok("the chips are defined once, as a component", /const CardChips = \(\{ town \}\) =>/.test(app));
  is("and every town grid renders them", (app.match(/<CardChips town=\{town\} \/>/g) || []).length, 3);
  ok("the component reads the tier", /const tier = tierLabel\(town\);/.test(app));
  ok("and the themes", /const themes = themesOf\(town\);/.test(app));
  // A grid that renders no cards cannot prove a chip renders, so the count above
  // is checked against the number of grids that filter on isArea.
  is("there are exactly three town grids to put them in", (app.match(/!isArea\(t\)/g) || []).length, 3);
  // The free-text region filter is gone from every predicate, or the mess is
  // still there behind a nicer control.
  ok("no filter reads the free-text region any more", !/t\.region === townFilter/.test(app));
  ok("the geography chips are derived from coordinates", /partsPresent\(towns\)/.test(app));
  ok("and one predicate is still read by every grid", /const townMatches = \(t\) => townPartOk/.test(app));
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) { fails.forEach(f => console.log("  FAIL " + f + "\n")); process.exit(1); }
