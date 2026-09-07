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
import { isTiqetsUrl, isTicketmasterUrl, isWegotripUrl, affiliateHref } from "./affiliates";
import { sourceIsAboutPlace } from "./sourcePolicy";
import { containsName, PLACE_NAMES, SIGHT_NAMES } from "./danishNames";
import { isSubEventListing } from "./tickets";
import { REGION_NAMES } from "./regions";
import { KOMMUNER, K } from "../data/kommuner";

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

// ── AND THE SAME QUESTION FOR TICKETMASTER ──────────────────────────
//
// 23 Aug 2026, an hour after Impact approved him: "There is no links on any of
// my events though."
//
// He was right, and the reason was worse than a missing field. `ticketUrl` was
// read in DetailPage, filtered here in shapeForLive, and WRITTEN BY NOTHING:
// three occurrences in the whole app and no producer among them. The Tickets
// button was unreachable on every entry ever published. And the one gate that
// existed accepted a Tiqets product page and nothing else, so the affiliate he
// had just been approved for had no field to live in.
//
// THE REFUSALS ARE THE SAME ONES, because the risk is the same one. A category
// page on Tiqets sells nothing and sends a reader back to a search; the
// equivalents here are the front page, a search results page, and an artist or
// venue page that lists shows without being one. A Tickets button pointing at
// Ticketmaster's home page is the failure the whole file exists to prevent, and
// it is exactly what the generic Impact link he was given would have produced.
//
// livenation is included because his own TICKETMASTER_HOSTS covers it and the
// programme does, and its bookable page is /show/<id> rather than /event/<id>.
const TICKET_EVENT_PATH = /\/(?:event|show)\/[^/?#]+/i;

const pathOf = (url) => {
  try { return new URL(String(url || "").trim()).pathname || ""; } catch { return ""; }
};

export const isTicketmasterEventUrl = (url) =>
  isTicketmasterUrl(url) && TICKET_EVENT_PATH.test(pathOf(url));

// ── AND THE THIRD AGENT, 6 SEP 2026 ─────────────────────────────────
//
// WeGoTrip sells seven Danish admissions: LEGOLAND Billund, both WOW PARKs,
// Givskud Zoo, Home of Carlsberg and IKONO. See src/data/wegotrip.js.
//
// ITS URLS CARRY A TYPED ID LIKE TIQETS', with a different alphabet:
//
//   ...-p20636/    a PRODUCT, one bookable thing              maybe
//   ...-a9255/     an ATTRACTION page, tours for one place    reject
//   ...-d2618425/  a DESTINATION, every product in a city     reject
//   ...-s2623032/  a COUNTRY                                  reject
//
// "maybe", because a WeGoTrip product is either an admission or a self-guided
// AUDIO WALK, and a walk is not a ticket. A "🎫 Book tickets" button over an
// audio tour of Copenhagen is a label that is not true, which is the same
// failure as an OFFICIAL SITE button over a reseller.
//
// THE SLUG SETTLES IT, and only in this direction. All seven admissions say
// "ticket" in the slug and not one of the thirteen walks does, so the word is
// sufficient evidence of an admission. The reverse is NOT true and is why this
// file does not try to identify a walk: "Best of Copenhagen: Get to know the
// capital of Denmark" says neither and is an audio tour, checked on its own
// page. Recognising a walk needs the catalogue; recognising a ticket does not.
const WEGOTRIP_PRODUCT = /-p\d+$/;
const SAYS_TICKET = /(?:^|-)(?:ticket|tickets|billet|billetter)(?:-|$)/i;

export const isWegotripTicketUrl = (url) => {
  if (!isWegotripUrl(url)) return false;
  const seg = lastSegment(url);
  return WEGOTRIP_PRODUCT.test(seg) && SAYS_TICKET.test(seg);
};

// ── ONE QUESTION, ASKED IN ONE PLACE ────────────────────────────────
// Everything downstream asks "may this be stored and shown as a ticket link",
// never "is this Tiqets". Adding a third agent was a line here rather than an
// edit in the publish gate, the render and the picker, which is what this
// comment promised on 15 August and what it cost on 6 September.
export const isBookableTicketUrl = (url) =>
  isTiqetsProductUrl(url) || isTicketmasterEventUrl(url) || isWegotripTicketUrl(url);

// Which agent it is, for the render, which has to reach for the right template.
export const ticketAgentOf = (url) =>
  isTiqetsProductUrl(url) ? "tiqets"
  : isTicketmasterEventUrl(url) ? "ticketmaster"
  : isWegotripTicketUrl(url) ? "wegotrip"
  : "";

// ── AND IS IT EVEN IN DENMARK ───────────────────────────────────────
//
// Oliver, 7 Sep 2026, on a published nightlife entry: "Massive problem.. look
// at the affiliate that one of the nightlife refered to. But the nightlife one
// is very bad, because it referenced to Chicago."
//
// He was right and it is the worst failure this file can have. The Skjulte
// Perler run put a paid Tickets button on a Danish bar entry pointing at
//
//   tiqets.com/da/aktiviteter-i-chicago-c80816/tickets-for-hidden-in-plain-
//   sight-chicago-prohibition-tour-p10660
//
// and the log line under it read "bookable, and vetted as being about this
// place". Every existing refusal passed. It IS a product page, so
// isBookableTicketUrl said yes. "Skjulte Perler" is Danish for "hidden gems",
// which is marketing copy on a Tiqets page in the Danish locale rather than a
// venue name, so sourceIsAboutPlace found the words and — the name reading as
// distinctive — took them as identification and never asked for a second
// signal. Nothing placed the draft, so `town` was empty and the one
// corroborating signal that would have caught it was not there to ask for.
//
// ── THE MISSING QUESTION IS THE COUNTRY, AND IT IS NOT A TIE-BREAK ──
//
// Gemlyx publishes Denmark. Every entry it will ever have is in Denmark, so a
// ticket page that gives no evidence of being in Denmark is not this place,
// however well its words match. That is a fact about the whole app rather than
// a heuristic about one search, which is why it is a hard gate before the name
// test and not another signal inside it.
//
// ── AND THE AGENTS ALREADY TELL US WHERE THE PRODUCT IS ─────────────
//
// Tiqets and WeGoTrip both put the city in the URL, with a typed id the same
// way the product carries one:
//
//   /da/aktiviteter-i-chicago-c80816/...     -c is a CITY
//   /en/copenhagen-attractions-c113/...      -c is a CITY
//   /copenhagen-d2618425/                    -d is a DESTINATION
//   /denmark-s2623032/                       -s is a COUNTRY
//
// So when such a segment exists the agent has already answered the question,
// and a segment naming somewhere that is not in Denmark is a refusal on its
// own — no page text can overturn it, because the page text is what was wrong.
//
// THE DANISH VOCABULARY IS NOT MINE. It is the 98 kommuner from the state's own
// address register, the twelve regions, and the language pairs in
// danishNames.js, so "kobenhavn" and "copenhagen" and "denmark" and "danmark"
// all read as here and no list of foreign cities has to be invented or kept up
// to date. A gazetteer of one small country is finite. A gazetteer of the world
// is what the Chicago link would have needed.
// ── WHOLE NAMES, NOT SHARED WORDS ───────────────────────────────────
//
// The first version of this held WORDS: every name split on spaces and thrown
// into one set. A mutation exposed what that costs. "The Round Tower",
// "Rosenborg Castle" and "Copenhagen Street Food" contribute "the", "castle",
// "street" and "food", so an assertion that "Skip the line and enjoy the show"
// says nothing about Denmark FAILED — on the word "the".
//
// The same hole runs the other way and that is the one that matters: a Tiqets
// category segment reading "old-town-krakow-c1" would have matched on "town"
// and been read as here. A gate that can be satisfied by an article is not a
// gate.
//
// So it is NAMES, matched whole, by containsName — the function danishNames.js
// already wrote for exactly this accident and whose comment is about exactly
// this accident. Word-boundary aware, punctuation treated as a gap, and Danish
// letters folded the way everything else in this codebase folds them, so
// "kobenhavn" and "København" are one needle.
//
// THE LIST IS NOT MINE. The 98 kommuner come from the Danish state's own
// address register via data/kommuner.js; the regions, the language pairs and
// the sight names are the ones danishNames.js already maintains. "Danish" and
// "Dansk" are the only additions, because a page can state the nationality
// without naming a place.
//
// A Tiqets page in a THIRD language is a known gap, written down rather than
// guessed at: /es/atracciones-en-copenhague-c113 says "copenhague", which is in
// none of these lists, so it reads as foreign and is refused. That is the safe
// direction, the app only ever searches in English and Danish, and the paste
// field in Studio is the answer if one ever turns up.
const DANISH_PLACES = [
  ...KOMMUNER.map(k => k[K.name]),
  ...REGION_NAMES,
  ...PLACE_NAMES.flat(),
  ...SIGHT_NAMES.flat(),
  "Danish", "Dansk",
].map(v => String(v || "").trim()).filter(Boolean);

// A URL segment read as a phrase, so containsName can work on it: a hyphen is a
// gap like any other punctuation. The trailing typed id goes because it is
// digits and a letter and could only ever match by accident.
const segmentPhrase = (seg) => String(seg || "").replace(/-[a-z]\d+$/i, "").replace(/[^A-Za-z0-9]+/g, " ").trim();

const saysDenmark = (phrase, town) => {
  const hay = String(phrase || "");
  if (!hay.trim()) return false;
  if (DANISH_PLACES.some(n => containsName(hay, n))) return true;
  // And the draft's own town, which is the strongest signal available for a
  // place the register does not name at kommune level: Ribe is a town in its
  // own right and sits inside Esbjerg kommune.
  // ── AND NO LENGTH GUARD, WHICH A MUTATION EARNED ─────────────────
  // This read `t.length >= 3 && ...`, carried over from a version of this file
  // that compared bare words, and deleting it changed no answer in the suite.
  // It cannot change one for the better: containsName is the function whose own
  // comment is about short Danish names being inside longer strings, so the
  // accident the guard was defending against is already handled a layer down.
  // What the guard COULD still do is refuse a real one — Ry is a town in
  // Skanderborg kommune and is two letters — so it is gone rather than kept as
  // a line nothing can exercise. An empty town is refused by containsName
  // itself, which returns false on an empty needle.
  return containsName(hay, String(town || "").trim());
};

// The geography segment an agent put in its own URL, or "" when it did not.
// Tiqets and WeGoTrip only; a Ticketmaster path carries no such thing.
const GEO_ID = /-[cds]\d+$/i;
const geoSegment = (url) => {
  if (!isTiqetsUrl(url) && !isWegotripUrl(url)) return "";
  const parts = pathOf(url).split("/").filter(Boolean);
  // The LAST geography segment before the product, because a WeGoTrip path can
  // carry a country and a destination and the narrower one is the answer.
  const geo = parts.filter(seg => GEO_ID.test(seg) && !/-p\d+$/i.test(seg));
  return geo.length ? geo[geo.length - 1] : "";
};

// ── THE GATE, AND WHAT IT IS ALLOWED TO CONCLUDE ────────────────────
//
// The first version of this demanded POSITIVE evidence of Denmark and refused
// anything without it, and the suite caught what that costs before it shipped:
//
//   tiqets.com/en/tivoli-gardens-tickets-l145543      refused
//   tiqets.com/en/amalienborg-palace-tickets-l259028  refused
//
// Both are live, both are right, and both are among the few links on this site
// that earn anything. A Tiqets VENUE page carries no city segment at all, so
// "prove you are Danish" is a demand the correct answer cannot meet.
//
// So the refusal is the NEGATIVE one only, and it is the one that catches the
// bug anyway: the Chicago page did not merely fail to prove Denmark, it stated
// its city in its own address. Absence of evidence is not evidence, and a rule
// that treats it as evidence deletes the good links and keeps the bad ones that
// happen to say nothing.
//
// What the agent's own catalogue wrote about where the product is. Only ever
// answers true when the URL NAMES a place, and that place is not here.
export const ticketUrlSaysElsewhere = (url, town = "") => {
  const raw = String(url || "").trim();
  if (!raw) return false;
  const geo = geoSegment(raw);
  if (!geo) return false;
  return !saysDenmark(segmentPhrase(geo), town);
};

// The positive question, for the callers that have text to read and for the
// sentence the Studio panel prints. `text` is a search result's title and
// snippet, or a page body already read. It is only ever allowed to say YES:
// refusing is left to the URL above, because the text is the half a marketing
// blurb can forge and the URL is the half the agent's catalogue wrote.
export const ticketIsInDenmark = (url, { town = "", text = "" } = {}) => {
  const raw = String(url || "").trim();
  if (!raw) return false;
  const host = (() => { try { return new URL(raw).hostname.toLowerCase(); } catch { return ""; } })();
  if (!host) return false;
  // ── A .dk STOREFRONT IS DENMARK ──────────────────────────────────
  // ticketmaster.dk and livenation.dk sell Danish dates and nothing else, and
  // this is the case that covers almost every event entry the app has.
  if (host === "dk" || host.endsWith(".dk")) return true;
  const geo = geoSegment(raw);
  if (geo) return saysDenmark(segmentPhrase(geo), town);
  // No geography in the URL, so something else has to say it: the path first,
  // then whatever text the caller had.
  if (saysDenmark(segmentPhrase(pathOf(raw)), town)) return true;
  return saysDenmark(String(text || ""), town);
};

// ── AND IS IT ADMISSION, OR SOMETHING INSIDE THE EVENT ──────────────
//
// The other half of the same evening. Comic Con Denmark published with
//
//   ticketmaster.dk/event/aliona-baranova-%7C-comic-con-denmark-...-tickets
//
// as its Book tickets button: one guest's meet-and-greet slot, on an entry
// whose own text says tickets are sold through Ticketmaster.
//
// utils/tickets.js now refuses that when it MATCHES a listing, which stops the
// next one. It does not stop this one. A ticketUrl already on a row survives a
// redraft, and a link pasted by hand never goes near the matcher at all, so the
// question has to be asked here too — at the gate every link passes through.
//
// THE LISTING NAME IS IN THE ADDRESS. Ticketmaster's event URLs carry the full
// title as the slug, pipe and all, percent-encoded. Decoding it and handing it
// to the same function keeps ONE definition of "this is a thing inside the
// event", which is the rule this codebase keeps relearning about second copies.
const slugPhrase = (url) => {
  const last = lastSegment(url);
  const parts = pathOf(url).split("/").filter(Boolean);
  const seg = /^\d+$/.test(last) ? (parts[parts.length - 2] || "") : last;
  let decoded = seg;
  // A malformed escape is not a reason to lose the check, so the raw segment is
  // used rather than throwing: it simply will not contain a pipe.
  try { decoded = decodeURIComponent(seg); } catch { decoded = seg; }
  return decoded.replace(/-[pl]\d+$/i, "").replace(/-/g, " ").trim();
};

// No empty-name guard, and a mutation is why: deleting one changed no answer.
// It cannot. isSubEventListing takes the carrying words of the entry's name and
// looks for all of them in a part of the listing, and an empty name has none, so
// it returns false on its own first line. A guard nothing can exercise is a
// guard that only makes the next reader wonder what it defends against.
export const ticketUrlIsASubEvent = (url, name) =>
  isSubEventListing(String(name || "").trim(), slugPhrase(url));

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
// The trailing id is stripped for both agents: Tiqets ends -p974091, and a
// Danish Ticketmaster event ends /<slug>/1234567, so the id is the whole last
// segment and the words are in the one before it.
const slugWords = (url) => {
  const last = lastSegment(url);
  if (/^\d+$/.test(last)) {
    const parts = pathOf(url).split("/").filter(Boolean);
    return (parts[parts.length - 2] || "").replace(/-/g, " ");
  }
  return last.replace(/-[pl]\d+$/, "").replace(/-/g, " ");
};

export const ticketMatches = (result, { name, town } = {}) => {
  const url = String(result?.url || "").trim();
  if (!isBookableTicketUrl(url)) return false;
  const said = [result?.title, result?.snippet, slugWords(url)].filter(Boolean).join(" ");
  // THE COUNTRY BEFORE THE NAME, because the name is the test the Chicago link
  // passed. Only the negative half: see ticketUrlSaysElsewhere for why demanding
  // proof of Denmark deletes the venue pages that are the good links.
  if (ticketUrlSaysElsewhere(url, town)) return false;
  // And admission rather than a guest slot inside it. Same reason as the
  // country: it is a question about WHAT is being sold, which no amount of name
  // matching answers, and the name matching is what let both bugs through.
  if (ticketUrlIsASubEvent(url, name)) return false;
  return sourceIsAboutPlace(said, { name, town, url });
};


// ── AND THE ONE HE PASTES HIMSELF ───────────────────────────────────
//
// Oliver, 7 Sep 2026, an hour after the Chicago link: "If you want, you can
// make a safety, and input a 'edit affiliate link'. Where I give the exact
// reference if it fails. So it will input the reference link to the link I
// give.. just make sure that it explicitly tells me that it has inputted an
// affiliate link, so I can test if it got it right."
//
// ── THE SAME GATE, NOT A BYPASS ─────────────────────────────────────
//
// A hand-pasted link is more trustworthy than a search result and it is still
// a link somebody typed at one in the morning. The Tiqets category page, the
// Ticketmaster search page and the foreign product page are exactly as wrong
// when pasted as when found, so every refusal above applies here too. What
// changes is that a refusal now has a PERSON reading it, so each one says which
// question it failed and what would fix it, rather than returning null.
//
// The NAME test is deliberately NOT applied. He is looking at the draft and at
// the page; if he says this URL is that place, he has better evidence than a
// slug comparison does, and refusing him on a name check is the app arguing
// with the only person who can see both.
//
// ── AND IT REPORTS THE TRACKED ADDRESS, NOT JUST "SAVED" ────────────
//
// "so I can test if it got it right" is the whole requirement. What is STORED
// is the plain agent URL and what a reader OPENS is that URL wrapped in the
// template from config.js, and the second one is the half that can be silently
// wrong: an empty template, a template with no {url} in it, a marker that has
// been revoked. So the verdict carries the exact address the reader's button
// will open, for him to click.
export const PASTED_TICKET_REFUSALS = {
  empty: "Nothing pasted.",
  notAUrl: "That is not a web address. It has to start with http:// or https://.",
  notAnAgent: "That is not on Tiqets, Ticketmaster or WeGoTrip. Gemlyx only has affiliate programmes with those three, so a link anywhere else would earn nothing and would not be a ticket button.",
  category: "That is a Tiqets CATEGORY page, which lists a city's attractions and sells nothing. A reader pressing Book tickets would land back in a search. The address of one product ends in -p or -l followed by digits.",
  notBookable: "That page is not a bookable one. Tiqets sells from a product page (-p...) or a venue page (-l...), Ticketmaster from /event/ or /show/, and WeGoTrip from a product page whose address says ticket. A front page, a search or a listing is not one.",
  audioWalk: "That is a WeGoTrip AUDIO WALK rather than an admission ticket, and a Book tickets button over a walking tour says something that is not true. Audio walks have their own button and live in __audio.",
  abroad: "That page is not in Denmark. This is the check that was missing when a Danish bar got a Chicago tour link, so it refuses a hand-pasted one the same way.",
  inside: "That listing is for something happening INSIDE this event rather than admission to it: Ticketmaster writes a guest slot or a VIP add-on as \"the act | the event\", and this one names something before the event's own name. A reader pressing Book tickets would be buying ten minutes with one person. Use the event's own listing.",
};

export const reviewPastedTicketUrl = (raw, { name = "", town = "", wrap = affiliateHref } = {}) => {
  const url = String(raw || "").trim();
  if (!url) return { ok: false, reason: PASTED_TICKET_REFUSALS.empty };
  if (!/^https?:\/\//i.test(url)) return { ok: false, reason: PASTED_TICKET_REFUSALS.notAUrl };
  const onAnAgent = isTiqetsUrl(url) || isTicketmasterUrl(url) || isWegotripUrl(url);
  if (!onAnAgent) return { ok: false, reason: PASTED_TICKET_REFUSALS.notAnAgent };
  if (!isBookableTicketUrl(url)) {
    const kind = tiqetsPageKind(url);
    if (kind === "category") return { ok: false, reason: PASTED_TICKET_REFUSALS.category };
    if (isWegotripUrl(url) && WEGOTRIP_PRODUCT.test(lastSegment(url))) {
      return { ok: false, reason: PASTED_TICKET_REFUSALS.audioWalk };
    }
    return { ok: false, reason: PASTED_TICKET_REFUSALS.notBookable };
  }
  if (ticketUrlSaysElsewhere(url, town)) return { ok: false, reason: PASTED_TICKET_REFUSALS.abroad };
  if (ticketUrlIsASubEvent(url, name)) return { ok: false, reason: PASTED_TICKET_REFUSALS.inside };
  const agent = ticketAgentOf(url);
  let tracked = url;
  try { tracked = (typeof wrap === "function" ? wrap(url) : url) || url; } catch { tracked = url; }
  const earning = tracked !== url;
  // ── AND WHETHER ANYTHING CHECKED THE COUNTRY, OR HE DID ───────────
  //
  // The refusal above is the negative one: it fires only when the address names
  // a city that is not here. A Tiqets venue page names no city at all, so it is
  // ACCEPTED without ever having been checked, and saying "written into the
  // draft" over that would be claiming a check that did not happen. The verdict
  // carries the difference and the panel prints it.
  const confirmedDanish = ticketIsInDenmark(url, { town });
  return {
    ok: true,
    url,
    agent,
    tracked,
    earning,
    confirmedDanish,
    // Said in words, because "saved" is not what he asked to be told. The two
    // addresses are different things and the difference is the whole reason a
    // stored link can look right and pay nothing.
    reason: earning
      ? `Stored as the plain ${agentName(agent)} address. The reader's Book tickets button opens it through the ${agentName(agent)} tracking template, which is the address below: open it and check it lands on the right page.`
      : `Stored as the plain ${agentName(agent)} address, and it is NOT earning: no tracking template is configured for ${agentName(agent)} in config.js, so the button sends the reader straight there and Gemlyx is paid nothing. The link works; the commission does not.`,
    checked: confirmedDanish
      ? `The address itself says it is in Denmark, so the country was checked and not merely assumed.`
      : `Nothing in that address says which country the product is in — a Tiqets venue page never does — so this was taken on your word. Open the link before publishing.`,
  };
};

const agentName = (agent) =>
  agent === "tiqets" ? "Tiqets" : agent === "ticketmaster" ? "Ticketmaster" : agent === "wegotrip" ? "WeGoTrip" : "the agent";

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
  // Unchanged for Tiqets. A Ticketmaster event page has no venue-versus-product
  // distinction to break a tie with, so it simply keeps the order it came back
  // in, which is what the paragraph above already says to do.
  const venue = ok.find(r => tiqetsPageKind(r.url) === "venue");
  return (venue || ok[0]).url;
};

// ── WHY NOTHING WAS PICKED, IN WORDS ────────────────────────────────
// For the Studio panel. Each branch is a different thing for him to do, which
// is the whole reason this returns a sentence rather than a boolean: go and
// find it by hand, accept that there is no ticket, or fix the name.
export const describeTicketSearch = (results, { name, town } = {}) => {
  const list = (Array.isArray(results) ? results : []).filter(r => r?.url);
  const onAnAgent = list.filter(r => isTiqetsUrl(r.url) || isTicketmasterUrl(r.url));
  if (!onAnAgent.length) return `No ticket page found for ${name || "this"} on Tiqets or Ticketmaster. Plenty of Danish events sell through their own site or a local agent, and no ticket link is the right answer for those.`;
  const bookable = onAnAgent.filter(r => isBookableTicketUrl(r.url));
  if (!bookable.length) return `There are pages mentioning ${name || "this"}, but only listings and category pages, which sell nothing. Left empty rather than sending a reader back to a search.`;
  // ── ABROAD IS ITS OWN ANSWER, NOT "NONE MATCHED" ─────────────────
  // The Chicago link's whole problem was that a foreign page LOOKED like a
  // match. Once it is refused, saying so is a different fact for him than "no
  // page was about this place": it means the name is generic enough to hit
  // marketing copy in another country, and pasting a link by hand is the fix
  // rather than renaming anything.
  const here = bookable.filter(r => !ticketUrlSaysElsewhere(r.url, town));
  const abroad = bookable.length - here.length;
  if (!here.length) return `Found ${bookable.length} bookable page${bookable.length === 1 ? "" : "s"} for that name, and ${bookable.length === 1 ? "it is" : "every one of them is"} outside Denmark. "${name || "This name"}" is matching marketing copy on a foreign product page rather than naming this place. Left empty. Paste a link by hand if there is a real one.`;
  return `Found ${here.length} bookable Danish page${here.length === 1 ? "" : "s"}${abroad ? `, plus ${abroad} outside Denmark that ${abroad === 1 ? "was" : "were"} refused,` : ""} and none of them is clearly about ${name || "this place"}${town ? ` in ${town}` : ""}. Left empty rather than guessing. Paste one by hand if you know which is right.`;
};

// The search a lookup should run. One query, phrased so the engine has to find
// the name on tiqets.com rather than finding tiqets.com and hoping. The town is
// included when there is one, because it is the corroborating signal the gate
// above will look for anyway.
// ── AND "DENMARK" WHEN THERE IS NO TOWN ─────────────────────────────
// A draft that nothing could place searches with no geography at all, which is
// how `site:tiqets.com "Skjulte Perler" tickets` came back with Chicago. The
// country is the weakest scope there is and it is still infinitely better than
// none: it costs nothing on a draft that IS placed, because that one sends its
// town instead.
const scopeFor = (town) => {
  const t = String(town || "").trim();
  return t ? ` ${t}` : " Denmark";
};

export const ticketQuery = (name, town) =>
  `site:tiqets.com "${String(name || "").trim()}"${scopeFor(town)} tickets`;

// Both agents, because one query per host is what a search engine answers well
// and a combined OR query is what it answers badly. The caller runs them in
// order and stops at the first that yields a bookable page.
export const ticketQueries = (name, town) => [
  ticketQuery(name, town),
  `site:ticketmaster.dk "${String(name || "").trim()}"${scopeFor(town)} billetter`,
];
