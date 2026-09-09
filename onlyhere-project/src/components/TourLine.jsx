// ── "OR HOP ONTO GETYOURGUIDE AND BOOK A BEERWALK!" ─────────────────
//
// Oliver, 9 Sep 2026, in his own words, having asked the question that led to
// it: "Can we put activities into the different blogs? Like pub crawl wouldn't
// need to go all the way into a blog, but rather stay in the nightlife town tab
// of Aarhus if it was pubcrawl in Aarhus, if you know what I mean?"
//
// ── WHY A SENTENCE AND NOT A CARD ───────────────────────────────────
//
// The obvious build is a card in the grid beside his own entries. It is the
// wrong one, and the reason is the badge that came off ChatPlaceCards the same
// night: that grid is nothing but Gemlyx's own checked writing, and a partner
// product sitting in the same slot borrows that standing whether or not it
// wears a mark. A line at the foot of the section, in his voice, is obviously
// him pointing somewhere else. Nobody mistakes it for an entry because it is
// not shaped like one.
//
// ── AND IT SAYS WHAT THE THING IS ───────────────────────────────────
//
// The phrase comes from tourSweep.tourPhrase, read off the product slug and
// translated in entryWords, rather than from GetYourGuide's own title. Their
// titles are written to sell ("Aarhus: Craft Beerwalk with 5 Beers & Snacks
// Included") and reading one aloud in Gemlyx's voice quotes an advert as though
// it were a recommendation. It is also English, on a page that promised Danish.
import { C } from "../utils/theme";
import { affiliateHref, affiliateNote } from "../utils/affiliates";
import { isTourUrl } from "../utils/ticketLink";
import { tourPhrase } from "../utils/tourSweep";
import { entryWord } from "../utils/entryWords";
import { t as uiT, DEFAULT_UI_LANGUAGE } from "../utils/uiLanguage";

export const TourLine = ({ url, kind = "", lang = DEFAULT_UI_LANGUAGE, style = null }) => {
  // isTourUrl rather than a truthy check, for the reason every other link gate
  // in this codebase gives: a hand-edited row could otherwise put any address
  // here and this would print Gemlyx recommending it.
  if (!isTourUrl(url)) return null;
  const href = affiliateHref(url) || url;
  const note = affiliateNote(url, lang);
  const phrase = entryWord(tourPhrase(url, kind), lang);
  return (
    <div style={{ marginTop: 14, ...(style || {}) }}>
      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7 }}>
        {uiT("tour.lead", lang)}{" "}
        <a href={href} target="_blank" rel={note ? "noreferrer sponsored nofollow" : "noreferrer"}
          style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>
          {phrase} ↗
        </a>
      </div>
      {/* ── AND THE SENTENCE TRAVELS WITH THE LINK ─────────────────
          Same rule the glance card keeps: whichever paid link a reader meets
          first is disclosed where they meet it, and a link that earns nothing
          says nothing, because "this may earn us a commission" printed over a
          link that earns nothing is a false statement about money. */}
      {note && (
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>{note}</div>
      )}
    </div>
  );
};
