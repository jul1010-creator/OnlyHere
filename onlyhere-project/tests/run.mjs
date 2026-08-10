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
  export { journeyParts, journeyBlock, vehicleWord } from ${JSON.stringify(join(root, "src/utils/journey.js"))};
  export { normaliseDomain, cleanNote, cleanSource, sourcesFor, sourceRulesBlock, cleanPlace, placeMatches, blockCost, directSourceSearches, domainVariants, placeMightMatch, sourcesToSearch, MAX_DIRECT_SEARCHES, PARTS_OF_COUNTRY, CONTENT_TYPES, TYPE_LABEL } from ${JSON.stringify(join(root, "src/utils/sourcePolicy.js"))};
  export { variantsOf, otherNameFor, samePlaceName, searchNames, PLACE_NAMES, SIGHT_NAMES, containsName } from ${JSON.stringify(join(root, "src/utils/danishNames.js"))};
  export { NIGHTLIFE_CITIES, townOfLocation, groupSpotsByTown, spotsForTown, townPageFor, nightlifeTownList } from ${JSON.stringify(join(root, "src/utils/nightlife.js"))};
  export { supabaseFailure, studioErrorMessage, EXPIRED, REFUSED, MISSING, OTHER } from ${JSON.stringify(join(root, "src/utils/studioErrors.js"))};
  export { cleanPlaceKind, cleanRelation, placeIssues, placePatch, hasPlaceChange, duplicateNames } from ${JSON.stringify(join(root, "src/utils/placeEdit.js"))};
  export { parseEventDate, isPastDate, nextEditionYear, eventDateIssues, staleEvents, lastDateInText, looksFinished, splitFinishedCandidates } from ${JSON.stringify(join(root, "src/utils/eventDates.js"))};
  export { FILTER_THRESHOLD, showFilters, applyFacets, facetCounts, appliedChips, activeFacetCount, clearFacet, clearAllFacets, matchesQuery } from ${JSON.stringify(join(root, "src/utils/listControls.js"))};
  export { EVENT_TYPES, EVENT_TYPE_LABEL, eventTypesOf, hasEventType, eventTypesPresent, eventTypeCounts, untypedEvents, UNINFORMATIVE } from ${JSON.stringify(join(root, "src/utils/eventTypes.js"))};
  export { TIERS } from ${JSON.stringify(join(root, "src/utils/placeThemes.js"))};
  export { PARTS, PART_ANCHORS, RESOLVED_PARTS, RESOLVED_SHAPE_INDEXES, partOfCountry, partsPresent, unplaced, matchesSearch, fold, pointInPoly, MAX_OFFSHORE_KM } from ${JSON.stringify(join(root, "src/utils/geography.js"))};
  export { PLACE_THEMES, THEME_LABEL, THEME_EMOJI, cleanThemes, themesOf, hasTheme, themesPresent, tierOf, tierLabel, MAX_THEMES } from ${JSON.stringify(join(root, "src/utils/placeThemes.js"))};
  export { travelLabel, isAtTravelOrigin, dotJoin, isFullPlanText, isReadyToBuild } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { fillerWordCounts, FILLER_WORDS, FILLER_REPEAT, AI_TELL_PHRASES } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { arrivalRow, transitDepartureAnchor, departureParam, scanForAITells } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { auditEntry, auditAll } from ${JSON.stringify(join(root, "src/utils/entryAudit.js"))};
  export { mergeSaves } from ${JSON.stringify(join(root, "src/utils/userSaves.js"))};
  export { licenseUrl, creditIsRequired } from ${JSON.stringify(join(root, "src/utils/imageCredits.js"))};
  export { STUDIO_VOICE } from ${JSON.stringify(join(root, "src/utils/studioContent.js"))};
  export { hostMatchesName, officialSiteFromCandidates } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { ARRIVAL_TYPES, hasArrivalField } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { FERRY, classifyFerry, ferryFindings } from ${JSON.stringify(join(root, "src/utils/transport.js"))};
  export { enforceScope, resolveField, classifyClaim, routeMessage, allowedFieldsFor, isEditRequest, factsIn, factsPreserved, editEntry, EDITABLE_FIELDS, VERIFY_PROMPT } from ${JSON.stringify(join(root, "src/utils/correction.js"))};
  export { studioPrompts } from ${JSON.stringify(join(root, "src/utils/studioPrompts.js"))};
  export { looksLikeTransit, kindFromName, findRealNearestStop, hasTransitType } from ${JSON.stringify(join(root, "src/utils/geo.js"))};
  export { licenseIsUsable, distinctiveToken, mentionsSubject, looksHistorical, pickDescription, bestCaption } from ${JSON.stringify(join(root, "api/commons-photo.js"))};
  export { testTravelerLine } from ${JSON.stringify(join(root, "src/utils/helpers.js"))};
  export { resolveStopCoordsDetailed, legDistanceKm, townInName, townKeyFor, resolveLegMode } from ${JSON.stringify(join(root, "src/utils/guideEnrichment.js"))};
  export { lookupRealPlace, placeCoords } from ${JSON.stringify(join(root, "src/utils/guideEnrichment.js"))};
  export { freeEntrance } from ${JSON.stringify(join(root, "src/data/freeEntrance.js"))};
  export { estimateMinutes, estimateDurationText, walkEstimateTooFar, ROUTE_FACTOR, WALK_MAX_MINUTES, WALK_MAX_KM } from ${JSON.stringify(join(root, "src/utils/guideEnrichment.js"))};
  export { shuffledOrder, identityOrder, advancePos, factAt } from ${JSON.stringify(join(root, "src/utils/factRotation.js"))};
  export { claimConflicts, implausibleWalks, checkable, durationsIn, distancesIn, TOLERANCE, MIN_GAP_MINUTES } from ${JSON.stringify(join(root, "src/utils/claimCheck.js"))};
  export { placeSlug, townPath, findBySlug, slugCollisions, sitemapXml, COUNTRY } from ${JSON.stringify(join(root, "src/utils/placeUrl.js"))};
  export { towns as TOWNS_FOR_TEST } from ${JSON.stringify(join(root, "src/data/towns.js"))};
  export { PRICES, startRun, endRun, recordModelCall, recordRequestCall, summarise, averageFor, describe, recentRuns, currentRun, __reset } from ${JSON.stringify(join(root, "src/utils/apiCost.js"))};
  export { swipeAxis, dragOffset, swipeCommits, swipeTarget, SLOP_PX, AXIS_BIAS, COMMIT_FRACTION, FLICK_SPEED, EDGE_DRAG } from ${JSON.stringify(join(root, "src/utils/swipe.js"))};
  export { stayTier, stayTiers, namedProperty, stayProblems, stayTierMismatch } from ${JSON.stringify(join(root, "src/utils/accommodation.js"))};
  export { OPERATORS, operatorsForLeg, operatorNote, isLongLeg, LONG_LEG_KM, THRESHOLDS_ARE_ORDERED } from ${JSON.stringify(join(root, "src/utils/operators.js"))};
  export { FORECAST_HORIZON_DAYS, FORECAST, NORMALS, weatherSourceFor, wetDayWords, normalsIcon, normalsLine, weatherBadge, normalsNote } from ${JSON.stringify(join(root, "src/utils/weather.js"))};
  export { mergeForecasts, agreementNote, SPREAD_DISAGREES_C, weatherIsStale, weatherChanges, WEATHER_STALE_HOURS, dayWeather } from ${JSON.stringify(join(root, "src/utils/weather.js"))};
  export { coverageByPart, thinnestParts, coverageSummary, discoveryFraming, isAlreadyCovered, splitAlreadyCovered } from ${JSON.stringify(join(root, "src/utils/discovery.js"))};
  export { DISCOVERY_TARGETS, targetById, coverageByTarget, framingForTarget } from ${JSON.stringify(join(root, "src/utils/discovery.js"))};
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
  // CONTENT_TYPES, not a literal copy of it. Two hand-maintained lists of the
  // same thing is what this codebase keeps getting caught by, and a test that
  // owns its own copy of the list cannot notice the list changing.
  const TYPES = M.CONTENT_TYPES;
  const p = M.studioPrompts("Aarhus Festuge");
  is("every registered type has a draft prompt", Object.keys(p).sort(), TYPES.slice().sort());
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
  // ── TWO LISTS OF THE SAME THING, SO BOTH GET READ ─────────────────
  // Each published type declares its section headings twice: App.jsx's
  // paste-ready codegen calls bb([...]), and studioContent.js's shapeForLive
  // calls bbData([...]). This block used to read only the first.
  //
  // That blind spot cost the whole entry-voice pass of 8 Aug. App.jsx was
  // cleaned to Being There / Who It's For / The Reality Check and this suite
  // went green, while shapeForLive, the ONLY insert path into the database,
  // still wrote "Why People Love It" and "Perfect For" and dropped realityCheck
  // entirely for free, night, nightTown and booking. Everything published
  // through the button carried the old headings and no verdict, and every
  // assertion below passed the entire time.
  const shape = readFileSync(join(root, "src/utils/studioContent.js"), "utf8");
  const headingsIn = (src, fn) =>
    [...src.matchAll(new RegExp(`${fn}\\(\\s*(?:isClub \\? )?\\[\\[([\\s\\S]{0,400}?)\\]\\]`, "g"))]
      .map(m => [...m[1].matchAll(/"([^"]+)"|`([^`]+)`/g)].map(h => h[1] || h[2]));
  const codegenSets = headingsIn(app, "bb");
  const publishSets = headingsIn(shape, "bbData");
  const headingSets = [...codegenSets, ...publishSets];
  ok("every published type still builds a page", codegenSets.length >= 7);
  ok("and the publish path declares its headings too", publishSets.length >= 7);
  // The publish path is the one that reaches a reader, so it is checked by name
  // rather than only folded into the combined list.
  ok("the publish path carries a verdict for every type",
     publishSets.every(set => set.some(h => /reality check/i.test(h))));
  ok("and none of its headings presuppose one",
     publishSets.flat().every(h => !/why people love|perfect for/i.test(h)));

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
  const TYPES = M.CONTENT_TYPES;
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
  // The matcher is a LIST now: guides, town pages and the sitemap. Everything
  // else on the site still never pays for this to run, which is the point the
  // original single-entry assertion was making.
  ok("middleware runs on guide urls", /"\/guide\/:path\*"/.test(mw));
  // ── THE MATCHER CANNOT USE THE CONSTANT, SO THE TEST DOES ─────────
  // This was `/${COUNTRY}/:path*` and it failed the Vercel build outright:
  //   Error: Unhandled type: "TemplateExpression"
  // Vercel PARSES this config rather than running it, so every entry has to be
  // a plain literal. That reintroduces exactly what the constant existed to
  // prevent, two copies of the country that can drift, so the check moves here
  // where it can still run. Derived from COUNTRY, never typed twice.
  ok("and on town pages", mw.includes(`"/${M.COUNTRY}/:path*"`));
  ok("with no template expression, which the build cannot parse", !/matcher: \[[^\]]*`/.test(mw));
  // The failure this prevents is silent in the worst way: the build stops, the
  // old deployment keeps serving, and the site looks fine while none of the new
  // paths exist.
  ok("every matcher entry is a plain string", (mw.match(/matcher: \[([^\]]*)\]/) || ["", ""])[1].split(",").every(x => /^\s*"[^"]*"\s*$/.test(x)));
  ok("and on the sitemap", /"\/sitemap\.xml"/.test(mw));
  // A bare catch-all here would put an edge invocation in front of every asset
  // on the site, which is the cost this matcher exists to avoid.
  ok("but not on everything", !/matcher:\s*"\/\(\.\*\)"/.test(mw));
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
  const { distinctiveToken, mentionsSubject, looksHistorical, pickDescription, bestCaption } = M;

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

  // ── A PAINTING IS NOT A PHOTOGRAPH ───────────────────────────────
  // Four of the eight Amalienborg results were 18th-century works. Right for an
  // encyclopaedia, wrong for a travel card. Demoted, never dropped: for a lost
  // building a painting may be the only image there is.
  ok("a named painting is historical", looksHistorical("Sophie Amalienborg (1740 painting).jpg", "", ""));
  ok("so is an engraving", looksHistorical("Rytterstatuen opstilles paa Amalienborg Plads 1768.jpg", "", ""));
  ok("and a pre-photography year in the title alone", looksHistorical("Moltkes Palais 1756 by de Lode.jpg", "", ""));
  ok("a modern photograph is not", !looksHistorical("Amalienborg Palace - aerial view.jpg", "Aerial view of the palace", "Amalienborg"));
  ok("nor is a recent year", !looksHistorical("Amalienborg 2019.jpg", "", ""));
  ok("nor a plain name", !looksHistorical("Frederik VIII's Palae.jpg", "", ""));

  // ── WHAT THE PICTURE ACTUALLY IS ─────────────────────────────────
  // Oliver, 8 Aug 2026: "Sometimes these pictures have a description like
  // 'Ringkøbing Kirkegård'. Maybe I should be able to include that."
  //
  // Commons stores it as MULTILINGUAL HTML, so stripping the tags off the whole
  // thing glues every translation into one line.
  const multi = '<div class="description en" lang="en"><span class="language en">English:</span> Ringkøbing churchyard in winter</div><div class="description da" lang="da"><span class="language da">Dansk:</span> Ringkøbing Kirkegård om vinteren</div>';
  is("English is preferred and its label removed", pickDescription(multi), "Ringkøbing churchyard in winter");
  is("Danish is used when there is no English", pickDescription('<div class="description da" lang="da"><span>Dansk:</span> Ringkøbing Kirkegård</div>'), "Ringkøbing Kirkegård");
  // The fixture that makes the Danish fallback load-bearing: with a second
  // language present and no English, falling through to the raw HTML glues both
  // translations into one caption.
  is("Danish beats another language, rather than joining it",
     pickDescription('<div class="description da" lang="da"><span>Dansk:</span> Ringkøbing Kirkegård</div><div class="description de" lang="de"><span>Deutsch:</span> Friedhof von Ringkøbing</div>'),
     "Ringkøbing Kirkegård");
  is("plain text survives untouched", pickDescription("Ringkøbing Kirkegård"), "Ringkøbing Kirkegård");
  is("nothing is nothing, not the word undefined", pickDescription(null), "");
  ok("a caption is cut to a caption, on a word boundary", (() => {
    const out = pickDescription("Ringkøbing ".repeat(40));
    return out.length <= 182 && out.endsWith("…") && !/\s…$/.test(out);
  })());
  // Commons' own short title beats a description when it has a real one, and is
  // ignored when it is just the filename again, which is what it holds for the
  // many files nobody titled.
  is("a real ObjectName wins", bestCaption("Ringkøbing Kirkegård", "<div>a long description</div>", "DSC00575.jpg"), "Ringkøbing Kirkegård");
  is("an ObjectName that is just the filename does not", bestCaption("DSC00575", "<div>Ringkøbing churchyard</div>", "DSC00575.jpg"), "Ringkøbing churchyard");
  is("nor does one that only differs by separators", bestCaption("Amalienborg Palace aerial view", "<div>The palace from above</div>", "Amalienborg_Palace-aerial_view.jpg"), "The palace from above");
  is("with neither, the caption is empty rather than the filename", bestCaption("", "", "DSC00575.jpg"), "");

  // Wired: shown on the card, saved onto the block, and switchable.
  const app2 = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the finder shows what the picture is", /\{hit\.caption && <div title=\{hit\.caption\}/.test(app2));
  ok("and it can be saved as the caption", /useCommonsCaption && hit\.caption \? \{ caption: hit\.caption \}/.test(app2));
  // BOTH save paths, or one of them silently drops it.
  is("both places that save a Commons photo carry it", (app2.match(/useCommonsCaption && hit\.caption/g) || []).length, 2);
  ok("and it is a choice, not a rule", /setUseCommonsCaption\(e\.target\.checked\)/.test(app2));
  // DetailPage has rendered block.caption all along; assert it still does, or
  // the caption is saved into a field nothing reads.
  ok("the detail page renders a caption on an image block", /block\.caption && <div/.test(readFileSync(join(root, "src/components/DetailPage.jsx"), "utf8")));

  // ── THE THREE SILENT MISSES ──────────────────────────────────────
  // Read off the source, because none of this is reachable without a network.
  const api = readFileSync(join(root, "api/commons-photo.js"), "utf8");
  // The endpoint has to ATTACH it, or every assertion above tests a function
  // nothing calls.
  ok("the endpoint attaches a caption to every candidate", /caption: bestCaption\(m\.ObjectName\?\.value, m\.ImageDescription\?\.value, title\),/.test(api));
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
  // The candidate object, not the whole file: `source: qy.source` also appears
  // on the per-source counter, and matching loosely proved the counter while
  // saying nothing about whether a RESULT carries its provenance.
  const keepBlock = api.slice(api.indexOf("keep.push({"), api.indexOf("credit: {"));
  ok("the keep.push block was found at all", keepBlock.length > 40);
  ok("every RESULT says which lookup found it", /source: qy\.source,/.test(keepBlock));

  // ── ONE SOURCE MUST NOT MONOPOLISE THE RESULTS ───────────────────
  // The Danish article on Amalienborg supplied all eight slots on its own, so
  // the English article's photographs could not appear however good they were.
  ok("the slots are dealt round-robin, not first-source-wins", /for \(let round = 0; results\.length < n; round\+\+\)/.test(api));
  ok("and no source is skipped before it is even filtered", !/for \(const p of pages\)[\s\S]{0,400}if \(results\.length >= n\) break;/.test(api));
  // A source that was never examined reported "found: 0", which reads as "that
  // source has nothing" when it meant "we stopped before asking".
  ok("every source reports how many it could actually use", /sources\[b\]\.usable = keep\.length;/.test(api));
  // A Danish place name is often not an English title at all, and there is no
  // redirect to follow. The Danish wiki already knows the real name.
  ok("the English article is retried on the resolved Danish title", /resolveTitle\("en\.wikipedia\.org", daTitle\)/.test(api));
  ok("a painting is pushed behind the photographs", /keep\.sort\(\(a, b2\) => \(a\.historical/.test(api));
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

// ── THE MESSAGE THAT BLAMED HIS SQL FOR AN EXPIRED LOGIN ───────────
// Oliver, 8 Aug 2026: "it worked before. And facts are in my SQL. so this must
// be a bug." Verified against the live database: the same query returns 200 and
// real rows on either key. `Bearer undefined` returns 401 PGRST301, an object
// rather than an array, and the code reached for the only explanation it had.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  // PASS 57 added studioAuth() so a missing token could never masquerade as a
  // database permission error, and then all three facts call sites kept
  // interpolating the token by hand. EXACT count: a floor would let one of them
  // slip back.
  is("no facts call interpolates the token by hand any more",
     (app.match(/gemlyx_facts[\s\S]{0,220}Bearer \$\{studioSession\?\.access_token\}/g) || []).length, 0);
  is("and all three go through studioAuth", (app.match(/studioAuth\(\)/g) || []).length >= 3, true);
  ok("a missing token names the login, not the database",
     /Your Studio login has expired\. Log out and back in\./.test(M.studioErrorMessage("the facts", 401, { code: "PGRST301" })));
  // The SQL is suggested for exactly one thing: the relation genuinely not
  // existing. Not for a 401, which is what it was doing on three tables.
  is("a missing relation is the only thing that offers SQL", M.studioErrorMessage("the facts", 404, { code: "PGRST205" }), "MISSING_TABLE");
  ok("a 401 never offers SQL", M.studioErrorMessage("the facts", 401, { code: "PGRST301" }) !== "MISSING_TABLE");
  ok("nor does a 403", M.studioErrorMessage("the facts", 403, null) !== "MISSING_TABLE");
  is("401 and 403 are both auth rather than schema, and are told apart", [M.supabaseFailure(401, null), M.supabaseFailure(403, null)], [M.EXPIRED, M.REFUSED]);
  ok("and anything else reports its own status rather than guessing",
     /Could not read the facts \(500\)/.test(M.studioErrorMessage("the facts", 500, null)));
  // THE OBLIGATION THAT REPLACES REMEMBERING. A helper nobody has to call is a
  // suggestion, and this exact bug has now shipped four times: PASS 57 on
  // gemlyx_content, then gemlyx_facts, then gemlyx_sources, then
  // gemlyx_research. Twelve call sites were still interpolating the token by
  // hand twelve lines below the helper written to stop it.
  is("no Studio request builds its own Authorization header",
     (app.match(/Bearer \$\{studioSession/g) || []).length, 0);
  ok("they all go through the one helper that throws on a missing token",
     /const tok = studioSession\?\.access_token;\n    if \(!tok\) throw new Error/.test(app));
}

// ── "I'M NOT SAYING ONLY.. I'M SAYING INCLUDE" ─────────────────────
// Oliver, 8 Aug 2026, on being able to add his own research sources without
// asking anyone to edit code, and then correcting the first version of it.
{
  const { normaliseDomain, cleanNote, cleanSource, sourcesFor, sourceRulesBlock, cleanPlace, placeMatches, blockCost, PARTS_OF_COUNTRY, CONTENT_TYPES, TYPE_LABEL } = M;

  // Whatever gets pasted. A typo here is a rule the models dutifully try to
  // honour on every draft forever, so the shape is checked rather than trusted.
  is("a bare domain survives", normaliseDomain("visitdenmark.dk"), "visitdenmark.dk");
  is("a full link is reduced to its host", normaliseDomain("https://www.visitdenmark.dk/denmark/things-do/x?a=1#b"), "visitdenmark.dk");
  is("www goes", normaliseDomain("WWW.VisitDenmark.DK"), "visitdenmark.dk");
  is("a subdomain stays, because it is a different site", normaliseDomain("kultur.aarhus.dk"), "kultur.aarhus.dk");
  is("a sentence is not a domain", normaliseDomain("check the tourist board please"), "");
  is("nor is a bare word", normaliseDomain("visitdenmark"), "");
  is("nor an empty box", normaliseDomain("   "), "");
  is("an email is reduced to its host rather than stored whole", normaliseDomain("hello@visitdenmark.dk"), "visitdenmark.dk");

  is("a note is collapsed and capped", cleanNote("  events   and\n seasons  "), "events and seasons");
  is("and a very long one is cut", cleanNote("x".repeat(300)).length, 160);

  // Only a type Studio actually drafts. Anything else is a dead rule nobody can
  // see, so it falls back to universal rather than silently matching nothing.
  is("a real type is kept", cleanSource({ domain: "x.dk", applies_to: "town" }).appliesTo, "town");
  is("an invented type becomes universal", cleanSource({ domain: "x.dk", applies_to: "castles" }).appliesTo, "");
  is("a junk domain is no source at all", cleanSource({ domain: "not a domain" }), null);
  ok("every drafted type has a label", CONTENT_TYPES.every(t => TYPE_LABEL[t]));
  ok("and so does universal", !!TYPE_LABEL[""]);

  const rows = [
    // The type-specific one FIRST on purpose: with the universal one already
    // ahead of it, removing the sort changed nothing and the assertion below
    // could not fail.
    { id: 2, domain: "faergen.dk", note: "the operator's own timetable", applies_to: "town", enabled: true },
    { id: 1, domain: "https://www.visitdenmark.dk/", note: "events and seasons", applies_to: "", enabled: true },
    { id: 3, domain: "kulturarv.dk", note: "listed buildings", applies_to: "free", enabled: true },
    { id: 4, domain: "oldnews.dk", note: "retired", applies_to: "", enabled: false },
    { id: 5, domain: "visitdenmark.dk", note: "duplicate", applies_to: "", enabled: true },
  ];
  is("universal plus this type, and nothing else", sourcesFor(rows, "town").map(x => x.domain), ["visitdenmark.dk", "faergen.dk"]);
  is("a different type gets its own", sourcesFor(rows, "free").map(x => x.domain), ["visitdenmark.dk", "kulturarv.dk"]);
  is("no type at all still gets the universal ones", sourcesFor(rows, undefined).map(x => x.domain), ["visitdenmark.dk"]);
  ok("a switched-off source is not included", !sourcesFor(rows, "town").some(x => x.domain === "oldnews.dk"));
  is("the same domain twice is once", sourcesFor(rows, "town").filter(x => x.domain === "visitdenmark.dk").length, 1);
  is("universal reads before the exception to it", sourcesFor(rows, "town")[0].domain, "visitdenmark.dk");

  // ── THE BLOCK THAT LANDS IN EVERY PROMPT ─────────────────────────
  const block = sourceRulesBlock(rows, "town");
  ok("it names the domains", /visitdenmark\.dk/.test(block) && /faergen\.dk/.test(block));
  ok("and what each is for, which is most of the value", /the operator's own timetable/.test(block));
  ok("a type-scoped source says so", /for Towns specifically/.test(block));
  // HIS WORD, and the distinction that decides whether this helps at all.
  ok("the instruction is INCLUDE", /INCLUDE these in your search every time/.test(block));
  ok("and it says plainly it is not a restriction", /THIS IS AN ADDITION, NOT A RESTRICTION/.test(block));
  ok("an empty result from one source is called ordinary, not a failure", /keep looking elsewhere rather than reporting that nothing was found/.test(block));
  // The rule this project has spent the most time on: a tourist board page must
  // never beat the operator on the operator's own departure time.
  ok("and it never outranks a venue on its own details", /DO NOT OUTRANK A VENUE ON ITS OWN DETAILS/.test(block));
  // Nothing to say means saying nothing. An empty heading in every prompt
  // teaches the model the section is noise.
  is("no sources means no block at all", sourceRulesBlock([], "town"), "");
  is("and neither does a list of only disabled ones", sourceRulesBlock([{ domain: "x.dk", enabled: false }], "town"), "");

  // ── "VISITCOPENHAGEN IS A GOOD SOURCE BUT PROBABLY NOT FOR AARHUS" ──
  // The type axis alone does not answer it: VisitCopenhagen IS a town source,
  // for exactly one town. Sending it on an Aarhus draft costs money on all seven
  // research calls and invites a Copenhagen page being read as an authority on
  // Aarhus, which is the ferry-route-corrected-with-another-route failure again.
  is("a part of the country is recognised as one", cleanPlace("jutland"), "Jutland");
  is("anything else is treated as a place name", cleanPlace(" Aarhus "), "Aarhus");
  is("and blank means everywhere", cleanPlace(""), "");

  ok("no place means everywhere", placeMatches("", { name: "Aarhus" }));
  ok("a town source matches its own town", placeMatches("Copenhagen", { name: "Copenhagen" }));
  ok("and anywhere inside it", placeMatches("Copenhagen", { name: "Nyhavn", partOf: "Copenhagen" }));
  // A Dragør entry with dayTripFrom Copenhagen IS a Copenhagen trip.
  ok("and anywhere that uses it as a base", placeMatches("Copenhagen", { name: "Dragør", dayTripFrom: "Copenhagen" }));
  ok("an event matches on its host town", placeMatches("Copenhagen", { name: "Distortion", town: "Copenhagen" }));
  // THE ONE HE RAISED.
  ok("but NOT another city", !placeMatches("Copenhagen", { name: "Aarhus" }));
  ok("a part of the country matches by the derived geography", placeMatches("Jutland", { name: "Aarhus", part: "Jutland" }));
  ok("and not by name alone", !placeMatches("Jutland", { name: "Jutland" }));
  ok("nor a different part", !placeMatches("Jutland", { name: "Nyhavn", part: "Zealand" }));
  // Unknown place EXCLUDES, on purpose: leaving one out costs a source, and the
  // search still runs everywhere else. Including a wrong one costs money on
  // every call and invites the wrong-city answer.
  ok("nothing known about the place leaves a scoped source out", !placeMatches("Copenhagen", null));
  ok("and a bare name is enough when it matches", placeMatches("Copenhagen", "Copenhagen"));

  const placed = [
    { id: 1, domain: "visitdenmark.dk", applies_to: "", applies_place: "", enabled: true },
    { id: 2, domain: "visitcopenhagen.com", applies_to: "", applies_place: "Copenhagen", enabled: true },
    { id: 3, domain: "visitaarhus.com", applies_to: "", applies_place: "Aarhus", enabled: true },
  ];
  is("an Aarhus draft gets the national one and Aarhus", sourcesFor(placed, "town", { name: "Aarhus" }).map(x => x.domain), ["visitaarhus.com", "visitdenmark.dk"].sort());
  is("a Copenhagen draft gets Copenhagen, not Aarhus", sourcesFor(placed, "town", { name: "Copenhagen" }).map(x => x.domain).sort(), ["visitcopenhagen.com", "visitdenmark.dk"]);
  is("and a draft with no place known gets only the national one", sourcesFor(placed, "town", null).map(x => x.domain), ["visitdenmark.dk"]);
  ok("the block names the place a scoped source is for", /for Copenhagen specifically/.test(sourceRulesBlock(placed, "town", { name: "Copenhagen" })));
  // One site, listed once. The same domain scoped two ways both match an Odense
  // draft, and paying to tell a model about one site twice is the waste this
  // whole axis exists to remove.
  const twice = [
    { id: 1, domain: "visitfyn.dk", applies_to: "", applies_place: "Odense", enabled: true },
    { id: 2, domain: "visitfyn.dk", applies_to: "", applies_place: "Funen", enabled: true },
  ];
  is("a domain matching two ways is listed once", sourcesFor(twice, "town", { name: "Odense", part: "Funen" }).map(x => x.domain), ["visitfyn.dk"]);
  is("and both still exist for the drafts they each cover", sourcesFor(twice, "town", { name: "Nyborg", part: "Funen" }).map(x => x.domain), ["visitfyn.dk"]);

  // What it costs, because that was the complaint.
  const wide = blockCost(placed, "town", null);
  const narrow = blockCost(placed, "town", { name: "Aarhus" });
  is("an unplaced draft carries fewer sources than a placed one", wide.sources, 1);
  is("and scoping is what makes the difference", narrow.sources, 2);
  ok("the cost is counted per draft, across all seven calls", wide.perDraft === wide.words * 7);
  is("an empty list costs nothing", blockCost([], "town", null), { sources: 0, words: 0, perDraft: 0 });

  // ── EVERY RESEARCH PROMPT, OR THE LIST IS A LIE ──────────────────
  // Six of seven would be worse than none: the seventh would quietly research
  // differently and nothing anywhere would say so.
  const app3 = readFileSync(join(root, "src/App.jsx"), "utf8");
  is("no research prompt reads the constant directly any more", (app3.match(/\$\{RESEARCH_SOURCE_RULES\}/g) || []).length, 1);
  // INTERPOLATIONS only. A bare /researchRules\(/ also matched the sentence in a
  // comment that mentions it, which would have let a real call site be removed
  // while the count stayed right.
  is("and all seven go through researchRules", (app3.match(/\$\{researchRules\(/g) || []).length, 7);
  // FIVE of the seven know where the draft is and say so. The other two are the
  // traveller-facing guide pipeline, which covers several towns at once, so it
  // deliberately carries only the national sources. Written as an exact count so
  // a call site that quietly stops passing its place fails here.
  is("five of them pass the place they know", (app3.match(/\$\{researchRules\([a-zA-Z"]+, [a-zA-Z]+\)\}/g) || []).length, 5);
  is("and two deliberately carry only the universal ones", (app3.match(/\$\{researchRules\(\)\}/g) || []).length, 2);
  ok("which is where the founder's list is folded in", /return `\$\{RESEARCH_SOURCE_RULES\}\$\{both\}\$\{sourceRulesBlock\(founderSources, type, where\)\}`;/.test(app3));
  // The guide pipeline runs for visitors, where no Studio state exists, so the
  // list is loaded app-wide rather than threaded through React state.
  ok("the list is loaded on mount, not only in Studio", /ensureSourcesLoaded\(\)/.test(app3));
  // And the panel tells an expired login apart from a missing table, from day
  // one, rather than learning tonight's lesson a second time.
  ok("a missing table is named as missing", M.supabaseFailure(404, { code: "PGRST205" }) === M.MISSING);
  ok("an expired login is named as a login", /Your Studio login has expired\. Log out and back in\./.test(M.studioErrorMessage("the source list", 401, { code: "PGRST301" })));
  ok("and the SQL is offered only for a genuinely missing table", /sourceError === "MISSING_TABLE" \?/.test(app3));
}

// ── "TAVILY/PERPLEXITY DOES A POOR JOB FINDING THE WEBSITE. IF IT
//     DID, TRANSPORT WOULD BE SOLVED" ──────────────────────────────
// Oliver, 9 Aug 2026, and the diagnosis was right down to the mechanism.
{
  const app14 = readFileSync(join(root, "src/App.jsx"), "utf8");
  const papi = readFileSync(join(root, "api/places-hours.js"), "utf8");

  // Finding a venue's site by web search is guesswork: you get pages that
  // MENTION it and have to pick. Google's listing is the URL the owner
  // registered. That lookup listed five types and left out the one he has spent
  // the day on.
  ok("Google is asked about events now", /\["free", "booking", "food", "foodStreet", "night", "festival", "nightTown"\]\.includes\(sType\)/.test(app14));
  ok("and about nightlife towns", /"festival", "nightTown"\]\.includes\(sType\)/.test(app14));

  // THE ADDRESS WAS BEING THROWN AWAY. The endpoint has returned it all along.
  ok("the endpoint has always returned an address", /address: place\.formattedAddress \|\| "",/.test(papi));
  ok("and the draft finally reads it", /if \(hoursData\.address\) \{/.test(app14));
  ok("handing it to the writer as a verified fact", /VERIFIED ADDRESS \(from Google's own business listing/.test(app14));

  // THE TRANSPORT HALF. The first geocode runs on the NAME, and "Copenhell"
  // geocodes to whatever Google thinks that word means. The address geocodes to
  // the gate, and findRealNearestStation is only as good as the point it gets.
  ok("the coordinates are re-derived from the address", /const exact = await geocodePlace\(hoursData\.address\);/.test(app14));
  ok("and the nearest stop is recomputed from the better point", /const st2 = await findRealNearestStation\(exact\.lat, exact\.lon\);/.test(app14));
  // Never worse than before: a failed second geocode leaves the name-based one
  // standing rather than blanking the entry's location.
  ok("a failed refinement keeps the original", /catch \{ \/\* the name-based geocode above still stands \*\//.test(app14));
  ok("and it only refines when there was something to refine", /if \(exact && frozenGeo\) \{/.test(app14));
}

// ── "UNCONFIRMED EVENTS IN 'COMING EVENTS', WHICH IS RIDICULOUS" ─
// Oliver, 9 Aug 2026, reporting in almost the same words what he reported on
// 7 Aug: "Don't have it showing it in 'coming events' then."
{
  const strip = readFileSync(join(root, "src/components/LiveEventsHeaderStrip.jsx"), "utf8");
  const helpers = readFileSync(join(root, "src/utils/helpers.js"), "utf8");
  // isUpcoming counts an event with NO DATE as upcoming, on purpose, so the
  // browse page can still list a festival whose dates are unannounced.
  ok("isUpcoming still lets an undated event through", /export const isUpcoming = \(d\) => !d \|\|/.test(helpers));
  // isConfirmedUpcoming was written for this on 7 Aug and applied everywhere
  // except the component that renders the words COMING EVENTS.
  ok("the strip uses the strict test", /isConfirmedUpcoming\(e\) && !isCurrentlyLive/.test(strip));
  ok("and never the loose one again", !/isUpcoming\(e\.date\)/.test(strip));

  // ── "REMOVE ANYTHING 2026" ───────────────────────────────────────
  // Two of five Discover candidates had finished in June. The date is in prose
  // inside the hook, because the candidate list has no date field.
  const AUG9 = new Date(2026, 7, 9);
  is("a range gives its LAST day", M.lastDateInText("Held 27-28 June 2026").getDate(), 28);
  is("a single day is that day", M.lastDateInText("on 8 June 2026").getDate(), 8);
  is("a bare month runs to the end of it", M.lastDateInText("June 2026").getDate(), 30);
  ok("nothing parseable is null", M.lastDateInText("a lovely summer event") === null);
  ok("a month with no year is null too, not a guessed year", M.lastDateInText("held in June") === null);

  ok("June is finished by 9 August", M.looksFinished("Held 27-28 June 2026", AUG9));
  // A FESTIVAL IS OVER WHEN IT ENDS. Pride ran 8 to 16 August and was live that
  // day; dropping it would have hidden a real, upcoming candidate.
  ok("but a range spanning today is not", !M.looksFinished("The 2026 Pride programme spans 8-16 August 2026", AUG9));
  ok("nor one starting tomorrow", !M.looksFinished("Scheduled for 8-10 August 2026", AUG9));
  // DROPS ONLY ON CONFIDENCE: a wrongly dropped candidate is a real event he
  // never hears about, a wrongly kept one is a line on a screen.
  ok("an unparseable hook is kept, never dropped", !M.looksFinished("a great little market somewhere on Funen", AUG9));

  const split = M.splitFinishedCandidates([
    { name: "Fødevaremarkedet i Svendborg", hook: "Held 27-28 June 2026, the Nordic region's largest food market." },
    { name: "Folkemødet", hook: "Fills Allinge with dialogue from 11-13 June 2026." },
    { name: "Copenhagen Pride Week", hook: "The 2026 Pride programme spans 8-16 August 2026." },
    { name: "Kalundborg Rocker", hook: "Scheduled for 8-10 August 2026, attendance 21,000." },
    { name: "Fyn rundt", hook: "Preserved wooden ships on a circuit around Funen." },
  ], AUG9);
  is("his own five split two away", split.dropped.length, 2);
  is("and the three still ahead survive", split.kept.map(c => c.name), ["Copenhagen Pride Week", "Kalundborg Rocker", "Fyn rundt"]);

  const app13 = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("discovery drops them in code, not only in a prompt", /splitFinishedCandidates\(fresh, new Date\(\)\)/.test(app13));
  // A rule the model can forget is not a filter, but the paid call should stop
  // returning them either.
  ok("and the extractor is told as well", /SKIP ANY EVENT WHOSE EDITION HAS ALREADY FINISHED/.test(app13));
  ok("with today's date, since the rule refers to it", /TODAY'S DATE: \$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}/.test(app13));
  // NEVER A SILENTLY SHORTER LIST.
  ok("the panel says how many it removed", /left out because that edition has already finished/.test(app13));
}

// ── "IT'S FOR JUNE 2026" ────────────────────────────────────────
// Oliver, 9 Aug 2026, having drafted Copenhell in August and got the edition
// that finished eight weeks earlier. Nothing lied: in August, the most findable
// dates for a June festival are June's. The entry is correct and INVISIBLE,
// because every events grid shows upcoming events only.
{
  const AUG = new Date(2026, 7, 9);   // the day he asked

  is("a real date parses", M.parseEventDate("2026-06-17")?.getFullYear(), 2026);
  is("and a written one", M.parseEventDate("17 June 2026")?.getFullYear(), 2026);
  // NULL RATHER THAN A GUESS: an unparseable date must not be treated as past
  // OR future, because both are decisions it has no basis for.
  ok("nonsense is null, never a guess", M.parseEventDate("summer sometime") === null);
  ok("and an unreadable date is not called past", !M.isPastDate("summer sometime", AUG));

  ok("June is past in August", M.isPastDate("2026-06-20", AUG));
  ok("September is not", !M.isPastDate("2026-09-01", AUG));
  // Today counts as upcoming. An event happening tonight is not over.
  ok("today is not past", !M.isPastDate("2026-08-09", AUG));

  // THE COPENHELL CASE, exactly.
  const copenhell = { name: "Copenhell", date: "2026-06-17", dateEnd: "2026-06-20" };
  const issues = M.eventDateIssues(copenhell, AUG);
  ok("a finished edition is flagged", issues.some(m => /already finished/i.test(m)));
  // The surprising half, and the reason this is worth a warning: it is not
  // wrong, it is unreachable.
  ok("and the reason given is that nobody can see it", issues.some(m => /INVISIBLE/.test(m)));
  is("with the year a reader would actually want", M.nextEditionYear("2026-06-17", AUG), 2027);
  is("nothing wrong with a future edition", M.eventDateIssues({ date: "2027-06-16", dateEnd: "2027-06-19" }, AUG), []);

  // A MULTI-DAY FESTIVAL IS OVER WHEN IT ENDS, not when it starts. Reading the
  // start date alone would call a festival running right now "finished".
  is("a festival happening across today is not finished",
     M.eventDateIssues({ date: "2026-08-07", dateEnd: "2026-08-11" }, AUG), []);
  ok("no date at all is its own problem", M.eventDateIssues({}, AUG).some(m => /never appears/i.test(m)));
  ok("an end before the start is caught", M.eventDateIssues({ date: "2026-09-10", dateEnd: "2026-09-02" }, AUG).some(m => /before the start/i.test(m)));

  is("already published rows that have run out are countable",
     M.staleEvents([
       { payload: { date: "2026-06-17", dateEnd: "2026-06-20" } },
       { payload: { date: "2026-09-01" } },
       { payload: { date: "2026-08-07", dateEnd: "2026-08-11" } },
       { payload: {} },
     ], AUG).length, 1);

  const app12 = readFileSync(join(root, "src/App.jsx"), "utf8");
  // THE PROMPT HALF. A guard that only catches it after the draft still costs a
  // full research pass every time.
  ok("research is told to find the next edition", /const NEXT_EDITION_RULES = /.test(app12));
  ok("and it carries in the standing rules", /\$\{NEXT_EDITION_RULES\}/.test(app12));
  // The honest answer when next year is not announced, which in August is the
  // normal case, is to say so rather than to publish last year's.
  ok("not announced yet is a real answer", /IF NEXT YEAR'S DATES ARE NOT ANNOUNCED YET, SAY THAT PLAINLY/.test(app12));
  // A guessed date on a ticketed event sends somebody to a checkout that does
  // not exist.
  ok("and a year is never carried forward by arithmetic", /NEVER carry a year forward by arithmetic/.test(app12));
  ok("the draft panel refuses to let it pass quietly", /THIS DATE WILL NOT SHOW ON THE SITE/.test(app12));
  ok("and only for events", /studioType === "festival" && \(\(\) => \{\n\s+const issues = eventDateIssues/.test(app12));
}

// ── "HELLERUP AN AREA? AND DRAGØR A VILLAGE?" ───────────────────
// Oliver, 9 Aug 2026: "I wanna be able to change this manually." All 31
// published towns carry a STORED placeKind, so these are judgements a model made
// once at draft time that then became permanent.
{
  is("a real kind is kept", M.cleanPlaceKind("Village"), "village");
  is("anything else is not invented into one", M.cleanPlaceKind("hamlet"), "");
  is("and blank means not set", M.cleanPlaceKind(""), "");

  // A RELATION FIELD HOLDS A NAME. His live data has a Dragør row storing
  // dayTripFrom "Day trip from Copenhagen": the field IS that phrase, so the
  // value is the half that is left.
  is("the phrase the field already means is stripped", M.cleanRelation("Day trip from Copenhagen"), "Copenhagen");
  is("with a hyphen too", M.cleanRelation("Day-trip from Aarhus"), "Aarhus");
  is("and a leading preposition", M.cleanRelation("near Odense"), "Odense");
  is("a plain name is untouched", M.cleanRelation("Copenhagen"), "Copenhagen");
  is("a two word name survives", M.cleanRelation("Nykøbing Falster"), "Nykøbing Falster");
  is("trailing punctuation goes", M.cleanRelation("Copenhagen."), "Copenhagen");
  // REFUSED RATHER THAN STORED. A relation nothing can match is worse than an
  // empty one: empty renders nothing, wrong renders a link to a town that does
  // not exist.
  is("a sentence is refused", M.cleanRelation("It is a short bus ride from the centre of town"), "");
  is("and so is anything with sentence punctuation", M.cleanRelation("Copenhagen; about 12 km"), "");
  is("nothing in, nothing out", M.cleanRelation(""), "");

  // ── AN AREA IS INSIDE SOMETHING, BY DEFINITION ─────────────────
  // The Hellerup case exactly: area, no parent, so the card prints NO PARENT
  // SET. It is the only kind that makes a claim about a second place.
  const hellerup = { name: "Hellerup", placeKind: "area", partOf: "", dayTripFrom: "Copenhagen" };
  ok("an area with no parent is flagged", M.placeIssues(hellerup).some(m => /nothing says what it is inside/i.test(m)));
  is("giving it a parent settles it", M.placeIssues({ ...hellerup, partOf: "Gentofte", dayTripFrom: "" }), []);
  // And the fix he would actually make: it is not an area at all.
  is("calling it a town settles it too", M.placeIssues({ name: "Hellerup", placeKind: "town", partOf: "", dayTripFrom: "Copenhagen" }), []);

  ok("no kind at all is called out", M.placeIssues({ name: "X" }).some(m => /No kind set/.test(m)));
  ok("a city inside another place is a contradiction", M.placeIssues({ name: "X", placeKind: "city", partOf: "Copenhagen" }).some(m => /not a city/.test(m)));
  ok("inside itself is caught", M.placeIssues({ name: "Aarhus", placeKind: "area", partOf: "Aarhus" }).some(m => /inside itself/.test(m)));
  // Across languages, because the parent may be typed in either.
  ok("inside itself in the other language too", M.placeIssues({ name: "København", placeKind: "area", partOf: "Copenhagen" }).some(m => /inside itself/.test(m)));
  ok("a day trip from itself is caught", M.placeIssues({ name: "Odense", placeKind: "town", dayTripFrom: "Odense" }).some(m => /from itself/.test(m)));
  ok("both a parent and a base is noise", M.placeIssues({ name: "X", placeKind: "area", partOf: "Copenhagen", dayTripFrom: "Roskilde" }).some(m => /day-trip base is noise/.test(m)));
  ok("a sentence in the base is named with the value", M.placeIssues({ name: "Dragør", placeKind: "town", dayTripFrom: "Day trip from Copenhagen" }).some(m => /reads as a sentence/.test(m)));

  // ── THE PATCH IS THREE FIELDS, NOT THE PAYLOAD ─────────────────
  const row = { name: "Dragør", placeKind: "village", partOf: "", dayTripFrom: "Copenhagen", desc: "keep me" };
  is("only what changed is sent", M.placePatch(row, { placeKind: "town", partOf: "", dayTripFrom: "Copenhagen" }), { placeKind: "town" });
  is("nothing changed means nothing sent", M.placePatch(row, { placeKind: "village", partOf: "", dayTripFrom: "Copenhagen" }), {});
  ok("and the button knows", !M.hasPlaceChange(row, { placeKind: "village", partOf: "", dayTripFrom: "Copenhagen" }));
  ok("but knows when there is one", M.hasPlaceChange(row, { placeKind: "town", partOf: "", dayTripFrom: "Copenhagen" }));
  // The sentence is cleaned on the way in, so saving fixes it rather than
  // storing it a second time.
  is("a sentence is cleaned by the patch", M.placePatch(row, { placeKind: "village", partOf: "", dayTripFrom: "Day trip from Copenhagen" }), {});
  is("and a real change to it is stored clean", M.placePatch(row, { placeKind: "village", partOf: "", dayTripFrom: "Day trip from Aarhus" }), { dayTripFrom: "Aarhus" });

  // ── THE SAME PLACE PUBLISHED TWICE ─────────────────────────────
  // In his live data: Dragør as rows 50 and 72, Samsø as 24 and 79. liveContent
  // keeps whichever comes first, so an edit to the other one changes nothing and
  // looks exactly like editing being broken.
  const rows = [
    { id: 24, type: "town", payload: { name: "Samsø" } },
    { id: 50, type: "town", payload: { name: "Dragør" } },
    { id: 72, type: "town", payload: { name: "Dragør" } },
    { id: 79, type: "town", payload: { name: "Samsø" } },
    { id: 80, type: "town", payload: { name: "Odense" } },
  ];
  is("both duplicate pairs are found", M.duplicateNames(rows).length, 2);
  is("and a place published once is not one", M.duplicateNames(rows).flat().some(r => r.id === 80), false);
  is("a different type with the same name is not a duplicate",
     M.duplicateNames([{ id: 1, type: "town", payload: { name: "Skagen" } }, { id: 2, type: "festival", payload: { name: "Skagen" } }]).length, 0);

  const app11 = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the editor exists on town rows", /row\.type === "town" && \(/.test(app11));
  ok("it patches the three fields rather than the whole payload", /const patch = placePatch\(row\.payload \|\| \{\}, placeDraft\);/.test(app11));
  ok("through the one auth helper", /savePlaceEdit[\s\S]{0,900}\.\.\.studioAuth\(\)/.test(app11));
  ok("and warns when the row is one of several", /is published \{dupes\.length\} times/.test(app11));
}

// ── "1 SOURCE... WOULD INSTANTLY MAKE PEOPLE DELETE THE APP" ─────
// Oliver, 9 Aug 2026, on the Distortion page: a panel promising primary
// sourceS, plural, above a header reading "1 source".
{
  const sc = readFileSync(join(root, "src/utils/studioContent.js"), "utf8");
  const hwk = readFileSync(join(root, "src/components/HowWeKnow.jsx"), "utf8");

  // THE CAUSE. shapeForLive is an allow-list and __sources was not on it, so
  // publish threw away the source list the research had already built. Zero of
  // 79 live rows carried it, which is why every entry said one.
  ok("publish carries the source list through", /return sources\.length \? \{ \.\.\.shaped, __sources: sources \} : shaped;/.test(sc));
  ok("the allow-list is still an allow-list, with one named exception", /shapeForLiveFields/.test(sc));
  ok("only real http links survive", /\/\^https\?:\\\/\\\/\/i\.test\(u\)/.test(sc));
  // Absent rather than empty, so the panel never draws a heading over no links.
  ok("nothing to show means the field is absent, not empty", /: shaped;/.test(sc));

  // THE WORDING. One known page is named for what it is. A count is only a
  // count when the number is worth printing.
  ok("a single source is never rendered as the number one", /sourceCount > 1 \? `\$\{sourceCount\} sources` : sourceCount === 1 \? "Official site" : null/.test(hwk));
  // And the paragraph has to agree with what is under it, or it reads as a
  // boast the page immediately contradicts.
  ok("the claim of plural sources is conditional", /\{sourceCount > 1 \? \(/.test(hwk));
  ok("and the single-source case says why", /before we started saving the full list of pages the research/.test(hwk));
  // The pages the research opened count too, not just the official site and
  // the corrections. They were being left out of the total entirely.
  ok("the total counts the pages the research opened", /\.\.\.sources\.map\(u => hostOf\(u\)\)/.test(hwk));
}

// ── "IS STILL SAYS THIS!!!!!!!" ──────────────────────────────────
// Oliver, 9 Aug 2026, pasting the gemlyx_research setup SQL back for the second
// time, having already run it. He was right both times. The panel was reading a
// 401 and mapping it straight to "missing", so it printed a create-table script
// at a founder whose table exists. Fourth time for this bug class.
{
  const app10 = readFileSync(join(root, "src/App.jsx"), "utf8");
  // A 401 is a login. Only PGRST205 and a real 404 mean the relation is absent.
  is("a bad token is a login problem", M.supabaseFailure(401, { code: "PGRST301" }), M.EXPIRED);
  is("but a 403 is the database refusing an accepted token", M.supabaseFailure(403, null), M.REFUSED);
  is("the JWT code decides on its own, whatever status arrives with it",
     M.supabaseFailure(400, { code: "PGRST301" }), M.EXPIRED);
  is("and PGRST302 the same way", M.supabaseFailure(200, { code: "PGRST302" }), M.EXPIRED);
  is("a missing relation is a missing relation", M.supabaseFailure(404, { code: "PGRST205" }), M.MISSING);
  is("named in the message rather than the code", M.supabaseFailure(400, { message: "relation does not exist" }), M.MISSING);
  is("and everything else stays honest about not knowing", M.supabaseFailure(500, null), M.OTHER);
  is("a null body never throws", M.supabaseFailure(500, null), M.OTHER);
  is("nor a string one", M.supabaseFailure(500, "boom"), M.OTHER);

  // THE LINE HE SAW. It mapped 401 to "missing" and there is now a test that
  // fails if anything writes it again.
  ok("no panel decides for itself that a 401 is a missing table",
     !/status === 401 \|\| \w+\.status === 404 \? "missing"/.test(app10));
  ok("the research panel classifies through the shared helper", /const researchStatusFor = supabaseFailure;/.test(app10));
  // Three states, three different sentences. The SQL block renders under exactly
  // one of them.
  ok("an expired login says so and offers no SQL", /Your Studio login has expired<\/b> \(\{researchMemory\.detail\}\)\. Log out and back in\./.test(app10));
  // ── "I HAVE LOGGED OUT AND IN" ───────────────────────────────────
  // 401 and 403 were one branch, so a request the database REFUSED told him to
  // log in again, which cannot ever fix it. A fresh login is only advice for a
  // 401.
  is("a 403 is not an expired login", M.supabaseFailure(403, null), M.REFUSED);
  is("nor is a Postgres permission denial", M.supabaseFailure(400, { code: "42501" }), M.REFUSED);
  ok("and it is never told to log in again", !/log in again/i.test(M.studioErrorMessage("the facts", 403, null)));
  ok("it is named as a policy instead", /row level security policy/i.test(M.studioErrorMessage("the facts", 403, null)));
  ok("the panel has its own branch for it", /researchMemory\.status === REFUSED \?/.test(app10));
  // THE EVIDENCE, which was missing from the branch most likely to need it: the
  // expired message printed advice and swallowed the status code entirely.
  is("every branch prints the status it saw", (app10.match(/\(\{researchMemory\.detail\}\)/g) || []).length, 4);
  ok("and the panel can run the query itself", /const checkResearchTable = async \(\) => \{/.test(app10));
  ok("reporting the raw status and code, not a verdict", /HTTP \$\{res\.status\}\$\{code \? ` · \$\{code\}` : ""\}/.test(app10));
  ok("a genuinely missing table is the only branch that shows SQL", /=== MISSING \? \([\s\S]{0,600}\{RESEARCH_SQL\}/.test(app10));
  is("and the SQL appears exactly once, in that branch", (app10.match(/\{RESEARCH_SQL\}/g) || []).length, 1);
  // Re-runnable, same lesson gemlyx_sources taught this morning: Supabase runs
  // the editor as one transaction, so "policy already exists" rolls back the lot.
  ok("the research SQL can be run twice", /drop policy if exists "auth all gemlyx_research"/.test(app10));
}

// ── "EVENTS HAVE TWO 'MUSICS'" ───────────────────────────────────
// Oliver, 9 Aug 2026, pasting the row back exactly as it rendered:
// "CultureFestivalMusicMusic / Festival / CultureMusic Festival". Six pills for
// four ideas, built by de-duplicating a free-text field. Region pills again.
{
  // THE REAL STORED VALUES, counted from the live table on 9 Aug.
  const LIVE = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: i, type: "Music" })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, type: "Festival" })),
    { id: 200, type: "Culture" }, { id: 201, type: "Culture" },
    { id: 202, type: "Music Festival" }, { id: 203, type: "Music Festival" },
    { id: 204, type: "Music / Festival" },
    { id: 205, type: "Music / Festival / Culture" },
    { id: 206, type: "Viking Market" },
    { id: 207, type: "Viking Festival" },
  ];

  is("the eight spellings collapse to four real types",
     M.eventTypesPresent(LIVE), ["music", "viking", "market", "culture"]);
  // The exact defect he pasted: two pills starting with Music.
  is("only one of them is Music", M.eventTypesPresent(LIVE).filter(t => t === "music").length, 1);
  ok("and no pill is a sentence", M.eventTypesPresent(LIVE).every(t => !/[/]/.test(t)));

  // MULTI-VALUED, because the data already is. Forcing one bucket per event is
  // what produced the combined pills.
  is("one event can make two claims", M.eventTypesOf({ type: "Music / Festival / Culture" }), ["music", "culture"]);
  is("a phrase is read whole, not split on spaces", M.eventTypesOf({ type: "Music Festival" }), ["music"]);
  is("Viking Market is both", M.eventTypesOf({ type: "Viking Market" }), ["viking", "market"]);

  // "FESTIVAL" IS THE NOUN, NOT A TYPE. Every row on that page is a festival,
  // so a Festival pill selects everything and says nothing. It was one of six.
  is("the word that carries no information maps to nothing", M.eventTypesOf({ type: "Festival" }), []);
  is("and neither does an empty type", M.eventTypesOf({ type: "" }), []);
  is("nor a missing one", M.eventTypesOf({}), []);
  ok("the uninformative words are written down, not silently unmatched", M.UNINFORMATIVE.test("festival"));
  // THE GUARD AS AN INVARIANT. Mutation testing showed the branch itself could
  // not fire, because no rule matches "Festival" today. This is what it is
  // really protecting: add a `festival` rule, or loosen `culture` to catch
  // "Kulturfest", and the pill that selects everything comes straight back.
  ok("no type in the vocabulary is itself an uninformative word", M.EVENT_TYPES.every(t => !M.UNINFORMATIVE.test(t)));
  is("six of the live rows have no filable type", M.untypedEvents(LIVE).length, 6);
  // Those six are still reachable. A filter that hides rows it cannot classify
  // is worse than one that admits it does not know.
  is("but every event is still under All", LIVE.length, 26);

  // ── "SOME OF THEM ARE THE COMPLETE SAME" ─────────────────────────
  // Oliver, 9 Aug 2026: "Festival and Music is the same as music." Exactly, and
  // this is the assertion that says so: three different stored spellings, one
  // pill. It fails the moment anything reintroduces a per-spelling bucket.
  is("Music, Music Festival and Music / Festival are one pill",
     [...new Set([
       JSON.stringify(M.eventTypesOf({ type: "Music" })),
       JSON.stringify(M.eventTypesOf({ type: "Music Festival" })),
       JSON.stringify(M.eventTypesOf({ type: "Music / Festival" })),
     ])].length, 1);

  // ── EVERY BOUNDARY IS A DECISION, AND THE FIRST SET WAS WRONG ────
  // `/\bmusic|rock|...|metal|dj\b/i` reads as though it anchors both ends and
  // does not: in an alternation \b binds only to the branch it touches. So
  // everything between music and dj was an unanchored substring, and checking
  // against real strings classified "Metalworking workshop" as MUSIC and
  // "Remarked" as a MARKET.
  is("a metalworking event is not music", M.eventTypesOf({ type: "Metalworking workshop" }), []);
  is("and remarked is not a market", M.eventTypesOf({ type: "Remarked" }), []);
  is("nor is a fairground a fair", M.eventTypesOf({ type: "Fairground ride" }), []);
  is("an artisan market is a market, not art", M.eventTypesOf({ type: "Artisan market" }), ["market"]);
  // DANISH COMPOUNDS GLUE THE WORDS TOGETHER, so the category is a suffix with
  // no boundary in front of it. Anchoring both ends would miss every one.
  is("a Danish market compound still matches", M.eventTypesOf({ type: "Julemarked" }), ["market"]);
  is("and one that is two categories at once", M.eventTypesOf({ type: "Vikingemarked" }), ["viking", "market"]);
  is("Rockfestival is music", M.eventTypesOf({ type: "Rockfestival" }), ["music"]);
  is("Kunstfestival is art", M.eventTypesOf({ type: "Kunstfestival" }), ["art"]);
  is("Kulturnat is culture", M.eventTypesOf({ type: "Kulturnat" }), ["culture"]);

  ok("an event matches its own type", M.hasEventType({ type: "Music" }, "music"));
  ok("and not another", !M.hasEventType({ type: "Music" }, "viking"));
  ok("no type selected matches everything", M.hasEventType({ type: "Festival" }, null));

  const counts = M.eventTypeCounts(LIVE, M.eventTypesPresent(LIVE));
  is("music counts every spelling of it", counts.music, 16);
  is("viking counts both of its events", counts.viking, 2);
  is("culture counts the plain ones and the combined one", counts.culture, 3);

  const app8 = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the events row is built from the vocabulary", /eventTypesPresent\(upcomingInTab\)/.test(app8));
  ok("and never again from a Set over free text", !/^\s*\.\.\.\[\.\.\.new Set\(upcomingInTab/m.test(app8));
  is("the predicate and the count helper agree about matching a type",
     (app8.match(/\(!eventType \|\| hasEventType\(e, eventType\)/g) || []).length, 2);

  // ── "REMOVE THE VIKING SECTION AND MAKE IT A FILTER INSTEAD" ─────
  // It was worse than redundant. data/events.js says in its own comment that
  // nothing publishes into vikingEvents, and the array is empty, so the tab
  // rendered an empty grid while the two real Viking events sat under Local.
  const evData = readFileSync(join(root, "src/data/events.js"), "utf8");
  ok("the array it read is genuinely empty", /export const vikingEvents = \[\];/.test(evData));
  ok("the tab is gone", !/id: "viking", label: "Viking"/.test(app8));
  ok("and the tab source no longer reads the dead array", !/eventTab === "viking" \? vikingEvents/.test(app8));
  ok("Viking survives as a type", M.EVENT_TYPES.includes("viking"));

  // ── COUNTS ON EVERY PILL ─────────────────────────────────────────
  ok("the month pills carry their count", /label=\{`\$\{m\} \$\{n\}`\}/.test(app8));
  ok("the type pills carry theirs", /label=\{`\$\{eventTypeLabelFor\(f\)\} \$\{n\}`\}/.test(app8));

  // "Soonest is so awkward English." It is, and it did not even rhyme with its
  // own pair: a superlative next to an adjective. Both say what it is ordered BY.
  ok("the sort says what it orders by", /label="By date"/.test(app8) && /label="By name"/.test(app8));
  ok("and the awkward one is gone", !/label="Soonest"/.test(app8));
}

// ── "WHY IS THAT 'OFF THE USUAL ROUTE' AND 'CAN'T MISS OUT'?" ────
// Oliver, 9 Aug 2026: "Shouldn't it be 'trendy' and 'off the usual route'
// then?" Right, and the heading was lying about the field.
{
  const app9 = readFileSync(join(root, "src/App.jsx"), "utf8");
  // The stored field is a RECOMMENDATION STRENGTH, top to bottom. There is no
  // fame field: popularityTag is undefined on all 31 published towns.
  is("the tier vocabulary is a recommendation ladder", M.TIERS.map(t => t.id), ["must", "high", "worth", "nearby"]);
  is("read off the entry", M.tierOf({ tier: "Can't Miss Out" }).id, "must");
  is("loosely, because 71 rows spell it differently", M.tierOf({ tier: "cant miss out" }).id, "must");
  is("and an unknown tier is null, never a guess", M.tierOf({ tier: "Quite Good" }), null);

  ok("the heading no longer claims to be about fame", !/<Row title="How well known">/.test(app9));
  ok("it says what the field means", /<Row title="Worth the trip">/.test(app9));
  // THE OLD PILL WAS NOT READING ANYTHING. "Off the usual route" was implemented
  // as the negation of can't-miss, which selected 29 towns out of 31. A pill
  // that keeps 94% of the list is a label pretending to be a filter.
  ok("the invented fame pill is gone", !/label: "◆ Off the usual route"/.test(app9));
  ok("and the row offers the four real tiers", /TIERS\.map\(x => \(\{ id: x\.id/.test(app9));
  ok("filtering asks the entry's own tier", /tierOf\(t\)\?\.id === townKind/.test(app9));

  // "Why are they the only ones that have no numbers." Because this helper did
  // not exist. Themes and sizes had one; the tier row did not.
  ok("the tier row has a count helper now", /const nWithKind = \(k\) =>/.test(app9));
  ok("counted with the other filters and never with itself",
     /const nWithKind = \(k\) => towns\.filter\(t => base\(t\) && townSizeOk\(t\) && townThemeOk\(t\)/.test(app9));
  ok("and the pills print it", /label=\{`\$\{k\.label\} \$\{nWithKind\(k\.id\)\}`\}/.test(app9));
}

// ── "I AM NOT SATISFIED WITH THE FILTERS" ────────────────────────
// Oliver, 9 Aug 2026: "This will become an issue down the line. Especially on
// phone." Six labelled groups and twenty-five pills, permanently expanded, for a
// nine-item list. The fix is not a nicer panel, it is a page that grows into its
// controls instead of wearing them early.
{
  const items = [
    { name: "Assistens", city: "Copenhagen", kind: "free" },
    { name: "Superkilen", city: "Copenhagen", kind: "free" },
    { name: "Smedje", city: "Aarhus", kind: "craft" },
    { name: "Ærøskøbing Væveri", city: "Ærøskøbing", kind: "craft" },
  ];
  const FACETS = [
    { key: "city", label: "City", options: [{ value: "All", label: "All" }, { value: "Copenhagen", label: "Copenhagen" }, { value: "Aarhus", label: "Aarhus" }], test: (i, v) => i.city === v },
    { key: "kind", label: "Type", options: [{ value: "All", label: "All" }, { value: "free", label: "Free" }, { value: "craft", label: "Bookable" }], test: (i, v) => i.kind === v },
  ];

  // ── THE THRESHOLD READS THE UNFILTERED TOTAL ─────────────────────
  // The obvious implementation reads the visible count, and then narrowing a
  // long list past the threshold HIDES THE CONTROLS THAT NARROWED IT, stranding
  // the user in a short list they cannot widen and cannot explain.
  ok("a long list gets filters", M.showFilters(40));
  ok("a short one does not", !M.showFilters(9));
  ok("the boundary is exclusive", !M.showFilters(M.FILTER_THRESHOLD));
  ok("one past it turns them on", M.showFilters(M.FILTER_THRESHOLD + 1));

  is("no filter set means everything", M.applyFacets(items, FACETS, {}).length, 4);
  is("All is not a filter", M.applyFacets(items, FACETS, { city: "All" }).length, 4);
  is("nor is an empty string", M.applyFacets(items, FACETS, { city: "" }).length, 4);
  is("one facet narrows", M.applyFacets(items, FACETS, { city: "Copenhagen" }).length, 2);
  is("two facets narrow together", M.applyFacets(items, FACETS, { city: "Copenhagen", kind: "craft" }).length, 0);

  // ── COUNTS EXCLUDE THEIR OWN FACET ───────────────────────────────
  // Counting City with City applied gives every unselected city a zero, which
  // reads as "nothing in Aarhus" when it means "you picked Copenhagen".
  const cityCounts = M.facetCounts(items, FACETS, { city: "Copenhagen" }, "city");
  is("the selected city still counts its own", cityCounts.Copenhagen, 2);
  is("and the others are counted as if it were not selected", cityCounts.Aarhus, 1);
  is("All counts the whole remaining pool", cityCounts.All, 4);
  // The other facet DOES constrain, which is the half that makes counts useful.
  const kindCounts = M.facetCounts(items, FACETS, { city: "Copenhagen" }, "kind");
  is("a type with nothing in the chosen city counts zero", kindCounts.craft, 0);
  is("and one with something counts it", kindCounts.free, 2);
  is("an unknown facet key returns nothing", M.facetCounts(items, FACETS, {}, "nope"), {});

  // ── THE CHIPS, WHICH 66% OF MOBILE SITES DO NOT HAVE ─────────────
  is("nothing applied means no chips", M.appliedChips(FACETS, {}), []);
  is("All is not an applied filter", M.appliedChips(FACETS, { city: "All" }), []);
  is("an applied facet becomes one chip", M.appliedChips(FACETS, { city: "Aarhus" }).map(c => c.label), ["Aarhus"]);
  is("carrying the key that clears it", M.appliedChips(FACETS, { city: "Aarhus" })[0].key, "city");
  is("and which facet it came from", M.appliedChips(FACETS, { city: "Aarhus" })[0].facet, "City");
  is("two applied means two chips", M.activeFacetCount(FACETS, { city: "Aarhus", kind: "craft" }), 2);

  is("clearing one leaves the other", M.clearFacet({ city: "Aarhus", kind: "craft" }, "city"), { kind: "craft" });
  // SORT IS NOT A FILTER. It changes the order, never the contents, so a
  // "clear all" that resets it is quietly doing two different things.
  is("clear all clears the facets and leaves the sort", M.clearAllFacets(FACETS, { city: "Aarhus", kind: "craft", sort: "near" }), { sort: "near" });

  // Search, which is what a short list actually needs instead of a panel.
  ok("an empty query matches everything", M.matchesQuery(items[0], "", []));
  ok("folding means the letters are optional", M.matchesQuery(items[3], "aeroskobing", []));
  ok("and a place found under its other name", M.matchesQuery({ name: "København" }, "copenhagen", []));
  ok("every word must appear, so a second word narrows", !M.matchesQuery(items[0], "assistens aarhus", ["city"]));
  ok("and both matching still matches", M.matchesQuery(items[0], "assistens copenhagen", ["city"]));

  const app7 = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the attractions page asks before drawing controls", /showFilters\(/.test(app7));
  ok("and it is handed the unfiltered total", /showFilters\(combined\.length\)/.test(app7));
  ok("applied filters come back as removable chips", /appliedChips\(/.test(app7));
  ok("with counts that exclude their own facet", /facetCounts\(/.test(app7));
}

// ── "WHY IS MY NIGHTLIFE TOWN NOT PUBLISHED IN NIGHTLIFE?" ────────
// Oliver, 8 Aug 2026: "I just published Copenhagen." The tab's town list was
// built from VENUES only, and a published town entry was read solely by a
// .find() that decorated a row a BAR had already put on the page.
//
// EXTRACTED FROM THE JSX ON PURPOSE. A regex assertion would have passed
// against the broken version too: `townList` and `nightlifeTowns.find` both
// existed in it. The only test that catches this is one that can be handed
// spots and towns and asked what comes back.
{
  const bars = [
    { id: 1, name: "Kind of Blue", location: "Ravnsborggade, Copenhagen", type: "Local" },
    { id: 2, name: "Bee Haven", location: "Copenhagen city centre", type: "International" },
    { id: 3, name: "Herr Bartels", location: "Aarhus", type: "Local" },
  ];
  const pages = [{ name: "Copenhagen", desc: "Scene guide" }];

  // THE BUG, in one assertion. Aalborg has a published scene guide and no bars.
  is("a town with only a scene guide still reaches the page",
     M.nightlifeTownList([], [{ name: "Aalborg" }]), ["Aalborg"]);
  is("a town with only venues still does", M.nightlifeTownList(bars, []).sort(), ["Aarhus", "Copenhagen"]);
  is("and a town with both is listed once", M.nightlifeTownList(bars, pages).sort(), ["Aarhus", "Copenhagen"]);
  is("nothing published is genuinely nothing", M.nightlifeTownList([], []), []);

  // ONE TOWN, NOT TWO. He types Copenhagen in Studio; a venue's location may
  // carry the Danish spelling, and two rows for one city is its own bug.
  is("the two spellings of the capital are one row",
     M.nightlifeTownList([{ id: 1, location: "Københavns Nordvest", type: "Local" }], [{ name: "Copenhagen" }]).length, 1);
  is("a Danish-spelled venue groups with the English city",
     M.townOfLocation("Københavns Nordvest"), "Copenhagen");
  is("and the old spelling of Aarhus too", M.townOfLocation("Århus C"), "Aarhus");
  is("a location with no known city falls back to the last comma part",
     M.townOfLocation("Havnegade, Svendborg"), "Svendborg");
  is("a bare location is used as it stands", M.townOfLocation("Svendborg"), "Svendborg");
  is("and an empty location groups nowhere", M.townOfLocation(""), "");

  const groups = M.groupSpotsByTown(bars);
  is("venues group under their city", groups.Copenhagen.map(b => b.id).sort(), [1, 2]);
  // THE CRASH ONE CLICK LATER. The old code indexed the map directly and called
  // .filter on the result, so opening a town with a scene guide and no bars
  // threw and took the page down.
  is("a town with no venues returns an empty list, never undefined", M.spotsForTown(groups, "Aalborg"), []);
  is("and so does a missing group object", M.spotsForTown(null, "Aalborg"), []);
  is("a town looked up in the other language still finds its venues",
     M.spotsForTown(groups, "København").map(b => b.id).sort(), [1, 2]);
  is("the scene guide is found across spellings too", M.townPageFor(pages, "København")?.name, "Copenhagen");
  is("and a town with no guide has none", M.townPageFor(pages, "Aarhus"), undefined);

  const app6 = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the tab builds its list from both kinds of entry", /nightlifeTownList\(nightlifeSpots, nightlifeTowns\)/.test(app6));
  ok("and never indexes the group map raw again", !/townGroups\[nightlifeTownView\]/.test(app6));
  // The empty state named only spots, which reads as "nothing is published" to
  // somebody who has just published a town.
  ok("the empty state no longer says only spots", !/No nightlife spots published yet\. They appear here/.test(app6));
  ok("it names towns and venues both", /Towns and venues both appear as soon as they go live/.test(app6));
  ok("a town with a guide and no bars says what IS there", /Scene guide, no venues published yet/.test(app6));
}

// ── "IT'S SUCH A NERD WORD TO BE USING SO MUCH" ───────────────────
// Oliver, 8 Aug 2026, on "actually". Not a cliché to ban outright, a crutch to
// count: it is a real word when it corrects an expectation the reader holds.
{
  is("one use is not a tic", M.fillerWordCounts("The door is actually round the back."), {});
  is("two is", M.fillerWordCounts("It is actually free, and actually open late."), { actually: 2 });
  // WORD BOUNDARIES, not substrings. AI_TELL_PHRASES can use indexOf because
  // its entries are multi-word; a bare word inside another word cannot.
  is("a word inside another word is not a hit", M.fillerWordCounts("factually factually factually"), {});
  is("case does not matter", M.fillerWordCounts("Actually. actually."), { actually: 2 });
  is("nothing in, nothing out", M.fillerWordCounts(""), {});
  ok("the word he named is on the list", M.FILLER_WORDS.includes("actually"));
  // KEPT OFF the outright-ban list on purpose: everything there is never right,
  // and this one sometimes is. Merging them would make two uses of "actually"
  // count toward the threshold that marks an entry as a high-severity problem.
  ok("and deliberately NOT on the outright-ban list", !M.AI_TELL_PHRASES.includes("actually"));

  const tic = M.auditEntry({ id: 9, type: "town", payload: {
    name: "Somewhere", desc: "It is actually free. The bakery is actually good. Actually worth the trip.",
    region: "Funen", __lat: 55.4, __lon: 10.4,
  } });
  const voice = tic.findings.filter(f => f.field === "voice");
  ok("an entry leaning on it is flagged", voice.some(f => /filler words/i.test(f.detail || f.why || JSON.stringify(f))));
  ok("but only as a style note, never as a hard problem", voice.every(f => f.severity !== "critical"));

  // The writer is told, which is the half that stops it happening again. A ban
  // list only catches what has already been written.
  const voiceRules = readFileSync(join(root, "src/utils/studioContent.js"), "utf8");
  ok("the voice rules name it outright", /FILLER WORDS THAT SOUND LIKE THINKING OUT LOUD/.test(voiceRules));
  ok("with the test for when it is real", /the entrance looks closed, it is actually round the back/.test(voiceRules));
  // THE MECHANISM UNDERNEATH: a model mirrors the register of its instructions,
  // and these instructions argue with sources for a living, so they use the
  // word legitimately and often. Saying so is what stops it being copied.
  ok("and it says why the instructions themselves use it", /Instructions argue, entries state/.test(voiceRules));
}

// ── "COPENHAGEN ON DANISH IS KØBENHAVN" ───────────────────────────
// Oliver, 8 Aug 2026: "remember languages can be different. I type copenhagen,
// but Copenhagen on Danish is København. So it has to go over those sources too.
// Not sure if it already translates." It did not, in either half: not in the
// matcher that decides which of his sources apply, and not in the queries.
{
  // THE FOLD WAS BROKEN, and this is the assertion that says so. NFD ran before
  // the Danish letter rules, and å decomposes while ø and æ do not, so the
  // å→"aa" line never fired: "Århus" folded to "arhus" and "Aarhus" to
  // "aarhus". Both spellings are in live use on real Danish sites.
  is("the two live spellings of Aarhus fold together", M.fold("Århus"), M.fold("Aarhus"));
  is("and of Aalborg", M.fold("Ålborg"), M.fold("Aalborg"));
  is("å folds to aa, not to a", M.fold("Ålborg"), "aalborg");
  // The letters that do NOT decompose still have to keep working.
  is("ø and æ still fold", M.fold("Ærøskøbing"), "aeroskobing");

  is("a place with one name is just itself", M.variantsOf("Odense"), ["Odense"]);
  is("a place with two carries both, given spelling first", M.variantsOf("Copenhagen"), ["Copenhagen", "København"]);
  is("in either direction", M.variantsOf("København"), ["København", "Copenhagen"]);
  is("nothing in, nothing out", M.variantsOf(""), []);
  is("the other name, when there is one", M.otherNameFor("Copenhagen"), "København");
  is("and empty when there is not", M.otherNameFor("Odense"), "");

  ok("the two names of the capital are the same place", M.samePlaceName("Copenhagen", "København"));
  ok("both ways round", M.samePlaceName("København", "Copenhagen"));
  ok("spelling variants too", M.samePlaceName("Aarhus", "Århus"));
  ok("and parts of the country", M.samePlaceName("Jutland", "Jylland"));
  ok("a name matches itself", M.samePlaceName("Odense", "Odense"));
  // THE GUARD THAT MAKES IT SAFE. This matcher decides whether a source scoped
  // to one city gets sent along on a draft about another, so widening it is
  // exactly the failure the scoping exists to prevent.
  ok("but two different cities never do", !M.samePlaceName("Copenhagen", "Aarhus"));
  ok("nor two different parts", !M.samePlaceName("Jutland", "Funen"));
  ok("and nothing matches nothing", !M.samePlaceName("", ""));

  // SIGHTS ARE A SEPARATE LIST ON PURPOSE, and this is why: a source scoped to
  // Copenhagen must not start applying to every draft that mentions Tivoli.
  ok("a sight's two names are NOT treated as the same place", !M.samePlaceName("The Little Mermaid", "Den Lille Havfrue"));
  // They are still worth searching under both names, which is the other half.
  ok("but searching uses both", /Den Lille Havfrue/.test(M.searchNames("The Little Mermaid")));
  ok("searching a town uses both too", /København/.test(M.searchNames("Copenhagen")));
  is("and a name with no second form is not padded", M.searchNames("Odense"), "Odense");

  // ── THE CASE HE RAISED, END TO END ───────────────────────────────
  // He types the scope in English because that is how the entry is filed. A
  // Danish-named entry, parent or day-trip base then failed to match, and a
  // source scoped to Copenhagen was silently LEFT OUT of a København draft,
  // which looks exactly like the scoping working correctly.
  ok("a source scoped in English matches a Danish-named draft", M.placeMatches("Copenhagen", { name: "København" }));
  ok("and scoped in Danish matches an English-named draft", M.placeMatches("København", { name: "Copenhagen" }));
  ok("a part of the country matches across languages", M.placeMatches("Jutland", { name: "Aarhus", part: "Jylland" }));
  ok("it still refuses another city", !M.placeMatches("Copenhagen", { name: "Aarhus" }));
  ok("and still refuses an unknown place", !M.placeMatches("Copenhagen", null));
  is("a part typed in Danish is stored as the app spells it", M.cleanPlace("Jylland"), "Jutland");

  const bothWays = [{ id: 1, domain: "visitcopenhagen.com", applies_to: "", applies_place: "Copenhagen", enabled: true }];
  is("so the source actually reaches the Danish-named draft",
     M.sourcesFor(bothWays, "town", { name: "København" }).map(x => x.domain), ["visitcopenhagen.com"]);

  // The search bar, same problem: typing one spelling could not find the other.
  ok("the search bar finds a Danish-named place by its English name", M.matchesSearch({ name: "København" }, "copenhagen"));
  ok("and the other way round", M.matchesSearch({ name: "Copenhagen" }, "københavn"));
  ok("without matching an unrelated town", !M.matchesSearch({ name: "Odense" }, "copenhagen"));
}

// ── "YOU'RE 100% SURE THAT IT INCLUDES THE SOURCES I PUT IN?" ──────
// Oliver, 8 Aug 2026, holding a finished Copenhagen draft's eight-URL source
// list against the two domains he had added. He was not sure, and he was right:
// the list reached the PROMPTS, so Perplexity and Gemini were told about it, but
// Tavily builds its own queries and had never seen it. Being named in a prompt
// is not being searched.
{
  const rows = [
    { id: 1, domain: "visitdenmark.dk", applies_to: "", applies_place: "", enabled: true },
    { id: 2, domain: "visitcopenhagen.com", applies_to: "", applies_place: "Copenhagen", enabled: true },
    { id: 3, domain: "visitaarhus.com", applies_to: "", applies_place: "Aarhus", enabled: true },
  ];
  const cph = M.directSourceSearches(rows, "town", { name: "Copenhagen" });
  is("one real search per source that applies", cph.map(x => x.domain).sort(), ["visitcopenhagen.com", "visitdenmark.dk"]);
  ok("each restricted to its own domain", cph.every(x => x.domain && !x.domain.includes("/")));
  // ── "TIVOLI.DK INTO EVENTS FOR COPENHAGEN.. THIS WILL PROBABLY
  //     HAPPEN WITH MORE AREAS" ────────────────────────────────────
  // Doing exactly that would have produced a source that never fired once,
  // silently: an event draft knows only the event's own name, and "Copenhell"
  // is not "Copenhagen", so the strict place test drops it.
  const tivoli = [{ id: 9, domain: "tivoli.dk", applies_to: "festival", applies_place: "Copenhagen", enabled: true }];
  is("scoped to a city, an event draft finds nothing by name alone",
     M.directSourceSearches(tivoli, "festival", { name: "Copenhell" }), []);
  // THE RESEARCH TEXT KNOWS. By the time the searches are built, the general
  // web pass has pulled snippets, and a Copenhell snippet says Copenhagen.
  is("but the research text unlocks it",
     M.directSourceSearches(tivoli, "festival", { name: "Copenhell", text: "Copenhell is a metal festival held at Refshaleøen in Copenhagen each June." }).map(x => x.domain),
     ["tivoli.dk"]);
  ok("in either spelling", M.placeMightMatch("Copenhagen", { name: "Copenhell", text: "afholdes i København hvert år" }));
  // STILL NOT A FREE-FOR-ALL: research about a different city does not unlock it.
  ok("research about somewhere else does not", !M.placeMightMatch("Copenhagen", { name: "Aarhus Festuge", text: "a week-long festival across Aarhus" }));
  ok("and no text at all still excludes", !M.placeMightMatch("Copenhagen", { name: "Copenhell" }));
  ok("a universal source needs no text", M.placeMightMatch("", { name: "Copenhell" }));
  is("a switched-off source is never searched either",
     M.sourcesToSearch([{ id: 1, domain: "tivoli.dk", applies_to: "", applies_place: "", enabled: false }], "festival", { name: "Copenhell" }), []);
  is("and the wrong type is still skipped",
     M.sourcesToSearch([{ id: 1, domain: "tivoli.dk", applies_to: "festival", applies_place: "", enabled: true }], "town", { name: "Aarhus" }), []);

  // ── THE STRICT RULE IS UNTOUCHED ────────────────────────────────
  // Deciding where to LOOK is not deciding what to BELIEVE. A wrong search
  // costs one empty query; a wrong source in a PROMPT is a Copenhagen page read
  // as evidence about Aarhus. Only the first can afford to be generous.
  ok("the prompt block still refuses without a real place match",
     !/tivoli\.dk/.test(M.sourceRulesBlock(tivoli, "festival", { name: "Copenhell", text: "held in Copenhagen" })));
  ok("and still includes it when the place is genuinely known",
     /tivoli\.dk/.test(M.sourceRulesBlock(tivoli, "festival", { name: "Copenhell", town: "Copenhagen" })));

  // ── "DOES IT GO THROUGH ALL OF TICKETMASTER?" ────────────────────
  // The whole site. And the check for that answer found a hole: Tavily's docs
  // say include_domains is "a list of domains to specifically include" and say
  // nothing about subdomains. Rock Under Broen's prices were on
  // billet.unitedtickets.dk, one subdomain from the site anybody would type, and
  // a check that stopped at the front page reported them unverified.
  ok("the bare host is asked for first", M.domainVariants("unitedtickets.dk")[0] === "unitedtickets.dk");
  ok("www too, since that is where most results live", M.domainVariants("unitedtickets.dk").includes("www.unitedtickets.dk"));
  ok("and the subdomain that actually held the prices", M.domainVariants("unitedtickets.dk").includes("billet.unitedtickets.dk"));
  ok("along with the other names a Danish ticket shop uses", M.domainVariants("x.dk").includes("billetter.x.dk") && M.domainVariants("x.dk").includes("tickets.x.dk"));
  is("nothing in, nothing out", M.domainVariants("not a domain"), []);
  // One query either way: include_domains takes a list, so a subdomain that does
  // not exist costs nothing.
  ok("every search carries the whole list", cph.every(x => Array.isArray(x.domains) && x.domains.length > 5));
  // BOTH SPELLINGS IN THE QUERY, because a Danish tourist board files the
  // capital under København and an English-only query cannot reach that page.
  ok("the query carries both names of the place", cph.every(x => /Copenhagen/.test(x.query) && /København/.test(x.query)));
  ok("and asks in Danish as well as English", cph.every(x => /åbningstider/.test(x.query)));
  is("a name with one spelling is not doubled up",
     (M.directSourceSearches(rows, "town", { name: "Odense" })[0].query.match(/Odense/g) || []).length, 1);
  // The scoping still holds: this is a second consumer of sourcesFor, not a
  // bypass of it. An Aarhus draft must not search visitcopenhagen.
  is("scoping applies to the searches too", M.directSourceSearches(rows, "town", { name: "Aarhus" }).map(x => x.domain).sort(),
     ["visitaarhus.com", "visitdenmark.dk"]);
  // No name means no query worth spending, same direction of caution as
  // placeMatches: when we do not know where the draft is, do less.
  is("no place known means no paid searches", M.directSourceSearches(rows, "town", null), []);
  is("and an empty list means none either", M.directSourceSearches([], "town", { name: "Copenhagen" }), []);

  // CAPPED, because it is his money and the list is meant to grow. An uncapped
  // version turns a twelve-site list into twelve extra searches per draft.
  const many = Array.from({ length: 12 }, (_, i) => ({ id: i, domain: `site${i}.dk`, applies_to: "", applies_place: "", enabled: true }));
  is("the number of paid searches is capped", M.directSourceSearches(many, "town", { name: "Copenhagen" }).length, M.MAX_DIRECT_SEARCHES);
  ok("and the cap is a small number", M.MAX_DIRECT_SEARCHES > 0 && M.MAX_DIRECT_SEARCHES <= 6);

  const app5 = readFileSync(join(root, "src/App.jsx"), "utf8");
  // The wiring, asserted on the file, because the whole defect was a function
  // that existed and was never called from the half that matters.
  ok("the draft pipeline actually runs them", /directSourceSearches\(founderSources, sType, \{\s*\n\s*name,\s*\n\s*text: context,/.test(app5));
  // ── AND HANDS OVER WHAT THE DRAFT KNOWS ABOUT WHERE IT IS ─────────
  // "So now VisitCopenhagen.dk won't talk about Aarhus?" Correct, and that is
  // the fix. The same rule also cut Dragør off from VisitCopenhagen, and Dragør
  // is a Copenhagen day trip: placeMatches has always applied a town source to
  // anywhere using that town as a base, it just never received the fields to do
  // it with. A redraft has them sitting on the published row.
  ok("a redraft looks up the row it is redrafting", /const existingRow = \(manageItems \|\| \[\]\)\.find/.test(app5));
  ok("matched by real place name, not a string compare", /samePlaceName\(r\?\.payload\?\.name, name\)/.test(app5));
  ok("and passes the base-town relationship", /dayTripFrom: known\?\.dayTripFrom \|\| ""/.test(app5));
  ok("and containment", /partOf: known\?\.partOf \|\| ""/.test(app5));
  ok("and the part of the country, computed not typed", /part: known \? partOfCountry\(known\) : ""/.test(app5));

  // The behaviour, on the three cases that matter.
  const scoped = [
    { id: 1, domain: "visitdenmark.dk", applies_to: "", applies_place: "", enabled: true },
    { id: 2, domain: "visitcopenhagen.com", applies_to: "", applies_place: "Copenhagen", enabled: true },
    { id: 3, domain: "visitaarhus.com", applies_to: "", applies_place: "Aarhus", enabled: true },
  ];
  const searched = (ctx) => M.directSourceSearches(scoped, "town", ctx).map(x => x.domain).sort();
  is("an Aarhus draft does not pay to ask VisitCopenhagen about Aarhus",
     searched({ name: "Aarhus", text: "Aarhus is three hours from Copenhagen by train." }),
     ["visitaarhus.com", "visitdenmark.dk"]);
  is("a Copenhagen draft still gets its own source",
     searched({ name: "Copenhagen", text: "" }), ["visitcopenhagen.com", "visitdenmark.dk"]);
  is("and a Copenhagen day trip gets it back, because it genuinely is one",
     searched({ name: "Dragør", dayTripFrom: "Copenhagen", text: "" }),
     ["visitcopenhagen.com", "visitdenmark.dk"]);
  is("as does somewhere inside Copenhagen",
     searched({ name: "Nyhavn", partOf: "Copenhagen", text: "" }),
     ["visitcopenhagen.com", "visitdenmark.dk"]);
  // A brand new town knows nothing about itself yet, and that is honest: it
  // gets the general search, and today's source filter still records a
  // VisitCopenhagen page if that page names the place.
  is("a town drafted from nothing claims no relationship it does not have",
     searched({ name: "Dragør", text: "Dragør is a fishing town 12 km from Copenhagen." }),
     ["visitdenmark.dk"]);
  ok("through the endpoint's domain restriction", /&domains=\$\{encodeURIComponent\(\(domains \|\| \[domain\]\)\.join\(","\)\)\}/.test(app5));
  // /api/search has accepted this parameter the whole time and nothing used it.
  const api = readFileSync(join(root, "api/search.js"), "utf8");
  ok("which the endpoint has always supported", /include_domains/.test(api));
  // ── "DOES IT GO THROUGH ALL OF TICKETMASTER, OR ONLY THE FRONT
  //     PAGE?" ─────────────────────────────────────────────────────
  // The whole site. include_domains restricts the RESULTS to that domain and
  // Tavily searches its index of every page it holds. The real limit was the
  // result cap: four is plenty for an open search and thin for one pinned to a
  // single site, where four is all of it you will ever see.
  ok("a domain-restricted search gets more results than an open one",
     /max_results: Math\.min\(Math\.max\(Number\(n\) \|\| \(domains \? 8 : 4\), 1\), 20\)/.test(api));
  ok("and it is capped, so a caller cannot ask for the world", /, 20\)/.test(api));
  // WHAT THEY FOUND TRAVELS WITH THE DRAFT, first, so the next time he asks this
  // question the draft itself answers it.
  ok("and what they found rides in the draft's source list", /\[\.\.\.new Set\(\[\.\.\.founderUrls, \.\.\.candidateUrls\]\)\]/.test(app5));
  ok("with the result shown per domain, zeroes included", /\(nothing there\)/.test(app5));
  // Kept OUT of candidateUrls before the official-site pick on purpose: a
  // tourist board is not a venue's own website, and candidateUrls feeds that.
  ok("a vouched source is not promoted into the official-site pick",
     !/candidateUrls\.unshift\(\.\.\.founderUrls\)/.test(app5));

  // ── AND THE RESEARCH ASKS IN DANISH ──────────────────────────────
  ok("a standing rule tells every research pass to search Danish", /const DANISH_LANGUAGE_RULES = /.test(app5));
  ok("and it is folded into the rules every prompt carries", /\$\{DANISH_LANGUAGE_RULES\}/.test(app5));
  // The general rule is advice. The other name of the actual place is a search
  // term, and it goes into all seven prompts.
  ok("every research prompt names the place's other spelling", /THIS PLACE HAS TWO NAMES/.test(app5));
  ok("and one Tavily query is asked in Danish", /const daName = otherNameFor\(name, \{ includeSights: true \}\)/.test(app5));
  ok("only when there is a Danish name to ask under", /\.\.\.\(daName \? \[`\$\{daName\} \$\{daWords\}`\] : \[\]\)/.test(app5));
  // The dash ban applies to prompt text exactly as it does to STUDIO_VOICE: a
  // dash in a rule teaches every future draft to use one.
  const dan = app5.slice(app5.indexOf("const DANISH_LANGUAGE_RULES = "), app5.indexOf("const RESEARCH_SOURCE_RULES = "));
  is("the Danish rules carry no em or en dashes", (dan.match(/[—–]/g) || []).length, 0);

  // ── A DOMAIN WITH A TYPO IN IT DOES NOTHING, FOREVER, SILENTLY ───
  // He typed visitcopenhagen.dk. The real site is visitcopenhagen.com, and
  // normaliseDomain accepts both because both are shaped like domains. Checked
  // once, when he adds it, rather than discovered never.
  ok("a new source is checked against the search index", /probeSource\(domain\);/.test(app5));
  ok("with the same domain restriction the drafts use", /const probeSource = async \(domain\) => \{/.test(app5));
  // ADDED EITHER WAY. A thin index is not proof a site is fake, and a real
  // parish page with two pages on it is exactly what he should be able to add.
  is("the check reports rather than refuses, in BOTH outcomes", (app5.match(/It is added either way/g) || []).length, 2);
  ok("and an empty result says what is usually wrong", /the Danish site may be the \.dk and the English one the \.com/.test(app5));
  ok("the row is saved before the check runs", app5.indexOf("await loadSources();") < app5.indexOf("probeSource(domain);"));
}

// ── AN EVENT'S ARRIVAL POINT IS NOT ALWAYS A STATION ───────────────
// Oliver, 8 Aug 2026: "event still has 'nearestStation' and not nearest stop."
// arrivalRow has labelled these correctly since 7 Aug and the detail page has
// used it all along. The event card drew a train icon over "Sælvig Ferry
// Terminal" and called it a station.
{
  const app4 = readFileSync(join(root, "src/App.jsx"), "utf8");
  ok("the event card asks arrivalRow what the stop IS", /const row = arrivalRow\(event\.nearestStation\);/.test(app4));
  ok("and prints its label rather than assuming Station", /\{row\.label\}:/.test(app4));
  // The icon comes from the same call as the label, so the two can never
  // disagree, which is precisely how a ferry ended up under a train.
  ok("with the icon from the same call", /\{row\.icon\}/.test(app4));
  ok("no hardcoded train icon is left on that row", !/name="train" size=\{13\} color=\{C\.muted\} \/> \{event\.nearestStation\}/.test(app4));
}

// ── "PERPLEXITY DIDN'T EVEN BOTHER TO GO INTO THE LINK" ────────────
// Oliver, 8 Aug 2026, with the ticket shop open in one tab and the fact-check in
// the other. The draft claimed 945 DKK for Rock Under Broen 2027; the checker
// reported it unverified because the festival's own page did not state it. The
// prices were one subdomain away, and none of them was 945.
//
// READ OUT OF THE BUILT PROMPT, not the source, because the rules are template
// literals and an escaping artifact would show the model something different
// from what the file appears to say. That method has already caught ten of them.
{
  const app5 = readFileSync(join(root, "src/App.jsx"), "utf8");
  const between = (from, to) => {
    const i = app5.indexOf(from), j = app5.indexOf(to, i);
    ok(`${from.slice(0, 28)} block was found`, i !== -1 && j > i);
    return i === -1 ? "" : app5.slice(i, j);
  };

  // The marketing page is not the authority on the thing it markets. Same shape
  // as the ferry rule: the operator's timetable outranks its own front page.
  const ticket = between("const TICKET_SOURCE_RULES = `", "`;");
  ok("it says a festival page often carries no prices", /carries NO prices at all/.test(ticket));
  ok("and names where the shop actually is", /billet\.|billetter\.|tickets\./.test(ticket));
  ok("including the Danish ticketing partners by name", /United Tickets/.test(ticket) && /Billetlugen/.test(ticket));
  // The rule that generalises, and the same discipline as "a ranking needs a
  // stated measure": several real prices exist at once, so a bare figure is not
  // checkable against any of them.
  ok("a price must say which ticket it is", /A PRICE IS ONLY A FACT IF YOU SAY WHICH TICKET IT IS/.test(ticket));
  ok("a sold-out tier is not the price", /A SOLD-OUT EARLY TIER IS NOT THE PRICE/.test(ticket));
  ok("and one figure for a multi-day festival is called out", /MULTI-DAY FESTIVAL/.test(ticket));
  // Not found is not wrong, and this is where that failure actually happened.
  ok("not finding a price is not evidence it does not exist", /is almost never a price that does not exist, it is a price you have not reached yet/.test(ticket));

  // ── "COULD NOT REACH" MUST NOT READ AS "WRONG" ───────────────────
  const scope = between("const FACT_CHECK_SCOPE_RULES = `", "`;");
  ok("the two are named as different things", /"I COULD NOT FIND IT" IS NOT "IT IS WRONG"/.test(scope));
  ok("and every finding must pick one of two words", /CONTRADICTED:/.test(scope) && /UNVERIFIED:/.test(scope));
  ok("a contradiction has to name the page and the figure", /Name the page and give its figure/.test(scope));
  ok("and an unverified one has to say where it actually looked", /name the pages you DID open/.test(scope));
  ok("reading only a marketing page is called what it is", /a report about your own search, not about the draft/.test(scope));

  // Both blocks have to REACH the models, or they are comments. They ride in
  // through RESEARCH_SOURCE_RULES, which every research prompt now folds in.
  const research = between("const RESEARCH_SOURCE_RULES = `", "`;");
  ok("the ticket rules are carried into every research prompt", /\$\{TICKET_SOURCE_RULES\}/.test(research));
  ok("alongside the ferry and booking-platform ones", /\$\{ISLAND_FERRY_RULES\}/.test(research) && /\$\{BOOKING_PLATFORM_RULES\}/.test(research));
  // And the fact-check prompt is the one that carries the scope rules.
  ok("the fact-check prompt carries the scope rules", /\$\{FACT_CHECK_SCOPE_RULES\}\\n\$\{researchRules\(studioType, studioDraft\)\}/.test(app5));

  // The dash ban applies to these exactly as it does to STUDIO_VOICE: a dash in
  // a rule teaches every future draft to use one.
  is("the ticket rules carry no em or en dashes", (ticket.match(/[—–]/g) || []).length, 0);
  // ── "SOMETIMES THERE IS A DIFFERENCE DEPENDING ON AGE" ───────────
  // Oliver, 9 Aug 2026. The rules already covered the day and the sold-out
  // tier. Age is a THIRD axis: the same Saturday at the same moment has an
  // adult price and a child price, so one figure can be true and still be the
  // wrong number for the person reading it.
  ok("age is named as its own axis", /AGE IS A SECOND AXIS, SEPARATE FROM THE DAY AND THE TIER/.test(ticket));
  // The words that are actually printed on a Danish ticket page.
  ok("with the Danish words the shop uses", /barn or børn \(child\)/.test(ticket) && /pensionist or senior/.test(ticket));
  // Free entry for the youngest changes whether a family goes at all.
  ok("and free entry for the youngest is worth stating", /gratis or fri entré under a stated age/.test(ticket));
  // NEVER INVENTED. A discount that is not there is worse than no discount.
  ok("but a concession is never assumed", /DO NOT INVENT A CONCESSION/.test(ticket));
  is("and neither do the scope rules", (scope.match(/[—–]/g) || []).length, 0);
}

// ── "TRANSPORT IS CONSTANTLY SOMEWHAT WRONG" ───────────────────────
// Oliver, 8 Aug 2026. A draft said "Direct trains run from København H to Odense
// in about 1h50min" when the Lyntog is about 1h22, and "Odense railway station
// is about 5 minutes on foot from the city centre" when the station IS the
// centre. One cause: the pipeline measures a DOOR TO DOOR journey between two
// geocoded points and hands the writer a single unlabelled number.
{
  const { journeyParts, journeyBlock, vehicleWord } = M;

  // The real shape of Copenhagen to Odense: walk, wait, ride, walk.
  const cphOdense = [
    { mode: "walking", duration: "9 mins", mins: 9 },
    { mode: "transit", vehicle: "HEAVY_RAIL", line: "Lyntog A", from: "København H", to: "Odense St.", duration: "1 hour 22 mins", mins: 82 },
    { mode: "walking", duration: "5 mins", mins: 5 },
  ];
  const p1 = journeyParts(cphOdense, 110);
  is("the door-to-door total is kept whole", p1.total, 110);
  // THE NUMBER THE SENTENCE SHOULD HAVE USED.
  is("and the time actually on board is separated out", p1.onBoard, 82);
  is("the walking at both ends is added up", p1.onFoot, 14);
  // Naming the wait matters: it is the difference between the timetable and the
  // journey, and it is the part a traveller can shrink.
  is("and the rest is named as waiting", p1.waiting, 14);
  is("one ride is no changes", p1.changes, 0);
  is("the longest leg is the train, with its line", [p1.longest.mins, p1.longest.vehicle, p1.longest.line], [82, "train", "Lyntog A"]);

  // Rounding each step to whole minutes can overshoot the total.
  is("waiting is never negative", journeyParts([{ mode: "transit", vehicle: "BUS", mins: 30 }], 20).waiting, 0);
  is("no steps means no breakdown at all, rather than an invented one", journeyParts([], 90), null);
  is("and neither does nothing", journeyParts(null, 90), null);

  const twoLeg = journeyParts([
    { mode: "walking", mins: 6 },
    { mode: "transit", vehicle: "HEAVY_RAIL", line: "IC", mins: 70, from: "København H", to: "Fredericia" },
    { mode: "transit", vehicle: "BUS", line: "4", mins: 25, from: "Fredericia", to: "Somewhere" },
  ], 120);
  is("two rides is one change", twoLeg.changes, 1);
  is("and the longest is the train, not the last leg", twoLeg.longest.mins, 70);
  is("every vehicle used is listed", twoLeg.vehicles, ["train", "bus"]);
  is("google's vehicle codes become words a traveller uses", [vehicleWord("HEAVY_RAIL"), vehicleWord("FERRY"), vehicleWord("SUBWAY")], ["train", "ferry", "metro"]);
  is("and an unknown one becomes nothing rather than a guess", vehicleWord("FUNNY_TRAIN"), "");

  // ── EVERY FIGURE CARRIES THE NAME OF WHAT IT MEASURES ────────────
  const block = journeyBlock(p1);
  ok("the total says door to door, and says what it includes", /DOOR TO DOOR: 1h 50min/.test(block) && /INCLUDING the walk at both ends/.test(block));
  ok("the on-board figure is named separately", /ON BOARD: 1h 22min/.test(block));
  ok("and names the service it belongs to", /by train on Lyntog A, København H to Odense St\./.test(block));
  ok("the walking is named as walking", /ON FOOT: 14min/.test(block));
  ok("and travelTime is told which figure is its own", /It is the figure travelTime takes/.test(block));
  is("nothing measured means nothing said", journeyBlock(null), "");

  // ── AND THE RULE THAT STOPS ONE NUMBER ANSWERING TWO QUESTIONS ───
  const app6 = readFileSync(join(root, "src/App.jsx"), "utf8");
  const j = app6.slice(app6.indexOf("const MEASURED_JOURNEY_RULES = `"), app6.indexOf("`;", app6.indexOf("const MEASURED_JOURNEY_RULES = `")));
  ok("the rules block was found", j.length > 200);
  ok("a duration is treated like a ranking", /a duration is only true against a stated measure/.test(j));
  ok("the exact sentence he caught is named as false", /Direct trains run to Odense in about 1h50/.test(j));
  ok("and the operator's timetable still outranks the measurement", /THE OPERATOR'S TIMETABLE OUTRANKS ALL OF THIS/.test(j));
  // His second complaint, which is the same number's other half.
  ok("the walking figure is refused as geography", /THE WALKING FIGURE IS NOT A FACT ABOUT GEOGRAPHY/.test(j));
  ok("including the softer phrasings of it", /"just outside" or "a short walk from"/.test(j));
  ok("a wait is not published as a fact about the service", /never publish it as a fact about the service/.test(j));
  is("the rules carry no em or en dashes", (j.match(/[—–]/g) || []).length, 0);
  // Wired, or it is an essay in a file.
  ok("the named breakdown reaches the writer", /journeyBlock\(journeyParts\(transitD\?\.steps, transitD\?\.durationMinutes\)\)/.test(app6));
  ok("and the rules ride in with every research prompt", /\$\{MEASURED_JOURNEY_RULES\}/.test(app6));
  // The step minutes have to exist, or journeyParts adds up zeros.
  const dir = readFileSync(join(root, "api/directions.js"), "utf8");
  is("every step carries real minutes, both kinds", (dir.match(/mins: Math\.round\(\(s\.duration\?\.value \|\| 0\) \/ 60\)/g) || []).length, 2);
}

// ── DOES A CONFIRMATION CLEAR AN UNCERTAINTY? NO. ──────────────────
// Oliver, 8 Aug 2026: "does it also change uncertainties to confirmation if
// Google Gemini confirms?" It does not, and it should not: a fact-check
// retracting its own warning is the same machinery that wrote the draft marking
// its own homework. It stays a human act, and it is one click.
{
  const app7 = readFileSync(join(root, "src/App.jsx"), "utf8");
  // Exactly ONE automatic removal, and it is deterministic: a real official
  // website was found, so the "no official website" flag is no longer true.
  // Anything else clearing a doubt on a model's say-so would be the bug.
  is("only one place clears an uncertainty automatically",
     (app7.match(/uncertainties = \(t\.uncertainties \|\| \[\]\)\.filter/g) || []).length, 1);
  ok("and it is the website lookup, which either happened or did not", /official \(festival\\\/event \)\?website\|website url was found\|no official/.test(app7));
  // The human path exists, goes through studioDraftText (what Publish reads),
  // and says out loud that a confirmation does not do this by itself.
  ok("an uncertainty can be marked settled by hand", /const resolveUncertainty = \(idx\) =>/.test(app7));
  ok("through the text Publish actually reads", /setStudioDraftText\(JSON\.stringify\(draft, null, 2\)\);[\s\S]{0,80}setDraftEditError\(null\);\n  \};/.test(app7));
  ok("and the panel says a fact-check will not do it for you", /A fact-check that confirms one of these does NOT clear it/.test(app7));
  // Unparseable JSON must not silently drop a flag.
  ok("bad JSON refuses rather than losing the flag", /The draft JSON is not parseable right now, so that could not be removed/.test(app7));
}

// ── "GEMINI SHOULDN'T HAVE THE FINAL WORD" ─────────────────────────
// Oliver, 8 Aug 2026. The Studio fix button handed the checker's findings to
// Claude and asked it to apply them: good guardrails about scope and precision,
// and no step anywhere that asked whether a finding was TRUE.
{
  const { VERIFY_PROMPT } = M;
  const app8 = readFileSync(join(root, "src/App.jsx"), "utf8");

  // The fix path is now the SAME path the assistant uses: split into claims,
  // verify each against a primary source, apply only what holds.
  ok("the fix button runs the verification pipeline", /const result = await correctEntry\(\{[\s\S]{0,200}criticism: googleCheckResult\.text/.test(app8));
  ok("and no longer asks Claude to apply findings wholesale", !/Rewrite ONLY the specific parts that are actually flagged as wrong/.test(app8));
  // The verifier gets the standing rules, or it repeats the checker's mistake
  // and calls the repetition confirmation.
  ok("the verifier carries the standing research rules", /rules: researchRules\(studioType, entry\)/.test(app8));
  // Every finding's fate is shown, so a rejected one reads as rejected rather
  // than as nothing having happened.
  ok("each finding's verdict is rendered", /c\.verdict === "confirmed" \? "✅"/.test(app8));
  ok("and nothing surviving is stated as a result, not a failure", /That is a result, not a failure/.test(app8));

  // ── BOTH SIDES CAN BE RIGHT AT ONCE ──────────────────────────────
  // The whole reason tonight's journey figure would have been "corrected" into
  // being wrong: 1h50 door to door and 1h22 on the train are both true.
  const vp = VERIFY_PROMPT("Odense", { says: "the train takes 1h50" }, "STANDING RULES HERE");
  ok("a claim is checked against a primary source", /A PRIMARY SOURCE settles this/.test(vp));
  ok("two real figures measuring different things is not a disagreement", /BOTH THE ENTRY AND THE CRITICISM CAN BE RIGHT AT ONCE/.test(vp));
  ok("and that case is a rejection, not a confirmation", /the verdict is "rejected", not "confirmed"/.test(vp));
  ok("with the journey example named", /door to door journey time and a train's running time are both true/.test(vp));
  ok("the standing rules reach the verifier", /STANDING RULES HERE/.test(vp));
  ok("and are simply absent when none are given", !/undefined/.test(VERIFY_PROMPT("Odense", { says: "x" })));
  // A verifier that cannot find a source must say so rather than reasoning.
  ok("could not confirm stays a correct answer", /"Could not confirm" is a correct and useful answer here/.test(vp));
}


// ── "MAPS STILL SEEM TO GET THINGS WRONG" ──────────────────────────
// Oliver, 9 Aug 2026, with Google Maps open beside two legs of one guide.
// Both counterexamples are in here as real numbers, because a rule about
// walking speed that is never checked against a real walk is a comment.
{
  const { estimateMinutes, estimateDurationText, walkEstimateTooFar, ROUTE_FACTOR, WALK_MAX_MINUTES } = M;

  // THE DIAGNOSIS, as a test. Christiania to Reffen measures 2.12 km in a
  // straight line and 3.2 km on the pavement, because Copenhagen's harbour is
  // in the way. The old code divided the straight line by a walking speed and
  // printed 28 minutes for a 44 minute walk.
  is("a straight line is not a walk: the detour is applied", estimateMinutes(2.12, "walking"), 38);
  ok("and that lands nearer Google's 44 than the old 28 did", Math.abs(38 - 44) < Math.abs(28 - 44));
  // MUTATION GUARD: delete the factor and this dies.
  ok("walking carries a detour factor above 1", ROUTE_FACTOR.walking > 1);
  // Transit deliberately does NOT, because its 35 km/h is already a
  // door-to-door figure. Multiplying a detour in as well double-counts.
  is("transit keeps a factor of 1, its speed already covers the slack", ROUTE_FACTOR.transit, 1);
  is("so a transit estimate is unchanged by this work", estimateMinutes(35, "transit"), 60);

  // THE CAP HAS TO APPLY TO THE GUESS. This is the bug: WALK_MAX_MINUTES was
  // enforced only where a real Google answer existed, so the branch that runs
  // when nothing is known was the one allowed to print any walk it liked.
  ok("the Christiania leg is refused as a walk", walkEstimateTooFar(2.12));
  ok("a real short stroll is still a walk", !walkEstimateTooFar(0.8));
  // The boundary, stated: 20 minutes at 4.5 km/h with the 1.35 detour is
  // about 1.11 km of straight line.
  ok("just inside the cap passes", !walkEstimateTooFar(1.1));
  ok("just outside the cap fails", walkEstimateTooFar(1.2));
  ok("nothing known is not a refusal", !walkEstimateTooFar(null));

  is("the text still reads as an estimate", estimateDurationText(2.12, "walking"), "~38 min");
  is("null in, null out", estimateDurationText(null, "walking"), null);
  is("hours still format", estimateDurationText(40, "bicycling"), "~3 hours 51 min");
}

// ── "SHOULDN'T SHOW THE SAME FACT TWICE" ───────────────────────────
{
  const { shuffledOrder, identityOrder, advancePos, factAt } = M;
  // A shuffle is only testable against a fixed sequence. Math.random can only
  // ever prove "did not throw".
  const seq = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2];
  let i = 0;
  const rand = () => seq[i++ % seq.length];
  const order = shuffledOrder(8, rand);
  is("every card appears exactly once", [...order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  is("and it is genuinely reordered", order.length === 8 && order.join(",") !== "0,1,2,3,4,5,6,7", true);
  is("an empty list does not throw", shuffledOrder(0), []);

  // The repeat he reported: walking a permutation cannot show a card twice
  // until every card has been shown.
  const seen = [];
  let pos = 0;
  for (let n = 0; n < 8; n++) { seen.push(factAt(order, pos, 8)); pos = advancePos(pos, 8); }
  is("eight ticks show eight different facts", new Set(seen).size, 8);
  is("the ninth wraps to the first, which is not the bug", factAt(order, pos, 8), seen[0]);

  // The instant swap: the first card painted is the first card of the order.
  is("a session opens on the first fact, exactly as asked", factAt(identityOrder(8), 0, 8), 0);

  // A stale order is shorter than the list, because Studio publishes new facts
  // into the same array between builds. It must not paint undefined.
  const stale = identityOrder(3);
  ok("a stale order still lands on a real card", [0, 1, 2].includes(factAt(stale, 7, 9)));
  is("an order holding an index past the end falls back", factAt([99], 0, 4), 0);
  is("no facts at all is index zero, not a crash", factAt([], 0, 0), 0);
}

// ── "IT SUGGESTS HOSTELS, BUT THEN GIVES A SPECIFIC HOTEL??? ODD" ──
{
  const { stayTier, stayTiers, namedProperty, stayProblems, stayTierMismatch } = M;
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  is("a hostel sentence is a hostel", stayTier("Book a hostel near Norreport, from EUR 30"), "hostel");
  is("a hotel sentence is a hotel", stayTier("Stay in central Odense for a comfortable hotel base"), "hotel");
  // Danhostel is spelled shut, and is THE hostel chain in Denmark. \bhostel\b
  // could never see it. Found by writing a real name into a test.
  is("Danhostel is a hostel", stayTier("Danhostel Copenhagen City"), "hostel");
  is("an area sentence names no tier", stayTier("Stay in central Odense near the cathedral"), null);
  is("Danish words count", stayTier("et vandrerhjem i byen"), "hostel");

  // HIS ACTUAL GUIDE. Both sentences were correct, and together they read as
  // the guide contradicting itself, because neither says Copenhagen costs more.
  const contradicting = [
    { glance: { accommodation: "Book a hostel near Norreport" } },
    { glance: { accommodation: "Stay in central Odense, a comfortable hotel base" } },
  ];
  is("the tiers are both seen", stayTiers(contradicting), ["hostel", "hotel"]);
  ok("an unexplained jump is flagged", stayProblems(contradicting).some(p => /contradicting itself/.test(p)));
  // The fix is not one tier for a whole trip, which would be worse advice.
  const explained = [
    { glance: { accommodation: "Book a hostel near Norreport" } },
    { glance: { accommodation: "Your budget goes much further here than in Copenhagen, so a real hotel in central Odense is in range" } },
  ];
  is("a stated reason is not a problem", stayProblems(explained), []);

  // ONE CALL RETURNING BOTH FIELDS, DISAGREEING WITH ITSELF.
  ok("sentence and named property must match", stayTierMismatch("book a hostel near Norreport", "Hotel Odeon"));
  ok("agreeing is fine", !stayTierMismatch("book a hostel near Norreport", "Danhostel Copenhagen City"));
  ok("an empty recommendation is the normal case, not a mismatch", !stayTierMismatch("book a hostel near Norreport", ""));
  ok("the mismatch is reported with both halves named",
    stayProblems([{ glance: { accommodation: "Book a hostel near Norreport", recommendedStay: "Hotel Odeon" } }])
      .some(p => /Hotel Odeon/.test(p) && /hostel/.test(p)));

  // The sentence naming its own property, bypassing the field that has a
  // grounding rule attached to it.
  is("a named hotel in the prose is found", namedProperty("Stay at Hotel Odeon in central Odense"), "Odeon");
  is("an area is not a property", namedProperty("Stay in central Odense near the cathedral"), null);
  // MUTATION GUARD for the case bug I shipped first time round: the lodging
  // word is capitalised in real sentences, and the flags argument was "".
  ok("a capitalised lodging word still matches", !!namedProperty("Stay at Hotel Odeon"));
  ok("but the proper noun stays case sensitive", !namedProperty("stay at a hotel somewhere central"));

  // ── THE PROMPT HAS TO CARRY THE HALF CODE CANNOT ────────────────
  ok("the prompt tells one call not to contradict itself", /ONE TRIP, ONE KIND OF TRAVELER/.test(app));
  ok("and names the real example", /It suggests hostels, but then gives a specific hotel/.test(app));
  ok("and requires the sentence to match recommendedStay", /never write hostel here and return a hotel there/.test(app));
  ok("the check runs after enrichment, where glance exists", app.indexOf("enrichGuideDays") < app.indexOf("stayProblems(parsed.days)"));
}


// ── "REFER THEM TO FLIXBUS OR DSB. OR THE FERRY" ───────────────────
{
  const { OPERATORS, operatorsForLeg, operatorNote, isLongLeg, LONG_LEG_KM, THRESHOLDS_ARE_ORDERED } = M;
  const ids = (o) => o.map(x => x.id);

  // HIS TWO EXAMPLES, as real distances.
  is("Copenhagen to Odense gets ticket sellers", ids(operatorsForLeg({ km: 135, mode: "transit" })), ["dsb", "flixbus", "rejseplanen"]);
  is("Copenhagen to Randers too", ids(operatorsForLeg({ km: 220, mode: "transit" })), ["dsb", "flixbus", "rejseplanen"]);
  // A regional hop is a tap-in, not a booking. Offering a national rail site
  // for 30 km is noise on the page.
  is("a short transit leg stays quiet", operatorsForLeg({ km: 30, mode: "transit" }), []);
  // Nobody sells a seat in your own car, or on your own legs.
  is("driving needs no operator", operatorsForLeg({ km: 200, mode: "driving" }), []);
  is("cycling needs no operator", operatorsForLeg({ km: 200, mode: "bicycling" }), []);
  // Unknown distance is not long. A null km means the stops never resolved,
  // and guessing "long" there would offer a rail booking for a walk.
  is("unknown distance stays quiet", operatorsForLeg({ km: null, mode: "transit" }), []);

  // ── A FERRY GETS NO COMPANY NAME, ON PURPOSE ────────────────────
  // Checked while writing this: Samso alone is served by TWO operators on TWO
  // routes from opposite sides of the country. Naming one as "the" ferry could
  // send somebody across the Great Belt the wrong way.
  is("a crossing gets the planner, not a company", ids(operatorsForLeg({ km: 20, mode: "ferry" })), ["rejseplanen"]);
  is("and it is detected from the leg text too", ids(operatorsForLeg({ km: 12, mode: "transit", how: "~1h15 by ferry" })), ["rejseplanen"]);
  is("Danish spelling counts", ids(operatorsForLeg({ km: 12, mode: "transit", how: "med færge" })), ["rejseplanen"]);
  // MUTATION GUARD: if anyone ever adds a ferry company to OPERATORS and wires
  // it in, this dies. That is the point.
  ok("no ferry company is ever named", !Object.values(OPERATORS).some(o => /molslinjen|samso|færge|faergen|ferry/i.test(o.name)));
  ok("a crossing says why the route matters more than the brand", /more than one port/.test(operatorNote({ mode: "ferry" })));
  ok("and says to book the crossing, not just the bed", /Book the crossing/.test(operatorNote({ mode: "ferry" })));
  is("a train leg gets no ferry warning", operatorNote({ mode: "transit" }), "");

  // Both operators point at a real booking site, not a Maps link. The whole
  // reason this exists is that Maps can show a journey and cannot sell a seat.
  ok("DSB links to DSB", /dsb\.dk/.test(OPERATORS.dsb.url));
  ok("FlixBus links to FlixBus", /flixbus\.com/.test(OPERATORS.flixbus.url));
  ok("Rejseplanen links to Rejseplanen", /rejseplanen\.dk/.test(OPERATORS.rejseplanen.url));
  ok("none of them is a maps link", !Object.values(OPERATORS).some(o => /google\.com\/maps/.test(o.url)));

  is("the threshold is where it says it is", isLongLeg(LONG_LEG_KM), true);
  ok("and one metre under is not long", !isLongLeg(LONG_LEG_KM - 0.001));
  // A leg cannot be both walkable and long enough to need a rail booking.
  ok("the walking cap and the long-leg threshold stay ordered", THRESHOLDS_ARE_ORDERED);
  // ROUTE_FACTOR silently desynced these: WALK_MAX_KM was a hardcoded 1.5
  // documented as "20 minutes", but with the detour factor 1.5 km is 27
  // minutes, so resolveLegMode kept calling legs walkable that the render then
  // rejected as "Too far to walk". Derived from one rule now, so a change to
  // the factor moves both.
  const { WALK_MAX_KM, estimateMinutes: em, WALK_MAX_MINUTES: cap } = M;
  is("the distance cap is exactly the minute cap", em(WALK_MAX_KM, "walking"), cap);
  ok("so a leg at the cap is not refused as a walk", !M.walkEstimateTooFar(WALK_MAX_KM));
  ok("and just past it is", M.walkEstimateTooFar(WALK_MAX_KM * 1.05));
}

// ── "ODENSE IS NOT ON THE MAP AT ALL" ──────────────────────────────
{
  const mapSrc = readFileSync(join(root, "src/components/GuideRouteMap.jsx"), "utf8");
  const guideSrc = readFileSync(join(root, "src/pages/GuidePage.jsx"), "utf8");
  // The either/or was the bug: fitting to the drawn route INSTEAD of the
  // markers drops any stop the geometry does not happen to cover.
  ok("the fit is a union, not a choice", /const extent = \[\.\.\.latlngs, \.\.\.drawn\]/.test(mapSrc));
  ok("the old either/or is gone", !/drawn\.length > 1 \? drawn : latlngs/.test(stripNonCode(mapSrc)));
  // Leaflet sizes a fitBounds from a CACHED container size.
  ok("the container is re-measured before fitting", mapSrc.indexOf("invalidateSize") < mapSrc.indexOf("fitBounds"));
  // A stop with no coordinate used to vanish with nothing to show it had.
  ok("unplaced stops are counted", /const tripUnplaced =/.test(guideSrc));
  ok("and named on the page", /are not on this map/.test(guideSrc));
  ok("the bare filter(Boolean) that hid them is gone", !/\}\)\.filter\(Boolean\);\n  \/\/ Consecutive duplicates/.test(guideSrc));
  // clip, not hidden: hidden on an ancestor kills sticky children, and this
  // page's header and save bar are both sticky.
  ok("the page cannot scroll sideways", /overflowX: "clip"/.test(guideSrc));
  ok("and not with hidden, which would break the sticky header", !/overflowX: "hidden"/.test(guideSrc));
}

// ── "WHY NO DATE PUT UP?" ──────────────────────────────────────────
{
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");
  // The brief used to offer bare month names, two of them empty strings, to a
  // parser that needs a day number. So arrivalDate was null on every test run.
  // stripNonCode: the comment explaining this fix QUOTES the line it removed,
  // so scanning raw source finds the bug report and calls it the bug. Both of
  // these assertions failed that way on their first run, which is the suite
  // working: a source scan that reads comments cannot tell a fix from a
  // description of what was fixed.
  ok("the bare month list is gone", !/We are coming in June/.test(stripNonCode(appSrc)));
  ok("the brief carries a real arrival date", /We arrive on \$\{arrivalPhrase\}/.test(appSrc));
  ok("and it is in the future", /getDate\(\) \+ 14 \+ Math\.floor/.test(appSrc));
  ok("the profile carries it so the card can show it", /arrivingOn: arrivalPhrase/.test(appSrc));

  // THE REAL CHECK: the phrase this builds must parse with the SAME regex
  // generateGuide uses. A date the parser cannot read is the bug, restated.
  const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthPattern = MONTHS_LONG.map(m => m.toLowerCase()).join("|");
  const dateRe = new RegExp(`\\b(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthPattern})|(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?)\\b`, "i");
  ok("the new phrase parses", dateRe.test("We arrive on 14 September"));
  ok("every month spells out and parses", MONTHS_LONG.every((m, i) => dateRe.test(`We arrive on ${i + 1} ${m}`)));
  // And the old one provably did not, which is the whole report.
  ok("the old phrase never parsed, which is why dates were missing", !dateRe.test("We are coming in June"));

  const { testTravelerLine } = M;
  ok("the card shows the date", /arriving 14 September/.test(testTravelerLine({ days: 4, arrivingOn: "14 September", who: "two of us" })));
  ok("a profile without one is not broken by it", !/arriving/.test(testTravelerLine({ days: 4, who: "two of us" })));
}


// ── "WE ARE ABLE TO PREDICT HOW THE WEATHER IS GONNA BE" ───────────
{
  const { FORECAST_HORIZON_DAYS, FORECAST, NORMALS, weatherSourceFor, wetDayWords,
          normalsIcon, normalsLine, weatherBadge, normalsNote } = M;
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");
  const apiSrc = readFileSync(join(root, "api/weather.js"), "utf8");
  const guideSrc = readFileSync(join(root, "src/pages/GuidePage.jsx"), "utf8");

  // ── THE HOLE TWO CORRECT CHANGES MADE BETWEEN THEM ──────────────
  // Arrival dates are now 2 to 26 weeks out, and the old code bailed past day
  // 8, so the weather badge would have vanished from nearly every guide.
  // ── THE ASSERTION THAT WAS MISSING ──────────────────────────────
  // Every horizon test below is written RELATIVE to the constant, so all of
  // them passed happily while the constant said 8 and the API emitted 7
  // buckets. Days 7 and 8 were claimed as forecastable, no bucket existed,
  // and the badge silently vanished. A test that moves with the thing it is
  // testing cannot catch a disagreement with something else. This one ties
  // the constant to the API's actual slice, so changing either alone goes red.
  const wapiSrc = readFileSync(join(root, "api/weather.js"), "utf8");
  const sliceHit = wapiSrc.match(/Object\.entries\(byDay\)\.slice\(0, (\d+)\)/);
  ok("the API's bucket count is findable", !!sliceHit);
  is("the horizon matches the last bucket the API emits",
    FORECAST_HORIZON_DAYS, Number(sliceHit[1]) - 1);

  is("day one is a forecast", weatherSourceFor(0), FORECAST);
  is("the last forecast day is a forecast", weatherSourceFor(FORECAST_HORIZON_DAYS), FORECAST);
  is("one day past it is not", weatherSourceFor(FORECAST_HORIZON_DAYS + 1), NORMALS);
  // The case the date fix created: a trip fourteen weeks out.
  is("a trip months out still says something", weatherSourceFor(98), NORMALS);
  ok("and it is never silence", [0, 9, 98, 400].every(d => !!weatherSourceFor(d)));
  ok("the bare bail is gone from the app", !/if \(forecastIdx > 8\) return;/.test(stripNonCode(appSrc)));

  // ── A FORECAST AND A NORMAL MUST NEVER LOOK ALIKE ───────────────
  const fc = weatherBadge({ source: FORECAST, forecast: { icon: "🌧️", temp: 14, risk: "high" } });
  is("a forecast is labelled a forecast", fc.label, "forecast");
  const nm = weatherBadge({ source: NORMALS, normals: { available: true, high_c: 13, low_c: 8, wet_day_share: 0.4, years: 10 } });
  is("a normal is labelled typical, not forecast", nm.label, "typical");
  ok("and never uses the word forecast anywhere on it", !/forecast/i.test(JSON.stringify(nm)));
  is("the badge temperature is the midpoint of the range", nm.temp, 11);
  ok("the sentence says normally, not expect", /^Normally 8° to 13°/.test(nm.detail));
  ok("the page states which of the two it is showing", /Not a forecast\./.test(guideSrc));

  // Not enough archive coverage is a real answer, not an error to paper over.
  is("an unavailable normal shows nothing", weatherBadge({ source: NORMALS, normals: { available: false } }), null);
  is("half a normal shows nothing rather than half a sentence", normalsLine({ available: true, low_c: 8 }), null);
  is("no data at all is null", normalsLine(null), null);
  ok("the API refuses to average too few years", /good\.length < 5/.test(apiSrc));
  // Module-scope state on a warm serverless container outlived the handler:
  // one rate-limited request poisoned every later response on that container,
  // and under concurrency reported A's failure inside B's answer.
  ok("the diagnostic object is per request", /const sourceErrors = \{\};\n    const \[owm, wapi\]/.test(apiSrc));
  ok("and is passed in rather than reached for", /openWeatherSeries\(lat, lon, sourceErrors\)/.test(apiSrc));
  ok("and answers 200 with available false rather than an error", /kind: "normals", available: false/.test(apiSrc));

  // ── RAIN, IN WORDS SOMEBODY PACKS BY ────────────────────────────
  is("four days in ten", wetDayWords(0.38), "about 4 days in ten see rain");
  is("one is singular", wetDayWords(0.1), "about one day in ten sees rain");
  is("rare is said plainly", wetDayWords(0.02), "rain is rare then");
  is("and so is constant", wetDayWords(0.92), "it rains most days then");
  // Number(null) is 0, and 0 is a finite share meaning "it never rains here".
  // This assertion failed on its first run for exactly that reason: an unknown
  // share was confidently reporting "rain is rare then".
  is("an unknown share says nothing", wetDayWords(null), "");
  is("undefined too", wetDayWords(undefined), "");
  is("and an empty string, which Number also calls zero", wetDayWords(""), "");
  is("but a real zero is still a real answer", wetDayWords(0), "rain is rare then");
  is("out of range says nothing", wetDayWords(1.4), "");
  // A trace of drizzle is not what somebody packing a coat is asking about.
  ok("a wet day is 1mm or more, not any trace", /v >= 1/.test(apiSrc));

  // The icon is coarse on purpose: a ten year average contains no weather.
  is("cold and wet is snow", normalsIcon({ high_c: 1, wet_day_share: 0.6 }), "🌨️");
  is("mild and wet is rain", normalsIcon({ high_c: 12, wet_day_share: 0.6 }), "🌧️");
  is("warm and dry is sun", normalsIcon({ high_c: 24, wet_day_share: 0.1 }), "☀️");

  // ── THE TRIP NOTE SAYS WHAT IT IS ───────────────────────────────
  // b.temp is the MIDPOINT of a normal range. Using it as the range printed
  // "expect 6° to 7°" under badges whose own line said "Normally 3° to 8°".
  is("the badge carries the real range, not just the midpoint", [nm.lowC, nm.highC], [8, 13]);
  const twoDays = normalsNote([
    { source: NORMALS, temp: 6, lowC: 3, highC: 8 },
    { source: NORMALS, temp: 7, lowC: 4, highC: 9 },
  ], "November");
  ok("the note states the real spread, not the midpoints", /3° to 9°/.test(twoDays));
  ok("and never the narrowed midpoint range", !/6° to 7°/.test(twoDays));

  const note = normalsNote([nm, nm], "November");
  ok("it says plainly that no forecast exists yet", /too far out for a real forecast/.test(note));
  ok("it names the source as averages", /ten year averages rather than a prediction/.test(note));
  ok("and tells them when a real one will exist", /Check again a week before you fly/.test(note));
  is("no normals means no note", normalsNote([fc], "November"), null);

  // ── "ICONS NEED TO BE MORE PROMINENT" ───────────────────────────
  ok("the icon is no longer body-text sized", /fontSize: 22, lineHeight: 1 \}\}>/.test(guideSrc));
  // The old tooltip stopped being true the moment arrival dates became real.
  ok("the trip-starts-today tooltip is gone", !/Forecast assumes the trip starts today/.test(guideSrc));

  // ── ONE FILE, TWO MODES, BECAUSE OF THE FUNCTION CAP ────────────
  const apiFiles = readdirSync(join(root, "api")).filter(f => f.endsWith(".js"));
  ok("api/ is still within Vercel Hobby's 12 function cap", apiFiles.length <= 12);
  ok("normals live inside the existing weather function", /mode === "normals"/.test(apiSrc));
}


// ── "BOTH SHOULD BE ABLE TO SERVE A PURPOSE" ───────────────────────
{
  const { mergeForecasts, agreementNote, SPREAD_DISAGREES_C, weatherIsStale,
          weatherChanges, WEATHER_STALE_HOURS, dayWeather, NORMALS } = M;
  const apiSrc = readFileSync(join(root, "api/weather.js"), "utf8");
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");

  const D = "2026-09-14";
  const three = {
    met: [{ date: D, temp_c: 14, wet: false }],
    openweathermap: [{ date: D, temp_c: 15, wet: false }],
    weatherapi: [{ date: D, temp_c: 13.5, wet: true }],
  };
  const m3 = mergeForecasts(three, D);
  is("three sources give the median", m3.temp_c, 14);
  is("and the spread is reported, not hidden", m3.spread_c, 1.5);
  is("all three counted", m3.sourceCount, 3);
  ok("a tight spread reads as agreement", m3.agree);
  is("agreement is stated on the badge", agreementNote(m3), "3 forecasts agree");
  // ONE VOTE FOR RAIN IS NOT A FORECAST OF RAIN. Marking the day wet on a
  // single dissenting source is how a dry week grows umbrellas.
  ok("one wet vote out of three is not a wet day", !m3.wet);

  const wide = mergeForecasts({ met: [{ date: D, temp_c: 10 }], weatherapi: [{ date: D, temp_c: 18 }] }, D);
  ok("a wide spread is not called agreement", !wide.agree);
  ok("and it says so plainly rather than picking one", /disagree by 8°/.test(agreementNote(wide)));
  ok("the disagreement threshold is a real number", SPREAD_DISAGREES_C > 0);

  // MEDIAN not mean: one provider having a bad day must not drag the answer.
  const outlier = mergeForecasts({
    met: [{ date: D, temp_c: 14 }], openweathermap: [{ date: D, temp_c: 15 }], weatherapi: [{ date: D, temp_c: 40 }],
  }, D);
  is("an outlier cannot move the median", outlier.temp_c, 15);

  // A missing key is one fewer opinion, not an error.
  const one = mergeForecasts({ met: [{ date: D, temp_c: 12, wet: true }], openweathermap: null, weatherapi: null }, D);
  is("one source still answers", one.temp_c, 12);
  is("with no agreement claim to make", one.agree, null);
  is("and no note, because '1 source' on every badge is noise", agreementNote(one), "");
  ok("a lone source's own wet call is kept", one.wet);
  is("no source at all is null, not zero", mergeForecasts({ met: [] }, D), null);
  is("a day nobody covers is null", mergeForecasts(three, "2030-01-01"), null);
  // A missing key is one fewer opinion, not an error, AND it now says which.
  // Both keys sat in Vercel from 29 July returning null the whole time, because
  // I guessed the variable names rather than looking at them. His are
  // OPENWEATHERMAP and WEATHER_API_KEY.
  ok("both keys are optional in the API", /!OWM_KEY\)/.test(apiSrc) && /!WAPI_KEY\)/.test(apiSrc));
  ok("the name he actually used is read", /process\.env\.OPENWEATHERMAP\b/.test(apiSrc));
  ok("and so is the other one", /process\.env\.WEATHER_API_KEY\b/.test(apiSrc));
  // A silent null could not tell no-key from bad-key from plan-limit.
  ok("a missing source says why", /sourceErrors\.openweathermap = "no key set"/.test(apiSrc));
  ok("and that reaches the response", /source_errors: sourceErrors/.test(apiSrc));
  ok("but never the key itself", !/sourceErrors\.\w+ = .{0,20}KEY/.test(apiSrc));
  // WeatherAPI's free tier serves 3 days and rejects 14 outright, so asking
  // for the maximum and giving up made a good key look like a missing one.
  ok("a plan limit is retried, not swallowed", /await call\(14\)\) \|\| \(await call\(3\)\)/.test(apiSrc));

  // "Without changing hotel" was written from the route planner's point of
  // view, for a reader who has no hotel yet. Oliver's friend: "it makes no sense."
  const detailSrc = readFileSync(join(root, "src/components/DetailPage.jsx"), "utf8");
  // ── THE LIST IS GONE, THE FIELD IS NOT ─────────────────────────
  // Rudkobing appeared as a day trip from Copenhagen because its stored
  // dayTripFrom says so. The first fix was three checks around that field.
  // Deleting the reader-facing list deletes the failure mode instead, which
  // is the only fix that cannot regress.
  ok("no day-trip list reaches readers", !/Day trips from/.test(stripNonCode(detailSrc)));
  ok("and neither does the planner jargon", !/Without changing hotel/.test(stripNonCode(detailSrc)));
  ok("the town page no longer reads the curated field", !/dayTripsFrom/.test(stripNonCode(detailSrc)));
  // Containment is a different claim and does not go stale, so it stays.
  ok("Inside survives", /group\(`Inside \$\{item\.name\}`/.test(detailSrc));
  // The guard has to narrow with the cut, or a town with no areas inside it
  // but a stale dayTripFrom renders an empty bordered card.
  ok("the empty-card guard narrowed too", /if \(!inside\.length\) return null;/.test(detailSrc));
  ok("the old two-sided guard is gone", !/!inside\.length && !trips\.length/.test(stripNonCode(detailSrc)));
  // THE FIELD ITSELF SURVIVES, for the planner. Deleting it would break the
  // thing coordinates cannot answer: does this stop collapse into the town.
  const planSrc = readFileSync(join(root, "src/utils/placeKind.js"), "utf8");
  ok("dayTripsFrom still exists for the planner", /export const dayTripsFrom/.test(planSrc));

  // ── REFRESH ON OPEN ─────────────────────────────────────────────
  ok("never fetched is stale", weatherIsStale(null));
  ok("garbage is stale", weatherIsStale("not a date"));
  ok("just fetched is not stale", !weatherIsStale(new Date().toISOString()));
  const old = new Date(Date.now() - (WEATHER_STALE_HOURS + 1) * 3600000).toISOString();
  ok("yesterday's answer is stale", weatherIsStale(old));
  ok("the guide records when it looked", /_weatherFetchedAt: new Date\(\)\.toISOString\(\)/.test(appSrc));

  // Only changes worth interrupting somebody for.
  const before = [{ source: "forecast", risk: "none", temp: 18 }, { source: "forecast", risk: "high", temp: 14 }, { source: "forecast", risk: "none", temp: 17 }];
  const after = [{ source: "forecast", risk: "high", temp: 17 }, { source: "forecast", risk: "none", temp: 14 }, { source: "forecast", risk: "none", temp: 16 }];
  const moved = weatherChanges(before, after);
  ok("a dry day turning wet is news", moved.some(x => /Day 1 now looks wet/.test(x)));
  ok("a wet day drying up is news", moved.some(x => /Day 2 has dried up/.test(x)));
  ok("one degree of drift is not news", !moved.some(x => /Day 3/.test(x)));
  is("nothing moving says nothing", weatherChanges(before, before), []);
  // Crossing from normals into a real forecast is the trip getting close, not
  // the weather changing, and reporting it as a change would be wrong.
  is("gaining a forecast is not a forecast change",
    weatherChanges([{ source: "normals", risk: "none", temp: 12 }], [{ source: "forecast", risk: "high", temp: 12 }]), []);

  // ── ONE IMPLEMENTATION, BOTH CALL SITES ─────────────────────────
  const guideSrc = readFileSync(join(root, "src/pages/GuidePage.jsx"), "utf8");
  ok("the build path uses the shared helper", /dayWeather\(\{/.test(appSrc));
  ok("and so does the refresh path", /dayWeather\(\{/.test(guideSrc));

  // Injected fetcher, so this runs with no network at all.
  const canned = async (url) => {
    if (/mode=normals/.test(url)) return { available: true, high_c: 13, low_c: 8, wet_day_share: 0.4, years: 10 };
    return { sources: three, forecast: [] };
  };
  const near = await dayWeather({ point: { lat: 55, lon: 12 }, date: D, daysOut: 2, fetchJson: canned });
  is("a near day merges every source", near.temp, 14);
  is("and is labelled a forecast", near.label, "forecast");
  ok("with the agreement on it", /3 forecasts agree/.test(near.detail));
  const far = await dayWeather({ point: { lat: 55, lon: 12 }, date: D, daysOut: 120, fetchJson: canned });
  is("a far day is a normal", far.label, "typical");
  ok("and never says forecast", !/forecast/i.test(JSON.stringify(far)));
  // An older deployed API with no `sources` must not blank the badge.
  const legacy = await dayWeather({ point: { lat: 55, lon: 12 }, date: D, daysOut: 2,
    fetchJson: async () => ({ forecast: [{ date: D, temperature_c: 16.4, condition: "rain" }] }) });
  is("a stale deployed API still renders", legacy.temp, 16);
  is("no point, no badge", await dayWeather({ point: null, date: D, daysOut: 1, fetchJson: canned }), null);
}


// ── "GIVE THE SEARCHING A PRIORITY" ────────────────────────────────
{
  const { coverageByPart, thinnestParts, coverageSummary, discoveryFraming, isAlreadyCovered, PARTS, fold } = M;
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");

  // Real coordinates, so the parts are decided the same way the site decides
  // them rather than by a string I chose to make the test pass.
  const cph = { __lat: 55.6761, __lon: 12.5683 };   // Copenhagen
  const aar = { __lat: 56.1629, __lon: 10.2039 };   // Aarhus
  const rows = [cph, cph, cph, cph, aar].map(payload => ({ payload }));

  const counts = coverageByPart(rows);
  ok("every part is counted, including the empty ones", PARTS.every(p => p in counts));
  ok("the heavy part is heavy", Math.max(...Object.values(counts)) === 4);
  const summary = coverageSummary(rows);
  is("the total is the rows placed", summary.total, 5);
  ok("the lopsidedness is reported as a share", summary.heaviestShare > 0.5);
  ok("and empty parts are named", summary.empty.length > 0);
  is("no rows at all is null, not a fake summary", coverageSummary([]), null);

  // THE PRIORITY IS DERIVED, NOT TYPED. A hand-written list of islands to
  // prioritise would be one more curated field to keep true, which is the
  // exact thing Rudkobing taught.
  const thin = thinnestParts(rows, 3);
  is("three parts are offered", thin.length, 3);
  ok("the part with the most content is not one of them", !thin.includes(summary.heaviest));
  // Stable between calls, or the framing reshuffles on every render.
  is("ties keep a fixed order", thinnestParts(rows, 3), thinnestParts(rows, 3));

  const framing = discoveryFraming(rows, { typeLabel: "towns" });
  // ── THE DANISH INSTRUCTION IS THE WHOLE POINT ───────────────────
  // English writing about Denmark is the tourist canon, ranked by how many
  // people already read it, which is the opposite of what this guide is for.
  ok("it demands Danish queries", /SEARCH IN DANISH/.test(framing));
  ok("and says how many", /three of the five/i.test(framing));
  // A model told merely to "use Danish" writes English sentences with Danish
  // place names in them, which reaches the same English internet.
  ok("it forbids the English-sentence-with-Danish-names trap", /not an English sentence with Danish place names/.test(framing));
  ok("it gives real Danish phrasings to use", /skjulte perler/.test(framing) && /seværdigheder/.test(framing));
  ok("and insists on the real Danish letters", /Ærø is Ærø and not Aero/.test(framing));

  ok("the computed gap reaches the prompt", /COVERAGE GAP, COMPUTED/.test(framing));
  ok("the thin parts are named in it", thin.some(p => framing.includes(p)));
  ok("and Copenhagen is explicitly deprioritised", /Do not aim any query at Copenhagen/.test(framing));
  // Famous is a disqualifier here, which is the brand stated as an instruction.
  ok("fame counts against a candidate", /FAMOUS IS A DISQUALIFIER/.test(framing));
  ok("the type is named so the framing is not generic", /towns/.test(framing));

  // It has to survive a cold start, when nothing is published at all.
  const empty = discoveryFraming([], { typeLabel: "towns" });
  ok("an empty database still gets the Danish instruction", /SEARCH IN DANISH/.test(empty));

  ok("the framing reaches the query planner", /\$\{discoverAim\}/.test(appSrc));
  ok("computed from published rows, not a typed list", /framingForTarget\(discoverTarget, manageItems \|\| \[\]/.test(appSrc));

  // Copenhagen and Kobenhavn are one place and were being offered twice.
  // Folding gives "kobenhavn" and "copenhagen": two different strings, neither
  // containing the other. A folded compare cannot know they are one city, and
  // this assertion failed that way on its first run. samePlaceName knows.
  ok("published under its Danish name is caught", isAlreadyCovered("København", ["Copenhagen"]));
  ok("and the other way round", isAlreadyCovered("Copenhagen", ["København"]));
  ok("a longer form of a published name is caught", isAlreadyCovered("Reffen Street Food", ["Reffen"]));
  ok("something genuinely new is not", !isAlreadyCovered("Rudkøbing", ["Copenhagen", "Aarhus"]));
  ok("an empty name is not covered", !isAlreadyCovered("", ["Copenhagen"]));
}


// ── "GIVE ME OPTIONS" ──────────────────────────────────────────────
{
  const { DISCOVERY_TARGETS, targetById, coverageByTarget, framingForTarget } = M;
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");

  // Targeting has its OWN vocabulary. geography's five parts answer "which
  // landmass is this coordinate on", which is right for that and far too
  // coarse to aim a search: "Jutland" is a third of the country.
  ok("the regions he named are all offered", ["north-jutland", "central-jutland", "south-jutland", "north-zealand", "funen", "small-islands"]
    .every(id => DISCOVERY_TARGETS.some(t => t.id === id)));
  ok("an unknown id falls back rather than throwing", targetById("nonsense").id === "anywhere");
  // EVERY TARGET CARRIES ITS DANISH NAME, and that is load-bearing now the
  // queries are Danish: a Dane does not write about "South Jutland".
  ok("every real target has a Danish name", DISCOVERY_TARGETS.filter(t => t.id !== "anywhere").every(t => !!t.danish));
  ok("and Sonderjylland is the one used", targetById("south-jutland").danish === "Sønderjylland");

  const rows = [
    { payload: { __lat: 57.44, __lon: 10.54 } },  // Skagen, north Jutland
    { payload: { __lat: 55.47, __lon: 8.45 } },   // Esbjerg, south Jutland
    { payload: { __lat: 55.86, __lon: 12.50 } },  // north Zealand
  ];
  const counts = coverageByTarget(rows);
  is("north Jutland has its one", counts["north-jutland"], 1);
  is("south Jutland has its one", counts["south-jutland"], 1);
  is("north Zealand has its one", counts["north-zealand"], 1);
  is("central Jutland is empty and says so", counts["central-jutland"], 0);
  // AN ISLAND IS NOT A LATITUDE BAND. A count that is quietly false is worse
  // than no count, so this one refuses rather than guessing.
  is("the small islands report no count rather than a wrong one", counts["small-islands"], null);

  // A chosen region replaces the computed gap and keeps every other rule.
  const f = framingForTarget("south-jutland", rows, { typeLabel: "towns" });
  ok("the region is named", /SEARCH THIS REGION: South Jutland/.test(f));
  ok("with its Danish name to search under", /Sønderjylland/.test(f));
  ok("the Danish rule survives the override", /SEARCH IN DANISH/i.test(f));
  ok("and so does famous-is-a-disqualifier", /FAMOUS IS A DISQUALIFIER/.test(f));
  ok("the computed gap is replaced, not stacked", !/COVERAGE GAP, COMPUTED/.test(f));
  // The Copenhagen problem one level down: search "Jutland" and get Aarhus
  // every time.
  ok("the regional big city is capped too", /do not let them absorb more than one/.test(f));

  // "hell, make me able to search for town-specific events perhaps"
  const t = framingForTarget("anywhere", rows, { typeLabel: "events", town: "Ærøskøbing" });
  ok("a named town takes over every query", /SEARCH THIS PLACE AND ONLY THIS PLACE: Ærøskøbing/.test(t));
  ok("and is not silently swapped for a bigger neighbour", /do not substitute a better known place nearby/.test(t));
  ok("a town beats a region when both are set", !/SEARCH THIS REGION/.test(framingForTarget("funen", rows, { town: "Odense" })));
  ok("blank town is not a town", !/ONLY THIS PLACE/.test(framingForTarget("funen", rows, { town: "   " })));

  // Anywhere leaves the computed priority in charge.
  ok("anywhere keeps the computed gap", /COVERAGE GAP, COMPUTED/.test(framingForTarget("anywhere", rows, { typeLabel: "towns" })));
  ok("the small islands get their own framing", /SEARCH THE SMALL DANISH ISLANDS/.test(framingForTarget("small-islands", rows, {})));

  ok("the picker is wired to the search", /framingForTarget\(discoverTarget/.test(appSrc));
  ok("and the town box reaches it", /town: discoverTown/.test(appSrc));
  ok("picking a town clears the region chip", /setDiscoverTarget\(opt\.id\); setDiscoverTown\(""\)/.test(appSrc));
}

// ── THE DANISH LETTERS, AND THE CANDIDATES THEY WERE COSTING ────────
// Bug A of 10 Aug. helpers.js's normName ran NFD and then stripped anything
// outside [a-z0-9 ]. NFD leaves æ, ø and å alone, so the strip deleted them:
//
//     "Ærø" -> "r"       "Møn" -> "mn"      "Læsø" -> "ls"
//
// dedupeAgainstExisting then dropped any candidate whose normalised name
// CONTAINED an existing one. With Ærø published that is the letter r, so four
// of five real candidates were binned, and nothing counted them. The visible
// symptom was a discovery run that kept coming back nearly empty, which reads
// exactly like "there is nothing left to find in Denmark".
//
// A test written against normName alone could not have caught this: it would
// have asserted whatever normName already did. The assertion that has teeth is
// the one about the CANDIDATES, so that is the one below.
{
  const { splitAlreadyCovered, isAlreadyCovered, containsName, fold } = M;
  const helpersSrc = readFileSync(join(root, "src/utils/helpers.js"), "utf8");
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");

  // The fold is the thing normName should have been all along.
  is("ae survives the fold", fold("Ærø"), "aero");
  is("o survives the fold", fold("Møn"), "mon");
  is("and so does the pair", fold("Læsø"), "laeso");

  // THE ONE THAT MATTERS. Five real Danish places, one published island.
  const candidates = ["Rudkøbing", "Marstal", "Dragør", "Mariager", "Ebeltoft"].map(name => ({ name }));
  const { kept, dropped } = splitAlreadyCovered(candidates, ["Ærø"]);
  is("publishing Ærø costs no candidate", kept.map(c => c.name), ["Rudkøbing", "Marstal", "Dragør", "Mariager", "Ebeltoft"]);
  is("and nothing is dropped behind his back", dropped.length, 0);

  // A real duplicate still goes, and is handed back rather than swallowed.
  const two = splitAlreadyCovered([{ name: "Ærø" }, { name: "Marstal" }], ["Ærø"]);
  is("a genuine duplicate is still dropped", two.kept.map(c => c.name), ["Marstal"]);
  is("and the drop is reported", two.dropped.map(c => c.name), ["Ærø"]);
  is("a nameless candidate is neither kept nor counted", splitAlreadyCovered([{ hook: "no name" }], []).kept.length, 0);

  // ── THE WORD BOUNDARY ─────────────────────────────────────────────
  // Fixing the fold alone would have left a second silent drop behind, because
  // the containment test compared raw substrings. These are four real Danish
  // islands, not four spellings of one.
  ok("Falster is not Als", !isAlreadyCovered("Falster", ["Als"]));
  ok("Furesø is not Fur", !isAlreadyCovered("Furesø", ["Fur"]));
  ok("Ærøskøbing is a town, not the island Ærø", !isAlreadyCovered("Ærøskøbing", ["Ærø"]));
  ok("Mønsted is not Møn", !isAlreadyCovered("Mønsted", ["Møn"]));
  // And the case the containment fallback exists for still works.
  ok("a longer form of a published name is still caught", isAlreadyCovered("Reffen Street Food", ["Reffen"]));
  ok("punctuation is a gap, not a letter", isAlreadyCovered("Reffen, Copenhagen", ["Reffen"]));
  ok("the cross-language pair still holds", isAlreadyCovered("København", ["Copenhagen"]));

  // containsName is shared with the preview screen (bug D), so it is pinned here
  // as its own unit rather than only through its callers.
  ok("a whole word matches", containsName("four days in Copenhagen", "Copenhagen"));
  ok("a word at the very end matches", containsName("we fly into Aalborg", "Aalborg"));
  ok("Als does not match inside also", !containsName("we would also like a beach", "Als"));
  ok("Møn does not match inside money", !containsName("not much money to spend", "Møn"));
  ok("Møn does not match inside Monday", !containsName("arriving Monday", "Møn"));
  ok("an empty name matches nothing", !containsName("anything at all", ""));
  ok("Aarhus and Århus are one place", containsName("three days in Århus", "Aarhus"));

  // ── AND THAT IT IS ACTUALLY WIRED ─────────────────────────────────
  // isAlreadyCovered was written, tested and imported by nothing for a whole
  // session while the broken helper stayed in the call path. A passing unit
  // test proved only that the function worked, never that it ran.
  ok("the broken normName is gone", !/export const normName/.test(stripNonCode(helpersSrc)));
  ok("and so is dedupeAgainstExisting", !/export const dedupeAgainstExisting/.test(stripNonCode(helpersSrc)));
  ok("the app no longer imports it", !/dedupeAgainstExisting/.test(stripNonCode(appSrc)));
  ok("the app imports the real one", /splitAlreadyCovered/.test(stripNonCode(appSrc)));
  ok("and calls it on the discovery candidates", /splitAlreadyCovered\(candidates, existing\)/.test(stripNonCode(appSrc)));
  // The screen promises a list is never silently shorter. Now it can keep it.
  ok("the already-published drops are counted", /setDiscoverCovered\(covered\.length\)/.test(stripNonCode(appSrc)));
  // Raw source, not stripNonCode, and this is the one place in this block where
  // that is right: stripNonCode reads a JSX body as string content and deletes
  // it, so the render site disappears before the regex ever sees it. The usual
  // danger of raw source is matching a COMMENT describing the code rather than
  // the code, so the pattern is shaped like the expression and not like prose.
  ok("and shown", /\{discoverCovered > 0 && \(/.test(appSrc));
  ok("and reset on the next run", /setDiscoverCovered\(0\)/.test(stripNonCode(appSrc)));
}

// ── ONE resolveLegMode, NOT TWO ─────────────────────────────────────
// Bug C of 10 Aug. App.jsx carried its own resolveLegMode alongside the one in
// utils/guideEnrichment.js. BOTH had a comment reading "SINGLE SOURCE OF TRUTH
// for leg transport mode" above them, and they disagreed: the local copy kept
// the old rule that turned any 1.1 to 60 km walk into bicycling, while the
// shared one had moved to following the trip's primary mode.
//
// The cost was invisible, which is why it lasted. fetchExactDurations stored a
// real, paid-for Google duration under `A|B|bicycling`; GuidePage looked up
// `A|B|transit`, missed, and printed a straight-line estimate. A measured answer
// discarded in favour of a guess, with nothing on screen to say so.
//
// The behavioural assertions below would pass against either copy read alone.
// The one with teeth against a THIRD copy appearing is the file scan.
{
  const { resolveLegMode, WALK_MAX_KM } = M;
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");

  // Both ends precise and about 10 km apart: far past any walk.
  const geo = { A: { lat: 55.6761, lon: 12.5683 }, B: { lat: 55.7661, lon: 12.5683 } };
  ok("the fixture really is a long leg", WALK_MAX_KM < 5);
  is("a too-far walk on a transit trip is transit", resolveLegMode("walk along the harbour", "transit", "A", "B", false, geo), "transit");
  is("a too-far walk on a car trip is driving", resolveLegMode("walk", "car", "A", "B", false, geo), "driving");
  is("a too-far walk on a bike trip is bicycling", resolveLegMode("walk", "bike", "A", "B", false, geo), "bicycling");
  // The deleted copy answered "bicycling" to all three. That is the drift.
  ok("the old every-walk-becomes-a-bike rule is gone", resolveLegMode("walk", "transit", "A", "B", false, geo) !== "bicycling");
  // And a walk that IS a walk still is one.
  is("a short walk stays a walk", resolveLegMode("walk", "transit", "A", "A", false, { A: { lat: 55.6761, lon: 12.5683 } }), "walking");
  // onlyWalking lifts the cap rather than rewriting the leg.
  is("a walking-only trip keeps its long walk", resolveLegMode("walk", "transit", "A", "B", true, geo), "walking");

  // ── AND ONLY ONE OF IT EXISTS ─────────────────────────────────────
  const jsFiles = [];
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach(e => {
    if (e.isDirectory()) walk(join(d, e.name));
    else if (/\.(js|jsx|mjs)$/.test(e.name)) jsFiles.push(join(d, e.name));
  });
  walk(join(root, "src"));
  ok("the scan found the source tree", jsFiles.length > 30);
  const definers = jsFiles.filter(f => /(?:const|function)\s+resolveLegMode\s*[=(]/.test(stripNonCode(readFileSync(f, "utf8"))));
  is("resolveLegMode is defined in exactly one file", definers.map(f => f.slice(root.length)), ["src/utils/guideEnrichment.js"]);
  ok("the app imports it rather than declaring it", /import \{[^}]*\bresolveLegMode\b[^}]*\} from "\.\/utils\/guideEnrichment"/.test(appSrc));
  ok("and its private distance helper went with it", !/legKmOrNull/.test(stripNonCode(appSrc)));
}

// ── THE PREVIEW SCREEN'S PADDING THAT WAS NEVER USED ────────────────
// Bug D of 10 Aug. `mentions` built `const hay = \` ${norm} \``, a haystack
// padded on both sides, which is exactly how a whole-word check is built, and
// then tested `hay.includes(f)` on it, which ignores the padding entirely.
// The 3-character minimum beside it was standing in for the boundary check and
// could not do that job: "Als" and "Møn" are three characters, so the guard
// admitted precisely the names that cause trouble.
{
  const previewSrc = readFileSync(join(root, "src/components/GuidePreviewScreen.jsx"), "utf8");
  const code = stripNonCode(previewSrc);
  ok("the preview screen uses the shared boundary check", /containsName\(convoText, v\)/.test(code));
  ok("and imports it", /import \{[^}]*\bcontainsName\b[^}]*\} from "\.\.\/utils\/danishNames"/.test(previewSrc));
  // The bare include is what made "also" an island. It must not come back.
  ok("the unpadded include is gone", !/hay\.includes\(/.test(code));
  ok("and the length guard standing in for it is gone", !/f\.length >= 3/.test(code));
}

// ── THE MAP FRAME THAT OUTLIVES THE MAP ─────────────────────────────
// Bug F of 10 Aug. requestAnimationFrame(() => map.invalidateSize()) captured
// the Leaflet instance directly and was never cancelled, while the unmount
// effect below it calls map.remove(). Unmount inside one frame of creation and
// invalidateSize reads a size off a nulled container and throws.
//
// StrictMode happens to run the cleanup before the frame fires, so this cannot
// show up in development. That is the whole reason it is asserted on the source
// rather than left to be noticed.
{
  const mapSrc = readFileSync(join(root, "src/components/GuideRouteMap.jsx"), "utf8");
  const code = stripNonCode(mapSrc);
  ok("the frame is held so it can be cancelled", /rafRef\.current = requestAnimationFrame\(/.test(code));
  ok("and the unmount cleanup cancels it", /cancelAnimationFrame\(rafRef\.current\)/.test(code));
  ok("the callback reads the ref, not the captured map", /if \(mapRef\.current\) mapRef\.current\.invalidateSize\(\)/.test(code));
  ok("no bare frame is left calling the captured instance", !/requestAnimationFrame\(\(\) => map\.invalidateSize\(\)\)/.test(code));
  // The cancel has to be in the effect that also removes the map, or an unmount
  // takes one path and not the other.
  const cleanup = code.slice(code.indexOf("cancelAnimationFrame"));
  ok("the cancel runs before the map is removed", cleanup.indexOf("mapRef.current.remove()") > 0);
}

// ── THE TIER A SENTENCE RECOMMENDS, NOT THE ONE IT MENTIONS FIRST ───
// Bug E of 10 Aug. stayTier was TIERS.find(...), so the answer was decided by
// position in a list whose order exists for regex specificity (hostel before
// hotel so "youth hostel" is not read as a hotel) and says nothing about what a
// sentence recommends. "A real hotel rather than a hostel" came back "hostel".
//
// That is not only a wrong label. stayTierMismatch compares it against the
// named property, so a correctly named hotel became "this day contradicts
// itself", a warning manufactured from a sentence that was right, shown to
// Oliver as a plan problem.
{
  const { stayTier, stayTiers, stayTierMismatch, stayProblems } = M;

  // THE ONE FROM THE HANDOFF.
  is("rather than a hostel means a hotel", stayTier("a real hotel rather than a hostel"), "hotel");
  is("and the sentence the other way round still reads correctly", stayTier("a hostel rather than a hotel"), "hostel");
  is("not a hotel, a hostel", stayTier("not a hotel, book a hostel near the station"), "hostel");
  is("instead of is a contrast too", stayTier("a guesthouse instead of a hotel"), "guesthouse");
  is("so is not just", stayTier("not just a hostel, a proper hotel"), "hotel");

  // A sentence that only says what it is NOT names no tier. Inventing one from
  // it is the guess this file exists to stop.
  is("a refusal alone names no tier", stayTier("this is not a hotel town"), null);

  // Everything the plain version got right, it still gets right.
  is("a hostel sentence is still a hostel", stayTier("Book a hostel near Norreport, from EUR 30"), "hostel");
  is("a hotel sentence is still a hotel", stayTier("Stay in central Odense for a comfortable hotel base"), "hotel");
  is("Danhostel is still a hostel", stayTier("Danhostel Copenhagen City"), "hostel");
  is("a youth hostel is not a hotel", stayTier("a youth hostel in the old town"), "hostel");
  is("an area sentence still names no tier", stayTier("Stay in central Odense near the cathedral"), null);
  is("Danish still counts", stayTier("et vandrerhjem i byen"), "hostel");

  // AND THE CONSEQUENCE, which is the assertion that would have caught it.
  ok("a contrasting sentence with a matching hotel is not a contradiction",
    !stayTierMismatch("a real hotel rather than a hostel", "Hotel Odeon"));
  ok("a genuine disagreement is still caught",
    stayTierMismatch("a real hotel rather than a hostel", "Danhostel Copenhagen City"));
  is("and no plan problem is invented from it",
    stayProblems([{ glance: { accommodation: "a real hotel rather than a hostel", recommendedStay: "Hotel Odeon" } }]), []);
  is("the trip's tier list reads the sentence, not the list order",
    stayTiers([{ glance: { accommodation: "a real hotel rather than a hostel" } }]), ["hotel"]);

  // The regexes are rebuilt per call. A /g/ pattern reused across calls carries
  // lastIndex and would answer differently the second time it saw the same text.
  const twice = ["Book a hostel near Norreport", "Book a hostel near Norreport"].map(stayTier);
  is("the same sentence answers the same way twice", twice, ["hostel", "hostel"]);
}

// ── THE ROUNDS BEFORE A GUIDE ───────────────────────────────────────
// Oliver, 10 Aug 2026, relaying a friend: "he finds the Gemlyx guide annoying.
// It talks too much before giving a guide to him... I also think the 'do you
// want a simple guide or bla bla bla' is unnecessary to ask."
//
// Two separate rules in the system prompt were charging a round trip each.
//
// 1. A MANDATED FINAL QUESTION WHOSE ANSWER WAS NEVER READ. The prompt required
//    "simple plan or full hour-by-hour schedule?" as the last question before
//    building. The interface then asks the same thing on the "How do you want
//    to see it?" screen, and ONLY that screen's answer reaches generateGuide as
//    modeOverride. The chat answer fed nothing at all.
//
// 2. A TICK-BOX RULE THAT FIRED 100% OF THE TIME. It said the reply after the
//    intake form must never contain a plan "not even if literally every single
//    field was filled in and there is genuinely nothing left to ask". So the
//    traveler who did the most work to be clear was guaranteed the most
//    friction.
//
// NOTE ON WHY THESE READ RAW appSrc AND NOT stripNonCode: the system prompt IS
// a template literal, so stripNonCode deletes the entire thing and every one of
// these assertions would pass against nothing at all.
{
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");
  const sysStart = appSrc.indexOf("const sysPrompt = `");
  ok("the system prompt was found", sysStart > 0);
  const sysPrompt = appSrc.slice(sysStart, appSrc.indexOf("MERCHANDISE:", sysStart));
  ok("and it is the real thing, not an empty slice", sysPrompt.length > 4000);

  // 1. The question is gone, in every phrasing it was written in.
  ok("the mandated final question is gone", !/hour-by-hour schedule/.test(sysPrompt));
  ok("and it is not quoted back at the model either", !/simple plan you can glance at/.test(appSrc));
  ok("the model is told to build instead", /ONCE YOU KNOW ENOUGH TO BUILD, BUILD/.test(sysPrompt));
  ok("and told why, so it is not reinvented", /never ask how detailed or how simple they want it/.test(sysPrompt));
  // The screen that DOES own this choice is still there and still the only
  // thing feeding modeOverride. Deleting the question must not delete the choice.
  ok("the choice still lives on its own screen", /How do you want to see it\?/.test(appSrc));
  // Raw source: this call sits in JSX, and stripNonCode blanks JSX wholesale.
  ok("and still reaches generateGuide", /generateGuide\(undefined, "plain"\)/.test(appSrc));

  // 2. The tick-box reply is conditional now.
  ok("the absolute never-plan rule is gone", !/THIS RULE IS ABSOLUTE, NO EXCEPTIONS/.test(sysPrompt));
  ok("and so is the 100% of the time wording", !/This is true 100% of the time/.test(sysPrompt));
  ok("a complete form goes straight to the handoff", /go straight to the ready-to-build handoff/.test(sysPrompt));
  ok("a question is only for something genuinely missing", /WHAT COMES AFTER THAT LINE DEPENDS ENTIRELY ON WHETHER ANYTHING IS STILL MISSING/.test(sysPrompt));
  ok("inventing one to fill the slot is forbidden", /do NOT manufacture a question to fill the slot/.test(sysPrompt));
  // The Applied line survives: it is what tells someone their ticks landed.
  ok("the Applied line is still required", /"Applied: \.\.\." line/.test(sysPrompt));
  // And the follow-on rule no longer assumes a question was asked.
  ok("the green light is conditional on having asked", /If you DID ask a question after the Applied line/.test(sysPrompt));
}

// ── THE BUTTON THAT COULD NOT BE SEEN ───────────────────────────────
// "I don't know, perhaps it wasn't visible to him that he could click 'turn
// this into a guide'." It could have been absent, not merely unnoticed: the
// only gate was the [[GEMLYX_READY_TO_BUILD]] marker, and the prompt tells the
// model to withhold it on any doubt. isFullPlanText was written for this exact
// case and was imported into App.jsx and called nowhere.
{
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");
  const code = stripNonCode(appSrc);
  const { isFullPlanText, isReadyToBuild } = M;

  ok("the fallback is wired to the button", /isReadyToBuild\(lastAssistantMsg\.text\) \|\| isFullPlanText\(lastAssistantMsg\.text\)/.test(code));

  // What the fallback catches: a real plan with no marker on it.
  const planNoMarker = "Day 1: Copenhagen, Nyhavn and the Round Tower.\nDay 2: train to Odense for H.C. Andersen's house.\nDay 3: Aarhus and Den Gamle By.";
  ok("a plan without the marker is still a plan", isFullPlanText(planNoMarker));
  ok("and the marker gate alone would have missed it", !isReadyToBuild(planNoMarker));
  // What it must NOT catch: ordinary conversation, which would put a build
  // button under a question and offer to spend money on nothing.
  ok("a question is not a plan", !isFullPlanText("Where are you flying into, and how many days do you have?"));
  ok("a short answer is not a plan", !isFullPlanText("Kronborg is worth the trip, it is 45 minutes by train."));
  ok("one bare day header is not a plan", !isFullPlanText("Day 1: arrive."));

  // The wait estimate. The CTA promised seconds over a screen that admits to
  // minutes, on the exact screen where somebody decides whether to wait.
  ok("the CTA no longer promises seconds", !/Takes a few seconds/.test(appSrc));
  ok("it says minutes, like the loading screen does", /Takes a few minutes\. Real places, real routes, checked\./.test(appSrc));
}

// ── MINIMIZE THE WAIT, KEEP THE BUILD ───────────────────────────────
// "maybe we should be able to minimize the loading screen.. and then when it's
// done, it will show as a notification at the top."
//
// The ✕ already left the build running, because nothing cancels an async
// function, so the only thing it ever did was hide the evidence and then
// navigate the traveler away from wherever they had gone.
{
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");
  const code = stripNonCode(appSrc);

  ok("minimizing is a state, not a close", /const \[guideMinimized, setGuideMinimized\] = useState\(false\)/.test(code));
  ok("and readiness is its own state", /const \[guideReady, setGuideReady\] = useState\(false\)/.test(code));
  // THE ONE THAT MATTERS: dismissing must not drop the build state.
  ok("the overlay backdrop minimizes rather than nulling the build", /onClick=\{\(\) => setGuideMinimized\(true\)\}/.test(appSrc));
  ok("the corner control does too", /setGuideMinimized\(true\); \}\} aria-label="Keep browsing while this builds"/.test(appSrc));
  ok("the overlay hides while minimized", /guideModal === "loading" && !guideMinimized/.test(appSrc));
  ok("and the bar shows in its place", /guideModal === "loading" && guideMinimized/.test(appSrc));
  // One source of progress, so the bar cannot claim a different stage.
  const bar = appSrc.slice(appSrc.indexOf('guideModal === "loading" && guideMinimized'));
  ok("the bar reads the real pipeline stage", /guideBuildStage\?\.label/.test(bar.slice(0, 1600)));
  ok("and the real percent", /guideBuildStage\?\.percent/.test(bar.slice(0, 1600)));

  // The notification, and the interruption it replaces.
  ok("a minimized build does not navigate on its own", /if \(guideMinimized\) \{ setGuideReady\(true\); return; \}/.test(code));
  ok("the ref is claimed before that return, so it cannot re-fire", code.indexOf("navigatedGuideGidRef.current = guideModal._gid") < code.indexOf("if (guideMinimized) { setGuideReady(true); return; }"));
  ok("the effect re-runs when minimizing changes", /\}, \[guideModal, guideMinimized\]\)/.test(code));
  ok("the banner exists", /Your guide is ready/.test(appSrc));
  ok("and opens the guide when tapped", /setGuideReady\(false\); setGuideMinimized\(false\); if \(guideModal && typeof guideModal === "object"\) navigate\("\/guide\/new"/.test(appSrc));
  // A watched build behaves exactly as before. Minimizing is opt-in.
  ok("an unminimized build still navigates straight there", /if \(guideMinimized\) \{ setGuideReady\(true\); return; \}\s*\n\s*navigate\("\/guide\/new", \{ state: \{ guide: guideModal \} \}\);/.test(appSrc));

  // Both flags reset where a stale one would be visible. Anchors asserted
  // before slicing: a missed indexOf gives -1, and !/x/.test("") is true, which
  // is how a real guard silently becomes a passing one.
  ok("the build start was found", appSrc.includes('setGuideModal("loading");'));
  // ANCHORED ON THE CALL, NOT THE PHRASE. The words "Guide build failed:"
  // appear EARLIER in this file inside a comment quoting the 8 Aug TDZ crash,
  // so a plain indexOf lands 5000 lines above the catch block and the slice
  // below tests a comment about a different bug entirely. This is the trap the
  // handoff names, met in the wild.
  ok("the failure path was found", appSrc.includes('console.warn("Guide build failed:'));
  // Bounded by the NEXT REAL STATEMENT rather than by a byte count. The first
  // version sliced 400 characters and broke the moment a comment was inserted
  // between the anchors, which is a test failing for a reason that has nothing
  // to do with what it guards.
  const buildStart = appSrc.indexOf('setGuideModal("loading");');
  const buildEnd = appSrc.indexOf("setGuideBuildStage({", buildStart);
  ok("the build setup block has an end", buildEnd > buildStart);
  const build = appSrc.slice(buildStart, buildEnd);
  ok("a new build clears the minimized flag", /setGuideMinimized\(false\);/.test(build));
  ok("and clears any old ready banner", /setGuideReady\(false\);/.test(build));
  // A failure has to reach someone who stepped away, or the bar just stops.
  const failAt = appSrc.indexOf('console.warn("Guide build failed:');
  // From the catch that owns it, not a fixed byte window: the comment between
  // the two is longer than any window worth hard-coding, and a window that
  // happens to miss would read as a passing negative.
  const catchAt = appSrc.lastIndexOf("} catch (err) {", failAt);
  ok("the catch block that owns it was found", catchAt > 0 && catchAt < failAt);
  const fail = appSrc.slice(catchAt, failAt);
  ok("a failed build un-minimizes so the error is seen", /setGuideMinimized\(false\)/.test(fail));
}

// ── THE INTAKE FORM ─────────────────────────────────────────────────
// "Maybe we should make it clear that giving more information is optional.
// Perhaps we should also leave out tent/camping wagon.. it's just too akward."
{
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");

  ok("the panel says it is optional", /✦ Optional: fine-tune the plan/.test(appSrc));
  ok("and says what skipping it costs", /skip it and Gemlyx still plans/.test(appSrc));

  // Getting around asks how you MOVE. A tent is where you sleep.
  const row = appSrc.match(/\{\["🚲 Bike"[^\]]*\]/);
  ok("the transport row was found", !!row);
  ok("tent is gone from the transport row", !/Tent/.test(row[0]));
  ok("camper van stays, it is a vehicle", /🚐 Camper van/.test(row[0]));
  // AND THE CAPABILITY IS UNTOUCHED. Removing a tick box must not remove the
  // routing, or someone who types it gets a worse trip than before.
  ok("the tent routing rule survives in the prompt", /tent → same real-campsite guidance/.test(appSrc));
  ok("including that Denmark has no roadside camping", /not roadside\/wild camping/.test(appSrc));
}

// ── PAYING TO ASK COPENHAGEN ABOUT ODENSE ───────────────────────────
// Oliver, 10 Aug 2026: "the AI blogger is searching through sources for
// Copenhagen, even if I am trying to find sources about Odense... Thankfully
// they don't use the Copenhagen ones. But it's a waste."
//
// placeMightMatch let the RESEARCH TEXT unlock any place-scoped source. An
// Odense research snippet says "1 hour 15 from Copenhagen by train", so the
// Copenhagen source unlocked, and the draft paid to ask visitcopenhagen.com
// about Odense.
//
// The existing assertion "an Aarhus draft must not search visitcopenhagen"
// could never have caught this: it passes no text, and the text is the bug.
{
  const { directSourceSearches, placeMightMatch } = M;
  const rows = [
    { id: 1, domain: "visitdenmark.dk", applies_to: "", applies_place: "", enabled: true },
    { id: 2, domain: "visitcopenhagen.com", applies_to: "", applies_place: "Copenhagen", enabled: true },
    { id: 3, domain: "visitodense.com", applies_to: "", applies_place: "Odense", enabled: true },
    { id: 4, domain: "visitaarhus.com", applies_to: "", applies_place: "Aarhus", enabled: true },
  ];
  // A realistic Odense research text. Both other cities appear, as facts ABOUT
  // Odense, which is exactly how a travel snippet is written.
  const text = "Odense is Hans Christian Andersen's birthplace on Funen. It is about 1 hour 15 minutes from Copenhagen by train, and roughly the same from Aarhus.";

  is("an Odense draft searches Odense and the national site, nothing else",
     directSourceSearches(rows, "town", { name: "Odense", text }).map(x => x.domain).sort(),
     ["visitdenmark.dk", "visitodense.com"]);
  ok("naming Copenhagen in the research does not unlock its source",
     !placeMightMatch("Copenhagen", { name: "Odense", text }, "town"));
  ok("and neither does naming Aarhus",
     !placeMightMatch("Aarhus", { name: "Odense", text }, "town"));

  // THE CAP IS WHY THIS WAS WORSE THAN WASTE. Four sources, cap of four, and
  // the alphabetical sort puts both wrong ones ahead of visitodense.com.
  is("the cap is still four", M.MAX_DIRECT_SEARCHES, 4);
  ok("the draft's own source is no longer at risk of being crowded out",
     directSourceSearches(rows, "town", { name: "Odense", text }).some(x => x.domain === "visitodense.com"));

  // AND THE CASE THE FALLBACK EXISTS FOR STILL WORKS. An event draft knows only
  // the event's name, and Copenhell is not Copenhagen.
  const tivoli = [{ id: 9, domain: "tivoli.dk", applies_to: "festival", applies_place: "Copenhagen", enabled: true }];
  is("an event still gets placed by its research text",
     directSourceSearches(tivoli, "festival", { name: "Copenhell", text: "Copenhell is a metal festival held at Refshaleøen in Copenhagen each June." }).map(x => x.domain),
     ["tivoli.dk"]);
  ok("in either spelling, still", placeMightMatch("Copenhagen", { name: "Copenhell", text: "afholdes i København hvert år" }, "festival"));
  // But an event that DOES know its town is placed by the town, not the text.
  ok("a festival with a town field trusts the field",
     !placeMightMatch("Copenhagen", { name: "Odense Blomsterfestival", town: "Odense", text: "two hours from Copenhagen" }, "festival"));
  // And the word boundary, which here spends money rather than showing a card.
  ok("a source scoped to Als is not unlocked by the word also",
     !placeMightMatch("Als", { name: "Copenhell", text: "there is also a camping area on site" }, "festival"));
}

// ── SWIPING BETWEEN PAGES ───────────────────────────────────────────
// Oliver, 10 Aug 2026: "my friend complained about the little things at the
// bottom that tells you that you can swipe to the side. I would appreciate if
// you can make the person able to swipe. WITHOUT MAKING THE PAGE ALL BOUNCY TO
// THE SIDES!!!! It needs to be like when you swipe on iphone or tinder."
//
// setStrip has accepted a drag offset since it was written and NOTHING EVER
// PASSED IT ONE. There were no touch listeners on the pager at all. The dots at
// the bottom were advertising a gesture the app did not implement, which is why
// they read as decoration nobody understood.
{
  const { swipeAxis, dragOffset, swipeCommits, swipeTarget, SLOP_PX, AXIS_BIAS, EDGE_DRAG } = M;
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");
  const code = stripNonCode(appSrc);
  const W = 390;             // a phone, so the numbers below are real gestures
  const COUNT = 8;           // TAB_ORDER.length

  // ── A TAP IS NOT A SWIPE ──────────────────────────────────────────
  is("a still finger decides nothing", swipeAxis(0, 0), null);
  is("and neither does a shaky tap", swipeAxis(5, 4), null);
  ok("the slop is big enough to survive a thumb", SLOP_PX >= 8);

  // ── THE AXIS LOCK, WHICH IS THE WHOLE FEEL ────────────────────────
  // Every page scrolls vertically, so a scroll that drifts off true must stay a
  // scroll. This is the assertion that would have caught a naive |dx| > |dy|.
  is("a flat drag turns the page", swipeAxis(60, 4), "x");
  is("a plain scroll is left alone", swipeAxis(4, 60), "y");
  is("a scroll drifting 20 degrees is still a scroll", swipeAxis(22, 60), "y");
  is("a swipe drifting 20 degrees is still a swipe", swipeAxis(60, 22), "x");
  is("a perfect diagonal belongs to the scroll", swipeAxis(50, 50), "y");
  // ── THE ASSERTION WITH THE TEETH ──────────────────────────────────
  // Everything above this line passes just as happily against a naive
  // |dx| > |dy|, which is the version almost everybody writes. Verified by
  // mutation: swapping the bias out left the whole block green.
  //
  // This is the gesture that separates them. A thumb scrolling a long page
  // drifts: 60px across while travelling 50px down is a SCROLL that wandered,
  // and the naive test calls it a page turn, so the page lurches sideways while
  // somebody is reading. Nothing about AXIS_BIAS being 1.4 can be asserted by
  // reading the constant, because a constant cannot disagree with itself.
  is("a scroll with a drifting thumb is still a scroll", swipeAxis(60, 50), "y");
  is("and one drifting the other way too", swipeAxis(-60, 50), "y");
  // While a deliberate sideways move, at the same vertical drift, still turns.
  is("a deliberate swipe at the same drift still turns the page", swipeAxis(90, 50), "x");
  ok("the bias favours the page's own scrolling", AXIS_BIAS > 1);

  // ── THE ENDS ARE A WALL, NOT A RUBBER BAND ────────────────────────
  is("dragging back from the first page barely moves", dragOffset(100, 0, COUNT), 100 * EDGE_DRAG);
  is("and dragging past the last page barely moves", dragOffset(-100, COUNT - 1, COUNT), -100 * EDGE_DRAG);
  ok("which is a small fraction of the finger", EDGE_DRAG > 0 && EDGE_DRAG <= 0.34);
  is("but the first page still moves freely inwards", dragOffset(-100, 0, COUNT), -100);
  is("and the last page freely the other way", dragOffset(100, COUNT - 1, COUNT), 100);
  is("a middle page tracks the finger exactly", dragOffset(-140, 3, COUNT), -140);

  // ── DISTANCE OR SPEED, NEVER BOTH ─────────────────────────────────
  // Requiring both is how a real flick snaps back and feels broken.
  ok("a slow deliberate drag past the threshold commits", swipeCommits(-120, 900, W));
  ok("a fast short flick commits on speed alone", swipeCommits(-40, 60, W));
  ok("a short slow nudge does not", !swipeCommits(-20, 800, W));
  ok("and a half-hearted change of mind does not", !swipeCommits(-55, 1200, W));
  is("no width means no verdict", swipeCommits(-200, 100, 0), false);

  // ── WHERE IT LANDS ────────────────────────────────────────────────
  is("swiping left goes forward", swipeTarget(-120, 300, W, 3, COUNT), 4);
  is("swiping right goes back", swipeTarget(120, 300, W, 3, COUNT), 2);
  is("an uncommitted swipe stays put", swipeTarget(-20, 900, W, 3, COUNT), 3);
  // THE ONE THAT STOPS THE BOUNCE BECOMING A BUG: there is no page 8, and no
  // page below zero, so the gesture resolves to standing still.
  is("there is nothing past the last page", swipeTarget(-200, 200, W, COUNT - 1, COUNT), COUNT - 1);
  is("and nothing before the first", swipeTarget(200, 200, W, 0, COUNT), 0);

  // ── AND THAT IT IS WIRED TO A REAL GESTURE ────────────────────────
  ok("the pager has touch listeners at all", /addEventListener\("touchstart", onStart, \{ passive: true \}\)/.test(appSrc));
  // Non-passive is not a detail. A passive listener cannot preventDefault, and
  // preventDefault is the only thing stopping Chrome turning the drag into a
  // back-navigation and rubber-banding the page on the way.
  ok("touchmove is non-passive so the bounce can be stopped", /addEventListener\("touchmove", onMove, \{ passive: false \}\)/.test(appSrc));
  ok("and it actually prevents the default", /if \(e\.cancelable\) e\.preventDefault\(\)/.test(code));
  ok("the gesture is cancelled as well as ended", /addEventListener\("touchcancel", onEnd/.test(appSrc));
  // Scoped to the pager's own root, because an unrelated document-level
  // touchstart listener elsewhere in the file would otherwise pad the count and
  // let a genuinely missing removal pass.
  ok("and every listener is removed again", (appSrc.match(/root\.removeEventListener\("touch/g) || []).length === 4);
  ok("the scroll chaining that causes the bounce is contained", /overscrollBehaviorX: "contain"/.test(appSrc));

  // A horizontal row inside a page keeps its own gesture, or the events strip
  // and the hidden-gems rows stop scrolling the moment swiping works.
  // CALLED, not merely present. Verified by mutation: deleting the call and
  // leaving the function defined kept the whole block green, which is the
  // written-and-never-wired shape this codebase has hit seven times.
  ok("the guard actually runs at the start of every gesture", /if \(ownedByAScroller\(e\.target\)\) return;/.test(code));
  ok("and it runs before any drag state is recorded", code.indexOf("if (ownedByAScroller(e.target)) return;") < code.indexOf("dragRef.current = { x0:"));
  ok("a sideways scroller inside a page is left alone", /const ownedByAScroller = \(target\) =>/.test(code));
  ok("and that is decided by real overflow, not a guess", /el\.scrollWidth - el\.clientWidth > 4/.test(code));
  ok("reading the computed overflow, not the inline style", /getComputedStyle\(el\)\.overflowX/.test(code));
  // touch-action would be the tidy way to stop the browser and CANNOT be used:
  // it intersects down the ancestor chain, so pan-y here would kill sideways
  // scrolling in every row inside the pager. That is the bug this prevents.
  ok("the strip does not set touch-action, which would break those rows", !/touchAction: "pan-y"/.test(appSrc));

  // Listeners attach once, so anything read from a render closure is frozen at
  // page zero. Every drag after the first would then compute from the wrong base.
  ok("the live page index is read through a ref", /tabIdxRef\.current \* \(100\/TAB_ORDER\.length\)/.test(code));
  ok("and so is the page change", /goTabRef\.current\(TAB_ORDER\[next\]\)/.test(code));

  // ── THE DOTS SAY WHERE YOU ARE ────────────────────────────────────
  // Eight identical dots tell you there are eight of something. His friend's
  // complaint was reasonable and the fix is a name, not fewer dots.
  ok("the page indicator names the page", /NAV_ITEMS\.find\(n => n\.id === active\)\?\.label/.test(appSrc));
  ok("and the active dot is a bar, so position reads at a glance", /width: i === tabIdx \? 16 : 6/.test(appSrc));
}

// ── THE EMPTY BOX BEFORE THE WRITING ────────────────────────────────
// "that box getting big before writing is annoying.. and perhaps write a little
// faster." Every word was rendered up front at opacity 0 so the bubble took its
// full height immediately, which is a real fix for layout jumping and also
// paints a tall empty box and dribbles text into the top of it.
{
  const tw = readFileSync(join(root, "src/components/TypewriterText.jsx"), "utf8");
  // Raw source throughout this block. stripNonCode blanks string CONTENTS and
  // JSX, not only comments, so every pattern below that mentions a string
  // literal would be tested against blank space and pass having proved nothing.
  const code = stripNonCode(tw);

  ok("unwritten words are not rendered at all", /if \(w >= shownWords\) break;/.test(code));
  ok("so the bubble grows with the text", !/opacity: visible \? 1 : 0/.test(code));
  ok("and trailing whitespace goes with them", /while \(out\.length && typeof out\[out\.length - 1\] === "string"/.test(tw));
  // A transition needs a previous value and a freshly mounted node has none, so
  // the fade has to be an animation or the words would snap in at full opacity.
  ok("words fade in on mount", /animation: "gxWordIn 0\.34s ease both"/.test(tw));
  ok("and the keyframes exist", /@keyframes gxWordIn/.test(tw));
  ok("injected once, not per instance", /if \(fadeInjected \|\| typeof document === "undefined"\) return;/.test(tw));

  // Faster, and still visibly written. He has twice insisted it must not dump
  // the whole reply in at once, so this is bounded at both ends.
  const num = (name) => Number((tw.match(new RegExp(`const ${name} = (\\d+)`)) || [])[1]);
  ok(`the anchors for the pacing constants exist`, [num("MS_PER_WORD"), num("MAX_TOTAL_MS"), num("TICK_MS")].every(Number.isFinite));
  ok("it writes faster than before", num("MS_PER_WORD") < 105);
  ok("but is still word by word, not a dump", num("MS_PER_WORD") >= 30);
  ok("a long reply finishes sooner", num("MAX_TOTAL_MS") < 9000);
  ok("and the growth is smooth rather than stepped", num("TICK_MS") <= 64);
}

// ── THE EXPLORE PAGE ON A DESKTOP ───────────────────────────────────
// "the explore page has to be filled out on PC." Every row dealt exactly three
// cards on every screen, which is a full row on a phone and a third of one on a
// laptop.
{
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");
  const code = stripNonCode(appSrc);

  ok("the hard-coded three is gone", !/dealt\(ranked, 3,/.test(code));
  ok("the row count is measured from the viewport", /dealt\(ranked, rowCards,/.test(code));
  ok("and recomputed when the window changes", /window\.addEventListener\("resize", on\)/.test(appSrc));
  ok("and cleaned up", /window\.removeEventListener\("resize", on\)/.test(appSrc));

  // The same seed at a bigger count must deal a SUPERSET, not a new hand, or
  // resizing a window silently reshuffles what somebody was looking at.
  const rand = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const dealt = (pool, n, seed) => {
    const r = rand(seed); const a = pool.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  };
  const pool = Array.from({ length: 30 }, (_, i) => `p${i}`);
  is("a wider screen shows more of the same hand, not a different one",
     dealt(pool, 6, 12345).slice(0, 3), dealt(pool, 3, 12345));
  ok("and genuinely shows more", dealt(pool, 6, 12345).length === 6);
}

// ── A TYPE IS REGISTERED EVERYWHERE, OR IT IS NOT REGISTERED ────────
// Adding a content type means hand-registering it in about a dozen places, and
// NOTHING checked that the dozen agreed. The cost of that was not theoretical:
//
//   - `booking` was missing from the Studio type picker. It was registered in
//     the prompts, the publish shape, the live merge, the discover label, the
//     placeholder and the photo folder, and there was no button to choose it.
//     Reachable only by editing a row that already existed.
//   - the live merge chain had no else, so a published row of an unregistered
//     type was fetched, deduped, marked merged and then dropped. In the
//     database, rendering nowhere, silently.
//
// Both are the same missing test, and this is it. Every list below is walked
// from CONTENT_TYPES rather than from a copy of it, so the next type either
// appears in all of them or the suite names the one it is missing from.
{
  const TYPES = M.CONTENT_TYPES;
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const live = readFileSync(join(root, "src/utils/liveContent.js"), "utf8");
  const prompts = M.studioPrompts("Test Name");

  ok("there is more than one type to check", TYPES.length >= 8);

  // A named region, asserted to exist before anything is read out of it. A
  // missed anchor gives "" and every "is it in there" test on "" reads as a
  // clean absence, which is how a real guard becomes a passing one.
  const region = (src, from, to, label) => {
    const a = src.indexOf(from);
    ok(`the ${label} was found`, a >= 0);
    const b = to ? src.indexOf(to, a) : src.length;
    ok(`the ${label} has an end`, b > a);
    return a >= 0 && b > a ? src.slice(a, b) : " ";
  };
  const missing = (label, hay, fmt) => {
    const gone = TYPES.filter(t => !hay.includes(fmt(t)));
    is(`every type is in the ${label}`, gone, []);
  };

  missing("type label map", JSON.stringify(Object.keys(M.TYPE_LABEL)), t => `"${t}"`);
  missing("draft prompt table", JSON.stringify(Object.keys(prompts)), t => `"${t}"`);

  // THE PUBLISH SHAPE, exercised rather than read. shapeForLive is the only
  // insert path into the database and has silently eaten a feature twice.
  const unshaped = TYPES.filter(t => !M.shapeForLive(t, { name: "X", desc: "d", vibeLocation: "v", characterAndFit: "c", howTo: "h" }));
  is("every type can actually be published", unshaped, []);

  missing("live content merge chain", region(live, "rows.forEach(row =>", "if (dupeNames.length", "merge chain"), t => `row.type === "${t}"`);
  missing("Studio type picker", region(app, '{[["town", "🏘 Town"]', "].map(([k, label]) =>", "type picker"), t => `["${t}", "`);
  missing("research query table", region(app, "const cfg = {", "}[sType];", "research query table"), t => `${t}: { queries:`);
  // Both halves of discovery. The label is what the model is told to find, the
  // pool is what results are deduplicated against. A type in one and not the
  // other either offers candidates it already has, or none at all.
  missing("discover label map", region(app, "const DISCOVER_TYPE_LABEL = {", "};", "discover label map"), t => `${t}:`);
  missing("discover source pools", region(app, "const discoverSourceArrays = () => ({", "});", "discover pools"), t => `${t}:`);

  // AND THE ONE THAT CANNOT BE A LIST CHECK. The paste-ready codegen ends in a
  // bare else that writes NIGHTLIFE code, so an unregistered type does not fail
  // loudly, it silently produces paste code for a different content type.
  const codegen = region(app, 'let code = "";', "ui(setStudioResult, code);", "paste-ready codegen");
  const unbranched = TYPES.filter(t => t !== "night" && !codegen.includes(`"${t}"`));
  is("every type has its own codegen branch, since the fallback is nightlife", unbranched, []);
}

// ── THE ESSENTIALS TYPE ─────────────────────────────────────────────
// Oliver, 10 Aug 2026: "my friend gave me an advice on some 'essentials' which
// is a rejsekort for visitors.. is it possible install into the studio about
// essentials? So I can get perplexity and tavily to deeper research it?"
//
// It was not. Essentials were thirteen objects hardcoded in a data file: the
// most perishable content in the app, and the only content that never went near
// the research pipeline. A town entry gets two research passes and a
// fact-check; the page telling somebody which ticket to buy got whatever was
// true on the day it was typed.
{
  const { shapeForLive, studioPrompts, CONTENT_TYPES, TYPE_LABEL } = M;
  const p = studioPrompts("Rejsebillet")["essential"];
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");

  ok("essential is a real content type", CONTENT_TYPES.includes("essential"));
  is("and has a label", TYPE_LABEL.essential, "Essentials");

  // THE RULE THAT MATTERS MOST FOR THIS TYPE. A system needing a Danish CPR
  // number or bank account is the wrong answer for somebody here five days,
  // which is exactly the shape of the Rejsekort advice his friend passed on.
  ok("the prompt writes for a visitor, not a resident", /WRITE FOR A VISITOR, NOT A RESIDENT/.test(p));
  ok("and says so plainly when something is resident-only", /resident-only, SAY SO PLAINLY and name what a visitor should use instead/.test(p));
  ok("the schema carries that as its own field", /"visitorNote"/.test(p));
  ok("being current is stated as the product", /BEING CURRENT IS THE PRODUCT HERE/.test(p));
  ok("and a replaced system leads the entry", /replaced, discontinued or renamed, lead with that/.test(p));
  ok("an unconfirmable fact goes to uncertainties, not to the page", /put the rest in uncertainties rather than repeating what used to be true/.test(p));
  ok("a price is a figure, never a feeling", /PRICES ARE A FACT, NOT A FEELING/.test(p));
  ok("it carries the shared voice rules", p.includes("NEVER USE THE EM DASH"));
  ok("and the reality check rule", /THE REALITY CHECK IS THE MOST IMPORTANT FIELD/.test(p));

  // ── IT SURVIVES PUBLISH ───────────────────────────────────────────
  const shaped = shapeForLive("essential", {
    name: "Rejsebillet", category: "Transport", emoji: "🎫", desc: "Buy a ticket from your phone.",
    howTo: "Download it, pick your zones, pay with any card.", price: "From 24 DKK", link: "https://example.dk",
    tip: "Buy before you board.", realityCheck: "Skip the physical card entirely for a short trip.",
    visitorNote: "The Rejsekort app is for residents, use this instead.",
    __sources: ["https://dinoffentligetransport.dk/en"],
  });
  // Guarded, because shapeForLive returns null for an unregistered type and an
  // unguarded property read crashes the runner instead of failing it, which
  // hides every assertion after this point including the ones that would say
  // why. A test must fail, not explode.
  // Degraded to {} rather than thrown on, because shapeForLive returns null for
  // an unregistered type and an unguarded property read CRASHES the runner
  // instead of failing it, hiding every assertion after this point including
  // the ones that say why. A test must fail, not explode.
  ok("the draft shapes at all", !!shaped);
  const sh = shaped || {};
  is("the category survives", sh.category, "Transport");
  is("the steps survive", sh.howTo, "Download it, pick your zones, pay with any card.");
  is("the price survives", sh.price, "From 24 DKK");
  is("the visitor note survives, which is the field that matters most", sh.visitorNote, "The Rejsekort app is for residents, use this instead.");
  ok("and the sources come with it", Array.isArray(sh.__sources) && sh.__sources.length === 1);
  ok("the reality check reaches the body", JSON.stringify(sh.blogBody || null).includes("Skip the physical card entirely"));
  ok("under the heading everything else uses", JSON.stringify(sh.blogBody || null).includes("The Reality Check"));
  // An essential is not a place and must not pretend to be one.
  ok("it claims no photo", !!shaped && !("photo" in sh));
  ok("and no coordinates", !!shaped && !("__lat" in sh));
  // The Essentials page renders by category, so a category-less draft would
  // land in no section at all rather than merely looking wrong.
  is("a category-less draft still lands somewhere", (shapeForLive("essential", { name: "X" }) || {}).category, "Transport");

  // ── AND IT IS REACHABLE ───────────────────────────────────────────
  ok("there is a button for it in Studio", /\["essential", "🧭 Essential"\]/.test(app));
  ok("the discovery pool is the essentials array", /essential: essentials,/.test(app));
  ok("its research asks whether the thing still exists", /discontinued replaced changed 2026 what to use instead/.test(app));
  ok("and asks in Danish too", /Danmark priser regler gældende 2026 turist/.test(app));
  // A name and a description with no steps is not a usable essential, so it
  // fails the draft rather than publishing half an answer.
  ok("a draft with no steps is rejected", /sType === "essential" \? \(!t\.desc \|\| !t\.howTo\)/.test(app));
}


// ── A FROZEN FACT IS STILL A CLAIM ──────────────────────────────────
// Oliver, 10 Aug 2026: "But isn't there a 'rejsekort app' for tourists?"
//
// There is, and the prompt was telling the model the opposite. Two places in
// App.jsx carried a FROZEN TRANSPORT FACT stamped "verified Aug 2026" asserting
// the Rejsekort app "is for residents" and that it must NEVER be recommended to
// an international visitor. rejsekort.dk's own app terms ask for an email, a
// name, a birthdate, a phone number and a payment card, and reserve MitID and
// CPR for pensioner and disabled fare types. No residency rule anywhere.
//
// So the app was banning a valid option on an invented eligibility rule, inside
// the one mechanism built specifically to stop the model inventing things. A
// frozen fact is not exempt from the rule that nothing unverified gets stated;
// it is the place where breaking that rule is hardest to notice, because it
// reads as settled and nothing re-checks it.
//
// The steer to a fixed ticket was right and survives. Only the reason changed,
// from a made-up restriction to the real one: check-in and check-out, and
// forgetting to check out being the most common tourist fine.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const ess = readFileSync(join(root, "src/data/essentials.js"), "utf8");

  ok("the claim that the app is resident-only is gone", !/Rejsekort app is for residents/.test(app));
  ok("and so is the version in the second copy", !/the app is built for residents/.test(app));
  ok("nothing tells the model to never recommend it", !/NEVER recommend either to international visitors/.test(app));
  // The physical card really is discontinued, so that half stays.
  ok("the physical card is still ruled out", /physical Rejsekort card is discontinued/.test(app));
  // The real reason is stated, so the recommendation survives on true grounds.
  ok("the fine is given as the reason", /forgetting to check OUT is the single most common tourist fine/.test(app));
  ok("and Rejsebillet is still the simpler default", /Recommend the Rejsebillet app, the DOT or DSB apps, or the Copenhagen Card/.test(app));
  // WHAT IS NOT KNOWN IS SAID TO BE NOT KNOWN. rejsekort.dk does not state
  // whether a foreign number and a foreign card work in practice, and the
  // pipeline never checked, so the prompt must not answer it either way.
  ok("the unconfirmed part is named as unconfirmed", /not confirmed is whether a foreign phone number and a foreign card work in the Rejsekort app in practice/.test(app));
  ok("and the model is told not to guess it", /never assert either way/.test(app));
  // Both stamps say when they were checked rather than claiming verification.
  is("no frozen fact still claims it was verified in a month", (app.match(/FROZEN TRANSPORT FACT \(verified/g) || []).length, 0);
  ok("both carry a real check date instead", (app.match(/FROZEN TRANSPORT FACT \(checked 10 Aug 2026/g) || []).length === 2);

  // And the reader-facing copy agrees with the prompt, since these drifted once
  // already by being written by hand in two places.
  ok("the essentials entry no longer implies a rule about who may use it", /it is the checking out that catches people/.test(ess));
  ok("and says plainly that the app is open to visitors", /The Rejsekort app itself is open to visitors/.test(ess));
}


// ── THE COST METER ──────────────────────────────────────────────────
// Oliver, 10 Aug 2026: "it also costs me ALOT of money if I just have 3 users."
// He is meeting a CEO who runs pick and pack, so the first question will be
// what one guide costs, and "a lot" does not get useful advice back.
//
// The danger this whole file is built against is that a cost meter is the
// easiest possible place to break the project's first rule. Add up the calls
// that happen to report usage, call the result the cost, quietly omit the rest,
// and you produce a number that is too low, looks precise, and is the one he
// says out loud in a meeting.
{
  const { PRICES, startRun, endRun, recordModelCall, recordRequestCall, summarise, averageFor, describe, recentRuns, __reset } = M;
  __reset();

  // ── NOTHING IS COUNTED OUTSIDE A RUN ──────────────────────────────
  recordModelCall("claude", "claude-sonnet-5", { input_tokens: 100, output_tokens: 100 });
  is("a call with no run open is not counted anywhere", recentRuns().length, 0);

  // ── THE Number(null) TRAP, IN THE FILE WHERE IT WOULD HURT MOST ───
  // Number(null) is 0 and 0 is a perfectly finite token count, so a response
  // with no usage block would record as a real, free call and pull the average
  // DOWN. Named in the handoff, and this is where it would cost him a wrong
  // number in front of his CEO.
  startRun("guide");
  recordModelCall("claude", "claude-sonnet-5", undefined);
  recordModelCall("claude", "claude-sonnet-5", {});
  recordModelCall("claude", "claude-sonnet-5", null);
  let s1 = summarise(endRun());
  is("three calls with no usage are three calls", s1.calls, 3);
  is("and none of them is free", s1.unpriced, 3);
  is("no tokens are invented for them", s1.tokensIn + s1.tokensOut, 0);
  ok("so the run cannot claim to be complete", !s1.complete);
  is("and it reports nothing it cannot stand behind", s1.measured, 0);

  // ── THE ASSERTION WITH THE TEETH ──────────────────────────────────
  // Everything above passes just as happily against `?? 0`, because a model
  // with no RATE is unpriced either way, so the trap hides behind the missing
  // price. Verified by mutation: swapping NaN for 0 left the block green.
  //
  // The case that separates them is a model that IS priced, answering with no
  // usage block. Correct: we do not know what it cost, so the run is a floor.
  // With `?? 0`: zero tokens is a finite number, the call costs exactly nothing,
  // the run reports COMPLETE, and the average per guide silently falls every
  // time a response comes back without usage. That is the number he reads out
  // in the meeting.
  __reset();
  const rateBefore = { ...PRICES.models["claude-sonnet-5"] };
  PRICES.models["claude-sonnet-5"] = { in: 3, out: 15 };
  startRun("guide");
  recordModelCall("claude", "claude-sonnet-5", { input_tokens: 1e6, output_tokens: 0 });  // real
  recordModelCall("claude", "claude-sonnet-5", undefined);                                 // no usage
  const mixed = summarise(endRun());
  is("the call that reported usage is costed", Number(mixed.measured.toFixed(6)), 3);
  is("the one that did not is unpriced, not free", mixed.unpriced, 1);
  ok("so the run is a floor, not a total", !mixed.complete);
  is("and no phantom tokens were added for it", mixed.tokensIn, 1e6);
  PRICES.models["claude-sonnet-5"] = rateBefore;

  // ── AN UNPRICED MODEL IS NOT A FREE MODEL ─────────────────────────
  // Real usage, no rate set. The tokens are a fact and the money is not, so
  // the tokens are kept and the run stays incomplete.
  __reset();
  startRun("guide");
  recordModelCall("claude", "claude-sonnet-5", { input_tokens: 5000, output_tokens: 900 });
  let s2 = summarise(endRun());
  is("real token counts are kept", [s2.tokensIn, s2.tokensOut], [5000, 900]);
  is("with no price set, nothing is claimed", s2.measured, 0);
  ok("and the run says so", !s2.complete);

  // ── WITH A RATE, IT IS ARITHMETIC ─────────────────────────────────
  __reset();
  const restore = { ...PRICES.models["claude-sonnet-5"] };
  PRICES.models["claude-sonnet-5"] = { in: 3, out: 15 };
  startRun("guide");
  recordModelCall("claude", "claude-sonnet-5", { input_tokens: 1e6, output_tokens: 1e6 });
  let s3 = summarise(endRun());
  is("a million in and a million out costs in plus out", Number(s3.measured.toFixed(6)), 18);
  ok("and now the run is complete", s3.complete);
  // Both usage shapes are real. OpenAI's chat endpoint returns prompt_tokens
  // and completion_tokens, Anthropic returns input_tokens and output_tokens.
  __reset();
  startRun("guide");
  recordModelCall("openai", "claude-sonnet-5", { prompt_tokens: 1e6, completion_tokens: 0 });
  is("the other usage shape is read too", Number(summarise(endRun()).measured.toFixed(6)), 3);
  PRICES.models["claude-sonnet-5"] = restore;

  // ── A PER-REQUEST SERVICE IS COUNTED, NOT GUESSED ─────────────────
  __reset();
  startRun("guide");
  recordRequestCall("geocode");       // known free
  recordRequestCall("geocode");
  recordRequestCall("directions");    // no rate set
  let s4 = summarise(endRun());
  is("free calls are still calls", s4.calls, 3);
  is("a known-free service costs nothing and says so", s4.byService.geocode.unpriced, 0);
  is("an unpriced service is not treated as free", s4.byService.directions.unpriced, 1);
  ok("so the run is incomplete", !s4.complete);
  // A service nobody has ever priced must not default to zero.
  __reset();
  startRun("guide");
  recordRequestCall("somethingNobodyHasPriced");
  ok("an unknown service is unpriced, not free", !summarise(endRun()).complete);

  // ── THE SENTENCE HE WILL READ ─────────────────────────────────────
  // This is the one that reaches a human, so it is the one that must never
  // round the doubt away.
  __reset();
  startRun("guide");
  recordRequestCall("geocode");
  recordRequestCall("directions");
  const partial = summarise(endRun());
  ok("a partial total says at least", /^at least /.test(describe(partial)));
  ok("and says how many calls are unpriced", /1 of them have no price set/.test(describe(partial)));
  ok("and that the real figure is higher", /the real figure is higher/.test(describe(partial)));
  __reset();
  startRun("guide");
  recordRequestCall("geocode");
  const whole = summarise(endRun());
  ok("a complete total does not hedge", !/at least/.test(describe(whole)));

  // ── AN AVERAGE NEVER MIXES A FLOOR WITH A TOTAL ───────────────────
  // The figure most likely to be said out loud in the meeting.
  __reset();
  startRun("guide"); recordRequestCall("geocode"); endRun();              // complete
  startRun("guide"); recordRequestCall("directions"); endRun();           // not
  const avg = averageFor("guide");
  is("both runs are in the average", avg.runs, 2);
  is("and it knows only one of them was complete", avg.completeRuns, 1);
  ok("so the average is not presented as complete", !avg.complete);
  is("a label with no runs averages to nothing", averageFor("draft"), null);

  // ── A BUILD THAT THREW STILL SPENT THE MONEY ──────────────────────
  // Cost per successful guide is not the number that matters. Cost per attempt
  // is, because a failed attempt is charged in full.
  __reset();
  startRun("guide");
  recordRequestCall("geocode");
  startRun("guide");                    // a second start with one still open
  is("an abandoned run is kept, not discarded", recentRuns().length, 1);
  is("and the abandoned one kept its calls", summarise(recentRuns()[0]).calls, 1);
  endRun();

  // ── AND IT IS WIRED TO THE REAL PIPELINE ──────────────────────────
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const ai = readFileSync(join(root, "src/utils/aiClient.js"), "utf8");
  const cost = readFileSync(join(root, "src/utils/apiCost.js"), "utf8");

  ok("a guide build is a run", /startRun\("guide"\)/.test(app));
  ok("a Studio draft is a run", /startRun\("draft"\)/.test(app));
  // Ended on BOTH paths, or a failed build leaves the meter open and its calls
  // land in whatever runs next.
  ok("and both the success and failure paths close it", (app.match(/endRun\(\)/g) || []).length >= 3);
  ok("every model call is recorded with its real usage", (ai.match(/recordModelCall\(/g) || []).length === 3);
  ok("including the one that failed, since it was still charged", /recordModelCall\("claude", model, data\?\.usage\);\n      if \(!res\.ok\)/.test(ai));

  // The interceptor is the reason this cannot rot. Recording twenty call sites
  // by hand is the same shape as the content-type registration problem, and a
  // missed one is invisible because its only symptom is a total that is low.
  ok("per-request calls are metered in one place", /window\.fetch = \(input, init\) =>/.test(cost));
  ok("and the model endpoints are skipped there to avoid double counting", /MODEL_ENDPOINTS\.has\(m\[1\]\)/.test(cost));
  ok("metering can never break a request", /catch \{ \/\* metering must never be able to break a request \*\//.test(cost));
  ok("the readout says at least when it must", /a\.complete \? "" : "at least "/.test(app));
  __reset();
}


// ── THE SITE KNOWS ITS OWN ADDRESS ──────────────────────────────────
// gemlyxtravel.com went live and SITE_ORIGIN stayed on the vercel.app address.
// Nothing broke, which is the problem: every share card named the wrong site,
// and index.html's canonical tag told Google the vercel.app copy was the real
// one and the new domain a duplicate of it. That is the most effective way
// there is to stop a new domain ranking, and it is completely silent.
{
  const html = readFileSync(join(root, "index.html"), "utf8");
  const { SITE_ORIGIN } = M;
  ok("the origin is the real domain", /^https:\/\/(www\.)?gemlyxtravel\.com$/.test(SITE_ORIGIN));
  ok("it is https, since a registration form on http is a dead end", SITE_ORIGIN.startsWith("https://"));
  ok("and carries no trailing slash, which would double up every built URL", !SITE_ORIGIN.endsWith("/"));
  // The old address must be gone from the shell entirely. One left behind in
  // the canonical tag is enough to do the whole damage on its own.
  ok("no preview URL is left anywhere in the shell", !/only-here-three/.test(html));
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  ok("the canonical tag was found", !!canonical);
  ok("and points at the real site", !!canonical && canonical.startsWith(SITE_ORIGIN));
  const ogUrl = (html.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
  ok("og:url was found", !!ogUrl);
  ok("and agrees with it", !!ogUrl && ogUrl.startsWith(SITE_ORIGIN));
}


// ── A REAL ADDRESS FOR EVERY TOWN ───────────────────────────────────
// Oliver, 10 Aug 2026, once gemlyxtravel.com went live: town pages for search.
//
// Seventy-odd researched, fact-checked entries rendered at no URL at all. Not
// findable, not linkable, not shareable as themselves. With paid acquisition
// off the table until the cost per guide works, search is the only channel
// available, and this was the part that did not exist.
{
  const { placeSlug, townPath, findBySlug, slugCollisions, sitemapXml, COUNTRY } = M;

  // Danish letters fold the way they fold everywhere else in this codebase.
  is("ae for the ligature", placeSlug("Ærø"), "aero");
  is("o for the slashed o", placeSlug("Møn"), "mon");
  is("aa for the ring", placeSlug("Ålborg"), "aalborg");
  is("and the other spelling lands the same way", placeSlug("Aalborg"), "aalborg");

  // THE REASON THIS IS NOT studioContent's slugify. That one strips every
  // non-alphanumeric, so a two-word town becomes one long word. It is correct
  // for naming photo FILES, and those files exist under those names, so it
  // cannot change. A URL wants the words kept apart.
  is("words stay apart in a url", placeSlug("Nykøbing Falster"), "nykobing-falster");
  is("punctuation becomes one separator, not several", placeSlug("Nørresundby (Aalborg)"), "norresundby-aalborg");
  is("no leading or trailing separator", placeSlug("  Ribe  "), "ribe");
  is("nothing in, nothing out", placeSlug(""), "");
  is("and null does not become the string null", placeSlug(null), "");

  is("the path carries the country", townPath("Ærø"), `/${COUNTRY}/aero`);

  // ── LOOKUP IS BY COMPARING, NEVER BY REVERSING ────────────────────
  // Folding loses information: an o in a slug could have been o or ø, so there
  // is no single name to turn a slug back into. A guess is a 404 on a link
  // somebody already shared.
  const towns = [{ name: "Ærø" }, { name: "Ribe" }, { name: "Nykøbing Falster" }];
  is("a folded slug finds the real name", findBySlug(towns, "aero").name, "Ærø");
  is("and so does the name itself", findBySlug(towns, "Ærø").name, "Ærø");
  is("casing from a copy-paste still resolves", findBySlug(towns, "AERO").name, "Ærø");
  is("a two-word town resolves", findBySlug(towns, "nykobing-falster").name, "Nykøbing Falster");
  is("something that is not there is null, not the first row", findBySlug(towns, "sverige"), null);
  is("an empty slug matches nothing", findBySlug(towns, ""), null);

  // ── TWO PLACES CANNOT SHARE AN ADDRESS ────────────────────────────
  // A collision does not throw. It does something quieter and worse: findBySlug
  // returns whichever row comes first, so one real place is permanently
  // unreachable and its URL shows a different town. In a sitemap that is a
  // duplicate-content problem on top.
  is("a clean list collides with nothing", slugCollisions(towns), []);
  const clash = slugCollisions([{ name: "Nykøbing" }, { name: "Nykobing" }, { name: "Ribe" }]);
  is("but two spellings of one slug are caught", clash.map(c => c.slug), ["nykobing"]);
  is("and it says which names clashed", clash[0].names, ["Nykøbing", "Nykobing"]);

  // AND THE HONEST LIMIT OF THIS CHECK. Every town moved to Supabase on 5 Aug
  // ("remove all your own examples of places. So we only keep the ones from
  // Supabase"), so the hardcoded array is empty and there is no real list to
  // walk at build time. This suite cannot answer whether the 71 PUBLISHED
  // towns collide, and pretending otherwise with a green tick over an empty
  // array is exactly the toothless shape this project keeps finding.
  //
  // So it asserts the emptiness it is actually looking at, and the live check
  // belongs in Studio beside duplicateNames in utils/placeEdit.js, where the
  // published rows are in memory. Denmark has several Nykøbings, so this will
  // matter one day.
  is("the hardcoded list is empty, so it cannot collide", slugCollisions(M.TOWNS_FOR_TEST || []), []);
  is("and an empty list is handled rather than thrown on", slugCollisions([]), []);
  is("as is a list of nameless rows", slugCollisions([{}, { name: "" }]), []);

  // ── THE SITEMAP ───────────────────────────────────────────────────
  // Without this, town pages achieve nothing: the Towns page renders each place
  // as a <button onClick>, so there is no href anywhere for a crawler to
  // follow. The URLs existing is not the same as the URLs being findable.
  const xml = sitemapXml("https://www.gemlyxtravel.com", ["Ærø", "Ribe", "Ærø"]);
  ok("it is a sitemap", /^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(xml));
  ok("with the right namespace, or nothing reads it", xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  ok("the country page is in it", xml.includes(`<loc>https://www.gemlyxtravel.com/${COUNTRY}</loc>`));
  ok("and each town", xml.includes(`<loc>https://www.gemlyxtravel.com/${COUNTRY}/aero</loc>`));
  is("a name listed twice appears once", (xml.match(/\/aero</g) || []).length, 1);
  is("and an empty name adds no empty url", (sitemapXml("https://x.dk", ["", null]).match(/<loc>/g) || []).length, 1);
  // Deliberately no lastmod. A sitemap claiming every page changed today, every
  // day, is a claim nothing checked, and search engines discount a feed for it.
  ok("nothing claims a modification date it cannot support", !/lastmod/.test(xml));

  // ── AND IT IS ALL WIRED ───────────────────────────────────────────
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const mw = readFileSync(join(root, "middleware.js"), "utf8");

  ok("there is a route for a town page", /path=\{`\/\$\{COUNTRY\}\/:townSlug`\}/.test(app));
  ok("and one for the country page", /path=\{`\/\$\{COUNTRY\}`\}/.test(app));
  // The root stays the root. Redirecting it would move the homepage authority
  // to a subpath to solve a second-country problem that does not exist yet.
  ok("the root still serves the app", /<Route path="\/" element=\{<GemlyxApp \/>\} \/>/.test(app));
  ok("and is not redirected away", !/<Navigate to="\/denmark"/.test(app));

  // THE RETRY IS THE WHOLE THING. towns is filled from Supabase after first
  // paint, so a cold visit from a search result finds nothing on the first pass
  // and would silently show the front page instead of what was promised.
  ok("a cold arrival retries as live content lands", /\}, \[townSlug, liveContentVersion\]\)/.test(app));
  ok("closing a town page puts them inside the app", /window\.location\.pathname\.startsWith\(`\/\$\{COUNTRY\}\/`\)/.test(app));

  ok("the middleware gives a town page its own card", /const townMatch = new RegExp/.test(mw));
  ok("built from the entry's own words", /town\.desc \|\| town\.highlight/.test(mw));
  ok("with an absolute image, since a crawler fetches it", /\$\{SITE_ORIGIN\}\$\{town\.photo \|\| "\/og-default\.jpg"\}/.test(mw));
  ok("a town it cannot find falls through to the site card", /if \(!town\) return next\(\);/.test(mw));
  // The sitemap must be served BEFORE the crawler gate, or a user-agent
  // allowlist hides it from every bot not on the list, which is most of them.
  ok("the sitemap is served ahead of the crawler gate",
     mw.indexOf('url.pathname === "/sitemap.xml"') < mw.indexOf('if (!isCrawler(request.headers.get("user-agent"))) return next();'));
  ok("and lists the published towns, not only the hardcoded ones", /type=eq\.town&published=eq\.true/.test(mw));
  // api/ is at the Hobby plan's twelve-function limit, which is why this lives
  // in edge middleware at all.
  is("api/ is still within its limit", readdirSync(join(root, "api")).filter(f => f.endsWith(".js")).length <= 12, true);
}


// ── A SOURCE IS A PAGE THAT MENTIONS THE PLACE ──────────────────────
// Oliver, 10 Aug 2026, looking at the draft for Skovgårde Bysmedie, a village
// smithy, whose recorded sources were Spøttrup Borg, Danmarks Borgcenter,
// Frederiksborg Castle, the Copenhagen Card, the National Museum, VisitNordic's
// Denmark page and a three week rail itinerary: "it keeps going through these
// sources."
//
// Not one of them mentions the smithy. They are what a search engine returns
// when a place is too small to have been written about: the nearest famous
// things, and some general Denmark pages. __sources took every URL Tavily
// returned, so all of them were recorded as sources for the entry, which claims
// the research read them and that they said something about it.
//
// It compounds, and that is the part that costs money. These are stored in
// gemlyx_research, reused on the next redraft, and they PRE-FILL the "sites to
// open first" box, so a wrong source is not one wrong line. It is a standing
// instruction to keep going back to a castle for facts about a smithy.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const code = stripNonCode(app);
  const { containsName, variantsOf } = M;

  // The title and snippet come back with every result and were being dropped.
  ok("what each url said about itself is kept", /urlSaidWhat\.set\(r\.url/.test(code));
  ok("and it is a real map, not a comment", /const urlSaidWhat = new Map\(\);/.test(code));
  ok("sources are filtered by whether the page names the place", /if \(!mentionsThisPlace\(u\)\) return false;/.test(code));
  ok("using the shared word-boundary check", /containsName\(said, v\)/.test(code));
  ok("across the place's real name variants", /variantsOf\(name, \{ includeSights: true \}\)/.test(code));
  // A page we never saw the text of is not a source. Never conclude a fact from
  // a failed lookup, which is this project's own standing rule.
  ok("a url with no snippet is not a source", /if \(!said\) return false;/.test(code));
  // The two exemptions, both principled: he chose those domains, and an
  // official site is about the place by definition.
  ok("founder-vouched domains are exempt", /founderUrls\.includes\(u\)/.test(code));
  ok("and so is the official site", /placesWebsite && u === placesWebsite/.test(code));

  // ── THE BEHAVIOUR, ON HIS ACTUAL CASE ─────────────────────────────
  // Reproducing the filter's rule against the real snippets from his screenshot.
  const name = "Skovgårde Bysmedie";
  const mentions = (said) => variantsOf(name, { includeSights: true }).some(v => containsName(said, v));
  ok("a castle page is not a source for a smithy", !mentions("Spøttrup Borg is a medieval castle in West Jutland"));
  ok("nor is a museum exhibition", !mentions("Kings, War and Christ, an exhibition at the National Museum"));
  ok("nor a general Denmark page", !mentions("Denmark travel guide, the best of Nordic travel"));
  ok("nor a three week rail itinerary", !mentions("A three week Denmark itinerary by train"));
  // And the page that IS about it survives, which is the half that proves the
  // filter is not simply throwing everything away.
  ok("a page that names the place is a source", mentions("Skovgårde Bysmedie, the old village smithy, opening hours"));
  ok("in either spelling of the Danish letters", mentions("Skovgaarde Bysmedie holder aabent om sommeren"));
  ok("and a name inside a longer title still counts", mentions("Visit Skovgårde Bysmedie | Djursland"));
  // The boundary still holds, so a short name cannot match a bigger word.
  ok("but letters appearing by accident do not", !containsName("there is also a beach nearby", "Als"));
}


// ── A NAMED SOURCE IS WHERE TO START, NOT WHERE TO STOP ─────────────
// Oliver, 10 Aug 2026: "When I write a source in for Perplexity to go through,
// it shouldn't only go through that.. it should also go through others."
//
// He was describing real behaviour. The fact-check prompt told the model to
// open the named sites "before any general search" and then closed with "say so
// explicitly rather than quietly falling back to a search result". The clause
// meant "do not silently substitute". What a model reads is: do not fall back
// to a search result. So naming one good source turned a fact-check into a
// single-site lookup, which is the opposite of why anybody names a good source.
//
// The drafting side already had this right. sourceRulesBlock says "THIS IS AN
// ADDITION, NOT A RESTRICTION. Search everything else exactly as you normally
// would." Two instructions about one thing, and only one of them correct, which
// is the shape this codebase keeps producing.
{
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const { sourceRulesBlock } = M;

  // The sentence that caused it is gone.
  ok("nothing tells it to avoid a search result", !/rather than quietly falling back to a search result/.test(app));
  ok("and the named sites are no longer framed as coming before ANY search", !/before any general search/.test(app));

  // And the correct rule is stated, in the same words as the drafting side.
  ok("the fact-check says it is an addition", /THIS IS AN ADDITION, NOT A RESTRICTION\. After reading them, search everything else/.test(app));
  ok("and says a named source is never the only place to look", /never the only place you are allowed to look/.test(app));
  // The failure mode this must prevent: a named source with nothing on a small
  // village producing "could not confirm" instead of an answer found elsewhere.
  ok("a silent source does not become a dead end", /Never report that something could not be confirmed just because the named sources did not have it/.test(app));
  ok("and provenance is still asked for, so the two can be told apart", /Say which answer came from which source/.test(app));

  // ONE RULE, SAID THE SAME WAY IN BOTH PLACES. The drafting block is where the
  // wording came from, so if that ever softens, this assertion says so.
  const block = sourceRulesBlock(
    [{ id: 1, domain: "visitdenmark.dk", applies_to: "", applies_place: "", enabled: true }],
    "town", { name: "Ribe" });
  ok("the drafting side still says it too", /THIS IS AN ADDITION, NOT A RESTRICTION/.test(block));
  ok("and still expects a miss to be ordinary", /keep looking elsewhere rather than reporting that nothing was found/.test(block));

  // The label a person reads should not promise the old behaviour either.
  ok("the box says the rest of the web is still searched", /it still searches everything else too/.test(app));
  ok("and the button no longer implies only his sources are used", !/\(using your sources\)/.test(app));
}


// ── DOES THE ENTRY AGREE WITH ITSELF ABOUT DISTANCE AND TIME ────────
// Oliver, 10 Aug 2026, passing on a pipeline review built around an entry
// claiming a 42 minute walk where the real walk is about six.
//
// The advice was to check stated times against a routing API. The app already
// does exactly that, and has since the guide pipeline was built. It just does
// it on LEGS: structured pairs of stops with coordinates. The 42 minutes was in
// a SENTENCE, and entryAudit scanned prose for dashes, filler, unqualified
// rankings, bare years and crossed costs, and for no claim about time or
// distance at all. The one number in the paragraph that arithmetic could settle
// was the one number nothing looked at.
//
// This needs no API and no coordinates, which is why it can run on every
// published entry for nothing: two numbers in one sentence are a claim about
// speed, and speed is arithmetic.
{
  const { claimConflicts, implausibleWalks, checkable, durationsIn, distancesIn, TOLERANCE, auditEntry } = M;

  // ── HIS ACTUAL CASE ───────────────────────────────────────────────
  const bad = "The village sits about 500 metres from the ferry terminal, a 42 minute walk with luggage.";
  const f = claimConflicts(bad);
  is("the 42 minute walk is caught", f.length, 1);
  is("and it says which way round it is wrong", f[0].direction, "time looks too long for the distance");
  is("the distance is read as metres, not kilometres", f[0].statedKm, 0.5);
  ok("and the expected time is a real walk of that length", f[0].expectedMinutes >= 6 && f[0].expectedMinutes <= 12);

  // ── AND THE HALF THAT MATTERS MORE: WHAT IT LEAVES ALONE ──────────
  // A check like this gets switched off the first time it argues with a
  // correct sentence, so every one of these is a case it must not touch.
  is("a correct sentence is left alone", claimConflicts("The village sits about 500 metres from the ferry terminal, a 7 minute walk."), []);
  is("an honest range is left alone", claimConflicts("It is roughly 1 km from the harbour, a 10 to 15 minute walk."), []);
  is("a short hop is left alone", claimConflicts("The church is 300 m away, about 5 minutes on foot."), []);
  is("a real drive is left alone", claimConflicts("Aarhus is 90 km away, about a 90 minute drive."), []);
  // Two distances and one time is a comparison, and guessing which distance the
  // time belongs to would invent findings out of correct sentences.
  is("a comparison is not a contradiction", claimConflicts("It is 400 m from the harbour and 2 km from the church, a 6 minute walk."), []);
  // No mode named means no speed to check against. Silence, not a guess.
  is("a sentence naming no mode is not checked", claimConflicts("It is 500 metres away and takes 42 minutes."), []);
  // Two sentences are two journeys. Splitting on paragraph would pair a
  // distance in one line with a duration in the next.
  is("numbers in different sentences are different journeys",
     claimConflicts("The harbour is 12 km away. The bakery is a 3 minute walk."), []);

  // A wrong drive is caught too, so this is not a walking-only check.
  is("a 90 minute drive over 2 km is caught", claimConflicts("Aarhus is 2 km away, a 90 minute drive.").length, 1);

  // ── THE PARSER, ON ITS OWN ────────────────────────────────────────
  is("hours become minutes", durationsIn("about 2 hours away")[0].minutes, 120);
  is("a range is its midpoint, not its floor", durationsIn("10 to 15 minutes")[0].minutes, 12.5);
  is("a decimal comma is a decimal", distancesIn("1,5 km from the centre")[0].km, 1.5);
  is("a bare m is metres", distancesIn("800 m away")[0].km, 0.8);
  is("and a bare km is kilometres", distancesIn("800 km away")[0].km, 800);
  // A /g/ regex is stateful, and reusing one across calls would skip matches on
  // the second string it ever saw. This is the standing rule in this codebase.
  is("the same text parses the same way twice",
     ["5 minutes", "5 minutes"].map(t => durationsIn(t).length), [1, 1]);

  // ── AND SAYING WHEN THERE WAS NOTHING TO CHECK ────────────────────
  // Zero findings from an entry that stated no numbers is not a clean bill of
  // health, and an audit reporting both the same way tells a person something
  // it does not know.
  ok("an entry with a checkable claim says so", checkable(bad));
  ok("an entry with no numbers does not", !checkable("A quiet village on the coast."));
  ok("and neither does one with numbers but no mode", !checkable("It is 500 metres away and takes 42 minutes."));

  // ── A WALK NOBODY WOULD CALL A WALK ───────────────────────────────
  // One number, no distance beside it, past any figure a Dane would walk.
  is("a 90 minute walk is flagged", implausibleWalks("A 90 minute walk from the station.").length, 1);
  is("a 15 minute walk is not", implausibleWalks("A 15 minute walk from the station.").length, 0);
  is("and neither is a 90 minute drive", implausibleWalks("A 90 minute drive from the station.").length, 0);

  // ── IT REACHES THE AUDIT, WHICH IS WHERE HE WOULD SEE IT ──────────
  // Written and not wired is this codebase's signature failure, so the check is
  // run through auditEntry rather than only through its own function.
  const audit = auditEntry({ type: "town", payload: { name: "Agersø", desc: bad, blogBody: [] } });
  const found = audit.findings.filter(x => x.field === "distance and time");
  is("the audit reports it", found.length, 1);
  // Degraded rather than indexed into. Unwiring the check makes found empty,
  // and found[0].severity then CRASHES the runner instead of failing it, which
  // hides every assertion after this point including the one that says why.
  const hit = found[0] || {};
  is("as critical, like the crossed-costs check it belongs beside", hit.severity, "critical");
  ok("and quotes the sentence so it can be found", /42 minute walk/.test(hit.detail || ""));
  ok("with the arithmetic spelled out", /is about \d+ minutes, not 42/.test(hit.detail || ""));
  // A clean entry produces none of this, or the audit cries wolf on everything.
  const clean = auditEntry({ type: "town", payload: { name: "Ribe", desc: "The church is 300 m away, about 5 minutes on foot.", blogBody: [] } });
  is("a correct entry gets no distance finding", clean.findings.filter(x => x.field === "distance and time"), []);

  // ── ONE SET OF SPEEDS, NOT TWO ────────────────────────────────────
  // The estimator, the circuity factor and the walk ceiling all come from
  // guideEnrichment. A second copy here would drift, and then the guide page
  // and the audit would disagree about the same journey.
  const src = readFileSync(join(root, "src/utils/claimCheck.js"), "utf8");
  ok("the speeds are imported, not restated", /import \{ estimateMinutes, WALK_MAX_MINUTES \} from "\.\/guideEnrichment"/.test(src));
  ok("no second speed table lives here", !/AVG_SPEED|4\.5|ROUTE_FACTOR *=/.test(stripNonCode(src)));
  ok("the tolerance is generous enough not to argue about ten versus twelve", TOLERANCE >= 2);
}


// ── THE COORDINATE SYSTEM ───────────────────────────────────────────
// Oliver, 10 Aug 2026: "My main objective right now is fixing the coordination
// system. That is our main problem it seems. The history is constantly true
// now. Which is great. But coordination is off." And then, correctly: "if we
// screw coordinations, it might hurt our guide too."
//
// A full trace of the geo path found two faults at the head of the chain, and
// they were multiplying each other.
{
  // towns is exported as TOWNS_FOR_TEST because another block already uses
  // that name. Same live array either way: liveContent pushes published rows
  // onto it at runtime, which is exactly what is being simulated below.
  const { lookupRealPlace, placeCoords, resolveStopCoordsDetailed, freeEntrance } = M;
  const towns = M.TOWNS_FOR_TEST;
  const guideSrc = readFileSync(join(root, "src/utils/guideEnrichment.js"), "utf8");
  const appSrc = readFileSync(join(root, "src/App.jsx"), "utf8");

  // ── FAULT ONE: THE "REAL COORDINATE ON FILE" TIER WAS DEAD ────────
  // resolveStopCoordsDetailed read `real.lat`. Every published payload stores
  // `__lat` (shapeForLive in studioContent.js, and liveContent.js reads __lat
  // to fill TOWN_COORDS). So the highest-quality source in the chain has never
  // fired in production, and every stop in every guide fell through to
  // Nominatim or to the crude town-centre fallback. That is why fixes in this
  // area kept half-working: the good branch was never the branch being taken.
  is("a published payload's coordinate is found", placeCoords({ __lat: 55.7, __lon: 9.5 }), { lat: 55.7, lon: 9.5 });
  is("a bare lat still works, since correction.js reads both", placeCoords({ lat: 55.7, lon: 9.5 }), { lat: 55.7, lon: 9.5 });
  is("__lat wins when both are present", placeCoords({ __lat: 1, __lon: 2, lat: 9, lon: 9 }), { lat: 1, lon: 2 });
  is("no coordinate is null, not a point", placeCoords({ name: "X" }), null);
  is("and a null row is null", placeCoords(null), null);
  // Number.isFinite, not truthiness: 0 is a real number and NaN is not, and
  // conflating them puts a missing coordinate in the Gulf of Guinea.
  is("a zero coordinate is a number, not a miss", placeCoords({ __lat: 0, __lon: 0 }), { lat: 0, lon: 0 });
  is("a non-numeric coordinate is a miss", placeCoords({ __lat: "abc", __lon: 5 }), null);
  ok("nothing reads the field that does not exist", !/real\?\.lat && real\?\.lon/.test(guideSrc + appSrc));

  // ── FAULT TWO: AN UNBOUNDED SUBSTRING MATCH AT THE HEAD OF THE CHAIN
  // lookupRealPlace outranks the geocode AND the town fallback, returns
  // precise: true, and a hit also steers the Nominatim query through mapHint.
  // So a wrong match here does not merely mislabel a stop: it geocodes a
  // different place and marks the answer precise, where nothing downstream can
  // catch it. It was a bare bidirectional .includes().
  //
  // Published rows are pushed onto these arrays at runtime by liveContent, so
  // this is what production actually looks like.
  towns.push({ id: 9001, name: "Vejle", __lat: 55.709, __lon: 9.535 });
  towns.push({ id: 9002, name: "Ribe", __lat: 55.330, __lon: 8.766 });
  towns.push({ id: 9003, name: "Møn", __lat: 54.976, __lon: 12.303 });
  freeEntrance.push({ id: 9004, name: "Ribe VikingeCenter", __lat: 55.303, __lon: 8.775 });
  freeEntrance.push({ id: 9005, name: "Møns Klint", __lat: 54.969, __lon: 12.545 });
  const hit = (stop) => lookupRealPlace(stop)?.name || null;

  // THE ONES THAT WERE WRONG.
  is("a street is not the town its name starts with", hit("Vejlebrovej coast viewpoint"), null);
  is("and nothing else swallows it either", hit("Marselisborg Slot"), null);
  // The reverse direction was the worse of the two, because the needle was the
  // stop name: a stop saying Møn was being answered by Møns Klint, a cliff.
  is("an island is not the cliff on it", hit("Møn"), "Møn");
  // And the tier that turned the town of Ribe into a viking centre 3 km out of
  // it, taking that coordinate with it.
  is("a town is the town, not an attraction near it", hit("Ribe"), "Ribe");

  // THE ONES THAT MUST STILL WORK, which is the half that decides whether this
  // is a fix or just a stricter thing that finds nothing.
  is("a specific stop finds its own entry", hit("Ribe VikingeCenter"), "Ribe VikingeCenter");
  is("and so does the cliff", hit("Møns Klint"), "Møns Klint");
  is("a stop with trailing context still resolves", hit("Ribe VikingeCenter, Ribe"), "Ribe VikingeCenter");
  // Widening: the stop is broader than the entry and there is no exact row.
  // Allowed, ranked last, and shortest wins so it reaches for the least.
  freeEntrance.push({ id: 9006, name: "Kronborg Slot", __lat: 56.039, __lon: 12.622 });
  is("a broad stop can still find one specific entry", hit("Kronborg"), "Kronborg Slot");

  // AND THE TWO FAULTS TOGETHER, which is the point: a correct match now
  // carries a real coordinate, marked precise, instead of falling through.
  const d = resolveStopCoordsDetailed("Ribe VikingeCenter", {});
  ok("a matched stop resolves", !!d);
  is("to its own coordinate", [Number(d.lat.toFixed(3)), Number(d.lon.toFixed(3))], [55.303, 8.775]);
  ok("and is marked precise, because it is", d.precise === true);
  // A stop nothing knows resolves to nothing rather than to a nearby town.
  is("an unknown stop is unresolved, not approximated", resolveStopCoordsDetailed("Vejlebrovej coast viewpoint", {}), null);

  // ── AND ONE COPY OF IT, NOT TWO ───────────────────────────────────
  // App.jsx carried a byte-identical lookupRealPlace and did not import the
  // shared one. Third duplicated function found today, after resolveLegMode and
  // the two heading lists, and the same cost every time.
  ok("App.jsx no longer declares its own", !/const lookupRealPlace = \(name\) => \{/.test(stripNonCode(appSrc)));
  ok("it imports the shared one", /import \{[^}]*\blookupRealPlace\b[^}]*\} from "\.\/utils\/guideEnrichment"/.test(appSrc));
  const defs = ["src/utils/guideEnrichment.js", "src/App.jsx", "src/pages/GuidePage.jsx"]
    .filter(f => /(?:const|function)\s+lookupRealPlace\s*[=(]/.test(stripNonCode(readFileSync(join(root, f), "utf8"))));
  is("lookupRealPlace is defined in exactly one file", defs, ["src/utils/guideEnrichment.js"]);

  // ── AND THE GEOCODE BUDGET, WHICH WAS A COST BUG TOO ──────────────
  // hasPreciseCoords decides which stops get sent to Nominatim. While it read
  // the field that is always undefined it answered false for everything, so
  // every stop in every guide was geocoded whether or not a real coordinate
  // was already on file.
  ok("the geocode skip reads the real field", /const hasPreciseCoords = \(n\) => !!placeCoords\(lookupRealPlace\(n\)\);/.test(stripNonCode(appSrc)));

  towns.length = towns.findIndex(t => t.id === 9001);
  freeEntrance.length = freeEntrance.findIndex(t => t.id === 9004);
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) { fails.forEach(f => console.log("  FAIL " + f + "\n")); process.exit(1); }
