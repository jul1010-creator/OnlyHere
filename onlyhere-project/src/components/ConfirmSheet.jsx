// ── ARE YOU SURE, ASKED BY THE APP RATHER THAN BY THE BROWSER ───────
//
// Oliver, 14 Sep 2026, asked for "Are you sure you want to log out?" and the
// first version of it used window.confirm, which is what the delete button had
// been using since August.
//
// WHY THAT IS THE WRONG DIALOG FOR THIS AUDIENCE. The beta goes to his
// Instagram followers, and a link opened from Instagram does not open in Safari
// or Chrome: it opens in Instagram's own in-app browser. Native dialogs are the
// least reliable thing in those webviews. A suppressed confirm() returns FALSE,
// so log out would not error, would not ask, and would not log anybody out. The
// button would simply do nothing, on the one browser most of the first readers
// will be using, and nothing in the code would look wrong.
//
// It is also the only piece of chrome in the app drawn by the operating system
// rather than by us, in a product where the theme is a feature.
//
// ── PROMISE-SHAPED ON PURPOSE ───────────────────────────────────────
//
// window.confirm returns a boolean, so every caller is written as
// `if (!confirm(...)) return`. Keeping that shape means the callers change by
// one word rather than being turned inside out into callbacks, and a third
// caller added later gets the same one line. See askConfirm in App.jsx, which
// hands this component a resolver and awaits it.
import { useEffect, useRef } from "react";
import { C } from "../utils/theme";

export const ConfirmSheet = ({ ask, onAnswer, cancelLabel = "Cancel" }) => {
  // The dangerous button is NOT focused on open. Enter on a keyboard and a
  // stray tap both land on the safe one, which is the right default for a
  // question whose yes cannot be undone.
  const cancelRef = useRef(null);
  // onAnswer is a new closure on every render of the app around this, so having
  // it in the dependency list re-ran this effect constantly: the listener was
  // rebound and, worse, focus was taken back to Cancel under a keyboard user who
  // had tabbed away from it, every time anything unrelated re-rendered. Held in
  // a ref and depended on by `ask` alone, which is the thing that actually
  // changes when a new question opens.
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  useEffect(() => {
    if (!ask) return;
    cancelRef.current?.focus();
    // Escape answers no. A dialog with no keyboard way out is one people get
    // stuck in, and there is no browser chrome around this one to rescue them.
    const key = (e) => { if (e.key === "Escape") answerRef.current?.(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [ask]);

  if (!ask) return null;

  // 1200 clears DetailPage at 970 and the credits sheet at 300. A confirm that
  // opens behind the screen it was asked from is worse than no confirm.
  return (
    // ── THE BACKDROP IGNORES THE TAP THAT OPENED IT ────────────────
    //
    // This sheet exists because native dialogs are unreliable in the webview an
    // Instagram link opens in. The people it was built for are on phones, and an
    // ordinary double-tap on Sign out puts the second tap on a backdrop that was
    // not there when they started tapping. That answers no, the button appears
    // to do nothing, and the failure looks exactly like the one being fixed.
    //
    // 400ms covers a double-tap and is far short of a decision.
    <div role="dialog" aria-modal="true" aria-label={ask.title || ask.text}
      onClick={() => { if (Date.now() - (ask.at || 0) > 400) onAnswer(false); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 420, padding: "22px 20px 18px", boxShadow: "0 18px 50px rgba(0,0,0,0.45)" }}>
        {ask.title && (
          <div style={{ fontSize: 19, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, marginBottom: 8 }}>{ask.title}</div>
        )}
        <div style={{ fontSize: 13.5, color: C.light, lineHeight: 1.65, marginBottom: 18 }}>{ask.text}</div>
        {/* Cancel first in the DOM so it is first in the tab order, and wider
            on the row, because the safe answer should be the easy one to hit
            with a thumb. */}
        <div style={{ display: "flex", gap: 10 }}>
          <button ref={cancelRef} onClick={() => onAnswer(false)}
            style={{ flex: 1.2, background: "transparent", border: `1px solid ${C.border}`, color: C.light, borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {cancelLabel}
          </button>
          <button onClick={() => onAnswer(true)}
            style={{
              flex: 1,
              background: ask.danger ? "transparent" : C.gold,
              border: ask.danger ? "1px solid #E23B4E66" : "none",
              color: ask.danger ? "#E57373" : C.onGold,
              borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}>
            {ask.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
