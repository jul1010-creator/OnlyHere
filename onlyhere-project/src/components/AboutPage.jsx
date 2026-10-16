// ── ABOUT GEMLYX ────────────────────────────────────────────────────
//
// Oliver, 16 Oct 2026, asked whether About should be a popup or a new tab:
// a page of its own was the answer, at /about, with its own link to send the
// tourism centre and partners, and the phone's back button working. Then: "I
// mean at the end of the page, not the menu", so it is linked from the foot
// of /lithuania. And: "About Gemlyx, I want to stay as little part of it as
// possible." So it is about the app, with no founder, name or photo on it.
//
// EVERY LINE IS SOMETHING THE APP DOES TODAY. No money terms for partners,
// which are not settled, and no claim about ads: the deals are a kind of
// advertising, so "no ads" would be the first sentence a reader could argue
// with. The words are in utils/uiLanguage.js under about.*, in four languages.
//
// Same shell as SupportPage and AffiliatesPage: one column, one way back,
// real headings. A document, not a screen.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../utils/theme";
import { GemlyxLogo } from "./GemlyxLogo";
import { t as uiT, currentUiLanguage } from "../utils/uiLanguage";

export const ABOUT_PATH = "/about";
export const ABOUT_EMAIL = "hello@gemlyxtravel.com";

// Back to where the reader came from, or to Klaipėda's page when the link was
// opened on its own (from a mail, say), since that is the part that is open.
const goBack = (navigate) => {
  try {
    if (window.history.length > 1 && document.referrer && new URL(document.referrer).origin === window.location.origin) { navigate(-1); return; }
  } catch { /* no referrer to read */ }
  navigate("/lithuania");
};

const Section = ({ title, children, testid }) => (
  <section data-testid={testid} style={{ borderTop: `1px solid ${C.gold}1A`, padding: "22px 0 4px" }}>
    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 500, letterSpacing: -0.2, color: C.text, margin: "0 0 8px" }}>{title}</h2>
    <div style={{ fontSize: 15, lineHeight: 1.7, color: C.light }}>{children}</div>
  </section>
);

export const AboutPage = () => {
  const navigate = useNavigate();
  const lang = currentUiLanguage();
  const say = (k) => uiT(k, lang);
  useEffect(() => { try { document.title = `${say("about.title")} · Gemlyx`; } catch { /* no document */ } }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const [before, after = ""] = say("about.howBody").split("{redeem}");
  return (
    <div data-testid="about-page" style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 64px" }}>
        <button onClick={() => goBack(navigate)} data-testid="about-back"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <GemlyxLogo size={18} color={C.text} />
          <span style={{ fontSize: 13, color: C.muted }}>{say("about.back")}</span>
        </button>

        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.1, margin: "0 0 14px" }}>{say("about.title")}</h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: C.light, margin: "0 0 30px" }}>{say("about.lead")}</p>

        <Section testid="about-what" title={say("about.whatH")}>{say("about.whatBody")}</Section>
        <Section testid="about-how" title={say("about.howH")}>
          {before}<strong style={{ color: C.text, fontWeight: 700 }}>{say("offer.redeem")}</strong>{after}
        </Section>
        <Section testid="about-free" title={say("about.freeH")}>{say("about.freeBody")}</Section>
        <Section testid="about-places" title={say("about.placesH")}>
          {say("about.placesBody")}{" "}
          <a href={`mailto:${ABOUT_EMAIL}`} style={{ color: C.gold, fontWeight: 600, textDecoration: "none", borderBottom: `1px solid ${C.gold}66` }}>{ABOUT_EMAIL}</a>
        </Section>

        <div style={{ borderTop: `1px solid ${C.gold}1A`, marginTop: 26, paddingTop: 18, fontSize: 12.5, color: C.muted }}>{say("about.made")}</div>
      </div>
    </div>
  );
};

export default AboutPage;
