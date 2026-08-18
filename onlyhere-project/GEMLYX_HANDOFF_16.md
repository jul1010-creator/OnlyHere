# Gemlyx handoff 16 — overnight, 17–18 Aug 2026

**7258 assertions, 0 failures**, in UTC / Europe-Copenhagen / Pacific-Kiritimati /
Pacific-Niue. Six mutation runs tonight — 26, 48, 20, 45, 25, 16 and 20 mutants —
**0 survivors on every one**. Build clean.

Everything is in `OnlyHere\onlyhere-project\`. Nothing is committed.

---

## 1. The Instagram error was mine, and it needs the deploy you already did

`"Could not verify your session just now."` is `resolveUser`'s 503, and in
production it fires on one condition: **no service key**. Tonight's security guard
read `SUPABASE_SERVICE_KEY`, a name that exists nowhere in your project.
`api/ask.js`, which has worked for a week, reads `SUPABASE_SERVICE_ROLE_KEY`. I
invented a plausible variable name instead of reading the one file that already did
this, and locked you out of your own photo finder with a guard meant to keep
strangers out. Same for Scan a Source, places lookups and tickets.

The suite now reads the key name **out of `ask.js`** and requires the five guarded
endpoints to agree with it — so a rename fails in the test run, not in your face.

---

## 2. "It needs to require more info. And not bug."

Your transcript, decoded: you answered all three questions, **that reply errored**,
you typed "What?", and Gemlyx invented both a reading of your message and the state
of the brief, then offered to build.

The mechanism for the first half is exact. The error bubble is correctly stripped
from the history sent back to the model — that was a real fix, it stopped Gemlyx
apologising for words it never said. But stripping it left your answer and your
"What?" **adjacent, with nothing of its own between them.** A gap with no
explanation gets filled by invention, every time.

- The brief is now **computed** from your turns and the form, and the block in the
  prompt says it overrides the model's impression of the conversation.
- **The ready marker is stripped in code** when the brief is not ready. The prompt
  already spent a paragraph asking for that and was ignored.
- A lost reply is **named** in the history instead of vanishing.
- **Asked once is not asked forever**: a slot Gemlyx asked about and got no answer
  to stops blocking, so the button can never go permanently missing.
- The button is **still not hideable** — your 10 Aug complaint stands, with an
  assertion guarding it against a future me tightening this too hard.

Three slots your conversation found empty: a ferry was not an arrival, "hidden
gems" was not an interest word, and **how you get around is now a blocking slot**.

---

## 3. The route, at its root

**Nothing knew where the trip started.** `arrivalPoint` knew airports, and foreign
cities you come *from*. "I'm taking the ferry into Aalborg" matched neither, so
`from` was null and every piece of reasoning that begins at the arrival point —
route order, reach, the way home — quietly stood down. The route was not badly
ordered. **It had no start.**

- `reachBand` is **mode-aware**. An hour of driving is 70 km and an hour of cycling
  is 15, and it could not tell the difference. On your two-day bike trip, Copenhagen
  (223 km straight-line) is now out of reach.
- **Far is a reason to leave a place out**, not just to rank it lower — ranking
  cannot say "this is not possible", and with slots to fill, last still gets
  offered. It never empties the screen: reachable first, far ones only to top up.
- **The 92 km leg now renders.** A leg was the gap between two stops *in a day*, so
  the largest journey of the trip was the one gap nothing looked at. It says
  85 km, roughly 6 hours on a bike, and that that is the day rather than a transfer.
- **JOJO now says Aarhus.** The card read `stop.town` alone; the published row you
  wrote carried the town all along, in whichever of four fields its type uses.
- **The false day trip is cut.** Aarhus is 185 km from Copenhagen; a day trip is
  about a third of a day's travel each way. The clause is removed and nothing is
  put in its place — a shorter honest sentence beats a longer plausible one.
- **Geranium is not offered to a backpacker.** Nothing in the matcher had ever read
  a price. It goes behind the same door a category nobody asked about goes behind,
  with a line saying why, rather than being deleted.

---

## 4. Copyright, and the seven drafts

Notice on every guide, in the share panel at the moment of the action, and a
rewritten `/terms.html`. **The old terms said a guide is "yours to use, print,
share" full stop — that line is gone.** The facts are stated as *not* owned; the
verified collection is claimed under EU database law, which is the stronger and more
apt claim. Mining rights expressly reserved in three places.

Your seven drafts came back as `gemlyx-drafts-17aug.json` plus a copy-paste block
each. Two need you: **The Organic Boho** looks closed, and **Henne Kirkeby Kro**
needs a real transport answer.

---

## 5. What the review found — fifteen defects, all mine

You said: *"clean up for any bugs you might have overlooked or get Fable to look at
your work."* It found fifteen. Every one was reproduced by running the real module
before it was fixed. The worst three:

**A generous budget read as "tight."** The tight pattern contained the bare word
`budget`, so "our budget is generous" and "big budget for this trip" both read as
counting kroner — and the preview then printed **"Above the budget you mentioned"**
over expensive restaurants, a claim about your traveller's own words saying the
opposite of what they said. The accommodation prompt was told the same thing,
recreating the hostel-for-a-rich-family bug that file was written to fix.

**Gemlyx's own suggestions became the trip's arrival point.** The ferry pass I wrote
hours earlier accepted "to" as well as "into", so *"you could take the train to
Ribe"* — Gemlyx's line, not the traveller's — anchored the whole route. "Into" is
the discriminator now, which is the word your own sentence used.

**"We have no car" set the travel mode to car.** The exact inversion, on the
sentence somebody writes precisely to say they are not driving. A truthy-only
assertion of mine let it ship green.

Also: `Number(null)` is `0` and `0` is finite, so a stored journey with a null total
produced a citation reading **"measured, not estimated"** for a measurement nobody
made — in the file whose entire job is provenance. That was the **third** instance
of that same coercion found tonight; the review was told to go looking for a third
and there was one.

And: "We booked our flights" filled the hotel slot; "coming from Spain" filled the
interests slot with "spa"; the return-home line said "a manageable half day" over a
day of cycling; `stripDashesDeep` rewrites every price range to "N to M" at read
time, which the new money pattern could not read; and the chat report's headline
number reported **zero** for the exact incident it is named after.

---

## 6. Still open

**The freshness machinery is NOT wired**, and I stopped rather than half-do it.
`stampCheck`, `checkAge`, `sweepRow`, `deepCheckPlan` and `staleEvents` are written
and connected to nothing, `api/update-events-check.js` is orphaned, there are no
crons, and `RULES_VERSION` is stale. It touches live data and Vercel config, and a
half-finished version that starts rewriting published rows overnight is worse than
none. It is the next job and it wants you awake for the first run.

**The live-content audit could not be done.** WebFetch is not in `middleware.js`'s
crawler allowlist, so it saw the app shell on all 117 pages. Googlebot and bingbot
**are** in that list, so Google gets the pre-rendered pages — the audit's alarming
headline was a tool artefact, not a site defect. A real content audit needs either a
browser or a Supabase export of `gemlyx_content`. It did surface one real thing: the
`robots` meta tag I added tonight held the two AI tokens **alone**, in the slot that
decides whether you are in search at all. Harmless almost certainly; "almost
certainly" is the wrong standard for 117 pages. It now says `index, follow` first.

**Also still open:** `coordFitsTown`'s 50 km tolerance and its unknown-town pass
(your call); the source-age work; the RLS SQL; `vite@latest`.
