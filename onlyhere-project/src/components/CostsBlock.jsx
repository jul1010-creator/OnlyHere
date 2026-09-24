import { useState } from "react";
import { costLines, byUrgency, estimateFrom, describeEstimate, partyOf, partyFrom, describeGroup, costAction, bedsEstimate, tripEstimate, describeTrip, COST_KIND } from "../utils/costLedger";
import { FOOD_TIERS, FOOD_TIER_DEFAULT, tierCost, describeTier, tierDayRate, BUDGET_WARNING, MEALS_A_DAY_OPTIONS, MEALS_A_DAY_DEFAULT } from "../utils/mealsEstimate";
import { partnerDisclosure, outboundLink } from "../utils/affiliates";
import { tripDayDate } from "../utils/guideReading";

// ── "GIVE THEM A LIST OF WHAT THEY HAVE TO PAY FOR" ─────────────────
//
// Oliver, 26 Aug 2026, on the Tiqets browse row this replaces: "I'd rather you
// give them a list of what they have to pay for instead. Direct links. So
// Flixbus, attractions, events, etc. and also add what it is for."
//
// ── AND IT IS ITS OWN FILE SO IT CAN BE RENDERED ────────────────────
//
// It was written inline inside GuidePage's essentials block, which is 1,400
// lines into a component behind a router, three state hooks and a fetch. The
// suite could assert that costLines is CALLED there and could never ask what
// came out, which is the exact gap tests/render.mjs was built for after four
// features shipped green and completely broken, all four of them wiring
// failures.
//
// The same argument moved calendarExport into TripCalendarCard on 25 August and
// the change sheet into StopChangeSheet the same night, and it is the argument
// every time: A SURFACE THAT CANNOT BE RENDERED CANNOT BE CHECKED, and "what
// does the screen say" is the question this feature turns on. A costs list that
// silently renders nothing is indistinguishable, from the outside, from a trip
// with nothing to pay for.
//
// `rowFor` is injected rather than imported, so the test can hand it four rows
// instead of standing up the published set — and so this file cannot quietly
// start deciding WHICH places exist, which is costLedger's job and nobody
// else's. Everything the block decides lives in utils/costLedger.js; this is
// only the drawing of it.
// `doors` is FALSE on the guide since 21 Sep 2026. Oliver: "look at the
// affiliate links at the start.. we gotta somehow make it less direct.." The
// prices, the estimate and the list of things to arrange stay here; every
// button moved to the day it is used. See doorsByDay in utils/costLedger.js.
// The prop stays so a page that is ONLY a price list can still have them.
// `fuel` is computed by the page rather than here, because working it out needs
// the leg distances and this component has never known where anything is. See
// drivingLegs in pages/GuidePage.jsx and fuelCost in utils/fuel.js.
export const CostsBlock = ({ guide, C, rowFor, now = new Date(), doors = false, fuel = null, meals = null }) => {
  // ── AND WHICH WAY THEY EAT, WHICH ONLY THEY KNOW ──────────────────
  // Oliver, 24 Sep 2026: "make 3 options you can click on." The figure under
  // this used to assume one restaurant meal a day and say so in small print,
  // which is a guess wearing a disclosure. See utils/mealsEstimate.js.
  const [eatTier, setEatTier] = useState(FOOD_TIER_DEFAULT);
  // ── AND HOW OFTEN THEY EAT, WHICH MOVES IT MORE THAN THE TIER ─────
  // Oliver, 24 Sep 2026: "when I travel, I usually only eat twice a day. No
  // breakfast. Just lunch and dinner." Half again on every eating-out figure,
  // which is more than the gap between two of the tiers, and it had been an
  // assumption in a comment. One pair of buttons rather than a second row of
  // three: it applies to every tier at once. See utils/mealsEstimate.js.
  const [mealsADay, setMealsADay] = useState(MEALS_A_DAY_DEFAULT);
  const lines = byUrgency(costLines({
    guide,
    rowFor,
    dayDateFor: (n) => tripDayDate(guide?._arrivalDate, n),
    today: now,
    mode: guide?._mode || "",
    saidNoCar: !!guide?._onlyWalking,
  }));
  // Nothing rather than a labelled empty row. A trip with nothing to pay for is
  // a real trip and the block should not appear on it.
  if (!lines.length) return null;
// ── "EVERYTHING ELSE IS JUST A LONG LIST OF CHECK PRICES" ──
  //
  // Oliver, 19 Sep 2026, of a screenshot of his own guide: "look at the payment
  // thing. Estimated 250 kroner or smth, and everything else is just a long
  // list of check prices."
  //
  // He is describing one list doing two jobs. A museum with a figure on it and
  // a ferry whose fare depends on the sailing are both true rows, and they
  // answer different questions: one is money to budget, the other is a thing to
  // arrange. Printed together under a heading that says "What you pay", the
  // second kind reads as a failure to find prices, and the estimate reads as
  // the cost of a week in Denmark.
  //
  // So they are two lists with two headings, and the estimate sits under the
  // first one, where it covers everything above it and nothing below it. No
  // line is dropped: a ferry nobody can price is still a ferry they have to
  // catch, and that was never the complaint.
  const priced = lines.filter(l => String(l.price || "").trim());
  const toArrange = lines.filter(l => !String(l.price || "").trim());
  // ── AND THE DOOR, NOT THE STORED STRING ──────────
  // 18 Sep 2026, the day Booking.com started paying. Every other kind on this
  // list stores an already-tracked URL, so this block could draw l.href
  // directly. A stay line cannot: CJ tracking is added at render, so the stored
  // value is the plain search. Drawn as it was, the one paid link on the list
  // went out untracked, with rel="noreferrer", and l.partner was false so the
  // sentence at the bottom did not mention it.
  //
  // Asked of the door instead, which answers for all of them: a link that is
  // already tracked comes back unchanged, and the disclosure is read off the
  // same answer as the rel so the two cannot disagree.
  const partnered = doors ? lines.map(l => outboundLink(l.href)).filter(o => o.href && o.note).map(o => o.href) : [];
  const action = costAction;

  // One row, drawn the same way under either heading, because a reader should
  // not have to learn two layouts to read one block.
  const row = (l, i) => (
          <div key={`${l.kind}-${l.name}-${i}`} style={{ paddingTop: i ? 9 : 0, marginTop: i ? 9 : 0, borderTop: i ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{l.name}</span>
              {l.price && (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: l.price === "Free" ? C.light : C.gold }}>{l.price}</span>
              )}
            </div>
            {/* What it is for. The field that makes this a list rather than a
                row of logos, and the one Oliver asked for by name. */}
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>{l.forWhat}</div>
            {/* A REFUSED LINE IS STILL A LINE. Something sold out, cancelled or
                not running on their dates keeps its price and its place and
                loses only its checkout, because they still have to know it is
                there. See REFUSAL in utils/costLedger.js. */}
            {l.refused
              ? <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.5, marginTop: 3 }}>{l.refused}</div>
              : l.href && doors
                /* ── A BUTTON, BECAUSE IT WAS BEING READ AS A CAPTION ──
                   Oliver, 14 Sep 2026, relaying the first person to read one of
                   these guides who did not build the app: "the affiliate links
                   are quite small, according to my friend."
                   This is the same complaint as the stay links one block up and
                   it is fixed the same way, because it is the same class of
                   thing: 12px gold text with no background, no border and no
                   padding, sitting under a line of prose in a similar weight.
                   Every link in "What you pay" is the checkout for a line the
                   reader has already decided to pay for, and it was drawn as a
                   footnote.
                   Outlined rather than filled. He asked for "a bit", and this
                   block can hold six of them at once. */
                ? <a href={outboundLink(l.href).href || l.href} target="_blank" rel={outboundLink(l.href).rel}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, background: `${C.gold}1a`, border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                    {action(l.kind)} ↗
                  </a>
                : null}
            {/* The price came off a named page on a stamped day, so both travel
                with it. A figure nobody can check is a figure nobody should
                believe. */}
            {l.priceFrom?.host && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                {l.priceFrom.host}{l.priceFrom.at ? ` · checked ${l.priceFrom.at}` : ""}
              </div>
            )}
          </div>
  );

  // The whole-trip figure, drawn under the tickets estimate when there is one
  // and on its own when the tickets came to nothing, since free sights and a
  // priced bed are still a trip with a cost.
  // ── THE TWO HALVES, DRAWN APART ───────────────────────────────────
  //
  // Oliver, 24 Sep 2026: "make a 'inevitable prices' and under it 'budget
  // estimate'". The first attempt renamed the headings and went on summing
  // everything into one figure at the bottom, so the tickets were counted
  // under Inevitable and again inside the Budget estimate, and the petrol for
  // a route the plan chose sat in the half headed as the reader's own choices.
  // Caught by rendering the block and reading it as a traveller would, which
  // is the only thing that finds a total adding up perfectly to the wrong
  // question.
  const tripFor = (est) => {
    const party = partyFrom(guide?._party) || partyOf(guide?._travelers);
    return tripEstimate(est, bedsEstimate(guide), party, fuel);
  };
  const eatingFor = (trip) => tierCost(eatTier, {
    days: meals?.days || 0,
    heads: meals?.heads || trip?.heads || 1,
    meals: mealsADay,
  });
  const sum = (label, amount, lines, extra = null) => (
    <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.gold}44` }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", alignItems: "baseline" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{amount}</span>
      </div>
      {lines.map(t => <div key={t} style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>{t}</div>)}
      {extra}
    </div>
  );

  // What the plan forces: a ticket for a stop it chose, and the fuel to reach
  // it. Drawn at the foot of the priced list it is made of.
  const forcedTotal = (est) => {
    const trip = tripFor(est);
    if (!trip || !trip.forced) return null;
    // The same word as the heading above it. Two names for one section is how
    // a reader ends up thinking there are three lists.
    return sum("Inevitable in total", `from ${trip.forced} DKK`,
      describeTrip(trip, { half: "forced" }));
  };

  // And what they choose: a bed and food.
  const chosenTotal = (est) => {
    const trip = tripFor(est);
    if (!trip) return null;
    const eat = eatingFor(trip);
    const total = trip.chosen + (eat ? eat.from : 0);
    const said = describeTrip(trip, {
      half: "chosen",
      eating: eat,
      car: lines.some(l => l.kind === COST_KIND.CAR),
      transport: lines.some(l => l.kind === COST_KIND.TRANSPORT),
    });
    return sum("Budget estimate", eat ? `from ${total} DKK` : `from ${total} DKK plus food`, said, (
      <>
        {/* ── AND THE THREE WAYS TO EAT ────────────────────────────
            A row of three rather than a number with an assumption in small
            print under it. No sentence explaining what the buttons do: the
            labels are the explanation. */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
          {FOOD_TIERS.map(t => (
            <button key={t.key} onClick={() => setEatTier(t.key)} aria-pressed={eatTier === t.key}
              style={{ background: eatTier === t.key ? `${C.gold}26` : C.bg, border: `1px solid ${eatTier === t.key ? C.gold : `${C.gold}55`}`, color: eatTier === t.key ? C.gold : C.text, borderRadius: 100, padding: "5px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              {/* ── AND THE UNIT, BECAUSE ONE OF THEM IS NOT A RATE ──
                  "Cheapest · 60 DKK" beside "Cheap · 100 DKK a day" reads as
                  a daily rate that happens to be lower, and it is a whole
                  shop. Found by rendering the row and reading it. */}
              {t.label}{t.perTrip ? ` · ${t.perTrip} DKK the shop` : tierDayRate(t.key, mealsADay) ? ` · ${tierDayRate(t.key, mealsADay)} DKK a day` : ""}
            </button>
          ))}
        </div>
        {/* ── AND HOW OFTEN ───────────────────────────────────────
            One control, applying to every tier at once. */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
          {MEALS_A_DAY_OPTIONS.map(n => (
            <button key={n} onClick={() => setMealsADay(n)} aria-pressed={mealsADay === n}
              style={{ background: mealsADay === n ? `${C.gold}1F` : "none", border: `1px solid ${mealsADay === n ? `${C.gold}AA` : C.border}`, color: mealsADay === n ? C.gold : C.muted, borderRadius: 100, padding: "4px 10px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              {n} meals a day
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 5 }}>
          {describeTier(eatTier, eat)}
        </div>
        {/* ── "THAT ALSO HAS TO BE A WARNING" ─────────────────────
            Oliver, 24 Sep 2026: "It's likely we do not decide what they eat
            and where they stay. So it's estimates for them."

            The two halves have different standing, not just different payers:
            above is what this plan puts in front of them, each figure off a
            page or a measurement, and this is a guess at a decision they have
            not made. A kroner sign looks identical in both. */}
        <div style={{ fontSize: 10.5, color: C.text, lineHeight: 1.55, marginTop: 7, background: `${C.gold}0F`, border: `1px solid ${C.gold}33`, borderRadius: 8, padding: "6px 9px" }}>
          {BUDGET_WARNING}
        </div>
        {/* ── AND THE NUMBER THEY CAME FOR ────────────────────────
            Two halves and no sum leaves the reader adding up a page. Last, and
            quiet, because it is the least honest figure on the card: half of
            it was checked and half of it is a guess, and the warning directly
            above says which is which. */}
        {trip.forced > 0 && (
          <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.5, marginTop: 8, fontWeight: 700 }}>
            Both halves together, from {trip.forced + trip.chosen + (eat ? eat.from : 0)} DKK{eat ? "" : " plus food"}.
          </div>
        )}
      </>
    ));
  };

  const heading = (text) => (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0, width: 92 }}>{text}</span>
  );

  return (
    <div>
    {priced.length > 0 && (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      {/* ── "INEVITABLE PRICES" AND UNDER IT "BUDGET ESTIMATE" ──
          Oliver, 24 Sep 2026. The split is a real one and it is about who
          decides. A ticket for a stop this guide put on day 4 and the petrol to
          reach it are costs the PLAN imposes: the only way out of them is not
          to go. A bed and a dinner are costs the TRAVELLER chooses, and the
          same trip runs at a hostel and street food or at a hotel and a
          tasting menu.

          "What you pay" covered both and so said nothing about either. */}
      {heading("Inevitable")}
      <div style={{ flex: 1, minWidth: 0 }}>
        {priced.map(row)}
        {/* ── THE ESTIMATE, UNDER THE LINES IT IS MADE OF ──────
            Oliver, 18 Sep 2026: "can you implement estimated cost into the
            guide?"

            Under the list rather than over it, on purpose. A total at the top
            is a number a reader takes away on its own; a total at the bottom is
            the arithmetic of the lines they have just read, and this one has
            conditions on it that only make sense after them. See estimateFrom
            in utils/costLedger.js for why it is a floor. */}
        {(() => {
          const est = estimateFrom(priced);
          if (!est) return null;
          return (
            <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.gold}44` }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", alignItems: "baseline" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase" }}>Estimated</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>from {est.from} DKK</span>
                <span style={{ fontSize: 11.5, color: C.muted }}>per person</span>
              </div>
              {/* ── AND WHAT IT IS FOR A GROUP ──────────────────
                  19 Sep 2026. Per person is honest and it is not the number a
                  family wants, and the multiplication was being left to them.
                  partyOf refuses a count it cannot read rather than guessing
                  one, so this line is absent more often than it is wrong. */}
              {(() => {
                // The counts the brief read, when it read any, and the
                // sentence only as a fallback for a guide built before
                // `_party` existed. See partyFrom in utils/costLedger.js.
                const party = partyFrom(guide?._party) || partyOf(guide?._travelers);
                const said = describeGroup(est, party);
                if (!said) return null;
                return <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginTop: 3 }}>{said}</div>;
              })()}
              <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>{describeEstimate(est)}</div>
              {/* The unpriced rows are a list of their own under this one
                  now, so naming them here as well was the same information
                  twice. What is worth saying is that the figure stops where
                  this list stops. */}
              {toArrange.length > 0 && (
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>
                  Nothing below this figure is in it: {toArrange.length} {toArrange.length === 1 ? "thing" : "things"} on this trip {toArrange.length === 1 ? "has" : "have"} no price until you pick a time or a room.
                </div>
              )}
              {/* THE ARITHMETIC CLOSES. Named with their prices, so a reader
                  adding up the lines above can see exactly which figures were
                  taken out and why, rather than finding a total that is smaller
                  than the list and no explanation for the gap. */}
              {est.refusedNames.length > 0 && (
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>
                  Left out, nothing to buy for these dates: {est.refusedNames.join(", ")}.
                </div>
              )}
              {/* ── AND THE WHOLE TRIP ─────────────────────────────
                  Oliver, 21 Sep 2026: "an estimate on their entire trip."
                  Only when the build found a room price, so a guide built
                  before this, or one whose searches stated no price, shows
                  the tickets figure above and nothing invented under it. See
                  bedsEstimate in utils/costLedger.js. */}
              {forcedTotal(est)}
            </div>
          );
        })()}
      </div>
    </div>
    )}
    {/* The chosen half stands on its own, under both lists, because a bed and
        a dinner are owed whether or not this trip has a single priced stop. */}
    {chosenTotal(estimateFrom(priced))}
    {/* ── AND THE THINGS THAT HAVE NO PRICE YET ──────────────
        A bed, a crossing, a fare that depends on the sailing. Each one is a
        thing to arrange rather than a number to budget, and under its own
        heading it reads as the list it is instead of as prices nobody could
        find. */}
    {toArrange.length > 0 && (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginTop: priced.length ? 16 : 0 }}>
      {heading("To arrange")}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toArrange.map(row)}
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 8 }}>
          These have no figure because the figure depends on when you go and what you pick, so they are not in the estimate above.
        </div>
      </div>
    </div>
    )}
    {/* Printed from the links that are on the page, never typed, so it cannot
        say "this pays us" over a list that happens to contain no partner link
        at all. Once, at the foot of both lists, since a paid link can sit in
        either of them. */}
    {partnered.length > 0 && (
      <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 10 }}>
        {partnerDisclosure(partnered[0])}
      </div>
    )}
    </div>
  );
};
