// ── WHERE GEMLYX IS THIN, AND WHY A PHOTO IS NOT SHOWING ────────────
//
// Two questions Oliver asked on 24 August that both need the LIVE table and
// therefore could not be answered from the source alone:
//
//   "Which ones critically need more content, and in what category."
//   "Why are some pictures being blocked? I have pictures on some towns and
//    places, but they're not shown."
//
// The Studio already answers half of the first one on a chip. This prints the
// whole grid, region by category, plus a photo verdict per row and a scan of
// public/ for image files nothing can reach.
//
//   node tools/contentReport.mjs             the full report
//   node tools/contentReport.mjs --photos    the photo half only
//   node tools/contentReport.mjs --offline   skip Supabase, scan public/ only
//
// A REPORT, NOT AN ASSERTION. Not part of `node tests/run.mjs`, same reason
// tests/comment-audit.mjs is not: it reads the network and its answer changes
// every time somebody publishes.
//
// ── AND IT USES THE APP'S OWN FUNCTIONS, NOT COPIES ─────────────────
// coverageByTarget, partOfCountry, unplaced and slugify are imported through
// the same esbuild bundle tests/run.mjs uses. A second implementation of "which
// region is this row in" is exactly the two-instruments problem that produced
// the 19 August bug this codebase already fixed once, where partOfCountry read
// __lat and regionOf read __lat ?? lat, so the two disagreed and the Studio
// told him South Jutland was empty while he was looking at content in it.
import { mkdtempSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv.slice(2);
const only = (f) => arg.includes(f);

// ── THE BUNDLE, EXACTLY AS THE SUITE BUILDS IT ──────────────────────
const dir = mkdtempSync(join(tmpdir(), "gemlyx-report-"));
const entry = join(dir, "entry.js");
const bundle = join(dir, "bundle.mjs");
writeFileSync(entry, `
  export { DISCOVERY_TARGETS, coverageByTarget, targetById } from ${JSON.stringify(join(root, "src/utils/discovery.js"))};
  export { partOfCountry, unplaced, PARTS } from ${JSON.stringify(join(root, "src/utils/geography.js"))};
  export { slugify } from ${JSON.stringify(join(root, "src/utils/studioContent.js"))};
  export { SUPABASE_URL, SUPABASE_KEY } from ${JSON.stringify(join(root, "src/config.js"))};
`);
// esbuild's Node API, not its binary and not its .bin shim, for the reason
// tests/run.mjs records: npm writes an extensionless shell shim on Windows and
// spawning it fails with ENOENT while existsSync says the file is there.
let buildSync;
try { ({ buildSync } = await import("esbuild")); }
catch { console.error("\n  Could not load esbuild from node_modules. Run `npm install` first.\n"); process.exit(1); }
try {
  buildSync({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "silent" });
} catch (e) {
  console.error("\n  Bundling failed:\n" + String([e?.message, ...(e?.errors || []).map(x => x.text)].filter(Boolean).join("\n")));
  process.exit(1);
}
const M = await import("file://" + bundle);
rmSync(dir, { recursive: true, force: true });

const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

// ── PART ONE: WHAT THE FOLDERS ON DISK CAN AND CANNOT BE REACHED BY ─
//
// This half needs no network and it is the half that answers the picture
// question, because the reason is structural rather than per-row.
//
// TWO RULES DECIDE WHETHER A FILE ON DISK CAN EVER BE THE PHOTO:
//
//   1. THE FOLDER. shapeForLive writes a template path per type, and there are
//      exactly six folders it can name. A file in any other folder, public/
//      root included, is unreachable by that path no matter what it is called.
//   2. THE NAME. slugify strips everything that is not a-z or 0-9, so it
//      removes hyphens, spaces and capitals. "thorup-strand.jpg" can never be
//      the photo for Thorup Strand, because the path built is
//      /towns/thorupstrand.jpg.
//
// There is a second door: typing a filename into the Studio photo field writes
// /<folder>/<that exact filename>, hyphens and all. That door only opens on a
// FRESH draft, never on an edit of a published row (App.jsx, `if (!isEditing
// && studioPhotoName)`), and it still has to be a folder in the list below.
const TEMPLATE_FOLDERS = ["towns", "events", "food", "nightlife-streets", "nightlife-towns", "craft"];
// Written by the Studio filename door only. public/free/ has never existed.
const STUDIO_ONLY_FOLDERS = ["attractions", "nightlife"];
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
// Not content. The front page layers, the brand marks, the OG card.
const NOT_CONTENT = /^(fp-|og-|favicon|picture\d|video|composite|Better |Fun Map|Terrain|Gemini_Generated|Generated Image|Front|front-|checklist|plans|roadtrip)/i;

const scanPublic = () => {
  const base = join(root, "public");
  if (!existsSync(base)) return null;
  const out = [];
  const walk = (abs, rel) => {
    for (const name of readdirSync(abs)) {
      const full = join(abs, name);
      const st = statSync(full);
      if (st.isDirectory()) { walk(full, rel ? `${rel}/${name}` : name); continue; }
      if (!IMAGE_EXT.has(extname(name).toLowerCase())) continue;
      out.push({ folder: rel, file: name, bytes: st.size });
    }
  };
  walk(base, "");
  return out;
};

const photoPathReport = () => {
  const files = scanPublic();
  if (!files) { console.log("No public/ directory here, skipping the file scan.\n"); return; }

  const content = files.filter(f => !(f.folder === "" && NOT_CONTENT.test(f.file)) && f.folder !== "brand");
  const byFolder = new Map();
  for (const f of content) {
    const k = f.folder || "(public root)";
    if (!byFolder.has(k)) byFolder.set(k, []);
    byFolder.get(k).push(f);
  }

  console.log("── IMAGE FILES ON DISK, AND WHETHER ANY PATH CAN REACH THEM ──\n");
  let reachable = 0, unreachableName = 0, unreachableFolder = 0;
  for (const [folder, list] of [...byFolder].sort()) {
    const isTemplate = TEMPLATE_FOLDERS.includes(folder);
    const isStudio = STUDIO_ONLY_FOLDERS.includes(folder);
    const where = isTemplate ? "template path writes here"
      : isStudio ? "only the Studio filename field writes here"
      : "NOTHING writes here";
    console.log(`  ${folder}/   (${list.length} file${list.length === 1 ? "" : "s"}, ${where})`);
    for (const f of list) {
      const stem = f.file.replace(/\.[^.]+$/, "");
      // A file is reachable BY A SLUG only when its own stem is already what
      // slugify would produce, because slugify is applied to the entry name and
      // the result has to equal the filename exactly.
      const slugSafe = stem === M.slugify(stem);
      let verdict;
      if (!isTemplate && !isStudio) { verdict = "unreachable: wrong folder"; unreachableFolder++; }
      else if (isStudio) { verdict = slugSafe ? "fresh drafts only" : "fresh drafts only, and never by slug"; unreachableFolder++; }
      else if (!slugSafe) { verdict = `unreachable by slug: would need "${M.slugify(stem)}${extname(f.file)}"`; unreachableName++; }
      else { verdict = "reachable"; reachable++; }
      const mark = verdict === "reachable" ? "  ok " : "  →  ";
      console.log(`  ${mark}${pad(f.file, 44)} ${verdict}`);
    }
    console.log("");
  }
  console.log(`  ${reachable} reachable, ${unreachableName} blocked by the filename, ${unreachableFolder} blocked by the folder.\n`);
  console.log("  Folders a template path can name: " + TEMPLATE_FOLDERS.map(f => "/" + f + "/").join(" "));
  console.log("  Folders only the Studio filename field can name: " + STUDIO_ONLY_FOLDERS.map(f => "/" + f + "/").join(" "));
  console.log("");
  console.log("  AND THE PROBE RUNS AT PUBLISH TIME, ONCE. App.jsx loads the path with an");
  console.log("  Image() before saving and DELETES the field if it 404s, so a file added to");
  console.log("  public/ after a row was published changes nothing: that row has no photo");
  console.log("  key at all any more. Fixing the file is step one; republishing is step two.\n");
};

// ── PART TWO: THE LIVE TABLE ────────────────────────────────────────
const TYPE_LABEL = {
  town: "Towns", festival: "Events", free: "Attractions", food: "Food",
  foodStreet: "Food streets", night: "Nightlife", nightStreet: "Nightlife streets",
  nightTown: "Nightlife towns", booking: "Workshops", essential: "Essentials",
};
// The order a day is built in, which is the order a gap hurts in. A region with
// no TOWN cannot have a day at all; a region with towns and no attractions has
// days with nothing in them; food and nightlife are the last to bite.
const TYPE_PRIORITY = ["town", "free", "festival", "food", "booking", "night", "nightStreet", "nightTown", "foodStreet"];

const fetchRows = async () => {
  const url = `${M.SUPABASE_URL}/rest/v1/gemlyx_content?select=id,type,payload&published=eq.true&order=id.desc`;
  const res = await fetch(url, { headers: { apikey: M.SUPABASE_KEY, Authorization: `Bearer ${M.SUPABASE_KEY}` } });
  if (!res.ok) throw new Error(`Supabase said ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("Supabase did not return an array");
  return rows;
};

const coverageReport = (rows) => {
  // coverageByTarget takes rows and reads r.payload || r, so it is given the
  // rows as they arrive. Per type, the same rows filtered first.
  const targets = M.DISCOVERY_TARGETS.filter(t => t.part);
  const types = TYPE_PRIORITY.filter(t => rows.some(r => r.type === t));

  console.log("── PUBLISHED ROWS BY REGION AND CATEGORY ──────────────────────\n");
  const nameW = 22;
  console.log("  " + pad("", nameW) + types.map(t => rpad(TYPE_LABEL[t] || t, 13)).join("") + rpad("total", 8));
  const totals = {};
  for (const t of targets) {
    const cells = types.map(ty => {
      const n = M.coverageByTarget(rows.filter(r => r.type === ty))[t.id];
      totals[ty] = (totals[ty] || 0) + (n || 0);
      return n;
    });
    const rowTotal = cells.reduce((a, b) => a + (b || 0), 0);
    const line = cells.map(n => rpad(n === 0 ? "  ." : String(n), 13)).join("");
    console.log("  " + pad(t.label, nameW) + line + rpad(rowTotal, 8));
  }
  console.log("  " + pad("", nameW) + types.map(ty => rpad(totals[ty] || 0, 13)).join(""));
  console.log("\n  A dot is zero. The small islands are deliberately absent: an island is not");
  console.log("  a latitude band, so coverageByTarget returns null there rather than a wrong");
  console.log("  number, and a count that is quietly false is worse than no count.\n");

  // ── WHICH GAP IS CRITICAL, NOT WHICH IS BIGGEST ───────────────────
  // A zero in Towns is a region that cannot hold a day. A zero in Nightlife
  // streets is a missing filter. Ranking them the same way would put the
  // cheapest work at the top.
  const critical = [];
  for (const t of targets) {
    const towns = M.coverageByTarget(rows.filter(r => r.type === "town"))[t.id] || 0;
    const stops = M.coverageByTarget(rows.filter(r => r.type === "free"))[t.id] || 0;
    const events = M.coverageByTarget(rows.filter(r => r.type === "festival"))[t.id] || 0;
    if (towns === 0) critical.push({ region: t.label, why: "no town, so no day can be built here at all", need: "Towns" });
    else if (stops === 0) critical.push({ region: t.label, why: `${towns} town${towns === 1 ? "" : "s"} and nothing to do in them`, need: "Attractions" });
    else if (towns < 3) critical.push({ region: t.label, why: `${towns} towns, so every trip here is the same trip`, need: "Towns" });
    else if (events === 0) critical.push({ region: t.label, why: `${towns} towns, ${stops} stops, no events, so nothing here is date-aware`, need: "Events" });
  }
  if (critical.length) {
    console.log("── CRITICAL, IN THE ORDER A GAP BREAKS A GUIDE ────────────────\n");
    for (const c of critical) console.log(`  ${pad(c.region, nameW)} need ${pad(c.need, 13)} ${c.why}`);
    console.log("");
  }

  const lost = M.unplaced(rows.map(r => ({ ...(r.payload || {}), _id: r.id })));
  if (lost.length) {
    console.log(`── ${lost.length} ROW${lost.length === 1 ? "" : "S"} NOTHING CAN PLACE ───────────────────────────\n`);
    console.log("  These are published and counted in no region above, so every coverage");
    console.log("  number here is an undercount by however many of these belong in it.\n");
    for (const e of lost.slice(0, 40)) console.log(`  #${pad(e._id, 6)} ${e.name}`);
    if (lost.length > 40) console.log(`  ...and ${lost.length - 40} more`);
    console.log("");
  }
};

const photoRowReport = (rows) => {
  console.log("── THE PHOTO ON EACH PUBLISHED ROW ────────────────────────────\n");
  const groups = { absolute: [], relative: [], none: [] };
  for (const r of rows) {
    const p = r.payload || {};
    const photo = String(p.photo || "").trim();
    if (!photo) groups.none.push(r);
    else if (/^https?:\/\//i.test(photo)) groups.absolute.push(r);
    else groups.relative.push(r);
  }
  console.log(`  ${rpad(groups.absolute.length, 4)}  carry an absolute URL   (uploaded, or found on Wikimedia. These render.)`);
  console.log(`  ${rpad(groups.relative.length, 4)}  carry a relative path   (a file in public/. Renders only if it is deployed.)`);
  console.log(`  ${rpad(groups.none.length, 4)}  carry no photo at all   (either never had one, or the publish probe dropped it.)\n`);

  if (groups.relative.length) {
    console.log("  The relative ones, which are the ones that can silently 404:\n");
    for (const r of groups.relative) console.log(`    ${pad(r.payload.photo, 46)} ${r.payload.name}`);
    console.log("");
  }
  if (groups.none.length) {
    const byType = {};
    for (const r of groups.none) byType[r.type] = (byType[r.type] || 0) + 1;
    console.log("  The photoless ones, by type: " + Object.entries(byType).map(([t, n]) => `${TYPE_LABEL[t] || t} ${n}`).join(", "));
    console.log("");
    console.log("  Studio's Backfill photos button fills these from Wikimedia Commons. It only");
    console.log("  touches rows whose photo does not load, so it will REPLACE a broken path to");
    console.log("  one of your own pictures with a stranger's. Fix the paths you care about");
    console.log("  and republish those rows BEFORE running it, or you lose your own photos to");
    console.log("  Commons substitutes and will not be able to tell which was which.\n");
  }
};

// ── RUN ─────────────────────────────────────────────────────────────
if (!only("--live")) photoPathReport();

if (!only("--offline")) {
  try {
    const rows = await fetchRows();
    console.log(`── ${rows.length} PUBLISHED ROWS ─────────────────────────────────────────\n`);
    if (!only("--photos")) coverageReport(rows);
    photoRowReport(rows);
  } catch (err) {
    console.log("── COULD NOT READ THE LIVE TABLE ──────────────────────────────\n");
    console.log(`  ${err.message}`);
    console.log("  The file scan above needs no network and is complete on its own.");
    console.log("  Run this on a machine with internet for the coverage grid.\n");
  }
}
