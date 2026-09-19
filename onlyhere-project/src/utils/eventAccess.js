// ── "LÆSØ'S CALENDER DOESN'T SEEM VERY FOREIGNER FRIENDLY" ──────────
//
// Oliver, 19 Sep 2026, reading what the island calendars actually hold:
//
//   "these islands are going to depend on a lot on your language. Læsø's
//    calender doesn't seem very foreigner friendly.."
//
// Two different problems sit inside that sentence and only one of them is about
// translation.
//
// ── THE NAME IS DANISH, AND IT STAYS DANISH ─────────────────────────
//
// "Løv- og vildtaften m/livemusik" tells an English reader nothing. Translating
// it tells them something and then strands them, because the name on the
// poster, on the door and on the village's own page is still the Danish one,
// and a traveller looking for "Leaf and game evening" will not find it. So the
// rule is the one this app already applies to place names in readerLanguage.js:
// keep the name, gloss it. The gloss is in the writer's prompt rather than in
// this file, because a gloss is a sentence and this file does not write prose.
//
// ── AND SOME OF THEM ARE NOT FOR A VISITOR AT ALL ───────────────────
//
// This is the half that matters more, and his own Askø poster is the example.
// It reads "Askø/Lilleø beboerforening inviterer MEDLEMMER til Oktoberfest" and
// "Bindende tilmelding senest 3.oktober". A members' dinner with binding
// signup a week ahead is not something a traveller can walk into, and pointing
// them at it is worse than saying nothing: they turn up and are turned away.
//
// Læsø's calendar has the other shape as well. A foredrag is a lecture, in
// Danish, for an hour. A generalforsamling is an association's own annual
// meeting. Both are real events and neither is a thing to send somebody to.
//
// ── EVIDENCE, NOT A VERDICT ─────────────────────────────────────────
//
// Every flag here carries the WORD that raised it, and nothing is stated as
// certain. "Medlemmer" in a row means the row says members, which usually means
// members only and sometimes means members get in free. So the writer is told
// what the row said and told to say it plainly or leave the row out, rather
// than being handed a judgement this file is not entitled to make.
import { fold } from "./danishNames";

// ── WORDS THAT MEAN THE DOOR MAY BE SHUT ────────────────────────────
//
// Kept narrow on purpose. A list that flags everything makes every row look
// closed and the writer stops reading it.
const MEMBERS = /\b(?:medlemmer|medlem|kun for medlemmer|foreningens medlemmer|members only)\b/i;

// Signing up, and signing up BY A DATE, which is the one that strands somebody.
// "Tilmelding" on its own can be a door list taken on the night.
const SIGN_UP = /\b(?:bindende tilmelding|tilmelding senest|tilmeld(?:ing)? senest|senest den|forhåndstilmelding|booking required|sign up by)\b/i;
const SIGN_UP_SOFT = /\b(?:tilmelding|tilmeld|reservation|book(?:ing)? nødvendig)\b/i;

// ── AND WORDS THAT MEAN IT HAPPENS IN DANISH ────────────────────────
//
// A harbour night, a market and a concert need no language. A lecture, a
// reading, a book group and an association's annual meeting are an hour of
// spoken Danish, and a traveller who cannot follow it has lost the evening.
//
// NOT a list of everything Danish. Banko is numbers, a koncert is music, and a
// fællesspisning is a long table: those are the finds this whole tier exists
// for and flagging them would empty it.
//
// ── AND THEATRE IS THE CLEAREST CASE OF THE LOT ─────────────
//
// Oliver, 19 Sep 2026: "Anything about 'theater' should be a clear nono as a
// foreigner." He is right, and a village revy is the worst of it: two hours of
// jokes about people in that parish, in Danish, sung. Dilettant is the amateur
// company that puts it on. A play is a play in any language and this one is not
// in theirs.
//
// A false positive here costs a sentence rather than a find: the rule under
// this block is "say so or leave it out" rather than a ban, so a dance piece
// caught by the word teater is described honestly and the traveller decides.
//
// ── AND DANISH GLUES ITS WORDS TOGETHER ──────────────────
//
// The first version of this had word boundaries on every entry and missed
// "Børneteater" and "Dilettantforestilling", which are two of the three shapes
// a village actually writes. Compounding is the normal way to build a noun in
// Danish: børneteater, revyaften, foredragsaften, generalforsamlingen. So these
// match INSIDE a word, and the cost of that is a sentence rather than a find,
// because the rule under this block is "say so or leave it out" rather than a
// ban.
const IN_DANISH = /(?:foredrag|oplaesning|oplæsning|læsekreds|laesekreds|generalforsamling|debatmøde|debatmode|kursus|undervisning|studiekreds|bogcaf|teater|theatre|theater|revy|dilettant|skuespil|forestilling|komedie|lystspil|syngespil)/i;

// Children, because it changes who it suits rather than whether it is open, and
// the brief already knows whether there are any.
const FOR_CHILDREN = /\b(?:for børn|for born|børnefamilier|bornefamilier|børneteater|for kids|children)\b/i;

const said = (row) => [row?.name, row?.desc, row?.venue].map(v => String(v || "")).join(" ");

// The word that raised a flag, so a report can quote rather than assert.
const hit = (re, text) => {
  const m = re.exec(String(text || ""));
  return m ? m[0] : "";
};

// ── AND WHETHER ANY OF THIS APPLIES TO THIS TRAVELLER ────────
//
// Oliver, 19 Sep 2026: "add an option called Danish-speaker and Non-Danish
// speaker. Because that can play a vital role in destinations for people."
//
// He is right and it is the difference between two products. A Dane reading
// Læsø's calendar sees a foredrag about seaweed, a revy and a læsekreds and
// can go to all three. A German reading the same calendar sees three evenings
// they would sit through understanding nothing. The island is busier for one
// of them than the other, and until now this app answered as though everybody
// were the second.
//
// So the language flag is the only one that a speaker cancels. Members stays,
// because a members' dinner turns a Dane away at the door too, and a deadline
// stays for the same reason.
export const accessOf = (row, { danishSpeaker = false } = {}) => {
  const text = said(row);
  const members = hit(MEMBERS, text);
  const byDate = hit(SIGN_UP, text);
  const signUp = byDate || hit(SIGN_UP_SOFT, text);
  // Cancelled by a Danish speaker, and only this one. See the block above.
  const danish = danishSpeaker ? "" : hit(IN_DANISH, text);
  const children = hit(FOR_CHILDREN, text);
  return {
    members,
    signUp,
    // Whether the signing up has a DEADLINE, which is the half that strands
    // somebody who turns up on the night.
    signUpByDate: !!byDate,
    danish,
    children,
    // Nothing raised, which is the answer for a harbour night, a market and
    // most of what this tier is for.
    open: !members && !byDate && !danish,
  };
};

// ── THE MARKER ON THE CARD ──────────────────────────────────────────
//
// Short, and only when there is something to say. English and Danish, the same
// two languages and the same reason the brief's asks carry: Denmark is where
// this is used and Danish is the one language in this repo that the person who
// owns it can read. A guide in German gets the English, which is what every
// other coded string in this app does today.
export const accessNote = (access, lang = "") => {
  const da = String(lang || "").toLowerCase().startsWith("da");
  if (!access) return "";
  if (access.members) return da ? "ser ud til at være for medlemmer" : "looks like it is for members";
  if (access.signUpByDate) return da ? "kræver tilmelding i forvejen" : "needs signing up in advance";
  if (access.danish) return da ? "foregår på dansk" : "runs in Danish";
  if (access.signUp) return da ? "tilmelding" : "sign up";
  return "";
};

// ── AND WHAT THE WRITER IS TOLD ─────────────────────────────────────
//
// One line per row that raised something, quoting the word. Empty when every
// row is a thing anybody can walk into, which is the common case.
export const accessLines = (rows, opts = {}) => (Array.isArray(rows) ? rows : [])
  .map(r => ({ row: r, a: accessOf(r, opts) }))
  .filter(({ a }) => a.members || a.signUp || a.danish || a.children)
  .map(({ row, a }) => {
    const why = [
      a.members ? `its own words say "${a.members}", so it may be for members` : "",
      a.signUpByDate ? `it says "${a.signUp}", so there is a deadline to sign up by` : (a.signUp ? `it mentions "${a.signUp}"` : ""),
      a.danish ? `it is a "${a.danish}", which happens in Danish` : "",
      a.children ? `it says "${a.children}"` : "",
    ].filter(Boolean).join("; ");
    return `  ${row.name}: ${why}`;
  });

// The block, for the community prompt. Two rules and the evidence under them.
export const accessBlock = (rows, opts = {}) => {
  const lines = accessLines(rows, opts);
  if (!lines.length) return "";
  return `NOT ALL OF THESE ARE THINGS A VISITOR CAN WALK INTO:\n${lines.join("\n")}\n`
    + `Say so in the same breath as the thing, in the traveller's own language, or leave that one out. A traveller sent to a members' dinner, or to an hour of spoken Danish they cannot follow, has lost the evening and will blame this guide. Never promise a place at anything that has to be booked by a date that has passed.`;
};

// ── AND THE NAME NEVER GETS TRANSLATED ──────────────────────────────
//
// The rule, for the same prompt. It is separate from accessBlock because it
// applies to every row rather than to the awkward ones.
export const KEEP_THE_NAME = `KEEP EACH NAME EXACTLY AS IT IS WRITTEN, IN DANISH, AND EXPLAIN IT BESIDE ITSELF. `
  + `"Løv- og vildtaften m/livemusik" means nothing to somebody reading in English, and translating it strands them: the poster, the door and the village's own page all say the Danish name, and nobody can ask for a "leaf and game evening" on Læsø. `
  + `So write the name as it stands and put what it is next to it, in their language, in a few words off the row's own description. If the description does not say what it is, say what little you know rather than inventing the rest.`;
