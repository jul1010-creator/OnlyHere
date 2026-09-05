import { edged, alt } from "./travellerWords";
// ── "IT PUT NIGHTLIFE TO KØDBYEN" ───────────────────────────────────
//
// Oliver, 5 Sep 2026. What Gemlyx actually told him, in the chat, was:
//
//   "Aarhus has actual bars with a real local crowd (Mesteren & Lærlingen down
//   in Kødbyen is a solid old-school pick), it's about an hour and a half from
//   Billund"
//
// Mesteren & Lærlingen is a real bar and Kødbyen is a real place. Kødbyen is in
// COPENHAGEN — the old meatpacking yards behind Vesterbro — and Copenhagen is
// two and three quarter hours from Billund, not one and a half. The model had
// the right bar, put it in the wrong city, and then quoted the drive time of the
// city it had wrongly named.
//
// ── WHY NOTHING CAUGHT IT ───────────────────────────────────────────
//
// The published pipeline has coordinate checks, town scoping and a source
// policy, and a draft claiming a Copenhagen bar was in Aarhus would not survive
// any of them. THE CHAT HAS NONE OF THAT. It calls /api/anthropic directly,
// parses the reply by hand, and nothing between the model and the traveller has
// ever read a word of it for facts.
//
// This is the smallest useful thing that can: a district is a place whose town
// is not in dispute, and naming one beside a different town is a mistake that
// can be caught with a table rather than a search.
//
// ── WHAT IS IN THE TABLE, AND WHAT IS DELIBERATELY NOT ──────────────
//
// Only names that belong to ONE Danish town and are not ordinary words. That
// rules out most street names — a Vestergade or a Torvet exists in fifty towns —
// and it rules out "Latinerkvarteret", which Aarhus and Copenhagen both use for
// their old quarter, and which is exactly the kind of entry that would make this
// file produce a confident correction that is itself wrong.
//
// A wrong correction is worse than a missed one. So the table stays small and
// grows only from things somebody has checked.
export const DISTRICTS = {
  // Copenhagen. The city's own neighbourhood names, none of which is used for a
  // district of another Danish town.
  "kødbyen": "Copenhagen",
  "koedbyen": "Copenhagen",
  "meatpacking district": "Copenhagen",
  "vesterbro": "Copenhagen",
  "nørrebro": "Copenhagen",
  "noerrebro": "Copenhagen",
  "østerbro": "Copenhagen",
  "oesterbro": "Copenhagen",
  "christianshavn": "Copenhagen",
  "christiania": "Copenhagen",
  "islands brygge": "Copenhagen",
  "refshaleøen": "Copenhagen",
  "refshaleoen": "Copenhagen",
  "nyhavn": "Copenhagen",
  "amalienborg": "Copenhagen",
  "strøget": "Copenhagen",
  "stroeget": "Copenhagen",
  "kastrup": "Copenhagen",
  "frederiksberg": "Copenhagen",
  // Aarhus.
  "aboulevarden": "Aarhus",
  "frederiksbjerg": "Aarhus",
  "trøjborg": "Aarhus",
  "troejborg": "Aarhus",
  "godsbanen": "Aarhus",
  // Aalborg. Denmark's best known bar street, and it is only in Aalborg.
  "jomfru ane gade": "Aalborg",
  // Odense.
  "brandts": "Odense",
};

// The towns a district can be wrongly attached to. Only the ones the table names
// as homes, plus the handful a Denmark trip is otherwise built around: a clash
// is only reportable when BOTH halves are known, and a town nothing can be
// wrong about does not need to be here.
export const CLASH_TOWNS = [
  "Copenhagen", "København", "Kobenhavn", "Aarhus", "Århus", "Aalborg", "Ålborg",
  "Odense", "Esbjerg", "Randers", "Kolding", "Horsens", "Vejle", "Roskilde",
  "Billund", "Ribe", "Skagen", "Helsingør", "Tønder", "Sønderborg",
];

// Two spellings of one town are one town. Danish writes Aarhus and Århus, and a
// correction that treated them as different places would be pure noise.
const SAME_TOWN = {
  "københavn": "Copenhagen", "kobenhavn": "Copenhagen", "copenhagen": "Copenhagen",
  "århus": "Aarhus", "aarhus": "Aarhus",
  "ålborg": "Aalborg", "aalborg": "Aalborg",
};
export const townKey = (name) => {
  const t = String(name ?? "").trim().toLowerCase();
  return SAME_TOWN[t] || (t ? t[0].toUpperCase() + t.slice(1) : "");
};

// travellerWords' own edged and alt rather than a local pair. `alt` escapes the
// literal and `edged` puts the boundaries on it, which is the same word-boundary
// rule every other reader in this project uses — and a second copy of that rule
// is how one file comes to think "Kødbyens" contains "Kødbyen" and another does
// not. It also takes `edged` off KNOWN_UNWIRED, which is a list that only shrinks.
const named = (word) => edged(alt([word]));

// ── HOW CLOSE COUNTS AS "IN" ────────────────────────────────────────
//
// A window rather than a sentence, because the claim was made across a comma and
// a parenthesis: "Aarhus has actual bars ... (Mesteren & Lærlingen down in
// Kødbyen ...)". A sentence boundary would have missed it. 220 characters is
// about two clauses, which is as far as "in Aarhus" can reach and still be about
// the same thing.
export const CLASH_WINDOW = 220;

// Every district named in the text, with where it was said.
export const districtsIn = (text) => {
  const s = String(text ?? "");
  const out = [];
  for (const [name, town] of Object.entries(DISTRICTS)) {
    const m = named(name).exec(s);
    if (m) out.push({ name, town, at: m.index });
  }
  return out.sort((a, b) => a.at - b.at);
};

// ── AND THE CLASH ITSELF ────────────────────────────────────────────
//
// A district, and a DIFFERENT town named near it, and the district's own town
// NOT named near it. The last condition is what keeps "Kødbyen in Copenhagen is
// worth the trip from Aarhus" out of the report: both towns are there, the right
// one is beside the district, and the sentence is correct.
export const townClashes = (text) => {
  const s = String(text ?? "");
  const found = [];
  for (const d of districtsIn(s)) {
    const from = Math.max(0, d.at - CLASH_WINDOW);
    const window = s.slice(from, d.at + d.name.length + CLASH_WINDOW);
    const near = CLASH_TOWNS.filter(t => named(t).test(window)).map(townKey);
    const home = townKey(d.town);
    if (near.includes(home)) continue;      // said correctly, or said with its own town
    const wrong = near.find(t => t !== home);
    if (wrong) found.push({ district: d.name, belongsTo: home, saidWith: wrong });
  }
  return found;
};

// ── WHAT THE TRAVELLER IS TOLD ──────────────────────────────────────
//
// Appended by CODE, not written by the model, for the same reason the withheld
// ready-marker note is: the model has just demonstrated it believes the wrong
// thing, so asking it to correct itself is asking the same belief for a second
// opinion.
//
// It states the correction and nothing else. It does not guess what the reply
// should have said, because the bar might be the right bar and the city wrong,
// or the city right and the bar imagined, and this file cannot tell which.
const NAMED = { "kødbyen": "Kødbyen", "koedbyen": "Kødbyen", "meatpacking district": "the Meatpacking District",
  "jomfru ane gade": "Jomfru Ane Gade", "islands brygge": "Islands Brygge", "aboulevarden": "Aboulevarden",
  "jomfru ane": "Jomfru Ane Gade" };
const pretty = (name) => NAMED[name] || name.replace(/(^|[\s-])(\p{L})/gu, (_m, sp, ch) => sp + ch.toUpperCase());

// A town has a Danish name and an English one, and a correction written in
// Danish that says "Copenhagen" is half-translated. Only the towns whose names
// actually differ are listed; the rest are the same word in both.
const DANISH_TOWN = { Copenhagen: "København", Aarhus: "Aarhus", Aalborg: "Aalborg", Helsingør: "Helsingør" };
const inLang = (town, lang) => (lang === "da" ? (DANISH_TOWN[town] || town) : town);

export const clashNote = (clashes, lang = "en") => {
  const list = (Array.isArray(clashes) ? clashes : []).filter(c => c?.district);
  if (!list.length) return "";
  const one = (c) => lang === "da"
    ? `${pretty(c.district)} ligger i ${inLang(c.belongsTo, "da")}, ikke i ${inLang(c.saidWith, "da")}.`
    : `${pretty(c.district)} is in ${c.belongsTo}, not in ${c.saidWith}.`;
  const head = lang === "da" ? "Rettelse: " : "Correction: ";
  const tail = lang === "da"
    ? " Rejsetiden ovenfor gælder den forkerte by, så tjek den igen."
    : " Any travel time above was measured to the wrong city, so treat it as unchecked.";
  return `${head}${list.map(one).join(" ")}${tail}`;
};
