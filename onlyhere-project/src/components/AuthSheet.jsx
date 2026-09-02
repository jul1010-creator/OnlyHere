import { useState, useEffect } from "react";
// The questions themselves live in one place, shared with ProfileSheet.
import { ProfileQuestions } from "./ProfileQuestions";
import { EMPTY_PROFILE, saveProfile, holdProfile, missingRequired, REQUIRED_LABEL, underMinimumAge, MIN_ACCOUNT_AGE, TERMS_VERSION } from "../utils/profile";
import { C } from "../utils/theme";
import { signInWithPassword, signUpWithPassword, sendPasswordReset, startGoogleSignIn, updatePassword, resendConfirmation } from "../utils/auth";
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
// Sixty seconds. Long enough that nobody spends both of the hour's two emails in
// one impatient burst, short enough that a genuinely lost message is not a
// punishment. Counted down on screen rather than hidden, so the button is never
// just mysteriously dead.
const RESEND_COOLDOWN_MS = 60000;

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
  // ── THE SCREEN THAT WAITS FOR THE EMAIL ───────────────────────────
  //
  // Oliver, 22 Aug 2026, of the old behaviour: "this is truly 2005. Create
  // account. Open new page. Like that."
  //
  // What it did was print a sentence in gold above the Create account button and
  // leave the entire form standing underneath it, every field still filled in,
  // the button still saying Create account. So the one moment where the person
  // has to go and DO something arrived as a line of text in the middle of a form
  // that looked like it had not been submitted.
  //
  // Making an account is a step that ENDS. It gets its own screen.
  //
  // Held as the address rather than a boolean, because the address is the whole
  // content of that screen: the single most useful thing it can show somebody is
  // exactly which mailbox to go and look in, spelled out, so a typo is visible
  // rather than mysterious.
  const [sentTo, setSentTo] = useState("");
  const [resendAt, setResendAt] = useState(0);   // epoch ms the resend unlocks
  const [now, setNow] = useState(() => Date.now());
  // The other deliberate way out, since the backdrop is no longer one. Bound
  // only while the sheet is open, so it cannot swallow Escape from anything else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
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
  // ── EVERY FIELD, NOT FIVE OF THEM ─────────────────────────────────
  //
  // This reset mode, error, notice, showGaps and confirm, and left `sentTo`,
  // `email`, `password`, `answers` and `resendAt` alone. An adversarial review on
  // 22 Aug found what that costs, and the component is mounted permanently
  // (App.jsx renders it unconditionally), so nothing else ever clears them.
  //
  //   sentTo:  sign up, close the sheet, later press "Log in". mode is "in" and
  //            `sentTo` still short-circuits the whole form, so a returning
  //            person gets "Check your email" with no sign-in form and no way
  //            back except a button labelled "Wrong address".
  //   email,
  //   password: person A signs in on a shared laptop and signs out. Person B
  //            presses Sign up and gets A's address rendered in the field and
  //            A's password still in the masked one, a devtools inspection away.
  //   answers: and A's name, date of birth and gender still in the form under it.
  //
  // A sheet that opens is a sheet that starts again. The only thing deliberately
  // kept is nothing.
  useEffect(() => {
    if (!open) return;
    setMode(initialMode || "in");
    setError(null); setNotice(null); setShowGaps(false);
    setEmail(""); setPassword(""); setConfirm("");
    setAnswers(EMPTY_PROFILE);
    setSentTo(""); setResendAt(0);
  }, [open, initialMode]);

  // Declared BEFORE the early return, because a hook that only sometimes runs
  // is a hooks-order crash on the render where `open` flips. Cleaned up on
  // unmount so opening the sheet five times does not leave five listeners.
  // ── A COOLDOWN THAT IS THERE TO PROTECT THEM ──────────────────────
  // Supabase's built-in email service allows TWO messages an hour. A resend
  // button with no cooldown invites somebody to spend both of them in ten
  // seconds and then be locked out of their own confirmation for the rest of the
  // hour. Ticks only while a cooldown is actually running, so an idle sheet is
  // not re-rendering once a second forever.
  // ── AND IT HAS TO STOP TICKING WHEN THE COOLDOWN ENDS ─────────────
  // The guard was evaluated once per effect run against Date.now(), and neither
  // dependency changes when the sixty seconds elapse, so nothing re-ran the
  // effect and the interval fired forever: on a closed sheet, for the rest of the
  // page's life, once a second, on a component returning null. The comment above
  // claimed the opposite. `now` in the deps is what makes the guard re-checked,
  // and the effect then tears its own interval down on the tick that passes it.
  useEffect(() => {
    if (!open || !sentTo || resendAt <= now) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open, sentTo, resendAt, now]);

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
  // ── AND SENDING IT AGAIN ──────────────────────────────────────────
  // Its own function rather than a branch of submit(), because submit() is four
  // flows deep already and this shares none of them: no validation, no profile,
  // no session, one call and a cooldown.
  const resend = async () => {
    if (busy || Date.now() < resendAt) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await resendConfirmation(sentTo);
      setNotice("Sent again. Check your spam folder too.");
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
    } catch (e) {
      // SURFACED, not swallowed. "email rate limit exceeded" is the expected
      // answer to an impatient third press, since the built-in sender allows two
      // an hour, and a person told nothing will simply press it again.
      setError(String(e.message || e));
    }
    setBusy(false);
  };

  // The answers, plus the record of what was agreed to at the instant it was.
  const acceptedNow = (a) => ({ ...a, termsVersion: TERMS_VERSION, termsAcceptedAt: new Date().toISOString() });

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
        // ── AND THE SHEET HAS TO BE ABLE TO LEAVE ─────────────────
        // onSignedIn closes the sheet by clearing authOpen, but the recovery
        // sheet is held open by `recoverySession` and not by authOpen, so the
        // modal stayed up on the new-password screen with both fields filled and
        // "Password changed" underneath them. Worse, nothing reset authMode, so
        // the NEXT opening from any door came back as "newpass": no email field,
        // no mode links, and a Set new password button calling updatePassword
        // with a null session. A dead end reachable from a successful action.
        //
        // onDone is the sheet saying it is finished, which is the caller's job to
        // act on. See handleSignedIn in App.jsx.
        onSignedIn(recoverySession, { done: true });
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
      // ── THE AGE THE TERMS PROMISE ─────────────────────────────
      // terms.html clause 5.1 and privacy.html section 16 both state a minimum
      // of 15, and until now nothing anywhere checked it. Runs AFTER the gaps
      // check so an empty date box is reported as missing rather than as an age
      // failure. See underMinimumAge, which returns false for a date it cannot
      // read for exactly that reason.
      if (underMinimumAge(answers.bornDate || answers.bornYear)) {
        setError(`You have to be at least ${MIN_ACCOUNT_AGE} to make an account.`);
        return;
      }
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === "reset") {
        await sendPasswordReset(email);
        setNotice("If that email has an account, a reset link is on its way.");
      } else if (mode === "up") {
        // The name goes to Supabase as user metadata as well as into the
        // profile row, because the confirmation email template can only read
        // the auth row. See signUpWithPassword.
        // Clause 3.3 of the terms says the accepted version is recorded
        // against the Account. Stamped here, at the one moment acceptance
        // happens, rather than defaulted inside the profile cleaner, because a
        // default would claim every row had agreed to whatever version happens
        // to be current when it was next read.
        const accepted = acceptedNow(answers);
        const { session, needsConfirmation } = await signUpWithPassword(email, password, answers.name);
        // THE ANSWERS ARE ALREADY IN HAND. Whether a session came back decides
        // only WHERE they go: straight to the row, or held on the device until
        // the confirmation link turns into a session. See takeHeldProfile.
        if (session) await saveProfile(session, accepted);
        else holdProfile(accepted);
        if (needsConfirmation) {
          // A SCREEN, not a sentence wedged into the form they just filled in.
          // See the note on sentTo above.
          setSentTo(email.trim());
          setResendAt(Date.now() + RESEND_COOLDOWN_MS);
          setNow(Date.now());
          setBusy(false);
          return;
        }
        onSignedIn(session);
      } else {
        // ── A 200 WITH NO TOKEN IS NOT A SIGN IN ──────────────────
        // shape() returns null whenever the body carries no access_token, and
        // signInWithPassword then writes null to storage. Passing that straight
        // to onSignedIn set userSession to null and closed the sheet: signed
        // out, no error, nothing on screen. Exactly the silent failure the OAuth
        // path was rewritten to stop, on the other door.
        const signedIn = await signInWithPassword(email, password);
        if (!signedIn) { setError("That sign in did not come back with a session. Try again in a moment."); setBusy(false); return; }
        onSignedIn(signedIn);
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
    // A reader who tapped "Review article" is asking to say something, not to
    // keep something. The heading answers why they are being asked, and the
    // guide wording would be a non-sequitur here.
    : reason === "review" ? (mode === "up" ? "Review this article" : "Sign in to review it")
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
    // ── CLICKING BESIDE THE SHEET USED TO THROW THE FORM AWAY ────────
    //
    // Oliver, 22 Aug 2026: "when you accidently click off the 'sign up' or
    // 'login' page. You fly out of it, instead of clicking the cross button.
    // That is quite annoying when you're trying to create an account."
    //
    // Tap-outside-to-dismiss is right for a sheet you are READING and wrong for
    // one you are FILLING IN. The signup form is a name, a year, a gender, an
    // email and two passwords, and the miss target is the whole page: every
    // pixel outside a 430px card, including the strip beside a field you were
    // aiming at. One slip and all of it is gone, with no undo and no warning.
    //
    // So the backdrop no longer closes it. The cross does, and Escape does,
    // which are both deliberate acts. Nothing here is destructive enough to need
    // a confirm on the way out; it just needs to not happen by accident.
    <div style={overlay}>
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

        {/* ── THE STEP THAT ENDS ────────────────────────────────────
            Everything below this branch is the FORM. Once an account exists and
            is waiting on an email, the form is finished and showing it again,
            still filled in, still offering a Create account button, is what made
            the old version read as 2005. */}
        {sentTo ? (
          <div style={{ textAlign: "center", paddingTop: 4 }}>
            {/* Drawn, not an illustration. A stock envelope graphic would be the
                only thing in the app that did not come from the same hand, and
                the whole sheet is otherwise line work in the gold. The flap is a
                separate open stroke so it reads as a letter going out rather
                than a closed rectangle. */}
            <div style={{ width: 74, height: 74, margin: "6px auto 20px", borderRadius: "50%", background: `${C.gold}14`, border: `1px solid ${C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                <path d="M3 7l8.1 5.6a1.6 1.6 0 0 0 1.8 0L21 7" />
              </svg>
            </div>

            <div style={{ fontSize: wide ? 26 : 23, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.2, marginBottom: 10 }}>
              Check your email
            </div>

            {/* THE ADDRESS IS THE POINT OF THIS SCREEN. Spelled out in the gold
                on its own line, because a typo is invisible in a form field
                somebody has already stopped looking at, and obvious here. */}
            <div style={{ fontSize: 13.5, color: C.light, lineHeight: 1.65, marginBottom: 6 }}>
              A confirmation link is on its way to
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.gold, marginBottom: 16, wordBreak: "break-all", fontFamily: "'Inter', sans-serif" }}>
              {sentTo}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.7, marginBottom: 20, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
              Open it and you are in. It can take a minute or two, and it does sometimes land in spam.
              {/* Said here as well as in the old notice, because this is the
                  screen somebody is looking at when they decide which device to
                  open the mail on, and that decision is the one that costs them
                  their answers. */}
              <br /><br />
              The answers you just gave are kept on this device. Confirm in this same browser and they come with you.
            </div>

            {error && <div style={{ fontSize: 12, color: "#FF8A80", lineHeight: 1.5, marginBottom: 12 }}>{error}</div>}
            {notice && <div style={{ fontSize: 12, color: C.gold, lineHeight: 1.5, marginBottom: 12 }}>{notice}</div>}

            {/* Secondary, deliberately. The action this screen wants is for
                somebody to leave and go to their inbox, not to press a button
                here, so the button that keeps them here does not look like the
                thing to do. */}
            <button onClick={resend} disabled={busy || now < resendAt}
              style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: now < resendAt ? C.muted : C.light, borderRadius: 11, padding: "12px", fontSize: 13.5, fontWeight: 600, cursor: (busy || now < resendAt) ? "default" : "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>
              {busy ? "Sending…" : now < resendAt ? `Send it again in ${Math.ceil((resendAt - now) / 1000)}s` : "Send it again"}
            </button>

            {/* The other half of showing the address: a way to fix it. Clears
                the screen back to the form with everything still in it, so a
                mistyped address is a two-character repair rather than filling
                the whole thing in again. */}
            <button style={linkBtn} onClick={() => { setSentTo(""); setError(null); setNotice(null); }}>
              Wrong address? Go back
            </button>
          </div>
        ) : (<>

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
            : reason === "review"
              ? <>Reviews of our writing need an account, so we know a real person is behind each one. Reporting something out of date needs nothing at all — that button is right there for everybody.</>
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
            // The email path has the same two checks in submit(). A gate on one
            // route only is not a gate, and this is the route that leaves the
            // site, so a miss here is an underage account made on the way back.
            if (underMinimumAge(answers.bornDate || answers.bornYear)) {
              setError(`You have to be at least ${MIN_ACCOUNT_AGE} to make an account.`);
              return;
            }
            holdProfile(acceptedNow(answers));
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
          style={{ width: "100%", background: C.gold, border: "none", color: C.onGold, borderRadius: 11, padding: "13px", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: busy ? 0.6 : 1, marginBottom: 12 }}>
          {busy ? "Working…" : label}
        </button>

        {/* ── ACCEPTANCE, AT THE MOMENT OF ACCEPTANCE ──────────────
            A line under the button rather than a tick box. For a free account a
            linked line is the ordinary pattern, and a box would be one more
            thing to argue with on a form he has already asked to be shorter.
            Revisit when there is money involved and evidence of acceptance is
            worth the friction. Which version was agreed to is written to the
            row by acceptedNow, so the line and the record cannot drift.

            target="_blank" on purpose: these open beside a half filled form.
            Navigating away from it would lose every answer, which is the same
            fault the Google button had. */}
        {mode === "up" && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginTop: -2, marginBottom: 12 }}>
          By creating an account you agree to the{" "}
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>Terms of Service</a>
          {" "}and the{" "}
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>Privacy Policy</a>.
        </div>}

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

        {/* ── THIS LINE HAS TO MOVE WITH THE PRODUCT ───────────────
            It used to read "We store your email and your saved list. Next you
            can add a few optional details about yourself", which described the
            product as it was on 10 August. Since then the details moved into
            signup, three of them became mandatory, and profileLearning started
            noticing things nobody typed. A promise that quietly turns out to
            have been smaller than it sounded is the one failure his own rule
            for entries forbids, and it applies to his own signup form.
            Anything added to what an account holds gets added here in the same
            change, and to public/privacy.html on the same day. */}
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55, marginTop: 12 }}>
          We store your email, what you fill in here, and your saved list. Gemlyx also notices which kinds of trip you build, so the next guide lands closer. No tracking, no marketing email, nothing sold. You can delete your account and everything in it from this menu at any time, and the <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: C.muted, textDecoration: "underline" }}>Privacy Policy</a> is the long version.
        </div>
        </>)}
      </div>
    </div>
  );
};
