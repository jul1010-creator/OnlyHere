// ── "THE AI ENDS UP WRITING ABOUT THE HOSTEL" ───────────────────────
//
// Oliver, 27 Aug 2026: "there are quite a few 'nightlife bars' that are
// hostels.. we need to avoid that the AI end up writing about the hostel,
// rather than it as a nightlife and hostel."
//
// That is a real and common venue in Denmark — a hostel with a bar the town
// actually drinks in, and the bar is why it is in this pool. The research for
// one of those comes back overwhelmingly ABOUT THE ACCOMMODATION, because that
// is what the internet has to say about a hostel: dorm rates, check-in windows,
// luggage storage, breakfast, bed configurations. The draft then follows its
// sources and files a booking review under Nightlife.
//
// ── THE FIX IS NOT "DO NOT MENTION THE HOSTEL" ──────────────────────
//
// He was precise about this and it is the whole design: "rather than it AS A
// NIGHTLIFE AND HOSTEL". Being inside a hostel is a genuinely useful fact about
// a bar, and for one question it is the MOST useful fact — can somebody who is
// not staying there walk in and get a drink. A rule that suppressed the word
// hostel would delete the one thing a traveller standing outside needs.
//
// So the subject is the bar and the hostel is context. One clause saying where
// it is and whether the public are welcome; nothing about what a bed costs.
//
// ── ADVISORY, NEVER A GATE ──────────────────────────────────────────
//
// Same posture as utils/literalDanish.js, and for the same reason written
// there: "a checker that blocks on a guess is a checker that gets switched
// off." A nightlife entry may legitimately say "the hostel bar", and a bar
// genuinely inside a hostel will say so. What this counts is whether the entry
// has drifted into being an accommodation review — so it reports, and the
// founder decides.

const fold = (t) => String(t == null ? "" : t).toLowerCase();

// ── THE WORD THAT MEANS THIS IS ONE OF THOSE PLACES ─────────────────
// Danish and English. `vandrerhjem` is the Danish hostel and Danhostel is the
// chain; both appear in venue names and in category fields.
export const LODGING_WORDS = /\b(?:hostel|hostels|vandrerhjem|vandrehjem|danhostel|guesthouse|guest house|bed and breakfast|b&b|campsite|camping|kro|inn|hotel|hotellet)\b/i;

export const looksLikeLodging = (entry) =>
  LODGING_WORDS.test(fold([entry?.name, entry?.category, entry?.type].filter(Boolean).join(" ")));

// ── AND THE WORDS THAT MEAN THE ENTRY WENT AND REVIEWED IT ──────────
//
// Every one of these is about SLEEPING THERE, and not one of them is something
// a person standing at the bar at eleven at night has any use for. Deliberately
// not "hostel" or "reception" — a bar's own entry may reasonably say it is in a
// hostel and that you check in past reception to find it, and flagging those
// would flag exactly the sentence the fix is meant to keep.
export const STAY_TERMS = [
  { id: "dorm", re: /\b(?:dorm|dorms|dormitory|dormitories|bunk|bunks|bunk bed|sovesal)\b/i, why: "Beds. This is a bar entry." },
  { id: "nightly-rate", re: /\b(?:per night|a night from|from \d[\d.,]*\s*(?:dkk|kr)\s*(?:per|a)\s*night|pr\.? nat|per nat)\b/i, why: "A room rate, not what a drink costs." },
  { id: "checkin", re: /\b(?:check[- ]?in|check[- ]?out|indtjekning|udtjekning)\b/i, why: "Arrival logistics for a guest, not for somebody coming out for the evening." },
  { id: "rooms", re: /\b(?:private room|private rooms|en[- ]?suite|twin room|double room|family room|enkeltværelse|dobbeltværelse|værelser)\b/i, why: "Room types belong on a stay listing." },
  { id: "breakfast", re: /\b(?:breakfast\s+(?:is\s+)?(?:included|available|served)|breakfast buffet|morgenmad)\b/i, why: "Breakfast is not a nightlife fact." },
  { id: "luggage", re: /\b(?:luggage storage|left luggage|bagageopbevaring|lockers for guests)\b/i, why: "Guest services, not the bar." },
  { id: "booking-stay", re: /\b(?:book a bed|book your stay|booking\.com|hostelworld)\b/i, why: "This is sending them to book a room." },
];

// ── ONE FINDING PER TERM, NOT PER OCCURRENCE ────────────────────────
// Three mentions of dorms in one entry is one thing to fix, and a founder
// reading a list wants the list to be as long as the number of problems. Same
// rule literalRenderings applies to false friends.
export const stayDrift = (text) => {
  const t = String(text || "");
  if (!t.trim()) return [];
  return STAY_TERMS
    .map(term => { const m = term.re.exec(t); return m ? { id: term.id, found: m[0].trim(), why: term.why } : null; })
    .filter(Boolean);
};

// ── AND THE ONE FACT THAT SHOULD BE THERE AND USUALLY IS NOT ────────
//
// For a bar inside a hostel there is exactly one question a person outside it
// has, and no other kind of venue raises it: am I allowed in if I am not
// staying here. An entry that answers it has done the thing Oliver asked for.
// An entry that does not has left the reader at the door.
export const ANSWERS_PUBLIC_ACCESS =
  /\b(?:non[- ]?guests?|not staying|without staying|open to the public|anyone can|guests? and locals|walk[- ]?ins? welcome|you do not need to be|you don't need to be|ikke[- ]?boende|åben for alle)\b/i;

export const publicAccessAnswered = (text) => ANSWERS_PUBLIC_ACCESS.test(String(text || ""));

// The founder line. Quotes what the entry says, because a finding that says
// "this reads like a hostel review" is one nobody can act on.
export const stayDriftNote = (entry, text) => {
  if (!looksLikeLodging(entry)) return "";
  const found = stayDrift(text);
  const missing = !publicAccessAnswered(text);
  if (!found.length && !missing) return "";
  const parts = [];
  if (found.length) {
    parts.push(`WRITTEN AS A PLACE TO SLEEP, ${found.length === 1 ? "one phrase" : `${found.length} phrases`} to look at: ${
      found.map(f => `"${f.found}" — ${f.why}`).join(" ")}`);
  }
  if (missing) {
    parts.push("And it never says whether somebody who is NOT staying here can walk in and drink, which is the single most useful fact about a bar inside a hostel.");
  }
  return parts.join(" ");
};

// ── AND THE RULE THE DRAFT IS GIVEN, SO IT NEVER HAPPENS ────────────
//
// The detector above is the net. This is the instruction, spliced into the
// nightlife prompt, and it is the half that actually fixes it: catching a
// hostel review after the fact still costs a redraft.
//
// Written as what TO do rather than what to avoid. "Do not write about the
// hostel" produces an entry that dodges the word, and the word is load-bearing:
// somebody standing outside needs to know they are walking into a hostel lobby
// and that they are allowed to.
export const LODGING_RULE = `
IF THIS VENUE IS INSIDE A HOSTEL, HOTEL, KRO OR CAMPSITE, YOU ARE WRITING ABOUT THE BAR. This is common in Denmark and the bar is the reason this entry exists: a hostel bar the town actually drinks in is nightlife, and the beds are not. Your search results will be overwhelmingly about the accommodation, because that is what the internet has to say about a hostel — follow them and you will file a booking review under Nightlife.
So: NEVER write dorm or room rates, check-in or check-out times, bed or room configurations, breakfast, luggage storage, or where to book a bed. None of it is any use to somebody coming out for the evening.
DO say, in one clause, that the bar is inside a hostel — that is a real fact and it changes what walking in feels like. And answer the ONE question that only this kind of venue raises, which is the single most useful thing you can tell a reader here: CAN SOMEBODY WHO IS NOT STAYING THERE WALK IN AND DRINK? Say so plainly either way if the research supports it; if it genuinely does not say, put that in uncertainties rather than guessing, because a reader who is turned away at the door was failed by this entry.
Everything else is the bar at eleven at night: who is in it, how loud, what it costs to drink, when it fills.`;

// ── AND THE STAGE BEFORE THE WRITER, WHICH DECIDES WHAT SURVIVES ────
//
// Oliver, 27 Aug 2026, on being told about the rule above: "aren't nightlife
// being written by OpenAI?"
//
// Not quite, and the real answer is the more useful one. The split in App.jsx
// is "OpenAI structures, Claude writes": OpenAI reads the raw research and
// sorts it into point-form notes under headings, and CLAUDE writes the final
// prose from those notes. So LODGING_RULE does reach the writer.
//
// But it reaches it too late to matter on its own. The structuring prompt tells
// OpenAI to "use your judgment on what headings fit this content type", and for
// a hostel bar the research it is handed is mostly about beds — so the notes
// come back organised as Rates, Check-in, Rooms, Breakfast. Claude is then told
// to write about the bar from a page of facts about the accommodation, and the
// most conscientious writer in the world cannot put back a fact nobody kept.
//
// This is the shape that keeps recurring here: the rule was in the right place
// and a stage upstream had already made the decision. So the steer goes in
// both, worded for what each stage is actually doing — the writer is told what
// the subject is, the organiser is told what to keep.
export const LODGING_NOTES_RULE = `
IF THIS PLACE IS A BAR INSIDE A HOSTEL, HOTEL, KRO OR CAMPSITE: the entry being written is about THE BAR, not the accommodation, so organize the notes that way. Most of the research you have been given will be about beds, because that is what exists online about a hostel — keep the parts about the bar and the drinking, and DROP room rates, check-in and check-out times, room and dorm configurations, breakfast, and luggage storage entirely. They will not be used and a heading full of them crowds out what will.
Two things you must keep if the research contains them at all, because the writer cannot put back what you leave out: that the bar is inside a hostel, and whether somebody who is NOT staying there is allowed in.`;

// Which Studio types can be a bar inside a hostel. Nightlife venues and bar
// streets only: a `food` row inside a hotel is a restaurant and its research
// being about the hotel is a different problem with a different answer.
export const LODGING_TYPES = new Set(["night", "nightStreet"]);
export const isLodgingType = (type) => LODGING_TYPES.has(String(type || ""));
