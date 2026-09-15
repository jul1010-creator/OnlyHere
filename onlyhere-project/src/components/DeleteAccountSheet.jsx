// ── WHY, ASKED ON THE WAY OUT AND NEVER IN THE WAY ──────────────────
//
// Oliver, 15 Sep 2026: "there should be a 'Why do you want to delete your
// account?'"
//
// The question is worth asking and the beta is the only time it will ever be
// this cheap to ask: a hundred and ninety-nine people will simply stop opening
// the site and say nothing, and the one who presses Delete is the one who has
// decided something and is still holding the reason.
//
// ── IT IS PART OF THE CONFIRM, NOT A STEP AFTER IT ──────────────────
//
// This could have been a second sheet. It is not, and that is the whole design.
//
// A question placed between somebody and the delete button is an obstacle
// whatever its tone, and an obstacle in front of erasure is not a neutral
// product choice for a Danish business: GDPR article 17 gives them the right and
// the guidance on dark patterns is specific about extra steps inserted to slow a
// person down. A separate "before you go..." screen is that step, however
// politely it is worded.
//
// So the question sits ON the confirm, above the same two buttons that were
// already there. Delete does the same thing whether anything is filled in or
// not. Nothing is required, nothing is validated, and there is no second press.
// The cost of not answering is zero, which is the only condition under which the
// answer is worth having.
//
// ── AND IT IS SENT WITHOUT THEIR NAME ON IT ─────────────────────────
//
// See sendDeleteReason in App.jsx. No email, no user id, no reference. This is
// the one message in the product where attaching an identity would be actively
// wrong: the person is in the act of asking to be forgotten, and taking the
// opportunity to file a note about them, keyed to them, is the opposite of what
// the button in front of them promises.
//
// It also costs nothing to give up. A reason is useful in aggregate, which is
// how it will actually be read: five people saying the guide builder was slow is
// the finding, and which five is not.
//
// ── A SHEET OF ITS OWN RATHER THAN A FLAG ON ConfirmSheet ───────────
//
// ConfirmSheet resolves a promise with a boolean and two callers depend on that
// shape. Threading a second return value through it would change the contract of
// the sign-out confirm as a side effect of a question about deletion, and that
// component was stabilised on 14 Sep after a run of real bugs (the orphaned
// promise, the double-tap backdrop, the focus theft). It is left alone.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";

// ── THE FIVE, CHOSEN FOR WHAT HE CAN ACT ON ─────────────────────────
//
// Not a market research instrument. Each of these maps to a thing he could
// actually do something about on a Tuesday, which is the only test a list like
// this has to pass:
//
//   broken   -> a bug he can fix, and the most valuable answer in a beta
//   notuseful-> the product is working and is not for them, which is different
//   trying   -> no signal at all, and saying so keeps it out of the other four
//   privacy  -> the one answer that would make him change what is collected
//   other    -> because a list of five is never the whole world
//
// There is deliberately no "prefer not to say" pill. Choosing nothing already
// says it, and a button for declining to answer makes answering feel expected.
export const DELETE_REASONS = [
  { id: "broken", label: "Something did not work" },
  { id: "notuseful", label: "Not useful to me" },
  { id: "trying", label: "Just trying it out" },
  { id: "privacy", label: "Privacy" },
  { id: "other", label: "Something else" },
];

const LABEL = DELETE_REASONS.reduce((m, r) => { m[r.id] = r.label; return m; }, {});

export const NOTE_MAX = 600;

// ── PURE, SO THE MESSAGE CAN BE TESTED WITHOUT A BROWSER ────────────
//
// Returns "" when there is nothing to say, and the caller treats that as "send
// nothing at all" rather than sending an empty report. An email that arrives
// saying a person left and giving no reason is worse than no email: it is a
// notification with no content, and enough of them teach somebody to filter the
// address.
export const deleteReasonMessage = ({ reason, note } = {}) => {
  const label = LABEL[String(reason || "")] || "";
  const said = String(note || "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
  if (!label && !said) return "";
  const lines = ["An account was deleted."];
  if (label) lines.push(`Reason: ${label}`);
  if (said) lines.push(`In their words: ${said}`);
  return lines.join("\n");
};

export const DeleteAccountSheet = ({ open, lang = "en", onCancel, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  // Cancel is focused, never Delete. Enter on a keyboard and a stray tap both
  // land on the answer that can be taken back.
  const cancelRef = useRef(null);
  // The same guard ConfirmSheet carries and for the same reason: an ordinary
  // double tap on the Delete Account row puts the second tap on a backdrop that
  // was not there when the finger started moving.
  const openedAt = useRef(0);

  useEffect(() => {
    if (!open) { setReason(""); setNote(""); return; }
    openedAt.current = Date.now();
    cancelRef.current?.focus();
  }, [open]);

  // onCancel is a fresh closure on every render of the app around this, so the
  // Escape listener is bound to a ref and the effect depends on `open` alone.
  // Depending on the callback rebound the listener constantly and stole focus
  // back to Cancel under anybody who had tabbed away from it.
  const cancelRef2 = useRef(onCancel);
  cancelRef2.current = onCancel;
  useEffect(() => {
    if (!open) return;
    const key = (e) => { if (e.key === "Escape") cancelRef2.current?.(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  if (!open) return null;

  const pill = (on) => ({
    background: on ? `${C.gold}1a` : "transparent",
    border: `1px solid ${on ? `${C.gold}88` : C.border}`,
    color: on ? C.gold : C.light,
    borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });

  return (
    <div role="dialog" aria-modal="true" aria-label={uiT("auth.deleteYes", lang)}
      onClick={() => { if (Date.now() - openedAt.current > 400) onCancel?.(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: "22px 20px 18px", boxShadow: "0 18px 50px rgba(0,0,0,0.45)", maxHeight: "86vh", overflowY: "auto" }}>

        {/* The consequences first, in the words the catalogue already holds.
            The question comes after them: what is being decided has to be on
            screen before anything asks them to reflect on it. */}
        <div style={{ fontSize: 19, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, marginBottom: 8 }}>
          {uiT("auth.deleteYes", lang)}
        </div>
        <div style={{ fontSize: 13.5, color: C.light, lineHeight: 1.65, marginBottom: 18 }}>
          {uiT("auth.confirmDelete", lang)}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {uiT("auth.whyLeaving", lang)}
          </div>
          {/* Said plainly rather than implied by a greyed-out asterisk. The
              sentence is what makes the question safe to put here at all. */}
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
            {uiT("auth.whyOptional", lang)}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {DELETE_REASONS.map((r) => (
              // Pressing the chosen one again clears it. Without that there is
              // no way back to having said nothing, and a choice that cannot be
              // unmade is a choice somebody was talked into.
              <button key={r.id} type="button" aria-pressed={reason === r.id}
                onClick={() => setReason(reason === r.id ? "" : r.id)}
                style={pill(reason === r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={NOTE_MAX}
            placeholder={uiT("auth.whyPlaceholder", lang)}
            style={{ width: "100%", marginTop: 11, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, color: C.text, fontFamily: "'Inter', sans-serif", boxSizing: "border-box", resize: "vertical" }} />
        </div>

        {/* Cancel first in the DOM so it is first in the tab order, and wider on
            the row, because the safe answer should be the easy one to hit. */}
        <div style={{ display: "flex", gap: 10 }}>
          <button ref={cancelRef} onClick={() => onCancel?.()}
            style={{ flex: 1.2, background: "transparent", border: `1px solid ${C.border}`, color: C.light, borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {uiT("auth.cancel", lang)}
          </button>
          {/* Red rather than gold. This is the one answer in the app that
              cannot be undone, and it must not look like every other Continue. */}
          <button onClick={() => onConfirm?.({ reason, note })}
            style={{ flex: 1, background: "transparent", border: "1px solid #E23B4E66", color: "#E57373", borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {uiT("auth.deleteYes", lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
