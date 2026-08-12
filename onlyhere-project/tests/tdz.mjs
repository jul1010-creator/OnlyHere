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

export const stripNonCode = (src) => {
  const n = src.length;
  const out = [];
  // Brace depth of each ${ } we are inside, so a } closing an object literal in
  // an interpolation does not end the interpolation early. -1 = not in one.
  const tmpl = [];
  let mode = "code", inClass = false, lastSig = "", i = 0;
  const keep = (ch) => { out.push(ch); if (!/\s/.test(ch)) lastSig = ch; };
  const blank = (ch) => { out.push(ch === "\n" ? "\n" : " "); };
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
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (mode === "code") {
      // An escape in code position is almost always inside a regex the heuristic
      // missed. Skipping the pair stops the \` in /^\`\`\`json/ from opening
      // template mode, which is exactly what broke the first version.
      if (c === "\\") { blank(c); i++; if (i < n) { blank(src[i]); i++; } continue; }
      if (c === "/" && c2 === "/") { mode = "line"; blank(c); i++; blank(c2); i++; continue; }
      if (c === "/" && c2 === "*") { mode = "block"; blank(c); i++; blank(c2); i++; continue; }
      if (c === "/" && (lastSig === "" || REGEX_CAN_START.test(lastSig))) { mode = "regex"; blank(c); i++; continue; }
      if (c === "'") { mode = "sq"; blank(c); i++; continue; }
      if (c === '"') { mode = "dq"; blank(c); i++; continue; }
      if (c === "`") { mode = "tmpl"; tmpl.push(-1); blank(c); i++; continue; }
      if (c === "}" && tmpl.length && tmpl[tmpl.length - 1] === 0) {
        tmpl[tmpl.length - 1] = -1; mode = "tmpl"; blank(c); i++; continue;
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
      if (c === "\\") { blank(c); i++; if (i < n) { blank(src[i]); i++; } continue; }
      if (c === "[") { inClass = true; blank(c); i++; continue; }
      if (c === "]") { inClass = false; blank(c); i++; continue; }
      // A newline means it was division after all. Bail out rather than
      // swallowing the rest of the file.
      if (c === "\n") { mode = "code"; inClass = false; blank(c); i++; continue; }
      if (c === "/" && !inClass) { mode = "code"; lastSig = "/"; blank(c); i++; continue; }
      blank(c); i++; continue;
    }
    if (mode === "sq" || mode === "dq") {
      if (c === "\\") { blank(c); i++; if (i < n) { blank(src[i]); i++; } continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) { mode = "code"; lastSig = '"'; }
      blank(c); i++; continue;
    }
    // inside a template literal
    if (c === "\\") { blank(c); i++; if (i < n) { blank(src[i]); i++; } continue; }
    if (c === "`") { tmpl.pop(); mode = "code"; lastSig = '"'; blank(c); i++; continue; }
    if (c === "$" && c2 === "{") { tmpl[tmpl.length - 1] = 0; mode = "code"; blank(c); i++; blank(c2); i++; continue; }
    blank(c); i++; continue;
  }
  return out.join("");
};

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
      const outside = lines.filter((l, i) => (i < open || i > close) && new RegExp(`(?:const|let|var|function)\\s+${name}\\b`).test(l)).length;
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
