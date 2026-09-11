// ── WHAT DO MY AFFILIATES ACTUALLY CONNECT TO ───────────────────────
//
// Oliver, 26 Aug 2026: "perhaps make a studio section for my affiliates.. that
// looks through what my affiliates connect to?"
//
// He asked because he could not answer it, and neither could I. The links are
// built correctly, disclosed correctly and gated correctly, and NOTHING anywhere
// says how many of them exist. A programme that is signed up for, wired, live
// and attached to four rows out of a hundred and forty-eight earns almost
// nothing, and looks identical from the code to one attached to all of them.
//
// ── THE GATE IS WHERE THE MONEY GOES ────────────────────────────────
//
// A "🎫 Book tickets" button renders only when a row carries a URL that passes
// isBookableTicketUrl — a real Tiqets PRODUCT page or a Ticketmaster EVENT page.
// A front page, a search result or a category page renders nothing at all,
// deliberately, because a reader sent to a homepage after clicking Rosenborg has
// been sent somewhere they did not ask to go.
//
// That gate is right. It also means the earning surface is exactly as large as
// the number of rows where the research pass happened to find a product page,
// and that number has never been measured.
//
// ── AND IT COUNTS WHAT IS *NEARLY* THERE ────────────────────────────
//
// The most useful column is not "how many earn". It is how many rows have a
// ticket URL that was found and REFUSED — a Tiqets search page, a category, a
// homepage. Every one of those is a row where the pipeline got close, and a row
// somebody could finish by hand in a minute. A count of failures nobody can act
// on is a count; a list of near misses is a work queue.

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const host = (u) => { try { return new URL(String(u)).hostname.replace(/^www\./, ""); } catch { return ""; } };

// Every place a row can carry a ticket destination, in the order DetailPage
// reads them, so the audit and the render can never disagree about which URL a
// row would actually use.
export const ticketDestination = (row) => {
  const p = row?.payload || row || {};
  return clean(p.ticketUrl) || clean(p?.__ticket?.url) || "";
};

// ── AND THE OTHER HALF OF THE MONEY, WHICH IT COULD NOT SEE ─────────
//
// Oliver, 10 Sep 2026: "can you put into managed published 'affiliate links'?
// I don't care if it's in edit or as its own. I just want to have some control
// over it."
//
// This file audited ONE field. Every GetYourGuide link on the site lives in
// `tourUrl`, and nothing here ever read it, so the panel built to answer "what
// do my affiliates reach" was blind to a whole programme while printing a
// number that read as though it covered everything. The same failure this file
// was written to end, one field along.
export const tourDestination = (row) => clean((row?.payload || row || {}).tourUrl);

export const TICKET = "ticket";
export const TOUR = "tour";

// ── ONE ROW, ANSWERED ───────────────────────────────────────────────
//
// `isBookable` and `agentOf` are injected from utils/ticketLink.js rather than
// imported, for the reason every other audit in this codebase gives: a second
// copy of the judgement drifts the first time either is touched.
// ── ONE ROW, ONE KIND OF LINK ───────────────────────────────────────
// `kind` picks which field is read and which gate judges it. Both gates are
// injected for the reason the ticket one always was: a second copy of the
// judgement drifts the first time either is touched.
export const auditRow = (row, { isBookable, isTour, agentOf, wrap, kind = TICKET } = {}) => {
  const p = row?.payload || row || {};
  const name = clean(p.name) || clean(row?.name) || "(unnamed)";
  const tour = kind === TOUR;
  const word = tour ? "tour" : "ticket";
  const dest = tour ? tourDestination(row) : ticketDestination(row);
  const id = row?.id ?? null;
  if (!dest) return { name, id, kind, state: "none", why: `no ${word} link on this row at all` };

  const gate = tour ? isTour : isBookable;
  let bookable = false;
  try { bookable = typeof gate === "function" && !!gate(dest); } catch { bookable = false; }
  const agent = (() => { try { return typeof agentOf === "function" ? clean(agentOf(dest)) : ""; } catch { return ""; } })();

  if (!bookable) {
    // THE WORK QUEUE. The pipeline found something and the gate refused it, so
    // the row is one hand-edit from earning.
    return { name, id, kind, state: "refused", url: dest, host: host(dest),
      why: `${host(dest) || "that link"} is not a ${tour ? "tour" : "product"} page, so no button renders` };
  }
  // Wrapped or bare: a bookable URL with no template configured still reaches
  // the tickets and still earns nothing, and the difference is invisible on the
  // page because the button looks the same.
  let wrapped = "";
  try { wrapped = typeof wrap === "function" ? clean(wrap(dest)) : ""; } catch { wrapped = ""; }
  const earning = !!wrapped && wrapped !== dest;
  return {
    name, id, kind, state: earning ? "earning" : "bookable-unwrapped", url: dest, host: host(dest), agent,
    why: earning ? `wrapped through ${host(wrapped)}` : `a real ${tour ? "tour" : "product"} page, but no affiliate template is configured for this agent, so the click earns nothing`,
  };
};

// ── AND ONLY THE SLOTS THAT COULD EXIST ─────────────────────────────
//
// `canCarry` keeps an attraction out of the TOUR count. Attractions get no
// GetYourGuide search on purpose, Oliver's own position on 10 Sep: "It's often
// cheaper (and better) to use a museum's own guide. I'm not trying to steal
// people's money." Counting every museum as a tour link that is missing would
// report a deliberate decision as a hundred and forty gaps.
//
// Absent, every row counts, which is what every existing caller does.
export const auditRows = (rows, opts = {}) => {
  const can = opts.canCarry;
  return (Array.isArray(rows) ? rows : [])
    .filter(r => typeof can !== "function" || can(r))
    .map(r => auditRow(r, opts))
    .filter(Boolean);
};

// Both kinds, flattened, each finding carrying the kind it is about.
export const auditLinks = (rows, opts = {}) => [
  ...auditRows(rows, { ...opts, kind: TICKET, canCarry: opts.canTicket }),
  ...auditRows(rows, { ...opts, kind: TOUR, canCarry: opts.canTour }),
];

// ── THE SUMMARY, WHICH IS THE ANSWER TO HIS QUESTION ────────────────
export const auditSummary = (audited) => {
  const list = Array.isArray(audited) ? audited : [];
  const by = (s) => list.filter(x => x.state === s);
  const earning = by("earning");
  const agents = [...new Set(earning.map(x => x.agent).filter(Boolean))];
  return {
    total: list.length,
    earning: earning.length,
    unwrapped: by("bookable-unwrapped").length,
    refused: by("refused").length,
    none: by("none").length,
    agents,
    // The share, because 12 of 148 and 12 of 14 are different businesses and the
    // raw count reads the same.
    share: list.length ? Math.round((earning.length / list.length) * 100) : 0,
  };
};

// Said as a sentence, because a row of counters is a dashboard and this is a
// finding. Names the number that can be acted on TODAY rather than the total.
export const auditNote = (s) => {
  if (!s || !s.total) return "Nothing published yet, so there is nothing carrying a ticket link.";
  if (!s.earning && !s.unwrapped && !s.refused) {
    return `None of the ${s.total} published rows carries a ticket link, so no ticket button renders anywhere and the deep link earns nothing. Only the one generic browse button in each guide is live.`;
  }
  const head = `${s.earning} of ${s.total} published rows earn on a ticket click, which is ${s.share}%.`;
  const fixable = s.refused
    ? ` ${s.refused} more ${s.refused === 1 ? "already carries" : "already carry"} a link the gate refused, usually a search or a category page rather than a product page. ${s.refused === 1 ? "That one is" : "Those are"} the work queue: a minute of hand-editing each, and ${s.refused === 1 ? "it turns" : "they turn"} into live buttons.`
    : "";
  const dark = s.unwrapped
    ? ` ${s.unwrapped} carry a real product page with no affiliate template configured for that agent, so the button renders and the click pays nothing.`
    : "";
  return head + fixable + dark;
};

// ── AND THE PROGRAMMES THEMSELVES ───────────────────────────────────
//
// The other half of "what do my affiliates connect to": which of them are
// switched on at all. An empty template is not a bug and is not a mistake, and
// there is no way to tell an empty one from a filled one without opening
// config.js, which is exactly the state this panel exists to end.
export const programmeState = ({ tiqetsTemplate, tiqetsBrowse, ticketmasterTemplate, bookingId, carRental, wegotrip, wegotripTemplate, tripcom, tripcomCities = 0, getyourguide, bajabikes, bajabikesProducts = 0 } = {}) => [
  { name: "Tiqets", what: "attraction tickets, deep link", on: !!clean(tiqetsTemplate),
    note: clean(tiqetsTemplate) ? "live on every row with a Tiqets product page" : "no template, so Tiqets product pages render a button that earns nothing" },
  { name: "Tiqets browse", what: "one generic button per guide", on: !!clean(tiqetsBrowse),
    note: clean(tiqetsBrowse) ? "live in the guide's tickets block" : "no browse link configured" },
  { name: "Ticketmaster", what: "event tickets, deep link", on: !!clean(ticketmasterTemplate),
    note: clean(ticketmasterTemplate) ? "live on every row with a Ticketmaster event page" : "no template configured" },
  { name: "Booking.com", what: "stays", on: !!clean(bookingId),
    note: clean(bookingId) ? "aid appended to every stay link" : "no id, so every stay link is a plain search and the disclosure says so" },
  // ── AND THE ONE THAT COVERS PART OF A COUNTRY ────────────────────
  // 7 Sep 2026. Trip.com's ids ride on their own domain, so unlike every other
  // programme here a link can be BUILT for a town rather than found. The catch
  // is the city id: their own Denmark page lists twenty Danish cities and none
  // of the hidden gems, so this row says how many towns it can actually reach
  // rather than only whether it is switched on. A dot that reads "live" over a
  // programme covering a fifth of the site is the WeGoTrip row's fault again.
  { name: "Trip.com", what: `stays, deep link, ${tripcomCities} Danish cities`, on: !!clean(tripcom),
    note: clean(tripcom)
      ? `live on the ${tripcomCities} towns Trip.com has a city id for. Every other town shows no Trip.com link at all, which is deliberate: a fallback would land a reader somewhere they were not promised`
      : "no alliance id configured" },
  { name: "Airbnb", what: "stays", on: false,
    note: "Associates closed in March 2021 and has not reopened. There is nothing to attach and adding a ref would earn nothing while reading as a tracking tag." },
  // ── TWO ROWS, LIKE TIQETS, AND FOR THE SAME REASON ────────────────
  // 6 Sep 2026. This was one row reading the SHORT link, and it printed
  // "browse link configured" while nothing on the reader-facing site rendered
  // WeGoTrip at all. Oliver read it as the site's state, which is a fair thing
  // to do with a panel called "what my affiliates reach", and it was the
  // programme's state. The deep link is what makes a named link pay, so it gets
  // its own line and its own dot.
  { name: "WeGoTrip browse", what: "one generic button", on: !!clean(wegotrip),
    note: clean(wegotrip) ? "short link configured. One fixed destination, so it can never point at a particular walk" : "no browse link configured" },
  //
  // AND THE LEGOLAND WARNING STAYS ON THE ROW THAT RENDERS LINKS. WeGoTrip
  // sells LEGOLAND Billund entry, and the traveller who wrote "please don't
  // send us to Legoland" must not be sold one through a partner. The gate is
  // structural rather than a check: both render sites reach a WeGoTrip link
  // only through a row that is already on the page or already a stop in a
  // guide, and the exclusion filter runs before either. Written down because
  // the day something offers WeGoTrip from a list of suggestions instead, that
  // stops being true.
  { name: "WeGoTrip", what: "audio walks and admissions, deep link", on: !!clean(wegotripTemplate),
    note: `${clean(wegotripTemplate)
      ? "live on every row the sweep matched to their Danish catalogue"
      : "no template, so their Danish products render real links that earn nothing. Travelpayouts, WeGoTrip campaign, link generator"}. Sells Legoland Billund entry, so anything that OFFERS it rather than answering for a row already on screen has to go through the exclusion gate` },
  // ── THE ONE THAT NEEDS NO TEMPLATE ───────────────────────────────
  // 9 Sep 2026. GetYourGuide tracks on its own domain with two query
  // parameters, so unlike Tiqets and WeGoTrip there is no second thing to
  // configure: the partner id IS the programme, and every product page found is
  // payable the day it is found. One row rather than two, for once.
  { name: "GetYourGuide", what: "tours and experiences, deep link", on: !!clean(getyourguide),
    note: clean(getyourguide)
      ? "live on every row with a GetYourGuide activity page. Tours and experiences only: their Danish catalogue has canal tours, walks and day trips and no museum admissions, which is the reason to point at it and the limit on where"
      : "no partner id configured" },
  // ── AND THE ONE THAT COVERS ONE CITY ─────────────────────────────
  // Approved 11 Sep 2026. Their whole Danish inventory is Copenhagen, confirmed
  // off his panel and off their own Denmark page, so this row says so rather
  // than reading "live" over a programme that can never fire in Aarhus. Same
  // fault the Trip.com row exists to avoid, one step further along: that one
  // reaches a fifth of the site, this one reaches a single town.
  { name: "Baja Bikes", what: `guided bike tours and rental, ${bajabikesProducts} products, Copenhagen only`, on: !!clean(bajabikes),
    note: clean(bajabikes)
      ? "live on Copenhagen rows only. Every product they sell in Denmark is in Copenhagen, so no other town can ever show one, and the rental is the only partner link on the site that answers how you get around rather than what you do"
      : "no referral id configured" },
  { name: "Car hire", what: "rentals", on: !!clean(carRental),
    note: clean(carRental) ? "AutoEurope, real Danish inventory at 9 airports. Only renders on a trip the traveller said is a driving one" : "empty: the link on hand had no Danish inventory, and a button that opens on an empty result costs more than the commission pays" },
];

// ── AND A LINK HE SETS BY HAND GOES THROUGH THE SAME DOOR ───────────
//
// Oliver, 10 Sep 2026: "I just want to have some control over it."
//
// Control means writing, and a hand-pasted link that skips the gates the sweep
// writes through is the worst of both: it renders a button the audit will then
// report as refused, or it earns nothing and looks identical to one that does.
// So the same two judgements decide, injected the same way, and a refusal comes
// back as a SENTENCE rather than as a silent no-op.
//
// An empty draft is a clear, deliberately: taking a link off a row is half of
// having control over it, and a row with a refused link on it is worse than a
// row with none.
// The FIELD comes in with the gates, because ticketLink.js already names both
// and is what the pipeline writes through. A second pair of constants here is
// the drift the rest of this file is written to avoid.
export const linkPatch = (payload, kind, raw, { isBookable, isTour, ticketField, tourField } = {}) => {
  const k = clean(kind);
  const field = k === TOUR ? clean(tourField) : k === TICKET ? clean(ticketField) : "";
  if (!field) return { patch: {}, why: "that is not a kind of link this entry can carry" };
  const url = clean(raw);
  const was = clean((payload || {})[field]);
  if (!url) {
    if (!was) return { patch: {}, why: "there was nothing on it to take off" };
    return { patch: { [field]: "" }, why: `Cleared. No ${k === TOUR ? "tour" : "ticket"} link on this entry, so no button renders.` };
  }
  if (!/^https:\/\//i.test(url)) return { patch: {}, why: "a link has to start with https://" };
  const gate = k === TOUR ? isTour : isBookable;
  let ok = false;
  try { ok = typeof gate === "function" && !!gate(url); } catch { ok = false; }
  if (!ok) {
    return { patch: {}, why: k === TOUR
      ? `${host(url) || "that link"} is not a GetYourGuide tour page, so it would render nothing. Paste the product page rather than a search or a city listing.`
      : `${host(url) || "that link"} is not a bookable product page, so it would render nothing. Paste the ticket's own page rather than a search or a category.` };
  }
  if (url === was) return { patch: {}, why: "that is already what the row carries" };
  return { patch: { [field]: url }, why: `Saved. ${host(url)} is live on this entry.` };
};
