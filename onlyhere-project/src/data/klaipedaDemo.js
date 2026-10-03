// ── KLAIPĖDA, THE FIRST PLACE OUTSIDE DENMARK ───────────────────────
//
// Oliver, 29 Sep 2026: a page for Klaipėda's tourism centre, at the address
// the QR codes carry. It held two walks written by hand until 2 Oct 2026,
// when he called them "ChatGPT crap" and asked for a system that mixes the
// places published in the Studio with the businesses that join. That system
// is utils/nowPlanner.js, and the walks are gone. What stays here is the
// address, the tips the tourism centre's own site gives, and Klaipėda's date.

// A literal path, so it wins over the /lithuania/:townSlug route.
export const KLAIPEDA_DEMO_PATH = "/lithuania/trips";

// ── WHAT A LOCAL WOULD TELL YOU ─────────────────────────────────────
export const LOCAL_TIPS = [
  { title: "Euro and cards", text: "Lithuania uses the euro, and cards work almost everywhere, including small cafés." },
  { title: "Buses", text: "Buy tickets in the e.Ticket Klaipėda app. It is cheaper than paying the driver." },
  { title: "Taxis", text: "Bolt works in Klaipėda, so you can order a car in the app and see the price first." },
  { title: "Talking sculptures", text: "Over ten sculptures and sights around town tell their own story when you scan the QR code beside them. Bring your phone and headphones." },
];

// Today as it is in Klaipėda, which is an hour ahead of Denmark. A visitor
// reading this at 23:30 in Copenhagen is already on tomorrow there.
export const todayInKlaipeda = (now = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const [y, m, d] = parts.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  } catch { /* fall through */ }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
