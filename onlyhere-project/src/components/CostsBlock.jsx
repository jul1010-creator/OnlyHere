import { costLines, byUrgency, estimateFrom, describeEstimate, partyOf, partyFrom, describeGroup, COST_KIND } from "../utils/costLedger";
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
export const CostsBlock = ({ guide, C, rowFor, now = new Date() }) => {
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
  const partnered = lines.map(l => outboundLink(l.href)).filter(o => o.href && o.note).map(o => o.href);
  // The action word per kind. A ferry link goes to a timetable and a hotel link
  // goes to a search, and calling both of them "Buy tickets" is the kind of
  // label that makes a reader distrust the rest of the page.
  const action = (kind) =>
    kind === COST_KIND.TRANSPORT || kind === COST_KIND.FERRY ? "Check times and fares"
      : kind === COST_KIND.STAY ? "Find a room"
      : kind === COST_KIND.CAR ? "Book the car"
      // A walking tour is not a ticket, and "Buy tickets" over one is the label
      // that made it need its own kind in the first place.
      : kind === COST_KIND.AUDIO ? "Listen to a sample"
      : "Buy tickets";

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
              : l.href
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

  const heading = (text) => (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0, width: 92 }}>{text}</span>
  );

  return (
    <div>
    {priced.length > 0 && (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      {heading("What you pay")}
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
            </div>
          );
        })()}
      </div>
    </div>
    )}
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
