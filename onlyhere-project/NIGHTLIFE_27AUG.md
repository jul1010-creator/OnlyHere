# Nightlife — 27 August 2026

Three things from your friend and one from you. Suite **11,462 passed / 0 failed**,
build clean, tdz clean.

---

## 1. "High-end" and "casual"

Your friend is right that it was missing, and the reason is specific: **every
field on a nightlife row says what FORMAT a place is, and none says what
REGISTER.** All six live rows:

| venue | its own Type field |
|---|---|
| Heidi's Bier Bar | Party bar (Alpine/après-ski) |
| Jomfru Ane Gade | Bar street |
| Gothersgade | Bar street |
| Farfar's Bodega | Bodega with a dance floor |
| Old Irish Pub | Party pub |
| **Hive** | **Nightclub** |

Not one of them answers the question somebody actually asks before going out,
which is whether they need to change out of their trainers.

`utils/venueStyle.js` is `utils/foodStyle.js` rule for rule — the file that
already did this exact axis for food when you asked for "fastfood/fine dining"
on 22 August. A stated field wins; a stated categorical field is keyword-matched;
the prose is never read; **the price is not an input.**

Price is worth a sentence. foodStyle's reason was that deriving style from price
makes two filters wearing one label. Nightlife has a sharper one: a bodega beer
and an airport beer cost the same and are two different evenings. Cheap is not
casual and expensive is emphatically not high-end.

**Hive is the whole design.** It's the only high-end venue in the pool and its
category says "Nightclub", which settles nothing — a sticky-floored student club
is also a nightclub. So "nightclub" is on neither keyword list, and Hive comes
back as *nobody has said*. That's placeKind.js's standing rule, applied: "A place
is only a village if somebody SAID it is a village."

### What you'll see, and what you won't

- **The chip ships now**: 🍺 Casual on five rows, nothing on Hive.
- **The filter does not**, yet. Coverage is 83%, well over the half foodStyle
  requires — but only ONE style is present, so the control would offer
  "Casual (5)" and nothing else. That's the list you're already looking at.
  foodStyle states the same rule on its own Type dropdown.

**It turns itself on the moment you set `venueStyle: highend` on Hive in Studio.**
Which is the right way for that to arrive — a club's register is a real fact
about a door policy, not something to read off a word. New drafts are now asked
for the field, and it survives the publish shape (checked, because
`nearestStation` was once asked of three types and dropped for all three).

---

## 2. The hostel bars

> "there are quite a few 'nightlife bars' that are hostels.. we need to avoid
> that the AI end up writing about the hostel, rather than it as a nightlife
> and hostel."

You were precise about the second half and it's the whole design. Being inside a
hostel is a **useful** fact about a bar, and for one question it's the most
useful one there is: can somebody who isn't staying there walk in. A rule that
suppressed the word "hostel" would delete exactly the sentence a traveller
standing outside needs.

So the subject is the bar and the hostel is context. `utils/venueSubject.js`
does three things:

- **A prompt rule** for the writer: never dorm or room rates, check-in, bed
  configurations, breakfast, luggage storage. Do say it's inside a hostel, and
  do answer whether non-guests get in.
- **A detector** in the tray you already read, that only fires on venues that
  actually are one — a bodega's entry can say "dorm" and mean something else.
  It reports drift *and* the missing public-access fact.
- **And the stage before the writer** — see below, because that's where your
  next question landed.

---

## 3. "Aren't nightlife being written by OpenAI?"

Short answer: **no, the prose is Claude's.** But the question was a good one and
the real answer is more useful than the short one.

The draft pipeline runs three model stages:

1. **OpenAI** plans the search queries — no reader sees this
2. **OpenAI structures the raw research into point-form notes**
3. **Claude writes every paragraph, from those notes**

then OpenAI extracts the At a Glance *values*, and OpenAI *flags* awkward
phrasing which Claude then rewrites.

On a nightlife entry, OpenAI writes **exactly two fields**: `priceNote` and
`accessibility`. Both are extraction rather than writing. Everything you've been
reading — desc, whoFor, bestTime, before/after dark, the Reality Check, the
crowd line, the Gemlyx Find — is Claude. There is no OpenAI fallback inside
`askClaude`; I checked, because that's the shape that would have made you right.

### But stage 2 is the one that matters, and nobody could see it

Claude writes from notes **OpenAI chose**. It cannot put back a fact the
organiser threw away. For a hostel bar the research is overwhelmingly about
beds, so the notes come back organised as Rates, Check-in, Rooms, Breakfast —
and the most conscientious writer alive then writes a hostel review.

That's why the lodging steer had to go into **both** prompts, worded for what
each stage is doing: the writer is told what the subject is, the organiser is
told what to keep. That fix would have been useless in the writer's prompt alone.

### And why you had to guess at all

That's the actual defect here. Every other origin in this app is recorded and
shown — a price carries `__priceSource`, a date `__dateSource`, a travel time
`__journey`, and provenance.js prints them. **Which model wrote this sentence was
the one origin nothing recorded**, so the only way to answer it was to read the
prose and infer from voice, which is what you did.

`utils/modelProvenance.js` now answers it, in the tray beside the others:

> WHO WROTE THIS: the prose is Claude's. 2 values were read out of the research
> by OpenAI rather than written — priceNote, accessibility — and OpenAI also
> chose which facts survived into the notes Claude wrote from, which is the
> stage that decides what an entry ends up being about.

It's **derived** from glanceExtract.js's own constants, never a second list — a
field that moves between models moves here in the same commit or it doesn't
move. And the suite pins the headline claim: if anyone ever routes the schema
prompt through OpenAI, an assertion says so by name.

---

## Two mistakes, both caught

**A name collision the suite found for me.** `venueStyle.js` exported
`STYLE_COVERAGE_MIN` and so does `foodStyle.js` — two modules exporting one
constant is how a later import silently picks the wrong threshold. Renamed.

**An assertion that took the wrong call site.** I checked the notes rule was in
the OpenAI call by finding the *first* `askOpenAI(` in a 1.6MB file rather than
the one the string sits inside — and then anchored on the *import* line rather
than the use. Both fixed; it now asks the real question, which is "the nearest
preceding call is the OpenAI one".

**Twelve mutants across the three files, every one dead by name** — including
putting "nightclub" back on the casual list, ungating the filter, letting the
hostel detector fire on any venue, and claiming the writing stage for OpenAI.

---

## What's waiting for you

- **Set `venueStyle` on Hive** in Studio → the Style filter appears.
- Eight attraction rows still say nothing about price (this morning's sweep) —
  worth a pass while you're in there.
- `vesterbro-minigolf` says "Free entry". Minigolf usually isn't.
