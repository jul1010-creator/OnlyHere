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
  const REGEX_CAN_START = /[(,=:[!&|?{};+\-*%^~<>]/;
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
export const functionBody = (stripped, declaration) => {
  const at = stripped.indexOf(declaration);
  if (at < 0) return null;
  let depth = 0, started = false;
  for (let i = at; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === "{") { depth++; started = true; }
    else if (ch === "}") { depth--; if (started && depth === 0) return stripped.slice(at, i + 1); }
  }
  return null;
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
