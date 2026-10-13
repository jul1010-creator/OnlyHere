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

// `studio` is the founder's deal editor (DealStudio.jsx), drawn above the deals
// on /lithuania#studio once he is logged in, and null for everybody else.
export const KlaipedaExplore = ({ lang = "en", version = 0, studio = null }) => {
  const live = useKlaipedaDeals(null, version);
  return (
    <>
      {studio}
      <DealsNearYou deals={live.deals} examples={live.examples} lang={lang} country="LT" sticky={false} />
    </>
  );
};

export default KlaipedaExplore;
