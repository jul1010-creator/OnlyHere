# GEMLYX HANDOFF 14, 16 August 2026

Everything below is on disk and building.
**Nothing is committed or pushed.** That is still Oliver's call.

Suite: **5485 passing, 0 failing**, up from 5205 this morning. Verified green in
UTC, Copenhagen, New York, Kolkata, Auckland and Honolulu.

The four `public/robots.txt` failures that handoff 13 warned about in a cloud
sandbox are gone, and not by being excused: staging `robots.txt`, `privacy.html`,
`terms.html`, `image-credits.json`, `og-default.jpg` and `favicon.svg` makes the
sandbox run identical to Oliver's machine. A sandbox with four known failures is
a sandbox nobody reads the output of.

---

## READ THIS FIRST: two things from handoff 13 were stale

**The stray folders are gone.** `OnlyHere\src` and `OnlyHere\tests` are not at
the repo root. Root holds `.git`, `.gitattributes`, `.github`, `onlyhere-project`
and `package-lock.json`. `index.html` is in place. That item is closed.

**The New York CI step was never pasted in.** `build-check.yml` runs the suite
once, on the runner's own clock, with no `TZ` override. The two timezone
guarantee has not been live in CI at any point. A complete replacement file is
handed over as `build-check.yml` at the project root, with the reasoning inside
it. It also removes the two em dashes the old one carried in its comments.

---

## The one Oliver hit while this session was running

**"On the guide it told me that more content was needed for south jutland. I then
clicked it.. but this is not south jutland."**

Seven candidates came back. Five were on Funen (Hindsgavl, Odense Havnebad, the
Langeland art towers, Øhavsstien, De Vilde Heste), one was Randers in East
Jutland, and the seventh, the paper art museum, turned out to be in Jammerbugt
Kommune in the north. **Not one of the seven was in South Jutland.**

Everything that aimed that search was a PROMPT. `framingForTarget` writes a good
instruction, a model turns it into five queries, a search answers them, and a
second model reads the raw text and pulls names out. An instruction that has to
survive two models and a search engine is not a filter, and this one pass already
knew that about itself twice over: `splitAlreadyCovered` exists because "do not
include these" was in the prompt, and `splitFinishedCandidates` exists because
"skip finished editions" was in the prompt. This is the third instance, which is
where a pattern stops being a coincidence.

**And the model had already told us.** Every candidate carries the town or region
it claims, the extraction prompt asks for one, and the row prints it in grey next
to the name. Six of the seven declared, in writing, on screen, a place that
contradicts the ask. Nothing read the field.

`splitOffTarget` now measures each candidate with **the target's own test**: the
same `partOfCountry` and the same latitude band `coverageByTarget` uses to count
published rows, so the chip's number and the filter can never disagree about
where a region is. Six of his seven are refused, the seventh is kept because
nothing could place it, and the panel says which and where they were instead.

Randers is the one worth remembering: it is in Jutland, so the landmass agrees
with the target and only the latitude band refuses it. A filter checking the part
alone would have shown it.

### And the brief named Odense in a Sønderjylland prompt

`framingForTarget` ended every regional brief with "Aarhus, Odense and Aalborg
are the ${label} equivalents of Copenhagen here", from a trio fixed for all
eleven targets. For South Jutland that is three towns none of which are in it,
one of them the capital of Funen, printed in the brief whose whole job is keeping
the search out of Funen. The cap was the part that was right, so the cap is what
survives and the names are gone.

---

## "One source? What da fk"

Oliver, on the finished paper art museum draft, whose `__sources` held one URL:
the museum's own website.

**The research had not failed. The NAME had disqualified its own sources.** The
draft is titled "Det Nye Museum for Papirkunst". The museum calls itself *Museum
for papirkunst*, which is also its domain. `containsName` is a whole-phrase test,
correctly so, and every page calling the place by its real name therefore failed
to name the place:

| snippet | counted as a source |
|---|---|
| "Museum for Papirkunst i Hune viser papirkunst fra hele verden" | **no** |
| "Oplev Museum for Papirkunst i Hune, Nordjylland" | **no** |
| "Bit Vejle har skabt Museum for Papirkunst" | **no** |

The one URL that survived did so through the `ownHost` shortcut, which is a way
PAST the relevance test rather than a pass of it. So the count was not one
source. It was zero sources and a website.

`nameCore` strips a leading run of articles and new/old markers from a closed
list, stopping at the first word that is not one, and only while a distinctive
word survives in the remainder. "Det Nye Museum for Papirkunst" yields "Museum
for Papirkunst". **"Den Gamle By" yields "Gamle By" and not "By"**, which is the
guard that keeps this apart from the alias bug that put a museum in Aarhus on a
card about Ribe. A page about papirkunst in general is still not a source.

### And a draft standing on one page now says so

Nothing in the app had said so, and the reason is in the code: the comment beside
`__sources` reads "AN EMPTY LIST IS ALLOWED. A place too small to have been
written about should show no sources rather than eight about somewhere else."
That is right for the READER and it is exactly why a short list was invisible to
the founder. A short list has two causes that look identical and need opposite
responses: the place really is barely written about, so publish it, or the filter
threw the pages away, so fix the filter and redraft.

`evidenceStanding` and `describeEvidence` say which where they can. The venue's
own site is counted separately, because a museum's own page is the right source
for its opening hours and the worst possible source for whether the museum is
worth an hour of somebody's day. Two independent pages is an ordinary draft and
gets no note at all: a filter that fires on everything is a filter he stops
reading.

---

## The Gemini lesson, which landed on me too

Oliver, mid session: *"I asked gemini.. apparently it was correcting stuff that
didn't need correction, because it was already true. I gotta be careful with
Gemini."*

Two things in this session were mine to get wrong the same way.

**One.** The first version of the unsourced-price note read: *"Do not go looking
for the page: if one existed it was already read and discarded, which is a bug in
the source filter."* That is one of three possible causes asserted as the only
one, which is precisely the overreach of the "came from a blog" line it replaced.
Then I fetched the museum's own site: **museumforpapirkunst.dk keeps its prices
at `/dk/besog`, behind a link, and the pass reads the front page.** So those four
figures may be exactly right and on the operator's own site, in a place nothing
opened. The note now offers three causes in likelihood order: a prices page
nobody fetched, a page the filter refused, or nothing ever said it.

**Two.** I was about to "correct" handoff 13's Kombardo route list, which names
Odense, on the strength of a 2022 article and the operator's own
`/alle-busruter` page, which is under reconstruction. The operator's front page
names **Aarhus, Aalborg, København, Randers and Odense**. Handoff 13 was right,
including about Odense, and its warning not to correct the prompt held up.

The standing rule earned here: **an audit that says more than it measured is the
failure, whichever model writes it.**

---

## Kombardo Expressen, wired

The guide prompt has told the model for weeks to name Kombardo Expressen on "a
genuine long-distance crossing between regions". `operators.js` held DSB, FlixBus
and Rejseplanen, so the one operator the app singles out by name in prose was the
one a leg chip could not link to.

Checked 16 August against the operator's own front page. It earns a row of its
own beside FlixBus rather than a note on it: a coach with the ferry crossing
inside one ticket, so a reader does not book a bus and a boat separately.

`isRegionCrossing` asks whether the two ends sit on **different landmasses**,
which is the prompt's own rule and a fact about geography rather than a route
list. Five landmasses exist, they are named by `geography.js`, and unlike a route
they do not change hands. That is why this is allowed a small fixed set where the
ferry note twenty lines above refuses to name an operator at all: the ferry table
would go stale and Funen will not.

The cost is Aalborg to Aarhus, a real Kombardo corridor with both ends in
Jutland, which gets DSB and FlixBus and not this. **A miss is the right way to be
wrong here.** A chip naming an operator that does not run the route is the
failure that whole file was written to avoid.

Lolland-Falster is out because the operator does not name it. Bornholm is out
because a crossing to it is a ferry leg that never reaches the test, which also
means handoff 13's Bornholm-versus-Vikingbus disagreement did not need resolving.
It is written down in the file rather than decided.

---

## Event cards print their own run dates

The card printed a name, a one word kind, a time, a town and a note. For a museum
that is the whole story. For an event it omits the only fact that decides whether
the stop belongs on the day it is printed on, so Halloween at Tivoli, which is
real and worth the trip and not on in September, was indistinguishable from a
mistake without leaving the site.

The window comes from `getEventDate`, the same reader the Events grid, the detail
page, the header strip, the preview screen and the "worth knowing" card all use.
A seventh way to format a date range is the shape the `calendarDay` family spent
two days removing.

**And it answers the question underneath his.** Printing the window tells
a reader when it runs. Comparing it against the day the guide put it on tells
them whether the guide got it right, and that comparison is what cost a trip to
Tivoli's website. One call to `dayWithin`. An event with no confirmed date is
never flagged: unmeasured is not wrong.

The pipeline test panel answers "did they include events" with the window and a
`NOT on day N` flag, because that panel is where it gets noticed.

---

## The return leg

A guide could end in Aalborg, five and a half hours from the airport it started
at, and say nothing at all.

`routeOrder`'s own comment argues for an open path rather than a loop: a loop
assumes they fly home from the same airport, nothing in a brief says so, and
guessing a return leg would pull the whole order toward the start for a reason
nobody stated. **That reasoning is still right and it is a reason not to REORDER.
It was never a reason not to MEASURE.**

So the order is untouched, asserted directly, and the distance home is a fact
printed after the last day. It uses the same `reachBand` the ordering uses, so
the guide cannot call a distance comfortable in one place and far in another, and
the card says out loud that it is a straight line and not a measured route.

`arrivalPoint(convoText)` is baked onto the guide at build as `_arrivalPoint`,
the way `_geo` and `_arrivalDate` already are. A shared LINK keeps it, because
that payload spreads the live guide object.

### A finding, not fixed

**Reopening a guide from the saved list drops everything but the title and the
days.** `navigate("/guide/new", { state: { guide: { title: g.title, days: g.days } } })`.
So the weather, the geocodes, the exact durations and the arrival date all vanish
on reopen, and `arrivalDate` survives in the saved shape only because
`checkSavedGuidesWeather` reads that LIST rather than the reopened guide.

`_arrivalPoint` is deliberately not added to `guideToSave` for that reason: a
field added to a shape whose only reader throws it away would look like the
return leg working and then lose it on reopen. Fixing this means agreeing one set
of field names across the save shape and the render, which is its own pass.

---

## The .jsx sweep, and the scanner that outlasts it

Handoff 13's closing lesson: "Grepping for the shape rather than the instance
found five copies in utils. It did not occur to me to grep the `.jsx` files, and
that is where the other six were."

Seven more copies, all in the layer a suite of pure functions cannot reach:

| where | was | is |
|---|---|---|
| `App.jsx` build path | `daysUntil` written out by hand | `daysUntil` |
| `App.jsx` saved-guide check | half fixed on the 15th, arithmetic still hand-rolled | `daysUntil` |
| `GuidePage` reopen path | the same subtraction again | `daysUntil` |
| `App.jsx` + `GuidePage` weather | two copies of the day arithmetic, under a comment claiming **one shared implementation** | `dayPlus` |
| `DateTimePicker` | a seventh private `dayStart` | `dayStart` |
| `LiveEventsHeaderStrip` + `DetailPage` | two private event comparators | `byEventDate` |
| three stamps in `App.jsx` | `toISOString().slice(0,10)`, the day it is in **Greenwich** | `dayKey` |

**Two were live.** With no stated arrival date, day N's forecast was requested for
whatever o'clock the guide was built at rather than for a calendar day. And every
`__checked` stamp, plus the "TODAY'S DATE" the discovery model is handed, was the
UTC day: in Denmark that reads as tomorrow between 22:00 and midnight, and west
of Greenwich the window is four hours wide.

The rest were harmless today, and harmless for the same reason every previous
member of this family was harmless right up until it wasn't: correct as long as
nobody hands it a stored date string.

**`dayPlus` is new in `calendarDay.js`** and is the shared answer to "n days after
the day this names", built through the constructor so nothing is mutated.
**`tripDayDate` in `guideReading.js`** is the one place the trip's day numbering
lives, because day 1 being the arrival day was written out in two files.

### The scanner

The suite now greps every `.jsx` file on every run for six hand-rolled calendar
idioms, each with a named shared replacement, each of which has already been a
bug here. It does **not** ban `new Date(x)` in general, and that restraint is why
it can be strict about the six: a scan flagging every date construction would
fire on every legitimate clock read in the app, collect an allow-list per line,
and then get deleted.

All five banned shapes were put back one at a time and the scanner caught every
one. It also caught its own escape hatch: the single argued exception, a stored
row's age in days, was a `continue` past one line, and a mutation widening it to
"skip all of App.jsx" stayed **green**. It is now an exact-equality assertion on
the whole collected list, so widening it means editing an expected value in a
diff.

---

## The price fields

Oliver ruled **both changes**. One is done end to end. The other is deliberately
not started, and the reason is his own suite.

### Done: "See website" is retired, honestly

Two different things were wearing one sentence, and only one of them is honest:

- we did not read the site → **"See website"** is honest and useful
- we read it and it is not there → **"See website"** is a wild goose chase

Reffen is the second case. Its own site does not publish stall prices, so the
field pointed a reader at a page that could not answer them.

The string is now decided from what was READ rather than written by the model.
The drafting pass already fetches the operator's page and already asks
`ticketPriceOn` whether it states a figure; nothing consumed that answer for the
price FIELD. A failed fetch is an unchecked site and still gets "See website",
because claiming a page does not publish a price on the strength of a timeout is
the same overreach the price note was corrected for.

The prompts and STUDIO_VOICE no longer ask the model for the stand-in. It reports
an empty field, which is what it knows, and the app fills in the claim about the
operator's page, which is what it knows. Both were changed together: a prompt
saying "leave it empty" under voice rules saying "write See website" is a coin
flip per draft.

`statesAPrice` is the same digit test `priceBand` uses, asserted in both
directions across seven values, so a row can never be banded and unpriced at
once. That is how "See website" ended up in the Mid-range tab.

### Not started: entry cost separately from what you will spend

This is the more valuable half and it is a schema change: the prompts for food,
foodStreet and craft, `shapeForLive` for three types, the paste-ready codegen for
three types, the audit and report-scope lists, `glanceExtract`, `priceBand`, and
the Food tabs.

The suite already asserts, about `budgetLevel`, that **half a removal is worse
than none**: "a prompt still asking for it spends a model's attention on an
answer nobody reads, and shapeForLive would keep writing it into published rows."
The same is true in the other direction. Adding `entryCost` to the prompts
without `shapeForLive` storing it produces exactly that failure.

So it wants a pass of its own rather than the last hour of this one. The shape it
should take, for whoever picks it up:

- `entryCost` is what it costs to get IN. For a museum this is the number `price`
  already holds. For a market, a street or a park it is often free, and **saying
  free is the point**, not a blank.
- `price`, or a renamed `spend`, is what a visit costs. For a restaurant
  that is what it already means, so the Food tabs keep banding the same field and
  no live row requalifies.
- Legacy rows hold only `price`. Read `entryCost` with a fallback to it, the same
  pattern `dayStart` uses for timestamp arrivals, and **assert the fallback**.
- Reffen's real answer, which its own audit found and its draft omitted, is the
  test case: entry is free and you pay per stall.

---

## Still open, carried forward

- **App.jsx is 1.28 MB.** It hid a missing `useMemo` import on the 15th, which a
  build cannot catch.
- **Ticket lookup during drafting** is built but not wired: `ticketQuery` and
  `pickTicketUrl` exist and are tested, the research-pass call and the Studio
  paste box are not written. Task 17.
- **Reopening a saved guide drops everything but title and days.** New, above.
- **Entry cost versus spend.** Above, with the shape it should take.
- **The paper art museum draft needs a redraft**, not a patch. Its name is not the
  name anything else uses, its `city` says Hune where the museum's own address
  says Ilsigvej 2, 9492 Blokhus, and its four prices have no source on the row.
  With `nameCore` in place a redraft should find real sources.
- **The north Zealand discovery band puts Copenhagen in south Zealand.** The
  target is `lat > 55.75` and Copenhagen is 55.676. Pre-existing, and
  `coverageByTarget` and the new filter agree with each other about it, so it is
  consistent rather than broken. Worth a look.

## The standing rules, unchanged

Edit freely. **Do not sync, commit or push.** Never overwrite his files with
older content. Web content only via WebFetch or WebSearch, never curl or any
other fetch. Never use a dash. Avoid "actually", "truly", "genuinely", "simply".

Mutation testing is not optional: break the rule, confirm RED, restore in a
`finally`, verify with a checksum. **80 mutants were run this session, in nine
passes, and every one is dead.** Six survived their first pass and they came in
two kinds, both worth knowing:

- **Three were render gates.** `{when && (` replaced with `{false && (` passed
  every other assertion in its block: the call was still there, the template
  string was still there, and the card rendered nothing. Asserting that a render
  EXISTS is not asserting that it can fire. Same for the off-target sentence and
  the same again for the scanner's own allow-list, which could be widened from one
  argued line to a whole file with nothing failing.
- **Three were code that could not be isolated because it was redundant.** Two
  guards were doing nothing a later line did not already do, and the honest fix
  was deleting them rather than writing a test for a branch that cannot be
  reached. The third is reachable and the case is not obvious, so the file now
  names it: of everything strippable in `nameCore`, only "dette" and "disse" are
  four letters or more, so "Dette Museum" is the one input where the guard fires.

And **a crash is not a failure**: optional-chain everything in a test fixture.
Hit twice more tonight.

One addition earned today: **an assertion that pins a call's exact shape will
break on a correct change, and the next pass will learn to edit assertions.**
Three assertions broke on correct code this session (`dayStart(guide._arrivalDate)`
counted as exactly 2, `describePriceTrace(pt)` with no second argument, and the
old wording of the coach cap). Each is now phrased against the invariant instead:
every reader goes through a shared reader, every mention is accounted for. A test
that has to be edited to add a correct reader is a test that teaches the next
person to lower it.
