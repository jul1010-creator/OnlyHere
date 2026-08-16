// ── "IF I ADD A COPENHAGEN ATTRACTION, IT'LL AUTOMATICALLY PUT IN THE
//     AFFILIATE" ────────────────────────────────────────────────────
//
// Oliver, 15 Aug 2026, on being told he would have to paste a Tiqets URL per
// entry: "can't we just put the affiliate links into the program itself, and
// then if I add on a Copenhagen attraction, then it'll automatically put in the
// affiliate.. I assume that won't be difficult to put into the system?"
//
// Right instinct, and half of it was already true. Any Tiqets URL that reaches
// the app comes out tracked, from one template in config.js. Nothing about that
// is per-attraction.
//
// The half that was missing is knowing WHICH Tiqets page is this place, and
// that cannot be derived. Their URLs carry a product id:
//
//   /en/copenhagen-attractions-c113/tickets-for-rosenborg-castle-p974091/
//                                                              ^^^^^^^
//
// No rule turns "Rosenborg Slot" into p974091. Something has to look it up, and
// this file is the part that decides whether what came back is real.
//
// ── AND THE RISK HERE IS NOT THE LINK, IT IS THE WRONG LINK ─────────
// A lookup that returns "close enough" is worse than a lookup that returns
// nothing. A Tickets button on Asaa harbour pointing at a Copenhagen museum is
// the same failure Oliver named on the preview screen this morning, in a new
// place: something on the card so there is something on the card. And it is
// worse here, because a reader who clicks Tickets has been asked for money.
//
// So this file is mostly a set of refusals. Two of them:
//
//   IS IT A BOOKABLE PAGE       a category page lists a city's attractions and
//                               sells nothing. Sending somebody to one is
//                               sending them back to a search.
//
//   IS IT ABOUT THIS PLACE      answered by sourcePolicy.js, which already
//                               solves exactly this for research sources and
//                               already knows that an ordinary name like
//                               "Harbour" needs corroborating.
import { isTiqetsUrl } from "./affiliates";
import { sourceIsAboutPlace } from "./sourcePolicy";

// ── WHICH TIQETS PAGES ARE WORTH LINKING TO ─────────────────────────
// Their URLs end in a typed id, and the letter is the type:
//
//   ...-p1068607/   a PRODUCT, one bookable ticket            keep
//   ...-l145543/    a VENUE, every ticket for one place       keep
//   ...-c113/       a CATEGORY, every attraction in a city    reject
//
// The venue page is kept deliberately, and for an entry about Tivoli it is the
// better of the two: it shows every Tivoli ticket rather than picking one on
// the reader's behalf. The category page is refused for the opposite reason.
// "Copenhagen attractions" is not a ticket, it is the search the reader already
// did by coming here.
const PRODUCT_ID = /-[pl]\d+$/;

const lastSegment = (url) => {
  try {
    const path = new URL(String(url)).pathname.replace(/\/+$/, "");
    const bits = path.split("/").filter(Boolean);
    return bits.length ? bits[bits.length - 1] : "";
  } catch { return ""; }
};

export const isTiqetsProductUrl = (url) =>
  isTiqetsUrl(url) && PRODUCT_ID.test(lastSegment(url));

// What kind of page it is, for a message that says why something was refused
// rather than reporting nothing found. "No ticket page exists for this" and "it
// found a category page and would not use it" are different facts, and a Studio
// that says the first when it means the second sends him looking by hand for
// something that is genuinely not there.
export const tiqetsPageKind = (url) => {
  if (!isTiqetsUrl(url)) return "not tiqets";
  const seg = lastSegment(url);
  if (/-p\d+$/.test(seg)) return "product";
  if (/-l\d+$/.test(seg)) return "venue";
  if (/-c\d+$/.test(seg)) return "category";
  return "other";
};

// ── AND IS IT ABOUT THE PLACE THIS ENTRY IS ABOUT ───────────────────
// sourceIsAboutPlace, not a name comparison written here. It is the function
// the research pipeline already uses to decide whether a page it found is about
// the place it was drafting, it already knows that a distinctive name identifies
// itself while an ordinary one needs the town alongside it, and a second copy of
// that judgement would drift the first time either was touched.
//
// The haystack is the search result's own title and snippet, plus the URL SLUG.
// The slug is included because a Tiqets result's snippet is often marketing
// text that never repeats the venue name, while the slug always carries it:
// "tickets-for-rosenborg-castle-p974091" says Rosenborg even when the blurb
// only says "skip the line".
const slugWords = (url) => lastSegment(url).replace(/-[pl]\d+$/, "").replace(/-/g, " ");

export const ticketMatches = (result, { name, town } = {}) => {
  const url = String(result?.url || "").trim();
  if (!isTiqetsProductUrl(url)) return false;
  const said = [result?.title, result?.snippet, slugWords(url)].filter(Boolean).join(" ");
  return sourceIsAboutPlace(said, { name, town, url });
};

// ── PICKING ONE ─────────────────────────────────────────────────────
// A product page beats a venue page ONLY when nothing else separates them,
// which is a preference and not a rule: for an entry about a whole attraction
// the venue page is usually better, and for an entry about one specific ticket
// the product page is. Both are acceptable, so the order they came back in is
// respected and the type is only a tie-break within the same position.
//
// Returns null rather than a best guess when nothing matches. A Tickets button
// that is absent is a page with one fewer button. A Tickets button that is
// wrong is a reader who paid for something else.
export const pickTicketUrl = (results, { name, town } = {}) => {
  const list = (Array.isArray(results) ? results : []).filter(r => r?.url);
  const ok = list.filter(r => ticketMatches(r, { name, town }));
  if (!ok.length) return null;
  const venue = ok.find(r => tiqetsPageKind(r.url) === "venue");
  return (venue || ok[0]).url;
};

// ── WHY NOTHING WAS PICKED, IN WORDS ────────────────────────────────
// For the Studio panel. Each branch is a different thing for him to do, which
// is the whole reason this returns a sentence rather than a boolean: go and
// find it by hand, accept that there is no ticket, or fix the name.
export const describeTicketSearch = (results, { name, town } = {}) => {
  const list = (Array.isArray(results) ? results : []).filter(r => r?.url);
  const tiqets = list.filter(r => isTiqetsUrl(r.url));
  if (!tiqets.length) return `No Tiqets page found for ${name || "this"}. Plenty of Danish places do not have one, and no ticket link is the right answer for those.`;
  const bookable = tiqets.filter(r => isTiqetsProductUrl(r.url));
  if (!bookable.length) return `Tiqets has pages mentioning ${name || "this"}, but only category listings, which sell nothing. Left empty rather than sending a reader back to a search.`;
  return `Found ${bookable.length} bookable Tiqets page${bookable.length === 1 ? "" : "s"}, and none of them is clearly about ${name || "this place"}${town ? ` in ${town}` : ""}. Left empty rather than guessing. Paste one by hand if you know which is right.`;
};

// The search a lookup should run. One query, phrased so the engine has to find
// the name on tiqets.com rather than finding tiqets.com and hoping. The town is
// included when there is one, because it is the corroborating signal the gate
// above will look for anyway.
export const ticketQuery = (name, town) =>
  `site:tiqets.com "${String(name || "").trim()}"${town ? ` ${String(town).trim()}` : ""} tickets`;
