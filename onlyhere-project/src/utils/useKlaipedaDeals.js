// ── KLAIPĖDA'S DEALS, LOADED ONCE, FOR EVERY PAGE THAT SHOWS THEM ────
//
// Moved out of pages/KlaipedaDemo.jsx on 13 Oct 2026, when the deals became
// the Explore page of /lithuania as well as the QR page (Oliver: "let the
// Klaipėda deals be the explore page"). One loader, so both pages always show
// the same deals.
//
// The made-up partners, marked Example, until the first real Klaipėda deal is
// live, and also when the published rows cannot be read, rather than an empty
// first screen.
import { useEffect, useState } from "react";
import { ensureLiveContentLoaded } from "./liveContent";
import { events, majorEvents, calendarEvents } from "../data/events";
import { freeEntrance } from "../data/freeEntrance";
import { foodSpots } from "../data/food";
import { nightlifeSpots } from "../data/nightlife";
import { shops } from "../data/shops";
import { towns } from "../data/towns";
import { livePromotions } from "./promotions";
import { eventOnDays } from "./eventWhen";
import { rowCountry } from "./countries";
import { examplePromotionPools } from "../data/klaipedaExamples";

export const useKlaipedaDeals = (today) => {
  const [live, setLive] = useState({ onToday: [], deals: [], examples: false, ready: false });
  useEffect(() => {
    let gone = false;
    ensureLiveContentLoaded().then(() => {
      if (gone) return;
      const lt = (r) => rowCountry(r) === "LT";
      const onToday = today ? [...events, ...majorEvents, ...calendarEvents].filter(lt).filter(e => eventOnDays(e, [today])).slice(0, 6) : [];
      const real = livePromotions({ free: freeEntrance, food: foodSpots, nightlife: nightlifeSpots, shop: shops, town: towns, event: [...events, ...majorEvents] }).filter(lt);
      const examples = real.length === 0;
      setLive({ onToday, deals: examples ? livePromotions(examplePromotionPools()) : real, examples, ready: true });
    }).catch(() => {
      if (!gone) setLive({ onToday: [], deals: livePromotions(examplePromotionPools()), examples: true, ready: true });
    });
    return () => { gone = true; };
  }, [today]);
  return live;
};
