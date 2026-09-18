import { costLines, byUrgency, estimateFrom, describeEstimate, COST_KIND } from "../utils/costLedger";
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

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0, width: 92 }}>What you pay</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {lines.map((l, i) => (
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
        ))}
        {/* ── THE ESTIMATE, UNDER THE LINES IT IS MADE OF ──────
            Oliver, 18 Sep 2026: "can you implement estimated cost into the
            guide?"

            Under the list rather than over it, on purpose. A total at the top
            is a number a reader takes away on its own; a total at the bottom is
            the arithmetic of the lines they have just read, and this one has
            conditions on it that only make sense after them. See estimateFrom
            in utils/costLedger.js for why it is a floor. */}
        {(() => {
          const est = estimateFrom(lines);
          if (!est) return null;
          return (
            <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.gold}44` }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", alignItems: "baseline" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase" }}>Estimated</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>from {est.from} DKK</span>
                <span style={{ fontSize: 11.5, color: C.muted }}>per person</span>
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>{describeEstimate(est)}</div>
              {est.missing.length > 0 && (
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>
                  Not in the figure: {est.missing.join(", ")}.
                </div>
              )}
            </div>
          );
        })()}
        {/* Printed from the links that are on the page, never typed, so
            it cannot say "this pays us" over a list that happens to contain no
            partner link at all. */}
        {partnered.length > 0 && (
          <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 8 }}>
            {partnerDisclosure(partnered[0])}
          </div>
        )}
      </div>
    </div>
  );
};
