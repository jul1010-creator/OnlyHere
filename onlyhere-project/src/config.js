export const SUPABASE_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZhaGpuZXJra2tvdWVvdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzQ4OTYsImV4cCI6MjA5NTMxMDg5Nn0.-GgXeog0DufIz6WNXn_8pIzxmQfkHRK3Lz8V71O-v_c";
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
export const TICKETMASTER_AFFILIATE_TEMPLATE = "";

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
export const CAR_RENTAL_LINK = "";
