// ── THE TEMPORAL DEAD ZONE SCANNER ─────────────────────────────────
// Two crashes in this project, three days apart, both this exact shape:
//   • the front page, dead on every render, because a useEffect dependency
//     array named a const declared 600 lines further down
//   • the guide build, dead on every run, because a pipeline reorder left
//     enrichGuideDays(parsed.days, travelMode, mixedModes) sitting above the
//     two consts it reads
// Both threw "Cannot access X before initialization", which is a ReferenceError
// and not an undefined, so it takes the whole call down. Neither was catchable
// by eye in a 774 KB file and neither surfaced until a person hit it.
//
// STRINGS AND COMMENTS MUST BE STRIPPED OR THIS IS USELESS. A first attempt
// flagged "real", "day", "original", "broken" and "issues" — every one of them a
// plain English word inside a prompt. But the prompts are template literals full
// of ${...} interpolations, and those ARE code, so the stripper cannot simply
// drop everything between backticks. Hence the character walk: it tracks which
// of code / line comment / block comment / regex / '…' / "…" / `…` it is in, and
// re-enters code mode inside ${ } at the right brace depth.
//
// AND IT HAS TO BE LINEAR. The first working version asked "what was the last
// significant character?" by re-scanning everything emitted so far, once per
// forward slash. On a file this size that is O(n²) and it ran for over two
// minutes before being killed. The answer is tracked in one variable instead.

// ── ONE WALK, TWO QUESTIONS ────────────────────────────────────────
//
// `keepStrings` is the whole difference between the two exports below, and it
// exists because 23 Aug 2026 turned up a hole neither answer covers alone.
//
// stripNonCode blanks string CONTENTS, which is right for "is this code still
// here" and silently wrong for "is this sentence still here". A negative like
//   !/Most tourists see Denmark for/.test(stripNonCode(app))
// can never fail: the sentence lives inside a string, so the scan is reading a
// row of spaces where the copy is. The test was green with the copy on the page.
//
// Scanning the RAW file instead is the trap these assertions were moved off in
// the first place: the comment above a fix quotes the line it removed, so the
// scan finds the bug report and calls it the bug. Three assertions failed that
// way on the day they were written.
//
// So the answer is neither. Blank the comments, keep the strings, and both
// failure modes go away at once: a comment quoting the old copy is invisible, a
// string carrying it is not. Mode tracking is identical either way, because the
// walk still has to know it is inside a string to know a // in there is not a
// comment. Only what gets written out changes.
const scan = (src, keepStrings) => {
  const n = src.length;
  const out = [];
  // Brace depth of each ${ } we are inside, so a } closing an object literal in
  // an interpolation does not end the interpolation early. -1 = not in one.
  const tmpl = [];
  let mode = "code", inClass = false, lastSig = "", i = 0;
  // THE LAST 16 CHARACTERS EMITTED, CARRIED FORWARD RATHER THAN RECOMPUTED.
  // The keyword test below needs a few characters of context, and the obvious
  // way to get them — out.join("").slice(-16) — is the same O(n^2) mistake the
  // header of this file describes, one apostrophe at a time. Measured on the
  // real App.jsx: 1,984 apostrophes over 1.5 MB, 1,210 ms with the join and
  // 272 ms without it, for byte-identical output. Every write to `out` goes
  // through push() so the tail cannot silently fall out of step with it.
  let tail = "";
  const push = (ch) => { out.push(ch); tail = tail.length < 16 ? tail + ch : tail.slice(-15) + ch; };
  const keep = (ch) => { push(ch); if (!/\s/.test(ch)) lastSig = ch; };
  const blank = (ch) => { push(ch === "\n" ? "\n" : " "); };
  // Everything that is not a comment: blanked in stripNonCode, written out as it
  // stands in stripComments. Comments call blank directly and are never kept.
  const hide = (ch) => { if (keepStrings) push(ch); else blank(ch); };
  // A / that follows an operator or an opener cannot be division, so it opens a
  // regex literal — whose insides are full of quotes and backticks and have to
  // be opaque. This is the standard heuristic and it is good enough here; the
  // test below validates the result against the real file rather than trusting it.
  // < AND > ARE DELIBERATELY NOT IN THIS SET, and leaving them in was silently
  // destroying the scan. In JSX every closing tag is `</div>`, where the slash
  // follows a `<` — so the walk entered regex mode and blanked everything to the
  // next slash or newline, braces included. GemlyxApp's braces then never
  // balanced and the largest function in the file could not be extracted at all.
  // Nothing real is lost: `a < /re/.test(b)` is not code anybody writes.
  const REGEX_CAN_START = /[(,=:[!&|?{};+\-*%^~]/;
  // The keywords a quote may legitimately follow, so `return 'x'` still opens a
  // string while `you're` does not.
  const SQ_AFTER_WORD = /\b(?:return|typeof|case|in|of|do|else|yield|await|delete|void|throw|new|instanceof)\s+$/;
  // `=>` is an opener too, and `>` cannot go in REGEX_CAN_START because of JSX.
  // There is no `=> '...'` in the codebase today, which is exactly why it needs
  // pinning: the first one written would otherwise leak a whole string literal
  // into what stripNonCode calls code.
  const ARROW_BEFORE = /=>\s*$/;
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (mode === "code") {
      // An escape in code position is almost always inside a regex the heuristic
      // missed. Skipping the pair stops the \` in /^\`\`\`json/ from opening
      // template mode, which is exactly what broke the first version.
      if (c === "\\") { hide(c); i++; if (i < n) { hide(src[i]); i++; } continue; }
      if (c === "/" && c2 === "/") { mode = "line"; blank(c); i++; blank(c2); i++; continue; }
      if (c === "/" && c2 === "*") { mode = "block"; blank(c); i++; blank(c2); i++; continue; }
      if (c === "/" && (lastSig === "" || REGEX_CAN_START.test(lastSig))) { mode = "regex"; hide(c); i++; continue; }
      // ── AN APOSTROPHE IN JSX TEXT IS NOT A STRING ────────────────
      //
      // 26 Aug 2026. Writing "whenever you're ready" into a JSX text node turned
      // two unrelated assertions red at once, in sections nothing had touched.
      // The lone apostrophe looked like the start of a string literal, so
      // everything up to the NEXT apostrophe was blanked — and in a 1.5MB file
      // that is an enormous region the source checks then silently could not see.
      //
      // THE DANGEROUS HALF IS NOT THE FAILURE. A blanked region makes a
      // `!test(...)` assertion PASS, so one contraction can quietly switch off
      // every negative source check below it while the suite reads green. There
      // are 27 of them already in App.jsx — "Can't miss out", "Who's traveling",
      // "You're on the list" — so this has been true for a long time.
      //
      // Same heuristic the regex branch above already uses: a real string opener
      // follows an operator, an opener, or nothing. `you're` follows a LETTER.
      // The keyword list is what saves `return 'x'` and `typeof 'y'`, which are
      // the cases where a letter legitimately precedes a quote.
      if (c === "'" && (lastSig === "" || REGEX_CAN_START.test(lastSig) || ARROW_BEFORE.test(tail) || SQ_AFTER_WORD.test(tail))) {
        mode = "sq"; hide(c); i++; continue;
      }
      if (c === "'") { keep(c); i++; continue; }
      if (c === '"') { mode = "dq"; hide(c); i++; continue; }
      if (c === "`") { mode = "tmpl"; tmpl.push(-1); hide(c); i++; continue; }
      if (c === "}" && tmpl.length && tmpl[tmpl.length - 1] === 0) {
        tmpl[tmpl.length - 1] = -1; mode = "tmpl"; hide(c); i++; continue;
      }
      if (tmpl.length && tmpl[tmpl.length - 1] >= 0) {
        if (c === "{") tmpl[tmpl.length - 1]++;
        else if (c === "}") tmpl[tmpl.length - 1]--;
      }
      keep(c); i++; continue;
    }
    if (mode === "line") { if (c === "\n") mode = "code"; blank(c); i++; continue; }
    if (mode === "block") {
      if (c === "*" && c2 === "/") { mode = "code"; blank(c); i++; blank(c2); i++; continue; }
      blank(c); i++; continue;
    }
    if (mode === "regex") {
      if (c === "\\") { hide(c); i++; if (i < n) { hide(src[i]); i++; } continue; }
      if (c === "[") { inClass = true; hide(c); i++; continue; }
      if (c === "]") { inClass = false; hide(c); i++; continue; }
      // A newline means it was division after all. Bail out rather than
      // swallowing the rest of the file.
      if (c === "\n") { mode = "code"; inClass = false; hide(c); i++; continue; }
      if (c === "/" && !inClass) { mode = "code"; lastSig = "/"; hide(c); i++; continue; }
      hide(c); i++; continue;
    }
    if (mode === "sq" || mode === "dq") {
      if (c === "\\") { hide(c); i++; if (i < n) { hide(src[i]); i++; } continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) { mode = "code"; lastSig = '"'; }
      hide(c); i++; continue;
    }
    // inside a template literal
    if (c === "\\") { hide(c); i++; if (i < n) { hide(src[i]); i++; } continue; }
    if (c === "`") { tmpl.pop(); mode = "code"; lastSig = '"'; hide(c); i++; continue; }
    if (c === "$" && c2 === "{") { tmpl[tmpl.length - 1] = 0; mode = "code"; hide(c); i++; hide(c2); i++; continue; }
    hide(c); i++; continue;
  }
  return out.join("");
};

// Comments and strings both gone. The right scan for "is this CODE still here",
// and the wrong one for anything a reader sees.
export const stripNonCode = (src) => scan(src, false);

// Comments gone, strings intact. The right scan for "is this SENTENCE still
// here": a fix's own comment quoting the copy it deleted no longer counts as
// the copy, and copy hiding in a string literal still does.
export const stripComments = (src) => scan(src, true);

// The body of a named function, by brace matching on ALREADY-STRIPPED code so a
// brace inside a prompt cannot throw the count off.
//
// MATCHING STARTS AT THE BODY BRACE, NOT THE FIRST ONE. Counting from the
// declaration meant a destructured or defaulted parameter closed depth 0 inside
// the PARAMETER LIST, so the "body" was the parameter list and nothing else.
// Measured on the real file: fetchExactDurations came back as 67 characters,
// resolveLegMode as 98, sendAI as 42 — then all three fell under the size floor
// the sweep uses and were dropped with no signal. fetchExactDurations is the
// guide route pipeline, the same function family as the crash this scanner
// exists for.
export const functionBody = (stripped, declaration) => {
  const at = stripped.indexOf(declaration);
  if (at < 0) return null;
  // Walk past the parameter list first: balance the parentheses that follow the
  // name, then take the next { as the body.
  let i = stripped.indexOf("(", at);
  if (i < 0) return null;
  let paren = 0;
  for (; i < stripped.length; i++) {
    if (stripped[i] === "(") paren++;
    else if (stripped[i] === ")") { paren--; if (paren === 0) { i++; break; } }
  }
  const open = stripped.indexOf("{", i);
  if (open < 0) return null;
  // A concise arrow body (=> expr) has no brace of its own; the next { belongs to
  // something else entirely, so anything with a newline in between is not a body.
  if (/\n/.test(stripped.slice(i, open))) return null;
  let depth = 0;
  for (let j = open; j < stripped.length; j++) {
    const ch = stripped[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return stripped.slice(at, j + 1); }
  }
  return null;
};

// Every named function in a file, arrow or declaration, as [name, declaration].
//
// `function NAME(` HAD TO BE ADDED, and its absence made the sweep close to
// decorative: App.jsx contains exactly one function declaration, `function
// GemlyxApp(`, and it holds 761,607 of the file's 776,750 characters and all 26
// useEffect calls. Discovery only looked for `const X = (` arrows, so the
// component body — where the 6 August front-page crash actually lived, in a
// useEffect dependency array — was never scanned at all. Reproduced: injecting
// that exact bug back into GemlyxApp left the sweep reporting clean.
export const namedFunctions = (stripped) => {
  const out = [];
  const seen = new Set();
  const re = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?\(|function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(stripped))) {
    const name = m[1] || m[2];
    const decl = m[1] ? `${stripped.slice(m.index, m.index + 5).trimStart().startsWith("let") ? "let" : "const"} ${name} = ` : `function ${name}(`;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push([name, decl]);
  }
  return out;
};

// Every const/let in the body that is read at a character position before its
// own declaration. Reads the stripped source, so a name appearing in a prompt or
// a comment cannot produce a finding.
//
// NAMES THAT ARE ALSO PARAMETERS SOMEWHERE ARE SKIPPED, and that exclusion is
// the difference between a useful test and a noisy one. This does no scope
// analysis: it compares character positions in one function's text. So when the
// body contains `.map((d, i) => …)` at the top and `const i = …` inside a
// different nested scope 250 lines down, the parameter `i` looks like an early
// read of that const. It is not the same binding, and telling them apart needs a
// real parser. Skipping reused names loses nothing that matters here — the two
// TDZ bugs this exists for were `liveContentVersion` and `travelMode`, neither of
// which is anybody's loop counter.
export const useBeforeDeclare = (body) => {
  const src = String(body || "");
  const params = new Set();
  const addParams = (list) => String(list || "").split(",").forEach((p) => {
    const m = /([A-Za-z_$][\w$]*)/.exec(p.trim());
    if (m) params.add(m[1]);
  });
  for (const m of src.matchAll(/\(([^()]*)\)\s*=>/g)) addParams(m[1]);
  for (const m of src.matchAll(/(?:^|[\s;{(,=])([A-Za-z_$][\w$]*)\s*=>/gm)) params.add(m[1]);
  for (const m of src.matchAll(/function\s*[\w$]*\s*\(([^()]*)\)/g)) addParams(m[1]);

  const decl = new Map();
  for (const m of src.matchAll(/(?:^|[\s;{}(])(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    if (!decl.has(m[1])) decl.set(m[1], m.index);
  }
  const found = [];
  for (const [name, at] of decl) {
    if (params.has(name)) continue;
    // A NAME IMMEDIATELY FOLLOWED BY A COLON IS A PROPERTY KEY, NOT A READ.
    // Every false positive left after the parameter rule was this, and all five
    // were the same shape: `setPhotoFixState({ running: true, fixed: 0,
    // skipped: 0 })` looks like an early read of the `const skipped` declared
    // twenty lines below it. A key is not a read of anything.
    //
    // The colon must be ADJACENT. `cond ? a : b` writes a space before the
    // colon, so the consequent of a ternary is still checked; only `name:` is
    // treated as a key. Shorthand `{ skipped }` has no colon at all and stays
    // checked too, which is right, because that IS a read.
    const use = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$:])`, "g");
    let m;
    while ((m = use.exec(body))) {
      if (m.index >= at) break;
      found.push({
        name,
        useLine: body.slice(0, m.index).split("\n").length,
        declLine: body.slice(0, at).split("\n").length,
      });
      break;
    }
  }
  return found;
};

// ── HOOK DEPENDENCY ARRAYS, WHICH ARE THE COMPONENT'S REAL RISK ─────
// The general use-before-declare sweep above is right for a plain function like
// generateGuide, where the body IS the scope. It is the wrong instrument for a
// React component: GemlyxApp's body is 558 KB of nested closures, and a callback
// defined on line 2333 that reads a const declared on line 2401 is completely
// normal and completely safe, because it runs after both exist. Comparing
// character positions there produces nine findings and zero bugs, and a check
// nobody believes is worse than no check.
//
// A DEPENDENCY ARRAY IS DIFFERENT. It is evaluated during render, synchronously,
// at that point in the body's own scope. That is precisely the 6 August crash:
//
//   useEffect(() => { ... }, [liveContentVersion, entered]);   // line ~600
//   ...
//   const entered = ...;                                       // line ~1200
//
// which threw on every single render and killed the front page. Nothing nested
// can produce a false positive here, so this check is exact.
const HOOK = /\b(useEffect|useLayoutEffect|useMemo|useCallback)\s*\(/g;

export const hookDepsBeforeDeclaration = (body) => {
  const src = String(body || "");
  const decl = new Map();
  for (const m of src.matchAll(/(?:^|[\s;{}(])(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    if (!decl.has(m[1])) decl.set(m[1], m.index);
  }
  const found = [];
  let h;
  HOOK.lastIndex = 0;
  while ((h = HOOK.exec(src))) {
    // Balance to the call's own closing paren, then take the last [...] before
    // it — which is the dependency array, if the call has one.
    let i = h.index + h[0].length - 1, paren = 0, end = -1;
    for (; i < src.length; i++) {
      if (src[i] === "(") paren++;
      else if (src[i] === ")") { paren--; if (paren === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const close = src.lastIndexOf("]", end);
    const open = close > 0 ? src.lastIndexOf("[", close) : -1;
    if (open < 0 || open < h.index) continue;
    for (const d of src.slice(open + 1, close).matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)(?![\w$:])/g)) {
      const at = decl.get(d[1]);
      if (typeof at === "number" && at > h.index) {
        found.push({
          name: d[1],
          hook: h[1],
          useLine: src.slice(0, h.index).split("\n").length,
          declLine: src.slice(0, at).split("\n").length,
        });
      }
    }
  }
  return found;
};

// ── AND THE OTHER HALF: DECLARED FIRST, BUT OUT OF SCOPE ────────────
//
// Oliver's run log, 12 Aug 2026:
//
//   7. Nearest arrival point [google · FAILED · discarded]
//      why: draftTown is not defined
//
// A ReferenceError on every festival draft. `const draftTown` was declared
// inside a BARE BLOCK about a hundred and forty lines long, and a geocode
// fallback added later read it two hundred lines past the closing brace.
// useBeforeDeclare could never catch it: the declaration comes FIRST, which is
// all that function looks at. The failure is SCOPE, not ORDER.
//
// ── AND IT ONLY LOOKS AT BARE BLOCKS, WHICH IS THE POINT ────────────
// The first version tracked brace depth across the whole component and
// produced several hundred false positives in one run: JSX, object literals,
// arrow bodies and destructuring all open braces, and a line-based depth count
// cannot tell them apart. A checker that noisy gets switched off, which is this
// codebase's own stated reason for keeping every scanner narrow.
//
// So it looks for one shape and one shape only: a line that is nothing but `{`,
// which is a deliberate scoping block somebody wrote on purpose. That is the
// shape that caused this, it is rare, and inside it the brace counting has a
// known starting point rather than an inherited one.
export const readOutOfScope = (body) => {
  const lines = stripNonCode(String(body || "")).split("\n");
  const found = [];
  for (let open = 0; open < lines.length; open++) {
    if (!/^\s*\{\s*$/.test(lines[open])) continue;
    // Walk to the matching brace, counting from a known depth of one.
    let depth = 1, close = -1;
    for (let i = open + 1; i < lines.length && depth > 0; i++) {
      for (const ch of lines[i]) { if (ch === "{") depth++; else if (ch === "}") depth--; }
      if (depth === 0) close = i;
    }
    if (close === -1) continue;                     // unbalanced: say nothing
    const names = new Set();
    for (let i = open + 1; i < close; i++) {
      for (const m of lines[i].matchAll(/(?:^|[\s;{}(,])(?:const|let)\s+([A-Za-z_$][\w$]*)\s*[=;]/g)) names.add(m[1]);
    }
    for (const name of names) {
      // Declared again anywhere outside is shadowing, which this does not model.
      // ── AND A PARAMETER IS A DECLARATION ──────────────────────────
      // It counted `const`, `let`, `var` and `function` and not the commonest
      // binding in this file. `[...].map(f => (` binds f, and a `const f` in
      // some unrelated onChange handler four thousand lines earlier then made
      // every line of that map body read as an out-of-scope use of it.
      //
      // Reported as "GemlyxApp(): reads f on line 8895, but its block closed on
      // line 6804", against code that is completely correct, and it fired on a
      // change that did not touch either place. A scanner that cries wolf on
      // correct code is worse than no scanner, because the next real finding is
      // the one somebody waves through.
      //
      // Every binding form is one clause, and each one is a real way to
      // introduce a name that this line-based walk cannot see the scope of.
      const bindsOutside = (l) =>
        new RegExp(`(?:const|let|var|function)\\s+${name}\\b`).test(l)
        || new RegExp(`(?:\\(([^()]*\\W)?${name}(\\W[^()]*)?\\)|(?:^|[^\\w$.])${name})\\s*=>`).test(l)
        || new RegExp(`function\\s*[\\w$]*\\s*\\([^()]*\\b${name}\\b[^()]*\\)`).test(l)
        || new RegExp(`catch\\s*\\(\\s*${name}\\s*\\)`).test(l)
        || new RegExp(`for\\s*\\(\\s*(?:const|let|var)\\s+${name}\\b`).test(l);
      const outside = lines.filter((l, i) => (i < open || i > close) && bindsOutside(l)).length;
      if (outside) continue;
      const word = new RegExp(`(?:^|[^\\w$.])${name}(?![\\w$:])`);
      for (let i = close + 1; i < lines.length; i++) {
        if (!word.test(lines[i])) continue;
        if (new RegExp(`\\(([^()]*\\W)?${name}(\\W[^()]*)?\\)\\s*=>`).test(lines[i])) continue;   // a parameter
        found.push({ name, blockOpensLine: open + 1, blockClosesLine: close + 1, readLine: i + 1 });
        break;
      }
    }
  }
  return found;
};
