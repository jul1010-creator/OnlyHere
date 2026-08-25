export const SUPABASE_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZhaGpuZXJra2tvdWVvdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzQ4OTYsImV4cCI6MjA5NTMxMDg5Nn0.-GgXeog0DufIz6WNXn_8pIzxmQfkHRK3Lz8V71O-v_c";
// ── SIGN IN WITH GOOGLE, SWITCHED OFF ────────────────────────────────
//
// Oliver, 22 Aug 2026: "the google provider won't be available before I have a
// terms of use and privacy policy written."
//
// He is right, and it is not only a Google requirement: an OAuth consent screen
// has to name a privacy policy and terms URL before it can be published, and
// until then the provider either does not exist in Supabase or refuses at
// Google's end. Either way the button cannot work.
//
// So it does not render. A button that cannot work is worse than no button: it
// is the most prominent control on the sheet, somebody presses it first, and
// what they get back is a bounce with an error. Signing up with an email and a
// password is the whole flow until this flips.
//
// ONE LINE TO TURN ON. Nothing else has to change: startGoogleSignIn,
// captureRedirectSession and the profile hold are all built and tested, and the
// suite asserts they stay that way rather than rotting while switched off.
export const GOOGLE_SIGN_IN = false;

// ── PAID PLANS, WHICH DO NOT EXIST YET ──────────────────────────────
//
// Oliver, 24 August 2026, designing the Gemlyx offer field: "it will only be
// visible to paid users."
//
// There is no payment system, no plan field on a profile, and the Plan panel in
// the account screen is deliberately a statement rather than a control, with an
// assertion holding it that way. So this is false and every offer on the site
// renders in its locked state: the badge says an offer exists here and nobody
// is shown what it is.
//
// That is the correct state to ship in rather than a placeholder. A promise
// made to a reader whose payment cannot be verified is a promise a shop is left
// holding at its own counter.
//
// ONE LINE TO TURN ON, and one function to give a field to read:
// hasPaidPlan in utils/offer.js is the only thing in the app that asks who is
// paying, so nothing else can drift out of agreement with it.
export const PAID_PLANS_LIVE = false;

export const APP_VERSION = "v2.87 — AI plans become saveable guides with real data + mini-maps";

// ── THE ONE PLACE THE PUBLIC ADDRESS IS WRITTEN DOWN ─────────────────
// A link preview card has to name an absolute URL for its image: WhatsApp,
// iMessage and Slack fetch og:image from a separate request with no page
// context, so a root-relative path silently produces a card with no picture.
// That means the domain is hardcoded somewhere, and the day it changes is the
// day every shared guide loses its preview without a single error anywhere.
//
// So it is written down ONCE, here, and tests/run.mjs asserts that index.html's
// own og:image agrees with it. Change the domain and the test fails loudly
// rather than the cards failing quietly.
// UPDATED 10 Aug 2026 to the real domain. It had stayed on the vercel.app
// address after gemlyxtravel.com went live, and that is not cosmetic:
//
//   1. Every share card, on every guide, showed only-here-three.vercel.app as
//      the site it came from. The brand was on the page and nowhere near the
//      link somebody actually saw in WhatsApp.
//   2. index.html's canonical tag pointed there too, which tells Google the
//      vercel.app copy is the real one and the new domain is a duplicate of it.
//      That is the single most effective way to stop a new domain ranking, and
//      it is silent: nothing breaks, the site simply does not appear.
export const SITE_ORIGIN = "https://www.gemlyxtravel.com";

// Booking.com affiliate ID (the "aid" number from the Booking.com Partner
// Programme). EMPTY until Oliver's affiliate account is approved — the moment
// it is, paste the number here and every Booking.com link in the app (the
// per-day "Where to stay" card on GuidePage, and any future ones) becomes an
// affiliate link at once. STANDING RULE: never remove this constant or the
// links that use it — accommodation/booking links are a permanent feature and
// the app's planned revenue path, per Oliver directly (Aug 5 2026).
export const BOOKING_AFFILIATE_ID = "";

// ── TICKETMASTER, THROUGH IMPACT ────────────────────────────────────
//
// Oliver, 13 Aug 2026, halfway through Ticketmaster's application: "let's
// finish the ticketmaster affiliate."
//
// A TEMPLATE rather than an id, and that is the design decision worth writing
// down. Booking.com takes one number on a query parameter, so a constant works.
// Impact hands out a whole tracking URL whose shape differs by programme and
// has changed more than once: some are ticketmaster.evyy.net/c/<a>/<b>/<c>,
// newer ones sit on an impact.com or .pxf.io host, and the destination rides in
// a `u=` parameter. Guessing which he will be given and hardcoding it would
// mean a code change on the day he is approved, which is the worst day to need
// one.
//
// So he pastes the link Impact gives him with {url} where the destination goes,
// and nothing else changes:
//
//   "https://ticketmaster.evyy.net/c/1234567/890123/4567?u={url}"
//
// EMPTY UNTIL APPROVED, exactly like the Booking id above. Empty means every
// Ticketmaster link stays an ordinary link that earns nothing. It does NOT mean
// the link disappears: a reader still has to be able to reach the tickets, and
// the revenue is the second reason that button exists, not the first.
// ── APPROVED 23 AUG 2026 ────────────────────────────────────────────
//
// Ten days after "the mail won't fking work". The ids below are his:
// 7614922 is the publisher, 264167 the campaign, 4272 the ad.
//
// WHAT IMPACT ACTUALLY HANDED HIM was not this. It was a link whose `u=`
// already held a destination, and the destination was
// https://www.ticketmaster.com, the front page, with Impact's own macros
// ({clickid}, {irpid}, {ircid}) filled in server side on the redirect. Pasting
// that here verbatim would have sent every reader who tapped a ticket button to
// Ticketmaster's home page instead of the event they were reading about, while
// still paying, and nothing on the page would have looked wrong. The suite
// catches it now: a template with no {url} in it fails.
//
// So the tracking half is kept and the destination half is replaced by the
// placeholder, which is the deep link shape and the shape this file has
// documented since 13 August.
//
// ── TWO THINGS TO VERIFY BEFORE TRUSTING THE MONEY ──────────────────
//
// 1. THE GENERIC LINK POINTED AT .COM AND HIS READERS BUY ON .DK. A Danish
//    event lives on ticketmaster.dk, and TICKETMASTER_HOSTS below wraps .dk,
//    .com, .eu and livenation. If the programme he was approved for covers only
//    the US storefront, a wrapped .dk link earns nothing AND adds a redirect for
//    no reason, which is a cost to a reader with no benefit to anybody. Check
//    the covered domains in Impact, and if .dk is not among them, take it out of
//    TICKETMASTER_HOSTS rather than leaving a redirect that does nothing.
// 2. DEEP LINKING HAS TO BE CLICKED ONCE. Open a real Danish event on the live
//    site, tap the ticket button, and see where it lands. The event page means
//    this works. The front page means the programme does not allow an arbitrary
//    `u=` and the ticket buttons should go back to being plain links.
export const TICKETMASTER_AFFILIATE_TEMPLATE = "https://ticketmaster.evyy.net/c/7614922/264167/4272?u={url}";

// ── TIQETS, THROUGH TRAVELPAYOUTS ───────────────────────────────────
//
// Oliver, 15 Aug 2026, having decided to stop chasing a Copenhagen Card deal
// and get users first: "Imma sign up for tiquts."
//
// Tiqets sells tickets to the attractions Gemlyx already writes about, and it
// is the one programme that states in its own words that it has no visitor or
// order number requirements. It is reached through Travelpayouts rather than
// directly, which is why the links sit on a tpx.li or tp.media host and not on
// tiqets.com.
//
// TWO CONSTANTS, BECAUSE THERE ARE TWO DIFFERENT LINKS AND ONLY ONE OF THEM IS
// A DEEP LINK. Getting this wrong is the failure that pays nothing and annoys
// somebody, which is the same trap the Ticketmaster block above describes.
//
//   BROWSE   the short link Travelpayouts generates on signup. It goes to
//            Tiqets and nowhere in particular. Right for a general "find
//            tickets" button, wrong for a card about one attraction, because a
//            reader who clicks Rosenborg Slot and lands on a homepage has been
//            sent somewhere they did not ask to go.
//
//   TEMPLATE the deep link, built in the Travelpayouts Links tool by pasting a
//            specific Tiqets page. Paste the LONG form here, not the short one,
//            with {url} where the destination sits, so one template serves
//            every attraction rather than one link per page:
//
//              "https://tp.media/click?shmarker=562709&promo_id=...&u={url}"
//
//            A short link cannot do this. It resolves to one fixed destination,
//            so it cannot carry a different attraction each time.
//
// EMPTY TEMPLATE MEANS NO DEEP LINK AND AN ORDINARY tiqets.com URL, the same
// rule as Ticketmaster: the reader still reaches the tickets, and Gemlyx
// earns nothing and says so.
export const TIQETS_BROWSE_LINK = "https://tiqets.tpx.li/gjhkxmoh";

// Generated 15 Aug 2026 off the Copenhagen Card Discover product page, then the
// destination swapped for {url} so one template serves every attraction.
//
//   campaign_id=89   Tiqets
//   marker=765061    the affiliate marker clicks are credited to
//   p=2074           the programme
//   trs=562709       the account, the same number the signup script carried
//   u=               the destination, LAST in the string and url encoded
//
// u BEING LAST IS WHY THIS WORKS. tiqetsUrl appends an encoded destination, and
// an encoded string contains no bare & to end the parameter early, so nothing
// after it can be swallowed. If Travelpayouts ever hands out a template with u
// in the middle, it still works for the same reason: it is the ENCODING that
// makes it safe, not the position.
export const TIQETS_AFFILIATE_TEMPLATE = "https://tp.media/r?campaign_id=89&marker=765061&p=2074&trs=562709&u={url}";

// ── CAR HIRE, EMPTY ON PURPOSE ──────────────────────────────────────
//
// The link Oliver has is GetRentacar, https://getrentacar.tpx.li/KyhVj8Bg, and
// it is not pasted here yet for one reason: their own front page lists Turkey,
// the UAE, Spain, Greece and the United States, their /country/denmark page is
// a 404, and nothing turns up Danish inventory. Cars from local owners is a
// model that works where the owners are.
//
// A rental button that opens on an empty result teaches a reader that Gemlyx
// sends them to things that are not there, and that costs more than the
// commission pays. One search on getrentacar.com for Copenhagen settles it: if
// the cars are there, paste the link and it goes live everywhere at once. If
// they are not, DiscoverCars and Rentalcars both have real Danish coverage and
// both are on Travelpayouts.
// ── SETTLED 26 AUG 2026, BY RUNNING THE CHECK ABOVE ─────────────────
//
// Oliver sent both links. GetRentacar's was the one already on hand and the one
// this comment said to test: getrentacar.com/en/country/denmark returns 404
// today, and a search of their own domain for Danish coverage turns up nothing
// at all. 10% and a 90-day cookie, which is the best pair on his Travelpayouts
// page, of an inventory that does not exist here.
//
// AutoEurope has it: Copenhagen Kastrup, BILLUND, Aarhus, AALBORG, Esbjerg,
// Rønne, Sønderborg, Karup and Odense airports, Copenhagen central station and
// city, Roskilde, Kolding, Aarhus and Billund, brokered from Alamo, Avis,
// Budget, Europcar, Hertz and Thrifty. 4.4 to 8%. A worse rate on real cars
// beats a better one on none, and the two towns in his own test brief are both
// on the list.
//
// THIS IS THE SHORT LINK, so it is a browse button and not a deep link — the
// same distinction the Tiqets block above spends a paragraph on. It resolves to
// one fixed destination and cannot carry a location, so a Billund page cannot
// send somebody to Billund cars with it. The long-form template with {url} is
// worth generating when there is a reason to; until then this is honest about
// what it is.
export const CAR_RENTAL_LINK = "https://autoeurope.tpx.li/SFG4IdAn";

// ── WEGOTRIP, THE HIGHEST RATE ON THE PAGE AND A REAL ONE ───────────
//
// 6.64% to 41.5%, which is the best band on his Travelpayouts list, and unlike
// GetRentacar the inventory is here: 21 activities across Copenhagen, Aarhus,
// AALBORG (a fjord walk), Helsingør, ROSKILDE (Viking and royal heritage),
// Vejle, Ringkøbing and Billund. Checked 26 Aug 2026 on their own Denmark page.
//
// Self-guided audio walks, which sit closer to what a Gemlyx guide already IS
// than anything else in the affiliate list. That is the argument for it and the
// reason to be careful with it: a paid audio tour of Aalborg offered underneath
// our own free writing about Aalborg has to be additive, not a second version of
// the same thing sold back.
//
// AND IT SELLS LEGOLAND BILLUND ENTRY TICKETS. Whatever renders this must go
// through the same exclusion gate the preview now uses, or the traveller who
// wrote "please don't send us to Legoland" gets sold one. See utils/exclusions.js
// — that failure is four hours old and it must not come back through a partner.
export const WEGOTRIP_LINK = "https://wegotrip.tpx.li/FqqNAbzW";
