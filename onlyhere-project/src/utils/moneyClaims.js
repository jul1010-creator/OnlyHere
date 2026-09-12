// ── THE GUIDE CONTRADICTED ITSELF ABOUT MONEY, ON ONE PAGE ──────────
//
// Read off Oliver's own live guide, gemlyxtravel.com/guide/4spg73sj883, on the
// night of 11 September 2026. Three separate money failures, all of them
// visible to a reader who scrolls:
//
//   Day 3 prose        "the National Museum is free to enter"
//   WHAT YOU PAY       "National Museum · 150 kr · Day 3"
//
//   Day 5 prose        "hostels here run around 20-30 per night"
//                      No currency. In kroner that is two pounds a night.
//
//   Day 9 prose        "hotels start around 44 DKK per night"
//                      Not a price anybody in Denmark has ever paid.
//
// The first one is the interesting one, because NOTHING IN THE APP WAS WRONG.
// The row holds a real 150-kroner figure read off a real page on a real date,
// and the costs list printed it correctly. The writer wrote a sentence. Two
// correct components, one page, opposite answers, and every gate in this
// project reads one field at a time — which is the same shape as
// closedButPlanned in journey.js, and that comment says it plainly: "the
// warning and the plan are different fields".
//
// So this file asks the questions that need two fields at once.
//
// ── AND IT AGREES WITH THE LEDGER BY CONSTRUCTION ───────────────────
//
// "The costs list charges for this" is not re-derived here from the row's
// fields. It is asked of readPrice and normaliseTicketStatus, which are the two
// functions entryLine itself calls to decide what that panel prints. A second
// opinion about what the ledger says is a second thing to keep in sync, and
// this repo's signature bug is one hand-written list copied and only some
// copies fixed.
import { sentences } from "./journey";
import { readPrice } from "./costLedger";
import { normaliseTicketStatus } from "./tickets";
import { SAYS_FREE, AMOUNT, CONCESSION_SCOPE, entryPrice } from "./entryPrice";

const short = (s, n = 90) => {
  const t = String(s || "").trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

// ── A FREE CLAIM HAS TO BE ABOUT THE DOOR ───────────────────────────
//
// An entry price buys GETTING IN, so only a free claim about getting in can
// contradict one. A stop note is three or four sentences about a place and any
// of them may honestly contain the word free: the coffee refills, the harbour
// walk outside, the view from the bridge, the first Wednesday of the month at
// the gallery next door. Flagging those would put a false line in the build
// report on nearly every guide, and a check that cries wolf is a check Oliver
// turns off inside a week — journey.js says exactly that about CLOSURE_HEDGED.
//
// Danish included, for the same reason SAYS_FREE carries Danish: the research
// is Danish and a note written for a Danish reader has to be checkable too.
const ABOUT_THE_DOOR = /\b(?:enter|entering|entry|entrance|admission|admitted|admits|get\s+in|getting\s+in|go\s+in|going\s+in|walk\s+in|walking\s+in|walk\s+into|walking\s+into|wander\s+in|step\s+inside|visit|visiting|adgang|entr[ée]|komme\s+ind|g[åa]\s+ind)\b/i;

// ── WHAT THE APP HOLDS ABOUT PAYING TO GET IN ───────────────────────
//
// Two different answers, and they are reported differently because a reader
// meets them in two different places.
//
//   LEDGER   readPrice + status is exactly what entryLine asks before it prints
//            a figure in WHAT YOU PAY. When this says a price, the traveller is
//            looking at a sentence saying free and a panel saying 150 kr, on
//            one screen, and has to pick.
//
//   ROW      entryPrice reads the place's own ticket line. When that names an
//            amount and the guide says free, the contradiction is between the
//            guide and the place page rather than inside the guide — quieter,
//            and still wrong.
//
// Asked in that order, because the loud one is the one worth naming first.
const paidHow = (row) => {
  const ledger = normaliseTicketStatus(row?.ticketStatus) === "free" ? null : readPrice(row);
  if (ledger?.text) return { where: "ledger", says: ledger.text };
  const own = entryPrice(row);
  if (own.free === false && own.says) return { where: "row", says: short(own.says, 60) };
  return null;
};

// ── THE CHECK ───────────────────────────────────────────────────────
//
// Per stop rather than per prose field, and that is not a detail: the note
// hanging off a stop is the guide talking about THAT place, so the sentence and
// the price are about the same subject without anything having to match a name.
// closedButPlanned has to hunt stop names through the essentials because a
// closure warning can be written anywhere; a free claim about a stop is written
// on the stop.
//
// ONE LINE PER STOP. A note that says free twice is one mistake.
export const freeButPriced = (guide, rowFor) => {
  const days = Array.isArray(guide?.days) ? guide.days : [];
  const lookup = typeof rowFor === "function" ? rowFor : () => null;
  const out = [];
  days.forEach((d, di) => {
    const dayNo = d?.day || di + 1;
    (Array.isArray(d?.stops) ? d.stops : []).forEach((s) => {
      const name = String(s?.name || "").trim();
      const note = String(s?.note || "").trim();
      if (!name || !note) return;
      const row = lookup(name);
      if (!row) return;
      const paid = paidHow(row);
      if (!paid) return;
      for (const sentence of sentences(note)) {
        if (!SAYS_FREE.test(sentence)) continue;
        // It priced it in the same breath. "Free for under-18s, 150 DKK
        // otherwise" is the honest sentence and contradicts nothing.
        if (AMOUNT.test(sentence)) continue;
        // Free for children is not free. Same rule, same words and the same
        // reasoning as isUnqualifiedFree, which is why the pattern is imported
        // rather than written again here.
        if (CONCESSION_SCOPE.test(sentence)) continue;
        if (!ABOUT_THE_DOOR.test(sentence)) continue;
        out.push(paid.where === "ledger"
          ? `day ${dayNo}, ${name}: the guide says "${short(sentence)}" and its own costs list charges ${paid.says} for the same stop. One of the two is wrong and the reader has to pick.`
          : `day ${dayNo}, ${name}: the guide says "${short(sentence)}" and this place's ticket line says ${paid.says}. Either the sentence is wrong or the row is out of date.`);
        break;
      }
    });
  });
  return [...new Set(out)];
};

// ── A NUMBER WITH NO CURRENCY ON IT IS NOT A PRICE ──────────────────
//
// "hostels here run around 20-30 per night" is unreadable, and worse than
// unreadable: a reader in a country whose money is 7.5 to the euro will read it
// as euros and book accordingly. entryPrice.js already states the rule from the
// other side — "A bare number is never a price" — and refuses to READ one. This
// refuses to SHIP one.
//
// Anchored on the per-unit phrase rather than on a cost verb, and that is the
// whole precision of it. "the tour runs about 90 minutes" and "open 10 to 17"
// and "a 20 minute walk" all sail past a cost-verb test, and every one of them
// is a real sentence in a real guide. A figure with "per night" or "a head"
// welded to its right-hand side is money or it is nothing.
const MONEY_UNIT = "night|nights|person|persons|people|head|adult|adults|guest|guests|day|days|ticket|tickets|meal|meals|room|rooms|bed|beds";
const BARE_PER_UNIT = new RegExp(`(?:^|[^\\d.,])(\\d[\\d.,]*(?:\\s*(?:to|–|—|-)\\s*\\d[\\d.,]*)?)\\s*(?:per|a|each|pr\\.?)\\s+(?:${MONEY_UNIT})\\b`, "i");

// AND the sentence has to be ABOUT money, which is the second half of the guard.
// "two per person" in a sentence about how many museums to do in a day is not a
// price, and the per-unit phrase alone cannot tell the difference.
const MONEY_TALK = /\b(?:cost|costs|price[sd]?|pay|paying|paid|budget|spend|spending|charge[sd]?|cheap|cheaper|expensive|afford|hostel|hostels|hotel|hotels|dorm|dorms|guesthouse|b&b|airbnb|room|rooms|bed|beds|stay|stays|fare|fares|ticket|tickets|entry|entrance|admission|meal|meals|dinner|lunch|breakfast|beer|coffee|kroner|krone)\b/i;

// A currency anywhere in the sentence settles it. "Entry is 95 DKK and the
// locker is 20 per person" is a compound sentence a reader can finish, and
// flagging it would be pedantry — the direction this file errs in is the same
// one entryPrice errs in, which is to say nothing rather than the wrong thing.
const HAS_CURRENCY = /\b(?:dkk|kr\.?|kroner|krone|eur|euros?|usd|dollars?|gbp|pounds?)\b|[€$£]/i;

// ── AND A PRICE NOBODY HAS EVER PAID ────────────────────────────────
//
// "hotels start around 44 DKK per night". Nothing in this country with a roof
// and a door sleeps anyone for 44 kroner. The floor is 100 rather than a
// realistic 200 deliberately: a campsite pitch is about 120 and a shelter is
// free, so a floor set where a hostel bed actually starts would flag honest
// sentences about camping, and this file would rather miss a bad figure than
// print a bad flag.
export const LODGING_FLOOR_DKK = 100;
const PER_NIGHT_DKK = /(\d[\d.,]*)(?:\s*(?:to|–|—|-)\s*\d[\d.,]*)?\s*(?:dkk|kr\.?|kroner)\s*(?:per|a)\s+night/i;
// A BED, not a night. The first draft had "night" in this list, which made the
// per-night phrase qualify as its own evidence: "Parking at the harbour is 90 kr
// per night" came back as a bed in Denmark at 90 kroner. The suite caught it.
// The figure is only a lodging figure when the sentence says what is being
// slept in.
const NIGHTLY = /\b(?:hotel|hotels|hostel|hostels|dorm|dorms|room|rooms|bed|beds|guesthouse|b&b|apartment|apartments|cabin|cabins|stay|stays|sleep|sleeping)\b/i;

const figure = (s) => {
  // 1.200 and 1,200 are both twelve hundred in the two conventions this guide
  // is written across, and neither is 1.2. Separators come out; nothing here
  // ever needs a decimal, because no attraction in Denmark charges 99.50.
  const n = Number(String(s || "").replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Prose fields in, problems out. Takes the same { id, text } list
// collectGuideProseFields already builds and closedButPlanned already reads, so
// the build report can call all three off one collection.
export const moneyProblems = (fields) => {
  const out = [];
  for (const f of Array.isArray(fields) ? fields : []) {
    const id = f?.id || "field";
    const text = String(f?.text || "");
    if (!text.trim()) continue;
    for (const sentence of sentences(text)) {
      const bare = !HAS_CURRENCY.test(sentence) && MONEY_TALK.test(sentence) && BARE_PER_UNIT.exec(sentence);
      if (bare) {
        out.push(`${id}: "${short(sentence)}" prices something with no currency on it. A reader cannot tell ${bare[1]} kroner from ${bare[1]} euros, and the two are seven and a half times apart.`);
      }
      if (!NIGHTLY.test(sentence)) continue;
      const low = PER_NIGHT_DKK.exec(sentence);
      const amount = low && figure(low[1]);
      if (amount != null && amount > 0 && amount < LODGING_FLOOR_DKK) {
        out.push(`${id}: "${short(sentence)}" puts a bed in Denmark at ${amount} kroner a night. Nothing with a roof costs that. Take the figure out rather than correct it.`);
      }
    }
  }
  return [...new Set(out)];
};
