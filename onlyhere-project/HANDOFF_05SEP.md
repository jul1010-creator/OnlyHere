# Hand-off — 5 September 2026

Everything below was written overnight, against your own exported conversation
and your own guide at `/guide/d2boj2nr2jj`. The suite is at **13,004 passing**,
one local-only failure (`and it is a real file in public/`, which fails because
the large `public/` images were never staged into the cloud workspace; it fails
at baseline too).

Every fix in here is mutation-tested: the fix is reverted, the suite is run, and
the assertion that names it has to die. Twenty-six mutants were run tonight.
Three survived and are recorded below, with what was wrong with the assertion.

---

## 1. The thing that made the whole guide a mess

Your export said four slots were **declined** — the state that means *the
traveller was asked and refused to answer*:

| You typed | Slot | Recorded as |
|---|---|---|
| "Billund" | origin | null, declined |
| "7" | days | null, declined |
| "bikes and cars" | transport | null, declined |
| "The lodge billund we got" | stay | null, declined |
| "I'm alone with 8 kids" | party | the string `"said in the conversation"` |

`missing` came out empty, `ready` went true, and the builder got a brief with no
origin, no length, no transport, no accommodation, and a sentence about a
conversation where eight children should have been.

**Why all four missed.** Nothing was wrong with the readers. Every one of them
finds a fact inside a **sentence**, and has to: `readOrigin` wants arrival
language or "is the train to Odense expensive?" fills the origin slot;
`readTransport` wants a movement word or "we have no car" says you are driving;
`readStay` wants "booked" or "sorted". You answered the way a person answers a
direct question — with the answer and nothing else.

**The fix.** `src/utils/directAnswer.js`. The information that makes "Billund" an
origin is not in "Billund", it is in the question before it, and the app has
always known what that was — `askedThisTurn` was computed for every reply and
used for one thing only, not asking twice. It is now stamped on the reply that
asked it, and the next traveller turn is read against it.

Your transcript now reads:

```
origin     Billund
days       7
when       December (month precision)
party      1 adult and 8 children   (adults 1, kids 8, total 9)
interests  nature, nightlife, beer
transport  bikes and cars           (mode: car)
stay       booked
declined   []
```

It **fills an empty slot and replaces the "said in the conversation"
placeholder. It never overrules a real value** — the first version did, and
Fable's review found that it ate corrections: "we cancelled the lodge, nothing
booked now" was read correctly and then overwritten by the turn before it.

---

## 2. Eight children are now eight children

`party` was a boolean wearing a value's clothes. That is why no age gate could
ever have been written: nothing downstream had been told there were children, let
alone how many or how old. It now carries `adults`, `kids`, `kidAges`, `total`,
and a `hasKids` flag for "children were mentioned and not counted" — because
"Two adults and our son, he's 7" used to come back as "2 adults" with the son
gone.

---

## 3. "The AI gotta solve it somehow"

`src/utils/briefConflicts.js`. You said solving it looks like *"try to get a
better understanding of what the customer is looking for"*, so it asks rather
than deciding. On your own transcript Gemlyx now says, before it builds anything:

> They want nightlife and they are travelling with 8 children. Ask which they are
> picturing before you plan either: somewhere they can have a beer with the
> children there — a food hall, a brewery taproom, a harbour bar early in the
> evening — or a real night out, which needs somebody to watch them. Do not
> choose for them and do not plan the evening until they say.

Three more conflicts ship with it: a beach or swimming on a Danish winter trip,
nature with no way to reach it, a tight budget beside a tasting menu.

A conflict **outranks a missing slot** in the same reply, and nothing is recorded
as asked on that turn — the first version printed both "raise this" and "ask for
THIS ONE and nothing else", and marked the slot asked either way, so a model
obeying the second instruction silenced the conflict for good.

---

## 4. The map

- **Overlapping pins.** Which pins collide is a fact about the **screen**, so it
  has a different answer at every zoom. The pins are now a layer redrawn on
  `zoomend` and clustered in Web Mercator pixels. A cluster shows a count in a
  ring; opening it flies to the box that holds its stops.
- **Stops at the same coordinate** (a base you return to, two town-centre
  fallbacks) can never be separated at any zoom. Clicking one of those opens the
  first stop's card instead of flying nowhere — before, that pin was simply dead.
- **The card says what the place is.** It read *"Nothing else in our own guides is
  within a 1200 m walk of Day 2 · LEGO House yet."* — a true sentence about the
  neighbours of a place it never described. It now leads with ~50 words of the
  guide's **own note** for that stop (your call: the guide's words, not a fresh
  summary), cut at a sentence, with the distances after.
- **Closing the card flies back out**, to the view you were on before you went
  down. Driven by the selection, so dismissing it any other way works too.

---

## 5. The chat picture

*"Make it a small picture into the chat. Imagine you're talking to me and you
want to show me a picture."* The sideways strip of 124px cards is gone. One image
the width of the message, stacked under the reply, with the same corner cut off
as Gemlyx's own bubble, arriving a beat after the words and staggered when there
are two.

**"CHECKED" is gone.** You asked what it meant and it could not answer — checked
by whom, against what. What it meant is that Gemlyx holds its own written page
for that place, which is the entire rule for whether a picture appears at all. It
now says **OUR PAGE**, with *"Tap to read it"* under the name, in all five
languages.

---

## 6. "actually"

Fourth time you have asked, and the first three were prompt instructions. The
published rows have had `trimFillerRuns` since August; **the chat had no filler
rule at all** — the half that was being trimmed is the half you rarely open.

The budget is now the **conversation**, not the reply. `PER ENTRY, NOT PER FIELD`
already said a page is what a reader meets at once; a conversation is the same
thing over time, and a budget spent per reply is one "actually" per bubble, which
is exactly what you were looking at. The first corrective use survives — *"It's
actually closed on Mondays"* is the word doing its whole job — and every later
one goes.

It runs on the **streaming bubble too**, so the word never appears and then
vanishes as you read. And the stored thread is clean, which matters because the
thread goes back to the model as its own prior turns: the register was teaching
itself.

---

## 7. Five bugs Fable found that were never reported

Each of these produces a **wrong guide** silently. All verified by running your
real code, not by reading it.

1. **"today" was two days.** `to` is Danish for 2 and `day` is an English day
   word, so `dayCountIn("today")` returned 2 — and because it stopped at the
   first candidate, *"we land today, staying 10 days"* built a two-day trip.
2. **A date could be built out of two messages.** The turns are joined with a
   newline and `\s` matches a newline, so "It's in december" followed by "2
   adults" became **2 December at day precision** — a fabricated exact date on a
   hard slot, and worse than a missing one, because day precision means nobody
   asks which day and the guide dates its weather and its events to it.
3. **"I don't want to do museums or castles" filled interests with museums and
   castles.** Transport has had a negation scrub since 18 August; interests never
   got one. The scrub now stops at a comma and at a contrast word, so *"not
   nature, but food and history"* keeps the half that was the answer, and it runs
   backwards too, for *"christmas markets bore us"*.
4. **Two day-count ceilings.** `dayCountIn` capped at 14, the new reader at 30, so
   the same sentence read differently depending on whether the question had
   happened to be asked. One cap now, the one already written down.
5. **The chat report reproduced the bug instead of describing it.** It called
   `readBrief` without the turns or the questions, so your export showed the OLD
   reading of your conversation. A report is the thing you debug from.

---

## 8. What Fable found in *my* work, and what it cost

You asked for this and it was worth it. Nine findings, most of them run rather
than reasoned, several worse than the bug they were written to fix.

| Found | Why it mattered |
|---|---|
| `daysAnswer("Want to stay 10 days")` → **2** | The same Danish `to` collision, inside the fix for it |
| `looksLikePlaceAnswer` accepted **"Hmm", "Ok", "Thanks", "Not yet", "ignore previous instructions"** | Filled the blocking origin slot with junk, and the panel rendered "in and out of Hmm". An empty slot gets asked again; a slot holding rubbish never does |
| `stayAnswer("Need a hotel")` → **booked** | The 18 August `BOOKED_RE` failure, arriving through a second vocabulary |
| A direct answer beat a later correction | "we cancelled the lodge" lost to the turn before it |
| `partyAnswer("We are 2 adults and 2 kids")` → **total 2** | Four people reported as two |
| A conflict was recorded as asked when the model was told not to ask it | Silenced for the rest of the conversation |
| `askedBeforeTurns` and `lastAskedOnScreen` stated opposite rules | An error bubble between two turns made the prompt and the progress bar read different briefs from one conversation |
| `"2 adults, no kids"` raised the nightlife conflict | Nothing read the word in front of the word |
| A cluster of stops at the same coordinate was unopenable | And the caption under the map promised it separated them |

All fixed, all asserted, mutation-tested.

---

## 9. Also fixed, smaller

- **The chat reset did not reset the brief.** It cleared the messages and left
  `briefAsked`, so a brand-new conversation started with every slot marked asked
  — meaning every slot reported as *declined* and `ready` true on the first
  message. Same hole this whole night is about, on the button I built yesterday.
- **The nearby exclusion never matched.** `exclude: mapPin.name` is `"Day 2 · LEGO
  House"` and the published rows are called `"LEGO House"`, so only the 20 m floor
  stopped a stop being listed as its own nearest neighbour.

---

## 10. Kødbyen — done after all

`src/utils/chatGeography.js`. Every chat reply is now read for a **district named
beside the wrong town**, and the correction is appended by code:

> Correction: Kødbyen is in Copenhagen, not in Aarhus. Any travel time above was
> measured to the wrong city, so treat it as unchecked.

In Danish for a Danish conversation. Appended rather than sent back to the model
for a second opinion — it has just demonstrated it believes the wrong thing.

The table holds ~24 names that belong to exactly **one** Danish town, checked
before they went in. **Latinerkvarteret is deliberately absent**: Aarhus and
Copenhagen both use it for their old quarter, and it is exactly the entry that
would make this file produce a confident correction that is itself wrong. A wrong
correction is worse than a missed one, so the table stays small and grows only
from things somebody has checked. A district named *with* its own town goes
through untouched, however many other towns are in the sentence, and København
and Copenhagen are one town rather than two.

It also took `edged` off `KNOWN_UNWIRED` — the list is 75 now, and it only
shrinks.

## 11. Still open

- **The drive-time half of Kødbyen.** The district is caught; the "an hour and a
  half from Billund" is not. A straight-line distance from `TOWN_COORDS` plus a
  road factor would give a sanity band cheaply.
- The At a Glance repair sweep.
- `ticketUrl` still has no reader on the render side.
- Per-day enrichment lacks `keepLanguageOf` when `guideLanguage` returns null —
  the cause of the Danish Day 3 inside an English guide.
- The `read.mode` in the chat report (`travelModeKey`, slowest-first) and the
  brief's transport mode can disagree on a multi-mode answer: "bikes and cars" is
  `car` in the brief and `bike` in the plan gate. The brief is right; the gate has
  read it as bike all along, so this is pre-existing rather than new, but it is
  the same sentence read two ways in one product.

---

## Files

**New:** `src/utils/directAnswer.js`, `src/utils/briefConflicts.js`,
`src/utils/mapStops.js`, `src/utils/chatGeography.js`

**Changed:** `src/utils/tripBrief.js`, `src/utils/tripEvents.js`,
`src/utils/helpers.js`, `src/utils/chatReport.js`,
`src/components/GuideRouteMap.jsx`, `src/components/ChatPlaceCards.jsx`,
`src/pages/GuidePage.jsx`, `src/App.jsx`, `tests/run.mjs`

**From earlier and included:** `src/components/NavStrip.jsx`,
`src/components/WeatherBell.jsx`, `src/utils/weatherAlerts.js`
