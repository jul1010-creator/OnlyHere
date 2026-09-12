# Gemlyx, 12 Sep 2026, evening

You sent me the 12 Sep night handoff, the 00:36 chat report, a screenshot of the
live site, the "one more thing" complaint, and then the 18:22 report and the
preview screenshot. All of it turned out to be three bugs wearing six faces.

Everything below is ON YOUR PC, suite green in both timezones, build clean.
**15,647 → 15,762 passing.** Fifteen files: thirteen in `src/utils/`, plus
`src/App.jsx` and `tests/run.mjs`.

Sections 1 to 7 were written before the grocery run. Sections 8 to 12 are
everything after it, including your 21:24 transcript.

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

## 8. The map is a slideshow now, and the AI directs it

Your words: "I want you to prompt the AI as if the map is a diashow directed by
the AI." Plus the Aalborg note: "it shouldn't zoom into Aalborg instantly here.
Zoom in if Gemlyx wants to explain/show something (which it still doesn't do)."

`MAP_DIRECTION_RULE` in `mapDirections.js` is rewritten from the ground up
around that. The old rule said when a marker was legal. The new one says what
the run of slides is FOR, in seven sections:

* **A NAME IS NOT A REASON TO ZOOM.** This is the Aalborg fix. Saying the word
  "Aalborg" no longer earns a camera move. A move is earned by having something
  to show once you get there.
* **THE SHAPE OF A GOOD RUN** and **PACE IT LIKE SLIDES.** One thought per
  slide, and a slide holds while the sentence about it is still being written.
* **END ON WHAT MATTERS.** The last camera position is what stays on his screen
  after the reply stops, so it is chosen rather than left where the last
  sentence happened to land.
* **NEVER MENTION THE MAP.** A slideshow narrator does not say "as you can see
  on the map".
* **ONLY PLACES THE MAP CAN REACH**, and **WRITE THE MARKER EXACTLY AS
  PRINTED**, both kept from the old rule because both were load-bearing.

On the coordinate sweep you offered: the chat map draws towns (`_src: "town"`)
and attractions (`_src: "free"`, which is what the Attractions tab publishes),
and it silently drops any pin with no coordinate. So whether the attractions you
want zoomed carry lat/lon is a Supabase question I cannot reach from here.
**Studio → Manage Published already runs `coordAudit`/`describeCoordAudit`** and
will tell you in one screen. Run that before sending me a sweep, because if the
audit is clean the sweep is not the missing piece.

---

## 9. "only 3 days? Where is the rest of the guide?"

Two readers of one question, which is this codebase's signature bug and the
third time it has turned up in two days.

The brief read your conversation and got 8 days. The guide BUILDER did not use
the brief at all. It called `dayCountIn` on the same text, which takes the first
match it finds, and the first number-shaped thing in that conversation was not
the trip length. So the chat knew 8 and the thing that sized the document knew 3,
and nothing anywhere compared them.

There is now **one `guideBrief` per build** in `App.jsx`, read once, and
`requestedDays` comes off it. The builder, the retry prompt that fires when the
model returns too few days, and the stay-night mapping all read that single
number.

---

## 10. Samsø drawn on the mainland

You said: "this was from earlier, but the other chat never fixed it."

`journey.js` gained `NO_FIXED_LINK_ISLANDS` (Ærø, Samsø, Fanø, Læsø, Bornholm)
and `islandLegProblems`, which raises a plan problem when a leg lands on one of
those with a road mode. It skips legs where both ends are on the same island, it
names the island END rather than the mainland one, and it says nothing when the
mode is already a ferry or a flight.

The endpoint has to BE the island, with at most a genitive s. A leg from the
mainland names the island or the port nine times out of ten, and the tenth is a
miss rather than a false alarm, which is the direction this codebase chooses
every time.

---

## 11. The review you asked for, and the nine things it found

You said "Call in Fable as a sub-agent", then "Because it seems you struggle."

**Fable is not available as a sub-agent in this session.** I said so rather than
quietly substituting something and calling it Fable. What I ran instead was an
adversarial reviewer against the whole night's diff, twice.

The first pass found 8 defects. The second found 9 more, and **seven of the nine
were mine, written that same night.** Worth having in writing:

1. A full stop was being read as an ordinal, which defeated the guard meant to
   stop a clock time parsing as a date range.
2. Danish `i N dage` lost both the trip length and invented a date.
3. `islandLegProblems` fired on legs BETWEEN two points on the same island.
4. It also named the wrong end of the leg.
5. And claimed to have checked a ferry it had no way to check.
6. `correctedTo` dropped every pin on the map when you typed "No rush", "No
   problem" or "Sorry for the slow reply".
7. `PARTY_AS_PEOPLE` scrubbed the words "the party scene" out of a turn.
8. `nightStop` flagged Copenhagen Golf Club as nightlife.
9. Two counters disagreeing inside one prompt, which is the exact bug section 3
   exists to fix, reproduced inside the fix for it.

All nine are fixed and each has its own assertion. I also nearly reported the
arrival reader as broken and it was not: I had measured it without passing the
town resolver. My first read of that was wrong and I told you so at the time.

---

## 12. Your 21:24 transcript, four more

Two of the four were already fixed before you sent it, by sections 3 and 7, and
had not reached the site yet. Turn 4 announced "I'll plan you both starting from
Copenhagen Airport unless you're setting off from somewhere else" while you were
sailing in from Norway; turn 12 opened with "One thing before I map the route
properly" with three things still open. Both are in the build going up now.

The other two were new.

**A trip length can no longer be assumed out loud.** Turn 14: "I'll plan for
around 4 days between the two towns since you haven't said otherwise." Nobody
said four. The prompt had told it to, because `days` sat in the
already-asked-and-not-answered list, whose instruction is "say out loud what you
are assuming". For every other slot that is the right instruction. For this one
it is not, because **the builder reads the conversation back**, finds "around 4
days", and sizes the guide to it. That is section 9's bug arriving by a second
road. `days` is out of that list and has its own rule: no number, no "around N
days", no length offered for you to correct. Ask, or say nothing.

It is NOT a hard slot. A hard slot asked and side-stepped blocks the build for
good, and a traveller can honestly not know their length yet. What is banned is
stating a number nobody gave.

**And the length you gave is not re-described.** Turn 16: "That's a full week",
about a trip the brief holds as five days. It added the sailing day and rounded
up, and you had two trip lengths in one reply, one of them from the machine about
to build the thing. When the length is known the block now prints it and forbids
converting it into a week, a fortnight or any other span.

**Your report was lying to you, too.** `briefTimeline` handed the WHOLE
conversation's asked-list to every row from the first assistant turn onward. On
this export that made turn 1, one "Hi babes" in, show all seven blocking slots as
declined, and it reported `ready: true` at turn 11, four turns before the app
would have. A timeline is the thing somebody debugs from, and this one was
manufacturing a bug that was not in the app. Each assistant turn already records
what its brief block told it to ask, so it reads that instead. The corrected
timeline flips ready at turn 15, which is where the app flips it.

**And "genuinely" is now banned in chat.** Turn 6: "you can genuinely watch the
currents collide in the water." I measured every block that joins a chat request
against the five words you have named, and every hit was in a code comment, which
is never sent. Nothing was modelling it; the word came out anyway. So the chat
prompt now bans them by name, the way the studio rulebook has since August, and
the suite holds the prompt to exactly one use of each, inside the ban sentence,
the same trade it already makes for the em dash.

---

## Still open, in the order I would take them

**The promise gate is the big one and it is not built.** The chat promised you a
"fantasyfestival" and the preview dropped it. The chat said it would skip Jomfru
Ane Gade and the guide listed bars there. Nothing anywhere compares what the chat
PROMISED against what the plan contains, and both of those were promises made in
writing and broken in the same session. I also think "Fanden festival" was
invented outright. This is the next thing I would build.

After that:

1. **"I've already been to Aarhus" still rules nothing out.** Left alone on
   purpose: your own town rule from 6 Sep says a town keeps its place and its
   stops change, so this belongs to `beenThere`, not to exclusions.
2. **A bare "the 14th" still reads as nothing** when it is the whole answer.
   "the 14th to the 17th" works, "arriving on the 14th" does not. Narrow, and I
   would do it through `answering` rather than by loosening the date pattern.
3. **The Nightpay paragraph at turn 16** is a long pitch for a paid subscription
   app, unprompted, off the back of "maybe a drink at night". It is a published
   entry and it is true, so I have not touched it, but it reads as selling and
   it is the last thing in the reply before the offer to build. Your call.
4. Everything still open from the 12 Sep night handoff: Day 8 in Danish,
   Næstved Food Festival's dates, Ny Vestergade as a stop, photos on the route
   map cards, and a map of each day's stops.

## One thing I noticed and left alone

`previewMatch.js` and `exclusions.js` now import one `ORDERING_AFTER` between
them. The first version of that fix wrote the list out twice, under a comment
claiming the two were the same list — and they were already one entry apart, so
"We are not going to Legoland to begin with" kept the place in the guide and took
its pin off the map. This repo's signature bug had reproduced itself inside the
fix for it, within an hour. `NOT_GOING` and `NOT_TRAVELLING_BEFORE` are still a
hand-copied pair of the same rule; they agree today, and they are the next place
it will happen.
