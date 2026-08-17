# Gemlyx handoff 15 — 17 Aug 2026, late

6762 assertions, 0 failures, in UTC / Europe-Copenhagen / Pacific-Kiritimati /
Pacific-Niue. Two mutation runs tonight, `mutate35` (26 mutants) and `mutate36`
(48 mutants): **0 survivors, 0 never-applied** on both. Build clean.

Nothing is committed or deployed. Ten files written back to
`OnlyHere\onlyhere-project\`.

---

## 1. Two bugs found by running your seven real drafts

Not by reading code. By bundling your own utils and pushing the seven drafts from
"Drafts that need help from you.odt" through `auditEntry`, `sweepRow`,
`readerUncertainties`, `priceBand` and `cityFromLocation`. Both bugs were in code
written earlier the same day.

### `priceBand` averaged every digit in a price sentence

Every price the food studio writes is a *sentence*, and this read all the numbers
in it, including the course count and each group either side of a thousands
separator.

    "3-course lunch menu 795 DKK; 4-course lunch menu 1,095 DKK"
      -> 3, 795, 4, 1, 095  ->  average 179.6  ->  "100 to 250 kr"

Henne Kirkeby Kro. Two Michelin stars. 795 kroner for lunch. Filed in the
mid-range tab. Kok og Vin's two sentences both landed on 249, one kroner inside
the same tab. A traveller filtering for a cheap lunch was being shown destination
restaurants.

Fixed: a number is money when a currency follows it. All four of your real
sentences now band `over-250`.

**And the fix itself had a bug, which an existing assertion caught.** A range
writes the unit once, at the end: `"50-450 DKK"`. Reading only the number the
currency touches gives 450 and bands a place with 50-kroner dishes over 250. Both
ends of a range are money now. That assertion was written weeks ago and paid for
itself tonight.

### The reader panel dropped the one line a reader without a car needed

Henne Kirkeby Kro is a two-star restaurant in a village on the west coast of
Jutland. Its most decision-relevant sentence:

> No public transport route or duration from Copenhagen could be confirmed; the
> source recommends driving.

Three uncertainties on that row and **not one reached a reader**, because that
line says "the source" and the research-meta filter ran before the relevance
filter. Relevance wins now: a line about getting there is about getting there
however it is phrased.

**And that fix had its own failure mode, found immediately.** `correction.js`
pushes an editorial audit trail into the same `uncertainties` array, and every one
of those lines quotes a field and its value — so relevance matches them forever:

> Applied from your own correction and still UNCONFIRMED by a primary source:
> price is now 140-145 DKK.

On a public page that is the page calling its own price invented, which is your
"People will think the draft is incorrect" complaint arriving through a second
door. So there are now three tiers: our own bookkeeping is dropped first, before
relevance is even considered. Draft 7 in your file has nine uncertainties, three
of them audit-trail lines; two reach a reader.

---

## 2. The seven drafts

Every one of the seven: **no long-form body** and **no hero photo**. Every one
shows as a monogram plate in every list with nothing behind the card. That is the
single biggest pattern in the file and it is not a code bug.

| # | Draft | Worst finding |
|---|---|---|
| 1 | Restaurant Glassalen | `"See website"` with no website field — now reads `Price unknown` |
| 2 | Nyhavns Færgekro | body, photo |
| 3 | **The Organic Boho** | **nothing read is about the subject, and the prose is past tense — this place looks closed.** Do not publish. |
| 4 | POW Pizza | 6 em/en dashes (predates the dash ban); `"See website"`, no website |
| 5 | **Henne Kirkeby Kro** | **critical: claims no public transport route exists. That claim has been wrong every time it has been checked.** Also a bare year "from 750" with no event attached |
| 6 | Kok og Vin | price sentence |
| 7 | Kok og Vin **again** | duplicate of 6, plus banned phrases "comprehensive", "curated" |

Two to act on by hand: **The Organic Boho** (likely closed) and **Henne Kirkeby
Kro** (needs a real transport answer, not a "could not confirm"). And one of the
two Kok og Vin drafts should be deleted.

---

## 3. "It needs to require more info. And not bug."

What your transcript actually shows, in order:

1. Gemlyx asked three things in a paragraph it called "two more things".
2. You answered all three: tight backpacker, hidden gems, on a bicycle.
3. **That reply errored.** "Hit a snag on my end."
4. You typed "What?".
5. Gemlyx: *"that 'what?' is just you being surprised I asked haha, all good, you
   already answered everything I needed."*
6. It offered the build button. The guide was a random route.

Both halves of step 5 are invented: a reading of your own message, and the state
of the brief. The mechanism for the first one is precise and worth writing down.
The error bubble is *correctly* stripped from the history sent back to the model —
that was a real fix, it stopped Gemlyx apologising for words it never said. But
stripping it left your answer and your "What?" **adjacent, with nothing of its own
between them**. A gap with no explanation gets filled by invention, every time.

Four changes:

**The brief is computed, not felt.** `tripBrief.js` was built this morning and
wired to nothing. It now reads your turns and the intake form — never Gemlyx's own
replies — and the block goes into the prompt saying what is known, what is
missing, and that it overrides the model's impression of the conversation.

**The ready marker is stripped in code when the brief is not ready.** The prompt
already spent a paragraph on when the marker may be emitted. Your transcript is
that paragraph being ignored. It is a product rule now, not a request.

**The button is still not hideable.** Deliberately. Your 10 Aug complaint stands:
a button shown one turn early costs a tap, a button never shown costs the whole
product. Stripping the marker removes Gemlyx's *claim* to be ready. A reply that
reads like a plan still offers the button. There is an assertion guarding that,
against a future tightening.

**Asked once is not asked forever.** The strict version of a bucket is a worse bug
than the one it fixes: nothing reads a bare "no" as an answer about a hotel, so a
blocking slot would block forever and the button would never come back. You said
the obligation was *"then it is Gemlyx' responsibility to ask"* — so
asked-and-unanswered is its own third state. It stops blocking, is never asked
twice, and is reported to the writer as an assumption rather than a fact.

### Three slots your conversation found empty

- **A ferry is an arrival.** You opened with "I'm taking the ferry into Aalborg".
  Gemlyx's reply read it back correctly. The reader that decides whether the
  origin is known did not — it knew flying, landing, arriving, coming, starting
  and driving. Denmark is reached by sea from Norway, Sweden and Germany
  constantly, and the arrival least like Copenhagen is the one it missed.
- **"Hidden gems" was not an interest word.** On the product whose stated
  differentiator is hidden gems. The list was written from the app's theme
  vocabulary rather than from what a person types.
- **How they get around is now a blocking slot.** The chat's own prompt has said
  all along that this must be known "before proposing a route, since it changes
  everything". It was on no list, so nothing checked. And `bicycle`/`bike` came
  *out* of the interest words for the same reason `kids` did: a sentence about
  *how* somebody travels must not fill the slot for *what* they came for.

---

## 4. Copyright, and what it deliberately does not claim

"or publically rather" is the whole design. "Never share it" and "never share it
publicly" are different products: a guide is built for a trip and a trip has other
people on it, so a rule against forwarding it is broken by every honest user on
day one, and a term nobody can keep is worth less than none.

Three claims, stated separately, because a notice that overclaims damages the part
of it that is true:

- **The writing is yours.** Automatically, from the moment it is written. No
  registration, nothing to file.
- **The facts are not, and the terms say so in as many words.** An address, an
  opening time, a 795 kr menu price: nobody owns those. Claiming them on the one
  page that promises not to overclaim would be the worst possible place to do it.
- **The verified collection is yours anyway** — and this is the strongest and most
  apt claim. Danish and EU database law protects a collection that took
  substantial investment to assemble and verify, separately from copyright in its
  contents. Checking every price against the business that charges it, town by
  town, for a year, is exactly that investment.

Where it now appears: the foot of every guide (small, on purpose — a legal box on a
travel guide reads as a threat and gets skipped), inside the share panel at the
moment of the action, and `/terms.html`, re-dated to 17 August. **The old terms
said "yours to use, print, share and take on your trip", full stop. That line is
gone.**

**Text and data mining is expressly reserved.** This one genuinely does not exist
unless written: EU law treats silence as permission. It is now in the page
metadata (`noai, noimageai` + `tdm-reservation`), in `robots.txt` against the named
training crawlers, and in prose on the terms page citing Article 4(3).

Two judgement calls worth your eye:

- **The citing fetchers are not blocked** (OAI-SearchBot, Perplexity-User and
  friends). They answer a person who asked a question and cite the source, which
  sends readers here. Training crawlers take the writing and return nothing.
  Blocking both would quietly remove Gemlyx from where people now actually search.
- **`Disallow: /guide/` nearly broke your share cards.** A guide URL should not be
  indexed as a public page — but the preview card a shared guide shows is built by
  `middleware.js` *for crawlers*, and Facebook's fetcher honours robots.txt. A
  blanket rule would have turned every allowed private share into a bare link,
  breaking the feature while trying to protect it. `facebookexternalhit`,
  `WhatsApp`, `Twitterbot`, `LinkedInBot`, `Discordbot` and `TelegramBot` are named
  so the rule does not apply to them.

I am not a lawyer and none of this is legal advice. It is the accurate,
unembarrassing version of what you asked to say, and it is worth ten minutes of a
Danish solicitor's time before you treat it as settled.

---

## 5. Diagnosed tonight, NOT built

These are from the same screenshots and they are real. I stopped rather than
half-build them.

**Nothing filters candidates by what is reachable in the stated mode.** You said
ferry into Aalborg, bicycle, tight budget, hidden gems. The plan's own blurb read
that back correctly — "keeping costs low and pace realistic for pedaling", "not the
well-worn tourist stops" — and then the picker offered:

- **Billund**, whose own card says *"built for families with young kids and LEGO
  obsessives; skip it if you want a real Danish town to wander"*
- **Copenhagen**, 400 km away, in a plan whose blurb says it avoids "the usual
  Copenhagen rush"
- **Ribe** and **Esbjerg**, 250–300 km south
- **Reffen Copenhagen**, **Chickie's**, **Hooked Christianshavn** — Copenhagen food
- **Syd for solen, 13–15 Aug**, which had already finished, and **Ribelund, 19
  Aug**, 300 km away

The arithmetic to fix this already exists (`haversineKm`, the reach bands in
`routeOrder.js`). What is missing is a filter on the *candidate list*, keyed on the
mode: on a bicycle, a per-day reach of about 50 km, which the chat prompt already
states as the rule.

**The 92 km leg is simply missing.** "2 DAYS · 3 STOPS · 92 KM OF TRAVEL", route
Aalborg → Skagen. Day 1 ends in Aalborg. Day 2 opens at **15:00 in Skagen** with no
journey written between them. On a bicycle that is five to six hours of riding,
and the guide shows nothing at all. This is your "the route is even worse".

**The stay card recommended a bus to a cyclist.** *"Stay in central Skagen near the
harbour for easy bus access out to Skagen Klitplantage."* `budgetSays` is already
threaded into `enrichGuideDays`; the travel mode is not.

**Still open from earlier:** `coordFitsTown`'s 50 km tolerance and its unknown-town
pass (the Bella Center leg — your call, I reverted rather than reverse the 10 Aug
fix unattended); no transit plausibility cap; the freshness wiring and the daily
cron you chose; the source-age work; the RLS SQL; the chat-report exporter you
asked for; `vite@latest`.
