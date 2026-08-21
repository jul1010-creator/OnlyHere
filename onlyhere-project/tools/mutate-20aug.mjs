// Mutation run over everything built on 20 August 2026.
//
// A green suite proves the tests RUN; a mutation run proves they MEASURE. Each
// mutant below restores the ORIGINAL BUG, so a survivor means the fix is not
// actually held in place by anything. Ten rounds of this on the day found three
// assertions that could never have failed, and every one of them looked fine:
//
//   the svg rule          the fixture was called logo.svg, so the JUNK rule
//                         caught it and the svg rule was never exercised
//   the lazy-load rule    the fixture was called blur-placeholder.png, same
//                         thing, and the mutation exposed a REAL bug behind it:
//                         `\bsrc=` matches inside `data-src=`
//   the rejected place    the pool row was named "Old Irish Pub (Copenhagen)"
//                         and never matched at all, so the whole block passed
//                         while the screen was still wrong
//
// Signal handlers plus an md5 manifest, standard here since the run that was
// killed by a tool timeout and left a mutant applied.
//
// ── TWO MUTANTS ARE DELIBERATELY NOT IN THIS LIST ───────────────────
// Widening DATE_LABEL_WINDOW or REJECT_WINDOW_BEFORE survives, and both are
// EQUIVALENT MUTANTS rather than gaps. What bounds those two rules is the regex
// ANCHOR (`$` on the label, `[^.!?]` on the verdict), not the window, so the
// window can be any size and the behaviour does not change. Both are written up
// in place. Adding them here would make this script fail forever for no reason.
//
// ── AND THE SIGNAL HANDLERS CANNOT SAVE YOU, WHICH THIS RUN PROVED ──
// The first run of this file was killed by a ten minute tool cap and left a
// mutant applied in eventDates.js, twenty one bytes short, with the suite red
// and nothing saying why. The handlers below are correct and did not fire:
// execFileSync BLOCKS THE EVENT LOOP, so a signal arriving while the test suite
// is running is never delivered to them. Every mutation runner in this repo has
// that hole and the comment at the top of each one says the handlers are the
// protection.
//
// So the protection is on DISK instead, and it does not depend on this process
// living long enough to do anything. A snapshot is written before the first
// mutant and deleted after the last, and finding one at startup means a previous
// run died: it is restored from before anything else happens. A crash-safe
// restore beats a handler that cannot run.
//
// It also takes --from and --to, because the honest fix for a ten minute cap is
// to run this in slices rather than to hope.
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const FILE_OF = {
  A: "src/App.jsx",
  S: "src/utils/pageScan.js",
  R: "src/utils/readPage.js",
  E: "src/utils/eventDates.js",
  C: "src/utils/aiClient.js",
  P: "src/utils/previewMatch.js",
  B: "src/utils/tripBrief.js",
  N: "api/scan-source.js",
};
const FILES = [...new Set(Object.values(FILE_OF))];
const originals = new Map(FILES.map(f => [f, readFileSync(f, "utf8")]));
const md5 = (s) => createHash("md5").update(s).digest("hex");
const manifest = new Map([...originals].map(([f, s]) => [f, md5(s)]));
const restore = () => originals.forEach((s, f) => writeFileSync(f, s));
["SIGTERM", "SIGINT", "SIGHUP"].forEach(sig => process.on(sig, () => { restore(); process.exit(1); }));

// The disk snapshot. Read BEFORE `originals` is trusted for anything, because a
// previous run that died left the working tree mutated and `originals` would
// otherwise capture the mutant as the truth and restore it forever.
const SNAP = "tools/.mutate-20aug.restore.json";
if (existsSync(SNAP)) {
  const saved = JSON.parse(readFileSync(SNAP, "utf8"));
  for (const [f, text] of Object.entries(saved)) {
    if (readFileSync(f, "utf8") !== text) { writeFileSync(f, text); console.log(`  restored ${f} from a run that did not finish`); }
    originals.set(f, text);
    manifest.set(f, md5(text));
  }
  rmSync(SNAP);
}
mkdirSync("tools", { recursive: true });
writeFileSync(SNAP, JSON.stringify(Object.fromEntries(originals), null, 0));

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};

const M = [
  // ── THE POSTER READER ─────────────────────────────────────────────
  ["R", "banners: bannerImages(html, url).slice(0, MAX_BANNERS), err: \"\"", "err: \"\""],
  ["R", "banners: bannerImagesFromMarkdown(deep.text, url).slice(0, MAX_BANNERS)", "banners: []"],
  ["N", "    banners: r.banners || [],\n    ...(r.firstTry", "    ...(r.firstTry"],
  ["S", "if (IMAGE_JUNK.test(url) || (alt && IMAGE_JUNK.test(alt))) return;", ""],
  ["S", 'const raw = wide || ATTR(tag, "data-src") || ATTR(tag, "data-original") || ATTR(tag, "src");', 'const raw = wide || ATTR(tag, "src") || ATTR(tag, "data-src");'],
  ["S", "`[\\\\s]${name}\\\\s*=", "`\\\\b${name}\\\\s*="],
  ["S", "export const MAX_BANNERS = 3;", "export const MAX_BANNERS = 8;"],
  ["S", "export const MAX_BANNERS = 3;", "export const MAX_BANNERS = 1;"],
  ["S", 'if (/\\.svg(?:$|[?#])/i.test(abs)) return "";', ""],
  ["S", 'if (!/^https?:\\/\\//i.test(abs)) return "";', ""],
  ["S", "let best = \"\", bestW = -1;", "let best = \"\", bestW = Infinity;"],
  ["S", "const wide = widestFromSrcset", "const wide = ((x) => \"\")"],
  ["S", "(fromMeta ? 100 : 0)", "(fromMeta ? 0 : 0)"],
  ["A", "if (!fromSite && needsDate && seenBanners.length && imagesRead < UPDATE_EVENTS_IMAGE_CAP) {", "if (true) {"],
  ["A", "const needsDate = isUndated(ev.date) || isPastDate(ev.date, checkFrom);", "const needsDate = true;"],
  ["A", "imagesRead += 1;", ""],
  ["A", "seenBanners.slice(0, room)", "seenBanners"],
  ["A", 'trace.push({ step: "poster", why: "no-banner-to-scan" })', ""],
  ["C", "Do not use anything you know or believe about this event, ", ""],
  ["C", 'return { text: "", error: "", none: true };', 'return { text: "", error: "none" };'],

  // ── THE TICKET LINK OFF A BLOCKED PAGE ────────────────────────────
  ["R", "      tickets: plain.tickets || [],\n    };", "    };"],
  ["R", "tickets: (plain.tickets && plain.tickets.length) ? plain.tickets : ticketLinksFromMarkdown(deep.text, url).slice(0, 6),", "tickets: [],"],
  ["N", "    tickets: r.tickets || [],\n    // banners", "    // banners"],
  ["A", "} else if (first.ok || (first.banners || []).length || (first.data?.tickets || []).length) {", "} else if (first.ok) {"],
  ["S", 'export const ticketLinksFromMarkdown = (md, baseUrl = "") => scoreTicketLinks(linksInMarkdown(md, baseUrl), baseUrl);', "export const ticketLinksFromMarkdown = () => [];"],
  ["S", 'if (!raw || /^(?:#|mailto:|tel:)/i.test(raw)) continue;', 'if (!raw) continue;'],

  // ── THE SESSION THAT NEVER REFRESHED ──────────────────────────────
  ["A", "if (res.status !== 401) return res;", "return res;"],
  ["A", "if (!fresh) return res;", ""],
  ["A", "await studioFetch(`/api/scan-source?url=${encodeURIComponent(url)}`)", "await fetch(`/api/scan-source?url=${encodeURIComponent(url)}`, { headers: routeAuth() })"],

  // ── THE TRACE THAT NAMES THE DOOR ─────────────────────────────────
  ["A", "const refusedByUs = !d.read && !!d.error;", "const refusedByUs = false;"],
  ["A", 'detail: String(result.error).slice(0, 160)', 'detail: ""'],
  ["E", "if (step.detail) {", "if (false) {"],
  ["E", "if (step.found) return `found ${step.found}`;", ""],
  ["E", 'if (why.startsWith("refused-")) {', "if (false) {"],
  ["E", "!t?.resolved && (isUndated(t?.date) || isPastDate(t?.date, today))", "!t?.resolved"],
  ["A", "const stuck = unresolvedTraces(updateEventsResults.traces, new Date());", "const stuck = [];"],

  // ── WHICH DATE ON THE PAGE IS THE EVENT'S ─────────────────────────
  ["E", 'if (labelled.length) return { found: labelled[0], why: "", labelled: true, candidates: future.length };', ""],
  ["E", 'if (future.length < CALENDAR_DATES) return { found: future[0], why: "", labelled: false, candidates: 1 };', 'return { found: future[0], why: "", labelled: false, candidates: 1 };'],
  ["E", "export const CALENDAR_DATES = 2;", "export const CALENDAR_DATES = 9;"],
  ["E", "if (have && !labelled && (next.getMonth() !== have.getMonth()", "if (false && !labelled && (next.getMonth() !== have.getMonth()"],
  ["E", "for (const m of t.matchAll(DAY_RANGE)) {", "for (const m of [...t.matchAll(DAY_RANGE)].slice(0, 1)) {"],

  // ── AN OFFICE IS NOT A VENUE ──────────────────────────────────────
  ["E", "if (OFFICE_RE.test(a)) return true;", ""],
  ["E", "const near = c.slice(Math.max(0, at - OFFICE_CONTEXT_WINDOW), at + a.length + OFFICE_CONTEXT_WINDOW);", "const near = c;"],
  ["E", "if (places && !looksLikeOffice(places, placesText)) {", "if (places) {"],
  ["E", 'if (site && !looksLikeOffice(site, siteText)) return { address: site, from: "official-site", why: "" };', 'if (site) return { address: site, from: "official-site", why: "" };'],

  // ── A NAME SAID IN ORDER TO REJECT IT ─────────────────────────────
  ["P", "if (isRejectedPlace(text, p.name)) continue;", ""],
  ["P", "return found > 0 && rejected === found;\n};", "return found > 0 && rejected > 0;\n};"],
  ["P", "if (REJECT_BEFORE.test(before) || REJECT_AFTER.test(after)) rejected++;", "if (REJECT_BEFORE.test(before)) rejected++;"],

  // ── FOOD IS OFFERED, NOT PLANNED ──────────────────────────────────
  ["P", 'export const foodIsPlanned = (wanted) => !!wanted && wanted.has("food");', 'export const foodIsPlanned = (wanted) => !wanted || wanted.has("food");'],
  ["P", "? foodIsPlanned(wanted)", "? true"],
  ["P", "? foodIsPlanned(wanted)", "? false"],
  ["A", "wantedCategories(saidByTravellerOnly)", "wantedCategories(forMatch)"],
  ["B", "ANSWER WHAT THEY ASKED, THEN ASK.", "Be helpful."],

  // ── "OUT OF THE CITY" NAMES NOWHERE TO GO ─────────────────────────
  ["P", "const fillFromReach = !wantedRegions.length && leavingTowns.length > 0 && stayingTowns.length === 0;", "const fillFromReach = false;"],
  ["P", "const fillFromReach = !wantedRegions.length && leavingTowns.length > 0 && stayingTowns.length === 0;", "const fillFromReach = !wantedRegions.length;"],
  ["P", "const fillFromReach = !wantedRegions.length && leavingTowns.length > 0 && stayingTowns.length === 0;", "const fillFromReach = leavingTowns.length > 0;"],
  ["P", "const from = arrivedAt || (leavingTowns.length ? townPointFor(leavingTowns[0].name) : null);", "const from = arrivedAt;"],
  ["P", "...(c.hit ? { _viaRegion: c.hit } : { _viaReach: true })", "_viaRegion: c.hit"],

  // ── THE RESEARCH PIPELINE READS PICTURES TOO ──────────────────────
  ["A", "if (!scanData.text && (scanData.banners || []).length && postersRead < MAX_POSTER_READS_PER_DRAFT) {", "if (true) {"],
  ["A", "postersRead += 1;", ""],
  ["A", "slice(0, Math.min(MAX_POSTER_READS_PER_SOURCE, MAX_POSTER_READS_PER_DRAFT - postersRead))", "slice(0)"],
  ["A", "const shot = await readPosterText(banner.url, name);", "const shot = await readDatesFromImage(banner.url, name);"],
  ["A", "[Read off a poster image on ${domainOf(url)}, transcribed rather than quoted from page text]", ""],
  ["C", "Do not use anything you know or believe about this place.", ""],
  ["C", "return askAboutImage(imageUrl, prompt, { maxTokens: 700, ...opts });", 'return { text: "", error: "" };'],
];

const FROM = arg("--from", 0), TO = arg("--to", M.length);
let survived = 0, killed = 0, na = 0;
M.forEach(([tag, from, to], i) => {
  if (i < FROM || i >= TO) return;
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
rmSync(SNAP, { force: true });
console.log(`\n  [${FROM}..${Math.min(TO, M.length)}) of ${M.length}: ${killed} killed, ${survived} survived, ${na} not applicable\n`);
process.exit(survived || na ? 1 : 0);
