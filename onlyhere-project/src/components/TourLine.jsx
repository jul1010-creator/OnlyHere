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
import { affiliateHref, affiliateNote, tourMerchant } from "../utils/affiliates";
import { isTourUrl } from "../utils/ticketLink";
import { tourPhrase } from "../utils/tourSweep";
import { entryWord } from "../utils/entryWords";
import { t as uiT, DEFAULT_UI_LANGUAGE } from "../utils/uiLanguage";

// ── AND IT NAMES THE PARTNER IT IS ACTUALLY POINTING AT ─────────────
//
// The lead said "GetYourGuide" in every language until 11 Sep 2026, which was
// true while there was one tour partner. Baja Bikes approved that morning and
// the same sentence would have credited GetYourGuide for a ride Baja sells,
// under a disclosure saying Gemlyx earns from it: wrong about who is paid, on
// the page, in three languages.
//
// Read off the LINK rather than passed in, so the sentence cannot name one
// partner while the href points at another. An unrecognised host names nobody
// and the line does not render, which is the same refusal isTourUrl already
// makes one line down and for the same reason.
//
// tourMerchant rather than partnerMerchant, and the difference cost a mutant to
// find: partnerMerchant answers "is this tracked", so switching a programme off
// made this hide the RECOMMENDATION rather than the disclosure. A GetYourGuide
// tour is still a GetYourGuide tour when the partner id is empty. It just earns
// nothing, and affiliateNote already says so by saying nothing.
export const TourLine = ({ url, kind = "", lang = DEFAULT_UI_LANGUAGE, style = null }) => {
  // isTourUrl rather than a truthy check, for the reason every other link gate
  // in this codebase gives: a hand-edited row could otherwise put any address
  // here and this would print Gemlyx recommending it.
  if (!isTourUrl(url)) return null;
  const href = affiliateHref(url) || url;
  // ── AND NO "DID WE RECOGNISE IT" GUARD, DELIBERATELY ────────────
  //
  // The first version had `if (!merchant) return null` here. Mutation testing
  // deleted it and killed nothing, and the reason is worth writing down rather
  // than papering over with a fixture built to reach it: isTourUrl one line up
  // accepts a GetYourGuide product or a Baja product and nothing else, and
  // tourMerchant names both. There is no address that reaches this line with no
  // seller, so the guard could never run.
  //
  // A branch that cannot run is decoration, and decoration in a gate is worse
  // than nothing because it reads like care. It is gone, and the property that
  // makes it pointless is asserted instead: every host isTourUrl accepts has a
  // name here. Widen one without the other and that assertion goes red, which is
  // the drift actually worth guarding. Same call as the labelledAt guard in
  // utils/eventDates.js.
  //
  // BikeRentalLine below keeps ITS guard, and the difference is the point: that
  // one has no isTourUrl in front of it, so an arbitrary address really can
  // reach it, and a mutant that removed it died.
  const merchant = tourMerchant(url);
  const note = affiliateNote(url, lang);
  const phrase = entryWord(tourPhrase(url, kind), lang);
  return (
    <div style={{ marginTop: 14, ...(style || {}) }}>
      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7 }}>
        {uiT("tour.lead", lang).replace("{merchant}", merchant)}{" "}
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

// ── AND THE ONE PARTNER LINK THAT IS NOT AN ACTIVITY ────────────────
//
// Oliver, 11 Sep 2026, asked where bike rental belonged and chose the guide day
// over the town page: on a bike day, at the point they need one, never on a
// public-transport trip.
//
// IN THIS FILE RATHER THAN ITS OWN, for the reason ChatPlaceCards gives about
// its three layouts: "a second component would be a second place for the licence
// credit rule to be got wrong". Here the rule with the edge on it is the
// disclosure, and there is exactly one copy of it.
//
// The caller decides WHETHER, through bikeRentalFits. This decides how it reads.
export const BikeRentalLine = ({ url, lang = DEFAULT_UI_LANGUAGE, style = null }) => {
  const href = affiliateHref(url) || url;
  if (!/^https?:\/\//i.test(String(href))) return null;
  const merchant = tourMerchant(url);
  if (!merchant) return null;
  const note = affiliateNote(url, lang);
  return (
    <div style={{ marginTop: 14, ...(style || {}) }}>
      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7 }}>
        {uiT("rental.lead", lang)}{" "}
        <a href={href} target="_blank" rel={note ? "noreferrer sponsored nofollow" : "noreferrer"}
          style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>
          {uiT("rental.link", lang)} ↗
        </a>
      </div>
      {note && (
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>{note}</div>
      )}
    </div>
  );
};
