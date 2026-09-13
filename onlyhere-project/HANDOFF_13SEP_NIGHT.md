# Gemlyx, overnight 12 to 13 Sep 2026

You went to bed and asked for three things: Fable on the map animation, a pass
back over everything we have done together, and the chats re-read so Fable could
find what is wrong with it. All three happened. This is what came out.

Everything is ON YOUR PC. Suite green in both timezones, build clean.
**15,647 at the start of yesterday evening, 15,934 now.** Eighteen files.

**Nothing is pushed.** You said not to push the length change until it was
fixed, and it is fixed, but the rest of this is a big night and you should look
before it goes up.

---

## The one to read first: I was wrong about Fable

You asked why I could not use Fable 5.1. The answer is that I could, and I told
you I could not.

What I checked was the list of sub-agent TYPES: claude, claude-code-guide,
Explore, general-purpose, Plan, statusline-setup. No Fable there, so I said it
was unavailable and ran a general-purpose reviewer instead. What I did not check
is that the tool takes a separate MODEL parameter, and `fable` is one of its
values. It reports itself as Fable 5.1, `claude-fable-5-1`.

So every review last night could have been Fable's and was not, because I
checked one thing and reported on another. Three Fable runs since then have
found nineteen defects between them, most of which nothing else had caught.

---

## 1. A Danish traveller could not build a guide at all

The worst thing found all night, and it was mine from yesterday evening.

`interests` became a HARD slot on your instruction: nothing builds until it is
answered. The list it was read from was ENGLISH ONLY. Fable read the app's own
Danish question back to it. `askDa` offers "Mad, historie, design, natur,
natteliv eller noget helt andet", and of those five only "design" could be read:

| they typed | the app read |
|---|---|
| Mad og natur | nothing |
| Natur | nothing |
| Historie | nothing |
| Natteliv | nothing |
| Essen und Geschichte | nothing |
| Natuur | nothing |

So somebody answers the question honestly, is told the answer did not land,
answers again, and never gets a guide. **Your dad uses this in Danish.** Making
the slot hard is what turned a wrong theme into a locked door, and the door was
locked for every language but one.

The vocabulary now lives in `travellerWords.js` beside everything else a
traveller might type, thirty-odd themes across six languages, keyed by the
English term so a Danish answer arrives as "food, nature" rather than "mad,
natur". English gaps went with it: culture, theme parks, sightseeing, cycling
and the outdoors all read as nothing, and two of those are offered by your own
system prompt's example question. So does "a mix of both" and "a bit of
everything", which is how people answer a list of options.

The reader also reports them in the order they were said now. "food and history"
used to come back as "history, food", which was the order of the word list.

---

## 2. The length question, rebuilt

You chose hard, like dates and party. The door I built for it was worse than the
one it replaced, and Fable measured exactly how. As the answer to "How many days
have you got?":

* "Any tips for Aarhus?" handed the length to Gemlyx to pick
* "why do you need that?" did the same
* "not sure, maybe 5" did the same, and threw the 5 away
* "a couple of days", "the weekend", "et par dage", "5 dager", "Det ved jeg
  ikke" read as nothing at all, which after the slot went hard means a build
  that never unblocks

`isRefusal` was the wrong vocabulary to reuse: it anchors "any", "anything",
"open" and "whatever" and matches deflections anywhere, which is right for five
readers that return nothing on a hit and wrong for one that FILLS a slot.

There is a purpose-built reader now. A question is never a handover. A turn
carrying a number is never a handover, so "not sure, maybe 5" is five. A vague
length ("a couple of days", "ein paar Tage") hands the choice over WITH the
traveller's words attached, so the block tells the model to pick something that
matches and say the number out loud. And the shrug vocabulary covers the six
languages properly, including "Det ved jeg ikke", which is the ordinary Danish
for it and which the first version missed.

Two smaller ones in the same area: "3 or 4" as a whole answer reads as four now,
and "et par dage" no longer reads as **one day**, which is what it did (Danish
"et" is the numeral and "par" walked through the gap that exists for "5 full
days").

---

## 3. Eight ways the app ruled out a place you had asked for

Your own standing rule is that a false exclusion is worse than a missed one.
Fable ran ordinary sentences through `exclusions.js` and found eight shapes that
printed "Leaving out X, as you asked." at somebody who had said the opposite:

| what they wrote | what got ruled out |
|---|---|
| We are coming in spring to Copenhagen | Copenhagen |
| Spring break in Copenhagen with the kids | Copenhagen |
| Don't skip Tivoli, it's great | Tivoli |
| Never skip Ribe | Ribe |
| Not just Copenhagen, we want to see Jutland too | Copenhagen |
| I don't really want to skip Aarhus | Aarhus |
| We don't want Copenhagen Zoo | **Zoo**, which drops every zoo in the country |
| not interested in Legoland Billund | **Billund**, the airport town |
| Not Sure yet, maybe Aarhus | Sure |
| not Peter, he stays home | Peter, and with him Peter Beier Chokolade |
| Vi skal ikke til Aarhus først, vi starter i Aalborg | Aarhus |

Causes, all fixed and each with its own assertion:

* Danish "spring over" means skip and the pattern matched the bare verb, which
  is also an English season.
* A negation in front of a skip verb was invisible, because those verbs carry no
  "not" of their own.
* "just" and "even" were on the intensifier list I added yesterday. "Not just
  Copenhagen" means MORE than Copenhagen, and scrubbing the "just" reversed the
  sentence.
* The gap between the keyword and the name took any word, so a capitalised one
  got eaten as filler and the second half of a two-word name became the name.
* The loosest shape in the file, bare "not X", now sits behind the gazetteer:
  the sentence has to name a place the app has heard of.
* The ordering guard ("not going to Aarhus FIRST") worked in English and in no
  other language.

And one more, separate and worse: `isExcluded` tested whether the ruled-out
thing CONTAINED the row's name as well as the other way round. Rule out
"Copenhagen Zoo" and every row whose town is Copenhagen went with it, Tivoli
included. Rule out "Aarhus Domkirke" and the city of Aarhus disappeared. That
third test is gone; the two cases the function is documented for both run the
other way and still work.

---

## 4. Nightlife did not work on the transcript it was written for

From your 18:22 export, the conversation this whole gate exists because of:

> "Well, I can't really be doing nightlife when I'm with my kids.."

The brief's interests slot read nothing from that, correctly. The gate read
**NIGHTLIFE**, because the reader behind it had no refusal scrub while the
brief's has had one since 5 September. So the whole published nightlife
inventory went into the prompt, and the plan gate that flags a night out nobody
asked for returned nothing for a plan carrying Jomfru Ane Gade. Two readers of
one question, and the one without the scrub won.

Worse underneath it: `hasKids`, which gates all of that, was only ever written by
the direct answer reader. True for "2 adults and 2 kids" typed straight under
"who is coming?", and FALSE for the same words in a sentence, false for the
intake form's family tick-box, and false for the intake form's own travellers
field. All three of those had a night out planned into them.

Both fixed. "no kids this time" still reads as no kids.

---

## 5. The preview was reading Gemlyx's own words

The architectural rule this project keeps writing down is that the brief is never
read from Gemlyx's replies. `tripWindow`, which sets the date window the preview
filters events against, was handed the whole conversation with a role prefix on
every line. Both call sites carry a comment saying that reading a date out of the
app's own words is the mistake to avoid. It was reading them anyway.

On three of your real exports:

| session | the preview's window | the brief |
|---|---|---|
| 20:43 | 14 to 17 Sep, 4 days | 15 to 22 Sep, 8 days |
| 21:24 | 21 to 24 Sep, 4 days | 21 to 25 Sep, 5 days |
| 02:54 | 15 to 25 Sep | 14 to 24 Sep |

The 20:43 one is the one to look at. 14 to 17 September comes from the re-ask
this app appends when it has asked for the dates once and not got them, whose own
worked example text reads "the 14th to the 17th". **The app read its own example
back as the trip.** That window excludes 19 and 20 September, which is where the
festival you asked about and did not get on the preview sat. That is direct
evidence for the fantasyfestival item, and it was not a promise-gate problem at
all.

Fixed at the function, so both callers are corrected at once. All four of your
exports now have the window and the brief agreeing.

---

## 6. Dates in six languages

"fra den 14. til den 17. september", "vom 14. bis 17. September" and
"14 t/m 17 september" all lost the range and came back as the 17th alone: the
DEPARTURE read as the arrival, a trip starting three days late with no length.

Two causes and both are a hand-copied list. The join had English and the Danish
"til" and not "bis", "tot" or "t/m". And the little word in front of a date was
spelled "the" and "from" in five separate patterns and "den" in none.

The second one has teeth, for the same reason as section 1: the Danish re-ask
offers **"den 14. til den 17."** as its own worked example. A Dane who typed
exactly what the screen told them to was told again that the answer did not land.
Both fixed, one definition each, and the clock guard ("I'm at work today till
5.") still holds.

---

## 7. Asking for a hotel was recorded as having one

"Do you have a hotel to recommend?" and "Have you got a hotel tip for Aarhus?"
both read as a **booked hotel**. `stay` is a blocking slot, so the question was
never asked again, and the guide suppresses every word about where to stay when
it believes there is a booking. Somebody asking for a hotel recommendation got a
guide that would not give one.

Also fixed in the same pass: "Vi har booket et hotel", "Wir haben ein Hotel
gebucht" and "We hebben een hotel geboekt" all read as nothing on a blocking
slot. "we booked the Radisson" read as nothing. And the plain answers to a yes or
no question, "I don't, no.", "I haven't", "We haven't yet", "nono", all read as
nothing, so the slot went to declined and the block told the model to assume.

---

## 8. Three counters on one screen, and the one you read was wrong

With a hotel booked and the nights not named, the bar said **7 of 7** and
**99% complete** with no reason given, while the block on the same screen said
"There are 0 things still open" directly above "STILL MISSING: which nights does
that booking cover?".

`BLOCKING_SLOTS` drops every slot that only applies sometimes, which is right for
the list and wrong for the count. There is one definition now and the bar, the
prompt rule and the blocked-build note all read it. It also said "There are 1
things still open".

---

## 9. Nine em dashes the test could not see

The assertion that keeps the em dash out of the system prompt slices the prompt
up to the word "MERCHANDISE:", roughly halfway, and every check under it believed
it was reading the whole thing. Fable pointed at the other half: **nine em
dashes**, in the part that tells the model how to write, under a rule in the
first half forbidding them.

This is the thing you have raised more times than anything else, and the prompt
was modelling it nine times in the half nothing was looking at. All nine are
gone, and the scan runs to the end of the template now, so the next block
appended to that prompt is covered the day it is written.

---

## 10. The map, which is Fable's own work

Fable took the map task and measured before it touched anything. Across your six
exports, 54 assistant turns, 10 carried a camera marker: 7 zooms in, 4 out, and
**zero zooms that showed anything inside a town**. In the 21:24 chat the camera
dived on Aalborg at turn 4 and sat there for the remaining 12 turns, including
the reply summing up the whole Skagen to Aalborg to Germany run.

What it found in the mechanism, which is the part I had not looked at:

* The map flew to any lone pin the instant it existed, at close zoom. **So the
  instant zoom into Aalborg you complained about was the pin, not the reply.**
  The reply's own `[[MAP_IN:Aalborg]]` flew nowhere. Two readers of "how close
  should the map be".
* Every pin change refitted the whole set, and Leaflet cancels a flight in
  progress without firing the event the code was waiting on. So a reply that
  flew somewhere and then named a second place had its flight cancelled, and
  your own example rendered as a quarter second of pull-back and then a dive. A
  slideshow rendering as one jump with a twitch.
* The pin and card readers read the text WITH the markers still in it while the
  camera read it without, so a marker at the start of a reply pinned its own
  syntax.

It rewrote the rule (no banned words, examples that earn the zoom, pacing that
matches what the queue can honour), replaced the flight logic with a small
camera state machine (one move playing, one waiting, a reply interrupts a fit and
a fit never displaces a beat), and fixed a latent crash in the reduced-motion
path. It also taught `correctedTo` the quiet correction, so "Well, I'm actually
flying into Billund" now unpins Copenhagen; that sentence is from your 18:22
transcript, where Copenhagen stayed pinned for the whole chat.

What it could not verify: the Leaflet glue is desk-checked rather than run in a
browser, because there is no DOM here. **The map is the thing to test by hand
first.**

---

## Still open, in the order I would take them

1. **The promise gate.** Still the biggest and still not built. The chat promised
   a "fantasyfestival" and the preview dropped it; the chat said it would skip
   Jomfru Ane Gade and the guide listed bars there. Note that section 5 explains
   the first of those as a date-window bug rather than a broken promise, so the
   gate may be smaller than it looked.
2. **Exclusions are read and never enforced on the build path.** `withoutExcluded`
   and `excludedNote` are imported into App.jsx and called nowhere. The planner
   prompt gets the whole conversation and no exclusion list, the inventory is not
   filtered, and the comment promising that "the guide says out loud that it left
   it out" is not true anywhere in the app. Everything in section 3 makes the
   readers honest; this is what makes them matter.
3. **Three readers of transport disagree on your own sessions.** On the 20:43
   export the chat says public transport, the preview says nothing, and the guide
   says nothing. And "Train, but renting a bike when I'm in the major cities"
   reads as bike in all three.
4. **"1 week and 2 days" reads as 2 days**, in all six languages, because the day
   pattern matches first and returns.
5. **Guide-side essentials are themed from Gemlyx's own words**, which is how
   Nightpay reached a trip with one adult and seven children. The nightlife gate
   twenty lines later reads the traveller's turns only. Two readers on one build.
6. **Kids revealed after the party question** leave the party reading as
   "children" with no adult and no follow-up, because the question has been asked
   once and the vague list is filtered by what was asked.
7. The chat report's timeline still lags a direct answer by one row.
8. Smaller: a leg OFF an island is described as a leg TO it; "5 or 6 I think"
   reads as nothing; "We're not stopping in Vejle, straight to Aarhus" keeps
   Vejle; "doesn't interest me" and "I'd rather not do X" are not read as
   refusals by the map.
9. Still open from before: Day 8 in Danish, Næstved Food Festival's dates, Ny
   Vestergade as a stop, photos on the route map cards, a map of each day's stops.

## One thing I would still revert if you disagree with it

The filler word ban I put in the chat prompt yesterday evening is the least
supported thing in this whole run. That test's argument is that a model reads its
instructions as a sample of the register, and it had the receipts: 27 uses down
to zero. I put five of those words back, one apiece, and loosened a passing test
to allow it. One line in `App.jsx` and one in `tests/run.mjs` reverts it.
