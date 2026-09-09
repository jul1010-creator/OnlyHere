# The Detour map, redesigned

Decided in conversation with Oliver, night of 9 to 10 Sep 2026, from a screenshot
of the live map with five labelled pins on it.

---

## 1. What was wrong, in the order it matters

One screenshot, four separate faults, and they are not the same kind of thing.

**Copenhagen was pinned on a brief that ruled it out.** The traveller wrote "I've
been to Copenhagen already, so I don't want to go there". Gemlyx's own reply got
it right and said "the only one of the four". The map drew five. A map that
contradicts the sentence printed beside it is worse than no map.

**Five labels do not fit and no placement rule will make them.** Each label is
about 160px wide, the rail caps the map at 380px, and all five pins sat inside a
130px cluster. The collision code did what it was told and shuffled them to the
least-bad sides, which is why one ran off the right edge. A design that breaks
past three is a design that was tested at three.

**"Ribe: Best if you want coast."** Ribe is Denmark's oldest town. It got coast
because Aalborg took history first, and `distinctThemes` was built to optimise
for the labels being different rather than for them being useful.

**And none of it had been asked for.** The traveller said "I can't pick between
Aalborg, Aarhus, Odense, and Ribe" and nothing else. No interests, no party, no
dates. The export from that session shows six of seven blocking slots empty. The
app made its strongest steer on the turn it held the least, and led on nightlife,
which is the criterion with the most downside if the party has children in it.

---

## 2. The principle

> The map is a powerpoint show.
> Oliver, 10 Sep 2026

The map is not an input. It is a visual aid to what Gemlyx is saying. The
conversation drives and the map illustrates, and the chat between Gemlyx and the
traveller is what generates the guide.

A map that collects decisions is a second input sitting beside the text box, and
two inputs for one intent is exactly what produced the Copenhagen fault: the
sentence knew there were four, the map drew five, and neither was answerable to
the other.

**The rule that falls out: the map never shows a place the turn did not say.**
Today it derives its own pins from the text by its own rules. Rendering the turn
instead removes the bug class rather than patching an instance of it.

This also settles the buttons. There are none. A slide does not need a dismiss
button, because the next turn changes the slide.

---

## 3. The gate

The "Best if you want X" line appears once the app knows **interests or who is
coming**. Before that, pins carry names only.

The vocabulary for this already exists and the map is the only surface not using
it. `src/utils/interestFit.js` returns one of `FIT_STRONG`, `FIT_WEAK`,
`FIT_OPEN` and `FIT_NONE`, and `FIT_OPEN` is the constant "nothing stated". The
distinction between "they have not told us" and "this does not fit them" has been
in the codebase the whole time.

The gate fixes the crowding on turn one, which is when the most places are named
and the least is known. It does not fix a later turn with four towns and a stated
interest. Section 5 does.

---

## 4. What the label says

The pick is each place's own strongest theme among those not already spoken for.
That is what `distinctThemes` computes, once the tie-break is understood: on
Ribe [history], Copenhagen [history, food, art] and Aarhus [food, art] it gives
Ribe history, Copenhagen art and Aarhus food, so Aarhus keeps food rather than
losing it to Copenhagen.

Gated, "Best if you want history" answers the traveller's stated want rather than
making a claim about Denmark, and the wording is right. Ungated it is a ranking
the data does not support.

**When the matched theme does not separate the towns, the difference comes out of
the blogs.**

> Look through the blogs and look at how the history differentiates. Viking
> History is different from 18th century.

Repeating a true word on four pins is a true answer. Inventing a different one to
avoid repeating is what produced "Ribe: coast". So where four towns all match
history, each label says what KIND of history that town's own entry describes.

**This must be precomputed, not read at chat time.** Reading four entries and
extracting a phrase every turn is a model call in the hot path and would produce
a slightly different phrase each time for the same town. It is a stored field,
filled once per town by a sweep, keyed by theme word so `history` on Ribe and
`art` on Aarhus each carry their own phrase and cannot drift out of alignment
with the themes array.

It reuses the tier-2 rule the sweep already enforces: the phrase is quoted out of
that town's own writing, checked in code, and a town whose entry says nothing
specific gets the plain word back rather than an invented one. What a model knows
about Danish history does not enter.

---

## 5. The mark and the tour

One pin can carry **(recommended)**. Not numbers on every pin.

> It's all judged on the answers given by the user.

So it is a function of the brief, recomputed whenever the map draws, appearing
and moving and going away as more answers arrive. Not an event tied to one reply,
which also means it is testable without a model.

**When it recommends, the map explains.** It zooms to the recommended town and
shows its attractions, then comes back out. Three conditions:

* The zoom needs a higher bar than the label. Saying "Aalborg is the history one"
  while four towns are on screen is cheap to be wrong about. Re-framing the whole
  map on Aalborg is the app saying it has decided.
* Only where there are placed rows worth the trip down. A zoom to a town with two
  published attractions lands on an empty street map, which reads as broken
  rather than sparse.
* The attraction cap comes down with it. `GuideRouteMap`'s nearby layer draws up
  to 12 permanent labels and was written for a much bigger map. In the rail it
  needs its own number, four or five.

**The tour.** The ranking decides the order the traveller meets the towns in,
which is where a ranking belongs. And neither button says no:

> someone who says 'next' do want Aalborg, but also want Odense at the same trip

"I can't pick between four" can mean choose one for me or which of these are
worth it, and a knockout framing picks the first reading silently. So it is add
and next, never yes and no. Not adding is a weak no, and weak is all the app
needs, since it never has to act on a rejection.

The moment two are added the app has something to say that is arithmetic rather
than taste: Aalborg and Odense in three days is tight, and the coordinates, the
journey machinery and the days slot are all already there. The tour ends on a map
of what they chose.

---

## 6. What gets asked first

The current slot order is origin, days, when, party, interests, transport, stay.
It was written for **building** a guide. Choosing a place needs a different two
first:

1. **How long they are in Denmark for.**
2. **How many they are, and the ages.**

Origin and when decide logistics and events. Neither changes which of four towns
suits somebody. Days decides whether Aalborg and Odense are one trip or two, and
ages decide whether a bar street is a recommendation or a mistake.

**Ages is not only a reordering.** `readParty` fills the slot three ways: a number
from the intake form, "family" from the checkbox, or, from a sentence, a
placeholder meaning "they said something about who is coming" with no count and
no ages in it. The slot then reads as answered and the brief block says never ask
again. The logs already carry the failure: eight children reached the guide
builder as a sentence about a conversation.

That was survivable when party was one input among seven. Under this design it
decides which town is recommended, whether the tour is right, and whether a
Friday night on Jomfru Ane Gade goes on the map at all.

---

## 7. Events on the town map

An event is a claim about time as well as place, so an event pin is only honest
once the dates are known and they overlap. The date goes on the label:
"Aalborg Karneval, 17 Sep" makes both claims, and it stops being "there is a
festival in Aalborg" and becomes "there is a festival on your Tuesday".

Under slides this costs nothing to gate. No dates, no event layer. Dates arrive,
it appears.

* **Up to two per town, not two.** A quota that has to be filled reaches for the
  third-best event when nothing fits. With dates known, no event pin is a true
  answer that says "nothing on that week", and a filled slot says the opposite.
* **Events take slots before attractions**, since they are the layer that changes
  which town gets picked.
* **Fit decides the order, not what is hidden.** Showing a bad-fit event costs a
  shrug. Hiding a good-fit one costs a thing the traveller never learns exists,
  and a festival is what people reroute a trip for. Hard hiding is reserved for
  real conflicts, of which the clearest is a nightlife-typed event against a party
  with young children. Events already carry that classification; it is what
  triggers the 3am transport check.
* **Undated events stay off.** There is no date to overlap.
* `nearbyPublished` filters by distance and name and does nothing about dates, and
  the entry page hands it raw event state. The date rule belongs in the layer that
  draws the pins, not in each caller, or it gets forgotten once and is then wrong
  forever.

---

## 8. Built on the night of 9 Sep

**The exclusion reader now resolves a pronoun.** "I don't want to go **there**"
resolves back to the name earlier in the sentence, which is one of the most
ordinary ways a person rules a place out and was invisible to every pattern. It
reached further than the map: `readExclusions` feeds `_constraints.excluded` on
the build, so a traveller could have had Copenhagen planned into a trip they said
they had already done.

It resolves only where there is nothing to guess. One candidate in scope, a verb
of travelling rather than eating or staying, no venue named in the sentence, and
no condition hanging off the refusal. Where the caller has the list of places
Gemlyx publishes, a single known place among several candidates settles what
grammar cannot.

**The map and the guide now share one reader.** `rejectedIn` asks
`readExclusions` as well as its own `isRejectedPlace`, with the town pool as the
gazetteer, on the traveller's turns only. A fix to either surface is now a fix to
both, and the map can no longer contradict the sentence beside it.

Built against a 65-case adversarial corpus: zero false exclusions, one miss.

**The label gate is in.** `enoughToRecommend` in `tripBrief.js` opens on stated
interests or a stated party, and the placeholder does not count: a slot filled
with "they said something about who is coming" reads as answered to the brief and
is not enough to recommend a town on. `ChatMiniMap` takes it as a prop rather
than deciding for itself, so with the gate shut every pin is a name.

37 mutants across three batches, every one killed by the assertion written for
it. Two of them found redundant code rather than a missing test: a per-candidate
venue flag that the whole-sentence check already covered, and two assertions that
passed because no pattern fired on the sentence they used.

Suite 14,940. `tests/browser.mjs` 19 of 19.

## 9. Not built

The theme detail field and its sweep. The mark. The zoom, the tour and the event
layer. The slot reorder. The party slot carrying a count and ages, which changes
the shape of a blocking slot and fails as a wrong guide rather than a red test.

And one small thing found while reading: the caption under the chat map is
hardcoded English in a component that already takes `lang`, and the greeting in
`src/utils/chatThread.js` carries two em dashes, outside the reach of both dash
scans.
