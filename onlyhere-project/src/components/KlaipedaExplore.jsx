// ── EXPLORE, ON THE LITHUANIAN SITE ─────────────────────────────────
//
// Oliver, 13 Oct 2026: "let the Klaipėda deals be the explore page. And then
// make filters called 'Discounts' 'Entertainment' 'Activities'", only partner
// deals, on /lithuania and on the QR page alike, and "I think we need to make
// it more 'app-like' and less 'competitive' to the page".
//
// So the Explore tab of /lithuania is no longer a website front page with a
// hero and sections: it is the deals, as an app shows them, with the three
// filters. What a guide to Klaipėda would say is the tourism centre's to say,
// and the page sends people there for it (DealsNearYou's last line).
import { DealsNearYou } from "./DealsNearYou";
import { useKlaipedaDeals } from "../utils/useKlaipedaDeals";
import { SpinningMark } from "./SpinningMark";

// `studio` is the founder's deal editor (DealStudio.jsx), drawn above the deals
// on /lithuania#studio once he is logged in, and null for everybody else.
export const KlaipedaExplore = ({ lang = "en", version = 0, studio = null }) => {
  const live = useKlaipedaDeals(null, version);
  // The page sits over a slowly turning Gemlyx mark (SpinningMark.jsx, 14 Oct
  // 2026: "make the background a spinning Gemlyx Logo").
  return (
    <div style={{ position: "relative" }}>
      <SpinningMark />
      <div style={{ position: "relative", zIndex: 1 }}>
        {studio && <div style={{ maxWidth: 1120, margin: "0 auto", padding: "18px 16px 0" }}>{studio}</div>}
        {/* The banner across the top and the circles under it, as lidl.dk's
            front page (14 Oct 2026). */}
        <DealsNearYou deals={live.deals} examples={live.examples} ready={live.ready} lang={lang} country="LT" sticky={false} banner />
      </div>
    </div>
  );
};

export default KlaipedaExplore;
