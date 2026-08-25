# Making the live layer tell the truth

25 August 2026. Oliver, on ChatGPT's fifteen suggestions: *"we need to expand on
how we can make sure the constant render is functioning."*

Right question. Here is why it is the right question, and then the rules.

---

## Why this is the most dangerous thing you have built

**Every failure mode of a live layer is silent.** Not one of them throws.

    "Ferry verified"          nothing verified it
    "Updated 3h ago"          the fetch failed and it is three weeks
    "No disruptions"          the disruption check errored and returned []
    "Nothing needs booking"   the booking list did not load
    Today's plan              is yesterday's plan

Each of those renders cleanly, looks correct, and is a lie. And a freshness badge
is not decoration, **it is a promise**: a reader who sees "checked today" stops
checking. That promise is the one thing this product cannot afford to break,
because the entire position is that uncertainty gets displayed rather than
hidden.

**This codebase has been bitten by exactly this four times in three weeks**, and
all four looked like working features:

| | |
| --- | --- |
| `api/update-events-check.js` | checked **zero** events from 5 to 12 August and returned a clean 200 every time |
| `aiDisclosure` | six translations, and every reader in every language got the English one |
| the photo probe | ran once at publish, so a file added later changed nothing |
| the tier gate | offered four words and refused two of them |

So the design rule for the whole live layer is one sentence: **make every silence
loud.**

And of ChatGPT's fifteen suggestions, **number 6 is the one that can hurt
somebody.** "Little understated indicators: opening hours checked today." It is
right that reliability should be visible. It is also the single feature where a
silent failure stops being embarrassing and starts being a promise you broke to
a traveller standing at a locked door. Build it last, and build it under these
rules.

---

## The seven rules

### 1. A freshness claim renders from a record, or it does not render

No badge from "we ran some code". A badge comes from a stored
`{ checkedAt, outcome, source }` and nothing else. **No record, no badge**, and
the absence is correct rather than a gap to be filled.

This is a rule you already keep in three places: `tierLabel` returns null rather
than an invented rank, `isBookableTicketUrl` returns null rather than a plausible
link, and an empty `__priceSource` means "we cannot show you where this came
from", which is true, where a wrong one means "here is where it came from", which
is not.

### 2. Three states, never two

    checked, and current       show it, with when
    checked, and it FAILED     say so: "could not reach the ferry operator, 08:14"
    never checked              show nothing at all

**The dangerous collapse is failed into absent**, because absent reads as fine.
An operator site that times out must not produce the same screen as an operator
site nobody asked.

You already have this shape twice: `offerView` returns three states and an ended
offer renders nothing rather than something apologetic, and `pageReadVerdict`
separates "read it" from "could not read it" from "not worth reading".

### 3. The label is computed from `now`. It is never stored

Store the instant. Compute "3h ago" at render, every time.

**A stored "3h ago" is a lie with a delay fuse**: correct when written, wrong an
hour later, and nothing in the system knows it turned. Same class as the
festival date that was right on the day it was drafted.

### 4. Freshness has a half-life, and it is different per field

A ferry departure is stale in hours. Opening hours in days. A coordinate never.
One "updated" timestamp across all of them is either alarmist about the
coordinate or negligent about the ferry.

**`PERISHABLE_FIELD_TOPIC` in `utils/evidence.js` is already this vocabulary**,
mapping each field onto a topic `pageScan` names: price, booking, date, opening
hours, transport, existence. Give each topic a half-life, and past it the badge
**downgrades itself with no re-render and nobody's help**, because it is computed
from `now` under rule 3.

That is also `evidence.js`'s second real caller, which it needed.

### 5. "Nothing changed" and "nothing was checked" may never look the same

Every check reports **how many items it examined**, not only what it found. Zero
examined is an alarm, not a pass.

This is the `update-events-check` lesson stated as a rule. That endpoint spent a
week reporting no changes because its input array was empty, and "no changes
found" was indistinguishable from "nothing was looked at". One counter in the
response would have caught it on day one.

Applied to the traveller: a Today screen saying "no disruptions" must mean a
check ran and found none. If no check ran, it says **"not checked since
Tuesday"**, which is a different sentence and an honest one.

### 6. Offline leads with its own age

A cache is a freshness-lie generator. On Ærø with one bar, the danger is not an
empty screen, it is a full one that looks current.

So the offline view **opens with when it was captured** and then shows the plan.
"As of Tuesday 19:40. No signal since." Not a spinner, not a blank, and never the
plan alone.

### 7. Assert the render, not the function

The Article 50 lesson, and it is the one that matters most here. Three assertions
covered that disclosure and all three were true: the table had six entries, all
three surfaces called the function, an unknown language fell back to English.
**None of them asked what a reader sees**, so all three stayed green through a
feature that did not work at all.

A live layer cannot be unit tested into correctness, because its failures are
wiring failures. The assertions have to **move a stub clock and require the
labels to change**:

* at T+0 the badge reads "checked just now"
* at T+4h it reads differently
* past the topic's half-life it has downgraded itself
* with the record deleted, nothing renders
* with the check having failed, the failure sentence renders and the tick does not
* with zero items examined, the run is reported as an alarm

Six assertions, and every one of them is about what is on the screen.

---

## And a heartbeat, because rule 5 applies to the checker itself

If the pre-departure check has not run in three days, the guide says so. It does
not assume it ran.

The thing that watches the trip needs something watching it, or you have built a
smoke alarm with no battery test: silent, reassuring, and indistinguishable from
one that works.

---

## What to build first

1. **The record.** `{ checkedAt, outcome, source }` per field, per stop, on a
   saved guide. Everything else is a render of this, and without it every later
   feature has to invent its own.
2. **Half-lives on the six perishable topics.** One table, in `evidence.js`,
   beside the map that already exists.
3. **The diff.** What changed since you saved it, computed over measured and
   perishable fields only, never prose.
4. **Today.** Which is then mostly assembly: `tripDayDate`, `dayWeather`,
   `stopEventWhen`, ticket status, `nearbyPublished`, the offer fields, the
   coordinates.
5. **The badges, last.** They are the promise, and they should be the last thing
   that ships, after the six render assertions above are green.

## The sentence to build against

> A freshness claim is a claim about time. It carries its own timestamp, it
> carries its own failure state, and its words are computed from now rather than
> remembered.

Everything above is that sentence applied six ways.
