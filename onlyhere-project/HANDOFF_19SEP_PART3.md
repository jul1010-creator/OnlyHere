# Handoff, 19 September 2026, part three

Written for a fresh chat. **Read section 0 and section 1 and you can start
working.** Everything after that is why.

Continues `HANDOFF_19SEP.md` parts one and two, in the same folder. Those two
describe the same night's earlier work and **part three reverses two of their
conclusions**, marked where they appear.

**18,485 assertions pass, `tests/tdz.mjs` is clean, `tests/render.mjs` is clean
and `vite build` is green.** Everything is on his disk in seven batches, each
one staged back and byte-compared.

---

## 0. THE STATE OF IT, IN ONE PLACE

**Nothing is pushed.** Three nights of work sits uncommitted on one laptop, and
on the 18th it was OneDrive rather than git that saved the source directory.

What he has to do, in order:

1. **Commit and push.** Worth five or six commits so a bad deploy can be
   bisected: the affiliate and copy work, the measured-field hatch, the costs
   split, the intake fixes, the published-trips system, and then this night's
   scope work.
2. **Run `gemlyx_trip_library_19sep.sql`** in Supabase. Until it is run,
   publishing a used trip fails silently on purpose and `/trips` says "not
   reachable right now". Nothing else is affected.
3. **Press both partner-ads buttons** after the deploy and check the clicks land
   in his partner-ads dashboard. Hotel Viking shows on a day in Sæby;
   Travelbetter.dk is on the Tips tab.
4. **One optional test, four seconds, worth real money.** Paste this in a
   browser:

   ```
   https://www.kqzyfj.com/click-101858166-13375717?sid=stay&url=https%3A%2F%2Fwww.booking.com%2Fsearchresults.html%3Fss%3DAarhus%252C%2520Denmark
   ```

   Lands on Booking's **Aarhus results** → set `BOOKING_CJ_DEEP_LINKS_WORK` to
   `true` in `src/config.js` and every stay button in the app becomes that
   area's own search with the area named on it. Lands on Booking's **front
   page** → leave it, which is what it is set to, and nothing is broken.

## 1. WHAT TO PICK UP FIRST

In the order I would take them. Each one has the file and the reason.

1. **The event swap.** The deferred half of the published-trips system: a
   finished event in a republished trip, swapped for a current one or for
   something Gemlyx suggests. `src/utils/tripLibrary.js` is where the publish
   side lives.
2. **`mayNotDecide`.** The last of the island-run findings and a live
   inconsistency in `src/App.jsx`. Part two, section 7, has the other five, all
   done.
3. **`townPointFor("Copenhagne")`.** A typo in a town name leaves the trip with
   no anchor, so nothing measures a distance from where they start and the
   preview's reach bands collapse. `namedNearly` in `src/utils/danishNames.js`
   is the reader that already solves it. This matters more now, because
   `tripScope.js` measures from an anchor too.
4. **A stop named in the possessive gets no card.** "Roskilde has the Viking
   Ship Museum" cards Roskilde and "Roskildes Viking Ship Museum" does not,
   which is the Danish genitive the town matcher has not learned.
5. **The chat report cannot show what it needs to.** The prompt block per turn,
   both briefs, the preview-side readings, the timeline off-by-one. A report that
   cannot reveal a failure is its own finding.
6. **A deep link for either partner-ads banner.** Supported, guarded to the
   advertiser's own host, unset.

Two questions are still his and are not work:

- **Whether an 11:00 departure keeps its date** as a half day. Part one, 1.2.
- **Where a notice surfaces.** The bell is in; a front-page strip and a push
  notification are unanswered.

---

## 2. THE TWO DECISIONS HE MADE TONIGHT

### 2.1 "A town shouldn't"

> "A town shouldn't. There are the 'events coming up' tap that one should be able
> to click on."

Both halves are his and both are right.

Part two fixed the costs list, which had been charging a family of seven 80 kr
admission to the town of Roskilde with a Buy tickets button pointing at Roskilde
Festival. It left the **town page** doing the same thing, and flagged that as a
product call rather than deciding it.

He decided it. `DetailPage` resolved a ticket destination from any row that had
one, so a town that had picked up a `ticketUrl` got a 🎫 Book tickets button.
`showsTicketForKind` now gates it.

**The route he named is why removing the button costs nothing**, and it is
asserted rather than assumed: the What's on rows on a town page are already
buttons, each one opens that event's own page, and the ticket link lives there
beside the event's dates and its ticket status. A button on the town itself can
only ever sell a ticket to something that is not the town.

**Gated at the render, not at publish.** Every row already in the database is
fixed without a redraft, and the stored field is untouched on purpose: a music
venue published as `night` may really sell dated tickets, and dropping the value
at publish would delete a working link from rows nobody has looked at.

**And the table moved rather than multiplying.** `costLedger.js` held its own
type-to-pool table for a few hours this morning, and then the town page needed
the same judgement. Two tables of one relation is the mistake `journeyScope.js`
was written about in its own words, so it lives there now, derived from
`TYPES_WITH_A_DOOR`, and the costs list reads it. The three doored pool names
and the three doored render kinds are the same three strings, which is a
coincidence the assertions **check** rather than assume.

### 2.2 "Stick to the area and just put the front-page link"

> "I'm going a bit back and fourth on the 'budget' and 'good hotel'.. because
> it's really a long-shot to take. Perhaps stick to the area and then just put
> Booking.com front-page affiliate link. I think that's the best solution."

**It is, and it dissolves the deep-link problem instead of working around it.**
This is the reversal: part two turned the CJ wrapper off to stop the stay buttons
promising a landing the programme cannot deliver. His answer is better, because
it removes the promise rather than the payment.

A guide day had three Booking doors: the property the guide named, a good search
and a budget search. Each promised a specific landing, the programme does not
deep link, so each arrived at the front page. Sorting a search for **one
building** by price is the long shot he means: a cheaper room is a different
hotel.

There is one door now, `stayDoorUrl` in `src/utils/affiliates.js`, and the thing
worth knowing about it is that **the label is derived from the link**:

```js
{ href, area, paid }
```

`area` is what the button is allowed to say. Today it is false and the button
reads "Find a room on Booking.com", pointing at Booking's front page through the
click link, which earns and lands exactly where the label says. Set
`BOOKING_CJ_DEEP_LINKS_WORK` to true and the same door returns the area's own
wrapped search with `area: true`, and every button in the app starts naming the
area. A button can never promise a landing the link will not keep, structurally,
rather than by anybody remembering.

**The area is not lost.** It is in the sentence above the button, which is where
the guide has always said where to sleep, and where a named property is named.
That is what he meant by sticking to the area.

**Two consequences worth knowing:**

- `bookingEarns()` reads the programme again rather than the deep-link switch.
  For a few hours this morning it read the switch, correctly, because the stay
  buttons were then unwrapped searches carrying no marker and a disclosure over
  one would have been a false statement about money. The front-page link is
  tracked, so that state is gone. An assertion pins that the two are no longer
  wired together, because rewiring them would be saying the front-page link
  earns nothing.
- **A bare click link has no destination to read**, so `partnerMerchant` had
  nothing to look up and the button read "Partner site" over a link to
  Booking.com: vaguer than it needs to be, and it hides which company is being
  paid. It now recognises the configured click id. **The id, not the host**:
  kqzyfj.com issues click links for every advertiser CJ has, so a different CJ
  link still gets the honest generic label. The probe found this, not a read.

---

## 3. WHAT PART THREE TOUCHED

Six files, all byte-compared on his disk.

| File | What changed |
|---|---|
| `src/utils/affiliates.js` | `stayDoorUrl`, the one stay door. `bookingEarns` back on the programme. `partnerMerchant` learns the configured click id. |
| `src/utils/journeyScope.js` | `KIND_OF_DOORED_TYPE`, `KINDS_WITH_A_DOOR`, `showsTicketForKind`, derived from `TYPES_WITH_A_DOOR`. |
| `src/utils/costLedger.js` | `stopHasADoor` reads the shared judgement. The stay row goes through `stayDoorUrl`. |
| `src/components/DetailPage.jsx` | The ticket destination is refused on a page with no door. |
| `src/pages/GuidePage.jsx` | Three stay doors become one, labelled from the door's own answer. |
| `tests/run.mjs` | 21 new assertions, 28 rewritten. |

The 28 rewritten ones are the interesting number: they pinned the good and budget
design in detail, including the sort keys and the label that said "Other good
hotels" once something was recommended above it. They are gone with the feature.
What replaced them is the one rule that makes the reversal safe, which is that
the label follows the link.

`bookingUrl` keeps its tiers and its assertions. `stayDoorUrl` reaches it the day
deep links are allowed, so nothing about that work was thrown away.

## 4. HOW TO WORK WITH HIM, IF THIS IS A FRESH CHAT

Read from the repo, not from a summary: the comments in these files carry the
reasoning and the dates, and the assertions carry the evidence.

- **Every change travels with its assertions, in the same edit**, and
  `node --max-old-space-size=3072 tests/run.mjs`, `tests/tdz.mjs` and
  `npm run build` all run before anything reaches him. The suite is 18,485
  assertions and takes about a minute.
- **Run the function rather than reading it.** Tonight that found three bugs
  nothing else would have: a detour measurement that picked the wrong region, a
  three kilometre margin presented as a finding, and `agreesToDrop("yes but not
  North Zealand")` returning true. All three read as reasonable code.
- **The suite's own checks catch real mistakes.** The unused-export check
  refused a new module until it was wired; the identifier check refused a
  binding read from outside its block. Both were mine, tonight.
- **No dashes anywhere**, in replies or in anything generated. A hyphen is
  allowed between two values ("3 of 7 - 4 still to go") and inside compound
  words. And no "actually", "genuinely", "truly", "simply", "genuine" in copy.
- **Verify before correcting one of his facts.** He has been right and the AI
  wrong more than once, and he would rather hear "these two disagree and neither
  settles it" than a confident wrong answer.
- **Nothing explains a control to a reader.** A label and the control is the
  whole of a form field, and a sentence under a button saying what the button
  does is clutter.
- **Commit to his disk in batches**, each one staged back and byte-compared with
  `cmp`, and **use a fresh staging path per batch**. A commit that re-sends a
  path after editing it in place reports success and writes the old bytes. That
  happened twice this session and the byte-compare caught it both times.
