// ── "IT SUGGESTS HOSTELS, BUT THEN GIVES A SPECIFIC HOTEL??? ODD" ───
//
// Oliver, 9 Aug 2026, reading one guide:
//
//   Day 1  "book a hostel near Norreport... hostels start around EUR 30 per night"
//   Day 3  "Stay in central Odense... a comfortable hotel base" — Comwell H.C. Andersen Dolce
//
// He read that as the guide contradicting itself, and the first thing worth
// saying is that the pipeline was doing what it was told. enrichGuideDays runs
// ONE Claude call PER DAY, in parallel, and each call is told:
//
//   "central Copenhagen is expensive - a tight budget there realistically means
//    a hostel or budget guesthouse, not a hotel; the same budget in a smaller
//    town elsewhere in Denmark often comfortably covers a real hotel"
//
// So on the same budget, Copenhagen came back hostel and Odense came back hotel.
// That is the rule working. It is also, on the page, two sentences that appear
// to disagree about who this traveler is, because the ONE THING that makes them
// consistent, that Copenhagen costs more, is the thing neither sentence says.
//
// ── TWO SEPARATE FAULTS, AND ONLY ONE IS THE TIER ───────────────────
//
// 1. A REASON THAT IS NEVER STATED IS NOT A REASON THE READER HAS.
//    The days are generated independently and in parallel, so no day can see
//    what another said, and none of them knows it is the one that changed. The
//    fix is not to force one tier across a trip, which would be worse advice.
//    It is that a day recommending a different tier from the trip's own baseline
//    has to say why in the same sentence.
//
// 2. THE SENTENCE AND THE NAMED PROPERTY ARE NOT ALLOWED TO DISAGREE.
//    My first read of this was wrong and the correction is worth keeping. I
//    assumed the specific hotel was the sentence going off-script, because the
//    prompt asks the accommodation sentence for "an actual area/neighbourhood"
//    and gives an area as its example. It was not. The hotel came from
//    `recommendedStay`, a SEPARATE field with its own grounding rule: "ONLY if
//    one is explicitly present in the search context, exactly as named there",
//    and an empty string is called the correct answer most of the time. By that
//    rule the hotel was legitimate and checkable.
//
//    That makes Oliver's question sharper rather than softer. ONE Claude call
//    produces BOTH fields from ONE prompt, and it returned a sentence about
//    hostels and a property that is a hotel inside the same JSON object. Nothing
//    ever compared the two. The card then prints them next to each other.
//
//    So the fault is not "a hotel got named". It is that a single call
//    contradicted itself in one breath and no line of code was looking.

const clean = (v) => String(v == null ? "" : v).trim();

// ── WHAT KIND OF BED IS THIS SENTENCE TALKING ABOUT ─────────────────
// Ordered most specific first: "youth hostel" must not read as a hotel because
// the word "hostel" contains no "hotel" but "hostel" and "hotel" are one letter
// apart and easy to write a regex that confuses. Danish included, because the
// search context is Danish and the words come back in it: vandrerhjem is a
// hostel, kro is a country inn, campingplads is a campsite.
const TIERS = [
  // "danhostel" is spelled shut, so \bhostel\b could never see it, and Danhostel
  // is THE hostel chain in Denmark. Caught by writing a real chain name into a
  // test rather than by reading the regex.
  { id: "hostel", match: /\b(hostel|hostels|vandrerhjem|dorm|dormitory|danhostel)\b/i },
  { id: "camping", match: /\b(campsite|camping|campingplads|shelter|cabin|hytte)\b/i },
  { id: "apartment", match: /\b(apartment|apartments|airbnb|self[- ]catering|lejlighed)\b/i },
  { id: "guesthouse", match: /\b(guesthouse|guest house|bed and breakfast|b&b|pension|kro)\b/i },
  { id: "hotel", match: /\bhotels?\b/i },
];

export const stayTier = (text) => {
  const t = clean(text);
  if (!t) return null;
  const hit = TIERS.find(r => r.match.test(t));
  return hit ? hit.id : null;
};

// The tiers a whole trip recommends. More than one is not automatically wrong:
// a bike trip through Jutland genuinely mixes campsites and small hotels, and
// Copenhagen genuinely costs more than Odense. It is worth SEEING, which is
// different from being worth blocking.
export const stayTiers = (days) => {
  const found = [];
  for (const d of Array.isArray(days) ? days : []) {
    const tier = stayTier(d?.glance?.accommodation);
    if (tier && !found.includes(tier)) found.push(tier);
  }
  return found;
};

// ── A NAMED PROPERTY, WHICH IS A CLAIM NOTHING CHECKED ──────────────
// Looks for a proper noun sitting against a lodging word, in either order,
// because both are written: "Comwell H.C. Andersen Dolce" and "Hotel Odeon".
//
// DELIBERATELY CONSERVATIVE. This flags text for a human and for a prompt rule,
// so a false positive costs a re-write of a sentence that was fine, while a
// false negative ships an unverified business recommendation. Even so it will
// not fire on "stay near the Hotel Kong Frederik area" style phrasing used as
// a landmark, and that is accepted rather than solved: a landmark reference is
// not a recommendation.
const STOPWORDS = new Set(["the", "a", "an", "in", "at", "near", "by", "for", "and", "or", "of", "to", "from", "your", "this", "that", "with", "book", "stay", "central", "old", "new", "town", "city", "area", "district", "quarter", "harbour", "harbor", "centre", "center", "north", "south", "east", "west", "denmark", "danish"]);
// The lodging word and the proper noun need OPPOSITE case rules in one regex,
// so neither can use the /i flag: "Hotel Odeon" has a capital H, while the
// proper-noun part must stay case-SENSITIVE or every lowercase word after the
// word "hotel" reads as a hotel name. Written out per letter instead. This was
// wrong on the first attempt — the flags argument was "" and "Hotel Odeon"
// returned null — and found by a test using a real sentence rather than a
// lowercased one.
const LODGING = "(?:[Hh]otel|[Hh]ostel|[Ii]nn|[Kk]ro|[Vv]andrerhjem|[Gg]uesthouse|[Pp]ension|[Bb]&[Bb]|[Dd]anhostel)";
// A capitalised run: "H.C. Andersen Dolce", "Kong Frederik", "Odeon".
const PROPER = "(?:[A-ZÆØÅ][\\wÆØÅæøå.'-]*(?:\\s+[A-ZÆØÅ][\\wÆØÅæøå.'-]*){0,3})";

export const namedProperty = (text) => {
  const t = clean(text);
  if (!t) return null;
  // "Hotel Odeon" / "Hostel Copenhagen Downtown" — the lodging word leads.
  const after = t.match(new RegExp(`\\b${LODGING}\\s+(${PROPER})`, ""));
  if (after) {
    const name = after[1].trim();
    if (!STOPWORDS.has(name.split(/\s+/)[0].toLowerCase())) return name;
  }
  // "Comwell H.C. Andersen Dolce hotel" / "Danhostel Copenhagen" — the name
  // leads. Requires at least one capitalised word that is not a stopword.
  const before = t.match(new RegExp(`(${PROPER})\\s+${LODGING}\\b`, ""));
  if (before) {
    const words = before[1].trim().split(/\s+/).filter(w => !STOPWORDS.has(w.toLowerCase()));
    if (words.length) return words.join(" ");
  }
  return null;
};

// ── WHAT IS WRONG WITH THIS TRIP'S BEDS, IN PLAIN WORDS ─────────────
// Read by the plan check, phrased for a founder, and every line is a fact about
// the generated text rather than an opinion about where to sleep.
export const stayProblems = (days) => {
  const out = [];
  const list = Array.isArray(days) ? days : [];
  const tiers = stayTiers(list);
  if (tiers.length > 1) {
    // The reason the tier changed has to be IN the sentence, because the reader
    // has only the sentence. A day that switches tier and mentions cost is
    // explaining itself; one that does not is contradicting the trip.
    const unexplained = list.filter(d => {
      const text = clean(d?.glance?.accommodation);
      const tier = stayTier(text);
      return tier && tier !== tiers[0] && !/\b(expensive|pricier|cheaper|costs?|price|budget|affordable|dearer|goes further|stretches)\b/i.test(text);
    });
    if (unexplained.length) {
      out.push(`This trip recommends ${tiers.join(" and ")} on different days without saying why, which reads as the guide contradicting itself. Copenhagen costing more than a smaller town is a good reason, but it has to be in the sentence.`);
    }
  }
  for (const d of list) {
    const text = clean(d?.glance?.accommodation);
    const rec = clean(d?.glance?.recommendedStay);
    // The contradiction inside one call: the sentence says one kind of bed and
    // the property named beside it is another. This is the check that was
    // missing entirely, and it is the one Oliver's screenshot is about.
    if (stayTierMismatch(text, rec)) {
      out.push(`This day suggests a ${stayTier(text)} in the sentence and then names "${rec}", which is a ${stayTier(rec)}. Both come out of the same single call, so one of them is wrong and the reader has to pick.`);
    }
    // And the sentence naming its OWN property, separately from the field that
    // exists for exactly that and has a grounding rule attached to it.
    const name = !rec && namedProperty(text);
    if (name) {
      out.push(`The where-to-stay sentence names a specific place, "${name}", instead of an area. There is a separate field for a named property with a rule about only using one the search actually found; a name written into the prose skips that rule.`);
    }
  }
  return out;
};

// ── THE SENTENCE AND THE NAMED PROPERTY, ON THE SAME DAY ────────────
// After reading the pipeline: the specific hotel Oliver saw is NOT the sentence
// going off-script. It is `recommendedStay`, a separate field with its own
// grounding rule ("ONLY if one is explicitly present in the search context,
// exactly as named there"), and by that rule it was legitimate.
//
// Which makes his question sharper, not softer. One Claude call produces BOTH
// fields from ONE prompt, and it produced a sentence saying hostel and a
// property that is a hotel, in the same JSON object, and nothing looked at the
// two together. The card then prints them side by side.
//
// This is the check for that, and it only fires on a contradiction it can
// actually see: a property whose own NAME carries a tier word. "Danhostel
// Copenhagen" under a sentence about hotels is caught. "Comwell H.C. Andersen
// Dolce" carries no tier word in its name and is not caught here, which is
// stated rather than hidden: that half is the prompt's job below.
export const stayTierMismatch = (accommodationText, recommendedStayName) => {
  const said = stayTier(accommodationText);
  const named = stayTier(recommendedStayName);
  return !!said && !!named && said !== named;
};
