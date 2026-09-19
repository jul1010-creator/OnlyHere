// ── THE PAGE A PERSON REACHES WHEN SOMETHING IS WRONG ───────────────
//
// Oliver, 25 Aug 2026: "we need a proper customer support page. Mail you write
// from, topic, and then what you're writing."
//
// The reasoning about the fields, the topic vocabulary and the Digital Services
// Act obligation folded into them is all in utils/support.js. This file renders
// it and does three things that file cannot.
//
// ── ONE. IT IS BUILT FROM REAL FORM ELEMENTS ────────────────────────
//
// EU_COMPLIANCE_24AUG.md counted the state of this repo on 24 August: tabIndex
// used zero times, thirty-seven clickable divs in App.jsx, thirty-eight
// instances of `outline: none`. Parts of the interface cannot be reached from a
// keyboard at all. The European Accessibility Act exempts Gemlyx today on the
// microenterprise threshold, and the exemption evaporates the day the business
// grows.
//
// So this page uses <form>, <label>, <input>, <select>, <textarea> and <button>,
// with no outline suppressed anywhere. That is not diligence for its own sake,
// it buys three things for free: theme.js's FIELD_CSS already paints every real
// input with the 2px border and the focus ring that Oliver's father asked for on
// 21 August; the browser gives keyboard and screen reader behaviour nothing here
// has to reimplement; and Enter submits.
//
// ── TWO. IT NEVER LOSES WHAT SOMEBODY WROTE ─────────────────────────
//
// If the insert fails, for any reason, the person is holding a message they have
// already composed. So the failure path hands them a mailto carrying every word
// of it and says plainly that nothing was recorded, rather than showing a red
// box and asking them to try again.
//
// That is also what makes this page work the moment it is pushed. The table does
// not exist until Oliver runs SUPPORT_SETUP_SQL; until he does, every submission
// takes the fallback and still reaches him.
//
// ── THREE. IT DOES NOT SAY MORE THAN IS TRUE ────────────────────────
//
// No "within 24 hours". No "we have emailed you a copy", because nothing in
// this app sends email. Those two are promises that cost something when they
// are untrue, and they stay out.
//
// The company voice is Oliver's call and he made it on 15 Sep: the page says
// "The Gemlyx team read all feedback." He is not claiming a support desk or a
// response time, which is what would have been the problem, and the trader
// identity that the law does want named is in terms.html, where it belongs.
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY, APP_VERSION } from "../config";
// Synchronous, for the reason in the note in the component: the form must not
// flash a "needs an account" block at somebody who already has one.
import { getStoredSession } from "../utils/auth";
import { withContext, readBrowserFacts } from "../utils/problemContext";
import { GemlyxLogo } from "./GemlyxLogo";
import { ME_PATH } from "../utils/tabUrl";
import {
  SUPPORT_TOPICS, REPORT_TOPIC, PROBLEM_TOPIC, GOOD_FAITH_STATEMENT, MESSAGE_MAX, NAME_MAX, isTopic,
  messagePrompt, supportProblems, problemFor, supportPayload, supportReference,
  supportMailto, supportReceipt, SUPPORT_TABLE, SUPPORT_EMAIL, PRIVACY_EMAIL,
} from "../utils/support";

const EMPTY = { email: "", name: "", topic: "", message: "", url: "", goodFaith: false };

const field = {
  width: "100%",
  background: C.surface,
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 14,
  color: C.text,
  fontFamily: "'Inter', sans-serif",
  boxSizing: "border-box",
};

// A fault is announced with role="alert" so it is spoken as well as shown, and
// tied to its own box with aria-describedby so somebody who cannot see the red
// still knows WHICH field the sentence is about.
const Fault = ({ id, text }) => !text ? null : (
  <div id={id} role="alert" style={{ fontSize: 12, color: C.accent, marginTop: 6, fontWeight: 600 }}>{text}</div>
);

const Label = ({ htmlFor, children, hint }) => (
  <div style={{ marginBottom: 6 }}>
    <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{children}</label>
    {hint ? <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontWeight: 400 }}>{hint}</div> : null}
  </div>
);

// ── AND ONE TOPIC NOW NEEDS AN ACCOUNT ──────────────────────────────
//
// Oliver, 15 Sep 2026: "The 'something is broken' should only be visible for
// people with accounts. If you don't have an account, you cannot report."
//
// The menu row is hidden for a signed out visitor, and a hidden row is not a
// gate: /support?topic=problem is a URL anybody can type, and the topic is also
// reachable from the dropdown on this page. So the rule lives here, where the
// form is, rather than only where the button was.
//
// THE BUG TOPIC ONLY. "Report content" is the legal notice route and stays open
// to anybody, because a person telling a Danish business that something on its
// site is unlawful must not first be made to register with it. Same for the
// privacy topic and the same reasoning as the Support row in the menu.
export const SupportPage = () => {
  const navigate = useNavigate();
  // ── ITS OWN SESSION, NOT ONE PASSED DOWN ────────────────────────
  //
  // The first version took signedIn and userEmail as props, and the Routes
  // block that renders this page sits OUTSIDE GemlyxApp, so there was nothing
  // there to pass. The scanner in tests/tdz.mjs caught it as four unresolved
  // identifiers before it ever ran.
  //
  // Reading it here is the better shape regardless. This is a standalone page
  // on its own route; it already reads its own search params, and a page that
  // works on its own cannot be broken by where it is mounted.
  //
  // getStoredSession rather than getSession: synchronous, so the form does not
  // flash a "needs an account" block at somebody who has one while a refresh
  // round trip finishes. An expired token still reads as signed in here, and
  // that is the right trade: the insert goes with the anon key either way, so
  // the worst case is a stale session seeing a form it is welcome to use.
  const session = getStoredSession();
  const signedIn = !!session?.token;
  const userEmail = session?.email || "";
  // ── ARRIVING WITH THE TOPIC ALREADY CHOSEN ──────────────────────
  //
  // The Report a problem row in the menu comes here as /support?topic=problem.
  // Somebody who pressed a button that says what it is about should not then be
  // asked what it is about, and during a beta that dropdown is the one step
  // between a stranger noticing a bug and giving up on telling anybody.
  //
  // isTopic, not the raw parameter: ?topic=nonsense is a URL somebody can type,
  // and an unknown value would leave the select showing nothing while the form
  // insisted a topic was required.
  const [params] = useSearchParams();
  const asked = String(params.get("topic") || "");
  // Prefilled from the session rather than asked for again. They are signed in,
  // we already know the address, and a box somebody has to retype is a box some
  // of them leave empty, which costs the reply. Still editable: a person may
  // want an answer somewhere else.
  const [form, setForm] = useState(() => ({
    ...(isTopic(asked) ? { ...EMPTY, topic: asked } : EMPTY),
    email: String(userEmail || ""),
  }));
  const [sending, setSending] = useState(false);
  // null while composing, then one of: { ok: true, receipt } | { ok: false, mailto }
  const [done, setDone] = useState(null);
  // Faults appear only after a submit attempt. Marking a field red before
  // somebody has finished typing in it is telling them they are wrong for not
  // having got there yet.
  const [tried, setTried] = useState(false);

  const reporting = form.topic === REPORT_TOPIC;
  // The one topic that needs an account. Not `reporting`: that is the legal
  // content notice, which is a different thing wearing a similar word.
  const needsAccount = form.topic === PROBLEM_TOPIC && !signedIn;
  const problems = useMemo(() => supportProblems(form), [form]);
  const fault = (f) => (tried ? problemFor(problems, f) : "");
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    // Checked here as well as hidden in the UI, because the button is not the
    // rule. A form that is merely not shown is one a stale tab still submits.
    if (needsAccount) return;
    if (problems.length) return;
    setSending(true);
    const reference = supportReference();
    // ── WHAT THE APP COULD SEE, ATTACHED RATHER THAN ASKED FOR ──────
    //
    // Only on the bug topic. Every other message on this page is a person
    // telling us something about themselves or about a page, and collecting
    // their browser and screen size to answer a partnership enquiry would be
    // taking more than the conversation needs. See utils/problemContext.js for
    // what is in it and, more to the point, what is deliberately not.
    const sent = form.topic === PROBLEM_TOPIC
      ? { ...form, message: withContext(form.message, readBrowserFacts({ version: APP_VERSION })) }
      : form;
    // ── THE COLUMN IS NEWER THAN THE TABLE ──────────────────────────
    //
    // `name` arrived on 15 Sep and the one-line migration is in
    // SUPPORT_SETUP_SQL, which is his to run. PostgREST answers a row naming an
    // unknown column with 400, so between the push and the migration EVERY
    // message with a name in it would have taken the mailto fallback: a person
    // who filled in the optional box would be the one whose message did not
    // arrive, which is the wrong way round.
    //
    // So the insert is tried once as written and, if it fails with a name on
    // it, once more without that field. The name is not lost either way, since
    // the mailto fallback carries it, and a second attempt only ever happens on
    // a failure that already cost the person nothing.
    const post = (row) => fetch(`${SUPABASE_URL}/rest/v1/${SUPPORT_TABLE}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    try {
      const row = supportPayload(sent, { reference });
      let res = await post(row);
      if (!res.ok && row.name) {
        const { name, ...withoutName } = row;
        res = await post(withoutName);
      }
      // ── AND NOT INTO AN INBOX, AS OF 15 SEP ─────────────────────
      //
      // This used to post the same message to api/report-problem, which mailed
      // it to hello@. Oliver, later the same day: "all the reports should go to
      // Oliververhein@gmail.com's account. So not on the mail, but in a report
      // fixes tab for studio."
      //
      // He is right, and the mail was the weaker half anyway. A report in an
      // inbox has no state: it cannot be marked handled, it sits among
      // everything else competing for the same attention, and answering one
      // means finding it again. The row can be read in Studio, sorted, and
      // ticked off, which is what a beta actually needs.
      //
      // The row was always the record. This only stops the second copy.
      // A 2xx is the only thing that means stored. Everything else, including a
      // table that does not exist yet and a policy that refuses the insert,
      // takes the path that does not lose the message.
      // `sent` on the mailto too, so a report that falls all the way through to
      // the person's own mail client still carries what the app could see. The
      // fallback existing is no reason for it to be worth less.
      if (res.ok) setDone({ ok: true, receipt: supportReceipt(form, reference) });
      else setDone({ ok: false, mailto: supportMailto(sent, reference) });
    } catch {
      setDone({ ok: false, mailto: supportMailto(sent, reference) });
    } finally { setSending(false); }
  };

  const shell = (children) => (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 64px" }}>
        {/* The menu, which is where every route into this page starts. */}
        <button onClick={() => navigate(ME_PATH)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginBottom: 26 }}>
          <GemlyxLogo size={18} color={C.text} />
          <span style={{ fontSize: 13, color: C.muted }}>Back to the menu</span>
        </button>
        {children}
      </div>
    </div>
  );

  if (done?.ok) {
    return shell(
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 14px" }}>{done.receipt.title}</h1>
        {done.receipt.lines.map((line, i) => (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: i === 0 ? C.text : C.muted, margin: "0 0 10px" }}>{line}</p>
        ))}
        <button onClick={() => { setForm(EMPTY); setTried(false); setDone(null); }}
          style={{ marginTop: 18, background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: C.text, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          Write another message
        </button>
      </div>
    );
  }

  if (done && !done.ok) {
    return shell(
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 14px" }}>That did not send</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: C.muted, margin: "0 0 14px" }}>
          Nothing was recorded, so this did not reach anybody. Your message is not lost: the button below opens
          it in your own mail app, already written out, ready to send.
        </p>
        <a href={done.mailto}
          style={{ display: "inline-block", background: C.accent, color: C.onAccent, borderRadius: 10, padding: "12px 18px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          Open it in my mail app
        </a>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>
          Or write to {SUPPORT_EMAIL} yourself.
        </p>
        <button onClick={() => setDone(null)}
          style={{ marginTop: 14, background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: C.text, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          Back to the form
        </button>
      </div>
    );
  }

  return shell(
    <form onSubmit={submit} noValidate>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>Contact Gemlyx</h1>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: C.muted, margin: "0 0 26px" }}>
        The Gemlyx team read all feedback.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Label htmlFor="sup-topic">What is this about?</Label>
        <select id="sup-topic" value={form.topic} onChange={set("topic")}
          aria-invalid={!!fault("topic")} aria-describedby={fault("topic") ? "sup-topic-fault" : undefined}
          style={{ ...field, cursor: "pointer" }}>
          <option value="">Choose one</option>
          {SUPPORT_TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <Fault id="sup-topic-fault" text={fault("topic")} />
      </div>

      {/* ── THE ONE TOPIC THAT NEEDS AN ACCOUNT ──────────────────────
          Placed under the topic picker rather than replacing the page,
          because it has to appear the moment somebody CHANGES the dropdown
          to Feedback, not only when they arrive on that topic. Everything
          below stays on screen: a form that vanishes reads as a fault, and
          they may pick another topic instead.

          It says why. "You need an account" with no reason reads as a wall;
          the reason is that a report he cannot answer or tie to an account
          is not worth much to either end. */}
      {needsAccount && (
        <div style={{ marginBottom: 20, background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            Feedback needs an account
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light, marginBottom: 12 }}>
            So we can write back to you, and so a fix can be tied to what you were doing. It takes a moment and nothing else on this page needs one.
          </div>
          {/* Home, rather than opening a sheet this page cannot reach. Signing
              in there makes the Feedback row appear in the menu, so the way
              back is the way they came rather than a step to remember. */}
          <button type="button" onClick={() => navigate(ME_PATH)}
            style={{ background: C.gold, border: "none", color: C.onGold, borderRadius: 10, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Go to Gemlyx and sign in
          </button>
        </div>
      )}

      {/* ── NO ADDRESS BOX ────────────────────────────────────────────
          Oliver, 15 Sep: "I just want their mail gone. There is no need for
          them to enter their mail. They can write their name, but should be
          optional."

          The address is not asked for anywhere on this page now. A signed-in
          message still carries the account's address, filled in from the
          session in the state above and never shown, so Feedback, which needs
          an account, is still answerable. Everything else arrives with no way
          to reply, and the receipt says that at the moment it is sent.

          A label and a control, nothing underneath. */}
      <div style={{ marginBottom: 20 }}>
        <Label htmlFor="sup-name">
          Your name <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span>
        </Label>
        <input id="sup-name" type="text" value={form.name} onChange={set("name")}
          autoComplete="name" maxLength={NAME_MAX}
          aria-invalid={!!fault("name")} aria-describedby={fault("name") ? "sup-name-fault" : undefined}
          style={field} />
        <Fault id="sup-name-fault" text={fault("name")} />
      </div>

      {reporting && (
        <div style={{ marginBottom: 20 }}>
          <Label htmlFor="sup-url" hint="The exact page. Copy it out of your address bar.">
            Where is the content?
          </Label>
          <input id="sup-url" type="url" value={form.url} onChange={set("url")}
            placeholder="https://www.gemlyxtravel.com/denmark/..."
            aria-invalid={!!fault("url")} aria-describedby={fault("url") ? "sup-url-fault" : undefined}
            style={field} />
          <Fault id="sup-url-fault" text={fault("url")} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <Label htmlFor="sup-message" hint={messagePrompt(form.topic)}>Your message</Label>
        <textarea id="sup-message" value={form.message} onChange={set("message")} rows={7} maxLength={MESSAGE_MAX}
          aria-invalid={!!fault("message")} aria-describedby={fault("message") ? "sup-message-fault" : undefined}
          style={{ ...field, resize: "vertical", lineHeight: 1.55 }} />
        <Fault id="sup-message-fault" text={fault("message")} />
      </div>

      {reporting && (
        <div style={{ marginBottom: 22, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
          <label htmlFor="sup-faith" style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input id="sup-faith" type="checkbox" checked={form.goodFaith} onChange={set("goodFaith")}
              aria-describedby={fault("goodFaith") ? "sup-faith-fault" : undefined}
              style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0, cursor: "pointer" }} />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: C.text }}>{GOOD_FAITH_STATEMENT}</span>
          </label>
          <Fault id="sup-faith-fault" text={fault("goodFaith")} />
        </div>
      )}

      {/* Disabled rather than hidden while the account is missing. A button that
          disappears leaves somebody looking for it; one that is visibly off,
          under a block that says why, has already answered the question. */}
      <button type="submit" disabled={sending || needsAccount}
        style={{ background: C.accent, color: C.onAccent, border: "none", borderRadius: 10, padding: "13px 22px", fontSize: 14, fontWeight: 700, cursor: (sending || needsAccount) ? "default" : "pointer", opacity: (sending || needsAccount) ? 0.6 : 1, fontFamily: "'Inter', sans-serif" }}>
        {sending ? "Sending" : reporting ? "Send report" : "Send message"}
      </button>

      {tried && problems.length > 0 && (
        <div role="status" style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
          {problems.length === 1 ? "One thing needs fixing above." : `${problems.length} things need fixing above.`}
        </div>
      )}

      <div style={{ marginTop: 30, paddingTop: 18, borderTop: `1px solid ${C.border}`, fontSize: 12, lineHeight: 1.7, color: C.muted }}>
        <p style={{ margin: "0 0 8px" }}>
          Your address and message are stored so the message can be answered, and kept no longer than is needed
          to deal with it. What Gemlyx holds and why is set out in the <a href="/privacy.html" style={{ color: C.muted }}>Privacy Policy</a>.
        </p>
        <p style={{ margin: 0 }}>
          Data protection requests can also go straight to {PRIVACY_EMAIL}.
        </p>
      </div>
    </form>
  );
};

export default SupportPage;
