// ── ASKED AT THE ONE MOMENT THEY HAVE AN OPINION ────────────────────
//
// Oliver, 15 Sep 2026: "And also a 'Satisfied with the buiild? We appreciate
// any feedback.' After a guide has been created."
//
// The timing is the whole idea and it is his. A feedback link in a footer is
// answered by nobody, because nobody arrives at a footer holding a fresh
// opinion. Somebody who has just watched a guide be built for them has one, for
// about thirty seconds, and this is the only screen in the product where that
// is true.
//
// ── WHO SEES IT ─────────────────────────────────────────────────────
//
// Only the person who BUILT this guide. GuidePage gets `freshGuide` out of
// router state, which is set when the builder navigates here with the trip in
// hand and is null for a shared link opened cold. A stranger who was sent a
// guide in WhatsApp did not build anything and has nothing to be satisfied
// about, so asking them is a question about somebody else's work.
//
// ── AND ONCE ────────────────────────────────────────────────────────
//
// Answered or dismissed, it does not come back for that guide. A product that
// keeps asking the same question is one people learn to scroll past, and the
// second ask is worth less than the first while costing more.
//
// The key is per guide rather than global, because building a second trip is a
// second opinion and worth hearing. localStorage rather than a row: this is a
// per-device convenience, it is allowed to be forgotten, and it must never be
// the reason a guide page fails to render.
import { useState } from "react";
import { C } from "../utils/theme";

const KEY_PREFIX = "gemlyx_guide_asked_";

// ── THE ID THIS BLOCK NEVER HAS ─────────────────────────────────────
//
// The first version keyed on guideId and fell back to the title. It is shown
// only when freshGuide is set, and GuidePage defines a just-built guide as
// exactly `freshGuide && !guideId`, so guideId is undefined for its entire
// audience and the fallback was the only branch that ever ran.
//
// Which left two faults. An untitled guide produced the bare prefix, one key
// shared by every untitled guide, so dismissing the question once suppressed it
// for all of them. And the same trip, once saved, is keyed by id, so the two
// records could never agree with each other.
//
// Returns "" when there is nothing distinctive to key on. A blank key is not a
// key, and the caller treats it as "ask, and do not write anything down",
// which is the honest answer: better to ask twice than to answer for a guide
// this was never about.
export const askedKeyFor = (guideId, title) => {
  const id = String(guideId || "").trim();
  const name = String(title || "").trim();
  const part = id || name;
  if (!part) return "";
  return `${KEY_PREFIX}${part.slice(0, 60).replace(/\s+/g, "-")}`;
};

export const alreadyAsked = (key) => {
  if (!key) return false;
  try { return !!localStorage.getItem(key); } catch { return false; }
};

const remember = (key) => {
  if (!key) return;
  try { localStorage.setItem(key, "1"); } catch { /* private mode, it asks again */ }
};

export const GuideFeedback = ({ guideId, title, onSend }) => {
  const key = askedKeyFor(guideId, title);
  // Read once, at mount, rather than on every render: this decides whether the
  // block exists at all and must not change under somebody mid-sentence.
  const [hidden] = useState(() => alreadyAsked(key));
  const [answer, setAnswer] = useState(null);   // null | "yes" | "no"
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hidden) return null;

  const send = async () => {
    setBusy(true);
    remember(key);
    try {
      await onSend?.({ answer, note: note.trim(), title });
    } catch { /* a thank you they have earned is not withheld over a failed post */ }
    setBusy(false);
    setSent(true);
  };

  const wrap = {
    marginTop: 28, paddingTop: 18, borderTop: `1px solid ${C.border}`,
    maxWidth: 620,
  };

  if (sent) {
    return (
      <div style={wrap}>
        <div style={{ fontSize: 13.5, color: C.light, lineHeight: 1.6 }}>
          Thank you. That goes straight to the person who built this.
        </div>
      </div>
    );
  }

  const pill = (on) => ({
    background: on ? `${C.gold}1a` : "transparent",
    border: `1px solid ${on ? `${C.gold}88` : C.border}`,
    color: on ? C.gold : C.light,
    borderRadius: 100, padding: "9px 18px", fontSize: 13.5, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });

  return (
    <div style={wrap}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        Satisfied with the build?
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
        We appreciate any feedback. It is a beta, and this is read by one person.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Real buttons, so this is reachable from a keyboard like the rest of
            the page. aria-pressed, because the gold border is the only other
            thing saying which one is chosen. */}
        <button type="button" onClick={() => setAnswer("yes")} aria-pressed={answer === "yes"} style={pill(answer === "yes")}>
          Yes
        </button>
        <button type="button" onClick={() => setAnswer("no")} aria-pressed={answer === "no"} style={pill(answer === "no")}>
          Not really
        </button>
      </div>

      {/* The box appears only after an answer. Shown up front it reads as a
          form, and a form is a thing people put off; a question with two
          buttons is a thing people finish. */}
      {answer && (
        <div style={{ marginTop: 14 }}>
          <label htmlFor="gx-guide-feedback" style={{ display: "block", fontSize: 12.5, color: C.light, marginBottom: 6 }}>
            {answer === "yes"
              ? "Anything that would have made it better? Optional."
              : "What was wrong with it? Even a few words help."}
          </label>
          <textarea id="gx-guide-feedback" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000}
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", fontSize: 14, color: C.text, fontFamily: "'Inter', sans-serif", boxSizing: "border-box", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <button type="button" onClick={send} disabled={busy}
              style={{ background: C.gold, border: "none", color: C.onGold, borderRadius: 10, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Sending…" : "Send"}
            </button>
            {/* A way out that is not an answer. Without one the only ways to
                make this go away are to answer it or to ignore it for ever, and
                the second teaches people to ignore the next one too. */}
            <button type="button" onClick={() => { remember(key); setSent(true); }}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif", textDecoration: "underline" }}>
              No thanks
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
