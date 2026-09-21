// ── "USE OUR AFFILIATES (OPTIONAL)" ─────────────────────────────────
//
// Oliver, 21 Sep 2026, of guide z8f8otncrz2, after "it has become much more
// commercial than actual guide":
//
//   "Make a 'use our affiliates (optional)' and make it something clickable.
//    When you click it, it then pops out into the side of the panel."
//
// So every paid door on a guide lives in ONE place, a side panel the reader
// opens on purpose, and the guide itself reads as a guide. Counted on that
// guide before the change: five paid buttons before Day 1, a Booking button
// on six of seven stay cards, and a GetYourGuide line on two days, each with
// its own sentence about commission.
//
// ── NOTHING IS LOST, ONLY MOVED ─────────────────────────────────────
//
// Every door the page drew still exists, in the panel, grouped by what it is
// for and labelled with the day or the nights it belongs to, because a list
// of buttons with no reason next to them is exactly the advertisement page
// this replaces. The stay card keeps a way in to it, so a guide with a night
// in it still shows a way to book that night: the standing rule from 7 Aug
// 2026 ("why does the accommodation/booking affiliation keep getting
// removed") is kept by the opener, not by a button to Booking on every card.
//
// Pure: the page prepares the stays and hands in the cost lines and the tours,
// and this decides what the panel says, so it can be asserted without a
// browser.
import { COST_KIND, costAction } from "./costLedger";
import { nightsLabel } from "./stayDoors";

// Worded "partners" rather than "affiliates" on 21 Sep 2026, the same day:
// "affiliates" is a word from the other side of the link, and a traveller
// reads "partners" as what it is. Oliver: "Also sounds more professionel."
export const PARTNER_OPENER = "Book through our partners (optional)";

export const PARTNER_INTRO = "Nothing here is needed to use the guide. These are the places you can book what it plans, if you want to do it in one go.";

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

// `stays`: [{ place, nights: [1,2,3], door: { href, label }, featured: { merchant, href } | null, compare: href | "" }]
// `lines`: the guide's cost lines, the same ones What you pay prices.
// `tours`: [{ day, url, label }]
// `bikes`: [{ url, label, days: [2, 3] }]
export const partnerSections = ({ stays = [], lines = [], tours = [], bikes = [] } = {}) => {
  const out = [];

  const rooms = [];
  for (const s of Array.isArray(stays) ? stays : []) {
    const when = nightsLabel(s?.nights);
    const place = clean(s?.place);
    if (s?.featured?.href) {
      rooms.push({ title: clean(s.featured.merchant), detail: [place, when].filter(Boolean).join(", "), href: s.featured.href, label: "See the hotel" });
    }
    if (s?.door?.href) {
      rooms.push({ title: place || "Somewhere to sleep", detail: when, href: s.door.href, label: clean(s.door.label) || costAction(COST_KIND.STAY) });
    }
    if (s?.compare) {
      rooms.push({ title: "Compare prices", detail: place ? `Hotels around ${place} on Trip.com` : "Hotels on Trip.com", href: s.compare, label: "Compare on Trip.com" });
    }
  }
  if (rooms.length) out.push({ key: "stay", title: "Somewhere to sleep", items: rooms });

  const doors = (Array.isArray(lines) ? lines : []).filter(l => l?.href && !l.refused && l.kind !== COST_KIND.STAY);
  const tickets = doors
    .filter(l => l.kind === COST_KIND.ENTRY || l.kind === COST_KIND.EVENT)
    .map(l => ({ title: clean(l.name), detail: [l.day ? `Day ${l.day}` : "", clean(l.price)].filter(Boolean).join(", "), href: l.href, label: costAction(l.kind), day: Number(l.day) || 0 }))
    .sort((a, b) => a.day - b.day);
  if (tickets.length) out.push({ key: "tickets", title: "Tickets", items: tickets });

  const travel = doors
    .filter(l => l.kind === COST_KIND.CAR || l.kind === COST_KIND.TRANSPORT || l.kind === COST_KIND.FERRY)
    .map(l => ({ title: clean(l.name), detail: clean(l.forWhat), href: l.href, label: costAction(l.kind) }));
  for (const b of Array.isArray(bikes) ? bikes : []) {
    if (!b?.url) continue;
    const ds = (b.days || []).map(Number).filter(Boolean);
    travel.push({ title: clean(b.label) || "Bike rental", detail: ds.length ? `The ${ds.length === 1 ? "day" : "days"} you are on a bike: ${ds.map(n => `day ${n}`).join(", ")}` : "", href: b.url, label: "Rent a bike" });
  }
  if (travel.length) out.push({ key: "travel", title: "Getting around", items: travel });

  const walks = [
    ...doors.filter(l => l.kind === COST_KIND.AUDIO).map(l => ({ title: clean(l.name), detail: l.day ? `Day ${l.day}` : "", href: l.href, label: costAction(l.kind) })),
    ...(Array.isArray(tours) ? tours : []).filter(t => t?.url).map(t => ({ title: clean(t.label) || "A tour", detail: t.day ? `Day ${t.day}` : "", href: t.url, label: "See the tour" })),
  ];
  if (walks.length) out.push({ key: "tours", title: "Tours and walks", items: walks });

  return out;
};

export const partnerCount = (sections = []) =>
  (Array.isArray(sections) ? sections : []).reduce((n, s) => n + (s?.items?.length || 0), 0);
