# Why the drafts will not give a reader a transport guide

13 August 2026, overnight. You asked the question directly, so here is the
direct answer.

**Nothing in this pipeline is failing to find the route. It finds the route, in
full, and then throws it away.**

Google hands back the whole journey: every leg in order, the line name, the
operator, the boarding stop, the alighting stop, the walk at each end, the wait.
`api/directions.js` reads all of it correctly. Six separate decisions then
remove it, one layer at a time, and none of them is wrong on its own.

    1  measured for only 4 of 8 place types          fixed tonight
    2  reduced to a summary in memory                fixed tonight
    3  never stored on the row                       fixed tonight
    4  the writer told to look away from it          your call
    5  26 prohibitions and no instruction to write   your call
    6  the "Getting There" slot deliberately deleted  your call, and it was right

Three of them were code and are fixed. Three of them are the brief, and I have
not touched it while you are asleep.

---

## 1. It only ran for half the place types

Covered separately tonight in the Skælskør answer. The Directions call was gated
on a list of four content types while the nearest-station lookup used a list of
eight, so a restaurant, a food street, a bar or a nightlife town had its arrival
point looked up and its journey never measured. There was a third copy of the
same four-entry list on the journey research search.

One list now, `PLACE_TYPES_WITH_A_JOURNEY`, read by all three gates.

## 2. Even in memory, only the longest ride survived

`journeyParts` returned a summary: total, on board, on foot, waiting, the number
of changes, the interchange names, and `longest`, being the single longest ride.

**A reader does not want the longest ride.** They want the sequence. Train to
Slagelse, then the 901 bus, then the walk. Google returns exactly that and it
was being reduced to a maximum, so even a writer who wanted to describe the
journey properly could not: the middle legs were gone before the prompt was
built.

`legs` now carries every ride in order with its vehicle, line, and two stops.
Walks are excluded on purpose, because they are already counted in `onFoot` and
a walk listed as a service renders as "board the  at ".

## 3. And then it was deleted

This is the one that surprised me.

`transitParts` is computed, used in **one prompt**, handed to **one gate**, and
never stored. The `__` fields that reach the row are `__sources`, `__hours`,
`__ticket`, `__dateSource` and `__corrections`. There was no `__journey`.

So the one real measurement in the entire pipeline, the only number that is not
either a model's prose or a search snippet, existed for the length of one
function call. What survived to the reader was `travelTime`, a single string,
and `nearestStation`, a single name.

`studioContent.js` warns about exactly this in its own comment: *"this
allow-list has eaten a feature four times, so a new __ field gets added to it in
the same edit that creates it rather than a week later when somebody notices it
never shipped."* The journey was never added because it was never a field.

It is now, dated, on the same terms as `__hours`. **Storing is the half that
could not wait**: a row published without its journey has lost it short of a
full redraft, so this earns its keep on every draft from tonight even before
anything renders it.

## 4. The writer is told, in so many words, to look away

This sentence closes the frozen-facts block, which is where the station, the
coordinate and the arrival point are handed over:

    This is provided for your context only, the system will use the verified
    values directly regardless of what you write, so focus your words on the
    EXPERIENCE and description, not on restating these numbers precisely.

Every word of it is defensible. The values *are* force-overridden, the model
*should not* be retyping a coordinate, and drafts that restated the numbers were
getting them subtly wrong. That is why it was written.

But read it as the model reads it. It is handed the measured logistics and told
in the same breath that the logistics are not its job and the experience is.
**So it writes the experience.** The transport guide is not missing because the
model failed to write it. It is missing because it was told not to.

## 5. Twenty-six prohibitions, and not one instruction to write the route

I counted the prohibition markers in the transport block of the prompt. Twenty
six. The explicit ones:

    Do NOT name a different crossing to the same island
    Do NOT write that public transport is unavailable
    NEVER put that advice in a short At a Glance field
    NEVER IN gemlyxFind
    NEVER state that no public transport route exists
    never name an interchange that is not on this list
    must never be written as "the station is N minutes from the centre"
    no sentence, no semicolon, no "likely", no "check rejseplanen"

Each one exists because a real draft did the thing. I can see the scar tissue
and every rule earned its place.

Now count the instructions telling it what to WRITE. There is one, and it is
about a field rather than prose:

    Use these real figures for travelTime and for anything you say about
    getting there

**"Anything you say about getting there" is the only positive instruction, and
it is conditional on the model deciding to say something.** Nothing asks for a
route. No field wants one. So the safest possible draft, the one that trips no
rule, is the one that says nothing about transport at all, and a model given
twenty six ways to be wrong and no definition of right will take it.

This is the same pattern as the writing review: the pipeline dramatises failure
vividly and never dramatises success. It reliably produces caution.

## 6. And the "Getting There" section was deliberately removed

    rigid slots ("Getting There", "What Travelers Love") force generic filler
    even when facts are accurate, because there is only so much genuine content
    that fits a narrow question before it becomes padding

**That reasoning is correct and I would not reverse it.** A prose section headed
"Getting There", written by a model, is padding. You removed it for a good
reason.

The trouble is what filled the gap: nothing. The slot went, and the fact went
with it, because the fact only ever lived in the slot.

---

# On Gemini's suggestion

You sent this:

> The reason the AI keeps ruining your maps is that you are asking it to write
> descriptions of routes instead of treating map data like strict, unchangeable
> infrastructure tokens... The AI should only ever look at fixed structural
> tokens, and the frontend app must stitch them together.

**The diagnosis is wrong and the prescription is right**, which is an unusual
combination, so it is worth separating them.

**Wrong on the diagnosis.** The AI is not ruining your maps and it is not
inventing route data. That was already fixed, thoroughly, before tonight:
`frozenGeo` overrides every coordinate, `keepMeasured` restores every measured
field after any rewrite, `travelTime` is force-written at publish, and
`nearestStation` is set back to the measurement even when a correction pass has
decorated it. Gemini is describing a failure this codebase closed weeks ago.

Its example gives it away. It says a model seeing `travelTime: ""` "panics and
invents creative text like *Getting there without a car is a genuine unknown*".
That is close to a real sentence from your drafts, but the cause is the
opposite of what it claims. The model did not invent that from an empty field.
It wrote it because the brief tells it, at length and in capitals, that an
unmeasured route must never be stated as an absence, and that hedge is what a
model produces when it is told what not to say and never told what to say.

**More decoupling makes that worse, not better.** The AI is already walled off
from the transport data almost completely. The symptom is not corruption, it is
silence.

**Right on the prescription, for a different reason.** "The frontend app must
stitch them together" is exactly what should happen, and not because the model
cannot be trusted with the data. Because **a route is a structure, not a
paragraph.** Nobody wants a model's prose rendering of "train, then bus, then
walk". They want it as steps, in order, with the times. That is a component, and
building it from the measurement makes it correct by construction, free of
tokens, identical on every entry, and impossible to hallucinate.

And it resolves the conflict rather than picking a side. The brief wants the
prose to do experience. Fine. Let it. **The reader gets the logistics from a
rendered block and the character from the prose, and neither has to be both.**

That is why I stored `__journey` rather than rewriting the prompt: it is the
prerequisite for the good version of Gemini's idea, and it is the piece that is
lost forever if a draft ships without it.

---

# What I changed

    src/utils/journey.js       journeyParts now returns every leg, in order
    src/utils/studioContent.js __journey allow-listed, dated, legs and all
    src/App.jsx                the draft keeps the measured journey
    tests/run.mjs              9 assertions, 4 mutations verified

Suite 3830 passing, 0 failing. Build clean. One of the mutations crashed the
run instead of failing it, which hid the other assertions, so those three are
null safe now. Second time tonight that trap has come up.

# What I did not change, and what I would do next

**A. The render.** A `JourneyCard` on the detail page, built from `__journey`:

    From Copenhagen              3h 04m door to door
      train  IC        København H  ->  Slagelse        58 min
      bus    901       Slagelse     ->  Skælskør Havn   34 min
      walk                                               9 min
    1 change, about 20 min waiting. By car 1h 38m.
    Measured 13 Aug 2026.

Every value is measured. No model touches it. I did not build it because it is a
visual change to a page I cannot see, made overnight, and you should look at it
before a reader does. It is a small component and the data is now there for it.

**B. One sentence in the brief.** The single highest-value prompt change is not
removing a prohibition, it is adding the missing positive:

    A reader planning a trip needs to know how they get there. Where the
    measured journey above names the legs, write the route in the prose as a
    sequence: which service, where you change, and how long the walk is. Name
    only what is named above.

That is the instruction that does not exist. Every rule around it is about not
getting it wrong.

**C. Then reconsider the "look away" sentence.** Once B exists, *"focus your
words on the EXPERIENCE, not on restating these numbers"* is directly
contradicting it. It should become something narrower: do not retype the
coordinate, do not restate travelTime, and do write the route.

I would do A and B in that order, and I would want you awake for both.
