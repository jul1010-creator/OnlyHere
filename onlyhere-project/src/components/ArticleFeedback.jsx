import { useState } from "react";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { FEEDBACK_KINDS, feedbackRow, feedbackProblem } from "../utils/articleFeedback";

// ── "REPORT OUTDATED INFORMATION" AND "REVIEW ARTICLE" ───────────────
//
// Oliver, 1 Sep 2026: "add a button on every blog called 'report outdated
// information' and a (user-only) 'review article'."
//
// ── WHY BOTH GO TO gemlyx_suggestions ───────────────────────────────
//
// A new table would have meant a button that posts into nothing until he runs
// SQL, and there is already an unrun SUPPORT_TABLE.sql on the open list. So
// these reuse the table Suggest a Place already writes to, which is anon-
// writable today, with their own `type`. It works the moment it deploys.
//
// NOT gemlyx_reviews, which the page already renders underneath. That list is
// travellers talking to each other about the PLACE. An article review is
// feedback for Oliver about the WRITING, and putting it in the public list
// would both mislead the reader and bury the note he needs.
//
// ── AND "USER-ONLY" IS READ AS THE SIGNED-IN TRAVELLER ──────────────
//
// This app has two sessions: userSession (a traveller account) and
// studioSession (Oliver). "User" is the word used for the first throughout, and
// the contrast he drew was against the report button, which is for everybody.
// If he meant himself, it is `studioSession` in place of `signedIn` and nothing
// else changes — written down here because it is a guess made while he slept.
export const ArticleFeedback = ({ itemType, itemName, signedIn, onNeedAccount }) => {
  const [open, setOpen] = useState(null);          // null | "outdated" | "review"
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState(null);      // null | "sending" | "sent" | "error"
  const [problem, setProblem] = useState("");

  const close = () => { setOpen(null); setText(""); setRating(0); setStatus(null); setProblem(""); };

  const send = async () => {
    if (status === "sending") return;
    const why = feedbackProblem(open, text, rating);
    if (why) { setProblem(why); return; }
    setProblem("");
    setStatus("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_suggestions`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(feedbackRow(open, { itemType, itemName, text, rating, url: typeof window !== "undefined" ? window.location.href : "" })),
      });
      setStatus(res.ok ? "sent" : "error");
      if (res.ok) { setText(""); setRating(0); }
    } catch { setStatus("error"); }
  };

  const btn = (active) => ({
    flex: 1, background: active ? `${C.gold}18` : "none", border: `1px solid ${active ? `${C.gold}66` : C.border}`,
    color: active ? C.gold : C.muted, borderRadius: 100, padding: "10px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
  });

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => (open === "outdated" ? close() : (close(), setOpen("outdated")))} style={btn(open === "outdated")}>
          ⚠ Report outdated information
        </button>
        {/* A button that does nothing when tapped is worse than one that is not
            there, so signed-out readers are offered the account rather than a
            dead control — and told why in the sheet that opens. */}
        <button
          onClick={() => (signedIn ? (open === "review" ? close() : (close(), setOpen("review"))) : onNeedAccount?.())}
          style={btn(open === "review")}>
          ✎ Review article
        </button>
      </div>

      {open && status !== "sent" && (
        <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px" }}>
          <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 9 }}>
            {open === "outdated"
              ? "What is out of date? A price, an opening time, something that has closed — anything you saw that does not match what is written here."
              : "How is this article? Anything that reads wrong, is missing, or was genuinely useful."}
          </div>
          {open === "review" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} out of 5`}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 19, padding: 0, lineHeight: 1, color: n <= rating ? C.gold : C.border }}>
                  ★
                </button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); if (problem) setProblem(""); }}
            rows={3}
            placeholder={open === "outdated" ? "e.g. entry is 120 DKK now, not free" : "e.g. the walking time from the station is way off"}
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif", resize: "vertical", boxSizing: "border-box" }}
          />
          {problem && <div style={{ fontSize: 11, color: "#FFB347", marginTop: 7, lineHeight: 1.5 }}>{problem}</div>}
          {status === "error" && (
            <div style={{ fontSize: 11, color: "#E57373", marginTop: 7, lineHeight: 1.5 }}>
              That did not send. Your words are still in the box — try again in a moment.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
            <button onClick={send} disabled={status === "sending"}
              style={{ background: C.gold, border: "none", color: "#0A0F1E", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: status === "sending" ? "default" : "pointer" }}>
              {status === "sending" ? "Sending…" : "Send"}
            </button>
            <button onClick={close}
              style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "sent" && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#6ECF97", lineHeight: 1.6 }}>
          ✓ {open === "outdated"
            ? "Thank you — that goes straight to the person who researches these, and it is the fastest way this gets fixed."
            : "Thank you. Read, not counted: a person reads every one of these."}
        </div>
      )}
    </div>
  );
};

export { FEEDBACK_KINDS };
