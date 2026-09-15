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

// ── WHO IS ALLOWED INTO STUDIO, AS OPPOSED TO WHO IS SIGNED IN ──────
//
// Oliver, 15 Sep 2026, a few days before the beta goes to two hundred people:
// "releasing a beta, how do I avoid people getting inside my studio?"
//
// The honest answer at the time was that nothing stopped them. studioLogin POSTs
// an email and a password to the SAME Supabase project the readers sign up on,
// and if a token comes back it stores the session and mounts the Studio. Until
// this week that was defensible for the reason written in utils/apiGuard.js:
// "any signed-in account passes today, because Studio is already behind a login
// and nobody else has one." Every word of that is true and the last clause stops
// being true the day the beta link is posted.
//
// So the login checks WHO, not just whether. Supabase user ids, comma separated.
//
// ── SET IN TWO PLACES, ON PURPOSE ───────────────────────────────────
//
// This one is VITE_FOUNDER_IDS and it gates the screen. GEMLYX_FOUNDER_IDS, a
// separate Vercel variable read by the api/ handlers, gates the money. They are
// deliberately not the same variable: anything with the VITE_ prefix is compiled
// INTO the bundle and is readable by anybody who opens devtools, so it can only
// ever be a courtesy layer. A gate a determined person can read is not a gate.
//
// The real locks are the server one and the row level security policies on
// gemlyx_content. This stops a curious beta tester who types /#studio, which is
// the realistic threat, and it stops nobody else.
//
// ── EMPTY MEANS OPEN, AND SAYS SO OUT LOUD ──────────────────────────
//
// Same rule as isFounder in utils/apiGuard.js, and kept identical so the two
// cannot disagree: an unset list lets anybody signed in through, because the
// alternative is locking him out of his own Studio on a deploy he makes at four
// in the morning. What is NOT the same is the silence. The Studio login panel
// renders a warning while this is empty, so the open state cannot be the state he
// ships in without having read a sentence about it.
// ── AND IT HAS TO BE SPELLED EXACTLY LIKE THIS ──────────────────────
//
// 15 Sep 2026, first deploy. The panel warned that VITE_FOUNDER_IDS was not
// set, on a build where it WAS set, and the gate was open to everybody.
//
// This line read `import.meta?.env?.VITE_FOUNDER_IDS`, and the optional
// chaining was the whole fault. Vite does not evaluate this at runtime: it
// substitutes the exact TEXT `import.meta.env.VITE_FOUNDER_IDS` with the
// value, at build time, by matching that expression. Two question marks make it
// a different expression, so nothing matched, nothing was replaced, and what
// shipped was a real runtime lookup:
//
//   String(((C4=(I4=import.meta)==null?void 0:I4.env)==null?void 0:C4.VITE_FOUNDER_IDS)||"")
//
// No browser defines `.env` on import.meta, so that lookup answered undefined
// and FOUNDER_IDS was "". isFounder treats an empty list as open, so the Studio
// door stood open on the live site while the code meant to shut it looked
// correct in the editor, and the panel cheerfully reported the variable as not
// set on a build where it was set.
//
// ── AND THE TEST THAT NEARLY MISSED IT ──────────────────────────────
//
// Worth recording, because the wrong answer was convincing. A fixture built with
// the variable set showed BOTH shapes producing the value, which said the
// optional chaining was innocent. It was not: that fixture had both lines in one
// file, the exact-match line pulled the env object into the module, and the
// minifier then folded the optional chain against it. Split into two files, one
// shape each, the old one ships no value at all and the new one ships the
// string. A fixture that contains the fix is not a test of the bug.
//
// The optional chaining was there so tests/run.mjs could import this file under
// plain node, where import.meta.env is undefined. A try/catch buys the same
// safety without touching the expression: node throws on the property access and
// lands in the catch, and Vite replaces the text before there is anything to
// throw. The suite pins the spelling now, because this failure is invisible in
// source and only shows up in a bundle.
const readFounderIds = () => {
  try { return import.meta.env.VITE_FOUNDER_IDS || ""; }
  catch { return ""; }   // plain node, no bundler: there is no list
};
export const FOUNDER_IDS = String(readFounderIds());

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

// ── TRIP.COM, DIRECT ────────────────────────────────────────────────
//
// Oliver, 7 Sep 2026: "Got another affiliate!"
//
// The one programme so far whose inventory overlaps the field Gemlyx has been
// unable to monetise at all. BOOKING_AFFILIATE_ID above has been empty since 5
// August with the wiring finished behind it, he applied weeks ago and has had
// no answer, and every stay link in the app is unpaid meanwhile.
//
// ── TWO IDS AND A SUB-ID, NOT A REDIRECT SERVICE ────────────────────
//
// Unlike Travelpayouts, these are plain query parameters on trip.com's own
// domain, so they can ride on ANY Trip.com URL rather than only on a short link
// with one fixed destination. That is what makes a per-town hotel list possible
// and is the whole reason this is not another browse-link constant.
//
// trip_sub1 is his own sub-id slot, empty in the link he was given. The town
// goes in it, so his dashboard says which pages earn rather than only how much.
export const TRIPCOM_ALLIANCE_ID = "10471700";
export const TRIPCOM_SID = "330558586";

// ── AND THE BROWSE LINKS, FOR WHERE NOTHING WAS PROMISED ────────────
//
// Same rule TIQETS_BROWSE_LINK states: a short link resolves to ONE fixed
// destination, so it belongs only where the reader was not promised a
// particular place. Put one on a card about Asaa and a reader who asked for
// Asaa lands on a front page.
//
// The things-to-do URL he sent carried locale and currency and NO alliance id
// at all, so as pasted it earned nothing. The ids are added here.
export const TRIPCOM_HOTEL_BROWSE = "https://www.trip.com/t/6CdiKJ66GW2";
export const TRIPCOM_THINGS_BROWSE = "https://www.trip.com/things-to-do/?locale=en-XX&curr=DKK";

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

// ── CAR HIRE, DECIDED ON INVENTORY RATHER THAN RATE ─────────────────
//
// Two programmes were on the table and the check that settled it was one search
// on each of their own sites for Danish cars.
//
// GetRentacar: 10% on a 90-day cookie, the best pair on his Travelpayouts page,
// and getrentacar.com/en/country/denmark returns 404. Cars from local owners is
// a model that works where the owners are, and they are in Turkey, the UAE,
// Spain, Greece and the United States. 10% of nothing.
//
// AutoEurope: 4.4 to 8%, and it has Copenhagen Kastrup, BILLUND, Aarhus,
// AALBORG, Esbjerg, Rønne, Sønderborg, Karup and Odense airports, Copenhagen
// central station and city, Roskilde, Kolding, Aarhus and Billund, brokered
// from Alamo, Avis, Budget, Europcar, Hertz and Thrifty. Both towns in his own
// test brief are on that list.
//
// A worse rate on real cars beats a better one on none: a rental button that
// opens on an empty result teaches a reader that Gemlyx sends them to things
// that are not there, which costs more than any commission pays.
//
// Settled 26 Aug 2026. Closed on 8 Sep, Oliver: "Shall we cut out the
// getrentacar?", and "according to Google, that affiliate is not as great as
// autoeurope." Nothing of it is left in the code. DiscoverCars and Rentalcars
// both have real Danish coverage and both are on Travelpayouts, so either is a
// candidate if this one ever needs replacing.
//
// THIS IS THE SHORT LINK, so it is a browse button and not a deep link — the
// same distinction the Tiqets block above spends a paragraph on. It resolves to
// one fixed destination and cannot carry a location, so a Billund page cannot
// send somebody to Billund cars with it. The long-form template with {url} is
// worth generating when there is a reason to; until then this is honest about
// what it is.
//
// ── AND THEN AUTOEUROPE CLOSED ──────────────────────────────────────
//
// Oliver, 14 Sep 2026: "Autoeurope cars affiliate has closed by the way.. we
// need an alternative."
//
// EMPTIED RATHER THAN LEFT POINTING AT A DEAD PROGRAMME. carRentalUrl only asks
// whether the string looks like a URL, and a tpx.li short link for a closed
// programme still looks like one, so the button would keep rendering, keep
// carrying a disclosure that says it is paid, and keep earning nothing. A paid
// link that pays nobody is the one shape this file has spent three paragraphs
// refusing. No button is the honest state until there is a live link.
//
// THE REPLACEMENT IS DISCOVERCARS, and it is the one the paragraph above named
// eighteen days before it was needed: "DiscoverCars and Rentalcars both have
// real Danish coverage and both are on Travelpayouts, so either is a candidate
// if this one ever needs replacing."
//
// Re-run the same check that settled it the first time, on discovercars.com on
// 14 Sep 2026, because inventory is the rule here and a rate is not: Copenhagen,
// Billund, Aalborg, Aarhus and Esbjerg, the airports at CPH, BLL, AAL and AAR,
// and 1,686 Danish deals brokered from Alamo, Hertz, Europcar, Budget, Keddy,
// SIXT, Enterprise, Avis and Thrifty. That is the same coverage AutoEurope was
// chosen for, from the same brokers.
//
// ── AND THEN HE WENT AFTER THE DANISH ONE INSTEAD ───────────────────
//
// Oliver, 14 Sep 2026, an hour later: "I'm gonna seek for Oscar's Biludlejning!
// I was granted permission for adtraction."
//
// He has been chasing Oscar since 9 September and the inventory rule this block
// is built on is the argument for it. Checked on hejoscar.dk on 14 Sep 2026:
// 145 branches across all five regions, cars from 249 kr a day, plus vans,
// moving trucks, minibuses and trailers. AutoEurope was chosen over GetRentacar
// on fifteen Danish pickup points. This is ten times that.
//
// TWO THINGS I WROTE HERE THIS AFTERNOON WERE WRONG, and they are corrected
// rather than deleted, because a caveat that turns out to be false is worth
// more as a record of how it was checked than as a blank space.
//
//   I WROTE "THE SITE IS DANISH ONLY". It is not. Oliver: "There is an English
//   translation button." He is right, and the check that missed it was a page
//   fetch that reported "a language selector visible but no English translation
//   provided". Read properly on 14 Sep 2026: hejoscar.dk declares
//   <link rel="alternate" hreflang="en-dk" href="https://hejoscar.dk/en">, and
//   that page is a complete English site, <html lang="en">, titled "Rental cars
//   from just 249 DKK/day | Oscar Car Rental", with the booking search, the
//   vehicle types, the driver-age field and the FAQ all in English. So a German
//   or American reader lands somewhere they can read and book.
//
//   I WROTE "NO AIRPORT BRANCH IS NAMED". Also wrong. The English locations
//   page lists 150 branches, and among them: aalborg-airport, billund, kastrup
//   (which is where Copenhagen Airport is), esbjerg, esbjerg-n, esbjerg-v,
//   aarhus-c, aarhus-n, aarhus-oe and odense-c. So the flying-in pickup is
//   covered at every airport Gemlyx's own guides route through.
//
// WHICH LEAVES NO ARGUMENT AGAINST IT. On the inventory rule this block is
// built on, Oscar wins outright: 150 Danish branches against AutoEurope's
// fifteen pickup points, an English booking flow, and prices from 249 kr a day.
// A second broker programme for airports, which is what the wrong version of
// this comment argued for, is not needed.
//
// WHAT IS LEFT IS ONE PASTE, and it is his to make: a network link is generated
// against his own account and cannot be written here. The Adtraction shape is
//
//   https://track.adtraction.com/t/t?a=<id>&as=<sub>&t=2&tk=1&url=<target>
//
// and `url` carries the destination, which is the same {url} template shape the
// Tiqets and Ticketmaster blocks above use. So a deep link into one branch is
// available later if Oscar allows deeplinking; the string below is the browse
// link until then.
//
// Nothing else changes. utils/affiliates.js learned the adtraction.com host and
// the hejoscar merchant in the same commit as this comment, so the button
// labels itself "Book on Oscar Biludlejning" and carries its disclosure the
// moment the link exists. Without that half it would have rendered as an
// ordinary unpaid link, silently.
export const CAR_RENTAL_LINK = "";

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

// ── AND THE DEEP LINK, WHICH IS THE HALF THAT IS MISSING ────────────
//
// 6 Sep 2026. WEGOTRIP_LINK above is the SHORT link: one fixed destination,
// which makes it a browse button and nothing else. The same paragraph the
// Tiqets block spends on this applies word for word here, and it now costs
// something real, because src/data/wegotrip.js holds twenty named Danish
// products and every one of them has its own page.
//
// EMPTY IS NOT A BUG AND IT IS NOT A BLOCKER. Exactly like Tiqets on the day he
// signed up: the links are found, stored and rendered, and they earn nothing
// until a template is here. wegotripUrl is read AT RENDER, so pasting the long
// form below turns every stored WeGoTrip link on the site into a paying one at
// once, with no migration, no republish and no redraft.
//
// WHERE TO GET IT: Travelpayouts, the WeGoTrip campaign, the link generator
// rather than the "get link" button. It comes out shaped like the Tiqets one
//
//   https://tp.media/r?campaign_id=<theirs>&marker=765061&p=<theirs>&trs=<yours>&u={url}
//
// and `u` MUST BE LAST, for the reason spelled out in the Tiqets block: the
// destination is appended encoded, and a parameter after it would be swallowed
// into the URL rather than read by Travelpayouts.
//
// ── AND IT LANDED, 8 SEP 2026 ───────────────────────────────────────
//
// Oliver pasted the short link first and then corrected himself with the long
// one: "https://tp.media/r?campaign_id=150&marker=765061&p=4487&trs=562709&u=
// https%3A%2F%2Fwegotrip.com". The trailing wegotrip.com is Travelpayouts'
// example destination and is what {url} replaces.
//
// marker and trs are the same two values the Tiqets template above carries,
// which is the check that this is his account and not a link copied from a
// forum. campaign_id and p are the programme's, and differ as they should.
//
// Every WeGoTrip link already stored on the site starts paying from this line
// alone: wegotripUrl reads the template AT RENDER, so nothing needs republishing
// and no entry needs redrafting.
export const WEGOTRIP_AFFILIATE_TEMPLATE = "https://tp.media/r?campaign_id=150&marker=765061&p=4487&trs=562709&u={url}";

// ── GETYOURGUIDE, AND WHY IT IS SHAPED UNLIKE THE REST ──────────────
//
// Oliver, 9 Sep 2026: "I got affiliate link from getyourguide.dk", and then his
// partner dashboard, which is what settled the one doubt about it: this is the
// partner programme with bookings, campaigns and integrations, not a consumer
// share link.
//
// THERE IS NO TEMPLATE HERE AND THAT IS NOT AN OVERSIGHT. Tiqets, Ticketmaster
// and WeGoTrip all redirect through a network, so a tracked link is a DIFFERENT
// address with the destination encoded inside it. GetYourGuide tracks on its own
// domain with two query parameters, exactly as Trip.com does with Allianceid and
// SID, so any GetYourGuide URL becomes a tracked one by appending to it. Nothing
// has to be generated, nothing has to be looked up, and a product page found
// today is payable today.
//
// WHAT IT IS FOR. Checked 9 Sep 2026 against their Copenhagen results: guided
// canal tours from 159 kr, city walks, Christiania walks, food tours, the Malmö
// day trip, the Copenhagen Card. Tours and experiences, in kroner.
//
// AND WHAT IT IS NOT FOR. It sells no ARoS admission, and Trip.com sells nothing
// for Rosenborg or Tivoli. Across all three resellers the Danish inventory is
// experiences rather than museum doors, which is the whole reason this one earns
// its place: a guided canal tour has no ticket window selling the same thing
// cheaper, and a museum admission does. See utils/affiliates.js for the rule
// that follows from it.
export const GETYOURGUIDE_PARTNER_ID = "WKOYNZB";

// The campaign tag on the link, which their dashboard reports under Kampagner.
// "share_to_earn" is what the quick-share button in the portal stamps on a link;
// a campaign named here instead would let a reader's booking be traced to the
// surface it came from, the way Trip.com's trip_sub1 carries the town. Left as
// the portal's own value until there is a campaign in the dashboard to name,
// because a tag their side has never seen reports nothing.
export const GETYOURGUIDE_CAMPAIGN = "share_to_earn";

// ── BAJA BIKES, APPROVED 11 SEP 2026 ────────────────────────────────
//
// Oliver applied the night before and was approved by morning. Their programme
// runs on PostAffiliatePro, and the referral id he chose is the brand rather
// than his name, because it appears in every link a reader can see.
//
// TEN PRODUCTS AND ALL TEN ARE COPENHAGEN. That is the whole of this partner's
// inventory in Denmark, confirmed off his own panel and off their Denmark page,
// which opens "Cycling in Denmark starts with a tour of Copenhagen". So nothing
// here can ever fire on an Aarhus or an Odense page, and a version of this that
// looked like a national bike partner would be lying about the coverage.
export const BAJABIKES_REFERRAL_ID = "gemlyx";

// ── AND THE BANNER ID IS PER PRODUCT ────────────────────────────────
//
// PostAffiliatePro tracks the SALE on the referral id above; `a_bid` names which
// creative it came through, which is what turns his dashboard from one number
// into ten. So a link without it still pays and still reports nothing useful,
// and that is why these are written down rather than left off.
//
// KEYED BY SLUG, NOT STORED ON THE ROW. utils/ticketLink.js already holds the
// rule this follows, in cleanTourUrl: a stored URL carries no tracking, because
// "the day the programme ends the database is still handing readers a tracked
// link, with no disclosure under it". So the entry keeps
// bajabikes.eu/en/copenhagen-bike-tour/ and the wrapper pastes the id on at
// render. Read off his panel on 11 Sep 2026, one at a time.
export const BAJABIKES_BANNERS = {
  "copenhagen-bike-tour": "11111133",
  "bike-rental-copenhagen": "11112144",
  "private-guide-copenhagen": "11112316",
  "copenhagen-christianshavn": "11112317",
  "copenhagen-student-bike-tour": "11112318",
  "copenhagen-by-night": "11112319",
  "copenhagen-highlights-bike-tour": "11112418",
  "copenhagen-christmas-bike-tour": "11112419",
  "copenhagen-tour": "11112420",
  "copenhagen-sightseeing": "11110369",
};

// The one product that is not an activity. Rental is transport: it answers "how
// do I get around today" rather than "what shall I do", and it is the only row
// here that belongs on a day rather than in the tour slot.
export const BAJABIKES_RENTAL_SLUG = "bike-rental-copenhagen";
