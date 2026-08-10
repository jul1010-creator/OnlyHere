import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { signInWithPassword, signUpWithPassword, sendPasswordReset, startGoogleSignIn } from "../utils/auth";

// ── WHERE AN ACCOUNT IS ASKED FOR, AND WHAT IT HONESTLY BUYS ─────────
//
// Oliver, 10 Aug 2026, on seeing this sheet live: "really?.. that's the create
// login? The create log in should be at the front page with all the magic. And
// it needs to look different."
//
// He was reacting to three separate things, and only one of them was styling.
//
// ONE, IT WAS A MOBILE BOTTOM SHEET WITH NO DESKTOP FORM. The container was
// pinned to flex-end with only its top corners rounded, so on a 1080px screen
// it grew to 88vh, sat on the bottom edge and buried the hero photograph and
// the headline. On a phone that is exactly right. On a desktop it read as a
// mistake, and it was covering the "magic" he was talking about. It is now a
// centred dialog above 720px and the same bottom sheet below it.
//
// TWO, IT LOOKED LIKE NOTHING. The rest of Gemlyx is dark, gold, Fraunces and
// large photography. This was a form box that could have belonged to any app,
// which is a strange thing to show at the one moment you are asking somebody to
// join. It has the mark, the wordmark and a serif line now.
//
// THREE, AND THE ONE THAT MATTERED MOST, IT PROMISED THE WRONG THING. The old
// copy said an account "is optional" and "does one thing: keeps your saved
// places and guides on every device". His actual model, stated in his own
// words:
//
//   "You can get the guide as a non-user. But you won't be able to save it
//    without it. If you want to save it, you need to create an account. And
//    that's why logging in with google should be easy. So if someone clicks
//    'save this guide' then they need an account. But getting an account will
//    only give you it. It won't keep you updated on future events that can be
//    good for the trip or get help along the way. That's for paying users."
//
// So: the guide is free and ungated, the account is what keeps it, and the
// living part of the product is paid. All three are said plainly below,
// INCLUDING the third. Naming what a free account does not include, at the
// moment of signup, is the same rule the entries follow: never let somebody
// find out later that the promise was smaller than it sounded.
//
// Google stays the biggest control on purpose, because this sheet interrupts
// somebody who wanted a guide, not an account. "Logging in with google should
// be easy" is a requirement about how long the interruption lasts.
export const AuthSheet = ({ open, onClose, onSignedIn, localSaveCount, reason, initialMode }) => {
  // Defaults to CREATE, not sign in. There are no returning users yet, and the
  // person hitting this has just been told they need an account.
  const [mode, setMode] = useState(initialMode || "up");   // "up" | "in" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 720);

  // The sheet is hidden with an early return rather than unmounted, so its
  // state SURVIVES a close. Without this, somebody who opened it once, switched
  // to Sign in and closed it would be handed the Sign in screen the next time
  // they pressed Sign up, and the Save gate would greet a brand new visitor
  // with a login form. Reset on every opening, from whichever door was used.
  useEffect(() => {
    if (!open) return;
    setMode(initialMode || "up");
    setError(null); setNotice(null);
  }, [open, initialMode]);

  // Declared BEFORE the early return, because a hook that only sometimes runs
  // is a hooks-order crash on the render where `open` flips. Cleaned up on
  // unmount so opening the sheet five times does not leave five listeners.
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!open) return null;

  const submit = async () => {
    if (!email.trim()) { setError("Enter your email."); return; }
    if (mode !== "reset" && password.length < 6) { setError("Passwords need at least 6 characters."); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === "reset") {
        await sendPasswordReset(email);
        setNotice("If that email has an account, a reset link is on its way.");
      } else if (mode === "up") {
        const { session, needsConfirmation } = await signUpWithPassword(email, password);
        if (needsConfirmation) setNotice("Check your email to confirm the account, then come back and sign in. Your guide is being held until you do.");
        else onSignedIn(session);
      } else {
        onSignedIn(await signInWithPassword(email, password));
      }
    } catch (e) {
      setError(String(e.message || e));
    }
    setBusy(false);
  };

  const label = { in: "Sign in", up: "Create account", reset: "Send reset link" }[mode];
  // The heading answers "why am I being asked", not "what screen is this".
  const heading = mode === "reset" ? "Reset password"
    : reason === "guide" ? (mode === "up" ? "Keep this guide" : "Sign in to keep it")
    : mode === "up" ? "Create an account" : "Sign in";

  const field = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px 13px", fontSize: 14, fontFamily: "'Inter', sans-serif", marginBottom: 9 };
  const linkBtn = { background: "none", border: "none", color: C.light, fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "'Inter', sans-serif", padding: 0 };

  // ── THE ONE STRUCTURAL DIFFERENCE BETWEEN PHONE AND DESKTOP ────────
  // A bottom sheet is the right shape on a phone: it comes from the thumb, it
  // keeps the page visible above it. On a desktop the same shape is a bar stuck
  // to the bottom of a 1080px window, so it becomes a centred card and the
  // photograph stays visible all the way around it.
  const overlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 980,
    display: "flex", justifyContent: "center",
    alignItems: wide ? "center" : "flex-end",
    padding: wide ? 24 : 0, boxSizing: "border-box",
    backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
  };
  const card = {
    background: C.surface, width: "100%", maxWidth: wide ? 430 : 460,
    maxHeight: wide ? "92vh" : "88vh", overflowY: "auto",
    border: `1px solid ${C.border}`,
    borderRadius: wide ? 20 : "20px 20px 0 0",
    borderBottom: wide ? `1px solid ${C.border}` : "none",
    padding: wide ? "26px 26px 24px" : "22px 22px calc(28px + env(safe-area-inset-bottom))",
    boxShadow: wide ? "0 24px 70px rgba(0,0,0,0.55)" : "none",
    position: "relative",
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={card}>
        {/* A plain dismiss, not a form control. The old "Close" pill was the
            same weight as the buttons that do something. */}
        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: wide ? 18 : 14, right: wide ? 18 : 16, background: "none", border: "none", color: C.muted, fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 4, fontFamily: "'Inter', sans-serif" }}>×</button>

        {/* Whose account this is. The sheet had no Gemlyx in it at all. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: wide ? 18 : 14 }}>
          <span style={{ color: C.gold, fontSize: 15 }}>✦</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: 3, color: C.light, fontWeight: 600 }}>GEMLYX</span>
        </div>

        <div style={{ fontSize: wide ? 27 : 24, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.15, marginBottom: 8 }}>
          {heading}
        </div>

        {/* ── WHAT IT BUYS, AND WHAT IT DOES NOT ──────────────────── */}
        <div style={{ fontSize: 13, color: C.light, lineHeight: 1.62, marginBottom: 14 }}>
          {reason === "guide"
            ? <>The guide itself is free and yours to read right now. An account is what keeps it, on this phone and every other one.</>
            : <>An account keeps your saved places and guides on every device instead of just this one.</>}
          {localSaveCount > 0 && (
            <span style={{ color: C.gold }}> The {localSaveCount} {localSaveCount === 1 ? "item" : "items"} already saved on this device will come with you.</span>
          )}
        </div>

        <button onClick={startGoogleSignIn} disabled={busy}
          style={{ width: "100%", background: "#fff", border: "none", color: "#1F1F1F", borderRadius: 11, padding: "13px", fontSize: 14.5, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.9 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.9c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.3-10.2 7.3-17.7z" />
            <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
          autoComplete="email" style={field} />
        {mode !== "reset" && (
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            onKeyDown={e => { if (e.key === "Enter") submit(); }} style={field} />
        )}

        {error && <div style={{ fontSize: 12, color: "#FF8A80", lineHeight: 1.5, marginBottom: 10 }}>{error}</div>}
        {notice && <div style={{ fontSize: 12, color: C.gold, lineHeight: 1.5, marginBottom: 10 }}>{notice}</div>}

        <button onClick={submit} disabled={busy}
          style={{ width: "100%", background: C.gold, border: "none", color: "#0A0F1E", borderRadius: 11, padding: "13px", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: busy ? 0.6 : 1, marginBottom: 12 }}>
          {busy ? "Working…" : label}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {mode !== "up" && <button style={linkBtn} onClick={() => { setMode("up"); setError(null); setNotice(null); }}>Create an account</button>}
          {mode !== "in" && <button style={linkBtn} onClick={() => { setMode("in"); setError(null); setNotice(null); }}>I already have one</button>}
          {mode === "in" && <button style={linkBtn} onClick={() => { setMode("reset"); setError(null); setNotice(null); }}>Forgot password</button>}
        </div>

        {/* ── SAID AT SIGNUP, NOT DISCOVERED LATER ─────────────────
            His rule for entries applied to his own product: never let the
            promise turn out to have been smaller than it sounded. A free
            account keeps the guide. It does not keep the guide CURRENT. */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
          A free account saves your guide and nothing more. Keeping it live as your trip
          approaches, new events worth rerouting for, help while you are actually there,
          that is the paid side, and it is not switched on yet.
        </div>

        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55, marginTop: 12 }}>
          We store your email and your saved list, nothing else. No profile, no tracking, no marketing email. You can delete your account and everything in it from this menu at any time.
        </div>
      </div>
    </div>
  );
};
