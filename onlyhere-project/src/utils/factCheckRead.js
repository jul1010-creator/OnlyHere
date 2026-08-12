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
export const MONTHS = {
  january: 1, februar: 2, february: 2, januar: 1, marts: 3, march: 3, april: 4, maj: 5, may: 5,
  juni: 6, june: 6, juli: 7, july: 7, august: 8, september: 9, oktober: 10, october: 10,
  november: 11, december: 12,
};
export const MONTH_RE = Object.keys(MONTHS).join("|");

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

// ── THE AUTOMATIC CHECKER HAD NONE OF THE GUARDS THE MANUAL ONE HAS ─
//
// Audit of 12 Aug 2026, after Oliver asked me to go through the Perplexity
// fact-checkers and see if they ruin anything. They do, and the shape of it is
// that every guard in this file and in FACT_CHECK_SCOPE_RULES was reachable
// from exactly one place: the manual "Fact-check this draft" button, where he
// reads the findings and decides. readFactCheck is called once in App.jsx, on
// that button. FACT_CHECK_SCOPE_RULES appears in one prompt, that button's.
//
// The INVENTED-CLAIM CHECK runs on every draft, unattended, and its findings go
// straight into a re-research and a full rewrite. It had none of them. So the
// Kalundborg near-miss this file's sibling comment describes, where a checker
// returned a real sailing time for a different route and would have reverted a
// corrected entry, was live in the one path with nobody reading it. A
// correction carries more authority than the original text, and that is most
// true when no human sees it.
//
// ── AND ITS PASS/FAIL WAS A PREFIX MATCH ON PROSE ───────────────────
// The old test was /^(everything|no issues|nothing|all claims)/i against the
// checker's free text. Measured against realistic replies:
//
//   "Everything traces back except the 400 kr price"  -> PASS. A real finding,
//                                                       silently discarded.
//   "All of the claims trace back to the research."   -> FLAGGED. A clean draft
//                                                       sent for rewrite.
//   "The draft is fully supported by the research."   -> FLAGGED. Same.
//
// A verdict is structure, not a turn of phrase, so it is now asked for as
// structure and read as structure. Anything unreadable is neither: it becomes
// "the check did not answer", which the pipeline already knows how to report
// and which does NOT trigger a rewrite.
export const INVENTED_CHECK_FORMAT = `ANSWER IN THIS EXACT SHAPE, because it is read by code and not by a person.
First line, exactly one of:
VERDICT: CLEAN
VERDICT: FLAGGED
Then, only if FLAGGED, one finding per line, each beginning with one of these two words:
CONTRADICTED: the research states something different from the draft. Quote what the research says.
UNVERIFIED: the research does not mention this either way. Say which part of the draft it is.
Nothing else. No preamble, no summary, no closing sentence.`;

// Returns { verdict, findings, why }. verdict is "clean", "flagged" or
// "unreadable", and the third is deliberately its own answer rather than being
// folded into either of the others: guessing "clean" hides real findings and
// guessing "flagged" rewrites correct drafts, and this file's whole job is to
// stop a non-answer carrying the authority of one.
export const readInventedCheck = (text) => {
  const t = String(text || "").trim();
  if (!t) return { verdict: "unreadable", findings: [], why: "no text came back" };
  const m = t.match(/^\s*\**\s*VERDICT:\s*(CLEAN|FLAGGED)\b/i);
  if (!m) {
    return {
      verdict: "unreadable",
      findings: [],
      why: "the checker did not answer in the shape it was asked for, so neither a pass nor a flag can be read out of it",
    };
  }
  if (m[1].toUpperCase() === "CLEAN") return { verdict: "clean", findings: [], why: "" };
  // Every finding goes through relabel, so a CONTRADICTED that admits its own
  // search came up empty is downgraded here exactly as it is on the manual
  // path. Same rule, same file, now on both.
  const findings = t.split("\n")
    .map(l => l.trim())
    .filter(l => /^\s*[-*]?\s*\**\s*(CONTRADICTED|UNVERIFIED)\b/i.test(l))
    .map(relabel);
  if (!findings.length) {
    return {
      verdict: "unreadable",
      findings: [],
      why: "it said FLAGGED and then listed no finding in the required form, so there is nothing a correction could act on",
    };
  }
  return { verdict: "flagged", findings, why: "" };
};

// ── THE CHECKER COULD NOT SEE THE RESEARCH IT WAS CHECKING ──────────
//
// The invented-claim check was handed rawResearch.slice(0, 3000). rawResearch
// is assembled as hint, frozen facts, hours, address, tickets, transport,
// Perplexity, and THEN context, and context is where the Tavily results, the
// founder sources and the scraped official-site text live. Measured on the
// Esbjerg run of 12 Aug: the transport block alone is about 1,900 characters
// once journeyBlock is in it, the Perplexity preamble is 785, and the run log
// records Perplexity's own answer at 1,475. The window closed before context
// began, so every fact drawn from the web was invisible and looked invented.
// Both of that day's drafts ended in "claims flagged" and both were rewritten.
//
// A cap is still needed, because rawResearch can run to tens of thousands of
// characters. What was missing is that a cap must never be able to hide the
// sources silently. So the head and the TAIL are both kept, and when anything
// is dropped the checker is told, in the text, that absence is not evidence.
export const RESEARCH_CHECK_CAP = 20000;

export const researchForCheck = (raw, cap = RESEARCH_CHECK_CAP) => {
  const t = String(raw || "");
  if (t.length <= cap) return { text: t, truncated: false, kept: t.length, total: t.length };
  const head = Math.floor(cap * 0.35);
  const tail = cap - head;
  const dropped = t.length - cap;
  return {
    total: t.length,
    kept: cap,
    truncated: true,
    text: `${t.slice(0, head)}\n\n[${dropped} characters of the middle of this research are not shown. A CLAIM YOU CANNOT FIND HERE MAY SIMPLY BE IN THE OMITTED PART: do not call anything invented on the strength of it being missing from this text alone.]\n\n${t.slice(-tail)}`,
  };
};
