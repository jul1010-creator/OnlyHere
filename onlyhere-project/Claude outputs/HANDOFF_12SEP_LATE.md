# Gemlyx, 12 Sep 2026, evening

You sent me the 12 Sep night handoff, the 00:36 chat report, a screenshot of the
live site, the "one more thing" complaint, and then the 18:22 report and the
preview screenshot. All of it turned out to be three bugs wearing six faces.

Everything below is ON YOUR PC, suite green in both timezones, build clean.
**15,647 → 15,733 passing.** Eleven files: nine in `src/utils/`, plus `App.jsx`
and `tests/run.mjs`.

---

## The one worth reading first

You said the map "fails to delete markers when you say things like 'I'm not
going to Aarhus' or 'I don't want to go to Aarhus'." Measured on the shipped
code, before touching anything:

| what you type | what the app read |
|---|---|
| `I don't want to go to Aarhus` | refusal, pin removed |
| `I don't want to go to Aarhus` | **nothing at all**, pin stayed |

Those two strings differ by one character. The second has U+2019, the curly
apostrophe every iPhone, every Android keyboard and Word substitutes as you
type. This codebase has never once spelled it: `previewMatch.js` holds 75
straight apostrophes and no curly one, `beenThere.js` 11 and none. So every
`don't`, `won't`, `isn't` and `I've` in every pattern that reads what a traveller
wrote has been unreachable from a phone since the day it was written, and a
phone is not a minority case.

Fixed by normalising at each reader's door — one call, in `straighten` — rather
than spelling both apostrophes in seventy-five patterns, which is the
hand-copied list this repo has paid for four times. The guard in the suite is
behavioural: the curly sentence must read the same as the straight one.

---

## 1. "I'm not going to Aarhus"

The plainest sentence in the complaint, and **neither** reader of "did they rule
this out" could see it. `exclusions.js` wants a "don't", a skip verb, a bare
"no" at a sentence start, or a capital directly after "not" — "not going" is
lowercase. `previewMatch.js` wants the refusal hard against the name, and
"going" is in the way.

The pin was not merely kept. It was **added by the sentence refusing it**,
because the map pins from your turns as well as Gemlyx's.

Also now read: `take Aarhus off`, `Aarhus is out`, `remove Aarhus`,
`don't include Aarhus`.

**And the one from your 18:22 chat.** You wrote "I don't rally want to go to
Aarhus actually.. I want to go to Aalborg" and Aarhus stayed. The typo is not
the reason — `I don't really want to go to Aarhus`, spelled correctly, missed
too. The pattern allows three words between the "don't" and the "to", and
"really want to go" is four. An intensifier was spending the whole budget; it is
now removed before matching, and only where it sits directly after a negation.

**What deliberately still does NOT rule a place out**, because a false exclusion
is worse than a missed one and every one of these was found by testing:

* "I'm not going to Copenhagen first" — order of events, not a refusal.
* "We're not flying into Billund, we're driving" — a mode of transport says HOW.
  My first version ruled out the airport he was landing at.
* "Take Mum out for dinner in Copenhagen" — the two name-first shapes now check
  the gazetteer, so a person is never mistaken for a town.
* "And Skagen is out" used to rule out "And Skagen", and the note under it read
  "Leaving out And Skagen, as you asked."

---

## 2. The same question, four times, word for word

Your 00:36 transcript, four replies in a row, each closing:

> One thing first, and then I can build it: Which dates? Even roughly is fine,
> it decides which events are on while you are here.

Identical, four times, ending in "for fuck sakes mate". **You had answered every
time.** Turn 4 was "I'm flying into Denmark in 2 days" — a date, carrying its own
number, in a sentence that says it is about flying somewhere.

The reader rejected it. Take out "in 2 days" and what is left is "i m flying into
denmark", and the test is "is there anything here that is not an answer". "into"
and "denmark" are not on the stoplist — and the destination never can be, because
it is a different word every time.

So the residue is now allowed exactly one kind of unknown word: **a proper
noun**, capitalised, and not at the start of a sentence, where the capital is
grammar rather than meaning. That accepts "flying into Denmark" and still
rejects "Talk tomorrow!".

Three smaller ones fell out of measuring it:

* **"I said in 2 days!!!"** — the turn you type when you are asked a third time —
  read as nothing, because "said" was not on the list.
* **"I'm coming today"** and "coming today" disagreed. The split breaks "I'm"
  into `["i","m"]`, and the orphaned "m" failed every sentence with a
  contraction in it.
* **"we land tomorrow"** read as nothing while "I arrive tomorrow" worked:
  `arrive` had been hand-added to a stoplist and `land` and `come` had not.
  There is now an `ARRIVAL_VERBS` list beside `TRAVEL_VERBS`, which only ever
  held words for LEAVING.

**And the same sentence was corrupting the trip length.** You said "3 days", then
"I'm flying into Denmark in 2 days", and the brief held TWO. Nobody had shortened
the trip: a number before a day word is a length whatever comes in front of it.
The arrival phrase is now removed before the count is looked for, so one number
cannot answer two slots. "We want to see Denmark in 3 days" still reads three.

**Net effect on your transcript:** the brief completes at turn 4 instead of never,
and the length stays 3 instead of silently becoming 2.

---

## 3. "One more thing.. one more thing"

You are right and there were two separate sentences saying it.

**The one the code appends.** "One thing first, and then I can build it" printed
directly above "2 of 7 — 5 still to go". That is not a figure of speech that has
worn thin, it is a false statement about how much longer this will take, beside
the number that contradicts it. It now counts, **from the same list the progress
bar counts**, so the two cannot disagree: *"Five things still to go, and this is
the first: ..."*. One left keeps the old promise, because then it is true.

**The one the model writes.** "One more thing on Aalborg if it appeals" — which
was not even about the brief, it was introducing a beer walk. The prompt now bans
that opener and every counted variant of it, at either end of a reply.

**And it may not repeat itself.** When a slot has been asked and is still empty,
the second note says so plainly and gives the shape of an answer that will land:
*"I still have not got your dates in a form I can plan from. A day and a month
does it: '14 September', or 'the 14th to the 17th'."* A parser will miss
something else eventually; what must not survive that is the loop.

---

## 4. Dates the app could not read, found while measuring

* **"Tomorrow through the 20th"** — the sentence in your 19:18 screenshot, which
  Gemlyx's own reply quoted back correctly while asking for the dates again. A
  relative start with a dated end fell between two readers: every range pattern
  wants a digit on the left, and the relative reader refuses a turn that states
  a date. Now read. Guarded so a clock is not a trip: "I'm at work today till 5"
  was a 24-day range in my first version, and `tripWindow` runs this over the
  whole transcript, so an opening-hours line in a REPLY would have set the trip.
* **"It's from the 13th of september till the 20th....."** — your 18:22 message.
  The two orderings already there cover a booking confirmation's two shapes and
  not the one a person types. That conversation ended with no trip length at all.
* **"14 Sep", "3 Oct", "15. okt"** — every abbreviated month in every language
  read as no date. The sharpest version is in the source's own comment: the range
  pattern is annotated *"which is how a booking confirmation prints it: 'Sep 28 -
  Oct 3'"*, an example it could never match.
  Short forms are allowed only where a day number settles them, and two are
  refused outright: **"jul" is Christmas in Danish** ("vi holder jul 24.
  december" read as 24 July 2027), and **"Jan" is a name** before it is a month,
  so it may only follow its number.

---

## 5. Your report can now answer the question you sent it for

The 18:22 report shows `days` empty and "days" in `askedAndUnanswered`, on a
conversation where you plainly answered "7" to "How many days are you here for?".
Whether the answer was missed, or was never matched to the question, turns
entirely on what that reply recorded itself as asking — and the report did not
carry it. It does now: every assistant turn prints its `asked`, and the report
prints the `answering` array beside the turns.

I could not settle that one from the file you sent. The next one will settle it
in the first ten seconds.

---

---

## 6. Nightlife, which you were right about and which I measured

You said "the AI seems to push a lot for nightlife" and sent four transcripts
from one day. Counting nightlife words on each side:

| chat | Gemlyx | traveller | who raised it first |
|---|---|---|---|
| 00:36 | 18 | 1 | Gemlyx, turn 8 |
| 02:54 | 4 | **0** | Gemlyx, turn 8 — party was **one adult and seven children** |
| 17:17 | 10 | **0** | Gemlyx, turn 10 |
| 18:22 | 18 | 1 | Gemlyx, turn 10 — and the traveller's one mention is a REFUSAL |

**Gemlyx raised it first in four out of four.** In two of them the traveller
never mentioned it at all, and in the other two their only mention was "I'd
appreciate one night of nightlife" (answering Gemlyx's pitch) and "I can't really
be doing nightlife when I'm with my kids".

It is not the model's taste. The chat prompt hands it the **whole published
nightlife inventory, every turn, beside the towns and the food, whoever it is
talking to**. Every other list there is somewhere you can take anyone. A named
list of bars in front of you is a suggestion.

That list now goes in only when a night out is on the table, and when it is not
the prompt says so in as many words. Same rule the Nightpay tip already followed,
through the same function.

**And your kids rule.** With children in the party, a theme word is not a
request: the nightlife vocabulary holds "beer", "wine" and "live music", and a
beer by the harbour while the kids run about is not a bar crawl. A parent who
asks for a night out outright still gets one — that is their trip, and
`briefConflicts` raises it with them, which is your rule from 5 Sep.

One more, found on the way: `party` and `parties` are in the nightlife
vocabulary, so "we're a party of four, two adults and two kids" read as a request
for nightlife. The most family-shaped sentence in the brief was asking for a bar
crawl.

---

## 7. Interests is now hard, and the plan is gated on it

Both of your answers, implemented.

**Hard.** `interests` was blocking but not hard, so asking it once satisfied it
and the build went ahead on nothing. It now sits with dates and party: nothing
builds until you have answered. That is the 17 Aug sentence this whole file was
built from — "it didn't know what kind of trip we were looking for, which is
extremely poor design" — finally enforced on the slot it was about.

**With a handle on the door.** "You pick", "whatever you think", "surprise me",
"du bestemmer" are read as a real ANSWER, recorded as "open to anything, Gemlyx
chooses". Your prompt has told the model for weeks to decide for people who are
unsure; nothing in the brief could hear it, so the model was told to decide and
the gate would have kept asking.

**And the plan is gated.** A night-out STOP in a plan where nobody asked for one
is now a plan problem, blocking like the other gates. A day that mentions a bar
is a sentence; a bar as a stop is a plan, and that is the difference it reads.

---

## Still open, in the order I would take them

1. **"I've already been to Aarhus" still rules nothing out.** Left alone on
   purpose: your own town rule from 6 Sep says a town keeps its place and its
   stops change, so this belongs to `beenThere`, not to exclusions.
2. **A bare "the 14th" still reads as nothing** when it is the whole answer.
   "the 14th to the 17th" works, "arriving on the 14th" does not. Narrow, and I
   would do it through `answering` rather than by loosening the date pattern.
3. Everything still open from the 12 Sep night handoff: Samsø on the mainland,
   Day 8 in Danish, Næstved Food Festival's dates, Ny Vestergade as a stop,
   photos on the route map cards, a map of each day's stops.

## One thing I noticed and left alone

`previewMatch.js` and `exclusions.js` now import one `ORDERING_AFTER` between
them. The first version of that fix wrote the list out twice, under a comment
claiming the two were the same list — and they were already one entry apart, so
"We are not going to Legoland to begin with" kept the place in the guide and took
its pin off the map. This repo's signature bug had reproduced itself inside the
fix for it, within an hour. `NOT_GOING` and `NOT_TRAVELLING_BEFORE` are still a
hand-copied pair of the same rule; they agree today, and they are the next place
it will happen.
