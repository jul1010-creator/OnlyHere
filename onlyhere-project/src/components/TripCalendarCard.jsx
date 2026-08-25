import { useState } from "react";
import { C } from "../utils/theme";
import { guideEvents, buildIcs, icsFilename, downloadIcs, icsBlocked } from "../utils/calendarExport";
import { tripDayDate } from "../utils/guideReading";
import { dayKey } from "../utils/calendarDay";

// ── AND INTO THE APP THEY ALREADY OPEN ──────────────────────────────
//
// Of eighteen AI travel products censused on 25 August 2026, ONE exports to a
// calendar. Not because it is hard — an .ics is a text format from 1998 and
// utils/calendarExport.js is the whole of it — but because it is plumbing, and
// plumbing is what everyone skips.
//
// A guide lives in a browser tab somebody has to remember to open. A calendar
// entry appears on the phone already in their hand at 08:40 on the Tuesday,
// next to the flight they booked somewhere else.
//
// ── ITS OWN COMPONENT, AND THAT IS THE POINT ────────────────────────
//
// This was written inline inside GuidePage's share panel, which renders only
// when `shareOpen` is true — a piece of state with no prop behind it. The render
// instrument written this afternoon cannot set state, so the card could not be
// rendered and read, and "does the screen actually say this" is the exact
// question four shipped bugs this month turned on.
//
// A surface that cannot be rendered in isolation cannot be checked, so it is
// rendered in isolation. `now`-style purity applied to layout: this component is
// a pure function of (guide, guideUrl) plus one piece of local state that only
// records what a click did.
export const TripCalendarCard = ({ guide, guideUrl = "" }) => {
  // null | "done" | "failed". A download CAN be refused — an insecure context, a
  // blocked popup, a browser that will not save from a blob — and saying nothing
  // is what the copy button in this same panel did before its clipboard refusal
  // was named.
  const [said, setSaid] = useState(null);

  const events = guideEvents(guide, {
    // dayKey, not a Date: icsStamp reads an ISO day. tripDayDate is the same
    // function the stop cards and the weather already use, so the day in
    // somebody's calendar cannot disagree with the day printed on the page. It
    // returns null with no arrival date, and guideEvents then produces nothing
    // rather than inventing one.
    dayDateFor: (n) => dayKey(tripDayDate(guide?._arrivalDate, n)),
    guideUrl,
  });
  const blocked = icsBlocked(guide, events);

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 13 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 3 }}>Put it in your calendar</div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginBottom: 10, maxWidth: 520 }}>
        {blocked || `One entry per stop, ${events.length} in all, with the times this guide gives. Opens in Apple Calendar, Google Calendar and Outlook.`}
      </div>
      {!blocked && (
        <>
          <button onClick={() => {
            const ok = downloadIcs(buildIcs(events, { name: guide?.title || "Gemlyx trip" }), icsFilename(guide?.title));
            setSaid(ok ? "done" : "failed");
          }}
            style={{ background: "none", border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "10px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {said === "done" ? "✓ Downloaded" : "Add to calendar ↓"}
          </button>
          {said === "failed" && (
            <div style={{ fontSize: 11.5, color: C.gold, marginTop: 8, maxWidth: 520, lineHeight: 1.5 }}>
              Your browser wouldn't let the page save a file. Open this guide's link on the device you want the trip on and try again there.
            </div>
          )}
          {/* The file leaves the product and can never be corrected, so the one
              sentence that matters is said where the decision is. */}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8, maxWidth: 520, lineHeight: 1.5 }}>
            Times and stops as they are today. Prices, opening hours and ticket status are deliberately left out: a calendar entry cannot be corrected once it is on your phone, so those stay on the guide, where they can be.
          </div>
        </>
      )}
    </div>
  );
};
