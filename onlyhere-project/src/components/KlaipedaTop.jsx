// ── THE TOP OF EVERY KLAIPĖDA PAGE ──────────────────────────────────
//
// Oliver, 5 Oct 2026: "right now it's all a big mess combined together ...
// even the owner of the restaurant is seeing the same as the customers and
// reverse.. we need a seperation". So the Klaipėda pages fall into two sides,
// and the top of each says which side it is on, with the other one a tap
// away: what a visitor sees, and what a business sees. The page a visitor
// reaches from a QR code (/lithuania/trips) shows no switch at all: a
// passenger off a ship has no use for the business side.
import { C } from "../utils/theme";
import { GemlyxLogo } from "./GemlyxLogo";
import { KLAIPEDA_EXAMPLES_PATH, KLAIPEDA_BUSINESS_PATH } from "../data/klaipedaExamples";

export const KLAIPEDA_SIDES = [
  { id: "visitors", label: "For visitors", href: KLAIPEDA_EXAMPLES_PATH },
  { id: "business", label: "For businesses", href: KLAIPEDA_BUSINESS_PATH },
];

export const KlaipedaTop = ({ side = null, place = "Klaipėda" }) => (
  <div data-testid="klaipeda-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 30, flexWrap: "wrap" }}>
    <a href={side ? KLAIPEDA_EXAMPLES_PATH : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <GemlyxLogo size={18} color={C.text} />
      {place && <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>{place}</span>}
    </a>
    {side && (
      <nav aria-label="Who this page is for" data-testid="klaipeda-sides" style={{ display: "inline-flex", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: 3 }}>
        {KLAIPEDA_SIDES.map(s => {
          const on = s.id === side;
          return (
            <a key={s.id} href={s.href} aria-current={on ? "page" : undefined} data-testid={`klaipeda-side-${s.id}`}
              style={{ fontSize: 12, fontWeight: 700, borderRadius: 100, padding: "6px 13px", textDecoration: "none", whiteSpace: "nowrap", background: on ? C.gold : "transparent", color: on ? C.onGold : C.light }}>
              {s.label}
            </a>
          );
        })}
      </nav>
    )}
  </div>
);

// Search engines stay away from every Klaipėda page until Oliver decides
// they are more than a preview. index.html already carries a robots tag for
// the whole site, so this rewrites that one rather than adding a second.
export const keepOutOfSearch = (title) => {
  const prevTitle = document.title;
  document.title = title;
  const existing = document.querySelector('meta[name="robots"]');
  const meta = existing || document.createElement("meta");
  const prevContent = existing ? existing.content : null;
  meta.name = "robots";
  meta.content = "noindex, nofollow, noai, noimageai";
  if (!existing) document.head.appendChild(meta);
  return () => {
    document.title = prevTitle;
    if (existing) existing.content = prevContent; else meta.remove();
  };
};

export default KlaipedaTop;
