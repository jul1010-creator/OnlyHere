# Handoff, 19 September 2026

Written for the next session, and for Oliver in the morning. He set this one to
run overnight and went to bed.

**18,230 assertions pass and the build is green.** That is up 231 from the
17,999 the 18 Sep handoff closed on, and 646 from the 17,584 last committed to
git.

Everything below is on his disk and byte-compared. **Nothing is pushed.**

---

## 0. WHAT HE HAS TO DO

1. **Commit and push.** Two nights of work is uncommitted on one laptop, and on
   the 18th it was OneDrive rather than git that saved the source directory.
   Worth splitting into four or five commits before pushing, so a bad deploy can
   be bisected: the affiliate and copy work, the measured-field hatch with the
   price decider, the estimate and the costs split, the intake fixes, the
   published-trips system.
2. **Run `gemlyx_trip_library_19sep.sql`** in Supabase, which is in the repo root
   and in the chat sidebar. Until it is run, publishing a used trip fails
   silently on purpose and `/trips` shows "not reachable right now". Nothing
   else is affected.
3. **Decide the Booking deep link.** He tested the CJ link and it does not
   honour `url=`, so every stay button will earn and land on Booking's front
   page. See section 3.
4. **Press both partner-ads buttons** after the deploy and check the clicks
   register in his partner-ads dashboard. Hotel Viking shows on a day in Saeby;
   Travelbetter.dk is on the Tips tab.

---

## 1. WHAT HE ASKED FOR, AND WHAT HAPPENED

### 1.1 "Why was Aalborg included?"

His traveller's whole message was *"Bikes and public transport. Is it possible to
expand it to Jutland too?"* and the assistant had just talked them out of Jutland
in the same breath. The preview then filtered its entire town list down to
Jutland.

`regionsNamed` in `utils/previewMatch.js` read the word and `wantedRegions`
treats a named region as a request. **A question is not a request**, which
`readStay` has known since it was written, in the same words: "Do you have a
hotel to recommend?" is not a booked hotel. Here the cost is larger, because a
region filter takes everywhere they ARE going off the screen.

Questions are stripped by sentence now, and a question mark is optional: "Is
Jutland doable" and "Kan vi tage til Jylland" count too, while "Do Jutland
first, then Funen" stays an instruction. A region asked about AND then stated
still counts, which is what happens when the chat says yes.

### 1.2 The day 8 with no plan

Four readers, one question, four answers on his own export:

| reader | answer |
| --- | --- |
| the intake button, `floor(elapsedHours / 24)` | 7 |
| `readBrief`, calendar inclusive | 8 |
| `tripWindow`, off the intake dates | 8 |
| the guide builder, re-reading the form as prose | 7 |

So the preview offered events up to the 30th and the planner was told to build
exactly 7 days. `tripDays` in `utils/tripEvents.js` is the one reader now, and
**a day is a date you can use**: the dates from arrival to departure, less the
departure date when the flight leaves before the afternoon. His trip gives the 7
the form printed and the assistant said. A 22:00 departure gives 8, where the
old arithmetic lost them a day they have.

The guide's own brief is handed the form's dates rather than a transcript of
them, and the window ends where the plan ends, so a ticked event can no longer
land on a date the planner has no day for.

**One judgment call left for him:** an 11:00 departure loses its date under this
rule. A spoken range with no time keeps it. Both are defensible and the app now
has one answer rather than four; whether the cut should be noon is his.

### 1.3 The money list

*"Estimated 250 kroner or smth, and everything else is just a long list of check
prices."* One list was doing two jobs. A museum with a figure and a ferry whose
fare depends on the sailing are both true rows, and under a heading that says
"What you pay" the second kind reads as a failure to find prices.

Two lists now, two headings: **What you pay**, with the estimate under it, and
**To arrange**, with the searches. Nothing was dropped. The estimate says where
it stops rather than naming the rows below it a second time, and the refused
lines are named with their prices, so 145 + 450 + 160 + 110 on the list against
255 underneath shows exactly which figures came out and why.

### 1.4 Budget versus budget

*"The last picture is budget vs budget.. with no links on either."* Two causes,
both in `GuidePage.jsx`. `stayBookingUrl` was the named lookup AND the good slot,
so naming a property took the good search off the screen, and the named property
was a hostel. And `stayGoodUrl` was computed on the 18th and rendered nowhere,
which no assertion could see, because a variable with no reader looks exactly
like a variable with one.

Three doors now, in one order, every day: the property the guide named, then
good, then budget. The two searches are always the area, since a cheaper or a
better-reviewed room is a different building.

### 1.5 The Copenhagen card

*"If I suggest something like Copenhagen, it shouldn't pop up as a picture in the
chat... It should still pop up on maps, but in the chat, it should only be if the
chat recommends something."*

The rule was written on 10 September and was already right. **One letter beat
it**: his form said `Starting point: Copenhagne`, the reply spelled it properly,
and the comparison was exact. It also only ever compared the pool's spelling, so
a Danish traveller who typed København had not named Copenhagen either.

`namedNearly` in `utils/danishNames.js` knows the variants and tolerates one slip
on a name of seven characters or more, Damerau rather than Levenshtein because
the mistake people make is swapping two letters. Ribe is still not Rive. The map
is untouched and keeps the pin, which his own sentence asked for.

The same typo also costs him a trip anchor: `townPointFor("Copenhagne")` is null,
so nothing measures a distance from where they start. That one is still open.

### 1.6 The back buttons

*"Everything that clicks back needs to stop going all the way back to the front
page."* Every one of them was `navigate("/")`, which is not a way back, it is a
way out. The guide goes to the chat, "how we are paid" goes to the Legal card it
is linked from, and support goes to the menu. The destinations are written down
once in `utils/tabUrl.js`, beside the other addresses, and the assertion is an
absence: no back button in any of those files may send anybody to the front page.

### 1.7 A trip somebody kept gets published

His two answers: **public, stripped of the person**, and **the publishing half
only**, so a finished event keeps the refusal the costs block already prints and
the swap is the next session's work.

`utils/tripLibrary.js` is the whole of the stripping, and it is **an allowlist,
because a denylist fails open**. The guide object has grown a new underscore
field most weeks this month, and a list of fields to remove is a promise that
whoever adds the next one remembers to come here. A field this list has never
heard of publishes without it.

What travels: the title, the days, the stops, the notes, where to stay, and how
the trip was planned to move. What does not: the dates, the party, the budget,
the constraints, the essentials, and `_convoText`, which is the whole chat with a
role prefix on every line and which would have gone public with the first
published trip.

Then it is **read back before anything is written**. Some of what the allowlist
keeps is copied whole, so a nested field nobody has looked at can ride along
inside a leg; if anything personal survived, nothing is published at all.
Refusing is the right failure here: a trip missing from a list is a gap nobody
notices, and a conversation on a public page cannot be taken back.

A published copy gets **a new id**, not the saved guide's. With one id, a reader
who found a trip on the public list could change `/trips/x` to `/guide/x` and
read the conversation it was built from.

`/trips` lists them, `/trips/:id` opens one through the real GuidePage the way
`/example` does, and the page says whose trips these are and what was taken out.
Linked from Saved trips in the menu, above their own.

Publishing is fire and forget: the table does not exist until the migration is
run, and a traveller must never be told their guide failed to save because a
list page is not set up yet.

### 1.8 The party reading

From the same export, and all three parts were separate bugs.

- **"5 kids around 5-10 years old" became "5 children (aged 10)".** The reader
  needed the number immediately before "years old", so it took the top of the
  range and dropped the bottom. Both ends matter in opposite directions: a five
  year old rules out a long walk and a ten year old is the reason to mention a
  climb into a longship. A range is read as a range now, a list as a list
  ("aged 4 and 11" is two children, "aged 5 to 10" is a spread), and the Danish
  and German forms are readable at last, since neither carries a word for "old".
- **The adults question could never be asked.** The brief spotted five children
  and no adults, flagged the party vague, and then said "YOU HAVE EVERYTHING YOU
  NEED. Do not ask another question." The chase filtered on the SLOT key, and the
  slot had been asked at turn 2. "Who's coming along?" is the base question;
  "how many adults are with them?" is a question about the answer to it. A
  sharpening ask carries a key of its own now, is asked once, and does not bring
  the base question back. **He will notice this**: a traveller who says only
  "October" now gets asked which part of October, once.
- **And none of it reached the guide.** `_travelers` was read from the intake
  FORM field only, so a party given in conversation arrived as an empty string:
  the Booking search asked for two adults and the per person figure had nothing
  to multiply by. Both shapes go over now, and `_party` carries `adults: null`
  honestly. A party of children with no adult count gets **no group figure at
  all**, because multiplying would be wrong twice.

### 1.9 The journey figure I broke on the 18th

The Bornholm fix cut an overnight wait out of the card's figure and left the
writer's brief saying `DOOR TO DOOR: 10h 44min. It is the figure travelTime
takes`. A reader then gets 3h 33min on the card and "about 11 hours door to door"
in the paragraph, from one measurement, and both sentences were written by
following instructions. The block asks `journeyFigure` like everybody else now.

And the same run's step 30 told him `"11 hours" was not measured by anything in
this run` over a draft that had rounded the pipeline's own figure to the unit it
wrote it in. **A claim is allowed the resolution it was written at**: whole hours
may sit half an hour from a measurement, a half hour claim a quarter, and
anything written to the minute is still held to two.

---

## 2. THE TWO REVIEW PASSES

He asked for Fable, by name, so both ran on the Fable model as read-only
reviewers.

### 2.1 The intake report

Eight things I had spotted went in; it confirmed six, refuted two, and found the
mechanism behind the biggest one. Its refutations were right and worth keeping:

- **`stayWhen: null` with `ready: true` is not a bug.** The slot is conditional
  on a booked hotel and the readiness check filters conditional slots out. What
  makes it read like a contradiction is the REPORT, which prints the tier and
  the value with no applicability. An `applies` field would fix the reading.
- **"Local Assist" is not a pre-rebrand name.** It is the persona's current name
  on all three surfaces. What is real is that the first screen shows three names
  at once and the greeting is not in `uiLanguage.js`, so a Danish reader opens in
  English.

Its own finding I have not built: **the exported report cannot show the failures
that matter**. The per-turn prompt block is not recorded, so "YOU HAVE EVERYTHING
YOU NEED" over five unaccompanied children is invisible in the file; only the
chat-side brief is exported, not the guide's; and the timeline is off by one, so
the last row says the stay slot was declined while the brief says "not booked".
The app read it correctly and the report reproduces a reading from before the
direct-answer path existed.

### 2.2 The island runs

Twelve findings, none of them already on the fixed list, each with the run and
step quoted. **I built none of them tonight**, on purpose: they are pipeline
changes and the night was spent on what he had asked for and what a reader sees.
The three that matter most:

1. **`mayNotDecide` is ignored.** `priceSource` returns a near miss when the only
   page stating a figure is one the class gate refuses, and nothing in `App.jsx`
   reads it, so the refused page is recorded as the price source anyway. Today
   that means the right Fejø fare cited to the right page, from two errors
   cancelling. The moment anybody honours the refusal, every small-island fare
   loses its citation.
2. **The age gate reads a tariff's validity date as the page's age.** A fares
   page published in January is "about 8 months old" by September, so every
   island drafted after July demotes its own fare page. A validity date is the
   strongest evidence of currency there is and the gate treats it as the
   opposite.
3. **A road-measured travel time is "measured" in the log and unmeasured on the
   row.** `__journey` is only written for a transit itinerary, so the driving
   branch writes a figure with no record behind it, and three of seven islands
   shipped the model's own travel time with no log line at all, because the
   enforcement block is gated on a route existing.

The full list is in the session transcript. It also corrected one of my earlier
diagnoses: the "own sentence" absence flag fired only in the post-correction pass
on those runs, so it cost nothing, and Lyø's extra 190 seconds was the 13-claim
correction instead.

---

## 3. WHAT IS STILL OPEN

### His to decide

- **The Booking deep link.** It does not work, so every stay button will earn and
  land on Booking's front page, which makes a button labelled "Budget hotels in
  central Copenhagen" a promise the link does not keep. The options are asking CJ
  to enable deep linking, or choosing between a link that earns and a link that
  lands where the reader was promised. Using the bare aid is not one of them: the
  commission rides on a `cjevent` that only CJ's own redirect can write.
  **I did not put the wrapper behind a switch in the end** and should have; it is
  the first thing to do next session if he has not decided.
- **Whether an 11:00 departure keeps its date** as a half day. See 1.2.
- **Where a notice surfaces**, still. The bell is in; a front-page strip and a
  push notification are unanswered.

### Named follow-ups, in the order I would take them

1. **The event swap**, which is the half of the published-trips system he
   deferred: a finished event in a republished trip, swapped for a current one or
   for something Gemlyx suggests.
2. **`mayNotDecide`, then the validity-date age gate, then the road journey
   record.** Sections 2.2.1 to 2.2.3, in that order: the first is a live
   inconsistency, the second demotes the best page on every island, the third is
   why the arrival-point work can only ever help two of seven islands.
3. **`townPointFor("Copenhagne")`.** The typo that carded Copenhagen also leaves
   the trip with no anchor, so nothing measures a distance from where they start
   and the preview's reach bands collapse. `namedNearly` is the reader that
   already solves it.
4. **The chat report should carry what it cannot currently show.** The prompt
   block per turn, both briefs, the preview-side readings, and the timeline
   off-by-one. A report that cannot reveal a failure is its own finding.
5. **A stop named in the possessive gets no card.** "Roskilde has the Viking Ship
   Museum" cards Roskilde and "Roskildes Viking Ship Museum" does not, which is
   the Danish genitive `s` that `townInName` learned on 17 Sep and this reader
   has not.
6. **A deep link for either partner-ads banner.** Supported, guarded to the
   advertiser's own host, and unset.

---

## 4. HOW THIS SESSION WORKED

- Every change travelled with its assertions, in the same edit, and the suite and
  the build ran after each one. 231 new assertions.
- **Writing the assertion found the bug, twice.** The estimate counted a festival
  nobody could attend, and the stay trio turned out to have a variable that was
  computed and rendered nowhere. Neither was visible to a manual read.
- Work was committed to his disk in five batches through the night, each one
  staged back and byte-compared, so a laptop going to sleep could never cost more
  than the batch in flight.
- **A commit that reports success can still write stale bytes.** Re-sending a
  staged path after editing it in place wrote the old content and said "written".
  The byte-compare caught it. Fresh path per batch after that.
- Both review passes were read-only and neither touched the repo. Their
  refutations were as useful as their findings, and two of my eight intake
  items were wrong.

---
---

# Part two, 19 September 2026, later the same night

He was asleep for all of this. It continues straight on from the sections above
and changes two of their conclusions, which are marked where they appear.

**18,459 assertions pass, `tests/tdz.mjs` is clean and `vite build` is green.**
Up 229 from the 18,230 part one closed on. Everything is on his disk in five
more batches, each staged back and byte-compared.

## 5. WHAT HE SENT WHILE IT WAS RUNNING

Three messages, and the run log was the useful one.

### 5.1 "The Roskilde tickets are literally selling Roskilde Festival tickets"

He was right, and it is worse than a bad link. Read in his Chrome, the Buy
tickets button under the Roskilde line on `/guide/9vkdc564l13` resolved to

```
ticketmaster.dk/artist/roskilde-festival-/114563
```

with **80 kr** beside it, sourced to `roskildedomkirke.dk`. The stop is the
**town**. So a town, a cathedral's admission and a music festival were added up
into one charge on a family of seven's budget, and a reader who trusted it would
have arrived having bought the wrong thing entirely.

Every gate the costs list already has passed it. The URL really is a bookable
Ticketmaster page, the festival really is called Roskilde and really is in
Roskilde, the status really is on sale, and the 80 kr really was read off a named
page on a stamped date. **The question nothing asked is whether a town has a
door.**

`entryPrice.js` has held the answer since 6 September, in as many words: *"Every
check that reasons about 'the ticket price' belongs to this list and nothing
else."* The price hunt asks it. The affiliate sweep asks it. `costLedger.js`
reasons about the ticket price on every line and had never consulted it.

`stopHasADoor` now gates `entryLine`, and it is derived from `TYPES_WITH_A_DOOR`
through a table saying which pool each doored type merges into, because
`journeyScope.js` already paid for the hand-copied version of this list. The
suite asserts the table covers every entry, so a fourth doored type is a test
failure rather than a town selling tickets again. The row is copied out of his
own guide into the fixture with its real values, so if it ever comes back the
assertion names the guide to look at.

**The publish side was changed and then changed back**, and the reason is worth
keeping. `shapeForLive` stores a validated ticket link on any type, and adding
the door check there would have deleted the field from rows nobody has looked at
on their next redraft: `night` is on the no-door side of that list for the good
reason that a bar prices per pint, and a **music venue** published as `night`
does sell dated tickets. A stored link every render refuses costs
nothing and is recoverable. The asymmetry is asserted on purpose so the next
reader does not finish the job.

**One thing left for him:** `DetailPage` renders the 🎫 Book tickets button on
every content type, by a decision recorded on 23 August that predates
`TYPES_WITH_A_DOOR` moving into `entryPrice.js`. So the **town page** for
Roskilde still offers that button. Whether a town page may sell a city card is a
product call, not an engineering one, so it is here rather than decided.

### 5.2 The run log he sent: two findings caught, both discarded

He pasted the build log for that guide with one line under it: *"that is the
guide.. just so you know."* Two of the twenty-two steps found real defects and
the guide shipped with both.

**Step 22** read `MIXED LANGUAGE: mostly en, but 1 field read as another:
Hillerød`. The check ran, was right, and named the field. It was the only note in
the build whose finding **went nowhere**: every other one hands its list to
`planProblems` and this one ended at `used: !mix`. `planProblems.js` already
wrote down what that costs, about a different gate: *"a finding that is invisible
has cost the same to produce and is worth nothing."*

Making it visible was never going to be enough, because that panel only shows on
an **unsaved** guide and he saved this one. So it is **repaired**, on the
`titlePromises` pattern: rewrite the field into the majority language and accept
the rewrite **only if `languageOfProse` now reads it as that language**. Without
that condition a model replying with the same Danish sentence counts as a fix.

Repairing needed the field rather than the label, so `guideProseOf` now carries
a `path` beside every `where`: two stops can share a name and a label cannot
tell them apart. What the rewrite cannot move still goes to `planProblems`, which
is the line whose absence let the Danish field ship. A guide wrong more than six
fields deep is left alone and reported, because that is a different failure and
twenty rewrites at the end of a five minute build is a hang.

**Step 16** listed eighteen measured legs on a trip that has at most fifteen:

```
... 13min, 13min, 45min, 45min, 15min, 15min, 24min, 58min, 58min
```

Four adjacent pairs. `fetchExactDurations` stores a re-routed leg **twice**, once
under the mode it was measured in and once under the walking key it was requested
under, and the second write is load bearing because the render computes the
walking key. `legMinutesIn` counted **keys**. It now collapses a pair of ends
where one row is a provable alias, meaning its key says one mode and its answer
was measured in another, and **only** then: two honest keys over one pair are two
measured legs and merging them would hide a measurement to tidy up a miscount.

That list is the evidence under a finding that says a number in the guide matches
no measured leg, and it is the only part of that finding he can check. One that
says eighteen when fifteen legs were driven teaches him to distrust the finding
rather than the guide.

### 5.3 The 58 minute journey to a castle in the town they sleep in

Also on that guide, and the cause is one wrong premise carried by four modules.

`isSameTownWalk` has no distance test. Its own header says what it is for: *"the
distance-based short-leg rule in resolveLegMode needs COORDINATES, and when
neither stop resolves to a precise point..."* It was never meant to answer a leg
whose distance **is** known, and it did, because both call sites apply it after
`resolveLegMode` and it overrides whatever that decided. `resolveLegMode` is
distance aware and had correctly said transit for 13 km.

So the leg went to Google as a walk, Google answered in hours, the re-route
stored the transit figure under the **walking** key, and the render's 20 minute
walking cap waved it through because the stored mode was transit. Every step
after the override worked as designed.

The guard is that rule's own stated scope enforced: where a real distance exists
and it is past `WALK_MAX_KM`, the coordinates have answered and the town labels
do not get a vote. Both call sites now hand it a distance from `legDistanceKm`,
the same reader `resolveLegMode` uses, and the suite pins both, because the mode
**is** the cache key and a render that decides differently looks up a key the
build never wrote.

**16 STOPS against 15 pins is not a bug.** The count is every named stop; the
pins are placed stops with consecutive same-coordinate ones collapsed, then
clustered on screen, and the page already prints a note when the collapse fires.
One real bug came out of looking: `pinNumber` searched by **name**, so a place
visited on day 2 and again on day 6 gave day 6's card day 2's number. The dot was
in the right spot, which is why nobody saw it. It narrows by day now.

## 6. "IT SHOULD HAVE RECALCULATED THE TRIP"

> "the moment I said 'can I also go to Jutland?', it should have recalculated the
> trip and realised that there probably wasn't time for Northern Zealand. It
> should tell that to the user. And if the user then agree, then the AI should
> remove Northern Zealand from its route."

This is the biggest thing in part two and it is in `src/utils/tripScope.js`, new,
with 96 assertions.

**Why the question was invisible, and why that was right.** `regionsNamed` strips
question sentences, and it has to: section 1.1 above is the preview offering
Aalborg to somebody whose only mention of the north was a question. Asking about
a place is not asking to be taken there. So this file reads the half that one
throws away. Two readers, two jobs, and the distinction is the feature.

**Everything is measured.** A region's position is the mean of the centres of the
kommuner that define it, from `data/kommuner.js`, which is where `regions.js`
already gets its borders. The travel between two is `estimateMinutes` over
`kmBetween`, the app's one km-to-time reader, at the mode the traveller said.
A day of road is `EATS_THE_DAY_MINUTES`, which `routeOrder.js` already defends.

On his own conversation it answers: **Jutland in, North Zealand out, about 5
hours each way, 2 of his 7 days on the road, North Zealand 66 km off the route
once he is heading west.**

**Two wrong answers came out of running it, and neither was visible on the page.**

1. The first version measured the detour in whatever order the regions came out
   of the conversation, and offered up **Roskilde's** region, which is the one
   part of the trip that IS on the way west. Removing a waypoint from an
   arbitrary order measures the order. It goes through `routeOrder` now, which
   solves it exactly at this size, both times.
2. Measured between region **centroids** the two candidates were 32 km and 29 km
   apart. Naming one on three kilometres is a coin flip with a number printed
   beside it, and what it decides is which part of a family's week gets deleted.
   Measured over the towns they had named, Hillerød against Roskilde, it is 38
   against 25. So it reads **places**, and when the top two are still within 12
   km it **names both and refuses to pick**. Reporting a tie honestly is a
   feature.

**It does not claim the impossible.** Seven days can hold Copenhagen, Roskilde,
North Zealand and Jutland, if Jutland gets three of them. The first version asked
whether the region FITS, found that it did, and said nothing, which is the same
silence he complained about. The trigger is the **cost**.

**The chat half** is a rule in `briefConflicts.js`, because it is a conflict in
that file's own sense: two facts that are both true and no reader of one slot can
see it, exactly like eight children and a night out. So it is raised once,
recorded, and worded by the model, which is what keeps a Danish conversation in
Danish. The arithmetic is handed in as context rather than growing a geography
table in there.

**The act half** goes through `ruledOutFor`, which is why it is one line:
that list already feeds the plan prompt, the plan gate, the retry that rebuilds a
day, the audit on the finished guide and the swap gate on the page. A region
removed there is a region the plan never contains, in place of one deleted
afterwards leaving a hole in a day. It resolves to the **places** the
conversation named, because the matcher works on a stop's town or name and
because "I have taken out Hillerød and Helsingør" is an answer while "I have
taken out Nordsjælland" is a map reference.

**What was agreed is read off the reply that made the offer**, which now stamps
`scopeOffer` beside `asked`. Measuring it again at build time would be a second
answer to a settled question, and the plan has changed by then, so the two could
name different regions and he would find the wrong half of the trip missing. A
yes only counts as the **first** thing said after the offer: a traveller who said
no and carried on talking has still said no, and `agreesToDrop("yes but not
North Zealand")` returned **true** until the probe caught it. Reading the
function could not have found that.

**And "Jutland wasn't even included in the Guide"** gets its own check, because
the question was neither refused nor honoured and no step of a 22 step build said
so. `regionsAskedButAbsent` reports a region asked about with no stop in it, into
the log and into `planProblems`, excluding whatever he agreed to give up.

## 7. THE FIVE RUN-LOG FINDINGS, DONE

All five were located and confirmed by a read-only pass before anything was
changed. A sixth, "GetYourGuide fallback results labelled as vouched", **could
not be found** and is not fixed: no GetYourGuide path carries a vouched label.
The nearest real thing is the founder-source search, where a keyword-tail
fallback replaces the primary results under the identical heading "SOURCE THE
FOUNDER VOUCHES FOR". If that was what he saw, the fix is to head the fallback
differently or filter it through `mentionsThisPlace`, and it wants his log line
rather than a guess.

1. **The validity-date demotion.** The Fejø line read `lollandfaergefart.lolland.dk
   (its newest date is about 8 months old) kept as background only`. Eight and a
   half months back is 1 January 2026, which is the shape of a Danish fare page's
   own opening line, *"Priser gældende fra 1. januar 2026"*. **The page that
   states the fare was demoted for saying which year the fare is for**, and
   demoted it cannot carry the citation, so the price trace falls to the
   best-ranked page that merely contains the number: a receipt for the wrong
   page. The fix is not to ignore the date, because a 2019 validity start really
   is evidence the fares are from 2019. It is that a **validity period is a span,
   not a point**: `validityWindow` reads it, a window still open inside 18 months
   passes, and a window that has **closed** now fails with the strongest reason
   available, which nothing could express before. A 2019 start still ages the
   page by the ordinary rule.
2. **No `__journey` for a road-measured time.** `journeyParts` returns null with
   no transit steps, which is five of the seven island runs, so on exactly the
   rows where the road is the only way there a real Directions answer was written
   as "3h 20min 🚗" with no record. Everything that defines measured by the record
   then treated the one measured number on the card as prose: the provenance
   panel listed it under NO RECORDED SOURCE, `keepMeasured` would not restore it,
   and the fact-check paste called it a claim. It is recorded now, as a journey
   with no legs, so nothing renders a card off it.
3. **The unreachable "written, not measured" note.** Its rule text reads *"Neither
   mode returned a usable duration"* and it could not see that case: to reach it,
   driving had to be truthy, and driving is only truthy when the reply carried a
   duration. So it fired on a rounding to zero, and when Google returned nothing
   by either mode the whole block was skipped and the model's figure reached the
   row unmarked. It is the `else` of the outer condition now, where the sentence
   belonged.
4. **The second island arrival lookup.** The gate that skips this for an island is
   about the **coordinate**, not about which call makes it, and Google's own
   address for a business on Langeland is no better a place to search a radius
   from. The Langeland row came out of that run naming a residential street as
   the arrival point, which went into the frozen facts as somewhere *"verified to
   be walkable from here"*. One gate, asked twice.
5. **"No page states a price" where nothing looked.** With no door,
   `findTicketPrice` is never called, so the log printed *"no page we read states
   a ticket price, which is a real answer and not a failure"* over an island, a
   town, a restaurant and a bar, twice per run. `runLog.js` states the rule in
   its own words and it was written about this very step: a step that did not run
   is not a step that found nothing. It reports `skipped` with a reason.

## 8. THE BOOKING DEEP LINK: I TURNED IT OFF

**This reverses section 3.** Part one says *"I did not put the wrapper behind a
switch in the end and should have."* It is behind one now, and the switch is
**off**: `BOOKING_CJ_DEEP_LINKS_WORK = false` in `config.js`.

Two records say the deep link does not work: his own *"Doesn't work.. let's fix
it later"*, and section 3 above. I could not test it from here, because
kqzyfj.com refuses automated readers in `robots.txt`, and routing around a robots
file to generate a click on his affiliate account while he is asleep is not a
thing to do.

So the call was made on the asymmetry rather than on the evidence being complete.
**False** costs the Booking commission until one word changes. **True** costs
every stay button on every published guide, silently, to people planning a
holiday: a button reading "Budget hotels in Indre By" that arrives at a front
page is the broken promise `costLedger.js` refuses in capitals. The second is
worse and the first is reversible in four seconds.

Nothing else is lost. `bookingUrl` already refuses to write an `aid` while a CJ
link is set, so the click through kqzyfj.com was the only thing in the chain that
could ever pay. `bookingEarns` reads the same constant, so while the links are
unpaid **the disclosures say so** rather than claiming a commission that cannot
be earned.

**To turn it back on**, paste this into a browser:

```
https://www.kqzyfj.com/click-101858166-13375717?sid=stay&url=https%3A%2F%2Fwww.booking.com%2Fsearchresults.html%3Fss%3DAarhus%252C%2520Denmark
```

- Booking's **Aarhus results** → set it `true`, every stay button earns from the
  next deploy.
- Booking's **front page** → leave it, and ask CJ whether this advertiser allows
  deep linking at all.

The wrapper's logic is all still tested: `bookingCjUrl` takes the flag rather
than reading it, so the sid derivation, the destination surviving on `url`, the
host guard and the refusal to nest are asserted with it forced true. Flipping it
back is one word and nothing has to be rediscovered. Four assertions about the
unpaid state will fail when he does, which is right: it is a deliberate act and
they should notice.

## 9. WHAT IS STILL OPEN AFTER THIS

**His, and they are decisions rather than work:**

1. **The Booking deep link test above.** Four seconds, and it decides whether
   stays earn.
2. **Whether a town page may offer 🎫 Book tickets.** `DetailPage` shows it on
   every type. Roskilde's town page still offers festival tickets.
3. Everything in section 3 that is not the deep link: the 11:00 departure, and
   where a notice surfaces.

**Work, in the order I would take it:**

1. **The event swap**, still the deferred half of the published-trips system.
2. **`mayNotDecide`**, which is the last of the island-run items and a live
   inconsistency.
3. **`townPointFor("Copenhagne")`.** Unchanged from section 3: the typo that
   carded Copenhagen also leaves the trip with no anchor, and `namedNearly` is
   the reader that already solves it. This one now matters more, because
   `tripScope` measures from an anchor too.
4. **The GetYourGuide log line**, if he still has it. See section 7.
5. The rest of section 3's list, unchanged.

## 10. HOW PART TWO WENT

- **Running the function found the bug, three times, where reading it could not.**
  The detour picked the wrong region; the margin between the top two was three
  kilometres; and `agreesToDrop("yes but not North Zealand")` returned true.
  All three would have shipped as reasonable-looking code.
- **The suite's own checks caught two of my mistakes.** The unused-export check
  refused `tripScope` until it was wired, and the identifier check refused a
  binding I read from outside its block. Both were mine, in this session.
- **A read-only pass refuted my own hypothesis with a harness.** I thought the
  duplicate leg times were a cache key collision. They are alias keys, and the
  collision it does have can only ever remove entries, never add them. The
  refutation was worth more than a confirmation.
- Five batches to his disk, each staged back and byte-compared, nine files in all.
- 229 new assertions. Suite 18,459, `tdz` clean, build green.
