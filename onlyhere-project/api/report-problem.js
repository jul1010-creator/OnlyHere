// /api/report-problem.js
// Puts a support message in front of a person, by email, instead of leaving it
// in a table nobody opens.
//
// Oliver, 15 Sep 2026: "we need to create a 'report problems' button. We'll get
// another resend for that." And, ten minutes later, the feedback ask after a
// guide is built. Both end here.
//
// ── WHAT WAS ALREADY THERE, AND WHY IT IS NOT ENOUGH ────────────────
//
// SupportPage writes a row to gemlyx_support and, if that insert fails, hands
// the person a mailto so their words are not lost. That is a good failure path
// and a bad delivery mechanism: on the success path nothing reaches him at all
// until he remembers to open the table. During a beta with strangers on it,
// a report he reads on Thursday is a report about a bug that lost him Monday's
// readers.
//
// So the row still gets written, by the page, exactly as before. This is the
// second half: the same message, in his inbox, within a second.
//
// ── IT DEGRADES, ON PURPOSE ─────────────────────────────────────────
//
// RESEND_API_KEY is a Vercel environment variable he has to add. Until he does,
// this answers 200 with emailed:false rather than failing, the row is already
// safely written by the caller, and the page says the same thing either way.
// A report button that breaks because a key is missing would be the one piece
// of this product that fails at the exact moment somebody is telling us
// something else is broken.
import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";

const TO = "hello@gemlyxtravel.com";
// The domain Resend verifies. A sender outside it is refused by Resend, so this
// is not a preference, it is the only address that can work.
const FROM = "Gemlyx <noreply@gemlyxtravel.com>";

// ── THE CAPS, WHICH ARE THE WHOLE SECURITY MODEL ────────────────────
//
// This endpoint sends mail on behalf of anybody who can load the site, which is
// the definition of an open relay if it is careless. It is not founder-gated
// and cannot be: it is for readers.
//
// What keeps it safe is that a caller controls NOTHING that matters. The
// recipient is a constant. The sender is a constant. The subject is built here
// from a topic that must be one of a known set. The only free text is the body,
// and it is capped and escaped. There is no parameter that can redirect a
// message to somebody else, which is the attack this shape exists to refuse.
const MESSAGE_MAX = 4000;
const FIELD_MAX = 300;
const TOPICS = ["problem", "feedback", "question", "wrong", "account", "privacy", "report", "business", "other"];

const clean = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
// Header injection is the other classic. A newline in a field that ends up in a
// subject line is how somebody adds their own Bcc, so subjects are stripped of
// them entirely rather than trusted to the mail library.
const oneLine = (v, max) => clean(v, max).replace(/[\n\t]+/g, " ");

export default async function handler(req, res) {
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const topic = TOPICS.includes(String(body.topic || "")) ? String(body.topic) : "other";
  const message = clean(body.message, MESSAGE_MAX);
  const reference = oneLine(body.reference, 40);
  const said = oneLine(body.email, FIELD_MAX);
  // ── VALIDATED, BECAUSE RESEND REFUSES THE WHOLE REQUEST ─────────────
  //
  // reply_to cannot redirect anything: `to` is a constant three lines up. What
  // it can do is fail. Resend answers 422 to a malformed address and refuses the
  // MESSAGE with it, so one stray character in the email box would silently cost
  // the report rather than just the reply path. SupportPage forwards whatever is
  // in that field and does no format check of its own.
  //
  // Deliberately loose. This is not deciding whether somebody may write to us,
  // only whether the address is shaped enough to attach; a real one that fails
  // this still gets its report through, without a reply path.
  const from = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(said) ? said : "";

  // Nothing to send is not an error worth failing a form over, but it is not a
  // send either, and saying so keeps the caller honest about what happened.
  if (!message) return res.status(200).json({ ok: true, emailed: false, why: "nothing to send" });

  const key = process.env.RESEND_API_KEY || "";
  if (!key) {
    // Said out loud in the server log, because the symptom otherwise is silence
    // and the cause is one missing variable.
    console.warn("[gemlyx] RESEND_API_KEY is not set, so support mail is not being sent");
    return res.status(200).json({ ok: true, emailed: false, why: "no key configured" });
  }

  const subject = `Gemlyx ${topic}${reference ? ` · ${reference}` : ""}`;
  const text = [
    `Topic: ${topic}`,
    from ? `From: ${from}` : "From: not given",
    reference ? `Reference: ${reference}` : "",
    "",
    message,
  ].filter(Boolean).join("\n");

  try {
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject,
        text,
        // So he can hit reply and answer the person, without their address ever
        // being the thing that decides where this message goes.
        ...(from ? { reply_to: from } : {}),
      }),
    });
    if (!sent.ok) {
      // The reason is logged and NOT returned. A reader does not need to know
      // that a domain is unverified, and an error body from a mail provider is
      // the wrong thing to put on a page for a stranger.
      const detail = await sent.text().catch(() => "");
      console.warn(`[gemlyx] support mail refused ${sent.status}: ${detail.slice(0, 300)}`);
      return res.status(200).json({ ok: true, emailed: false, why: "mail refused" });
    }
    return res.status(200).json({ ok: true, emailed: true });
  } catch (e) {
    console.warn(`[gemlyx] support mail threw: ${String(e?.message || e).slice(0, 200)}`);
    return res.status(200).json({ ok: true, emailed: false, why: "mail failed" });
  }
}
