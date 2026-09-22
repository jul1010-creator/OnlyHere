// ── WHERE THEY ARE FLYING IN FROM ───────────────────────────────────
//
// Oliver, 22 Sep 2026: "I also think the 'starting point' should be able to
// include their own country. Then we can recommend skyscanner."
//
// The intake's Starting point field was a place in Denmark or nothing. A
// traveller who types "Germany" there is telling us where home is, which is
// the one fact that makes "compare flights" a useful sentence rather than an
// advert. So a country typed there is read as home, the trip still starts at
// the Danish airport the rest of the brief implies, and the chat is told to
// point them at Skyscanner once.
//
// The countries are profile.js's list, Denmark's real inbound markets, with
// the Danish, German and everyday names people type for them. The Danish word
// "Island" (Iceland) is left out on purpose: in a Danish trip planner it is
// far more often an island than a country.
import { COUNTRIES } from "./profile";
import { fold } from "./danishNames";

const ALIASES = {
  SE: ["sverige", "schweden", "swedish"],
  NO: ["norge", "norwegen"],
  DE: ["deutschland", "tyskland", "german"],
  NL: ["holland", "nederland", "the netherlands", "niederlande"],
  GB: ["uk", "u.k.", "england", "scotland", "wales", "great britain", "britain", "storbritannien", "england uk"],
  IE: ["irland", "eire"],
  US: ["usa", "u.s.", "u.s.a.", "america", "the us", "the states", "united states of america"],
  CA: ["kanada"],
  FR: ["frankrig", "frankreich"],
  ES: ["spanien", "espana"],
  IT: ["italien", "italia"],
  PL: ["polen", "polska"],
  FI: ["suomi"],
  BE: ["belgien", "belgique"],
  AT: ["ostrig", "osterreich", "oesterreich"],
  CH: ["schweiz", "suisse"],
  CZ: ["tjekkiet", "czech republic", "tschechien"],
  AU: ["australien"],
  CN: ["kina"],
  IN: ["indien"],
  BR: ["brasilien", "brasil"],
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAMES = COUNTRIES
  .filter(c => c.code !== "DK")
  .flatMap(c => [c.name, ...(ALIASES[c.code] || [])].map(n => ({ code: c.code, name: c.name, word: fold(n) })))
  .sort((a, b) => b.word.length - a.word.length);

// The country named in `text`, as { code, name }, or null. Whole words only,
// so "Englandsvej" and "Polenhus" are not countries.
export const homeCountryIn = (text = "") => {
  const t = ` ${fold(String(text || "")).replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ")} `;
  for (const n of NAMES) {
    if (new RegExp(`(?:^|\\s)${escape(n.word)}(?=\\s|$)`).test(t)) return { code: n.code, name: n.name };
  }
  return null;
};

// True when the field holds the country and nothing else, so the trip still
// starts from the default airport rather than from "Germany".
export const onlyACountry = (text = "") => {
  const home = homeCountryIn(text);
  if (!home) return false;
  const rest = ` ${fold(String(text || "")).replace(/[^a-z0-9.\s]/g, " ")} `
    .replace(new RegExp(NAMES.filter(n => n.code === home.code).map(n => `\\s${escape(n.word)}(?=\\s)`).join("|"), "g"), " ")
    .replace(/\b(?:from|fra|aus|von|home|hjem|flying|fly|i|in|we|are|live|bor)\b/g, " ")
    .trim();
  return !rest;
};

// The chat's line. Once, where getting to Denmark comes up, never a fare.
export const skyscannerBlock = (home) => (home?.name
  ? `\n── THEY ARE FLYING IN FROM ${home.name.toUpperCase()} ──\nThey typed ${home.name} as their starting point, which is home rather than a place in Denmark. Once, early and where getting here comes up naturally, point them to Skyscanner (skyscanner.com) to compare flights from ${home.name} into Denmark: it is free to use and searches many airlines and booking sites at once, and its whole-month view helps when the dates can move. Copenhagen (CPH) is the main airport; Billund (BLL) in Jutland is sometimes cheaper and closer for a trip that starts in Jutland. Never quote a fare or a flight time, since you have not looked one up. Say it once, and not again.\n`
  : "");
