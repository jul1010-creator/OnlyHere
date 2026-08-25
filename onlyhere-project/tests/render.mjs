// ── AN INSTRUMENT FOR THE ONE QUESTION THE SUITE CANNOT ASK ─────────
//
// Oliver, 25 Aug 2026: "I think we need to test the live render btw.. how do we
// actually know it works?"
//
// The suite has 10,348 assertions and every one of them is either a pure
// function called directly or a regular expression run over source text.
// Neither can see a screen, and FOUR features this month were green through
// being completely broken, all four of them wiring failures:
//
//   the AI Act disclosure  six languages, every reader got English
//   the tier publish gate  offered four words, refused two of them
//   update-events-check    checked zero events, returned a clean 200
//   the photo probe        ran once at publish and never again
//
// A grep can prove `aiDisclosureFor` is CALLED. It cannot prove what comes out.
// That gap is the whole reason those four shipped.
//
// ── SO: RENDER IT AND READ WHAT IT SAYS ─────────────────────────────
//
// react-dom 18.3.1 is already a dependency and esbuild is already how the suite
// bundles. renderToStaticMarkup is synchronous, needs no DOM, and answers the
// only question that matters: WHAT DOES THE SCREEN SAY, for this reader, at this
// moment.
//
// Effects do not run and state stays at its initial value, which is a real limit
// and the right trade: this instrument is for what a surface SAYS, not for what
// it does after you click it. Every one of the four bugs above is inside that
// limit.
//
// ── AND `now` MUST BE AN ARGUMENT, NOT A CLOCK READ ─────────────────
//
// The live layer is time-dependent by definition, so a component that calls
// Date.now() itself can only ever be tested at the instant the test runs. One
// that takes `now` as a prop can be tested at T+0, at T+4h and three weeks
// stale, in the same second.
//
// That is a design constraint on the CODE rather than on the test, and it is the
// one that decides whether any of this is checkable. The repository already
// works this way everywhere it matters: readBrief takes `today`, factAge takes
// dates, evidenceOf is pure. The rule generalises: THE LIVE LAYER IS A PURE
// FUNCTION OF (data, now).
import { build } from "esbuild";
import { writeFileSync, mkdtempSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ── AND IT HAS TO WORK ON THE MACHINE HE PUSHES FROM ────────────────
//
// 25 Aug 2026. The pre-push hook failed on Oliver's Windows box:
//
//   ERR_UNSUPPORTED_ESM_URL_SCHEME: On Windows, absolute paths must be valid
//   file:// URLs. Received protocol 'c:'
//
// Two separate Windows faults in this file, both invisible on Linux, both mine
// from the day it was written.
//
// ONE: `new URL("..", import.meta.url).pathname` returns "/C:/Users/olive/..."
// on Windows — a leading slash in front of the drive letter — and `join` then
// builds a path that resolves to nothing. fileURLToPath is the function that
// exists for exactly this and it is right on both platforms.
//
// TWO: `import(absolutePath)` below. Node's ESM loader tolerates a POSIX
// absolute path because "/root/..." has no scheme; "C:\Users\..." parses as
// protocol "c:" and throws. pathToFileURL is the fix, and it is also correct on
// Linux, so there is one code path rather than a platform branch.
//
// The suite runs on Linux here and on Windows there. A test harness that only
// works where it was written is a harness that stops the person who actually
// ships from pushing.
const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");

// Globals a browser has and Node does not. Set before the module is imported,
// because a component that reads navigator at module scope reads it once.
//
// defineProperty rather than assignment, because NODE 22 SHIPS ITS OWN
// `globalThis.navigator` and it is a getter with no setter. A plain assignment
// throws in an ES module, which is the honest failure and is how this was
// found; under a non-strict loader it would have silently done nothing and
// every language test would have quietly rendered English, which is the same
// bug this instrument exists to catch, in the instrument.
const withGlobals = (globals, fn) => {
  const keys = Object.keys(globals || {});
  const saved = keys.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  keys.forEach(k => Object.defineProperty(globalThis, k, {
    value: globals[k], writable: true, configurable: true, enumerable: true,
  }));
  try { return fn(); }
  finally {
    saved.forEach(([k, d]) => {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    });
  }
};

// One bundle per component per test run. Cached by path so a suite asserting six
// languages against one surface pays for the bundle once.
const cache = new Map();

export const loadComponent = async (relPath, exportName) => {
  const key = `${relPath}#${exportName}`;
  if (cache.has(key)) return cache.get(key);
  // INSIDE THE REPOSITORY, not in /tmp. react and react-dom stay external so the
  // component and the renderer share one React instance, and Node resolves an
  // external by walking up from the importing file: from /tmp it never reaches
  // this project's node_modules and every render dies on "Cannot find package
  // 'react'". Bundling React in instead would resolve but give two copies of it,
  // and two Reacts throw "invalid hook call" and read as a bug in the component.
  mkdirSync(join(ROOT, "node_modules/.gx-render"), { recursive: true });
  const dir = mkdtempSync(join(ROOT, "node_modules/.gx-render", "r-"));
  const entry = join(dir, "entry.jsx");
  const out = join(dir, "bundle.mjs");
  writeFileSync(entry, `export { ${exportName} } from ${JSON.stringify(join(ROOT, relPath))};\n`);
  await build({
    entryPoints: [entry], bundle: true, format: "esm", outfile: out,
    platform: "node", jsx: "automatic", logLevel: "silent",
    // react and react-dom stay external so the renderer and the component share
    // one React instance. Two copies throw "invalid hook call" and it looks like
    // a bug in the component.
    external: ["react", "react-dom", "react/jsx-runtime"],
    absWorkingDir: ROOT,
  });
  // pathToFileURL, not the bare path: see the note at ROOT above.
  const mod = await import(pathToFileURL(out).href);
  const comp = mod[exportName];
  cache.set(key, comp);
  return comp;
};

// ── THE CALL ────────────────────────────────────────────────────────
//
// Returns the markup and the text. Assertions should almost always read `text`:
// asserting on markup is asserting on a class name, which is the shape-pinning
// this repository keeps having to retire.
export const renderSurface = async (relPath, exportName, props = {}, { globals = {} } = {}) => {
  const [{ createElement }, { renderToStaticMarkup }] = await Promise.all([
    import("react"), import("react-dom/server"),
  ]);
  const Comp = await loadComponent(relPath, exportName);
  if (typeof Comp !== "function") throw new Error(`${exportName} is not a component in ${relPath}`);
  const html = withGlobals(globals, () => renderToStaticMarkup(createElement(Comp, props)));
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
  return { html, text, says: (s) => text.includes(String(s)) };
};

// A browser whose language is `tag`, and nothing else. Deliberately minimal: a
// fuller fake would let a component depend on something this cannot reproduce.
export const browserIn = (tag) => ({ navigator: { language: tag, languages: [tag] } });
