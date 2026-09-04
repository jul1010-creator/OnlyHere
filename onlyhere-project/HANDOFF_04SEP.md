# HANDOFF, night of 3/4 September 2026

Suite **12,478 passed / 0 failed** (from 12,254). Build clean. Every fix
mutation-tested: reverted one at a time, each mutant dying by name.

All 21 changed files are written to `onlyhere-project`. One is NEW rather than
overwritten: `src/components/BlogBody.jsx`. Without it the nightlife town page
and the workshop page will not build.

Three parts. Part one is the bugs I put in the code this session, because that
is the part that matters most. Part two is the ten navigations nobody had
audited. Part three is what is still open.

---

# PART ONE: what an independent review found in my own work

I asked for an adversarial pass over everything I changed tonight. It found
**eight defects**, five of them regressions I had introduced within the previous
two hours, two of them assertions of mine that could not fail. I had already
found a ninth myself. Every one is fixed and pinned.

## 1. The placeholder change that made the whole street fix inert

The worst of them, because it silently switched off a fix I had spent an hour on
and reported as done.

Earlier in the session I changed the Studio placeholder for bar streets and food
streets to read *"Street name only, e.g. Gothersgade, the town goes in its own
field"*. **There is no such field at draft time.** The Studio form has one input.

So `draftTown` came back empty (`townKeyFor("Gothersgade")` is null), `subject`
collapsed to the bare name, and every consequence followed:

* all four nightStreet queries went out as *"Gothersgade Denmark best night to go
  busy quiet which end"*, the exact sentence my own comment calls "a search about
  no particular street on earth"
* the OpenAI query planner never received the parenthetical telling it to keep the
  town, because that is gated on `subject !== name`
* the Perplexity identity check degraded to "this street in the town named above"
  with no town named above

Fixed by putting the town back in the placeholder. The render-time
`bareStreetName` repair added earlier in the session is what makes that safe now:
a street row named "Jomfru Ane Gade Aalborg" still matches its own bars.

**The lesson is the one this repo keeps writing down.** I verified the fix by
reading the code path with a town in hand. I never asked where the town comes
from on a first draft.

## 2. `fold()` maps ø to "o"; `hostMatchesName` maps it to "oe"

I found this one myself, reviewing before handing over.

My new guard on `hostMatchesName` compared `distinctiveWords(name)`, which returns
**folded** words, against a domain flattened with the function's own normaliser.
`fold` gives `mogeltonder`. The domain gives `moegeltoender`. Neither contains the
other, so **a real operator's own site would have been refused** for any name with
a Danish letter in it.

Every existing assertion passed, because not one of them had a Danish letter in a
name long enough to reach that branch. There are now four that do.

Two normalisers, opposite conventions, one comparison. Worth grepping for: the
same shape exists between `streetKey` in `placeChoice.js` (uses `fold`) and the
street spelling variants in `nightlife.js` (deliberately spells ø both ways).

## 3. A bar street rendered as a card you could tap that did nothing

Adding streets to `lookupRealPlace` made them "real" stops in a guide. The
clickable filter in `GuidePage.jsx` read `_src !== "craft"`, a list of what
cannot be opened, written as its opposite and kept in a second place. A street
passed it, drew with a pointer cursor and a "Read more", and the dispatcher had
no branch for it.

The comment directly above that dispatcher promised this could not happen.

Both copies of the dispatcher now derive clickability from the dispatcher itself:
`canOpenStop(real)` is true if and only if there is a setter for that `_src`.
Adding a kind to a pool without adding it there now makes a card quietly
non-clickable rather than falsely clickable.

## 4. Two assertions of mine that could not fail

The connective check asked `questionWordsFor(t)` whether it contained any of ten
words. All ten are in the filter that function applies. **The assertion restated
the filter's own definition.** Probed with a deliberately poisoned vocabulary, it
stayed green.

Its sibling was the same shape. Both are now asked of the RAW vocabulary, and the
filter is probed with real input through a split-out `questionWords(raw)`.

There was a third: I asserted `>💡 {item.tip}` appears zero times. The guard is a
prefix, so the substring survives the fix. It passed on broken and fixed code
alike. It is a ratio now: every render of the tip must be guarded.

## 5. And I reintroduced the exact leak I had fixed an hour earlier

I widened `nightStreet`'s `QUERY_WORDS` to *"barer klokken lukketid udeligger
gaden bars closing time which night"*. **"time", "which" and "night"** are
ordinary English that appears on any page ever written, which is the whole reason
the filter I had written that same hour exists.

One encyclopedia snippet about when the street was laid out was enough to switch
`subjectUnsourced` off entirely for bar streets. `udeligger` is not a Danish word
either.

The check that should have caught it was finding 4 above. Now the ban is derived
from the filter set itself, so adding a word forbids it in every vocabulary in
the same edit.

## 6, 7, 8: the rest

* **`streetKey` did not strip the country.** "Gothersgade, Copenhagen, Denmark"
  reduced to `gothersgade denmark`, so the street's own Google listing was
  refused. That is Google's own formatted-address shape and this app's own
  `mapHint` convention, so the form most likely to arrive was the form that
  failed.
* **`studioTown` is the name box, not a town.** It was the last fallback in the
  corroboration slot, so a street with no town yet was corroborated against its
  own name. Harmless before I added `theNameIsAStreet`; the flag made it the only
  route through. Now `draftTown` or nothing.
* **The new unwired-helper scanner had four blind spots**, one of which hid
  **40 of the app's exported arrows** (`[^)]*` closes at the first paren, so any
  default value containing a call was invisible). `exportedArity` in the same file
  had already been bitten by that and solved it with `paramsAt`. I wrote mine the
  same day and did not reuse it. Comments also counted as calls.

---

# PART TWO: the ten navigations

## The one that could delete your writing

`characterAndFit`, `whatToDo` and `gettingThereReality` appeared in neither list
in `checkScope.js`, so `checkModeOf` returned the `report` default for all three.
**Town was the only one of the ten types whose whole body was checked that way.**

Under report mode an UNVERIFIED finding is admissible and the auto-corrector is
told, in capitals, *"IN PROSE ... unverified means NOBODY WROTE THIS ANYWHERE.
DELETE THE SENTENCE."*

`characterAndFit` is defined as "say honestly who this town suits and who it
doesn't". A judgement is written down on no page by construction, so every
sentence of it is unverified. It is also the card-preview text.

This is the Old Irish Pub deletion bug, still live on the one type you have said
is good. All three are characterisation fields now, and the suite asserts that
**every field landing in a paragraph is classified by name** on one list or the
other, rather than falling through to a default that is safe for a value and
backwards for a paragraph.

## Prose that reached nobody

Three cases of the pipeline researching, drafting, fact-checking, paying for and
publishing words that no renderer drew:

* **A nightlife town's entire body.** The prompt asks for 230 to 330 words across
  Who It's For, After Dark, The Reality Check and three bullets. The page drew the
  photo, the name, the description and the Gemlyx Find. Roughly four fifths of the
  type's word budget, invisible. The suite's own *"the publish path carries a
  verdict for every type"* passed the whole time, because the verdict was in a
  body nothing showed.
* **An essential's visitor note**, which `studioContent.js` calls "often the whole
  point: a system that needs a Danish CPR number is the wrong answer for a
  visitor". A visitor read a friendly how-to for a service they cannot use. It is
  drawn as an amber "If you are visiting" panel now.
* **A workshop's photo and its credit.** The only `<img>` on the whole workshop
  page was inside the body. A photo you upload showed on the grid card and was
  replaced by a 72px emoji on the workshop's own page. The credit is the more
  serious half: `studioContent.js` calls a missing one "a licence breach and not
  a cosmetic gap".

The nightlife town page needed a body renderer and there were already two, so
rather than write a third I extracted `src/components/BlogBody.jsx` and pointed
the workshop page at it too. `DetailPage` keeps its own for now: it is the main
reader path and carries photo credits, live info and save state. Three down to
two; the last merge is still owed.

## Things that were not sentences

* **A boolean printed as prose.** `transportWarning` is stored as `!!value` and
  the workshop page printed the value. React renders nothing for `true`, so every
  hard-to-reach workshop showed an amber box headed "NO CAR OR BIKE? READ THIS"
  with nothing under it. It now writes the nearest station and travel time, with
  an honest fallback.
* **A bare lightbulb.** `💡 {item.tip}` with no guard, on a field stored as `""`
  when the draft omits it.

## Lists that had fallen behind

* **`PRICE_FIELD_BY_TYPE`** had no entry for `night`, `nightStreet` or
  `essential`. `priceNote` was added to bars because you asked "Where are the
  prices?", and the "COULDN'T FIND A REAL PRICE, KNOW IT? FILL IT IN" panel never
  appeared for one. `nightTown` stays out on purpose: no price field to write into.
* **`BODY_FIELDS`** listed seven fields and missed eight, and the eight were the
  prose of the four types that carry bullets alongside it, which is the whole set
  the restatement check exists for. Measured: a free draft whose three bullets
  were verbatim copies of its own paragraphs scored zero restatements.
* **`tip`, `crowd` and `visitorNote`** were in no prose audit and could not be
  named in an edit. All three are reader-facing prose on a card, so the blogBody
  derivation was never going to point at them. They are named explicitly now,
  with what renders each one.
* **The paste-ready codegen** dropped `bookingNote` off an attraction and
  `venueStyle` off a bar, and invented a `kind` for an essential that the publish
  path leaves empty.

## The prompts taught the fault the sweep reports

Five of the ten SHAPE-ONLY EXAMPLES modelled an em dash inside the JSON the model
is shown as its rhythm reference: *"There's nowhere to sit — this is a grab-and-go
stop."* The model copies it, `stripDashes` turns it mechanically into a comma
splice, and the row then scores a **high**-severity voice finding in the published
sweep.

The suite enforced the ban on `STUDIO_VOICE` and never read the ten per-type
prompts. All thirteen dashes inside example JSON are rewritten. The assertion
reads the example only, not the instruction prose around it, because the
instructions legitimately quote the character in order to ban it.

---

# PART THREE: still open

## Asked for and not finished

1. **The essential pre-check still asks place-shaped questions.** I removed the
   festival question from the fallthrough, but it now asks *"exactly where it is,
   when it is open, how a visitor gets there"*. A ticket app has no address, no
   door and nowhere to travel to. It needs its own arm asking the three things
   that matter for the type: is it current, is it resident-gated, what does it
   cost in DKK.
2. **`previewPools` still omits bar streets, nightlife towns and essentials.**
   I did `lookupRealPlace` only, because at the time the click routing could not
   open a street. It can now, so this is unblocked.
3. **A general codegen-vs-publish FIELD parity check.** The heading parity check
   exists and is derived. The field one is not: extracting an object literal out
   of a template string is fiddly enough that a scanner I could not falsify would
   be worse than none. I fixed the two real gaps by name instead.
4. **The third blogBody renderer.** `DetailPage` still has its own.

## The unwired-helper list

`tests/run.mjs` now carries `KNOWN_UNWIRED`, **76 named exported functions that
nothing calls**, checked on every run and failing in both directions: a new one
is a bug, and removing one from the codebase without removing it from the list is
also a failure, so the list can only shrink.

It is not a to-do list. Some are diagnostics kept for the suite. But two clusters
are worth your eye:

* **`placeChoice.js` has five of them**: `needsChoosing`, `choicesFor`,
  `describeChoosing`, `applyChoice`, `choiceNote`. That is the whole "which place
  did you mean" chooser, built and wired to nothing.
* **`evidence.js` has two** and no callers at all.

## Long-standing, reported before and still open

`popularityTag` printing "○ Common Attraction" when empty; three tier
vocabularies with an unrecognised tier rendering green; two "Gemlyx Find" blocks
on a town page; the stays link searching `accommodationGlance`;
`checkScope.js` dropping unverified fields; the unconditional AUTO-CORRECTED
banner; the Rejseplanen deep link; `BOOKING_AFFILIATE_ID` empty;
`SUPPORT_TABLE.sql` and `gemlyx_user_data` not created.

---

# How to run it

```
node --max-old-space-size=3072 tests/run.mjs     # plain `node` runs out of memory
npx vite build
```

You should get 12,478 / 0.

## Two new cross-file imports

Both are new tonight and neither creates a cycle, but they are what to look at
first if something resolves oddly:

* `correction.js` imports `PROSE_FIELDS` from `entryAudit.js` instead of keeping
  its own copy. The two lists answered the same question for the same entries and
  each had fallen behind separately. Only the structural keys (`blogBody`,
  `intro`, `body`) differ now.
* `helpers.js` imports `fold` and `GENERIC_PLACE_WORDS` from `danishNames.js`,
  which imports nothing at all.

## One naming note

`entryAudit.js` exports `EVERYDAY_WORDS`, not `FILLER_WORDS`. `helpers.js`
already exports a `FILLER_WORDS` and it answers a different question: that one is
the AI-writing tells a draft must not USE, this one is the ordinary words that
cannot vouch for a page. The bundler caught the collision on its first run, which
is the collision this repo had already written a warning about.

## What I could not check

**The live gemlyxtravel.com.** It is a client-rendered app, so fetching it
returns the shell, and I cannot drive a browser to an external URL from this
session. I built the current source locally and rendered that instead, which is
the better test of tonight's changes anyway: no page errors on any route, and the
render fixes verified with injected fixture rows for all four affected types.

If you want the live site checked, that needs your Chrome with the extension
connected, or a look yourself.
