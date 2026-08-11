// ── READING A FACT-CHECK THAT IS WRONG ABOUT BEING RIGHT ─────────────
//
// Oliver, 12 Aug 2026, with both screenshots side by side: "This is a massive
// problem.. individual perplexity searched this website up and didn't even look
// at the front-page?"
//
// THE CASE, because it should never be paraphrased away. The draft said
// Sydhavsøernes Frugtfestival runs 2026-09-19 to 2026-09-20. Perplexity came
// back with:
//
//   "CONTRADICTED: The 2026 dates in the draft are wrong. The festival's own
//    site currently shows 20-21 September 2025 on the program page... I did not
//    find any official 2026 dates published on the pages reached, so the
//    draft's 2026-09-19 to 2026-09-20 should not be treated as verified."
//
// The front page of frugtfestival.dk, at that moment, said:
//
//   "Vi ses den 19. - 20. september i Sakskøbing by på Lolland"
//   "...den 19. og 20. september 2026 ... (sidstnævnte kun lørdag den 19.
//    september 2026)"
//
// THE DRAFT WAS RIGHT. The date was on the operator's own front page, twice,
// with the year spelled out. The check reached a stale inner programme page and
// a VisitDenmark press release about an older edition, and reported the draft as
// CONTRADICTED. Acting on it would have deleted a correct, sourced date.
//
// ── WHY IT WENT PAST THE FRONT PAGE, WHICH IS THE PART I WROTE ──────
// Two rules in this codebase pushed it there, and both are correct about the
// case they were written for:
//
//   the scrape prompt says "prefer a TIMETABLE or booking page over a marketing
//   front page on the same site"          (written for ferry sailing times)
//   FACT_CHECK_SCOPE_RULES says "check that you went past the front page to the
//   place that would actually carry it"   (written for a ticket price that lived
//                                          on a ticketing subdomain)
//
// For a price or a departure time those are right: the front page genuinely does
// not carry them. For WHEN A FESTIVAL IS, the front page is not a marketing
// page, it is the announcement. It is the one thing the operator updates first
// and the one page a stale inner page is most likely to contradict.
//
// ── AND IT BROKE ITS OWN LABELLING RULE ─────────────────────────────
// FACT_CHECK_SCOPE_RULES already defines the two words, in capitals:
//
//   CONTRADICTED  you reached a page that states something different
//   UNVERIFIED    no page you actually reached states this either way
//
// and then, above them: "I COULD NOT FIND IT IS NOT IT IS WRONG, AND THE TWO
// MUST NEVER READ THE SAME."
//
// The finding above says CONTRADICTED and then, in its own sentence, "I did not
// find any official 2026 dates published on the pages reached". By the prompt's
// own definition that is UNVERIFIED. The rule was written, stated in capitals,
// and disobeyed.
//
// Which is the doctrine this codebase already has for exactly this, from the
// transport enforcement: a rule in a prompt is a REQUEST and a request has a
// failure rate. Anything the system can check must be checked in code. This file
// is that check, applied to the checker.

// ── WHAT "I DID NOT FIND IT" SOUNDS LIKE ────────────────────────────
// Deliberately a list of the phrases a checker uses to describe its own search
// coming up empty, not a general negativity detector. A CONTRADICTED finding is
// allowed to contain "not", "wrong" and "should not": those describe the DRAFT.
// These describe the SEARCH.
const NOT_FOUND = [
  /\bI did not find\b/i,
  /\bI could not find\b/i,
  /\bcould not be (?:verified|confirmed)\b/i,
  /\bnot confirmed by\b/i,
  /\bnone of (?:the|those) (?:opened |pages )?sources\b/i,
  /\bnone of (?:the|those) pages\b/i,
  /\bthe pages (?:reached|opened) do not\b/i,
  /\bno (?:page|source)s? (?:I |that I )?(?:reached|opened)\b/i,
  /\bdid not (?:publish|state|mention)\b/i,
  /\bnot (?:published|stated) on the pages (?:reached|opened)\b/i,
  /\bnot (?:fully )?supported by the pages (?:reached|opened)\b/i,
];

export const admitsNotFound = (text) => NOT_FOUND.some(re => re.test(String(text || "")));

// A real contradiction has to be able to say what the other page SAYS. Not
// proof, but the thing whose absence gives the game away: a finding that names
// no competing value is describing a gap, whatever word it starts with.
const STATES_A_RIVAL = /\b(?:states|shows|says|lists|gives|according to)\b/i;

export const CONTRADICTED = "CONTRADICTED";
export const UNVERIFIED = "UNVERIFIED";

// ── ONE FINDING, RE-READ AGAINST ITS OWN DEFINITION ─────────────────
// Returns the label the finding's own words support, plus why it was moved.
// Never moves UNVERIFIED up to CONTRADICTED: this file only ever makes a
// finding weaker, because the failure it exists to stop is a non-finding
// carrying the authority of a correction.
export const relabel = (line) => {
  const text = String(line || "");
  const stated = text.match(/^\s*[-*]?\s*\**\s*(CONTRADICTED|UNVERIFIED)\b/i);
  const label = stated ? stated[1].toUpperCase() : "";
  if (label !== CONTRADICTED) return { label: label || UNVERIFIED, moved: false, why: "", text };

  if (!admitsNotFound(text)) return { label: CONTRADICTED, moved: false, why: "", text };

  return {
    label: UNVERIFIED,
    moved: true,
    // Said in the checker's own terms, so it is arguable rather than magic.
    why: STATES_A_RIVAL.test(text)
      ? "Marked CONTRADICTED, but it also says its search came up empty. A page stating something different and a page that does not mention it are different findings, and only the first one is a contradiction. Downgraded, and worth reading in full."
      : "Marked CONTRADICTED while saying it did not find the fact and naming no page that states otherwise. That is the definition of UNVERIFIED, so it was downgraded. It is not evidence the draft is wrong.",
    text,
  };
};

// ── THE WHOLE REPORT ────────────────────────────────────────────────
// Split on the leading dash the prompt asks for, and tolerate a checker that
// used newlines instead. A block with no recognisable findings comes back
// whole and unlabelled rather than being chopped up on a guess.
export const readFactCheck = (raw) => {
  const body = String(raw || "").trim();
  if (!body) return { findings: [], moved: 0, contradicted: 0, unverified: 0, text: "" };
  const parts = body
    .split(/\n(?=\s*[-*]?\s*\**\s*(?:CONTRADICTED|UNVERIFIED)\b)/i)
    .map(s => s.trim())
    .filter(Boolean);
  const findings = parts.map(relabel);
  return {
    findings,
    moved: findings.filter(f => f.moved).length,
    contradicted: findings.filter(f => f.label === CONTRADICTED).length,
    unverified: findings.filter(f => f.label === UNVERIFIED).length,
    text: body,
  };
};

// One line above the report, and only when something actually moved. A banner
// that appears every time is a banner nobody reads.
export const describeFactCheck = (r) => {
  if (!r?.moved) return "";
  const n = r.moved;
  return `${n} finding${n === 1 ? "" : "s"} said CONTRADICTED and then admitted the search came up empty. ${n === 1 ? "It has" : "They have"} been re-read as UNVERIFIED. A check that did not find something is not evidence the draft is wrong, and this exact mistake nearly deleted a correct festival date that was sitting on the festival's own front page.`;
};

// ── THE PAGE NOBODY FETCHED ─────────────────────────────────────────
// Every URL the pipeline scrapes comes from a search result, so it is whatever
// page the engine happened to rank. For frugtfestival.dk that was a programme
// page carrying last year's dates. The ROOT of the same domain had the answer
// and was never requested, because nothing ever asks for a root.
//
// One extra fetch per draft, deterministic, no model, no search.
export const rootOf = (url) => {
  try {
    const u = new URL(String(url || ""));
    if (!/^https?:$/.test(u.protocol)) return "";
    return `${u.protocol}//${u.host}/`;
  } catch { return ""; }
};

// Add the root of every domain already being fetched, without duplicating one
// that is already a root, and without changing the order of what was there.
export const withRoots = (urls) => {
  const list = (Array.isArray(urls) ? urls : []).filter(u => typeof u === "string" && u.trim());
  const seen = new Set(list.map(u => u.replace(/\/+$/, "")));
  const out = [...list];
  list.forEach(u => {
    const r = rootOf(u);
    if (r && !seen.has(r.replace(/\/+$/, ""))) { seen.add(r.replace(/\/+$/, "")); out.push(r); }
  });
  return out;
};

// ── DID THE OPERATOR'S OWN PAGE ALREADY SAY IT ──────────────────────
// The direct answer to the Frugtfestival case. If the site's own text carries
// the draft's date WITH the year, a fact-checker's "I did not find it" is a
// report about its own search and nothing else, and the draft can say so.
//
// Danish and English month names, both orders, because "19. - 20. september"
// and "September 19-20" are the same announcement.
const MONTHS = {
  january: 1, februar: 2, february: 2, januar: 1, marts: 3, march: 3, april: 4, maj: 5, may: 5,
  juni: 6, june: 6, juli: 7, july: 7, august: 8, september: 9, oktober: 10, october: 10,
  november: 11, december: 12,
};
const MONTH_RE = Object.keys(MONTHS).join("|");

// Every (day, month, year) the text states, with the year taken from the
// nearest one that follows within the same sentence. A date with no year at all
// is NOT returned: an undated "19. september" cannot confirm a 2026 claim, and
// treating it as though it could is the same mistake in the other direction.
export const datesIn = (text) => {
  const t = String(text || "");
  const out = [];
  const re = new RegExp(`(\\d{1,2})\\s*\\.?\\s*(?:og|and|to|til|[-–])?\\s*(\\d{1,2})?\\s*\\.?\\s*(${MONTH_RE})\\b[^.\\n]{0,40}?((?:19|20)\\d{2})`, "gi");
  let m;
  while ((m = re.exec(t)) !== null) {
    const month = MONTHS[m[3].toLowerCase()];
    const year = Number(m[4]);
    [m[1], m[2]].filter(Boolean).forEach(d => {
      const day = Number(d);
      if (day >= 1 && day <= 31) out.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    });
  }
  return [...new Set(out)];
};

export const datesConfirmedBy = (siteText, dateStart, dateEnd) => {
  const want = [dateStart, dateEnd].map(d => String(d || "").slice(0, 10)).filter(Boolean);
  if (!want.length) return { confirmed: false, found: [], detail: "" };
  const found = datesIn(siteText);
  const hits = want.filter(d => found.includes(d));
  if (!hits.length) return { confirmed: false, found, detail: "" };
  return {
    confirmed: true,
    found: hits,
    detail: `The official site's own page states ${hits.join(" and ")}, with the year, so the date on this draft is confirmed by the operator. A fact-check that says it could not find these dates is describing its own search, not this entry.`,
  };
};
