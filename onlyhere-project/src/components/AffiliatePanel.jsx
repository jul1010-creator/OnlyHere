import { C } from "../utils/theme";
import { auditRows, auditSummary, auditNote, programmeState } from "../utils/affiliateAudit";
import { isBookableTicketUrl, ticketAgentOf } from "../utils/ticketLink";
import { affiliateHref } from "../utils/affiliates";
import { BOOKING_AFFILIATE_ID, TIQETS_BROWSE_LINK, TIQETS_AFFILIATE_TEMPLATE, TICKETMASTER_AFFILIATE_TEMPLATE, CAR_RENTAL_LINK, WEGOTRIP_LINK } from "../config";

// ── WHAT DO MY AFFILIATES ACTUALLY CONNECT TO ───────────────────────
//
// Oliver, 26 Aug 2026. He asked because nothing could answer it: the links are
// built, disclosed and gated correctly, and no surface anywhere says how MANY of
// them exist. A programme wired to four rows out of a hundred and forty-eight
// earns almost nothing and looks identical, from the code, to one wired to all
// of them.
//
// Reads the rows already in memory. No new fetch: the Studio has the published
// content loaded, and a panel that re-queries would be answering about a
// different set than the one the site is serving.
export const AffiliatePanel = ({ rows }) => {
  const audited = auditRows(rows, {
    isBookable: isBookableTicketUrl,
    agentOf: ticketAgentOf,
    wrap: affiliateHref,
  });
  const s = auditSummary(audited);
  const programmes = programmeState({
    tiqetsTemplate: TIQETS_AFFILIATE_TEMPLATE,
    tiqetsBrowse: TIQETS_BROWSE_LINK,
    ticketmasterTemplate: TICKETMASTER_AFFILIATE_TEMPLATE,
    bookingId: BOOKING_AFFILIATE_ID,
    carRental: CAR_RENTAL_LINK,
    wegotrip: WEGOTRIP_LINK,
  });
  // The work queue, which is the useful half. A count of failures nobody can act
  // on is a count; a list of near misses is a to-do list.
  const queue = audited.filter(x => x.state === "refused");
  const dark = audited.filter(x => x.state === "bookable-unwrapped");

  const box = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px" };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", marginBottom: 3 }}>💰 Affiliates, and what they reach</div>
      <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.6, marginBottom: 13 }}>{auditNote(s)}</div>

      {/* THE NUMBERS. Share as well as count, because 12 of 148 and 12 of 14 are
          different businesses and the raw count reads the same. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 13 }}>
        {[["earning", s.earning, C.gold], ["one edit away", s.refused, "#FFB347"], ["no link at all", s.none, C.muted], ["earning nothing", s.unwrapped, "#E57373"]].map(([label, n, col]) => (
          <div key={label} style={{ ...box, minWidth: 96 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: col, fontVariantNumeric: "tabular-nums" }}>{n}</div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── THE PROGRAMMES ─────────────────────────────────────────
          An empty template is not a bug and there is no way to tell an empty one
          from a filled one without opening config.js, which is the state this
          panel exists to end. */}
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 7 }}>Programmes</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 13 }}>
        {programmes.map(p => (
          <div key={p.name} style={{ ...box, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: p.on ? C.gold : C.muted, minWidth: 15 }}>{p.on ? "●" : "○"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: p.on ? C.text : C.muted }}>{p.name} <span style={{ fontWeight: 400, color: C.muted }}>· {p.what}</span></div>
              <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55, marginTop: 2 }}>{p.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── THE WORK QUEUE ─────────────────────────────────────────
          Each of these is a row where the pipeline found a link and the gate
          refused it. One hand-edit each and it becomes a live button. */}
      {queue.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#FFB347", letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 7 }}>
            One edit away ({queue.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: dark.length ? 13 : 0 }}>
            {queue.slice(0, 25).map((x, i) => (
              <div key={i} style={{ ...box }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{x.name}</div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, wordBreak: "break-all" }}>{x.url}</div>
                <div style={{ fontSize: 10.5, color: "#FFB347", marginTop: 2 }}>{x.why}</div>
              </div>
            ))}
            {queue.length > 25 && (
              <div style={{ fontSize: 10.5, color: C.muted }}>and {queue.length - 25} more. Named rather than hidden, so the number on the card is the real one.</div>
            )}
          </div>
        </>
      )}

      {dark.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#E57373", letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 7 }}>
            Button renders, click pays nothing ({dark.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {dark.slice(0, 15).map((x, i) => (
              <div key={i} style={{ ...box }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{x.name} <span style={{ fontWeight: 400, color: C.muted }}>· {x.agent || "unknown agent"}</span></div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{x.why}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
