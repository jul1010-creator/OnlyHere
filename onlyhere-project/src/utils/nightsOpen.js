// ── ONE VOICE FOR THE BEDS ──────────────────────────────────────────
//
// Oliver's own guide, tbfeb7jemku, read on 19 Sep 2026. Two blocks, one screen,
// on a trip where he had told the chat he already had a room:
//
//   TO ARRANGE      Somewhere to sleep
//                   3 nights in the plan with no bed booked yet.
//
//   KEEP IN MIND    This plan does not know which of the three nights your
//                   booking covers.
//
// Neither line is a mistake on its own. The first is costLedger counting days
// that carry a where-to-stay sentence. The second is the writer doing exactly
// what App.jsx told it to do when a booking exists and nobody asked for the
// dates. Two readers of one slot, each correct, contradicting each other in
// front of the traveller, who now has to decide which half of his own guide to
// believe.
//
// ── AND THE NIGHT AFTER THEY DRIVE HOME ─────────────────────────────
//
// The same guide, three days long, offered a hotel in Esbjerg on day 3. There
// is no night 3: the trip is over. Every reader of the stay slot had the same
// off-by-one, because every one of them counted DAYS and a bed is a NIGHT, and
// the last day of a trip does not have one.
//
// A trip of N days holds N minus 1 nights, numbered by the day they BEGIN on:
// night 1 is the evening of day 1. A one-day trip holds none. That is the whole
// arithmetic, and it lives here so that the cost row, the book-ahead list, the
// day card and the writer's prompt cannot each hold their own version of it.

// The nights a plan of this many days contains, as day numbers.
export const nightsIn = (dayCount) => {
  const n = Math.max(0, Math.floor(Number(dayCount) || 0));
  return n > 1 ? Array.from({ length: n - 1 }, (_, i) => i + 1) : [];
};

// ── THE ONE ANSWER ──────────────────────────────────────────────────
//
// `booked` is bookedDayNumbers from the brief, already resolved against the
// real day count. `hasBooking` is the brief's stay slot saying a bed exists,
// with or without dates, because those are two different states and only one of
// them can be counted:
//
//   no booking          every night is open, and the count is honest
//   booking, dated      the nights not in the list are open
//   booking, undated    NOTHING is open, because nobody knows which nights are
//                       covered, and a number printed here would be a guess
//                       dressed as a count
//
// `unknown` is that third state, and it is the one the cost row was getting
// wrong. It is reported rather than resolved: the fix for it is asking the
// traveller, not picking a likely answer.
export const bedState = ({ dayCount = 0, booked = [], hasBooking = false } = {}) => {
  const nights = nightsIn(dayCount);
  const inPlan = new Set(nights);
  const bookedNights = [...new Set(
    (Array.isArray(booked) ? booked : []).map(d => Math.floor(Number(d))).filter(d => inPlan.has(d))
  )].sort((a, b) => a - b);
  // A booking whose nights nobody knows. Only when there is a trip to not know
  // about: a plan with no nights in it has nothing to be uncertain over.
  const unknown = !!hasBooking && bookedNights.length === 0 && nights.length > 0;
  return {
    nights,
    booked: bookedNights,
    open: unknown ? [] : nights.filter(d => !bookedNights.includes(d)),
    unknown,
  };
};

// ── THE ONE QUESTION A DAY CARD ASKS ────────────────────────────────
//
// Not "is this night open", which would hide every card on an undated booking
// and leave the keep-in-mind line pointing at nothing. It is "could this night
// still need a bed": the last day cannot, a night we KNOW is booked cannot, and
// an undated booking leaves all of them able to, which is why the writer is
// told to say so in as many words.
export const needsABed = (dayNo, state) => {
  const n = Math.floor(Number(dayNo));
  if (!state || !Number.isFinite(n)) return false;
  return (state.nights || []).includes(n) && !(state.booked || []).includes(n);
};

// ── AND WHAT THE COST ROW SAYS ──────────────────────────────────────
//
// Here rather than in costLedger, because the contradiction was two files each
// writing their own sentence about one fact. An empty string means no row: a
// trip with every night booked has nothing to arrange, and a labelled row
// saying zero is the padding the costs list was cleaned of on 19 Sep.
//
// The area, because the plan chose it and a reader budgeting for a bed wants to
// know where. NOT a sentence about what the link does: his standing rule is
// that nothing explains a control to a reader, and the button's own label
// already says where it goes.
export const openNightsLine = (state, area = "") => {
  const where = String(area || "").trim() ? ` The plan puts you in ${String(area).trim()}.` : "";
  if (!state) return "";
  if (state.unknown) {
    return `Your booking covers part of this trip and the plan does not know which nights, so the nights it does not cover are still open.${where}`;
  }
  const n = (state.open || []).length;
  if (!n) return "";
  return `${n} night${n === 1 ? "" : "s"} in the plan with no bed booked yet.${where}`;
};

// ── READ OFF A FINISHED GUIDE ───────────────────────────────────────
//
// The booking facts are carried onto the guide as `_stay` at build time, beside
// `_constraints`, for the same reason that object is: the surfaces that draw a
// guide are not the surface that had the conversation, and a guide reopened
// tomorrow has no chat to read. A guide built before `_stay` existed simply has
// no booking, which is what every guide in the wild had anyway.
export const bedStateOf = (guide) => bedState({
  dayCount: Array.isArray(guide?.days) ? guide.days.length : 0,
  booked: guide?._stay?.nights || [],
  hasBooking: !!guide?._stay?.booked,
});
