// ── "IS STILL SAYS THIS!!!!!!!" ─────────────────────────────────────
//
// Oliver, 9 Aug 2026, pasting the gemlyx_research setup SQL back at me for the
// second time, having already run it and watched Supabase confirm the table.
//
// He was right both times, and the table was never the problem. What the Studio
// panel was reading was a 401, and the line in front of it did this:
//
//   status: memRes.status === 401 || memRes.status === 404 ? "missing" : "error"
//
// A 401 is an authentication failure. Mapping it to "missing" tells a founder
// who has just run the SQL to run the SQL again.
//
// ── THIS IS THE FOURTH TIME ─────────────────────────────────────────
//   PASS 57       gemlyx_content, a missing token read as a permission error.
//                 studioAuth() was added so it could not happen again.
//   8 Aug         gemlyx_facts. "The table is not readable yet... it worked
//                 before... so this must be a bug." It was. Three call sites had
//                 gone on interpolating the token by hand, TWELVE LINES BELOW
//                 the helper written to stop exactly that.
//   8 Aug         gemlyx_sources, same shape, caught while building it.
//   9 Aug         gemlyx_research, both call sites. Mine: I wrote the comment
//                 saying "writing the helper is not the same as using it", fixed
//                 three call sites, and left twelve others alone.
//
// A helper nobody is obliged to call is a suggestion. So there are now two
// obligations instead, and both are checked by the suite rather than by me
// remembering:
//
//   1. src/App.jsx contains ZERO occurrences of `Bearer ${studioSession`.
//      Every Studio request goes through studioAuth(), which THROWS on a missing
//      token rather than sending the literal string "Bearer undefined".
//   2. Every panel that reports a failure classifies it HERE, so no call site
//      gets to invent its own opinion about what a 401 means.
//
// ── WHAT POSTGREST ACTUALLY SENDS ───────────────────────────────────
// Observed against the live database, not guessed:
//   Bearer undefined   401 PGRST301  "Expected 3 parts in JWT; got 1"
//   no such table      404 PGRST205  "Could not find the table ... in the schema cache"
//   RLS refusing       403           on a write with no matching policy
// The first is a login. Only the second means the relation is not there, and
// only the second may print a create-table script at anybody.

export const EXPIRED = "expired";
export const MISSING = "missing";
export const OTHER = "error";

export const supabaseFailure = (status, body) => {
  const code = body && typeof body === "object" ? String(body.code || "") : "";
  const message = String((body && typeof body === "object" && body.message) || "");
  if (status === 401 || status === 403 || /^PGRST30[12]$/.test(code)) return EXPIRED;
  if (status === 404 || code === "PGRST205" || /does not exist/i.test(message)) return MISSING;
  return OTHER;
};

// The message a panel shows. `what` names the thing in the sentence, so the
// three panels read differently without three copies of the classification.
// `sql` is what the caller shows when, and only when, the table is genuinely
// absent: MISSING is returned as a bare marker so the caller can render a code
// block rather than a paragraph.
export const studioErrorMessage = (what, status, body) => {
  const kind = supabaseFailure(status, body);
  if (kind === EXPIRED) return `Your Studio login has expired. Log out and back in. (Nothing is wrong with ${what}.)`;
  if (kind === MISSING) return "MISSING_TABLE";
  const code = body && typeof body === "object" ? String(body.code || "") : "";
  const message = String((body && typeof body === "object" && body.message) || "");
  return `Could not read ${what} (${status}${code ? ` ${code}` : ""}). ${message.slice(0, 160)}`.trim();
};
