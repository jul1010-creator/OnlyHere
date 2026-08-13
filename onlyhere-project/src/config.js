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
