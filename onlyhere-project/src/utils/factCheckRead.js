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
// A link, and a sentence lifted off the page. Straight quotes and the curly and
// angled pairs a Danish page will actually be typed with, because a confirmation
// refused over a quotation mark is a confirmation refused for nothing.
const HAS_URL = /https?:\/\/[^\s)>\]]+/i;
const HAS_QUOTE = /["\u201C\u201D\u00AB\u00BB\u2018\u2019][^"\u201C\u201D\u00AB\u00BB\u2018\u2019]{12,}["\u201C\u201D\u00AB\u00BB\u2018\u2019]/;

export const CONTRADICTED = "CONTRADICTED";
export const UNVERIFIED = "UNVERIFIED";
// ── AND THE ONE THAT DID NOT EXIST ──────────────────────────────────
//
// Oliver, 5 Sep 2026, pasting a checker's own words back at me. It had found
// that an uncertainty on the Jelling festival draft was WRONG: physical ticket
// sales at Byens Hus on 1 October were confirmed on the operator's own Billet-
// info page, quoted in Danish, with the URL.
//
// He asked what happens to it. The answer was that nothing happens to it, and
// worse: with only two labels in this file, `label || UNVERIFIED` filed his
// confirmation as UNVERIFIED, which is the precise opposite of what it said. A
// page had settled the question and the draft went on telling a reader it was
// open.
//
// This label is what a settled question is filed as. What it is allowed to DO,
// which is remove the caveat it settles, lives in utils/uncertaintyResolve.js,
// because the two are separate decisions and only one of them is about parsing.
export const CONFIRMED = "CONFIRMED";

// ── ONE FINDING, RE-READ AGAINST ITS OWN DEFINITION ─────────────────
// Returns the label the finding's own words support, plus why it was moved.
// Never moves UNVERIFIED up to CONTRADICTED: this file only ever makes a
// finding weaker, because the failure it exists to stop is a non-finding
// carrying the authority of a correction.
export const relabel = (line) => {
  const text = String(line || "");
  const stated = text.match(/^\s*[-*]?\s*\**\s*(CONTRADICTED|UNVERIFIED|CONFIRMED)\b/i);
  const label = stated ? stated[1].toUpperCase() : "";
  // ── A CONFIRMATION HAS TO CARRY ITS PAGE ──────────────────────────
  //
  // The rule this whole file is built on is that it only ever makes a finding
  // WEAKER, because the failure it exists to stop is a non-finding carrying the
  // authority of a correction. CONFIRMED is the strongest thing a checker can
  // say, so it gets the same treatment pointing the other way: a confirmation
  // with no page behind it is a model's opinion about another model's opinion,
  // and it is read as UNVERIFIED.
  //
  // A URL is not enough on its own. The page has to be QUOTED, because a
  // checker that cannot produce the sentence has not settled anything, it has
  // only asserted that it looked. See utils/uncertaintyResolve.js, where the
  // same test decides whether a caveat may be removed.
  if (label === CONFIRMED) {
    if (HAS_URL.test(text) && HAS_QUOTE.test(text)) return { label: CONFIRMED, moved: false, why: "", text };
    return {
      label: UNVERIFIED,
      moved: true,
      why: HAS_URL.test(text)
        ? "Marked CONFIRMED with a link and no quotation from the page. A confirmation has to carry the sentence it is standing on, or nothing about it can be checked, so it was read as UNVERIFIED."
        : "Marked CONFIRMED with no page behind it. A confirmation with no source is an opinion, so it was read as UNVERIFIED.",
      text,
    };
  }
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
  if (!body) return { findings: [], moved: 0, contradicted: 0, unverified: 0, confirmed: 0, text: "" };
  const parts = body
    .split(/\n(?=\s*[-*]?\s*\**\s*(?:CONTRADICTED|UNVERIFIED|CONFIRMED)\b)/i)
    .map(s => s.trim())
    .filter(Boolean);
  const findings = parts.map(relabel);
  return {
    findings,
    moved: findings.filter(f => f.moved).length,
    contradicted: findings.filter(f => f.label === CONTRADICTED).length,
    unverified: findings.filter(f => f.label === UNVERIFIED).length,
    confirmed: findings.filter(f => f.label === CONFIRMED).length,
    text: body,
  };
};

// One line above the report, and only when something actually moved. A banner
// that appears every time is a banner nobody reads.
export const describeFactCheck = (r) => {
  if (!r?.moved) return "";
  // Two different downgrades share this counter now, so the banner says which
  // one happened rather than describing the older one at both.
  const soft = (r.findings || []).filter(f => f.moved && /Marked CONFIRMED/.test(f.why || ""));
  if (soft.length && soft.length === r.moved) {
    const c = soft.length;
    return `${c} finding${c === 1 ? "" : "s"} said CONFIRMED without carrying the page ${c === 1 ? "it was" : "they were"} standing on. A confirmation has to quote the sentence that settles the question, or nothing about it can be checked, so ${c === 1 ? "it was" : "they were"} read as UNVERIFIED.`;
  }
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

// ── HALF A RANGE IS NOT A CONFIRMED RANGE ───────────────────────────
//
// Oliver, 26 Aug 2026: "But isn't Gemini correct about Roskilde 2027?"
//
// He was right and I was wrong, and the evidence is in this function. The
// festival's own site says 26 June – 3 July 2027. The Roskilde run logged
// "confirmed on the site itself: 2027-07-03" — ONE date, the end of the range —
// and then the decision block used it to overrule the invented-claim check:
// "A date the operator publishes with the year on its own page settles the
// question. Nothing that merely fails to find it can overturn it."
//
// `hits` was one of two. The draft's END date was on the site and its START
// date was not, which is precisely what the checker was complaining about, and
// this function answered a half-match with an unqualified `confirmed: true`.
//
// WORSE, IT ARMED THE OVERRULING ITSELF. The old detail ended: "A fact-check
// that says it could not find these dates is describing its own search, not
// this entry." That sentence is correct when every date matched and is a licence
// to ignore a true finding when they did not. It only ships on a full match now.
//
// So `confirmed` means every date this draft carries was found on the operator's
// page. A partial match gets its own state and names what is missing, because
// "one of your two dates is not on their site" is a useful thing to be told and
// the opposite of a confirmation.
export const datesConfirmedBy = (siteText, dateStart, dateEnd) => {
  // Deduped: a one-day event stores the same date twice and that is one date,
  // not a range half-confirmed by itself.
  const want = [...new Set([dateStart, dateEnd].map(d => String(d || "").slice(0, 10)).filter(Boolean))];
  if (!want.length) return { confirmed: false, partial: false, found: [], missing: [], detail: "" };
  const found = datesIn(siteText);
  const hits = want.filter(d => found.includes(d));
  const missing = want.filter(d => !found.includes(d));
  if (!hits.length) return { confirmed: false, partial: false, found, missing, detail: "" };
  if (missing.length) {
    return {
      confirmed: false,
      partial: true,
      found: hits,
      missing,
      detail: `The official site's own page states ${hits.join(" and ")}, and states nothing matching ${missing.join(" and ")}. That is HALF this draft's range, so the operator has not confirmed it: the date they publish and the date this draft carries are not the same date. Check ${missing.join(" and ")} against the operator's own page by hand before publishing, and do not read a fact-check disputing it as a failed search.`,
    };
  }
  return {
    confirmed: true,
    partial: false,
    found: hits,
    missing: [],
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

// ── AND THEN NOBODY CHECKED THAT THE CORRECTION LANDED ───────────────
//
// Oliver's Gothersgade run log, 16 August 2026. Step 13, the invented-claim
// check: "3 claims flagged: 2 contradicted, 1 unverified". Steps 14 to 18 are
// the after-the-correction re-runs, and they re-check prices, the journey,
// glance fields and stated absences. Every gate in that log has an "after the
// correction" twin.
//
// EXCEPT THE ONE THAT FOUND SOMETHING. The invented-claim check has no twin. So
// the only stage that reported real problems is the only stage that never sees
// what replaced the draft, and the banner he was shown says, in its own words,
// that the claims were "re-researched with fresh web search, and fixed in the
// draft below (anything still unverifiable was removed rather than guessed)".
// That sentence is a claim about work nobody verified. This codebase's own fifth
// standing rule is that checking a draft does not check what replaced it.
//
// ── AND IT DOES NOT COST ANOTHER PERPLEXITY CALL ─────────────────────
// The tempting fix is to re-run the check, which is a second paid search on a
// 0 kr budget. It is also the wrong question. The check already told us WHICH
// claims are wrong; what nobody asked is whether they are still there, and that
// is a string comparison.
//
// THE ANCHOR HAS TO BE THE DRAFT'S OWN WORDS, not the finding's. The answer
// format asks the checker to "Quote what the research says", so a quote inside a
// finding is often the RESEARCH's phrasing, and its absence from the draft proves
// nothing at all. So an anchor counts only if it was in the draft BEFORE the
// correction: that is what makes it the draft's claim rather than the checker's
// commentary. Same shape as nameCore's guard, for the same reason.
const BARE_NUMBER = /^\d+$/;
const UNIT_AFTER = "(?:dkk|kr|kroner|eur|usd|%|min|mins|minutes|hours?|hrs?|km|m\\b|people|guests|seats|rooms|km/t)";

const FIGURES = /\d{2,}/g;
const QUOTED = /"([^"]{4,90})"|“([^”]{4,90})”/g;

const anchorsOf = (finding) => {
  const t = String(finding || "");
  const out = new Set();
  for (const m of t.match(FIGURES) || []) out.add(m);
  for (const m of t.matchAll(QUOTED)) {
    const q = (m[1] || m[2] || "").trim();
    if (q.length >= 4) out.add(q);
  }
  return [...out];
};

// ── AND "late" IS INSIDE "chocolate" ────────────────────────────────
//
// Two of Oliver's four bar-street runs on 1 Sep ended on the red banner, and
// both were false. Aarhus Riverfront: `1 still there ... "late"`. Latin Quarter:
// `1 still there ... "13"`. Neither claim was in the redrafted text.
//
// This was an unbounded substring test. "late" is inside later, plate, isolated,
// translate and chocolate; "13" is inside 1913, 130 kr and 13:00. A bar-street
// draft that contains none of those does not exist, so for any finding whose
// only anchor is one short token the answer was decided before the rewrite ran.
//
// ── AND THE FILE ALREADY KNEW THE RULE ──────────────────────────────
//
// anchorIsUseful admits a bare number only when the FINDING attaches a unit to
// it: "327 DKK" is a value, "1863" is a date. That is exactly right and it was
// only half applied — the number was admitted with its unit and then looked for
// without one. The test that admits an anchor and the test that decides it
// survived have to be the same test, or the second one is measuring something
// the first one never claimed.
//
// A PHRASE STILL MATCHES AS A SUBSTRING, deliberately. A quoted sentence is a
// fingerprint and a rewrite that keeps it keeps it whole; bounding it would
// only break on the trailing punctuation the checker happened to include.
const isOneToken = (a) => !/\s/.test(String(a || "").trim());
const escapeRx = (a) => String(a).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const hasAnchor = (text, anchor, finding = "") => {
  const hay = String(text || "");
  const a = String(anchor || "").trim();
  if (!a) return false;
  if (!isOneToken(a)) return hay.toLowerCase().includes(a.toLowerCase());
  // A bare number is only a claim WITH its unit, so it only survives with one.
  if (BARE_NUMBER.test(a)) {
    try { return new RegExp(`\\b${escapeRx(a)}\\s*${UNIT_AFTER}`, "i").test(hay); }
    catch { return false; }
  }
  // One word, on its own boundaries. \b is ASCII in JS, so a Danish name like
  // Kødbyen would get no boundary at the ø; the lookarounds below are the same
  // rule written in characters that do not stop at 127.
  try { return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRx(a)}(?:[^\\p{L}\\p{N}]|$)`, "iu").test(hay); }
  catch { return hay.toLowerCase().includes(a.toLowerCase()); }
};

// ── A BARE YEAR IS NOT AN ANCHOR ────────────────────────────────────
//
// Oliver, 17 Aug 2026, on two separate drafts in a row. A Café Broløs entry:
// "THE CORRECTION DID NOT LAND. 1 flagged claim is still in the draft, on the
// draft's own words: '2026'". A Glassalen entry, the same line with '1863'.
//
// Both were false. The finding was about a DATE, so its only anchor was the year,
// and the year legitimately appears in the entry after the correction: the reception
// really is in 2026 and the building really is from 1863. The claim was corrected
// and the anchor survived, because a four digit number is not a fingerprint for a
// sentence, it is a fingerprint for a number.
//
// Worse than useless: it puts "do not read the banner above as a pass" on a draft
// that passed, twice in one evening, which teaches him to stop reading the line.
//
// So a lone year no longer counts. A figure with a UNIT is still an anchor, because
// "125 DKK" or "90 minutes" surviving a correction genuinely means the value did.
// Where the year was the only anchor, the finding becomes uncheckable, which is
// already a state this file has, already reported honestly, and already says to
// read it by eye.
// ── AND THE RULE WAS RIGHT AND THE REGEX WAS TOO NARROW ─────────────
//
// Oliver, 26 Aug 2026, on the Roskilde Festival run: "roskilde festival was
// rejected by Google Gemini for 2027.. seriously?" — and then, correctly:
// "the draft rather rejected Gemini."
//
// Step 46 said THE CORRECTION DID NOT LAND, 0 gone, 4 still there, on the
// draft's own words: "26", "dateStart"; "26", "dateEnd"; "camping",
// "Included with a full festival ticket"; "accommodationTip".
//
// Every one of those four is a false alarm, and two separate holes made them.
//
// THE FIRST IS THIS FUNCTION, and the reasoning above it was already right:
// "a four digit number is not a fingerprint for a sentence, it is a fingerprint
// for a number." True of every number. The regex only covered FOUR-DIGIT years,
// and FIGURES is /\d{2,}/ — so "26", the day of the month in "26 June", was an
// anchor. "26" appears in almost any draft: inside 2026, inside 2,600 DKK,
// inside a house number. It can essentially never be reported gone.
//
// So the rule generalises to what it always meant: A BARE NUMBER IS NOT AN
// ANCHOR. A number with a unit still is, because "125 DKK" or "90 minutes"
// surviving a correction genuinely means the value did — and prices keep
// working, because the finding that carries "327" also carries "327 DKK".
//
// The cost of getting this wrong is stated in the comment above and it happened
// exactly as predicted: it "teaches him to stop reading the line", and on
// 26 August he read it, disbelieved it, and published — which was the right
// call about this draft and the wrong habit to have taught him.

// ── AND A FIELD NAME IS NOT THE DRAFT'S OWN WORDS ───────────────────
//
// THE SECOND HOLE, and it is why "dateStart" and "accommodationTip" were listed
// as claims that survived a rewrite. They are not claims. They are the names of
// the fields the claims are about, quoted by the checker when it says which
// field it is talking about.
//
// The survival test searches JSON.stringify(writtenFields(t)), which carries
// every one of its own keys. So a finding phrased as `the "dateStart" field
// says...` can NEVER come back gone, however perfectly the rewrite worked.
//
// Detected from the draft rather than from a hardcoded list, because a list of
// field names in this file would be a fifth place for the field set to drift:
// if the token appears in the BEFORE text as a JSON key, it is a key.
const KEY_IN = (text, a) => {
  try { return new RegExp(`"${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`).test(String(text || "")); }
  catch { return false; }
};

const anchorIsUseful = (anchor, finding, before) => {
  const a = String(anchor || "").trim();
  if (!a) return false;
  // A name the draft uses for one of its own fields is structure, not content.
  if (KEY_IN(before, a)) return false;
  if (!BARE_NUMBER.test(a)) return true;
  // A number attached to a unit or a currency in the finding is a value, not a
  // date and not a house number.
  return new RegExp(`${a}\\s*${UNIT_AFTER}`, "i").test(String(finding || ""));
};

// "gone", "survived" or "uncheckable", and the third is its own answer for the
// reason readInventedCheck keeps "unreadable" separate: a finding with no figure
// and no quote of the draft cannot be followed by code, and calling that fixed
// would be the exact false reassurance this replaces.
export const claimLanded = (finding, before, after) => {
  const anchors = anchorsOf(finding)
    .filter(a => anchorIsUseful(a, finding, before))
    .filter(a => hasAnchor(before, a));
  if (!anchors.length) return { finding, anchors: [], verdict: "uncheckable" };
  // ── AND THE STRONGEST ANCHOR DECIDES ──────────────────────────
  //
  // A quoted SENTENCE is a fingerprint of the claim. A single token is not: it
  // is one word or one number the claim happened to contain, and an entry is
  // free to use that word again about something else. So when a finding gives
  // both — `the draft says "the walk is 13 minutes", which the research does
  // not state` yields the sentence AND "13" — the sentence is the evidence and
  // the token is a coincidence waiting to happen. Any surviving anchor used to
  // count, so a rewrite that deleted the whole sentence still reported the
  // claim as standing because the row's opening hours said 13.
  const phrases = anchors.filter(a => !isOneToken(a));
  const decide = phrases.length ? phrases : anchors;
  const survived = decide.filter(a => hasAnchor(after, a));
  return { finding, anchors, survived, verdict: survived.length ? "survived" : "gone" };
};

// ── AND WHICH KIND OF FINDING SURVIVED ──────────────────────────────
//
// Oliver, 6 Sep 2026, on a live entry this told him to fix: "'Camping itself
// opens Thursday at 10:00' searched it up.. it's true though."
//
// He is right, and the run that flagged it says why in its own numbers: SEVEN
// CLAIMS FLAGGED, ONE CONTRADICTED AND SIX UNVERIFIED. This function was handed
// a flat list of strings — the caller did `findings.map(f => f.text)`, throwing
// the label away one line before it mattered — so the survivor came back with no
// kind attached, and describeCorrection called it "a claim the checker
// contradicted" on a six-in-seven chance that it was not.
//
// The distinction is the one this whole file exists to keep. CONTRADICTED means
// a page said otherwise. UNVERIFIED means the search did not find it, and
// journey.js already has the sentence for that: "A search that came back with no
// festivals is a fact about the search." Telling a founder to delete a true
// sentence because a search did not reach the page it lives on is the exact
// failure he warned about on 16 August, in his own words: "it was correcting
// stuff that didn't need correction, because it was already true."
//
// So the label travels. `findings` may be strings or the {label, text} objects
// readInventedCheck produces, because both callers exist and neither should have
// to know which this wants.
export const correctionLanded = (findings, before, after) => {
  const list = (Array.isArray(findings) ? findings : [])
    .map(f => (f && typeof f === "object" ? { label: String(f.label || ""), text: String(f.text || "") } : { label: "", text: String(f || "") }))
    .filter(f => f.text);
  const results = list.map(f => ({ ...claimLanded(f.text, before, after), label: f.label }));
  const survived = results.filter(r => r.verdict === "survived");
  return {
    results,
    gone: results.filter(r => r.verdict === "gone").length,
    survived,
    // Split, because the two need opposite advice and a count that merges them
    // can only give one.
    //
    // AN UNKNOWN LABEL COUNTS AS THE SERIOUS ONE. A caller that passes bare
    // strings, as one still does, tells us nothing about kind, and the safe
    // default is the loud message: silently softening a real contradiction into
    // "worth a look" because somebody forgot to pass a label is the direction
    // that gets a wrong fact published. Only an explicit UNVERIFIED is quieter.
    survivedContradicted: survived.filter(r => r.label !== UNVERIFIED),
    survivedUnverified: survived.filter(r => r.label === UNVERIFIED),
    uncheckable: results.filter(r => r.verdict === "uncheckable").length,
  };
};

// The founder line, and the point of it is that the banner above it stops being
// able to say "fixed" on its own authority.
export const MAX_LISTED_CLAIMS = 6;
export const describeCorrection = (r) => {
  const res = r || {};
  const survived = Array.isArray(res.survived) ? res.survived : [];
  if (!survived.length) {
    return res.uncheckable
      ? `${res.gone || 0} flagged claim${(res.gone || 0) === 1 ? "" : "s"} are gone from the draft. ${res.uncheckable} could not be checked in code, because ${res.uncheckable === 1 ? "the finding names" : "those findings name"} no figure and quote none of the draft's own words, so read ${res.uncheckable === 1 ? "it" : "them"} by eye rather than trusting this line.`
      : "";
  }
  // ── THE LIST IS BOUNDED SO THE SENTENCE CANNOT BE ───────────────
  //
  // 26 Aug 2026. The Roskilde run printed this message cut off mid-clause, at
  // "so the draft below", because the call site sliced it to 300 characters.
  // What the slice removed was "Fix by hand or redraft, and do not read the
  // banner above as a pass" — the only actionable half, and the entire reason
  // the message exists.
  //
  // A limit hit is not a limit reported, for the sixth time this month, and
  // this one truncates a warning into something that reads like a shrug. So the
  // GROWING part is bounded here, where the growth is, and the sentence around
  // it is always complete. The caller no longer needs a slice and no longer has one.
  const quote = (group) => {
    const shown = group.slice(0, MAX_LISTED_CLAIMS);
    const more = group.length - shown.length;
    return shown.map(s => s.survived.map(a => `"${String(a).slice(0, 40)}"`).join(", ")).join("; ")
      + (more > 0 ? `, and ${more} more` : "");
  };
  const hard = Array.isArray(res.survivedContradicted) ? res.survivedContradicted : survived;
  const soft = Array.isArray(res.survivedUnverified) ? res.survivedUnverified : [];

  // ── A CONTRADICTED CLAIM SURVIVING IS THE SERIOUS ONE ─────────────
  // A page said otherwise and the rewrite kept it anyway. That is the case this
  // message was written for and its wording is unchanged.
  const lines = [];
  if (hard.length) {
    lines.push(`THE CORRECTION DID NOT LAND. ${hard.length} flagged claim${hard.length === 1 ? " is" : "s are"} still in the draft after the rewrite, on the draft's own words: ${quote(hard)}. A page said otherwise and the rewrite was asked to remove or replace ${hard.length === 1 ? "it" : "them"} and did not. Fix by hand or redraft, and do not read the banner above as a pass.`);
  }
  // ── AND AN UNVERIFIED ONE SURVIVING IS OFTEN CORRECT ──────────────
  //
  // The writer kept something the search could not reach. Camping hours live on
  // a page a web search does not open, and Oliver found that one in a minute by
  // hand. Reported, because he should know which sentence to spot-check, and NOT
  // called a failure, because most of the time it is not one.
  if (soft.length) {
    lines.push(`${soft.length} claim${soft.length === 1 ? "" : "s"} the check could not VERIFY ${soft.length === 1 ? "is" : "are"} still in the draft: ${quote(soft)}. Unverified is a fact about the search, not about the claim: it means nothing it read said this, which is the ordinary outcome for a detail that lives on a page a search does not open. Worth a look before publishing, and not a reason to delete a sentence that may well be right.`);
  }
  return lines.join(" ");
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

// ── AND HEAD PLUS TAIL WAS STILL THE WRONG CUT ─────────────────────
//
// Head 35 percent and tail 65 percent punches a hole in the MIDDLE, and the
// middle is not where the weakest material is. rawResearch is assembled in a
// deliberate order: the measured and frozen facts first, then tickets and
// transport, then Perplexity, then the general search context last and
// largest. A hole in the middle therefore eats the END of the high-authority
// blocks and the START of the search results, which is precisely where a
// specific number tends to be stated once and never repeated.
//
// Computed from the code's own caps, a festival draft assembles 30,000 to
// 60,000 characters, so truncation is the NORMAL case rather than the edge
// one, and this cut was being made on nearly every draft.
//
// So it cuts by section instead, weakest first, and never touches a measured
// block at all. What is dropped is dropped WHOLE and NAMED, so the checker
// reads "the general search results were not included" rather than "some of
// the middle is missing" and can weigh a missing claim accordingly.
//
// The order below is the same authority order the assembly already uses. It is
// derived from the text's own headers rather than from a second list that
// could drift: a block is weak if it is the general search context, strong if
// it names a measurement we made ourselves.
const WEAKEST_FIRST = [
  // The general web results. Largest, most redundant, least authoritative.
  /^(?:SEARCH (?:RESULTS|CONTEXT)|WEB RESEARCH|FRESH RESEARCH|TAVILY)\b/i,
  // A second model's synthesis of the same web. Useful, not primary.
  /^PERPLEXITY FACT-CHECK\b/i,
  // Everything else falls between these and the protected blocks below.
];
// Never cut, at any size. Each of these is something this pipeline MEASURED or
// read off an official page, and it is the only support a specific number in
// the draft is ever going to have.
const NEVER_CUT = [
  /^KNOWN FROM SOURCE LISTING\b/i,
  /^(?:VERIFIED|REAL|MEASURED)\b/i,
  /^(?:OFFICIAL|TICKET)\b/i,
  /^(?:GETTING THERE|TRANSPORT|THE MEASURED JOURNEY)\b/i,
  /^SOURCE ORDER\b/i,
];
const rankOf = (block) => {
  const head = String(block || "").trimStart().slice(0, 120);
  if (NEVER_CUT.some(re => re.test(head))) return 100;
  const weak = WEAKEST_FIRST.findIndex(re => re.test(head));
  return weak === -1 ? 50 : weak;          // 0 is the first to go
};

export const researchForCheck = (raw, cap = RESEARCH_CHECK_CAP) => {
  const t = String(raw || "");
  if (t.length <= cap) return { text: t, truncated: false, kept: t.length, total: t.length, dropped: [] };
  // Blocks in their original order, each remembering where it sat, so what is
  // kept goes back to the checker reading the way it was assembled.
  const blocks = t.split(/\n\n+/).map((text, at) => ({ text, at, rank: rankOf(text) }));
  // Strongest first for the keep decision. Ties keep original order, so the
  // result is deterministic and a re-run of the same draft cuts the same way.
  const byStrength = blocks.slice().sort((a, b) => (b.rank - a.rank) || (a.at - b.at));
  const keep = new Set();
  let used = 0;
  const dropped = [];
  // ── A PROTECTED BLOCK TOO BIG TO FIT IS TRIMMED, NOT DROPPED ──────
  // Fable's catch, and it made the comment above a lie. The greedy keep skipped
  // any block bigger than the remaining budget whatever its rank, so a 30,000
  // character scraped official page was dropped WHOLE while a 100 character
  // search snippet was kept, and the note then called the official page "the
  // least authoritative". A measured block that does not fit is trimmed to what
  // does, head and tail, because half of the official site beats none of it.
  const trimmed = new Map();
  for (const b of byStrength) {
    const cost = b.text.length + 2;
    if (used + cost <= cap) { keep.add(b.at); used += cost; continue; }
    const room = cap - used - 2;
    if (b.rank >= 100 && room > 400) {
      const head = Math.floor(room * 0.5);
      trimmed.set(b.at, `${b.text.slice(0, head)}\n[... ${b.text.length - room} characters of this block are not shown ...]\n${b.text.slice(-(room - head))}`);
      keep.add(b.at);
      used += room + 2;
      continue;
    }
    dropped.push(b);
  }
  // A CUT THAT KEEPS NOTHING IS WORSE THAN THE OLD BEHAVIOUR, NOT BETTER.
  // Research with no blank line in it at all is one block, and one block that
  // does not fit leaves this with nothing to rank. Falling back to head plus
  // tail keeps the guarantee the old version was written for: the sources sit
  // at the END of the assembly, and a head-only cut is exactly the bug that
  // made every web-sourced fact look invented. Section-aware where there are
  // sections, both ends where there are not.
  if (!keep.size) {
    const head = Math.floor(cap * 0.35);
    const tail = cap - head;
    return {
      total: t.length, kept: cap, truncated: true, dropped: ["the middle of a single unbroken block"],
      text: `${t.slice(0, head)}\n\n[${t.length - cap} characters of the middle of this research are not shown. A CLAIM YOU CANNOT FIND HERE MAY SIMPLY BE IN THE OMITTED PART: do not call anything invented on the strength of it being missing from this text alone.]\n\n${t.slice(-tail)}`,
    };
  }
  const label = (b) => String(b.text || "").trimStart().split("\n")[0].slice(0, 60).trim() || "an unlabelled block";
  const names = [...new Set(dropped.map(label))];
  const text = blocks.filter(b => keep.has(b.at)).map(b => trimmed.get(b.at) || b.text).join("\n\n")
    + `\n\n[${dropped.length} block${dropped.length === 1 ? "" : "s"} of this research (${t.length - used} characters) are not shown, the least authoritative first: ${names.join("; ")}. A CLAIM YOU CANNOT FIND HERE MAY SIMPLY BE IN AN OMITTED BLOCK: do not call anything invented on the strength of it being missing from this text alone.]`;
  return { total: t.length, kept: used, truncated: true, dropped: names, text };
};
