# Handoff, 26 September: how the accommodation builds

Batches 126 and 127. Both committed to your disk, both pushed by you, both verified live in the deployed bundle. 21,857 checks pass, tdz clean, render clean, build clean.

---

## The question that started it

> "So when the guide builds.. how does the accomadation build?"

Four stages, and they do not all know the same things.

**1. The chip writes a sentence.** The stay choice you tick puts its `said` line into the hidden intake turn. The guide writer reads it, so the document as a whole knows whether it is planning around a hostel bed, a hotel, a summerhouse or a booking you already hold. `src/utils/stayChoice.js`.

**2. The writer returns days and stops.** No beds at this stage.

**3. `enrichGuideDays` runs one AI call per day, all in parallel.** `src/App.jsx`, around line 14685. Each call first hits `/api/search` for that day's towns, asking for travel times plus hotel and hostel names and prices for the current month, then returns a JSON blob for the day containing `accommodation`, `stayArea`, `recommendedStay` and `nightFrom`. Every "Where to stay" line on the page comes from here.

**4. The price is checked against that day's own evidence.** `nightPriceFrom` in `src/utils/accommodation.js` discards any price whose quoted words do not appear in that day's search results with a currency and that number beside them. `bedsEstimate` in `src/utils/costLedger.js` multiplies what survives for the Costs block.

Two rules already sat on top: the last day gets no bed, because they fly home, and a night already booked gets no recommendation, only a sentence about getting back to it.

---

## What the tracing found

The per-day call was never told which chip was ticked. The only thing about sleeping that reached it was the budget panel's estimate sentence, and only when the panel is switched on. A family who picked a summerhouse would have been offered seven different town hotels, one a day, each with a price, for a week they are spending in one house on a coast.

### Batch 126

`enrichGuideDays` takes a `stayKind` now, and the call site passes `intakeStay`.

- **Day one** returns the AREA to take a house in: the stretch of coast or the village, which town it is near and how far, and that it is let by the week through a holiday-house agency. Never a hotel, never a hostel.
- **Every later day** returns an empty `recommendedStay` and one sentence about getting back to the house.
- **The last day** is excluded, so its own clause wins. Two clauses on one prompt, one saying "journey out" and the other "get back to the house", is the model being asked to write both.

The house is recognised by a `house: true` flag on the choice and a `stayIsHouse` reader beside `stayIsBooked`, not by comparing against the literal string `"summerhouse"`. A string compare over in App.jsx keeps passing its own tests and stops firing the day the key is renamed, which is how "still walkable" and the ferry recommendation both went quiet.

Two old assertions failed on the new signature. Both were pinning the whole argument list rather than the argument each cared about, so they are pinned by argument now. An assertion that breaks when an argument is added teaches the next reader to loosen the check instead of keeping the requirement.

### Batch 127, found live

With 10 to 17 October in the date fields and nothing else ticked, the summerhouse chip was marked on October prices while the sentence under it read **"105 to 287 kr a head a night"**, which is January's cheapest against July's dearest.

The split: `summerhouseFit` derives the season from the two dates. The sentence was handed `budgetEstimate.season`, which is a different value with a different job. That one is the season **the bed** was priced in, and it is null whenever no bed has been priced, which is exactly the state a traveller is in while they are still reading the row. Two readers of one value, the oldest fault in this codebase.

Both now read `houseReading({ travellers, arrival, departure })`, built once at the call site as `houseAsked` and handed to both. The party comes from the same place too: the verdict counted heads off the brief while the sentence took the panel's default of two, so a family of four could be marked on four and have it explained on two.

**And a second one behind it.** The rule for marking a house "recommended" was `house.low <= bunk.high`: the cheapest house against the dearest bunk. That is the same mixing the file refuses across seasons, done inside one season across the price spread. A pair in July came out recommended on a three kroner overlap, printed over a sentence reading 245 to 287 against 218 to 248. It compares middle to middle now.

| party | January | October | July | no dates |
|---|---|---|---|---|
| 1 | none | none | none | none |
| 2 | strong | recommended | **none** | **none** |
| 3 | strong | strong | strong | strong |
| 4 | strong | strong | strong | strong |
| 5, 6 | strong | strong | strong | strong |

A pair in July and an undated pair lose the mark, because July is a season they might be coming in and the weakest verdict is the answer. Everything else is unchanged, and every mark now agrees with the figures printed beneath it.

---

## Verified live

- Batch 125's four stay chips render: A hostel bed, A hotel, A summerhouse, Already booked.
- The Aalborg warning, the sommerhus chip text and the `perParty` branch are all in the deployed bundle.
- The summerhouse prompt clauses are in the bundle: `THEY ARE TAKING A SOMMERHUS`, `holiday-house agency`, `IT IS THE SAME HOUSE TONIGHT`, `Never name a hotel or a hostel`.
- The same October case that read 105 to 287 an hour earlier now reads **125 to 162 against 145 to 165**, on screen, in your Chrome.

`src/utils/tripBudget.js` is gone from your disk. The test that asserts nothing imports it stays, because that is the claim that matters and it holds for a clone that still has the file.

---

## Next

**1. Nothing has built a guide with a summerhouse ticked.** The prompt clauses are verified as text in the bundle, not as behaviour. A seven night Jutland trip for a family of four, summerhouse ticked, is the run that proves day one names a coast and days two through six recommend nothing. That is the first thing to do.

**2. The weekly price refresh you raised.** Still open. "Do you think it's worth having the AI rendering every week or something what the current average prices are?" My reading: the checked figures in the app are sourced and dated, and a weekly AI pass over them replaces a checked number with an estimated one. The staleness sweep below is the smaller version of the same idea and is worth more.

**3. Three things offered and not built:**
- The `kebabSaid` gate does not see the notes block.
- 11 of 12 Studio figures carry a `checkedAt` date that nothing reads. A staleness sweep would surface the ones going old.
- The app holds checked figures with sources for a dorm bed, a hostel room, a train hop and a street meal, and the AI is told none of them while being instructed to say plainly when it does not know a price. This is a judgement about your prompt rather than a defect, so it needs your call.

**4. Aalborg and Skagen.** The hostel chip now warns the planner that not every town has a dorm and names Aalborg. Nothing yet prices a town's real beds, and nothing yet points a Jutland trip at Novasol, which is the other half of what you said about Skagen.
