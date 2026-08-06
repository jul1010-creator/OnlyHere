import { useState } from "react";
import { C } from "../utils/theme";
import { signInWithPassword, signUpWithPassword, sendPasswordReset, startGoogleSignIn } from "../utils/auth";

// Sign in / sign up, offered as Google OR email and password (Oliver's call).
//
// The framing throughout is that an account is OPTIONAL and buys exactly one
// thing: saves that follow you between devices. No countdown, no "unlock", no
// implication that the app is worse without it, because it isn't.
export const AuthSheet = ({ open, onClose, onSignedIn, localSaveCount }) => {
  const [mode, setMode] = useState("in");        // "in" | "up" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

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
        if (needsConfirmation) setNotice("Check your email to confirm the account, then come back and sign in.");
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
  const field = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "11px 13px", fontSize: 14, fontFamily: "'Inter', sans-serif", marginBottom: 9 };
  const linkBtn = { background: "none", border: "none", color: C.light, fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "'Inter', sans-serif", padding: 0 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 980, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", padding: "24px 22px calc(32px + env(safe-area-inset-bottom))", border: `1px solid ${C.border}`, borderBottom: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text }}>
            {mode === "up" ? "Create an account" : mode === "reset" ? "Reset password" : "Sign in"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Close</button>
        </div>

        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 16 }}>
          An account is optional. It does one thing: keeps your saved places and guides on every device instead of just this one.
          {localSaveCount > 0 && (
            <span style={{ color: C.gold }}> You have {localSaveCount} saved {localSaveCount === 1 ? "item" : "items"} on this device, and they will come with you.</span>
          )}
        </div>

        <button onClick={startGoogleSignIn} disabled={busy}
          style={{ width: "100%", background: "#fff", border: "none", color: "#1F1F1F", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.9 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.9c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.3-10.2 7.3-17.7z" />
            <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>or</span>
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
          style={{ width: "100%", background: C.gold, border: "none", color: "#0A0F1E", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: busy ? 0.6 : 1, marginBottom: 12 }}>
          {busy ? "Working…" : label}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {mode !== "up" && <button style={linkBtn} onClick={() => { setMode("up"); setError(null); setNotice(null); }}>Create an account</button>}
          {mode !== "in" && <button style={linkBtn} onClick={() => { setMode("in"); setError(null); setNotice(null); }}>Sign in instead</button>}
          {mode === "in" && <button style={linkBtn} onClick={() => { setMode("reset"); setError(null); setNotice(null); }}>Forgot password</button>}
        </div>

        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55, marginTop: 16 }}>
          We store your email and your saved list, nothing else. No profile, no tracking, no marketing email. You can delete your account and everything in it from this menu at any time.
        </div>
      </div>
    </div>
  );
};
