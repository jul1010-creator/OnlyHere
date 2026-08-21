# Gemlyx, 21 August

Everything below is on disk in `onlyhere-project/`. **8347 assertions passing**,
up from 8239. `npx vite build` clean. **Nothing is committed to git**, on your
instruction. Eleven files changed:

    src/utils/arrival.js          src/components/GuidePreviewScreen.jsx
    src/utils/previewMatch.js     src/components/StudioAssistant.jsx
    src/utils/tripEvents.js       src/App.jsx
    src/utils/journey.js          tests/run.mjs
    src/utils/provenance.js       src/utils/previewReport.js
    src/utils/factCheckCopy.js    (new)

## Do this first

**Open Studio, draft anything, and press the new 🔍 Copy for a fact-check.**
Paste it somewhere and read it before you send it to Gemini. If the shape is
wrong I would rather change it now than after you have used it twenty times.

---

## The copy button, which is what you asked for

> "then make a 'copy' option. So I only copy what I need to have fact-checked by
> Gemini." And: "Because I usually copy the whole draft."

`utils/factCheckCopy.js`, and a second button above the existing one in Studio.
It reads the EDITED box rather than the original code, so the checker argues
with the draft as it now stands.

Three blocks, and the middle one is the point:

1. **CHECK THESE CLAIMS.** Every written field, labelled in reader language.
2. **DO NOT CORRECT ANYTHING BELOW THIS LINE. It was measured, not written.**
   The journey, leg by leg with the vehicle Google returned, and the ticket
   price with the page it came off.
3. **OUR OWN CHECKS ALREADY FLAGGED THESE.** Whatever is in `__notes`.

The middle block is there because of your 16 August report: *"I asked gemini..
apparently it was correcting stuff that didn't need correction, because it was
already true."* A checker with no idea which figures are measured argues with
the measured ones. With them in front of it, it stops guessing and starts
comparing, and your Gilleleje draft is the proof: the prose says `bus 950R` and
the measured leg six lines below says `train 950R`.

Emoji, themes, coordinates, `__sources`, `__journey` as raw JSON and the rest of
the plumbing are not in it. Sources are named as hosts rather than pasted as
eight full tripadvisor URLs.

**One thing I changed after a review found it.** The first version printed
`travelTime`, the coordinates and the nearest station under "do not correct",
unconditionally. App.jsx has a branch that keeps the MODEL'S travel time when
neither transport mode returned a usable duration, and says so in its own run
log: *"This number is WRITTEN, not measured."* So the paste would have told
Gemini not to correct exactly the invented figures the tool exists to catch. Now
a figure goes under that heading only when the payload carries the record of the
measurement that produced it, and everything else is stated plainly under
"ALSO ON THE ENTRY, with no record of where it came from".

---

## The bus was already known, and now something compares them

Your Gilleleje draft carries the answer inside itself:

    "gettingThereReality": "...the A-line to Hillerod, then bus 950R into Gilleleje Ost"

    "__journey": { "legs": [ ...,
      { "vehicle": "train", "line": "950R", "from": "Hillerod", "to": "Gilleleje Ost", "mins": 32 } ] }

`travelTime` was even overruled from 🚌 to 🚂 by that same measurement. Gemini
was right about the transport and it is worth being exact about what that means:
it did not know something the pipeline lacked. It compared two things the
pipeline had, and nothing here was comparing them.

Every gate in this codebase reads one field at a time, which is its oldest
recurring shape. `lastLegProblems` compares the prose to the WALK.
`guideLogisticsProblems` compares DURATIONS to the legs. Not one of them looked
at the vehicle, and the vehicle is the part a traveller acts on: somebody who
reads "bus" stands at a bus stop.

`vehicleMismatches(prose, legs)` in `utils/journey.js`. No model, no network,
two strings and a comparison. Wired into the Studio glance gate (against the
draft's own `__journey`) and into the guide gate.

Narrow on purpose. Calling a metro a train is how people speak; calling a train
a bus sends somebody to the wrong platform, so it compares FAMILIES (road, rail,
water) and a disagreement inside a family is not a finding. A line needs a digit
in it to be matched at all, because line A of the S-tog is a real line and "A" is
the commonest word in English.

---

## The preview that had nothing to do with the chat

> "Clearly the preview has NOTHING to do with the chat, at all. Because the chat
> sounds somewhat reasonable. However the preview? Absolute made up chaos."

Ribe, the Comic Con and the Copenhagen bar in your Aalborg nightlife list were
one bug wearing three coats, and the coat is always the same: **something the
APP said, read back as something YOU said.**

### 1. Your chat never captured Aalborg at all

`arrivalPoint` reads three things: which airport, which foreign city you came
from, which Danish port the ferry docked at. "I am going to Aalborg" is none of
them. So the trip had no anchor, `from` was null, `reachBand` was never called,
and the distance term in the town ranking scored a flat 1 for every candidate in
the country. Ranking then collapsed to editorial tier, and a "Can't Miss Out"
town wins from anywhere in Denmark.

Gemlyx said the quiet part out loud in its own reply: *"Since you haven't
mentioned a starting point, I'll assume you're landing at Copenhagen Airport."*
It had to assume, because nothing was reading the town you had named in the
sentence before.

`destinationPoint` in `utils/arrival.js`. A destination verb, then a resolvable
Danish town: going to, heading to, a trip to, seven days in, staying in, we are
already in, visiting. Deliberately NOT "the bus to Skagen", which is a leg of a
trip rather than the trip, and which is usually a sentence Gemlyx wrote.

### 2. The region came out of Gemlyx's own reply

You named no region. Gemlyx did, twice, in the sentence after yours: *"that's
proper North Jutland arrival"*. `regionsNamed` read "Jutland" out of the app's
own words, Ribe is in Jutland and tiered Can't Miss Out, and the region pass
opened. **The app suggested a region to itself and then filled half the screen
from it.**

Same shape as the interest reader in `tripBrief`, the theme reader on the
preview screen, and the arrival reader above, all of which already carried the
rule in writing. `matchedPlaces` now takes `saidByTraveller` and reads regions,
arrivals and the destination from your turns alone. Place NAMES still come from
the whole conversation, because that is a different question and the file says
which is which.

The suite asserts both directions: read your turns and Ribe is gone, read the
whole transcript and it comes straight back.

### 3. An event was a day, never a place

`tripEvents` scored on named, interest, tier and date overlap. Not one term was
geographic, so nothing had ever asked where the Comic Con was.

Reach now sits directly under "they asked for it by name", and an event is
measured as ONE DAY however long the holiday is: `reachBand` widens with trip
length, which is right for a town you sleep in and wrong for a convention you
have to get back from. Aalborg to Copenhagen is comfortable across a week and
most of a day each way for a convention.

**Not deleted.** A stretch stays on the screen and stays tickable, because a
four hour train is your traveller's call to make. What it loses is Gemlyx's own
badge. "And Comic Con? Really?" was a complaint about the word RECOMMENDED, not
about the row existing.

### 4. Events, no later than two months

From the trip's own dates when we know them, from today when we do not, which is
your answer to "two months from when". A dated trip never reaches the constant,
because its own window is a better bound than any number. An event you named by
hand is exempt, exactly as it is exempt from the cap.

The screen had no upper bound at all before this. Every date test in the file was
one sided, so a convention in 2031 was a live recommendation.

### 5. Major only, where there are a lot

The field already existed and nothing read it. Every festival published through
Studio carries `__scale`, written Major or Local from the drafting prompt, and
`majorEvents` is a separate array that `previewPools` flattened in with the same
`_src`. "Major" was recorded twice over and conferred nothing.

Thinning happens only above four events in one town, only when that town has a
major among the ones still on the screen, and never to something you named.

### 6. Out of reach is a different list

> "If they REALLY love Vikings, then put it into a 'consider' section."

Built, as **Worth considering, but a long way**, under the section it belongs to,
with the distance in the sentence rather than in a badge: *"About 204 km from
Aalborg, so it is most of a day each way. Here because you said History."*

The bar is the row's OWN tags answering an interest you actually stated, not a
word that happens to appear in both. A traveller who has said nothing gets no
detour, and the block only renders when there is a real list for it to sit
beside.

---

## The four small ones

- **"Takes a few minutes"** is gone. That line lived under the button twice,
  first promising seconds. Both were wrong about which screen the button opens.
- **Every attraction card now names the area above the name.** The town is
  already on the row under five different field names depending on content type,
  which is why nothing had ever printed it. `parentTownOf` knows all five.
- **The reader no longer gets the verification trace.** `StudioAssistant` is the
  same component in two roles, told apart by `studioMode`, and
  `describeProvenance` was appended either way. So the founder's block, headed
  WHERE THIS ANSWER CAME FROM and followed by seven raw URLs and a line that can
  read "asserted by the founder, not source-verified", was shipping to a paying
  visitor. It now takes an `audience`, and a reader gets one sentence: *"This was
  not in the entry, so I checked just now, on tripadvisor.com, dac.dk."* The
  widget was already rendering a badge and named host chips two pixels below it,
  so the wall of text was a worse duplicate of what the chrome already said.
  Studio loses nothing.
- **The bus versus train check**, above.

---

## What a review found in my own work, all fixed

You asked for a check through for bugs I might have made. An adversarial pass
found eight, and every one is now an assertion:

1. **The thinning rule deleted the events section.** It ran before the date
   tests, so publishing one Major festival in Copenhagen dropped the local one
   that was actually on that week, and the Major was then dropped for not
   overlapping. Empty screen on a trip that had an event in it, on the exact
   brief the file was written for. It runs on the survivors now.
2. **The new reach filter emptied the towns section.** A traveller whose own
   town has no published row, plus three that only Gemlyx named and that are all
   far, left nothing at all. It is a preference with a floor under it now, like
   every other reach decision in the app.
3. **A town Gemlyx named was worse off than one it never mentioned.** `seen` was
   written before the skip, so a far town it happened to mention was blacklisted
   from the region pass and the detour list too. Mentioning Ribe made Ribe
   vanish.
4. **The vehicle gate was dead on the guide pipeline.** The guide's legs are a
   MAP keyed `origin|dest|mode`, not an array, and my `Array.isArray` guard made
   it silently pass an empty list on every guide ever built. The gate existed,
   ran, and could not fire. Same class as everything else in this file.
5. **Æ, Ø and Å at the start of a name were invisible.** Without the `u` flag,
   `\b` is defined by ASCII, so there is no boundary between a space and Æ.
   "going to Ærøskøbing" matched nothing.
6. **The horizon edge rolled over.** 31 December plus two months is 31 February,
   which JS turns into 3 March. Clamped.
7. **The single town badge read "0 km from Aalborg"** on the Aalborg card, which
   is now the commonest screen there is.
8. **The paste vouched for figures nobody measured**, described above.

---

## Three things I could not settle, and want you on

**1. The reach curve is generous, and it is not what saved you from Ribe.**
`reachBand` with no stated transport calls 204 km "comfortable" on a seven day
trip and a "stretch" on two. So on your actual brief, the thing that kept Ribe
off the screen was the region source, not the distance. If you think a four hour
train each way should not read as comfortable, that is one constant in
`routeOrder.js` and it moves every route in the product, which is why I have not
touched it.

**2. I could not find the sentence you quoted.** "Ribe? Easy to access through
public transport?" does not appear on the preview card, which shows
`characterAndFit` and no travel figure at all. It is either on the Read more
page, in the plan, or in the chat. Tell me which screen and I will fix the
sentence itself; I did not want to guess at prose I had not read, on your own
rule about verifying before correcting.

**3. `townPointFor` does not know Århus, Ålborg or Ærø.** It resolves
København and Copenhagen to one point and has no such folding for the Å
spellings, which are the declared variants of two of the largest towns in the
country. Every reach test quietly stands down for a traveller who types Århus.
It is a shared lookup used everywhere, so I left it for you to see first.

---

## Still open

1. **Commit.** Nothing is in git. `.git` sits at `OnlyHere\`, one level above.
   Last commit was 20 Aug at 16:53, so today's image reader and office check are
   uncommitted too.
2. **The rest of your file**, none of it started:
   - The account page: yellow button becomes Sign in, underlined becomes create
     an account, and the question flow behind it. Note one conflict to settle
     first: `profile.js` deliberately stores an age BAND and not a birthdate, and
     your list says "Born". The existing profile also has no interests and no
     transport field at all, and the three fields it does have reach the chat
     prompt but only three of six are ever ranked on.
   - The chat voice, and the PDF. Say the word and we will do that block
     together; I want to read it next to the current system prompt.
   - Gemlyx stopping mid reply, and the party being required before it builds.
   - `typicalCosts`: your call was to drop it on towns and keep the real number
     on a single place. Not built.
   - The uncertainty rule: reader-facing facts get extra reads past the current
     limit, with a per-draft ceiling. Not built.
3. **Themes.** `design` and `market` are in `PLACE_THEMES` and are NOT in the
   town drafting prompt, which lists seven of the nine words. No town drafted
   since they were added can carry either, which is most of the answer to "how
   do you calculate what is history, nature, art and food". Copenhagen has one
   theme because the prompt says "Pick fewer rather than more" and nothing on the
   write path checks the answer against the entry's own text.
4. **From the 20th:** wire `eventLocation` into the festival research step,
   demote the travel slop domains, must-see ordering, the Danish dish type,
   `libraryContext.js`, and the Perplexity half of the trace.
5. **From the 19th:** Stadia domain registration, RLS on `gemlyx_guides`,
   `coordFitsTown`'s 50 km tolerance, the statutory prohibition filed as a soft
   tip.
