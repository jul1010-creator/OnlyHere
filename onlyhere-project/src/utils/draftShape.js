// ── "THE DRAFT NEEDS TO BE CAREFUL THAT IT DOESN'T OVERLAP" ──────────
//
// Oliver, 15 Aug 2026, on the Billund draft, finding two different faults and
// naming one of them:
//
//   "'One park fits a single day, but doing LEGOLAND, LEGO House and Lalandia
//    together needs two or three,' but it says 1 day is enough. This is a small
//    error. But we need to be careful that the text don't overlap."
//
// ── ONE: THE GLANCE FIELD CONTRADICTS THE BODY ──────────────────────
// recommendedStayGlance said "A day trip". gettingThereReality said the three
// parks together need two or three. A reader who scans the glance box plans a
// day trip and a reader who reads the paragraph plans three.
//
// AND THE PROMPT ALREADY FORBIDS IT, in its own words, in studioPrompts.js:
//
//   "KEEP THE GLANCE FIELDS HONEST TO THE BODY TEXT: recommendedStayGlance,
//    bestTimeGlance, and accommodationGlance must not contradict or soften
//    something you state plainly in the body"
//
// So the rule is written, the model ignored it, and nothing checked. That is
// this codebase's first standing rule exactly: a request has a failure rate
// while code does not.
//
// ── TWO: THE SECONDARY FIELDS ARE THE BODY AGAIN ────────────────────
// Measured on that same draft, against the three body paragraphs:
//
//   thingsToKnow[0]   75%   a near verbatim restatement of one sentence
//   thingsToKnow[1]   60%
//   thingsToKnow[2]   43%
//   highlight         53%
//
// The reader is told the LEGOLAND closure dates twice, the airport point twice
// and the "not much outside the parks" point twice, in one entry. It happens
// because nothing tells the writer that thingsToKnow and highlight must carry
// something the body does NOT: they are generated in one pass from one pile of
// research, so restating is the cheapest thing to do.
//
// ── AND A NAIVE DETECTOR WOULD HAVE SHIPPED GREEN ───────────────────
// The first duration regex written for this returned NOTHING on his actual
// sentence, because "a single day" and "two or three" do not sit next to a noun
// the way an invented fixture does. Every rule here is tested against the real
// strings off his draft.

const clean = (v) => String(v == null ? "" : v).trim();

export const BODY_FIELDS = ["characterAndFit", "whatToDo", "gettingThereReality", "vibeLocation", "howItsMade", "realityCheck", "desc"];

export const sentencesOf = (text) =>
  clean(text).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

export const bodyTextOf = (p) => BODY_FIELDS.map(f => clean(p?.[f])).filter(Boolean).join(" ");

// ── HOW LONG DOES IT TAKE, IN DAYS ──────────────────────────────────
//
// Words, not digits. "One park fits a single day" and "needs two or three" are
// how the writer actually writes, and a \d based rule sees neither. The same
// blindness is already documented in the handoff for the whole logistics layer:
// a draft saying "over four hours by train" passed every gate because every
// gate wanted a digit.
const WORD_NUMBER = {
  a: 1, an: 1, one: 1, single: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, "half": 0.5, couple: 2, few: 3, several: 3,
};

const UNIT_DAYS = { day: 1, days: 1, night: 1, nights: 1, weekend: 2, weekends: 2, week: 7, weeks: 7, afternoon: 0.5, morning: 0.5, hour: 0, hours: 0 };

// Returns { min, max } in days, or null. Reads a whole sentence at a time,
// because the unit is often stated once and elided afterwards.
export const stayRangeIn = (sentence) => {
  const s = clean(sentence).toLowerCase();
  if (!s) return null;
  const nums = [];
  // "two or three days", "a single day", "a couple of days", "two to three days"
  // hours ARE matched, and then contribute nothing. Leaving them out of the
  // pattern made the zero in UNIT_DAYS a dead entry: "allow two or three hours"
  // matched nothing at all, so the sentence never established a unit and the
  // zero was never consulted. Mutation testing found it by changing that zero
  // to a one and watching nothing break.
  const withUnit = /\b(a|an|one|single|two|three|four|five|six|seven|half|couple|few|several)\b(?:\s+(?:or|to|and)\s+(a|an|one|single|two|three|four|five|six|seven))?(?:\s+of)?\s+(day|days|night|nights|weekend|weekends|week|weeks|afternoon|morning|hour|hours)\b/g;
  let m;
  let sawDayUnit = false;
  while ((m = withUnit.exec(s))) {
    const unit = UNIT_DAYS[m[3]] ?? 1;
    // A duration in hours is a real duration and zero days. It must not add a
    // number to the range and it must not establish the unit for the elided
    // branch below, or "allow two or three hours" reads as three days.
    if (unit === 0) continue;
    sawDayUnit = true;
    const lo = (WORD_NUMBER[m[1]] ?? 1) * unit;
    const hi = m[2] ? (WORD_NUMBER[m[2]] ?? 1) * unit : lo;
    nums.push(lo, hi);
  }
  // ── AND THE ELIDED ONE, WHICH IS THE CASE HE FOUND ────────────────
  // "One park fits a single day, but doing all three needs two or three." The
  // second number has no noun after it, and only counts when the SAME sentence
  // has already established that the unit is days. That guard is what stops
  // "two or three museums" being read as three days.
  if (sawDayUnit) {
    const bare = /\b(two|three|four|five|six|seven)\s+(?:or|to)\s+(two|three|four|five|six|seven)\b(?!\s+(?:of\s+)?(?:day|days|night|nights|week|weeks|hour|hours))/g;
    while ((m = bare.exec(s))) {
      nums.push(WORD_NUMBER[m[1]] ?? 1, WORD_NUMBER[m[2]] ?? 1);
    }
  }
  if (!nums.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
};

// The longest stay the body says the place can take. The MAXIMUM, because the
// contradiction that matters is a glance promising less than the body asks for:
// somebody who plans one day and needs three misses two thirds of it.
export const stayRangeInBody = (p) => {
  let best = null;
  for (const s of sentencesOf(bodyTextOf(p))) {
    const r = stayRangeIn(s);
    if (!r) continue;
    best = best ? { min: Math.min(best.min, r.min), max: Math.max(best.max, r.max) } : r;
  }
  return best;
};

export const stayGlanceDays = (glance) => {
  const g = clean(glance).toLowerCase();
  if (!g) return null;
  const r = stayRangeIn(g);
  if (r) return r;
  // "A day trip" carries no unit the pattern above can see, and it is the
  // commonest value this field takes.
  if (/\bday trip\b|\bhalf a day\b|\ba few hours\b/.test(g)) return { min: 1, max: 1 };
  if (/\bovernight\b/.test(g)) return { min: 1, max: 1 };
  return null;
};

// ── THE CONTRADICTION ───────────────────────────────────────────────
// Only when the glance promises LESS than the body asks for. A glance saying
// two nights over a body that mentions a day trip is not a contradiction: the
// body was describing one option among several.
export const stayContradiction = (p) => {
  const body = stayRangeInBody(p);
  const glance = stayGlanceDays(p?.recommendedStayGlance);
  if (!body || !glance) return null;
  if (glance.max >= body.max) return null;
  const unit = body.max === 1 ? "day" : "days";
  return {
    severity: "medium",
    field: "recommendedStayGlance",
    detail: `At a Glance says "${clean(p.recommendedStayGlance)}" and the body says the place can need up to ${body.max} ${unit}. A reader who scans the glance box plans the shorter trip. The prompt already forbids a glance field contradicting the body; make them agree or say plainly that one park is a day and all of them is longer.`,
  };
};

// ── THE OVERLAP ─────────────────────────────────────────────────────
// Share of a bullet's meaningful words that already appear in one body
// sentence. Stop words removed, because "the" and "and" would put a floor of
// forty percent under everything and make the number meaningless.
const STOP = new Set(("the a an and or but of to in on at for with from is are was were it its this that there here you your they " +
  "their we our so as by up out into about over under more most some any all can will just also than then").split(" "));

export const meaningfulWords = (s) =>
  (clean(s).toLowerCase().match(/[a-zà-ÿ0-9'’]+/g) || []).filter(w => w.length > 2 && !STOP.has(w));

export const overlapWith = (text, sentenceWords) => {
  const words = new Set(meaningfulWords(text));
  if (!words.size || !sentenceWords.size) return 0;
  let hit = 0;
  for (const w of words) if (sentenceWords.has(w)) hit++;
  return hit / words.size;
};

// 0.6, from the measurement rather than from taste. His draft ran 75, 60, 43
// and 53 percent; the two that read as pure restatement are the two at or above
// sixty, and the 43 percent one is a real second thought that happens to share
// vocabulary. A threshold picked below that would flag honest writing.
export const RESTATEMENT = 0.6;

export const restatesBody = (p, threshold = RESTATEMENT) => {
  const sentences = sentencesOf(bodyTextOf(p)).map(s => ({ s, set: new Set(meaningfulWords(s)) }));
  if (!sentences.length) return [];
  const out = [];
  const candidates = [
    ...(Array.isArray(p?.thingsToKnow) ? p.thingsToKnow.map((t, i) => ({ field: `thingsToKnow[${i}]`, text: t })) : []),
    ...(clean(p?.highlight) ? [{ field: "highlight", text: p.highlight }] : []),
  ];
  for (const c of candidates) {
    let best = { score: 0, s: "" };
    for (const bs of sentences) {
      const score = overlapWith(c.text, bs.set);
      if (score > best.score) best = { score, s: bs.s };
    }
    if (best.score >= threshold) out.push({ ...c, score: Math.round(best.score * 100), body: best.s });
  }
  return out;
};

export const restatementFindings = (p, threshold = RESTATEMENT) =>
  restatesBody(p, threshold).map(r => ({
    severity: "low",
    field: r.field,
    detail: `${r.score}% of this is already in the body: "${r.body.slice(0, 110)}${r.body.length > 110 ? "…" : ""}". A reader is being told the same thing twice in one entry. Either give this bullet something the body does not say, or drop it.`,
  }));
