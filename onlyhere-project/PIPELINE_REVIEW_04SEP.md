# PIPELINE REVIEW, 4 September 2026

A review of the five Studio runs of 05:26 to 05:42 (Amalienborg Slot, Ø Festival,
Samsø, Faxe Kalkbrud, Kolding Gin Festival), checked against the code and against
the live pages the pipeline read.

Two claims the pipeline made are false, and I verified both by fetching the pages
myself. Everything else here is a mechanism, a mis-report, or a trace.

---

# PART ONE: two things the pipeline told you that are not true

## 1. Kolding Gin Festival: "entry is free". It is not.

Steps 19, 27 and 40 report *"koldingginfestival.dk says entry is free"*, and step
27 escalated it to a gap worth acting on:

> Free is an answer a reader plans around, and leaving it out reads as unknown.

I fetched the site. It states **no ticket price at all**. It is a paid gin
festival: 150+ gins, Brændkjærhallen, two sessions (12:00 to 16:00 and 17:00 to
21:00), with a "Køb billet" button and no figure beside it.

Acting on that gap publishes free entry on a paid event. The date the same run
confirmed (12 September 2026) is correct.

## 2. Amalienborg: "90 DKK in presale". Wrong number, wrong condition.

Step 15 reports *"90 DKK in presale"*, and steps 21 and 33 used it to tell you the
draft's figures needed checking.

The operator's own page (denkongeligesamling.dk/amalienborgmuseet/planlaeg-dit-besoeg/)
states:

| Figure | Who |
|---|---|
| 125 kr online | adults |
| 135 kr i døren | adults |
| 80 kr online | students |
| **90 kr i døren** | **students** |
| 116 kr | groups of 10+ |
| 345 kr | Slotspas, 3 castles |
| free | under 18 |

The draft had 125, 135 and 345. **All three correct.** The 90 is the student rate
AND the at-the-door rate, so the label is not merely wrong, it is inverted.

That one number then did four things:

1. produced a FOUND A GAP twice (steps 21 and 33) against a correct draft
2. contributed to the invented-claim check flagging 125
3. made the correction delete the correct 135 (compare step 20's price list with
   step 32's)
4. made "Did the correction land" report FAILED because 125 survived, with the
   loudest banner in the app, on a draft that was right

---

# PART TWO: why, in the code

Both come from `ticketPriceOn` in `utils/entryAudit.js`.

## The swallowed full stop

`sentenceBefore` (entryAudit.js:966) cuts the window at the last `.`:

```js
const cut = Math.max(w.lastIndexOf("."), w.lastIndexOf(";"), w.lastIndexOf("!"));
```

Danish price pages write **"125 kr."** with a period. So on the line

```
Studerende: 80 kr. online / 90 kr. i døren
```

the window before the **90** is `" online / "`. Two consequences, one cause:

* `CONCESSION` never sees "studerende". The word IS in the pattern
  (entryAudit.js:932); it is outside the window. So the student rate is not
  marked a concession, `open` keeps it, and the lowest-payable rule elects it as
  the headline price.
* `whenSold` sees "online", left over from the **previous** figure, and stamps
  `when: "in presale"` on a figure whose own words are "i døren".

The comment above `conditionAround` already names this trap for `afterWindow` and
calls it "latent because presale wording is rarer than fee wording". It is not
latent on the before-window: `kr.` is the most common token on a Danish price
page, so every second figure in a two-price concession line loses its label.

The file's own comment at :963 says newlines are deliberately not a boundary
because breaking there "would strip every label off every figure, which is the
opposite failure and a worse one". The period is doing precisely that.

**Fix shape:** do not treat a period as a sentence end when it is part of a
currency abbreviation. `kr.`, `DKK.`, `ca.`, `pr.` and `inkl.` are the ones that
appear on these pages.

## A bare "gratis" anywhere on the page means the door is free

`saysFreeIn` (entryAudit.js:1032) tests `FREE_PHRASE`, which matches a bare
`gratis` with optional " adgang" / " entre".

Amalienborg's ticket page has no prices at all, so `found.length === 0` and the
function falls through to this branch. The page says
*"Børn og unge under 18 år har gratis adgang"*. That became "says entry is free".
Kolding almost certainly matched a stray `gratis` in the newsletter or footer
block on the same fall-through.

`utils/entryPrice.js` already has the correct rule, written against your own
Legoland case:

> Every one of those is TRUE, and not one of them says the place is free.
> Legoland is a 419-krone theme park whose ticket line happens to mention the
> under-2s. [...] an UNQUALIFIED free claim is a free attraction. Anything else
> is a fact about somebody or something else.

`isUnqualifiedFree` implements it by subtraction and would refuse both pages.
Two files answer the same question with opposite rules, and the pipeline's page
reader uses the one without the rule.

**Fix shape:** `saysFreeIn` calls `isUnqualifiedFree`.

---

# PART THREE: the last gate is failing on drafts that are fine

"Did the correction land" FAILED in three of the four runs that reached it. Two
of the three are false alarms, for one structural reason.

```js
// utils/correction.js:165
export const MEASURED_FIELDS = ["travelTime", "ticketStatus", "website", "nearestStation", "lat", "lon"];
```

The At a Glance fields the extractor pulls off a page are not in it, so
`writtenFields` (App.jsx:643) hands them to the invented-claim checker as if the
writer wrote them.

* **Run 1's surviving claim** is `accommodationTip` = "Kolding Hotel Apartments,
  fully equipped holiday apartments...". That is verbatim the run's own DECISIONS
  entry.
* **Run 5's surviving claim** is "125", from `extraCosts`, which the price gate
  had confirmed in the same run.

Your DECISIONS block states the rule every single run:

> At a Glance is data. A value stated on a page beats one composed by a writer,
> and a value nobody stated stays empty.

Everything downstream of `glanceFieldsFor` treats it as prose: the checker judges
it, the corrector is asked to rewrite it, and the landing check counts it as a
survival. Run 2's failure ("rim walk", "Quarry access is free every day") looks
like a real corrector miss, so the gate is not useless, it is drowning.

**Fix shape:** the glance fields are extracted, not written. Either add them to
the set `writtenFields` subtracts, or give them their own exemption with its own
name, since "measured" is not quite what they are.

---

# PART FOUR: the log is quieter than the run

## The echo check reports a hit as "found nothing"

App.jsx:6699:

```js
outcome: echoes.length ? "empty" : "ok",
```

`empty` renders as "found nothing" (runLog.js:205) and feeds the header count.
Run 5 found a 15-word verbatim run in `accessibility` and the step badge says the
check found nothing, inside a header reading "10 found nothing".

The vocabulary already has the right value. `OUTCOMES` includes `found`, which
prints **FOUND A GAP**, and runLog.js:198 says why it exists:

> FOUND is shouted like FAILED, because it is the line he has to act on and it
> was previously the quietest line on the page.

The founder note is fine (`describeEcho` still writes "WORDING SHARED WITH A
SOURCE"). Only the step status is inverted. One character of a ternary.

## An unlogged middle is invisible by construction

```js
// runLog.js:173
const unlogged = ms != null && ms > lastAt ? ms - lastAt : 0;
```

That measures the **tail** only. The OpenAI research-structuring stage and the
Claude writing stage (App.jsx:5626 and :5674) call `note()` never, in any run,
and they are the two most expensive calls in the pipeline. The gap shows up as:

| Run | Gap | Share of run |
|---|---|---|
| 1 Kolding | 61.7s to 155.7s = 94s | 53% |
| 2 Faxe | 33.1s to 159.9s = 127s | 59% |
| 4 Ø Festival | 108.0s to 232.8s = 125s | 46% |
| 5 Amalienborg | 52.0s to 172.0s = 120s | 50% |

In those four it sits between two logged steps and shows only as a jump in the
`at` figures. In run 3 it landed at the end, so the detector could see it and
printed NOT RECORDED, 72%. Same hole, different position.

The file's own comment says the rule (:169):

> A STEP NOBODY INSTRUMENTED IS NOT THE SAME AS A STEP THAT DID NOT RUN.

## Run 3 ran no gates at all and the header says "0 failed"

The Samsø log ends at "Source order" (step 23, 59.5s) of a 209.9s run. No price
gate, no invented-claim check, no correction, no landing check. The header still
reads `19 ok, 4 found nothing, 0 failed`, because those counts only describe
steps that were recorded.

Worth finding out whether that draft threw (the `throw new Error("empty")` on a
town with no `characterAndFit` is one candidate) or published unchecked. Either
way, a run that ends early should say so rather than reporting a clean tally.

---

# PART FIVE: Amalienborg spent the whole run in Billund

Step 1 accepted Nominatim's *"Amalienborg Slot, Travbyen, Billund, Billund
Kommune"*, about 200 km from the palace. Everything downstream inherited it:
founder sources scoped to Sydvestjylland, `destinationtrekantomraadet.dk` (the
Triangle Region) consulted about a Copenhagen palace, and an arrival point of
"Logistik-Optimering v/Bo Trygve Mortensen" classified as a **ferry**.

## The guard is narrower than the precedent it cites

The 1 September fix added `settlementRefused` (App.jsx:2899), which refuses a hit
only when `geocodeIsASettlement(hit)`. A street in Billund is not a settlement, so
it passed. Because `coords` was then set, the Google Places branch fifty lines
down never ran at all: it is behind `if (!coords)`.

The comment introducing that guard names the right precedent and then applies
something narrower:

> Google's branch fifty lines below has refused exactly this since the Rungsted
> fix. This branch had `if (coords)`. Same failure, same cost.

Google's branch uses `listingMatchesSubject`. The Nominatim branch uses a
settlement test. Amalienborg is not the settlement case; it is the Rungsted case,
a real place of that name somewhere else in Denmark.

## And the one source that had it right was refused

Step 10 found "Amalienborg Palace" and `listingMatchesSubject` rejected it. The
chain:

* `sameSubject("Amalienborg Slot", "Amalienborg Palace")` fails the word
  subsequence test (`slot` never matches `palace`)
* it falls to `samePlaceName`, which calls `variantsOf(a)` with the default
  `includeSights: false`
* the pair `["Amalienborg Palace", "Amalienborg Slot"]` is in `SIGHT_NAMES`, not
  `PLACE_NAMES`

It is danishNames.js:243, in the block whose own comment reads *"Amalienborg is
the reason the list starts here"*. And :338 says *"somebody who writes
'Amalienborg Palace' has named the row filed as 'Amalienborg Slot', and losing
that is a"* loss.

So the unchecked geocoder won and the checked one holding the answer was thrown
out.

There is a deliberate reason matching avoids the sight table (:276, *"Matching
must not walk the sight table; searching should"*), and `matchVariantsOf` exists
as the matcher-safe accessor that walks it while dropping generics. Whether
`samePlaceName` should use it is a judgement call, not an obvious bug, so it is
flagged rather than assumed.

---

# PART SIX: the ticket link trace

Traced end to end, because a backfill sweep would join this chain.

| Hop | File | State |
|---|---|---|
| Search queries | `ticketLink.js` `ticketQueries` | fine |
| Result vetting | `ticketLink.js` `ticketMatches` / `pickTicketUrl` | fine, refuses front pages, category pages and wrong places |
| Written at draft time | App.jsx:6614, :6628, :7016, :7164 | four writers |
| Survives publish | `studioContent.js:549`, gated on `isBookableTicketUrl` | fine |
| **Rendered to a reader** | **nowhere** | **no reader exists** |

`grep -rn "ticketUrl" --include=*.jsx src/` returns App.jsx only. No component
draws a ticket button. `ticketAgentOf` is exported with the comment *"Which agent
it is, for the render, which has to reach for the right template"* and has no
callers.

This is the same shape as the four cases in PART TWO of the 3/4 September
hand-off: the pipeline researches, vets, stores and ships a value that no
renderer draws. It belongs on that list.

**A backfill sweep would be the fifth writer of a field with zero readers.** The
render comes first.

## And the sweep registry test cannot see this field

```js
// tests/run.mjs:3512
const shapedKeys = Object.keys(shapeForLive(type, { name: "X" }) || {});
ok(`sweep "${sweep.id}" writes nothing shapeForLive would drop from a ${type}`,
   sweep.fields.every(f => shapedKeys.includes(f)));
```

The probe payload is `{ name: "X" }`. `ticketUrl` is carried conditionally, only
when `isBookableTicketUrl(t?.ticketUrl)` passes, so it is absent from
`shapedKeys` and a sweep declaring `fields: ["ticketUrl"]` fails this assertion
for the wrong reason. The same blind spot covers every conditionally-carried
field: `__hours`, `__dateSource`, `__sources`.

The rule the test protects is right and load-bearing (sweeps.js:55, *"A SWEEP MAY
ONLY WRITE A FIELD THAT shapeForLive ALREADY CARRIES"*). The probe is what needs
widening: give each declared field a representative value so the allow-list is
asked the real question, rather than loosening the assertion.

---

# PART SEVEN: smaller things

* The tiqets and ticketmaster direct searches ran 8 times across 4 runs and
  returned "none both bookable" every time, at roughly 2.5s each. Not evidence
  they are useless; evidence that draft time is the wrong and only moment they
  are asked.
* The "after the correction" twins cost nothing. Their timestamps are identical
  to each other (run 1: 176.5 to 176.6s), so they are local recomputation, not
  repeat provider calls. Working as designed.
* Run 1 read 956 characters three times from two domains, so
  `xn--brndkjr-nxae.dk/gin` and the festival site are one page counted three
  times. "1 of 7 pages read mention the subject" counts the duplicates.
* Run 3's step 2, "The measured coordinate was refused", logs an `asked` line and
  no `got` line.
* Run 5's step 8 accepted a logistics company as a ferry terminal and marked the
  step `ok`.

---

# WHAT I WOULD FIX FIRST

Ordered by whether it puts a wrong fact in front of a reader.

1. **`sentenceBefore` and the currency abbreviation.** One cause, two inverted
   answers, and it is what produced the Amalienborg cascade.
2. **`saysFreeIn` adopts `isUnqualifiedFree`.** The correct rule already exists
   one file away. This is the one that could publish "free" on a paid festival.
3. **Glance fields out of `writtenFields`.** Stops the last gate crying wolf on
   two drafts in five.
4. **The echo outcome ternary.** One character.
5. **A ticket link render.** Before any sweep fills more of them.
6. **The Nominatim guard.** Whether it adopts `listingMatchesSubject`, and
   whether `samePlaceName` should reach the sight table, are both yours to call.
