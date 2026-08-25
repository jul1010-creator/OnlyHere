import { useState } from "react";
import { C } from "../utils/theme";
import { SWAP_REASONS, reasonById, swapCandidates, swapAnswer, candidateLine, alreadyRuledOut } from "../utils/stopSwap";
import { distanceWords } from "../utils/nearbyPlaces";

// ── THE CHANGE BUTTON, WITH THE PART EVERYONE SKIPS ─────────────────
//
// Oliver on Layla, 25 Aug 2026: "It's quite robotic tbf.. that's something I
// want ours to do better."
//
// Two screens, and the first one is the whole difference. Every other planner's
// Change button goes straight to a replacement, because it never asked why. See
// utils/stopSwap.js for the argument; this is what it looks like.
//
// Its own component so the render instrument can read it — the lesson from
// TripCalendarCard, which had to be extracted before anybody could check what it
// said on screen.
export const StopChangeSheet = ({ stop, guide, point, library, nearby, onSwap, onClose, blocked = "" }) => {
  const [reason, setReason] = useState(null);
  const r = reasonById(reason);
  const ruledOut = alreadyRuledOut(guide);
  const candidates = r
    ? swapCandidates(stop, { reason: r, point, library, nearby, radiusKm: 4, excluded: ruledOut })
    : [];
  const answer = r ? swapAnswer(stop, candidates, r) : null;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 16px 14px", marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>
          {r ? r.label : `What is wrong with ${stop?.name || "this stop"}?`}
        </div>
        <button onClick={onClose} aria-label="Close"
          style={{ background: "none", border: "none", color: C.muted, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
      </div>

      {/* ── SCREEN ONE: THE REASON ─────────────────────────────────
          Five buttons, not a text box. A text box is what a product offers when
          it has not decided what to do with the answer, and it hands the person
          the job of guessing what the system can act on. */}
      {!r && (
        <>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 11, lineHeight: 1.55 }}>
            The answer changes what I look for, so it is worth a tap.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {SWAP_REASONS.map(x => (
              <button key={x.id} onClick={() => setReason(x.id)}
                style={{ textAlign: "left", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{x.label}</div>
                {/* What pressing it DOES, in the system's own words, so the
                    button and the behaviour cannot drift apart. */}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{x.effect}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── SCREEN TWO: WHAT I CAN ACTUALLY VOUCH FOR ──────────────
          Every candidate is a published, researched, sourced row with real
          coordinates. Nothing here can produce a place that does not exist,
          which is the entire argument for doing it this way rather than asking
          a model for another stop. */}
      {r && (
        <>
          <div style={{ fontSize: 12, color: answer?.ok ? C.light : C.gold, lineHeight: 1.6, marginBottom: answer?.ok ? 11 : 4 }}>
            {answer?.why}
          </div>
          {answer?.ok && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {candidates.map(c => (
                <button key={c.name} onClick={() => onSwap && onSwap(c)}
                  style={{ textAlign: "left", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{c.name}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{candidateLine(c, { distanceWords })}</div>
                </button>
              ))}
            </div>
          )}
          {/* A swap the constraints refused. Quotes their own rule back rather
              than saying "not available". */}
          {blocked && (
            <div style={{ fontSize: 11.5, color: C.gold, marginTop: 10, lineHeight: 1.55, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>{blocked}</div>
          )}
          <button onClick={() => setReason(null)}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "10px 0 0", fontFamily: "'Inter', sans-serif" }}>
            ‹ A different reason
          </button>
        </>
      )}
    </div>
  );
};
