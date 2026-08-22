// ── WHAT GEMLYX NOTICES, AS OPPOSED TO WHAT IT WAS TOLD ──────────────
//
// Oliver, 10 Aug 2026, describing the whole idea: "the more the user
// communicates, the more it knows him. So if he ever asks for advice, it'll
// already have a good idea." profile.js has carried the other half of that
// sentence in writing ever since: "A typed profile is the cold start. Learning
// from conversation is the part that comes after, and it should read and write
// this same row rather than growing a second store beside it."
//
// It was never built. Restated 21 Aug 2026: "this account is also so the AI
// knows the person. Everytime a user uses the app, it gets to know him more."
//
// ── THE DISTINCTION THIS FILE EXISTS TO PROTECT ──────────────────────
//
// A typed answer is something they SAID. An observation is something Gemlyx
// NOTICED. Those are different kinds of fact and this product's whole promise
// rests on not blurring two kinds of fact together, so they are stored apart,
// they are worded apart in the prompt, and a typed answer always wins.
//
// Four rules, each of which is a mistake this pipeline has already made
// somewhere else:
//
//   1. ONLY THE TRAVELLER'S OWN TURNS. Never Gemlyx's replies. On 21 August
//      alone, five separate readers of intent were found reading both halves
//      of a conversation: "out of Copenhagen" read as a request for Copenhagen,
//      "starting from Southern Jutland" as a request for Jutland, Gemlyx's own
//      question naming bike as the traveller choosing a bike, "we arrive by
//      ferry" as wanting the coast, and Gemlyx's own "Fri 9 Oct" as the
//      traveller's arrival date. A profile that learned from Gemlyx's replies
//      would make that permanent instead of per trip.
//
//   2. ONE TRIP IS NOT A PREFERENCE. Somebody who plans one castle weekend has
//      not told you they like history. Counted per trip, and nothing is used
//      until it has happened OBSERVED_MIN times.
//
//   3. TYPED BEATS NOTICED, ALWAYS, and an observation never overwrites a typed
//      answer or quietly becomes one. They are merged only at the point of
//      writing the prompt, and even there the observed ones say they were
//      observed.
//
//   4. IT HAS TO BE VISIBLE AND REVERSIBLE. Somebody has to be able to see what
//      Gemlyx thinks it has noticed and clear it. A profile that grows silently
//      from behaviour and cannot be inspected is the thing people mean when
//      they say they do not want to be profiled, and this is a Danish business.
import { INTERESTS, TRANSPORT, COMPANY, cleanProfile, cleanLearned, OBSERVED_CAP, OBSERVED_FIELDS } from "./profile";

// ── cleanLearned AND ITS TWO CONSTANTS NOW LIVE IN profile.js ───────
//
// Not a tidy-up. The whole of this file was dead code until 22 Aug 2026 because
// cleanProfile returns a literal of exactly the fields it names, saveProfile
// writes cleanProfile(profile), and `learned` was not one of them. Every count
// was dropped on the way to Supabase and again on the way back.
//
// Fixing that meant cleanProfile had to know how to clean this shape, and this
// file already imports from profile.js, so the cleaner moved rather than the
// import going both ways. Re-exported here so every existing importer still
// works and so this file still reads as the place the idea lives.
export { cleanLearned, OBSERVED_CAP, OBSERVED_FIELDS };

// Two trips. One is a trip; two is a pattern, and the gap between them is where
// every false reading lives.
export const OBSERVED_MIN = 2;

// A ceiling, so a preference from a year ago cannot outvote what somebody is
// doing now, and so the stored object cannot grow without bound. Defined in
// profile.js and re-exported above; see the note there.

// The fields worth carrying between trips. Deliberately short: `when`, `days`,
// `origin`, `stay` and `budget` are all things tripBrief measures well and none
// of them is true of the NEXT trip, so learning them would be learning noise.
// Also defined in profile.js, re-exported above.

const clampCount = (n) => Math.max(0, Math.min(OBSERVED_CAP, Math.round(Number(n) || 0)));

// The same three vocabularies cleanLearned validates against, named here too
// because observeTrip has to refuse an option nobody was offered on the way IN,
// not only on the way to storage.
const LEARNABLE = { interests: INTERESTS, transport: TRANSPORT, company: COMPANY };

export const learnedIsEmpty = (learned) => !Object.keys(cleanLearned(learned)).length;

// ── TRANSLATING THIS TRIP INTO THE FORM'S OWN WORDS ──────────────────
//
// The pipeline's internal vocabularies and the form's are not the same words:
// themes are lowercase ids ("history"), travel modes are the strings routeOrder
// produces ("public transport"), and the form offers capitalised labels. Mapped
// once, here, rather than at the call site, so a word added to either list is
// one edit.
//
// A theme with no equivalent on the form is DROPPED rather than approximated.
// coast, art, design, market and family are all real themes and none of them is
// one of the four interests he offered, so inventing a nearest match would be
// storing an answer nobody was offered.
const THEME_TO_INTEREST = { history: "History", nature: "Nature", nightlife: "Nightlife", food: "Food" };
const MODE_TO_TRANSPORT = { car: "Car", bike: "Bike", "public transport": "Public transport", walk: "Walks", ship: "Ship", plane: "Plane" };

// `company` is taken ONLY from the intake form, never from the conversation.
// tripBrief's readParty answers "did they say who is coming", and on the text
// path its value is the literal string "said in the conversation", which is a
// yes-or-no rather than a who. Learning a travel companion from that would be
// learning noise, and this file's own second rule forbids exactly that.
export const seenFromTrip = ({ themes = null, modes = [], company = "" } = {}) => ({
  interests: [...(themes || [])].map(t => THEME_TO_INTEREST[t]).filter(Boolean),
  transport: (Array.isArray(modes) ? modes : []).map(m => MODE_TO_TRANSPORT[m]).filter(Boolean),
  company: company ? [company] : [],
});

// ── ONE TRIP'S WORTH OF EVIDENCE ─────────────────────────────────────
//
// `seen` is what this trip showed, already extracted by the readers that do it
// properly: briefThemes for interests, the mode list for transport, readParty
// for who came. This file deliberately does NOT parse conversation text itself.
// A seventh place in this repo that reads intent out of a sentence is how they
// disagree, which is the note dateRangesInText already carries about date
// parsers.
//
// Each field counts ONCE per trip however many times it was mentioned, so a
// chatty trip does not outweigh a quiet one.
export const observeTrip = (learned, seen) => {
  const base = cleanLearned(learned);
  const out = { ...base };
  for (const f of OBSERVED_FIELDS) {
    const values = Array.isArray(seen?.[f]) ? seen[f] : (seen?.[f] ? [seen[f]] : []);
    const allowed = values.map(v => String(v ?? "").trim()).filter(v => LEARNABLE[f].includes(v));
    if (!allowed.length) continue;
    const next = { ...(out[f] || {}) };
    for (const v of new Set(allowed)) next[v] = clampCount((next[v] || 0) + 1);
    out[f] = next;
  }
  return out;
};

// What has been seen often enough to be worth acting on, per field, commonest
// first. Ties broken alphabetically so the same evidence always produces the
// same sentence and a prompt does not churn between builds.
export const settledObservations = (learned) => {
  const c = cleanLearned(learned);
  const out = {};
  for (const f of OBSERVED_FIELDS) {
    const hits = Object.entries(c[f] || {})
      .filter(([, n]) => n >= OBSERVED_MIN)
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .map(([k]) => k);
    if (hits.length) out[f] = hits;
  }
  return out;
};

// ── WHAT THE MODEL IS TOLD, AND HOW IT IS WORDED ─────────────────────
//
// Never blended into the typed block. profileForPrompt already tells the model
// that what somebody asks for in the conversation outranks their profile; this
// sits one rung below that again, because a pattern across trips is weaker
// evidence than a sentence they typed into a form.
//
// Anything they typed is REMOVED from here rather than repeated, so the two
// blocks cannot contradict each other and the model is not told the same thing
// twice with two different confidences attached.
export const observedForPrompt = (profile, learned) => {
  const typed = cleanProfile(profile);
  const settled = settledObservations(learned);
  const bits = [];
  const fresh = (f) => (settled[f] || []).filter(v => !(
    Array.isArray(typed[f]) ? typed[f].includes(v) : typed[f] === v
  ));

  const interests = fresh("interests");
  if (interests.length) bits.push(`they have planned around ${interests.join(", ").toLowerCase()} on more than one trip`);
  const transport = fresh("transport");
  if (transport.length) bits.push(`they have travelled by ${transport.join(", ").toLowerCase()} before`);
  const company = fresh("company");
  if (company.length) bits.push(`they usually travel ${company.join(" or ").toLowerCase()}`);

  if (!bits.length) return "";
  return `NOTICED ACROSS EARLIER TRIPS, not told to you and not confirmed by them: ${bits.join("; ")}. This is weaker than anything in the block above and much weaker than this conversation. Use it to break a tie or to pick between two equally good options, never to override something they have said and never as a fact about them. Do not repeat it back to them as though they had told you.`;
};
