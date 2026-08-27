# HANDOFF — night of 26 August 2026

Suite **11,257 passed / 0 failed**. Build clean. tdz clean.
Five source files changed, all written to your machine.

You pushed before you went to bed and said: *"you can check through the page
if you find more things that need correction."* So this is mostly a report of
what the live site actually says, and four fixes that came out of reading it.

---

## 1. The deploy landed, and the three new surfaces work on an OLD guide

Checked on `/guide/q3xuswczshx`, which was BUILT by the old pipeline and
RENDERED by the new one — the harder of the two cases:

| surface | live result |
|---|---|
| **What you pay** | renders, on a guide that predates the feature |
| **Booking link** | `Hotel Phønix, central Aalborg, Denmark` — the town is there |
| **Read more** | one on the whole page, down from a screen full |

The guide's own prose is still half Danish. That is the T3 bug and it is fixed
in code, not in that row: the guide was WRITTEN before the fix. Any guide built
from now on is in one language.

---

## 2. "Rejseplanen" was the heading on a list of things you pay for

Reading the cost block on that guide, the second line was headed

> **Rejseplanen**
> The crossing on day 4. Book the boat, not just the bed…

Under a heading that says WHAT YOU PAY, the bold word reads as the payee, and
nobody pays Rejseplanen anything — it is a free national search. The LINK is
right and operators.js explains at length why a crossing goes there rather than
to a named ferry company (Samsø alone is served by two companies from opposite
sides of the country). The heading was the bug.

- the ferry line is now headed **"The ferry on day 4"**
- the third public-transport line is **"Local buses and regional trains"**
- DSB and FlixBus keep their names, because those two really are who the money
  goes to, and you asked for them by name on 9 August

The test that pinned this was `is(names, ["DSB", "FlixBus", "Rejseplanen"])` —
a shape pin. It is now a rule: *no line on a list of what you pay for is headed
by a free journey planner*, checked against a small list of planner names. Five
mutants, all dead by name.

---

## 3. "⛴ Ferry Terminal: Randers Busterminal"

Live on the Museum Østjylland page. Randers sits 25 km up a fjord and its
busterminal is a bus station. `arrivalRow` matched the bare word **terminal**
inside the Danish compound *busterminal* and drew a boat over it.

This is the same bug as *lufthavn* being read as a harbour in August, and it
takes the same fix: **the word that decides has to be the word that means it.**
A terminal on its own names no mode at all — airports, coaches and boats all
have them — so it only counts as a quay when nothing else says otherwise.

`geo.js kindFromName` reads `arrivalRow`, so it corrected itself.

---

## 4. Every transit time was asked about 09:00

You said, about Lindholm: *"the time shown is quite off."* It was.

`transitDepartureAnchor` set the hour to 9 for every leg of every itinerary,
including the ones the plan puts at half past seven in the evening. Nine is the
morning peak — the most flattering hour in the timetable — so this was never a
random error. It was an optimistic one, every single time. In Denmark that gap
is the whole answer: a route running four times an hour at nine runs hourly
after seven, and some connections simply stop existing at night.

Each leg now carries the clock time of the stop whose day it belongs to:

- **inside a day** — the origin's `arrivalTime`, because that is where they are
  standing when they set off
- **overnight** — the destination's, because they slept in between, so the
  origin's time is yesterday evening

Parsed, never trusted: `arrivalTime` is model-written free text, so `~14:25`
and `09.45` both read, and `"late morning"` leaves the anchor exactly where it
was. A misparsed 1 a.m. would be worse than the old default.

---

## 5. The false-friend audit: all 138 published pages

The one I most wanted to do, because Museum Østjylland reached your friend's
eyes before ours. Every published URL in the sitemap, read as rendered:

**104 entries + 34 towns = 138 pages. Two flagged. One real.**

### The real one — Museum Østjylland

Says **"Middle Age Man"**, twice. I went and checked the museum. The exhibition
is called **"Middelalderens Mennesker"** — *the people of the Middle Ages* — and
the museum publishes no English name for it. So the entry is wrong twice over:
*middelalder* is medieval, and *mennesker* is people, not a man.

The contents match exactly what our entry describes (monk robes, knight's
weapons, the shoemaker's family), so it is definitely that exhibition.

**The correction, for Studio:** the name goes back to the Danish exactly as the
museum writes it, because that is what is on the sign the traveller is standing
in front of — `Middelalderens Mennesker`, with the English in brackets if it
helps. That is `NAME_RULE`, already in the file and already in the extract
prompt; this row simply predates it.

I cannot write that row from here. It needs you in Studio.

### The false one — Folketinget

> *"school classes and larger groups can wait five to six months for a slot"*

Correct English, commonest sense of the word, and my rule fired on it. On a site
whose entries are largely about BOOKING things, that rule was going to keep
finding tour bookings forever. A checker that cries wolf gets switched off the
same way one that blocks does, only more slowly.

`slot` now asks for what would be true of a mistranslated castle: it is a
BUILDING, so either it is doing something a building does (*the slot is open
every day*, *the slot dates from 1560*) or somebody is standing at it (*the
courtyard at the slot*). The three real shapes still fire.

### And two clean negatives worth having

- **No untranslated entry.** Danish function-word counts across all 138 pages
  sit in a tight 12–17 band — that is the shared chrome, and nothing stands out
  above it. If a Danish paragraph had leaked into an English entry it would
  show as an outlier. None did.
- **No empty or broken entry page.** Every page rendered between 16k and 19k
  characters of text. No stub, no blank, no failed lookup.

**What this does not prove:** the detector knows fourteen patterns. Fourteen
patterns finding one fault is not the same as there being one fault. It is a
floor, not a ceiling — the honest reading is "no *known* false friend anywhere
else on the site", and the next one we learn about will want the same sweep.

---

## 6. An eighth private copy of the ferry vocabulary

`journey.js` had its own list of ferry words for the vehicle check, and like the
seven before it, it was missing **boat** — the exact word whose absence once
made the trip summary announce a crossing that the book-before-you-go list left
out, from two reads of the same field 34 lines apart. It now reads `FERRY_TEXT`.

It failed silently, which is why nobody saw it: a missing word there produces no
false accusation, only a check that never fires. A draft calling a measured
train "the boat 950R" went through clean.

**And I got the test wrong first.** My first three assertions read "boat"
against a leg Google had measured AS a ferry — both patterns answer that
identically, zero either way, so the mutant that put the private copy back
survived all three. They were pinning nothing. The assertion that separates them
is a draft calling a *train* a boat, which is a missed catch under the old
pattern and a finding under the new one. Rewritten; mutant now dies three times
by name.

---

## Still open

- **Museum Østjylland's row** — needs you in Studio (§5).
- **Roskilde is correct live.** The entry reads 26 Jun 2027 – 3 Jul 2027,
  matching roskilde-festival.dk. Your correction landed.
- **The operator-date rule is still half-implemented.** Discarding a date
  finding when `dc.confirmed` is done; there is still no publish-blocking
  mechanism, so "blocking" would mean raising a `STOP, DO NOT PUBLISH`
  uncertainty rather than building a new gate. Your call which.
- Rejseplanen deep-link using measured Google stop names.
- `BOOKING_AFFILIATE_ID` still empty — about 10 unwrapped links per guide.
- `SUPPORT_TABLE.sql`, and possibly `gemlyx_user_data`, not created in Supabase.
- `evidence.js` still has no callers.
