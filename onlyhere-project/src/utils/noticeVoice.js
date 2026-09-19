// ── A NOTICE IS READ BY SOMEBODY WHO IS NOT IN THE GROUP ────────────
//
// Oliver, 19 Sep 2026, looking at the Near you toast on Sejerø:
//
//   "So first off, it might want to get translated. Second, 'sign up in the
//    comment section' should get removed. This should be reported to me, and I
//    write a comment to the Facebook group."
//
// The notice said, word for word off the village's own post:
//
//   Husk åben ø-dag for børnefamilier d. 19. september! 🌻🌻
//   Læs mere og tilmeld dig gennem linket i kommentaren:
//
// Two separate failures in four lines, and both come from the same place: a
// notice carries the post's own words, which is right, and the post was
// written for people who are already standing in the comment thread.
//
//   THE LANGUAGE. It is Danish, and a notice is shown to whoever is nearby,
//   which on Sejerø in September is mostly not a Dane.
//
//   THE DEAD END. "tilmeld dig gennem linket i kommentaren" is an instruction
//   to do something that CANNOT BE DONE FROM A NOTICE. There is no comment
//   thread on the toast, and a trailing colon pointing at nothing is worse
//   than saying less: it reads as a link that failed to load.
//
// ── AND THE SECOND HALF IS THE PART THAT MATTERS ────────────────────
//
// "This should be reported to me, and I write a comment to the Facebook
// group." So the sentence is not deleted and forgotten. A dropped dead end
// becomes a LINE HE IS SHOWN, naming the group and what to ask it for, because
// the village has the sign-up link and will give it to anybody who asks. That
// turns a broken notice into one errand, and after the errand the notice has a
// real link instead of a reference to a comment nobody can see.
//
// NOTHING HERE REWRITES THE VILLAGE. A sentence is kept whole or dropped
// whole, and what is dropped is reported. The one thing this file must never
// do is improve somebody's post on their behalf.

// ── SENTENCES, AND WHY THE OBVIOUS SPLIT IS WRONG IN DANISH ─────────
//
// Split on a period and a space and a Danish village post falls apart, because
// almost every line in one carries at least two abbreviations that are not
// sentence endings:
//
//   Husk åben ø-dag for børnefamilier d. 19. september!
//   Fællesspisning i forsamlingshuset kl. 18.00. Tilmelding i kommentarfeltet.
//
// The second one is the case that matters, and it was got wrong first time
// here: splitting at "kl." put the TIME into the sentence that gets dropped,
// so the notice came out saying "Fællesspisning i forsamlingshuset kl." and
// the one fact a person standing there needs went out with the dead end.
//
// WHAT DECIDES IT IS WHAT COMES NEXT, not what came before. A real sentence
// ending is followed by something that starts a new one, and in Danish an
// abbreviation is followed by a lower case word or by a number:
//
//   kl. 18     a number follows, so the period belongs to the abbreviation
//   d. 19      the same
//   f.eks. en  a lower case word follows, the same again
//   18.00. T   a capital follows, so that period ends the sentence
//   september! 🌻   an emoji follows, and it starts the next line as surely
//
// AND NOTHING LOOKS AT THE WORD BEFORE, which the first working version did
// and which made this worse rather than better: guarding on "the run before
// the period ends in a digit" is right for "d. 19. september" and catastrophic
// for "kl. 18.00. Tilmelding", where it refuses to split at the one period
// that IS a sentence ending and drops the whole line. The rule above already
// covers the abbreviation case, because what follows an abbreviation is a
// number or a lower case word either way.
//
// The colon counts as an ending, and that is deliberate rather than
// incidental: "Læs mere og tilmeld dig gennem linket i kommentaren:" is the
// exact shape this file exists to catch, and its terminator is a colon.
const STARTS_A_SENTENCE = (ch) => !!ch && !/[a-zæøå0-9]/.test(ch);

export const sentencesIn = (text) => {
  const src = String(text || "");
  const out = [];
  let buf = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    buf += ch;
    // A line break is an ending whatever punctuation did or did not precede it.
    // A village post puts one event per line as often as it writes a sentence.
    if (ch === "\n") { if (buf.trim()) out.push(buf.trim()); buf = ""; continue; }
    if (!/[.!?:]/.test(ch)) continue;
    const rest = src.slice(i + 1);
    if (rest !== "" && !/^\s/.test(rest)) continue;
    const next = (rest.match(/^\s*(\S)/) || [])[1] || "";
    if (next && !STARTS_A_SENTENCE(next)) continue;
    if (buf.trim()) out.push(buf.trim());
    buf = "";
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
};

// ── THE INSTRUCTIONS A NOTICE CANNOT CARRY ──────────────────────────
//
// Each one is a thing the post asks the reader to do that only works inside
// Facebook. `ask` is written to HIM, in the second person, because it is the
// errand he said he would run.
//
// DANISH AND ENGLISH TOGETHER, because a few of these islands post in both and
// the same instruction is the same dead end in either language.
export const DEAD_ENDS = [
  {
    id: "comments",
    test: /(?:link|tilmeld|tilmelding|læs mere|laes mere|info|sign\s?up|details|more info|read more)[^.!?:\n]*(?:kommentar|comment)|(?:kommentar|comment)[^.!?:\n]*(?:link|tilmeld|sign\s?up)/i,
    what: "it points at a link in the comments",
    ask: "Ask the group to paste the sign-up link in a reply, or to put it in the post itself, then add it to this notice.",
  },
  {
    id: "inbox",
    test: /\b(?:skriv|send|kontakt)[^.!?:\n]*(?:pm\b|dm\b|messenger|indbakke|indboks|privat)|\b(?:pm|dm)\s+(?:os|mig|me|us)\b|\bmessage us\b/i,
    what: "it asks the reader to write to the page",
    ask: "Ask the group for a phone number, an email or a booking page that somebody outside Facebook can use.",
  },
  {
    id: "spread",
    test: /\b(?:del opslaget|del gerne|like og del|tag en ven|tag dem du|share this post|tag a friend)\b/i,
    what: "it asks the reader to share or tag",
    ask: "Nothing to ask here. It is for the group's own members and means nothing to a visitor.",
  },
];

// ── WHAT THE READER GETS, AND WHAT HE GETS ──────────────────────────
//
// One pass, two answers. `body` is the post with the dead ends taken out, kept
// word for word otherwise. `dropped` is what came out and why, which is the
// report he asked for.
//
// A POST THAT IS NOTHING BUT A DEAD END COMES BACK EMPTY, and that is the
// honest answer rather than a failure: "Tilmeld dig i kommentarerne" on its
// own carries no event, no day and no place, so there was never a notice in
// it. The caller decides what to do with an empty body, and seeing the drop
// reported is how he finds out why.
export const readerBody = (text) => {
  const kept = [];
  const dropped = [];
  for (const s of sentencesIn(text)) {
    const hit = DEAD_ENDS.find(d => d.test.test(s));
    if (hit) dropped.push({ id: hit.id, sentence: s, what: hit.what, ask: hit.ask });
    else kept.push(s);
  }
  return { body: kept.join(" ").replace(/\s+/g, " ").trim(), dropped };
};

// The line he reads in the Studio. One per notice that lost something, naming
// the place and the group, because the errand is "go and write in THAT group"
// and a list of sentences with no address on them is not an errand.
export const noticeAsk = ({ place = "", source = "", dropped = [] } = {}) => {
  if (!dropped.length) return "";
  const where = String(place || "").trim();
  const what = [...new Set(dropped.map(d => d.what))].join(", and ");
  const asks = [...new Set(dropped.map(d => d.ask).filter(a => a && !/^Nothing to ask/.test(a)))];
  return `${where ? `${where}: ` : ""}one line was left out of the notice because ${what}. `
    + (asks.length ? `${asks.join(" ")} ` : "")
    + (source ? `The post: ${source}` : "");
};

// ── AND THE LANGUAGE ────────────────────────────────────────────────
//
// Translated ONCE, when he adds it, and both versions stored. Not at render
// time: a notice is read by somebody standing outside in the rain with one
// bar of signal, and a model call between them and the sentence is a notice
// that does not arrive.
//
// THE NAME IS NEVER TRANSLATED. The standing rule in this codebase, and it
// bites hardest here of all places: a traveller reads this notice and then
// looks for a sign, and "Open island day" is painted on nothing. Same for the
// village, the hall and the harbour.
export const TRANSLATE_NOTICE = (headline, body) =>
  `A Danish village has posted this. Put it into English for a visitor who is standing on the island right now and does not read Danish.\n\n`
  + `Respond with ONLY strict JSON: {"headline":"...","body":"..."}\n\n`
  + `NEVER TRANSLATE A NAME. Not the event's name, not the village, not the hall, not the harbour, not the ferry. The visitor is going to look for a sign with that name on it, and a translated name matches nothing they will see. Keep it exactly as written and put the English around it.\n`
  + `NEVER ADD ANYTHING. No time that is not there, no price that is not there, no address that is not there, and no sentence telling them to book or to hurry. If the Danish does not say when it starts, the English does not either.\n`
  + `A DATE STAYS A DATE. "d. 19. september" is 19 September, not "the 19th of the ninth" and not a weekday you worked out.\n`
  + `KEEP IT THE SAME LENGTH. This is a notice on a phone, not a description.\n`
  + `If it is already in English, return it unchanged.\n\n`
  + `Headline: ${headline}\nBody: ${body}`;

export const translatedNotice = (json) => {
  const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
  const headline = clean(json?.headline);
  const body = clean(json?.body);
  if (!headline && !body) return null;
  return { headline: headline.slice(0, 120), body: body.slice(0, 400) };
};

// ── WHICH ONE A READER IS SHOWN ─────────────────────────────────────
//
// The Danish is the original and the English is the translation, so a Danish
// reader gets the village's own words and everybody else gets the English.
// FALLING BACK TO THE OTHER ONE RATHER THAN TO NOTHING: a notice added before
// this existed has only Danish, and a Dane's notice shown in English is a
// small loss where a blank one is the whole notice gone.
export const noticeText = (row, lang = "en") => {
  // BOTH SPELLINGS, because a raw Supabase row carries headline_da and a row
  // through cleanNotice carries headlineDa, and this is called on each of them
  // from a different surface. nearbyNotices.js learned this the hard way with
  // end_day and endDay, and the note above cleanNotice says so.
  const da = {
    headline: String(row?.headline_da || row?.headlineDa || "").trim(),
    body: String(row?.body_da || row?.bodyDa || "").trim(),
  };
  const other = { headline: String(row?.headline || "").trim(), body: String(row?.body || "").trim() };
  const want = String(lang || "en").toLowerCase().startsWith("da") ? da : other;
  return {
    headline: want.headline || other.headline || da.headline,
    body: want.body || other.body || da.body,
  };
};
