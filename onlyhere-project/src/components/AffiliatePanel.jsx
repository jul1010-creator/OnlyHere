import { useState } from "react";
import { C } from "../utils/theme";
import { auditRows, auditLinks, auditSummary, auditNote, programmeState, TICKET, TOUR } from "../utils/affiliateAudit";
import { isBookableTicketUrl, ticketAgentOf, isTourUrl, TOUR_TYPES, TICKET_FIELD, TOUR_FIELD } from "../utils/ticketLink";
import { affiliateHref, wegotripBrowseUrl, tripcomActive, getyourguideActive, bajabikesActive } from "../utils/affiliates";
import { TRIPCOM_CITIES } from "../data/tripcom";
import { BOOKING_AFFILIATE_ID, TIQETS_BROWSE_LINK, TIQETS_AFFILIATE_TEMPLATE, TICKETMASTER_AFFILIATE_TEMPLATE, CAR_RENTAL_LINK, WEGOTRIP_AFFILIATE_TEMPLATE, BAJABIKES_BANNERS } from "../config";

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
// ── AND SOMEWHERE TO CHANGE ONE ────────────────────────────────────
//
// Oliver, 10 Sep 2026: "can you put into managed published 'affiliate links'? I
// don't care if it's in edit or as its own. I just want to have some control
// over it."
//
// Until now this panel could only report. Every row it listed as one edit away
// meant opening the entry, finding the field, and coming back, which is why the
// queue never got shorter. `onSetLink` is the door; the validation behind it is
// affiliateAudit.linkPatch, the same two gates that judge what the sweep writes,
// so a link pasted here is held to what a link proposed there is held to.
export const AffiliatePanel = ({ rows, onSetLink, savingId = null }) => {
  const [editing, setEditing] = useState(null);   // `${kind}:${id}`
  const [draft, setDraft] = useState("");
  const gates = { isBookable: isBookableTicketUrl, isTour: isTourUrl, agentOf: ticketAgentOf, wrap: affiliateHref };
  const audited = auditRows(rows, gates);
  const s = auditSummary(audited);
  // ── AND THE OTHER PROGRAMME, WHICH THIS PANEL COULD NOT SEE ──────
  //
  // Every GetYourGuide link lives in `tourUrl` and nothing here ever read it.
  // Counted only where a tour could exist: an attraction gets no GetYourGuide
  // search on purpose, so listing every museum as a missing tour link would
  // report a decision as a hundred and forty gaps.
  const tours = auditLinks(rows, { ...gates, canTicket: () => false, canTour: (r) => TOUR_TYPES.includes(r?.type) });
  const tourSummary = auditSummary(tours);
  const key = (x) => `${x.kind}:${x.id}`;
  const programmes = programmeState({
    tiqetsTemplate: TIQETS_AFFILIATE_TEMPLATE,
    tiqetsBrowse: TIQETS_BROWSE_LINK,
    ticketmasterTemplate: TICKETMASTER_AFFILIATE_TEMPLATE,
    bookingId: BOOKING_AFFILIATE_ID,
    carRental: CAR_RENTAL_LINK,
    // Through the builder rather than the constant, so this panel and whatever
    // renders the browse button can never disagree about whether one exists.
    wegotrip: wegotripBrowseUrl(),
    wegotripTemplate: WEGOTRIP_AFFILIATE_TEMPLATE,
    // Through the builder, the same way wegotrip is above: this panel and the
    // links a reader sees must never disagree about whether a programme is on.
    tripcom: tripcomActive() ? "on" : "",
    // Through the builder for the third time and the same reason. Two of the
    // three rows above were once read off a constant and both of them lied.
    getyourguide: getyourguideActive() ? "on" : "",
    // Through the builder for the fourth time, same reason. Baja Bikes joined on
    // 11 Sep 2026 and the suite refused the commit until this row existed, which
    // is the completeness test doing exactly what it was written for.
    bajabikes: bajabikesActive() ? "on" : "",
    bajabikesProducts: Object.keys(BAJABIKES_BANNERS).length,
    tripcomCities: TRIPCOM_CITIES.length,
  });
  // The work queue, which is the useful half. A count of failures nobody can act
  // on is a count; a list of near misses is a to-do list.
  const queue = audited.filter(x => x.state === "refused");
  const dark = audited.filter(x => x.state === "bookable-unwrapped");

  const box = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px" };

  // One row of the queue, with the field folded away until he opens it. The
  // reason for the refusal stays visible either way: it is what tells him what
  // to paste instead.
  const Row = (x) => {
    const open = editing === key(x);
    const busy = savingId != null && String(savingId) === String(x.id);
    return (
      <div key={key(x)} style={{ ...box }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, flex: 1 }}>
            {x.name} <span style={{ fontWeight: 400, color: C.muted }}>· {x.kind === TOUR ? "tour" : "ticket"}</span>
          </div>
          {onSetLink && x.id != null && (
            <button onClick={() => { setEditing(open ? null : key(x)); setDraft(open ? "" : (x.url || "")); }}
              disabled={busy}
              style={{ background: "none", border: `1px solid ${open ? C.gold : C.border}`, color: open ? C.gold : C.muted, borderRadius: 100, padding: "3px 10px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              {open ? "Close" : "Change"}
            </button>
          )}
        </div>
        {x.url && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, wordBreak: "break-all" }}>{x.url}</div>}
        <div style={{ fontSize: 10.5, color: x.state === "refused" ? "#FFB347" : x.state === "bookable-unwrapped" ? "#E57373" : C.muted, marginTop: 2 }}>{x.why}</div>
        {open && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://..." spellCheck={false}
              style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, fontFamily: "'Inter', sans-serif" }} />
            <button onClick={() => { onSetLink(x, draft); setEditing(null); }} disabled={busy}
              style={{ background: `${C.gold}22`, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 8, padding: "7px 13px", fontSize: 11.5, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
              {busy ? "Saving" : "Save"}
            </button>
          </div>
        )}
        {/* Emptying the box takes the link off, which is half of having control
            over it: a refused link on a row is worse than no link at all. */}
        {open && <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>Empty the box and save to take the link off.</div>}
      </div>
    );
  };

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
            {queue.slice(0, 25).map(Row)}
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
            {dark.slice(0, 15).map(Row)}
          </div>
        </>
      )}

      {/* ── AND THE TOURS, COUNTED SEPARATELY ──────────────────────
          Separate rather than folded into the numbers above, because the two
          sell different things to different rows and one total would hide which
          of them is the one not working. */}
      {tours.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 1.1, textTransform: "uppercase", margin: "13px 0 7px" }}>
            Tours ({tourSummary.earning} of {tourSummary.total} earning)
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55, marginBottom: 7 }}>
            Only the types that ask GetYourGuide anything: towns, nightlife towns and streets, and food streets. Attractions are left out on purpose, because a museum sells its own guide and usually cheaper.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {tours.filter(x => x.state !== "earning").slice(0, 25).map(Row)}
          </div>
        </>
      )}
    </div>
  );
};
