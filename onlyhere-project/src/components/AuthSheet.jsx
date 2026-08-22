import { useState, useEffect } from "react";
// The questions themselves live in one place, shared with ProfileSheet.
import { ProfileQuestions } from "./ProfileQuestions";
import { EMPTY_PROFILE, saveProfile, holdProfile, missingRequired, REQUIRED_LABEL } from "../utils/profile";
import { C } from "../utils/theme";
import { signInWithPassword, signUpWithPassword, sendPasswordReset, startGoogleSignIn, updatePassword } from "../utils/auth";
import { GOOGLE_SIGN_IN } from "../config";

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
// AND THE PRIVACY LINE HAD TO MOVE WITH THE PRODUCT. It used to promise "no
// profile", which stopped being true the moment the optional self-description
// was added. A privacy promise that quietly goes stale is worse than one that
// was never made, so it now says what is actually stored.
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
// `recoverySession` is the session a password reset link hands over. It is a
// real, authenticated session, which is what made this flow so easy to leave
// half-built: the app signed them in and everything looked fine, except the one
// thing they came to do. See updatePassword in utils/auth.js.
export const AuthSheet = ({ open, onClose, onSignedIn, localSaveCount, reason, initialMode, recoverySession = null }) => {
  // ── AND NOW IT DEFAULTS TO SIGNING IN ─────────────────────────────
  //
  // Oliver, 21 Aug 2026, point 9: "The create account gotta change… the big
  // yellow button should be login, while the 'understreget' part shall be 'or
  // create an account'."
  //
  // This used to default to CREATE, on the reasoning that there are no
  // returning users yet. That reasoning expires the day there are, and it gets
  // the cost backwards in the meantime: a returning person shown a signup form
  // has to notice a small underlined line to get to the thing they came for,
  // while somebody new is here BECAUSE they were just told they need an
  // account, so the one extra tap lands on the person who already expects one.
  const [mode, setMode] = useState(initialMode || "in");   // "up" | "in" | "reset" | "newpass"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  // ── AND THEN IT ASKS ──────────────────────────────────────────────
  //
  // Oliver's point 9, restated after he tested it: "And creating an account
  // should then change the page into several questions."
  //
  // Those questions existed and lived only in ProfileSheet, which opens after a
  // session exists and behind a thirty day cooldown that ends for good after two
  // skips. On the email path a session does not exist for as long as it takes
  // somebody to open their inbox, so the sheet said "check your email" and
  // closed, and the questions were never reached at all. That is what he was
  // looking at when he wrote "And you still haven't done the account part".
  //
  // So the sheet asks them itself, here, the moment the account is made. Held
  // rather than saved when there is no session yet: same shape as the pending
  // guide save this file already coordinates with, and written on the first
  // session by the effect in App.jsx.
  const [answers, setAnswers] = useState(EMPTY_PROFILE);
  // Turns the asterisks red, and only after somebody has actually pressed the
  // button. A form that scolds before you have typed anything is a worse form.
  const [showGaps, setShowGaps] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 720);

  // The sheet is hidden with an early return rather than unmounted, so its
  // state SURVIVES a close. Without this, somebody who opened it once, switched
  // to Sign in and closed it would be handed the Sign in screen the next time
  // they pressed Sign up, and the Save gate would greet a brand new visitor
  // with a login form. Reset on every opening, from whichever door was used.
  useEffect(() => {
    if (!open) return;
    setMode(initialMode || "in");
    setError(null); setNotice(null); setShowGaps(false); setConfirm("");
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

  // ── ONE PAGE, NOT TWO STEPS ───────────────────────────────────────
  //
  // Oliver, 21 Aug 2026, after seeing the two step version: "Default should be
  // login page. The small part should be 'New User? Sign up here!' And then you
  // get onto a page where you enter mail, password, and the rest of the
  // information."
  //
  // So signing up is ONE form: credentials and the questions together, filled in
  // and submitted once. The previous version made the account first and then
  // asked, which is two decisions where he asked for one, and it also meant
  // somebody could end up with an account and no answers by closing the sheet.
  const submit = async () => {
    setShowGaps(true);
    // ── SETTING A NEW ONE NEEDS NO EMAIL ────────────────────────
    // They arrived holding a recovery token, so who they are is already settled
    // and asking again would be asking them to prove something they just proved.
    if (mode === "newpass") {
      if (password.length < 6) { setError("Passwords need at least 6 characters."); return; }
      if (password !== confirm) { setError("The two passwords do not match."); return; }
      setBusy(true); setError(null); setNotice(null);
      try {
        await updatePassword(recoverySession, password);
        setNotice("Password changed. You are signed in.");
        setBusy(false);
        onSignedIn(recoverySession);
        return;
      } catch (e) { setError(String(e.message || e)); setBusy(false); return; }
    }
    if (!email.trim()) { setError("Enter your email."); return; }
    if (mode !== "reset" && password.length < 6) { setError("Passwords need at least 6 characters."); return; }
    if (mode === "up") {
      // ── AND A CONFIRM FIELD THAT MEANS SOMETHING ────────────────
      // "And make a confirm password section too." Checked before the account
      // is made, because a typo caught afterwards is an account somebody cannot
      // get back into without the reset flow.
      if (password !== confirm) { setError("The two passwords do not match."); return; }
      const gaps = missingRequired(answers);
      if (gaps.length) {
        setError(`Still needed: ${gaps.map(k => REQUIRED_LABEL[k]).join(", ")}.`);
        return;
      }
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === "reset") {
        await sendPasswordReset(email);
        setNotice("If that email has an account, a reset link is on its way.");
      } else if (mode === "up") {
        const { session, needsConfirmation } = await signUpWithPassword(email, password);
        // THE ANSWERS ARE ALREADY IN HAND. Whether a session came back decides
        // only WHERE they go: straight to the row, or held on the device until
        // the confirmation link turns into a session. See takeHeldProfile.
        if (session) await saveProfile(session, answers);
        else holdProfile(answers);
        if (needsConfirmation) {
          // "saved" was not true on this branch. There is no session yet, so the
          // answers are on THIS DEVICE waiting for one, and holdProfile does
          // nothing at all in private mode. Saying so is the difference between
          // somebody confirming on the same phone and somebody confirming on a
          // laptop and wondering where their answers went.
          setNotice("Account made, and your answers are kept on this device. Confirm through the email, then sign in here on this same browser and they will be attached to your account.");
          setBusy(false);
          return;
        }
        onSignedIn(session);
      } else {
        onSignedIn(await signInWithPassword(email, password));
      }
    } catch (e) {
      setError(String(e.message || e));
    }
    setBusy(false);
  };

  const label = { in: "Sign in", up: "Create account", reset: "Send reset link", newpass: "Set new password" }[mode];
  // The heading answers "why am I being asked", not "what screen is this".
  const heading = mode === "newpass" ? "Choose a new password"
    : mode === "reset" ? "Reset password"
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
        {/* ── WHAT SOMEBODY LOCKED OUT NEEDS TO READ ────────────────
            Not the signup pitch. They followed a reset link because they cannot
            get in; telling them an account syncs between devices answers a
            question they did not ask and buries the one instruction that
            matters. Caught by looking at the rendered screen rather than at the
            code, which is the only way this kind of thing is ever caught. */}
        {mode === "newpass" ? (
          <div style={{ fontSize: 13, color: C.light, lineHeight: 1.62, marginBottom: 14 }}>
            Type it twice and you are back in. This link works once, so if it fails, ask for a new one.
          </div>
        ) : (
        <div style={{ fontSize: 13, color: C.light, lineHeight: 1.62, marginBottom: 14 }}>
          {reason === "guide"
            ? <>The guide itself is free and yours to read right now. An account is what keeps it, on this phone and every other one.</>
            : <>An account keeps your saved places and guides on every device instead of just this one.</>}
          {localSaveCount > 0 && (
            <span style={{ color: C.gold }}> The {localSaveCount} {localSaveCount === 1 ? "item" : "items"} already saved on this device will come with you.</span>
          )}
        </div>
        )}

        {/* ── OFF UNTIL THERE IS A PRIVACY POLICY AND TERMS ─────────
            Oliver, 22 Aug 2026: "the google provider won't be available before I
            have a terms of use and privacy policy written." A Google OAuth
            consent screen cannot be published without both URLs, so the provider
            either does not exist in Supabase or refuses at Google's end, and
            this would be the most prominent control on the sheet doing nothing
            but bouncing people back with an error. See config.js: one line turns
            it on, and everything behind it is built and tested already.

            KEPT RATHER THAN DELETED on purpose. Deleting it would mean writing
            the redirect handling, the profile hold and the return-route guard
            again from scratch, and those are the parts that were wrong for
            weeks. Switched off, they stay under test. */}
        {GOOGLE_SIGN_IN && <>
        {/* ── THE GOOGLE BUTTON USED TO EAT THE FORM ────────────────
            It was `onClick={startGoogleSignIn}` with the profile questions
            rendering directly underneath it. So somebody could tap "New User?
            Sign up here!", fill in name, year of birth and gender, press
            Continue with Google, and lose every answer to the redirect. The
            mandatory-field check lives inside submit(), so it never ran either,
            and they landed on the profile nudge instead: a sheet behind a thirty
            day cooldown that stops asking for good after two skips.

            The answers are held on the device first, exactly as the email path
            already does while somebody is off opening their inbox, and
            takeHeldProfile claims them on the other side of the redirect. That
            machinery was already built and already keyed on userSession
            specifically so the Google cold load would work. Nothing was putting
            anything into it. */}
        <button onClick={() => {
          if (mode === "up") {
            setShowGaps(true);
            const gaps = missingRequired(answers);
            if (gaps.length) {
              setError(`Still needed: ${gaps.map(k => REQUIRED_LABEL[k]).join(", ")}.`);
              return;
            }
            holdProfile(answers);
          }
          startGoogleSignIn();
        }} disabled={busy}
          style={{ width: "100%", background: "#fff", border: "none", color: "#1F1F1F", borderRadius: 11, padding: "13px", fontSize: 14.5, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.9 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.9c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.3-10.2 7.3-17.7z" />
            <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        {/* The "or" divider goes with it. A divider separating one thing from
            nothing is the tell that a button used to be there. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        </>}

        {/* ── THE MANDATORY MARKS ───────────────────────────────────
            "Remember to have '*' on parts that is mandatory to answer." Gold
            until somebody presses the button with one empty, then red on the
            ones actually missing, so the same mark that says "this is needed"
            also says "this one". */}
        {mode === "up" && (
          <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 8 }}>
            Email<span style={{ color: showGaps && !email.trim() ? "#FF8A80" : C.gold, marginLeft: 3 }}>*</span>
          </div>
        )}
        {mode !== "newpass" && (
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            autoComplete="email" style={{ ...field, ...(mode === "up" && showGaps && !email.trim() ? { borderColor: "#FF8A80" } : null) }} />
        )}
        {mode !== "reset" && (
          <>
            {/* newpass too, or the new-password box is the one field on the
                screen with no label and no asterisk while the confirm box
                underneath it has both. */}
            {(mode === "up" || mode === "newpass") && (
              <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 8 }}>
                {mode === "newpass" ? "New password" : "Password"}<span style={{ color: showGaps && password.length < 6 ? "#FF8A80" : C.gold, marginLeft: 3 }}>*</span>
                <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, color: C.muted }}> · at least 6 characters</span>
              </div>
            )}
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "newpass" ? "New password" : "Password"}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              style={{ ...field, ...(mode === "up" && showGaps && password.length < 6 ? { borderColor: "#FF8A80" } : null) }} />
          </>
        )}
        {/* ── CONFIRM, AND CHECKED BEFORE THE ACCOUNT IS MADE ───────
            "And make a confirm password section too." A typo caught afterwards
            is an account somebody cannot get back into without the reset flow. */}
        {(mode === "up" || mode === "newpass") && (
          <>
            <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 8 }}>
              Confirm password<span style={{ color: showGaps && (!confirm || confirm !== password) ? "#FF8A80" : C.gold, marginLeft: 3 }}>*</span>
            </div>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type it again"
              autoComplete="new-password" onKeyDown={e => { if (e.key === "Enter") submit(); }}
              style={{ ...field, ...(showGaps && (!confirm || confirm !== password) ? { borderColor: "#FF8A80" } : null) }} />
            {confirm && confirm !== password && (
              <div style={{ fontSize: 11.5, color: "#FF8A80", marginTop: -3, marginBottom: 10 }}>These do not match yet.</div>
            )}

            {/* ── AND THE REST OF THE INFORMATION, ON THE SAME PAGE ──
                "And then you get onto a page where you enter mail, password,
                and the rest of the information." One form, submitted once. */}
            {mode === "up" && <>
              <div style={{ height: 1, background: C.border, margin: "16px 0 18px" }} />
              <ProfileQuestions value={answers} onChange={setAnswers} required showGaps={showGaps} />
            </>}
          </>
        )}

        {error && <div style={{ fontSize: 12, color: "#FF8A80", lineHeight: 1.5, marginBottom: 10 }}>{error}</div>}
        {notice && <div style={{ fontSize: 12, color: C.gold, lineHeight: 1.5, marginBottom: 10 }}>{notice}</div>}

        <button onClick={submit} disabled={busy}
          style={{ width: "100%", background: C.gold, border: "none", color: "#0A0F1E", borderRadius: 11, padding: "13px", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: busy ? 0.6 : 1, marginBottom: 12 }}>
          {busy ? "Working…" : label}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {/* Nothing to switch to mid-recovery: they are here holding a token
              that expires, and every other screen throws it away. */}
          {/* His words: "The small part should be 'New User? Sign up here!'" */}
          {mode !== "up" && mode !== "newpass" && <button style={linkBtn} onClick={() => { setMode("up"); setError(null); setNotice(null); setShowGaps(false); }}>New User? Sign up here!</button>}
          {mode !== "in" && mode !== "newpass" && <button style={linkBtn} onClick={() => { setMode("in"); setError(null); setNotice(null); setShowGaps(false); }}>I already have one</button>}
          {mode === "in" && <button style={linkBtn} onClick={() => { setMode("reset"); setError(null); setNotice(null); }}>Forgot password</button>}
        </div>

        {/* ── SAID AT SIGNUP, NOT DISCOVERED LATER ─────────────────
            His rule for entries applied to his own product: never let the
            promise turn out to have been smaller than it sounded. A free
            account keeps the guide. It does not keep the guide CURRENT. */}
        {mode !== "newpass" && <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
          A free account saves your guide and nothing more. Keeping it live as your trip
          approaches, new events worth rerouting for, help while you are there,
          that is the paid side, and it is not switched on yet.
        </div>}

        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55, marginTop: 12 }}>
          We store your email and your saved list. Next you can add a few optional details about yourself, which only ever shape what Gemlyx suggests to you. No tracking, no marketing email, nothing sold. You can delete your account and everything in it from this menu at any time.
        </div>
      </div>
    </div>
  );
};
