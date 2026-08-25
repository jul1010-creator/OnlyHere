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
// No "our team". No "within 24 hours". No "we have emailed you a copy", because
// nothing in this app sends email. One person reads this and the confirmation
// says so. The temptation to sound like a company is strongest on exactly this
// screen, and the whole product is built on not doing that.
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { GemlyxLogo } from "./GemlyxLogo";
import {
  SUPPORT_TOPICS, REPORT_TOPIC, GOOD_FAITH_STATEMENT, MESSAGE_MAX,
  messagePrompt, supportProblems, problemFor, supportPayload, supportReference,
  supportMailto, supportReceipt, SUPPORT_TABLE, SUPPORT_EMAIL, PRIVACY_EMAIL,
} from "../utils/support";

const EMPTY = { email: "", topic: "", message: "", url: "", goodFaith: false };

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

export const SupportPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  // null while composing, then one of: { ok: true, receipt } | { ok: false, mailto }
  const [done, setDone] = useState(null);
  // Faults appear only after a submit attempt. Marking a field red before
  // somebody has finished typing in it is telling them they are wrong for not
  // having got there yet.
  const [tried, setTried] = useState(false);

  const reporting = form.topic === REPORT_TOPIC;
  const problems = useMemo(() => supportProblems(form), [form]);
  const fault = (f) => (tried ? problemFor(problems, f) : "");
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (problems.length) return;
    setSending(true);
    const reference = supportReference();
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPPORT_TABLE}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(supportPayload(form, { reference })),
      });
      // A 2xx is the only thing that means stored. Everything else, including a
      // table that does not exist yet and a policy that refuses the insert,
      // takes the path that does not lose the message.
      if (res.ok) setDone({ ok: true, receipt: supportReceipt(form, reference) });
      else setDone({ ok: false, mailto: supportMailto(form, reference) });
    } catch {
      setDone({ ok: false, mailto: supportMailto(form, reference) });
    } finally { setSending(false); }
  };

  const shell = (children) => (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 64px" }}>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginBottom: 26 }}>
          <GemlyxLogo size={18} color={C.text} />
          <span style={{ fontSize: 13, color: C.muted }}>Back to Gemlyx</span>
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
        Gemlyx is run by one person. Everything sent here is read by them, and a reply comes from them, so it
        will not be instant.
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

      <div style={{ marginBottom: 20 }}>
        <Label htmlFor="sup-email"
          hint={reporting
            ? "Optional on a report. Leave it blank to report anonymously, and nobody can tell you what was decided."
            : "The address a reply goes to."}>
          Your email {reporting ? <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span> : null}
        </Label>
        <input id="sup-email" type="email" value={form.email} onChange={set("email")}
          autoComplete="email" placeholder="you@example.com"
          aria-invalid={!!fault("email")} aria-describedby={fault("email") ? "sup-email-fault" : undefined}
          style={field} />
        <Fault id="sup-email-fault" text={fault("email")} />
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

      <button type="submit" disabled={sending}
        style={{ background: C.accent, color: C.onAccent, border: "none", borderRadius: 10, padding: "13px 22px", fontSize: 14, fontWeight: 700, cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1, fontFamily: "'Inter', sans-serif" }}>
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
