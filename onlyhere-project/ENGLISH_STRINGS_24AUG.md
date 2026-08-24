# The English frame, counted

24 August 2026. Companion to `HANDOFF_24AUG.md`.

`HANDOFF_NEXT.md` point 2 says "around ninety hardcoded English strings on the
guide surface, no `t()` and no catalogue anywhere". The 23 August handoff says
~150. Neither number came from counting, and Kristian asked for Danish and
German on his first look at the site, so the size of the job is now the
question.

`tools/englishStrings.mjs` counts them. Re-run it after any pass:

    node tools/englishStrings.mjs           summary
    node tools/englishStrings.mjs --list    every string with line numbers
    node tools/englishStrings.mjs --json    the catalogue

It is a report and not an assertion. It is not part of `node tests/run.mjs`,
for the same reason `tests/comment-audit.mjs` is not. Comments are stripped with
`stripComments` from `tests/tdz.mjs`: `stripNonCode` blanks string CONTENTS,
which is every single thing this tool is looking for.

---

## The number

**734 unique reader-facing English strings across 15 files.**

**233 of them are certainly on a screen**: a JSX text node, or a literal
sitting in a rendered slot (`placeholder=`, `aria-label=`, `title=`, `label:`).
There is nothing to argue about with those, and they are listed in full below.

The other 501 are bare literals and template strings. Some are labels and some
are diagnostics no traveller sees. **Read them before translating; do not run
the list through a translator wholesale.** That is the same trap as every
source-scanning assertion in this repo: the thing you found sits next to the
thing you meant.

Two categories are excluded from all of it, and the exclusions are the reason
the number is not four figures:

* **150 strings inside `{isStudio && ...}` render blocks.** The founder Studio is
  one person's admin tool in one language. Found by balancing braces out from
  each `isStudio &&`, not by a line number, because a line number in a 1.5 MB
  file is wrong within a week. `tests/run.mjs` now uses the same span finder
  for the dash rule, with an assertion that fails if it ever finds zero.
* **106 model prompts.** `STUDIO_VOICE`, the guide build instructions, the JSON
  shape blocks. Those are addressed to a model and must stay in one language:
  translating a JSON key does not read badly, it stops the guide loading. The
  one deliberate exception already exists and is not in scope here,
  `nativeBlock` in `readerLanguage.js`, which is written in Danish on purpose
  because an instruction ABOUT Danish written IN English is the fault it warns
  about.

## By file

| File | Reader-facing | Certainly on screen | Excluded |
| --- | ---: | ---: | --- |
| `src/pages/GuidePage.jsx` | 56 | 39 | 2 prompt |
| `src/components/GuidePreviewScreen.jsx` | 36 | 12 | 1 prompt |
| `src/components/AskGemlyx.jsx` | 10 | 5 | 1 prompt |
| `src/components/EventMatchCard.jsx` | 2 | 2 | . |
| `src/components/JourneyCard.jsx` | 2 | 2 | . |
| `src/components/GuideRouteMap.jsx` | 6 | 0 | . |
| `src/components/WeatherStrip.jsx` | 3 | 2 | . |
| `src/components/WeatherHeaderStrip.jsx` | 9 | 0 | . |
| `src/components/LiveEventsHeaderStrip.jsx` | 8 | 5 | . |
| `src/components/AtAGlanceCard.jsx` | 1 | 1 | . |
| `src/components/GemlyxFindCard.jsx` | 1 | 1 | . |
| `src/components/DetailPage.jsx` | 14 | 11 | . |
| `src/components/ReviewsSection.jsx` | 5 | 4 | . |
| `src/components/HowWeKnow.jsx` | 6 | 5 | 1 prompt |
| `src/App.jsx` | 575 | 144 | 150 Studio, 101 prompt |

`App.jsx` is 78 percent of the work, because the guide render, the chat, the
filters and the account screens all live in it. That is the same 1.5 MB fact
behind the bundle problem in `HANDOFF_NEXT.md` point 4, showing up as a second
cost.

---

## Every string that is certainly on a screen

Ordered by file, then by line. `jsx` is a text node between tags; `attr` is a
literal in a rendered slot.

### `src/pages/GuidePage.jsx`  (39)

```
   100  jsx   1; let longest = null; for (let i = 0; i
   558  jsx   Guide not found
   560  jsx   Back to Gemlyx
   727  jsx   ‹ Back
   738  jsx   ＋ Keep
   743  jsx   ✓ Kept
   746  jsx   Share ↗
   765  jsx   Anyone with the link can open it, on any device. Nobody needs an account, and it does not expire.
   782  jsx   Send ↗
   793  jsx   Your browser wouldn't let the page copy for you. The link is selected above, so copy it by hand.
   804  jsx   WhatsApp ↗
   806  jsx   Email ↗
   814  jsx   For the people coming with you. Posting the guide publicly or republishing the text is not allowed.
   850  jsx   ✦ Your Gemlyx guide
   876  jsx   📋 Simple guide, no maps or transport times
   922  jsx   Your route:
   932  jsx   Longest single journey:
  1000  jsx   The whole route, numbered in order. Tap a pin to fly down to it, and zoom in to see what else of ours is nearby.
  1035  jsx   Book before you go
  1050  jsx   Before you go
  1116  jsx   🎫 Browse Danish attraction tickets ↗
  1130  jsx   Does this look right?
  1131  jsx   Here's everything your guide will include. Take a look, then save it to get your own link.
  1171  jsx   ◈ Pipeline test: what went in
  1172  jsx   Test traveler:
  1178  jsx   Planner's structure (before the writer):
  1184  jsx   Events included:
  1194  jsx   The forecast moved since you saved this.
  1302  jsx   Same place, nothing to travel
  1370  jsx   · Maps ↗
  1403  jsx   Check times on Rejseplanen
  1597  jsx   · rain likely
  1674  jsx   NOTE_CLAMP; const noteBlock = note ? (
  1900  jsx   Where to stay:
  2055  jsx   Getting back:
  2060  jsx   Straight line distance, not a measured route, so treat it as the shape of the problem rather than as a timetable.
  2104  jsx   Back to chat
  2137  jsx   Ask Gemlyx
  2156  jsx   chatRevealedUpTo; return (
```

### `src/components/GuidePreviewScreen.jsx`  (12)

```
   100  attr  Major Cities
   103  attr  Food & Drink
   452  jsx   Here's what's coming up
   470  jsx   ◈ Pipeline test: the traveler that was picked
   479  jsx   The planner's full day-by-day breakdown and whether events made it in show on the finished guide.
   544  jsx   ⬇ Download run report
   623  jsx   Where you start
   635  jsx   Within reach
   668  jsx   Read more
   686  jsx   Worth considering, but a long way
   733  jsx   or ask Gemlyx
   798  jsx   Ask Gemlyx for something else
```

### `src/components/AskGemlyx.jsx`  (5)

```
   173  jsx   Ask about this place
   182  jsx   ✦ Ask Gemlyx
   226  jsx   Not in the entry, looked up just now
   239  jsx   Checking the entry…
   257  jsx   Sign in to ask
```

### `src/components/EventMatchCard.jsx`  (2)

```
    79  jsx   ✦ Worth knowing
    94  jsx   Read more
```

### `src/components/JourneyCard.jsx`  (2)

```
    50  jsx   Getting there
    75  jsx   You get off at
```

### `src/components/WeatherStrip.jsx`  (2)

```
    69  jsx   The forecast could not be loaded just now. This is our end, not a quiet spell: check DMI or Yr for these days.
    71  jsx   Loading forecast...
```

### `src/components/LiveEventsHeaderStrip.jsx`  (5)

```
    73  jsx   Live Events
    99  jsx   What's closest to me?
   102  jsx   Finding your location...
   105  jsx   Couldn't get your location.
   106  jsx   Try again
```

### `src/components/AtAGlanceCard.jsx`  (1)

```
    16  jsx   At a Glance
```

### `src/components/GemlyxFindCard.jsx`  (1)

```
     7  jsx   ✦ Gemlyx Find
```

### `src/components/DetailPage.jsx`  (11)

```
   167  jsx   ‹ Back
   244  jsx   This edition has finished
   406  jsx   🏨 Stays on Booking.com ↗
   407  jsx   🏡 Homes on Airbnb ↗
   449  jsx   On now
   475  jsx   Nearby, worth knowing about
   491  jsx   Distances are straight line between town centres, not driving time.
   732  jsx   ◆ Gemlyx Find
   791  jsx   🌐 Visit website
   852  jsx   🎫 Book tickets
   863  jsx   ↗ Get Directions
```

### `src/components/ReviewsSection.jsx`  (4)

```
    59  jsx   💬 What travelers say
    60  jsx   Real visitor comments, not edited or verified by Gemlyx, shown as written.
    71  jsx   Couldn't post. Try again.
    75  jsx   Loading comments…
```

### `src/components/HowWeKnow.jsx`  (5)

```
   224  jsx   Primary source
   234  jsx   Also checked
   248  jsx   What we corrected
   268  jsx   · checked against
   281  jsx   What we could not confirm
```

### `src/App.jsx`  (144)

```
  2520  attr  Planning what to research
 12131  jsx   8) continue; for (let idx = 0; idx
 12204  jsx   a ? "next" : b
 12966  jsx   HOT ↗
 13053  jsx   ★ Can't miss out
 13054  jsx   Highly Recommended
 13055  jsx   Best if already nearby
 13311  jsx   ✦ Gemlyx
 13432  jsx   Shall I build your guide?
 13435  jsx   It takes a few minutes. Your plan appears right here.
 13440  jsx   Yes, build it
 13444  jsx   Not yet
 13484  jsx   Mention who's traveling: kids, budget, a car. The more Gemlyx knows, the better the plan.
 16057  jsx   Beyond the
 16060  jsx   Hidden gems across the whole country, and this is how you find them.
 16062  jsx   ✦ Plan my trip
 16066  jsx   Scroll to explore
 16083  jsx   Today in Denmark
 16097  jsx   Only used on your device, never stored ·
 16104  jsx   Getting your location…
 16337  jsx   Near you right now
 16338  jsx   Straight-line distance from where you are
 16364  jsx   Why Gemlyx exists
 16387  jsx   Four days is enough for more than one city.
 16390  jsx   See a Road Trip →
 16405  jsx   Or read a guide Gemlyx already built
 16463  jsx   Your Saved Guides
 16482  jsx   Stay in the loop
 16487  jsx   Notify me
 16491  jsx   Be the first to know when new cities launch. No spam.
 16494  jsx   ✓ You're on the list. We'll be in touch.
 16497  jsx   Every find personally verified · Denmark
 16499  jsx   Privacy & Data
 16501  jsx   Privacy Policy
 16503  jsx   Terms of Service
 16706  jsx   Works once you are in Denmark with location on. Showing recommended order for now.
 16714  jsx   Watch it made, buy it warm. No ticket, no booking, just walk in.
 16718  jsx   Nothing published here yet.
 16730  jsx   ◆ Open year-round
 16741  jsx   ↗ Get Directions
 16751  jsx   Nothing matches those filters
 16752  jsx   Try clearing one. Denmark still has plenty to offer.
 16775  jsx   ◆ Hidden Gem
 16795  jsx   ⚡ Book online
 16797  jsx   Contact to book
 16800  jsx   🆓 Walk in
 16804  jsx   ✦ Gemlyx Find:
 16845  jsx   No upcoming events. Try a different filter.
 16979  jsx   Read more
 16996  jsx   Pick a town
 17001  jsx   Nothing published here yet. Towns and venues both appear as soon as they go live through the Studio.
 17062  jsx   Gemlyx Find:
 17113  jsx   Read the full street guide
 17140  jsx   Bar streets
 17233  jsx   Major Cities
 17242  jsx   🏙 Major City
 17344  jsx   Clear all
 17489  jsx   Nothing published matches these filters yet.
 17491  jsx   Clear all filters
 17505  jsx   Gemlyx Intelligence
 17507  jsx   Gemlyx Detour
 17530  jsx   Road trips are being rebuilt
 17536  jsx   Pick a route. Gemlyx builds it around real stops along the way
 17537  jsx   Assumes you're driving. You can still add dates, budget and anything else afterwards.
 17557  jsx   ♥ Your Saved Places
 17558  jsx   Saved from Attractions and Booking. Tap ✕ to remove.
 17575  jsx   ✦ Ask Gemlyx for a road trip from these
 17583  jsx   ⛺ Camping & Tent Spots
 17599  jsx   Get Directions →
 17613  jsx   When are you coming?
 17635  jsx   Starting point
 17635  jsx   (blank = Copenhagen Airport)
 17656  jsx   ✦ Optional: fine-tune the plan
 17657  jsx   skip it and Gemlyx still plans
 17669  jsx   (pick as many as apply)
 17676  jsx   Travel style
 17690  jsx   Who's traveling
 17697  jsx   Getting around
 17723  jsx   Traveling with kids
 17728  jsx   Include events
 17770  jsx   ✦ Build my trip
 17783  jsx   Know a place we're missing?
 17784  jsx   Tell us. Every Gemlyx entry is hand-researched and checked against multiple sources, so this helps us find the next one.
 17799  jsx   ✓ Travel Essentials
 17800  jsx   Everything you need to travel Denmark like a local
 17813  jsx   The 3 mistakes to avoid
 17871  jsx   How to get it
 17951  jsx   Traveling Solo?
 17955  jsx   Find a local, if you can
 17979  jsx   Still need help?
 17980  jsx   ✉ hello@gemlyxtravel.com
 17990  jsx   Select a city
 18054  jsx   Select a city to explore the map
 18527  jsx   Log in
 18531  jsx   Sign up
 18580  jsx   Why we built Gemlyx
 18595  jsx   What inspired us to create this app?
 18602  jsx   Got it
 18613  jsx   Customer Support
 19098  jsx   Ask Gemlyx
 19115  jsx   previewRevealedUpTo; return (
 19125  jsx   Gemlyx is thinking…
 19150  jsx   How do you want to see it?
 19151  jsx   Pick one, this decides what gets built next.
 19155  jsx   🗺️ Map &amp; transport
 19156  jsx   Real routes, exact travel times, one-tap Google Maps links.
 19160  jsx   📋 Simple day by day
 19161  jsx   Just the days and stops, no maps or transport times.
 19199  jsx   Your guide is ready
 19200  jsx   Tap to open it
 19216  jsx   Keep browsing ↓
 19355  jsx   Planning your trip, can take a few minutes. You can keep browsing, this carries on without you.
 19446  jsx   Photo credits
 19453  jsx   Loading credits…
 19455  jsx   No image credits are on file yet.
 19466  jsx   Credit required
 19506  jsx   The short version is below. The full
 19507  jsx   are the documents that count, and they are kept current.
 19534  jsx   💡 Suggest a Place
 19542  jsx   Thank you!
 19543  jsx   We'll take a look.
 19559  jsx   WHY IT'S WORTH INCLUDING (OPTIONAL)
 19565  jsx   Please add a name, or check your connection.
 19584  jsx   ‹ Back
 19610  jsx   Prices are indicative and confirmed with the workshop before you pay. Nothing is charged through Gemlyx.
 19652  jsx   ◷ Best Time to Arrive
 19655  jsx   Check today's live crowd levels on Google Maps ↗
 19665  jsx   No car or bike? Read this
 19671  jsx   What you can make
 19682  jsx   Recommended Package
 19691  jsx   Ticket Options
 19703  jsx   Upcoming Events This Season
 19726  jsx   Book Online ↗
 19734  jsx   Send Booking Request
 19737  jsx   No online booking here. We'll reach out to confirm with them personally
 19757  jsx   Tell us what you'd like to book. We'll confirm availability and price with the workshop and reply personally.
 19772  jsx   Please fill in your email and what you'd like to book.
 19774  jsx   Couldn't send directly.
 19775  jsx   tap here to send via your email app
 19791  jsx   Booking request sent!
 19816  jsx   ↗ TRENDING
 19817  jsx   ⚠ Pop-up
 19818  jsx   ◷ Seasonal
 19826  jsx   Still here?
```

---

## What to do with it

The catalogue is the input to a `t()` layer, not a substitute for one. Three
things worth settling before anybody starts substituting:

1. **Where the catalogue lives.** `travellerWords.js` is the precedent that
   works: one vocabulary that two parsers import, so adding a seventh language
   is a list entry rather than a seventh copy of the same regex. The catalogue
   belongs in one module the render sites import, for the same reason
   `foodStyle.js` was taken out of `App.jsx`: a decision living inside a render
   can only be checked by a regex over its own source.
2. **Which languages.** Danish and German, per Kristian. Denmark's 2024 inbound
   market puts Germany at 6.0m, well ahead of Netherlands 2.0m, United States
   1.1m, United Kingdom 0.9m and Sweden 0.8m. `travellerWords.js` already reads
   six languages on the way IN. This is the frame, on the way out.
3. **How it is asserted.** A count is not a rule. The assertion worth writing is
   structural: every key the catalogue declares has a string in every declared
   language, and no render site on the guide surface holds a bare English
   literal in a rendered slot. Mutation test both. A source-scanning assertion
   about copy has been satisfied by an adjacent comment nine times in this repo,
   and a tenth was written and caught during this very pass.

## What this pass found on the way

Cataloguing the strings is what surfaced the eleven em dashes rendering to
travellers, which are fixed and now asserted. That is written up in
`HANDOFF_24AUG.md`. It is worth noting here because it is the argument for
doing the catalogue at all: nobody was looking for those, and a list of every
sentence on the surface is the only thing that would have shown them.

## How this was checked

    node tests/run.mjs     9,905 passed, 0 failed
    npx vite build         clean, 1,617.00 kB
