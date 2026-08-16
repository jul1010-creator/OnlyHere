# GEMLYX HANDOFF 13, night of 15/16 August 2026

Written at the end of a long session. Everything below is on disk and building.
**Nothing is committed or pushed.** That is still Oliver's call.

Suite: **5201 passing**, and the four failures you will see in a cloud sandbox
are `public/robots.txt` assertions failing because `public/` was never staged
there. On Oliver's machine those pass.

Verified green in UTC, Copenhagen, New York, Los Angeles, Kolkata, Auckland and
Honolulu. That sentence is new, and most of this handoff is about why.

---

## READ THIS FIRST: CI now runs the suite

`.github/workflows/build-check.yml` ran `npm run build` and nothing else for
months. Five thousand assertions and no automation touched them.

It now runs `node tests/run.mjs` before the build, twice, once on UTC and once
on `America/New_York`. Both block.

**The workflow file could not be written by the remote bridge** (GitHub protects
`.github/workflows/` from remote tools, sensibly, since a workflow executes
code). Oliver added the first step by hand. The New York step and its comment
were handed over as a file and may still need pasting in. Check that before
assuming it is live.

---

## The thing that actually mattered: one bug, five copies

A date-only ISO string parses as **UTC midnight** and every reader in this app
uses local getters. Found independently in five places, written at different
times by different passes, each one noticed and fixed locally with a good
comment, none of them ever looked for siblings.

| where | what a reader saw |
|---|---|
| `parseEventDate` | a 1 September festival filed under **August** |
| `isCurrentlyLive` | every festival marked over from the **first minute of its closing day** |
| `hasFinished` | an event ending today read as finished, west of Greenwich |
| `isUpcoming` | tomorrow's festival dropped off Coming Events at 20:00 and stayed off till midnight |
| `getEventDate` | "Tue 23 Jun" printed as "**Mon 22 Jun**" |
| `dayOfVisit` | **the museum-closure warning naming the wrong weekday** |
| `tripEvents`' own private `dayStart` | a festival's whole window sitting a day early |

The `dayOfVisit` one is the one to remember. `shutOnVisit` is what tells a
reader a museum is shut on the day they mean to go. Off by one it cleared the
Monday and flagged the Tuesday, so somebody crosses a city to stand outside a
locked door having been told it was open. Every other bug in the family cost a
click.

**All of it now goes through `src/utils/calendarDay.js`.** One reader,
`dayStart`, plus `dayEnd`, `dayWithin` and `dayKey`. It is in a file of its own
because `helpers.js` needs it and `eventDates.js` already imports `daCompare`
from `helpers.js`, so either direction would be a cycle.

### One data-model change worth reviewing

A guide stored its arrival with `arrivalDate.toISOString()`. `arrivalDateIn`
builds LOCAL midnight, so from Denmark that wrote `2026-09-05T22:00:00.000Z` for
the 6th. It only reads back as the 6th in the timezone that wrote it. Fine while
the person who built a guide is reading it. Wrong the moment they share the link.

It now stores `dayKey(arrivalDate)`, i.e. `"2026-09-06"`. **Guides saved before
today still work**: they hold the timestamp form and `dayStart` falls back to
reading those as a local day, exactly as the old code did. No migration. That
fallback is asserted, not assumed.

---

## Everything else, in the order it happened

**Preview coverage.** A run that matched 16 rows and answered neither of the two
stated interests reported nothing, because the finding only fired on zero rows.
It now says "16 rows matched and not one answers what they asked for", and the
🔭 button aims at where they land rather than "wherever it is thinnest".

**Seven bugs found by auditing the day's own work.** Every one shipped green.
The worst three: one `Ærø` in a conversation broke arrival detection entirely
(folded index, raw slice); `"Three days in Ribe, we love the old town"` put Den
Gamle By, 180 km away in Aarhus, on the card via a sight alias that is also an
ordinary English phrase; and `"already in Kobenhavn and want to get out"` was
not read as leaving, because the mention check folds and the departure check did
not. That last one is the ten-Copenhagen-rows screen, still happening, for the
spelling Oliver used himself when he asked for the fold.

**Photos while drafting.** 🖼 Add photos above the JSON editor. Uploads to the
bucket and writes the URL into the draft. The Media panel could not be reused
because every action in it PATCHes a row by id and a draft has no id.

**Tiqets, live.** Deep link template in `config.js`, wired into the guide's
Before you go block and a new Sightseeing essential. `ticketUrl` is on every
content type, validated at publish so a category page or a search URL cannot get
in by hand. `ticketLink.js` gates a candidate through `sourceIsAboutPlace`, so a
search that returns a Copenhagen museum while drafting Asaa harbour is refused.
The plain Tiqets URL is stored and tracking is added at render, so the marker can
change without a migration.

**GetRentacar is deliberately NOT wired.** Their front page lists Turkey, the
UAE, Spain, Greece and the US, `/country/denmark` 404s, and no Danish inventory
turns up. `CAR_RENTAL_LINK` in `config.js` is empty with the reasoning. One
search on their site settles it. DiscoverCars and Rentalcars both have real
Danish coverage and are on Travelpayouts.

**Affiliate disclosure.** `public/privacy.html` had none while Booking.com and
Ticketmaster links were already live. Added, and any partner link now prints a
disclosure and gets `rel="sponsored nofollow"` wherever it appears, decided by
host so a future paid link needs nobody to remember.

**Facts rotation.** "Constantly start out with H.C. Andersen, and then Ribe, and
then the jelling stones." Two causes. An August complaint, *"it should start on
the first fact"*, had been read as `denmarkFacts[0]` when he meant "settled, not
mid-swap"; and the stored order captured `denmarkFacts.length` at mount, before
liveContent merges, so an order of `[]` pinned every position to card zero. Now
a seed, derived during render, random from the first card.

**TDZ scanner** false-positived on correct code because it counted `const`,
`let`, `var` and `function` as bindings but not arrow parameters. Fixed.

---

## Then a second pair of eyes found five more, all in the JSX layer

An independent review after the above was green. Every finding was in a `.jsx`
file, which a suite of pure functions structurally cannot reach, and four of the
five produced output a Dane never looks at. That is precisely why green stayed
green.

1. **The Booking.com link booked the night BEFORE arrival, in Denmark.**
   GuidePage built the checkin with `dayStart(...)` and then formatted it with
   `toISOString().slice(0,10)`, which converts local midnight back to UTC. Three
   lines under tonight's own fix, on the same value, on the app's declared
   revenue path. This one was **wrong in Denmark and right in New York**, the
   reverse of the whole family, which is how it survived a seven timezone sweep.
2. **The saved-guide weather check** read `_arrivalDate` with a raw parse while
   GuidePage read it with `dayStart`, so alerts lined each day up against the
   forecast for the day before it.
3. **A sixth private copy of the overlap test**, in EventMatchCard. A traveller
   arriving on a festival's closing day was told nothing, in every timezone
   including this one.
4. **"Invalid Date" and NaN on the public Events grid.** The badge did
   `new Date(event.date + "T00:00:00")`, and an Invalid Date is truthy. Plus
   `daysUntil` compared a UTC parse to the live clock, so from about 20:00 in
   New York a festival starting tomorrow was pilled "Happening now" beside a
   date that still said tomorrow.
5. **Forecast tiles labelled with the previous weekday** west of Greenwich.

All five fixed, tested and mutation-verified. Six of the seven mutants died in
UTC plus New York; the seventh needs a +12 zone to see, and that is written down
where the assertion is.

**The lesson worth keeping:** the fix was complete in the layer the tests reach
and absent in the layer they cannot. Grepping for the shape rather than the
instance found five copies in utils. It did not occur to me to grep the `.jsx`
files, and that is where the other six were.

---

## And in the morning: the price fields

Oliver on a Reffen draft: `"price": "See website"` is weak. Then, on the tier
beside it: **"the average traveller doesn't know what mid-budget is in
Denmark."**

He is right, and it retires the vocabulary. Budget, Mid-range and Splurge are
defined relative to Denmark, so decoding one needs the knowledge the reader came
here to get. A German sees 250 kr and thinks expensive, a Norwegian thinks cheap.
STUDIO_VOICE says as much without noticing the consequence: its rule that "a
200-300 DKK dinner is affordable/mid-tier here" is right for the WRITER and
makes the reader-facing label more Denmark-relative, in a file whose next rule
is "write for an ordinary international traveller".

**`budgetLevel` is gone.** Out of both prompts, out of shapeForLive, out of the
paste-ready codegen, out of the audit and report-scope lists, out of
glanceExtract. `deriveBudgetLevel` is replaced by `priceBand`.

**The Food tabs now say real money**: Under 100 kr / 100 to 250 kr / Over 250 kr.
Same three cuts the old function made, including 250 staying inside the middle
band, so no live row requalifies.

**And unknown is null rather than the middle band.** This was the quiet part.
`deriveBudgetLevel` mapped any price with no digits to "Mid-range", so Reffen,
whose own uncertainties say no reliable prices were found, sat in the Mid-range
tab on the strength of nothing: returned to a reader filtering Mid-range,
withheld from one filtering Budget, on a measurement nobody made. The intent
behind that default was right, an unpriced row must not vanish, and null does it
better: no band claims it, and it shows under All. Asserted, because that is the
one way this change could go wrong.

### Still to do on price

`"See website"` is still the fallback and is still weak. For Reffen it is worse
than weak: their site does not publish stall prices either, so the field points
a reader at a page that cannot answer them. The draft's own audit already found
the real answer and the draft omitted it, that **entry is free and you pay per
stall**. The proposal Oliver has not yet ruled on:

- ask for **entry cost** separately from **what you will spend**, since they are
  the same number for a museum and different for a market, a street or a park
- retire "See website" for "Not published" unless the website genuinely has it

---

## Still open

- **`index.html` was deleted and restored.** Two of this session's writes landed
  at `OnlyHere\src` and `OnlyHere\tests` instead of inside `onlyhere-project`;
  cleaning that up cost the entry file and a red deploy. Both stray folders may
  still exist at the repo root. They contain only duplicates.
- **App.jsx is 1.27 MB.** It hid a missing `useMemo` import tonight, which a
  build cannot catch.
- **Ticket lookup during drafting** is built but not wired: `ticketQuery` and
  `pickTicketUrl` exist and are tested, the research-pass call and the Studio
  paste box are not written. That was task 17.
- **Kombardo Expressen is missing from `operators.js`**, which holds only DSB,
  FlixBus and Rejseplanen. The guide prompt names Kombardo as a frozen fact for
  exactly the Copenhagen-to-Jutland crossing, so the app tells the model to name
  it and the chips never do. Confirmed still running: Aarhus, Aalborg, København,
  Randers, Odense. Note before anyone "corrects" the prompt: in Dec 2024 the
  **Bornholm** route was renamed Bornholm Expressen and moved to Vikingbus; the
  Jutland routes kept the Kombardo name.
- **No return leg.** The planner builds a path between stated points and never
  asks how they get back to where they landed. A guide can end in Aalborg, 5h39
  from the airport they flew into, and say nothing. `arrivalPoint` and
  `routeOrder` already know enough to measure it.
- **Event cards do not print the event's own run dates**, which is why a correct
  Tivoli Halloween offer looked wrong and could only be checked by leaving the
  site.

## The standing rules, unchanged

Edit freely. **Do not sync, commit or push.** Never overwrite his files with
older content. Web content only via WebFetch or WebSearch, never curl or any
other fetch. Never use a dash. Avoid "actually", "truly", "genuinely", "simply".

Mutation testing is not optional: break the rule, confirm RED, restore in a
`finally`, verify with a checksum. And **a crash is not a failure**: a thrown
assertion aborts the file and reads as a pass, so optional-chain everything in a
test fixture. That trap was hit four times in one evening.

One addition earned tonight: **mutation-test date code in two timezones.**
Reverting `hasFinished` and `isUpcoming` to UTC parsing killed nothing in a UTC
container. A timezone bug needs a timezone.
