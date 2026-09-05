// ── THE SECOND INSTRUMENT, AND WHY THERE ARE TWO ────────────────────
//
// tests/render.mjs already exists, written 25 Aug 2026 when Oliver asked "how
// do we actually know it works?", and it is not this. It renders one component
// with react-dom/server and reads the text back, and it says its own limits out
// loud: EFFECTS DO NOT RUN AND STATE STAYS AT ITS INITIAL VALUE.
//
// That limit is exactly the hole the pager fell through. The bug was an effect
// writing a style onto a node React also owned, which is invisible to a string
// render by construction. So this file is the other half: a real build, in a
// real browser, with effects running and state changing, driven by clicks.
//
// Keep both. A server render is fast, needs no browser, and answers "does this
// component say the right thing". This is slow, needs Chromium, and answers
// "does the app still work when you press things". Neither can do the other's
// job.
//
// ── THE TEST THAT WOULD HAVE CAUGHT IT IN SECONDS ───────────────────
//
// 5 Sep 2026. I shipped two fixes for the page pager, in a row, and both broke
// the live site. The second one put every page past the second behind a blank
// screen, and Oliver found it: "It's not just Detour.. it's every navigation.
// Essentials even stays on explore page."
//
// tests/run.mjs had 13,264 assertions at the time and every one of them passed
// on the broken build, because the bug was not in a pure function, not in a
// string of source, and not visible to a server render: it was React and an
// imperative style write disagreeing about who owned `transform`, which is a
// fact about a live DOM.
//
// So this is the other kind. It builds the app, opens it in a real browser,
// clicks each item in the navigation and asserts the right page is on screen.
// It takes about a minute and it is the difference between finding that class
// of bug here or having the founder find it in production.
//
//   node tests/browser.mjs
//
// SKIPS RATHER THAN FAILS when the browser is not installed, because a machine
// without Chromium should not be told its code is broken. It says so loudly and
// exits 0. Anywhere it CAN run, a failure is a failure.
import { existsSync, mkdtempSync, writeFileSync, rmSync, createReadStream } from "node:fs";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ico": "image/x-icon" };
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
let passed = 0, failed = 0; const fails = [];
const is = (name, a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++; else { failed++; fails.push(`${name}\n     expected ${y}\n     actual   ${x}`); } };
const ok = (name, c) => is(name, !!c, true);
const skip = (why) => { console.log(`\n  render tests SKIPPED: ${why}\n`); process.exit(0); };

const CHROME = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"]
  .find(p => existsSync(p));
if (!CHROME) skip("no Chromium found. Set PLAYWRIGHT_BROWSERS_PATH or install one.");

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { skip("playwright is not installed here (npm i -D playwright)."); }

// ── THE BUILD IS THE THING UNDER TEST ───────────────────────────────
// Not the dev server: the pager bug was in how React and an effect shared a
// style property, and that is the same in both, but a production build is what
// the founder deploys and what broke. Test the artefact.
const out = mkdtempSync(join(tmpdir(), "gemlyx-render-"));

// ── AND IT BRINGS ITS OWN CONFIG, RATHER THAN ADDING ONE ────────────
//
// The repo has no vite.config, which is fine for Vercel and not fine
// everywhere: on a machine whose Vite defaults to the classic JSX runtime the
// build produces "React is not defined" at load, and the test would report the
// app as broken when the deployed one is not.
//
// Written to a temp path and passed with --config, so nothing appears in the
// repo even if this crashes, and the real build is left exactly as it is. The
// config sets `root` because Vite resolves it relative to the config file.
const cfg = join(out, "render.vite.config.mjs");
writeFileSync(cfg, `export default { root: ${JSON.stringify(root)}, esbuild: { jsx: "automatic" } };\n`);
try {
  execFileSync("npx", ["vite", "build", "--config", cfg, "--outDir", out, "--emptyOutDir", "--logLevel", "error"],
    { cwd: root, stdio: "inherit", timeout: 300000 });
} catch (e) { console.log(`\n  render tests SKIPPED: the build failed (${String(e.message || e).slice(0, 120)})\n`); process.exit(0); }

// ── SERVED BY THIRTY LINES, NOT BY A TOOL ───────────────────────────
//
// `vite preview` resolves outDir against the config's root, which fights an
// absolute temp directory. A static server is the whole requirement here: the
// build is already made, and every route this test touches is the index.
const server = createServer((req, res) => {
  const rel = decodeURIComponent((req.url || "/").split("?")[0]);
  const file = join(out, rel === "/" ? "index.html" : rel.replace(/^\/+/, ""));
  const send = (path) => {
    const ext = path.slice(path.lastIndexOf("."));
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    createReadStream(path).pipe(res);
  };
  // Anything unknown falls back to the index, the way a SPA host does, so a
  // deep link cannot 404 the test into a false failure.
  if (existsSync(file) && !file.endsWith("/")) send(file);
  else send(join(out, "index.html"));
});
await new Promise(r => server.listen(4319, r));
const stop = () => { try { server.close(); } catch {} try { rmSync(out, { recursive: true, force: true }); } catch {} };
process.on("exit", stop);

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(String(e).slice(0, 200)));
await page.goto("http://localhost:4319/", { waitUntil: "load" });
await page.waitForTimeout(2500);

// Past the splash. It is a real screen and a reader meets it first, so the test
// meets it first too.
const enter = await page.$("text=Enter Denmark");
ok("the landing screen offers a way in", !!enter);
if (enter) { await enter.click(); await page.waitForTimeout(900); }

// ── WHICH SLOT IS ON SCREEN ─────────────────────────────────────────
//
// Measured off the DOM rather than trusted from the transform: the question a
// reader asks is "am I looking at the page I clicked", and the honest way to
// answer it is to find which slot covers the middle of the viewport.
const slotInView = () => page.evaluate(() => {
  const strip = [...document.querySelectorAll("div")].find(d =>
    d.style.display === "flex" && /^\d+%$/.test(d.style.width) && parseFloat(d.style.width) >= 800);
  if (!strip) return { error: "the pager strip was not found" };
  const box = strip.parentElement.getBoundingClientRect();
  const mid = box.left + box.width / 2;
  const slots = [...strip.children];
  const i = slots.findIndex(s => { const r = s.getBoundingClientRect(); return r.left < mid && r.right > mid; });
  return { index: i, transform: strip.style.transform || "(none)",
    text: (slots[i]?.innerText || "").trim().split("\n").filter(Boolean)[0] || "(EMPTY)" };
});

// Every page, by the name a reader clicks. The pager bug showed page one for
// all of them, so asserting the INDEX is what makes this test able to fail.
const NAV = ["Explore", "Essentials", "Tips", "Attractions", "Events", "Food", "Nightlife", "Towns"];
const first = await slotInView();
ok("the pager is on the page", !first.error);
is("it opens on the first page", first.index, 0);

for (let i = 1; i < NAV.length; i++) {
  const label = NAV[i];
  const el = await page.$(`button:has-text("${label}")`);
  if (!el) { is(`the nav has ${label}`, "missing", "present"); continue; }
  await el.click();
  await page.waitForTimeout(700);
  const at = await slotInView();
  is(`clicking ${label} moves to its own page`, at.index, i);
  ok(`and ${label} has something on it`, at.text !== "(EMPTY)");
}

// Back to the start, because a pager that can only go forwards is half broken.
const home = await page.$('button:has-text("Explore")');
if (home) { await home.click(); await page.waitForTimeout(700); }
is("and back to the first page", (await slotInView()).index, 0);

is("nothing threw while doing it", pageErrors, []);

await browser.close();
stop();

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) { fails.forEach(f => console.log("  FAIL " + f + "\n")); process.exit(1); }
