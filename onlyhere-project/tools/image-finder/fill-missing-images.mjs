#!/usr/bin/env node
/**
 * fill-missing-images.mjs
 *
 * Scans src/data/*.js for `photo: "/xxx.ext"` references, finds the ones
 * whose file doesn't actually exist under public/, searches Unsplash /
 * Pexels / Pixabay for a matching photo of that place, asks Gemini to
 * sanity-check the photo actually shows the right place, and downloads the
 * first accepted match into public/ under a readable filename derived from
 * the place/event's own name (e.g. "roskilde-festival.jpg", not "major1.jpg")
 * — updating the `photo:` reference in the data file to match.
 *
 * Any image the tool already downloaded under an old-style generic filename
 * (local1.jpg, major3.jpg, ...) gets renamed to a readable name automatically
 * at the start of every run, with the data file reference updated too.
 *
 * Usage:
 *   node fill-missing-images.mjs            # normal run (up to dailyCap new images)
 *   node fill-missing-images.mjs --dry-run  # just list what's missing/renameable, no network calls, no writes
 *   node fill-missing-images.mjs --limit=5  # override how many to fill this run
 *
 * See README.md for how to get free API keys and set this up as a daily
 * scheduled task.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "src", "data");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const CONFIG_PATH = path.join(__dirname, "config.json");
const STATE_PATH = path.join(__dirname, "state.json");
const CREDITS_PATH = path.join(PUBLIC_DIR, "image-credits.json");

const DEFAULT_DAILY_CAP = 10;
const MAX_ATTEMPTS = 5;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const RUN_LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
      `Missing config.json at ${CONFIG_PATH}\nCopy config.example.json to config.json and fill in your API keys (see README.md).`
    );
    if (!DRY_RUN) process.exit(1);
    return {};
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { date: todayStr(), downloadsToday: 0, items: {} };
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  if (state.date !== todayStr()) {
    state.date = todayStr();
    state.downloadsToday = 0;
  }
  state.items = state.items || {};
  return state;
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// --- readable-filename helpers ---

function slugify(input) {
  if (!input) return "";
  const map = { æ: "ae", Æ: "Ae", ø: "o", Ø: "O", å: "aa", Å: "Aa" };
  let s = input.replace(/[æÆøØåÅ]/g, (ch) => map[ch]);
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); // strip remaining accents e.g. é -> e
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s;
}

// Picks a readable target relative path (keeping the original subfolder,
// e.g. "towns/") for a candidate, avoiding collisions with `reserved`.
function computeTargetRelPath(c, reserved) {
  const origRel = c.photoPath.replace(/^\//, "");
  const dir = path.posix.dirname(origRel); // "." for root-level files
  const ext = path.posix.extname(origRel) || ".jpg";
  const origBase = path.posix.basename(origRel, ext);

  const slug = slugify(c.name) || slugify(c.tag) || origBase;
  const prefix = dir === "." ? "" : dir + "/";

  let candidate = `${prefix}${slug}${ext}`;
  let n = 2;
  while (reserved.has(candidate.toLowerCase())) {
    candidate = `${prefix}${slug}-${n}${ext}`;
    n += 1;
  }
  reserved.add(candidate.toLowerCase());
  return candidate;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Rewrites `photo: "/oldPath"` -> `photo: "/newPath"` in a data file.
function updateDataFileReference(filePath, oldPhotoPath, newPhotoPath) {
  const source = fs.readFileSync(filePath, "utf8");
  const pattern = new RegExp(`(["'])${escapeRegExp(oldPhotoPath)}\\1`, "g");
  if (!pattern.test(source)) return false;
  const updated = source.replace(pattern, (_m, q) => `${q}${newPhotoPath}${q}`);
  fs.writeFileSync(filePath, updated);
  return true;
}

// --- parse src/data/*.js for photo references ---

function extractTopLevelObjectBlocks(source) {
  // Walks the file char-by-char and pulls out every balanced {...} block
  // that starts at brace-depth 0 -> 1 (i.e. top-level object literals in an
  // array). Good enough for this codebase's flat "export const x = [ {...} ]"
  // shape; nested arrays (e.g. "stops": [...]) are captured as raw text
  // inside the block, which is fine since we only regex the first match of
  // each field, and those appear before nested arrays in every file here.
  const blocks = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(source.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return blocks;
}

function firstMatch(block, regex) {
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

function parseCandidatesFromFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const blocks = extractTopLevelObjectBlocks(source);
  const candidates = [];

  for (const block of blocks) {
    const photo = firstMatch(block, /\bphoto:\s*["']([^"']+)["']/);
    if (!photo || photo.startsWith("http")) continue; // hot-linked, e.g. shop.js

    const name = firstMatch(block, /\b(?:name|title):\s*["']([^"']+)["']/);
    const region = firstMatch(block, /\bregion:\s*["']([^"']+)["']/);
    const mapHint = firstMatch(block, /\bmapHint:\s*["']([^"']+)["']/);
    const tag = firstMatch(block, /\btag:\s*["']([^"']+)["']/);

    candidates.push({
      sourceFile: path.basename(filePath),
      sourceFilePath: filePath,
      photoPath: photo, // e.g. "/towns/dragor.jpg"
      name,
      region,
      mapHint,
      tag,
    });
  }
  return candidates;
}

function getAllDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`Expected data dir not found: ${DATA_DIR}`);
  }
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(DATA_DIR, f));
}

function walkExistingFiles(dir, base = dir, out = new Set()) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkExistingFiles(full, base, out);
    } else {
      out.add(path.relative(base, full).split(path.sep).join("/").toLowerCase());
    }
  }
  return out;
}

function findGaps(allCandidates, existing) {
  const missing = [];
  const mismatches = [];

  for (const c of allCandidates) {
    const relPath = c.photoPath.replace(/^\//, "");
    const relLower = relPath.toLowerCase();

    if (existing.has(relLower)) continue; // already there, nothing to do

    // extension-mismatch check: same dir + same basename, different ext
    const dir = path.posix.dirname(relLower);
    const base = path.posix.basename(relLower).replace(/\.[a-z0-9]+$/, "");
    const foundAlt = [...existing].find((f) => {
      const fDir = path.posix.dirname(f);
      const fBase = path.posix.basename(f).replace(/\.[a-z0-9]+$/, "");
      return fDir === dir && fBase === base;
    });

    if (foundAlt) {
      mismatches.push({ ...c, foundAs: "/" + foundAlt });
    } else {
      missing.push(c);
    }
  }

  return { missing, mismatches };
}

function buildQuery(c) {
  return [c.name, c.region, "Denmark"].filter(Boolean).join(" ");
}

function buildContext(c) {
  return [c.name, c.region, c.tag, c.mapHint].filter(Boolean).join(", ");
}

// --- rename pass: fix up anything the tool already downloaded under an
// old-style generic filename (local1.jpg, major3.jpg, ...) ---

function planRenames(allCandidates, state, existing) {
  const reserved = new Set(existing);
  const renames = [];

  for (const c of allCandidates) {
    const relPath = c.photoPath.replace(/^\//, "");
    const item = state.items[relPath];
    if (!item || item.status !== "filled") continue; // only touch files WE downloaded
    if (!existing.has(relPath.toLowerCase())) continue; // file should exist if "filled"

    const idealSlug = slugify(c.name) || slugify(c.tag);
    if (!idealSlug) continue; // nothing better to rename to

    const currentBase = path.posix.basename(
      relPath,
      path.posix.extname(relPath)
    );
    if (currentBase.toLowerCase() === idealSlug.toLowerCase()) continue; // already readable

    // reserve the CURRENT name too so computeTargetRelPath doesn't reuse it
    // for something else before we've actually moved it
    const newRel = computeTargetRelPath(c, reserved);
    if (newRel.toLowerCase() === relPath.toLowerCase()) continue;

    renames.push({ candidate: c, oldRel: relPath, newRel, item });
  }

  return renames;
}

function applyRenames(renames) {
  let credits = [];
  if (fs.existsSync(CREDITS_PATH)) {
    try {
      credits = JSON.parse(fs.readFileSync(CREDITS_PATH, "utf8"));
    } catch {
      credits = [];
    }
  }

  for (const r of renames) {
    const oldFull = path.join(PUBLIC_DIR, r.oldRel);
    const newFull = path.join(PUBLIC_DIR, r.newRel);
    fs.mkdirSync(path.dirname(newFull), { recursive: true });
    fs.renameSync(oldFull, newFull);

    updateDataFileReference(r.candidate.sourceFilePath, r.candidate.photoPath, "/" + r.newRel);

    for (const entry of credits) {
      if (entry.file === r.candidate.photoPath) entry.file = "/" + r.newRel;
    }

    console.log(`Renamed ${r.candidate.photoPath} -> /${r.newRel}`);
  }

  if (renames.length) {
    fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2));
  }
}

// --- search sources ---

async function searchUnsplash(query, key, page = 1) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    query
  )}&per_page=3&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    source: "unsplash",
    verifyUrl: r.urls.small,
    downloadUrl: r.urls.regular,
    photographer: r.user?.name,
    pageUrl: r.links?.html,
    downloadLocation: r.links?.download_location,
  }));
}

async function searchPexels(query, key, page = 1) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
    query
  )}&per_page=3&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels search failed: ${res.status}`);
  const data = await res.json();
  return (data.photos || []).map((p) => ({
    source: "pexels",
    verifyUrl: p.src.medium,
    downloadUrl: p.src.large2x || p.src.large,
    photographer: p.photographer,
    pageUrl: p.url,
  }));
}

async function searchPixabay(query, key, page = 1) {
  const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(
    query
  )}&image_type=photo&per_page=3&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay search failed: ${res.status}`);
  const data = await res.json();
  return (data.hits || []).map((h) => ({
    source: "pixabay",
    verifyUrl: h.webformatURL,
    downloadUrl: h.largeImageURL,
    photographer: h.user,
    pageUrl: h.pageURL,
  }));
}

// --- verify with Gemini ---

async function verifyWithGemini(imageUrl, context, key, model) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return { ok: false, reason: `image fetch failed: ${imgRes.status}` };
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

  // Rewritten after a real, confirmed miss: an earlier version of this prompt accepted a
  // photo for a Danish festival that has a Union Jack visibly in the background — it
  // "plausibly represented the scene" (a book market) without the model ever being asked
  // to check whether it was actually DENMARK. Loose thematic matching isn't enough; a
  // wrong-country photo is worse than no photo at all, since it actively misleads rather
  // than just leaving a gap (the site already shows a clean emoji placeholder when a photo
  // is missing — that's a fine fallback, an actively wrong photo is not).
  const prompt = `You are checking whether a stock photo is safe to publish on a Danish travel website representing this specific place or event: "${context}". Being wrong here is worse than leaving the photo blank — a mismatched or wrong-country photo actively misleads a traveler, while no photo is just an honest gap. Judge this strictly, not just "does this loosely fit the theme."

STEP 1 — ACTIVELY HUNT FOR EVIDENCE THIS IS NOT DENMARK: look closely for any flag that isn't Danish or a generic EU flag, street/shop signs or any readable text in a language other than Danish (English signage as a plausible tourist-facing detail is fine, but text in French, German, Spanish, or any other specific non-Danish language is a red flag), license plates, postboxes, phone booths, or architecture styles clearly characteristic of a different specific country (distinctly British terraced housing, Mediterranean architecture, etc.). If you spot ANY concrete detail contradicting Denmark, reject immediately no matter how well the general theme fits — a British book market is not an acceptable stand-in for a Danish literature festival just because both involve books.

STEP 2 — IF NOTHING DISQUALIFIES IT, JUDGE THE ACTUAL MATCH: for a specific, well-known named place (a particular town, landmark, or venue), the photo should plausibly show that actual place, or at minimum an unmistakably Nordic/Danish scene consistent with its description — not a generic "could be absolutely anywhere" stock photo. For a smaller or more generic gathering (a small local festival, market stall, or event with no distinctive visual signature of its own, where a literal photo may not exist on free stock sites), a genuinely Denmark-consistent atmosphere photo of the right general activity is acceptable even if it isn't literally that exact event — but it must still look like it could believably be Denmark specifically, not just "a market" or "a crowd" that could be from any country.

If you are not genuinely confident, reject — a false "no match" just means this tool tries again on a later run with fresh candidates; a false "match" puts a wrong or wrong-country photo permanently on a real travel guide someone is trusting.

Reply with strict JSON only: {"match": true|false, "reason": "one short sentence", "redFlags": "any specific disqualifying detail you noticed (a flag, sign, architecture style, etc.), or empty string if genuinely none"}.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: buf.toString("base64") } },
        ],
      },
    ],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    let detail = errBody;
    try {
      detail = JSON.parse(errBody)?.error?.message || errBody;
    } catch {
      /* keep raw text */
    }
    return { ok: false, reason: `Gemini call failed: ${res.status} ${detail}`.slice(0, 200) };
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return { ok: !!parsed.match, reason: parsed.reason || "", redFlags: parsed.redFlags || "" };
  } catch {
    return { ok: false, reason: `unparseable Gemini response: ${text.slice(0, 120)}` };
  }
}

// --- download + credit log ---

function appendCredit(entry) {
  let credits = [];
  if (fs.existsSync(CREDITS_PATH)) {
    try {
      credits = JSON.parse(fs.readFileSync(CREDITS_PATH, "utf8"));
    } catch {
      credits = [];
    }
  }
  credits.push(entry);
  fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2));
}

async function downloadTo(publicRelPath, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const fullPath = path.join(PUBLIC_DIR, publicRelPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buf);
}

// --- main ---

async function main() {
  const dataFiles = getAllDataFiles();
  const allCandidates = dataFiles.flatMap(parseCandidatesFromFile);
  const state = loadState();

  // 1. Fix up anything already downloaded under an old-style generic name.
  const existingForRename = walkExistingFiles(PUBLIC_DIR);
  const renames = planRenames(allCandidates, state, existingForRename);

  if (renames.length) {
    console.log(`${DRY_RUN ? "Would rename" : "Renaming"} ${renames.length} existing file(s) to readable names:`);
    for (const r of renames) console.log(`  ${r.candidate.photoPath} -> /${r.newRel}`);
    if (!DRY_RUN) {
      applyRenames(renames);
      for (const r of renames) {
        state.items[r.newRel] = state.items[r.oldRel];
        delete state.items[r.oldRel];
      }
      saveState(state);
    }
    console.log("");
  }

  // Re-parse: if we just renamed things, the data files now point at the new names.
  const candidates = renames.length && !DRY_RUN
    ? dataFiles.flatMap(parseCandidatesFromFile)
    : allCandidates;
  const existing = renames.length && !DRY_RUN ? walkExistingFiles(PUBLIC_DIR) : existingForRename;

  // 2. Find gaps.
  const { missing, mismatches } = findGaps(candidates, existing);

  console.log(`Found ${missing.length} missing image(s), ${mismatches.length} mismatch(es).`);

  if (mismatches.length) {
    console.log("\nExtension/filename mismatches (fix by hand, not auto-downloaded):");
    for (const m of mismatches) {
      console.log(`  ${m.sourceFile}: code expects ${m.photoPath}, found ${m.foundAs} instead`);
    }
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: not calling any APIs. Missing images:");
    for (const c of missing) {
      const reserved = new Set(existing);
      const target = computeTargetRelPath(c, reserved);
      console.log(`  [${c.sourceFile}] ${c.photoPath}  ->  /${target}   query: "${buildQuery(c)}"`);
    }
    return;
  }

  const config = loadConfig();
  const dailyCap = RUN_LIMIT ?? config.dailyCap ?? DEFAULT_DAILY_CAP;
  const geminiModel = config.geminiModel || "gemini-3.5-flash";
  const remainingToday = Math.max(0, dailyCap - state.downloadsToday);

  if (remainingToday === 0) {
    console.log(`Daily cap of ${dailyCap} already reached today. Nothing to do.`);
    return;
  }

  // fn takes a page number so a place that failed verification on a previous run searches
  // fresh candidates instead of re-showing Gemini the exact same top-3 photos it already
  // rejected (now that verification is stricter, retrying the same candidates would just
  // waste attempts until the 5-try permanent-skip cap, without ever finding a real match).
  const searchers = [
    config.UNSPLASH_ACCESS_KEY && {
      name: "unsplash",
      fn: (q, page) => searchUnsplash(q, config.UNSPLASH_ACCESS_KEY, page),
    },
    config.PEXELS_API_KEY && {
      name: "pexels",
      fn: (q, page) => searchPexels(q, config.PEXELS_API_KEY, page),
    },
    config.PIXABAY_API_KEY && {
      name: "pixabay",
      fn: (q, page) => searchPixabay(q, config.PIXABAY_API_KEY, page),
    },
  ].filter(Boolean);

  if (searchers.length === 0) {
    console.error("No API keys configured in config.json — nothing to search with.");
    process.exit(1);
  }
  if (!config.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY in config.json — can't verify matches.");
    process.exit(1);
  }

  const filled = [];
  const skipped = [];
  const skippedPermanently = [];
  let doneCount = 0;
  const reservedNames = new Set(existing);

  for (const c of missing) {
    if (doneCount >= remainingToday) break;

    const relPath = c.photoPath.replace(/^\//, "");
    const item = state.items[relPath] || { attempts: 0 };
    if (item.status === "filled") continue;
    if (item.attempts >= MAX_ATTEMPTS) {
      skippedPermanently.push(c);
      continue;
    }

    const query = buildQuery(c);
    const context = buildContext(c);
    const targetRel = computeTargetRelPath(c, reservedNames);
    console.log(`\nSearching for: ${relPath}  ->  will save as /${targetRel}  (query: "${query}")`);

    // Page 1 on the first attempt, page 2 on the second, etc. — keeps each retry looking at
    // fresh candidates instead of the same ones already rejected on an earlier run.
    const page = item.attempts + 1;

    let accepted = null;
    for (const searcher of searchers) {
      let results = [];
      try {
        results = await searcher.fn(query, page);
      } catch (err) {
        console.log(`  ${searcher.name} search error: ${err.message}`);
        continue;
      }
      for (const r of results) {
        let verdict;
        try {
          verdict = await verifyWithGemini(r.verifyUrl, context, config.GEMINI_API_KEY, geminiModel);
        } catch (err) {
          verdict = { ok: false, reason: `verify error: ${err.message}` };
        }
        const flagNote = !verdict.ok && verdict.redFlags ? ` [red flag: ${verdict.redFlags}]` : "";
        console.log(
          `  ${searcher.name} candidate -> ${verdict.ok ? "ACCEPTED" : "rejected"} (${verdict.reason})${flagNote}`
        );
        if (verdict.ok) {
          accepted = r;
          break;
        }
      }
      if (accepted) break;
    }

    item.attempts += 1;
    item.lastTried = todayStr();

    if (accepted) {
      // targetRel was already computed above (and reserved) before searching.
      try {
        await downloadTo(targetRel, accepted.downloadUrl);
        if (accepted.source === "unsplash" && accepted.downloadLocation && config.UNSPLASH_ACCESS_KEY) {
          // Required by Unsplash API guidelines: ping this whenever a photo is downloaded/used.
          await fetch(accepted.downloadLocation, {
            headers: { Authorization: `Client-ID ${config.UNSPLASH_ACCESS_KEY}` },
          }).catch(() => {});
        }
        if (targetRel !== relPath) {
          updateDataFileReference(c.sourceFilePath, c.photoPath, "/" + targetRel);
        }
        appendCredit({
          file: "/" + targetRel,
          source: accepted.source,
          photographer: accepted.photographer || null,
          sourceUrl: accepted.pageUrl || null,
          query,
          downloadedAt: new Date().toISOString(),
        });
        item.status = "filled";
        item.source = accepted.source;
        filled.push({ ...c, ...accepted, savedAs: "/" + targetRel });
        state.downloadsToday += 1;
        doneCount += 1;
        // store state under the FINAL (readable) relative path
        state.items[targetRel] = item;
        if (targetRel !== relPath) delete state.items[relPath];
      } catch (err) {
        console.log(`  download failed: ${err.message}`);
        skipped.push(c);
        state.items[relPath] = item;
      }
    } else {
      skipped.push(c);
      state.items[relPath] = item;
    }

    saveState(state);
  }

  console.log("\n=== Run summary ===");
  console.log(`Filled (${filled.length}):`);
  for (const f of filled) console.log(`  ${f.savedAs}  <- ${f.source} (${f.photographer || "unknown"})`);
  console.log(`Skipped, will retry next run (${skipped.length}):`);
  for (const s of skipped) console.log(`  ${s.photoPath}`);
  console.log(`Permanently skipped after ${MAX_ATTEMPTS} attempts (${skippedPermanently.length}):`);
  for (const s of skippedPermanently) console.log(`  ${s.photoPath}`);
  if (mismatches.length) {
    console.log(`Mismatches needing a manual fix (${mismatches.length}) — see above.`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
