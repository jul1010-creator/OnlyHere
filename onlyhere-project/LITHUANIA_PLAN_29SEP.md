# Gemlyx in Klaipėda: the plan

Oliver, 29 Sep 2026: "Can we prepare to build something that I can present to
Klaipeda? Not build museums and bla bla bla, but the template that we have on
Denmark, and put it onto Klaipeda."

So this is not a Klaipėda page written by hand. It is the same app, the same
Studio and the same cards, working for a second country, with Klaipėda as its
first town. Nothing below has been built yet. This file is the map of what the
work is, read out of the code on 29 Sep 2026 after batch 157.

## The shape, in one paragraph

Every published row gets a country. The site decides which country it is
showing from the address: `/lithuania/...` shows Lithuania, everything else
shows Denmark exactly as today. Studio gets a country picker, and a draft for
Lithuania researches in Lithuania, prices in euros, keeps Vilnius time and
checks coordinates against Lithuania. One app, one Studio, one database. No
copy of the code, because a copy means every one of the next hundred fixes
made twice.

## What the scan found

Numbers are lines of working code, comments left out.

| Area | Where | How big | What it takes |
|---|---|---|---|
| Rows have no country | `liveContent.js` loads every published row into one set of lists | Small | A `country` field on the payload, `DK` when missing, and the loader keeps only the active country's rows. No database change: it lives in the payload like every other field. |
| Addresses | `placeUrl.js`: `COUNTRY = "denmark"` | Small | The country segment comes from the active country. `/lithuania/klaipeda` becomes Klaipėda's real town page; the hand-written demo there retires and its two trips become Klaipėda's first example guides. |
| "Is this in Denmark" | `isInDenmark` in `helpers.js`, used 28 times in 7 files; `townFrame` refuses a town whose point is outside Denmark | Medium | One `isInCountry(coords)` reading the active country's bounds. Today a Klaipėda row would be refused on load. |
| Search queries | About 96 places in `App.jsx` append " Denmark" to a search; `places-locate.js` and `places-hours.js` append ", Denmark" and ask Google in Danish for Denmark; `directions.js` appends ", Denmark" | Medium, mechanical | The country name, language and region code come from the active country. The Google calls take a `country` parameter. |
| Research prompts | `studioPrompts.js` (about 100 mentions of Denmark, Danish, Copenhagen, DKK) and the research prompts in `App.jsx` | Big | Most are the word "Denmark" and become the country's name. Some are Danish facts (Rejsekort, DSB, kommuner, Danish holiday habits) and need a Lithuanian equivalent or nothing. |
| Money | `entryPrice.js`, `moneyClaims.js`, `priceBand`, the family chip: all read "DKK" and "kr" | Medium | Read "€", "EUR" and "Eur" too, and price bands scaled for euros. A Klaipėda museum at "€6" would today show no price at all. |
| Time | `Europe/Copenhagen` in 11 files (`denmarkTime.js`, opening hours, tickets, calendar, arrival and more) | Small, spread out | The zone comes from the active country. Lithuania is an hour ahead, so "open now" and "today" would be wrong by an hour without it. |
| Regions | Jutland, Funen, Zealand, the kommuner, the Islands scope | Small for the demo | Klaipėda is one town, so a Lithuania region list can wait. Sources scope to "Klaipėda" the way they already scope to "Copenhagen". |
| Card map | `DKLocator` draws Denmark's outline with a dot | Small | For one city a country map with every dot in the same spot says nothing. Klaipėda cards should use a city mini map (`PlaceMiniMap` exists). |
| Photos | `commons-photo.js` looks in English and Danish Wikipedia | Small | Lithuanian Wikipedia in place of Danish for Lithuanian rows. |
| Danish-language checks | `literalDanish.js`, `danishNames.js`, parts of `entryAudit.js` | Small | Switched off for Lithuanian rows. They catch Danish translated too literally, which cannot happen to a Klaipėda entry. |
| Weather | `weather.js`: DMI first, then Open-Meteo, forecasts from met.no | Works already | DMI only covers Denmark and already falls back to the global archive. Nothing to do. |
| Events from Ticketmaster | `tickets.js` takes a `country` parameter, `DK` by default | Works already | Pass `LT`. Whether Ticketmaster sells much in Lithuania is a separate question. |
| Transport | Rejseplanen links (`rejseplanen.js`, `journey.js`, `DetailPage.jsx`), ferry routes, "from Copenhagen" journeys | Medium | Google directions for Lithuania. The ferry to Smiltynė can be one row. |
| Guide builder and chat | The chat and guide prompts, `budgetEstimate`, `mealsEstimate`, `costLedger`, `accommodation`: DKK budgets, Copenhagen airport default, Danish transport facts | Big | Its own phase, see below. |
| Affiliates | Tiqets, GetYourGuide, Ticketmaster, Booking | Unknown | Check which of them sell anything in Klaipėda before promising a partner link. |
| Interface language | English, Danish, German | Decision | See the questions at the end. |

## The phases

**Phase 0: the country, with Denmark unchanged (1 to 2 days).**
A `countries.js` profile for DK and LT (name, adjective, address segment,
currency, time zone, bounds, Google language and region codes, map), the
active country read from the address, `country` on every row with DK as the
default, and the loader filtering by it. The whole test suite must pass
untouched: if anything on the Danish site changes, Phase 0 is wrong.

**Phase 1: Studio drafts a Klaipėda entry (about a week).**
Country picker in Studio. Searches, prompts, the Google lookups, coordinates,
money, time and photos all follow the draft's country. The Danish-only checks
step aside. The test for "done": draft the Castle Museum, a restaurant and an
event in Studio, and all three come back in euros, on Vilnius time, with a
Klaipėda coordinate, from Lithuanian sources.

**Phase 2: the Lithuania pages (a few days).**
`/lithuania` with the same pages as Denmark (Attractions, Events, Food,
Nightlife, Shopping, Cheap gems, Tips), Klaipėda as the town, the city mini map
on cards, and Lithuania's own tips (euro, Bolt, e.Ticket Klaipėda). Not linked
from the Danish menu.

**Then the content.** You draft Klaipėda through Studio, 30 to 40 entries,
and your contact checks each one before it publishes.

**Phase 3: the guide builder and chat for Lithuania (about a week).**
The biggest single piece, and the one the demo can do without: the tourism
centre can be shown the pages and the ready-made trips first. Worth doing
before a real pilot, not before the first meeting.

So: Phases 0 to 2 are roughly two weeks of work before Klaipėda can be filled,
and Phase 3 is another week.

## Decisions for you

1. **One site or a separate one.** Recommended: the same site at
   gemlyxtravel.com/lithuania, hidden from the Danish menu until you say so.
2. **Languages for Lithuania.** klaipedatravel.lt offers Lithuanian, English,
   German and Russian. Recommended for the demo: English only, and add
   languages once the tourism centre says which visitors matter to them.
3. **What the first meeting shows.** Recommended: the pages and two or three
   ready-made trips, with the guide builder following in Phase 3.
4. **Counting visitors.** A pilot has to show the tourism centre numbers, and
   Gemlyx counts nothing today. A cookie-free counter would give totals
   without tracking anyone. Your call.

## What does not change

The Danish site, its addresses, its Studio flow and every published Danish
row. Every phase ends with the full test suite passing, plus new tests that
prove a Lithuanian row never shows on a Danish page and the other way round.

## Progress

**Phase 0, done 29 Sep 2026 (batch 158).** `src/utils/countries.js` holds the
two profiles. A row with no `country` is Danish. The loader keeps only the
country the address names, so a Lithuanian row never reaches a Danish page.
`isInDenmark` now reads Denmark's box from the profile with the same numbers,
and `townFrame` checks a town against its own country. Publishing keeps a
non-Danish `country` and adds nothing to a Danish row. The full suite passed
unchanged, plus 13 new checks.

Left for Phase 2, noted so it is not forgotten: `middleware.js` builds share
cards from every published row and does not filter by country yet, and moving
between `/lithuania` and the Danish pages inside one session keeps whichever
country loaded first (a full page load between them is fine).

**Phase 1, done 29 Sep 2026 (batch 159).** Studio has a Country picker. A
Lithuanian draft researches, looks up, geocodes and writes in Lithuania, prices
in euros, and is checked against Lithuania's map. Tiqets and Ticketmaster are
not asked abroad; GetYourGuide is. Euro prices read on cards and band on €12
and €30. See HANDOFF_26SEP_STAYS.md, batch 159.

Phase 2 now also carries, from 29 Sep: Events as "Our picks" and "Full
calendar" in both countries (Major and Local become a badge, not tabs), the
Klaipėda calendar imported with the tourism centre's permission and credited,
a "What's on for you" filter, and Klaipėda added to Trip.com's city list.

**Phase 2, part one, done 29 Sep 2026 (batch 160).** /lithuania shows the
Lithuanian rows through the same pages. Next: the Events page ("Our picks" and
"Full calendar"), the calendar import and "What's on for you".

**Phase 2, part two, done 29 Sep 2026 (batch 161).** Events are "Our picks"
and "Full calendar" in both countries, with "What's on for you" and a Sport
pill; Studio can add a town's calendar to the Full calendar. To ask the
tourism centre for: their events feed or API access, since
wp-json/klaipeda-events/v1/events exists but refused an outside read.


**Batch 162, 29 Sep 2026.** Studio shows at /lithuania#studio (the planner
page stays in the menu while signed into Studio). The old workshops
(Bornholm Ceramics, Moesgaard Viking Days, Sømods Bolcher, Viking Center
Ribe, Viking Ship Museum) are gone in both countries: they came from the
legacy craft_items table, which the app no longer reads. The table itself is
untouched in Supabase and can be dropped whenever you like.

**Batch 163, 29 Sep 2026.** Klaipėda's open bus timetable (the GTFS you
uploaded, mdb-1042, from stops.lt) is in. Every Klaipėda entry with a point
now shows "Nearest Bus Stop" in At a Glance: the stop, an estimated walk,
which buses call there, and a "Live departures" link to that stop on stops.lt.
Events, attractions, workshops, food and nightlife all get it. Danish entries
are unchanged. The extract is data/klaipedaStops.js (511 stops); refresh it
with `node tools/klaipedaStops.mjs <unzipped feed>` when routes change. Still
to confirm with the operator or the tourism centre: the feed's licence terms,
since the Mobility Database lists none.

**Phase 3, batch 164, 29 Sep 2026: the guide builder for Lithuania, with no
chat.** Oliver: "Leave out the Chat Assistant.. I doubt anyone will use it
tbh.. but yes, start phase 3." And: "Where is the tips? That navigation gotta
be there too.."

- The planner page and Tips are back in the Lithuanian menu. The hero dates
  and "✦ Plan my visit" button show there too.
- /lithuania#detour has its own short form (PlanAbroadForm): arrival and
  departure with times, who is coming, kids, where they start (cruise ship,
  bus or train station, hotel, or typed), interests, how they get around,
  free entry only, events on their dates, saved places. A same-day visit reads
  "About 5.5 hours in town" and the plan has them back 45 minutes before
  departure. The Danish form's budget estimate, sommerhus and "Explore
  Denmark" rows are not on it: they run on Danish prices.
- "✦ Plan my visit" goes straight to the "Here's what's coming up" preview
  and then to the build, with no chat turn in between. The chat, the AI
  notice that goes with it, the preview's Ask buttons and the guide's Local
  Assist are all off on Lithuanian pages and Lithuanian guides. Studio stays.
- The build: every AI prompt in generateGuide and the legs and stays step goes
  through forLand (utils/guideAbroad.js), which swaps Denmark, Danish and DKK
  for the country and adds a rule that Danish facts in the prompt (Rejsekort,
  DSB, Jutland, islands, sommerhus, the Copenhagen Card) are not this trip.
  The planner and writer get every published Lithuanian place as their list
  to choose from, with events only on the trip's days and only when asked for.
  Web research, geocoding and Google directions ask Lithuania.
- A guide carries its country (`_country`), so a shared Klaipėda guide opened
  at /guide/... is still drawn as Lithuanian: map links say Lithuania, the leg
  chips open Google transit instead of Rejseplanen, Back goes to the Lithuanian
  planner, and the costs block (Danish fares, meals and fuel in DKK) is left
  out until Lithuania has its own figures. No currency line either: /api/fx
  converts from DKK only.
- Tips on /lithuania: "Packing for Lithuanian weather" and the FAQ, with the
  covered towns listed. "Find a local" (about Danes) and the Travelbetter.dk
  button stay on the Danish page. Lithuanian tips come from Studio like any
  other row.

Still open: Lithuanian cost figures (meals, fares) with sources, the currency
line from EUR, and Klaipėda content in Studio, since the guide can only choose
from what is published.

**Batch 165, 29 Sep 2026: no account needed on Lithuanian pages.** Oliver: "I
think if we do this Gemlyx experiment in Klaipeda, then we need to make people
able to use everything without account." On /lithuania (OPEN_ABROAD):
"Review article" opens for everybody, a shop's Gemlyx offer shows to everybody
instead of "Only for paying users", "Report a problem" is in the menu without
signing in, and the Log in and Sign up pills, the "Account needed" card on
Home and the "your saves live on this device" strip are not drawn. Saving
places and guides already worked without an account. Signing in is still in
the menu. The Danish page keeps every gate it had.

Not changed: one guide a day per visitor (a cost cap, not an account gate;
perIp is 4 a day), and the Ask Gemlyx chat stays off abroad as decided.

**Batch 166, 30 Sep 2026: Gemlyx promotions.** Oliver: "I think what will sell
more is the discount.. should we get a 'Gemlyx promotions' navigation?" A new
page next to Cheap gems (#promotions) lists every live Gemlyx offer, read off
the entries' own `__offer` (added in Studio as before), ending soonest first,
each card opening its entry. Open to everybody on /lithuania; on the Danish
page it keeps the entry page's rule ("Only for paying users"). Out of the menu
while no offer is live, except in Studio.

Proposed, not built (waiting for Oliver): the menu as dropdowns. Advice
(Essentials, Tips), Activities (Events, Full calendar), Gems (Cheap gems,
Promotions), Places (Attractions, Towns, Islands), Eat & drink (Food,
Nightlife, Shopping), and Plan a trip.

**Batch 167, 30 Sep 2026 (overnight, with Fable).** Oliver: "work on it with
Fable for an hour or so. Finish making it a template of the Denmark version
with the changes we talked about."

- The menu is dropdowns, on both sites: Explore, Advice (Essentials, Tips),
  Activities (Events, Calendar), Gems (Cheap gems, Promotions), Places
  (Attractions, Towns, Islands), Eat & drink (Food, Nightlife, Shopping), and
  Plan my trip. A group with one page left shows as that page; an empty group
  is not drawn. The burger has the same groups as an accordion.
- Fable audited /lithuania for Danish leftovers. Fixed from its list:
  "near you" and "km from you" now work for a visitor standing in Klaipėda
  (they only worked inside Denmark); journeys and "from CPH" lines use the
  country's hub (Vilnius) instead of Copenhagen; a Klaipėda guide no longer
  says "Denmark is small" or talks about Danish towns and island ferries;
  saving places works on /lithuania and "plan from saved" opens the planner
  with them ticked, only this country's saved places go into a plan; the
  trip library button is hidden abroad; Cheap gems, Shopping, Islands and
  the weather strip speak about the page's country; share cards and the
  sitemap cover /lithuania (a Klaipėda row is never served under /denmark).
- Found on the way and fixed for Denmark too: every town and attraction
  share card was titled "A Denmark guide", because the entry's own title and
  description were being dropped before they reached the tags.
- Still open from the audit: the Shopping kind "Danish label" is a stored
  value (needs a Studio change, not a label change), the one-guide-a-day
  window resets at Copenhagen midnight (server and browser must change
  together), and privacy.html describes the service as Denmark only.
