// ── "LIST ALL OUR AFFILIATES AND WHY WE USE THEM" ───────────────────
//
// Oliver, 9 Sep 2026. The reasoning about what belongs here, and about the Tips
// line that does not, is in utils/affiliateRoster.js. This file renders it and
// does one thing that file cannot: it makes the page reachable and keeps every
// sentence on it countable.
//
// NOTHING HERE IS A CLAIM THIS PAGE MAKES BY ITSELF. The count at the top is
// counted off the roster, the dot on each card is the same function the site
// uses to decide whether to attach a tracking id, and a programme that pays
// nothing says so in the same size type as one that pays. A page about money
// that flatters itself is worse than no page.
//
// Same shell as SupportPage, deliberately: one back button, one column, real
// headings, nothing to interact with. It is a document rather than a screen.
import { useNavigate } from "react-router-dom";
import { C } from "../utils/theme";
import { GemlyxLogo } from "./GemlyxLogo";
import { affiliateRoster, payingCount } from "../utils/affiliateRoster";

const Card = ({ children }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 17px", marginBottom: 12 }}>
    {children}
  </div>
);

// ── THE DOT SAYS WHICH OF TWO THINGS IS TRUE, IN WORDS TOO ──────────
//
// A green dot alone is a colour, and a reader who cannot tell green from grey
// learns nothing. The words are the answer and the dot is the decoration, which
// is the order round the accessibility work on SupportPage settled on.
const State = ({ earning }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
    <span style={{ width: 7, height: 7, borderRadius: 7, background: earning ? C.gold : C.border, flexShrink: 0 }} />
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: earning ? C.gold : C.muted }}>
      {earning ? "Pays us" : "Earns nothing"}
    </span>
  </span>
);

const Row = ({ name, sells, why, earning }) => (
  <Card>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{name}</span>
      <State earning={earning} />
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{sells}</div>
    <div style={{ fontSize: 13, lineHeight: 1.65, color: C.light }}>{why}</div>
  </Card>
);

export const AffiliatesPage = () => {
  const navigate = useNavigate();
  const roster = affiliateRoster();
  const paying = payingCount();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 64px" }}>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginBottom: 26 }}>
          <GemlyxLogo size={18} color={C.text} />
          <span style={{ fontSize: 13, color: C.muted }}>Back to Gemlyx</span>
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>How Gemlyx is paid</h1>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: C.muted, margin: "0 0 14px" }}>
          Gemlyx is free and carries no advertising. Some of the booking links on it are partner links, which
          means a booking made through one pays us a small commission. It costs you nothing and it does not
          change the price you are quoted.
        </p>
        {/* COUNTED, NEVER TYPED. The sentence above is only true while at least
            one programme is live, and this line is what keeps the page from
            claiming a commission it cannot earn. */}
        <p style={{ fontSize: 14, lineHeight: 1.65, color: C.muted, margin: "0 0 26px" }}>
          {paying === 0
            ? "Right now none of them are switched on, so every link on the site is an ordinary link and earns nothing."
            : `${paying} of the ${roster.length} below currently pay anything. Every paid link is marked where it appears, and a link that earns us nothing says so underneath it.`}
        </p>

        <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, margin: "0 0 12px" }}>
          Who we work with, and why
        </h2>
        {roster.map(p => <Row key={p.key} {...p} />)}

        {/* ── WHAT WE WILL NOT DO, WHICH IS THE PART WORTH READING ──
            Every line here is a rule the code keeps, and each one was
            written the day something broke it. A promise on this page that the
            site does not enforce is worth less than nothing. */}
        <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, margin: "26px 0 12px" }}>
          What a commission does not buy
        </h2>
        <Card>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: C.light }}>
            <li style={{ marginBottom: 8 }}>No place is on a guide because it is bookable. Guides are built from what suits the trip, and a link is attached afterwards or not at all.</li>
            <li style={{ marginBottom: 8 }}>Where a partner sells a ticket the venue also sells at its own door, the venue wins. We turned down an attraction programme over exactly this.</li>
            <li style={{ marginBottom: 8 }}>A price shown on an entry says which site it was read from and the day it was read. If the partner behind the link is a different shop, the page says so rather than letting the two numbers read as one.</li>
            <li style={{ marginBottom: 8 }}>A car hire link only appears on a trip you have said involves driving, and never on a page telling you a car is not worth it.</li>
            <li>Nothing on this site is written by a partner, and none of them see a guide before you do.</li>
          </ul>
        </Card>

        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: C.muted, margin: "22px 0 0" }}>
          If you are booking something anyway, using a link here is the whole of how the site pays for itself.
          If you would rather not, book direct: that is often the better price and it is always fine.
        </p>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: C.muted, margin: "12px 0 0" }}>
          Questions about any of this: hello@gemlyxtravel.com
        </p>
      </div>
    </div>
  );
};
