// ── "MIDDLE-AGE MAN" ────────────────────────────────────────────────
//
// Oliver, 26 Aug 2026, relaying a friend reading the Museum Østjylland entry:
// it says "middle-age man", and what is meant is a MEDIEVAL man. Danish
// "middelalder" is the Middle Ages. "Middelaldrende" is a person in their
// forties. They are one letter apart in the middle of a compound and they are
// four hundred years apart in meaning.
//
// ── THE SIBLING OF looksUntranslated, AND A DIFFERENT QUESTION ───────
//
// languageBarrier.js asks "is this still Danish", and it would pass this
// sentence without a murmur: every word in "a middle-age man" is English. The
// question here is the opposite one — IS THIS ENGLISH THAT WAS TRANSLATED TOO
// LITERALLY — and nothing in the pipeline was asking it.
//
// It matters more than it looks. The research is in Danish, the entry is in
// English, and glanceExtract's prompt says translating is part of extracting
// rather than a liberty. So every field on the site has been through a
// translation nobody checked, and the failures are invisible to a Dane reading
// it back (who mentally re-translates and sees nothing wrong) and obvious to
// the English reader the entry is FOR. That is the worst possible split, and it
// is why this came in from a friend rather than from the founder or from me.
//
// ── ADVISORY, NEVER A GATE ──────────────────────────────────────────
//
// Not one of these can be decided with certainty from the English alone. "A
// middle-aged man" is perfectly good English about a forty-five year old, and
// somewhere in Denmark there is a walking street that calls itself a walking
// street. So this produces FINDINGS a founder reads, in the same tray as the
// rest of entryAudit, and it never refuses a publish. A checker that blocks on
// a guess is a checker that gets switched off.
//
// ── AND IT MAY NEVER TOUCH A NAME ───────────────────────────────────
//
// The standing rule in this codebase, stated in readerLanguage.js, ask.js and
// glanceExtract.js: a place name is never translated, because the traveller has
// to match it against a road sign. "Rosenborg Slot" and "Kongens Have" are
// CORRECT and must not be flagged. So the two rules whose Danish word is also a
// perfectly good English word carry `nameSafe`, and skip a match that sits
// inside a capitalised name.

// `wrong` finds the literal rendering. `right` is what it probably should say.
// `why` is printed to a founder, so it explains the Danish rather than asserting
// the English — he can check the first and only guess at the second.
export const FALSE_FRIENDS = [
  {
    id: "middelalder",
    // The one that came in. Bounded to a HISTORICAL noun, because "a
    // middle-aged couple" is ordinary English and a travel entry may say it.
    wrong: /\bmiddle[-\s]ages?d?\s+(?:man|men|woman|women|church|cathedral|town|city|castle|fortress|street|wall|walls|centre|center|quarter|market|house|houses|grave|graves|skeleton|remains|finds?|artefacts?|artifacts?|exhibition|exhibit|village|monastery|abbey|ruins?)\b/i,
    right: "medieval",
    why: "Danish 'middelalder' is the Middle Ages, so this is almost certainly MEDIEVAL. 'Middle-aged' describes a person in their forties.",
  },
  {
    id: "domkirke",
    wrong: /\bdome\s+church\b/i,
    right: "cathedral",
    why: "Danish 'domkirke' is a CATHEDRAL. 'Dome' is the literal reading of 'dom' and means the wrong thing entirely.",
  },
  {
    id: "vandrerhjem",
    wrong: /\bwander(?:er'?s|ing)\s+home\b/i,
    right: "hostel",
    why: "Danish 'vandrerhjem' is a HOSTEL. Translated word by word it becomes a wanderer's home.",
  },
  {
    id: "badehotel",
    wrong: /\bbath\s+hotels?\b/i,
    right: "seaside hotel",
    why: "Danish 'badehotel' is a SEASIDE HOTEL, the old resort kind. 'Bath hotel' reads as a hotel with a bath in it.",
  },
  {
    id: "raadhus",
    wrong: /\brat\s?house\b|\bcouncil\s+house\b/i,
    right: "town hall",
    why: "Danish 'rådhus' is the TOWN HALL. A council house in English is public housing.",
  },
  {
    id: "kirkegaard",
    wrong: /\bchurch\s+garden\b/i,
    right: "churchyard",
    why: "Danish 'kirkegård' is a CHURCHYARD or cemetery. 'Gård' is a yard here, not a garden.",
  },
  {
    id: "bymidte",
    wrong: /\btown\s+middle\b|\bcity\s+middle\b/i,
    right: "town centre",
    why: "Danish 'bymidte' is the TOWN CENTRE.",
  },
  {
    id: "udsigtstaarn",
    wrong: /\boutlook\s+towers?\b/i,
    right: "viewing tower",
    why: "Danish 'udsigtstårn' is a VIEWING or lookout TOWER. 'Outlook' is the literal reading of 'udsigt'.",
  },
  {
    id: "legeplads",
    wrong: /\bplay\s+place\b/i,
    right: "playground",
    why: "Danish 'legeplads' is a PLAYGROUND. 'Plads' is a square or a space, not a place.",
  },
  {
    id: "herregaard",
    wrong: /\blord'?s?\s+farm\b/i,
    right: "manor house",
    why: "Danish 'herregård' is a MANOR HOUSE or estate.",
  },
  {
    id: "slot",
    // "Rosenborg Slot" is the building's name and correct. A lowercase "the
    // slot" is a machine that takes coins.
    //
    // ── AND, MUCH MORE OFTEN, AN APPOINTMENT ──────────────────────
    // The audit of all 138 published pages on 26 Aug 2026 turned up exactly two
    // hits, and one of them was this rule firing on Folketinget:
    //
    //   "school classes and larger groups can wait five to six months for a slot"
    //
    // Which is correct English and the commonest sense of the word. The rule
    // matched "a slot" anywhere, so on a site whose entries are largely about
    // BOOKING things it was going to keep finding tour bookings forever.
    //
    // A false positive is not free here. This file is advisory by design, and
    // the reason written at the top is that "a checker that blocks on a guess is
    // a checker that gets switched off" — a checker that cries wolf is switched
    // off the same way, just more slowly. So the rule now asks for the thing
    // that would actually be true of a mistranslated castle: it is a BUILDING,
    // so either it is doing something a building does, or somebody is standing
    // at it. Narrower and right beats wider and noisy, on a signal nobody can
    // confirm from the English alone.
    nameSafe: true,
    wrong: /\b(?:at|in|inside|to|around|behind|near|from)\s+the\s+slot\b(?!\s+machine)|\b(?:the|a)\s+slot\b(?!\s+machine)(?=\s+(?:is|was|are|were|has|had|dates|stands|sits|lies|itself|grounds|courtyard|chapel|tower|opens|opened|closes|closed|houses)\b)/i,
    right: "castle or palace",
    why: "Danish 'slot' is a CASTLE or palace. As an English common noun a slot is an opening or a machine. The NAME (Rosenborg Slot) stays exactly as it is.",
  },
  {
    id: "have",
    nameSafe: true,
    wrong: /\b(?:the|a)\s+have\b(?=\s*[.,;)]|\s+(?:is|was|has|lies|sits|opens))/i,
    right: "garden",
    why: "Danish 'have' is a GARDEN. The NAME (Kongens Have) stays as it is.",
  },
  {
    id: "so-lake",
    wrong: /\b[A-ZÆØÅ][\wæøå]*sø\s+(?:sea|lake\s+sea)\b/i,
    right: "lake",
    why: "Danish 'sø' is a LAKE. 'Hav' is the sea. A name already ending in -sø does not need the word after it.",
  },
  {
    id: "gaagade",
    wrong: /\bwalking\s+street\b/i,
    right: "pedestrian street",
    why: "Danish 'gågade' is a PEDESTRIAN street. Danish tourism English does use 'walking street', so this one is worth a look rather than a certainty.",
  },
];

// ── AND WHEN THE LITERAL RENDERING IS A NAME ────────────────────────
//
// The Museum Østjylland entry, read 26 Aug 2026, says "In Middle Age Man, let
// kids try on the monk robes" and "Middle Age Man brings you face to face with
// a mounted knight". Title Case, twice, used as the name of a thing — because
// it IS one: the museum's permanent exhibition is called Middelaldermanden.
//
// So two rules broke, not one, and the second is the worse of them. The entry
// translated a NAME, which this codebase forbids everywhere it says anything
// about language — readerLanguage.js, api/ask.js, glanceExtract.js all carry
// the same sentence, that the names of festivals, museums and venues stay
// exactly as they are, because the traveller has to match them against a sign.
// An exhibition inside a museum is that class of thing and none of those rules
// said so out loud.
//
// The tell is Title Case. "a middle-age man" is a bad translation of a common
// noun; "Middle Age Man" is a bad translation of a proper name, and the fix is
// different: the first should be reworded, the second should be put back to the
// Danish. The same entry gets the common noun RIGHT four lines later — "a
// life-size medieval village" — which is what makes the name the whole story.
const TITLE_CASE = /^(?:[A-ZÆØÅ][\wæøå'’-]*)(?:[\s-]+(?:[A-ZÆØÅ][\wæøå'’-]*|of|the|by|and|for))+$/;
export const looksLikeAName = (found) => TITLE_CASE.test(String(found || "").trim());

export const NAME_RULE =
  "And it is Title Case, so it is being used as the NAME of something — an exhibition, a gallery, a trail. A name is never translated at all: it goes back to the Danish exactly as the museum writes it, because that is what is on the sign the traveller is standing in front of. Give the English in brackets after it if it helps.";

// A capitalised word immediately before the match means it is part of a name —
// "Rosenborg Slot", "Kongens Have" — and a name is never translated. Only the
// rules that say so are checked this way, because "Aarhus Dome Church" is a bad
// rendering of a name and still wants flagging.
const insideAName = (text, at) => {
  const before = String(text).slice(Math.max(0, at - 40), at);
  return /[A-ZÆØÅ][\wæøå'’-]+\s*$/.test(before);
};

// One finding per RULE, not per occurrence: three "middle-age" phrases in one
// entry are one thing to fix, and a founder reading a list wants the list to be
// as long as the number of problems.
export const literalRenderings = (text) => {
  const t = String(text || "");
  if (!t.trim()) return [];
  const out = [];
  for (const f of FALSE_FRIENDS) {
    const re = new RegExp(f.wrong.source, f.wrong.flags.includes("g") ? f.wrong.flags : `${f.wrong.flags}g`);
    let m, hit = null;
    while ((m = re.exec(t))) {
      if (f.nameSafe && insideAName(t, m.index)) continue;
      hit = m[0].trim();
      break;
    }
    if (hit) {
      const named = looksLikeAName(hit);
      out.push({ id: f.id, found: hit, right: f.right, named, why: named ? `${f.why} ${NAME_RULE}` : f.why });
    }
  }
  return out;
};

// The founder line. Quotes what the entry says, because a finding that says
// "check your translations" is one nobody can act on.
export const literalNote = (findings) => {
  const list = Array.isArray(findings) ? findings : [];
  if (!list.length) return "";
  return `TRANSLATED TOO LITERALLY, ${list.length === 1 ? "one phrase" : `${list.length} phrases`} to look at: ${
    list.map(f => `"${f.found}" probably means ${f.right} — ${f.why}`).join(" ")
  } These read as correct Danish to a Danish reader and as broken English to the person the entry is for, which is why they survive a read-back.`;
};

// The half that stops it happening rather than catching it afterwards. Spliced
// into the drafting prompt, so the commonest ones are named before a value is
// written instead of found after it ships.
export const FALSE_FRIEND_RULE =
  "TRANSLATE THE MEANING, NOT THE WORD. The research is in Danish and the entry is in English, and the compounds are where that goes wrong: 'middelalder' is MEDIEVAL or the Middle Ages and never 'middle-age' (which is a person in their forties); 'domkirke' is a CATHEDRAL and never a 'dome church'; 'vandrerhjem' is a HOSTEL; 'badehotel' is a SEASIDE HOTEL; 'rådhus' is the TOWN HALL; 'kirkegård' is a CHURCHYARD; 'udsigtstårn' is a VIEWING TOWER; 'legeplads' is a PLAYGROUND; 'herregård' is a MANOR HOUSE; 'sø' is a LAKE and 'hav' is the sea. A NAME is never translated at all, and that includes the name of an EXHIBITION, a gallery, a trail or a room inside a place, not only the place itself: Rosenborg Slot stays Rosenborg Slot, Kongens Have stays Kongens Have, and Museum Østjylland's Middelaldermanden stays Middelaldermanden — never 'Middle Age Man'. Put the English in brackets after it if it helps. The traveller has to match the word against a sign on a wall, and a translated name matches nothing.";
