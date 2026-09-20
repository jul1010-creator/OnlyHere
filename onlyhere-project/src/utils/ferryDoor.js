// ── THE BOAT IS THE PART OF AN ISLAND TRIP THAT BREAKS ──────────────
//
// Oliver, 20 Sep 2026: "Do you think it would be an idea to have all the
// 'private ferrys' put as links that the guide has to go through. Like sejerø
// færgen has to be gone through when sejerø is put on the guide?" And then,
// naming what the link should be: "Like its website".
//
// MEASURED BEFORE BUILDING, over the 15 published islands:
//
//   15 of 15 carry the operator's NAME
//   12 of 15 carry a crossing glance
//    0 of 15 carry the operator's own LINK
//
// So Gemlyx can tell somebody the boat is run by Sejerøbugtens Færger and
// cannot send them to it. The research already goes there: STUDIO_VOICE makes
// the operator's own site mandatory for every ferry fact and says outright
// that it outranks tourist boards and aggregators. It reads the page, takes
// the crossing time, and throws the address away.
//
// What is in __sources instead is the tell. Sejerø's three are VisitDenmark, a
// German boating magazine, and sejero.dk's history page. Endelave and Askø
// happen to carry their operator's site, by luck rather than by rule.
//
// ── WHY THIS IS A GATE AND NOT A BUTTON ─────────────────────────────
//
// An island day with no crossing on it is broken in the same way a night with
// no bed is broken. The traveller does not know the car has to be booked days
// ahead in July, does not know there are four sailings rather than forty, and
// does not know that missing the last one means staying the night on an island
// with three hundred people. None of that is a question anybody thinks to ask,
// which is exactly why the guide has to say it unprompted.
//
// AND IT IS NOT AN AFFILIATE. Worth writing down so nobody later mistakes it
// for one: Sejerøbugtens Færger, Lolland Færgefart, Endelave Færgefart and
// Ø-Færgen are municipal. They have no programme and will never have one. The
// only commercial operator on the published list is Molslinjen. This link
// exists because the guide is wrong without it.
import { isNeverOwnSite } from "./sourcePolicy";
// The one hostOf in the utils, and the suite enforces that there is only one.
// A second reader of the same string is how two parts of an app come to
// disagree about what a host is, which this file would have done on the www.
import { hostOf } from "./pageScan";
import { timetableFerryUrl, RP_CREDIT } from "../data/ferryRoutes";

const clean = (v) => String(v == null ? "" : v).trim();

// ── THE OPERATOR'S OWN SITE, AND NOTHING WEARING ITS COAT ───────────
//
// The same question sourcePolicy asks about an entry's official site, asked
// here because this is the one link in the app where being sent to the wrong
// page costs a day rather than a click. A tourist board's page about the
// crossing carries last season's timetable and no booking flow, and it is the
// page a search returns first.
//
// https ONLY, and that is not pedantry on a booking form: half these operators
// run a payment flow on the other end of it.
export const isOperatorSite = (url) => {
  const raw = clean(url);
  if (!/^https:\/\//i.test(raw)) return false;
  const h = String(hostOf(raw) || "").replace(/^www\./i, "").toLowerCase();
  if (!h) return false;
  // VisitDenmark, a destination company, TripAdvisor, a ferry aggregator.
  // directferries is on that list by name, which is the one this would have
  // been most likely to collect.
  if (isNeverOwnSite(raw)) return false;
  // Nor a social account standing in for a website. A Facebook page can be the
  // only thing a village has, and it is never a timetable.
  if (/^(?:facebook|instagram|twitter|x|youtube|linkedin)\.com$/.test(h)) return false;
  return true;
};

// ── WHAT AN ISLAND STILL OWES ───────────────────────────────────────
//
// Read off a published island row, in the shape auditEntry already uses, so a
// founder meets it in the tray with everything else rather than in a new
// screen. Critical, because a published island that cannot say how to reach it
// is the one gap on this type that costs a traveller a day.
export const ferryProblems = (payload = {}) => {
  const out = [];
  const operator = clean(payload.ferryOperator);
  const url = clean(payload.ferryUrl);
  const bridged = !!clean(payload.fixedLink);
  // A bridged island is reached by road and owes nothing here. Falster and
  // Amager are islands and nobody books a boat to them.
  if (bridged) return out;
  if (!operator) {
    out.push({ severity: "critical", field: "ferryOperator", detail: "No operator named, so the guide cannot say who runs the crossing or send anybody to it." });
  }
  if (!url) {
    // ── UNLESS THE NATIONAL TIMETABLE HAS IT ────────────────────
    // Four of the fifteen are in Rejseplanen's open feed with the operator's
    // own address attached, so demanding the field by hand on those would be
    // reporting a gap that is already filled. Named as a low note rather than
    // passed in silence, because a founder should know which link a reader is
    // getting. See data/ferryRoutes.js.
    const fromFeed = timetableFerryUrl(payload?.name);
    if (isOperatorSite(fromFeed)) {
      out.push({ severity: "low", field: "ferryUrl", detail: `No link on the row, so readers get ${fromFeed} from Rejseplanen's own timetable data. A booking or timetable page for this crossing would be better and would take precedence.` });
    } else {
      out.push({ severity: "critical", field: "ferryUrl", detail: `No link to ${operator || "the operator"}'s own site. The crossing is the part of an island trip that strands people, and a guide that names a boat it cannot link to has told somebody half of what they need.` });
    }
  } else if (!isOperatorSite(url)) {
    out.push({ severity: "critical", field: "ferryUrl", detail: `${url} is not the operator's own site. A tourist board or an aggregator carries last season's timetable and no booking, which is worse here than no link at all.` });
  }
  if (!clean(payload.ferryFrom) || !clean(payload.ferryTo)) {
    out.push({ severity: "high", field: "ferryFrom", detail: "The crossing does not name both ports. One island often has routes from two parts of the country, and naming the wrong one costs a drive across Denmark." });
  }
  return out;
};

// ── AND FOUR OF THEM THE NATIONAL TIMETABLE ALREADY ANSWERS ─────────
//
// 20 Sep 2026. Rejseplanen's open GTFS carries thirteen boat routes, and four
// of Gemlyx's fifteen islands are among them: Samsø, Bornholm, Ærø and Læsø.
// Each comes with the operator's own address in agency.txt, which is the exact
// field this file asks for and which was otherwise going to be researched by
// hand fifteen times.
//
// THE ROW'S OWN LINK ALWAYS WINS. A founder who has put the operator's
// booking page on the island has chosen a better page than a national
// timetable's front door, and this is a floor rather than an override. It is
// also why the credit rides with it: CC BY 4.0 asks for the source named
// wherever the data reaches a reader. See data/ferryRoutes.js.
export const ferryUrlOf = (payload = {}) => {
  const own = clean(payload?.ferryUrl);
  if (isOperatorSite(own)) return { url: own, fromTimetable: false, credit: "" };
  const fromFeed = timetableFerryUrl(payload?.name);
  if (isOperatorSite(fromFeed)) return { url: fromFeed, fromTimetable: true, credit: RP_CREDIT };
  return { url: "", fromTimetable: false, credit: "" };
};

export const hasFerryDoor = (payload = {}) =>
  !!clean(payload?.fixedLink) || (!!clean(payload?.ferryOperator) && !!ferryUrlOf(payload).url);

// ── AND WHAT THE READER IS TOLD, ON THE DAY THEY CROSS ──────────────
//
// One line, on the day the island is reached, naming the operator and the two
// ports. The link is the operator's own, so it is a door rather than a
// citation: the timetable and the booking are both behind it and both change.
//
// NOTHING IS PROMISED ABOUT TIMES. The crossing glance is whatever the
// operator's own page said on the day it was read, and a sailing time printed
// from a February research run is the quiet lie this app keeps refusing to
// tell. The line points at the page that is right today.
export const ferryLine = (island, lang = "en") => {
  const da = String(lang || "").toLowerCase().startsWith("da");
  const name = clean(island?.name);
  const operator = clean(island?.ferryOperator);
  const from = clean(island?.ferryFrom);
  const to = clean(island?.ferryTo);
  if (!operator || !name) return "";
  const route = from && to ? (da ? ` fra ${from} til ${to}` : ` from ${from} to ${to}`) : "";
  return da
    ? `${name} nås kun med færge${route}, og den sejler ${operator}. Tjek afgangene på deres egen side, og book i forvejen hvis du har bil med.`
    : `${name} is reached only by ferry${route}, run by ${operator}. Check the sailings on their own page, and book ahead if you are bringing a car.`;
};

// ── AND WHAT THE WRITER IS TOLD ─────────────────────────────────────
//
// The crossing goes in the guide because it is the day's hardest constraint,
// not because it is interesting. This block is the instruction, and the two
// refusals in it are the ones a model reaches for first: inventing a sailing
// time, and promising there is room.
export const crossingBlock = (islands = []) => {
  const list = (Array.isArray(islands) ? islands : []).filter(i => clean(i?.name) && clean(i?.ferryOperator));
  if (!list.length) return "";
  const lines = list.map(i => {
    const route = clean(i.ferryFrom) && clean(i.ferryTo) ? `${clean(i.ferryFrom)} to ${clean(i.ferryTo)}` : "route not recorded";
    return `  ${clean(i.name)}: ${clean(i.ferryOperator)}, ${route}${clean(i.crossingGlance) ? `. ${clean(i.crossingGlance)}` : ""}`;
  }).join("\n");
  return `── THE CROSSINGS THIS TRIP DEPENDS ON ──\n${lines}\n`
    + `SAY THE CROSSING ON THE DAY IT HAPPENS, naming the operator and both ports, because it is the one thing on that day that can go wrong in a way nothing later can fix. `
    + `Say that a car needs booking ahead. NEVER WRITE A SAILING TIME, a frequency or a price: those come off the operator's own page, they change by season, and the reader is being sent to that page. `
    + `Never say there is room, never say it runs daily, and never call it a short hop unless the line above says so in those words.`;
};

// The sentence the entry page can carry under the operator's name. Short,
// because the link beside it is the thing doing the work.
export const FERRY_DOOR_LABEL = (operator) => `Sailings and booking on ${clean(operator) || "the operator"}'s own site`;
