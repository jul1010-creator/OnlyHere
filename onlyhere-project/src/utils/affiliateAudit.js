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

// ── ONE ROW, ANSWERED ───────────────────────────────────────────────
//
// `isBookable` and `agentOf` are injected from utils/ticketLink.js rather than
// imported, for the reason every other audit in this codebase gives: a second
// copy of the judgement drifts the first time either is touched.
export const auditRow = (row, { isBookable, agentOf, wrap } = {}) => {
  const p = row?.payload || row || {};
  const name = clean(p.name) || clean(row?.name) || "(unnamed)";
  const dest = ticketDestination(row);
  if (!dest) return { name, state: "none", why: "no ticket link on this row at all" };

  let bookable = false;
  try { bookable = typeof isBookable === "function" && !!isBookable(dest); } catch { bookable = false; }
  const agent = (() => { try { return typeof agentOf === "function" ? clean(agentOf(dest)) : ""; } catch { return ""; } })();

  if (!bookable) {
    // THE WORK QUEUE. The pipeline found something and the gate refused it, so
    // the row is one hand-edit from earning.
    return { name, state: "refused", url: dest, host: host(dest), why: `${host(dest) || "that link"} is not a product page, so no button renders` };
  }
  // Wrapped or bare: a bookable URL with no template configured still reaches
  // the tickets and still earns nothing, and the difference is invisible on the
  // page because the button looks the same.
  let wrapped = "";
  try { wrapped = typeof wrap === "function" ? clean(wrap(dest)) : ""; } catch { wrapped = ""; }
  const earning = !!wrapped && wrapped !== dest;
  return {
    name, state: earning ? "earning" : "bookable-unwrapped", url: dest, host: host(dest), agent,
    why: earning ? `wrapped through ${host(wrapped)}` : "a real product page, but no affiliate template is configured for this agent, so the click earns nothing",
  };
};

export const auditRows = (rows, opts) => (Array.isArray(rows) ? rows : []).map(r => auditRow(r, opts)).filter(Boolean);

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
export const programmeState = ({ tiqetsTemplate, tiqetsBrowse, ticketmasterTemplate, bookingId, carRental, wegotrip, wegotripTemplate } = {}) => [
  { name: "Tiqets", what: "attraction tickets, deep link", on: !!clean(tiqetsTemplate),
    note: clean(tiqetsTemplate) ? "live on every row with a Tiqets product page" : "no template, so Tiqets product pages render a button that earns nothing" },
  { name: "Tiqets browse", what: "one generic button per guide", on: !!clean(tiqetsBrowse),
    note: clean(tiqetsBrowse) ? "live in the guide's tickets block" : "no browse link configured" },
  { name: "Ticketmaster", what: "event tickets, deep link", on: !!clean(ticketmasterTemplate),
    note: clean(ticketmasterTemplate) ? "live on every row with a Ticketmaster event page" : "no template configured" },
  { name: "Booking.com", what: "stays", on: !!clean(bookingId),
    note: clean(bookingId) ? "aid appended to every stay link" : "no id, so every stay link is a plain search and the disclosure says so" },
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
  { name: "Car hire", what: "rentals", on: !!clean(carRental),
    note: clean(carRental) ? "AutoEurope, real Danish inventory at 9 airports. Only renders on a trip the traveller said is a driving one" : "empty: the link on hand had no Danish inventory, and a button that opens on an empty result costs more than the commission pays" },
];
