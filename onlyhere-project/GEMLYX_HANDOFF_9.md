# Handoff 9 — the night of 12 August 2026

Written while you slept, after you asked me to work out why the pipeline
"sometimes gets certain things right, while getting others wrong, and reverse."

**Everything below is written to your disk.** Nothing is pushed. Your laptop
dropped off the bridge for about twenty minutes around 00:20 and came back, so
the whole night's work landed.

---

## The short answer to your question

The pipeline is not inconsistent because the models are unreliable. It is
inconsistent because **most of the research reaches the writer as one anonymous
paragraph, and which sentences are in that paragraph changes every run.**

The main research pass did this:

```js
context = context + " " + answer + " " +
          results.slice(0, 6).map(r => r.snippet).join(" ");
```

Six Tavily snippets, joined by a space. No URL, no host, no date. And the line
immediately below it calls `rememberUrlText` on the same results, which stores
`url -> snippet`. **The provenance is captured and thrown away in the same
breath.**

Three consequences, and together they are your complaint:

1. **The source hierarchy cannot reach inside the blob.** It ranks hosts, and
   then the text it was built to rank arrives unlabelled, so a sentence from a
   2022 press release sits beside one from a current listing with identical
   standing.
2. **The age gate never saw most of the research.** `scrapeTier` runs on pages
   the pipeline SCRAPED. `via.ritzau.dk` was never scraped, so the 2022
   companion-free sentence walked straight past the six-month rule you asked
   for. That is why it keeps coming back.
3. **It is a different pile every run.** Which six snippets Tavily returns
   varies. So the writer sees different anonymous sentences each time, and the
   invented-claim check compares the draft against a different pile each time.
   Right one run, wrong the next, on the same entry.

**Fixed.** Every snippet now carries its host: `[kultunaut.dk] Pris: Entré: 400
kr.` A synthesised answer from Tavily or OpenAI is labelled as synthesised and
ranked below every named host. The source-order block tells the writer what the
brackets mean and names the 2022 case as the thing it keeps catching.

---

## The determinism problem, stated properly

Your pipeline has **fourteen deterministic gates** and **seven stochastic
steps**.

Deterministic (same input, same answer, every time, free):

    tracePrices             price against the site's own text
    datesConfirmedBy        date against the operator's page
    transitProblems         durations against Google's step list
    lastLegProblems         mode against the measured walk
    absenceClaims           a stated absence, needs no measurement
    glanceLeak/cleanGlance  field hygiene
    curatedFindProblems     an errand where a find was promised
    selfContradictions      the draft against its own notes
    coordFitsTown           coordinate against the town
    factAge                 six months, from a date on the page
    rankSources             the hierarchy
    reconcileTickets        Ticketmaster
    claimConflicts          a duration against a distance
    guideLogisticsProblems  the guide's own legs

Stochastic (different answer each run, costs money):

    the invented-claim check        one Perplexity call over the whole draft
    the auto-correction rewrite     one Claude call, 8192 tokens
    the re-research of flags        one Perplexity call
    the Perplexity pre-check        feeds the research
    the OpenAI structuring pass     reorganises before writing
    the AI-voice scan               one OpenAI call over the prose
    which 6 Tavily snippets return  varies per run

**The deterministic gates never disagree with themselves.** Every complaint you
have had this week came from the stochastic column, or from a bug in the
plumbing between them.

And the deterministic gates only cover what got MEASURED. Everything else falls
to a model's opinion about a pile of text. So the real lever is not "make the
models better", it is **move surface from the right column to the left**, which
is what the whole of yesterday evening was.

---

## Bugs found tonight, worst first

### 1. `draftTown is not defined` — a ReferenceError on every festival draft

Your own run log, step 7:

    Nearest arrival point [google · FAILED · discarded]
    why: draftTown is not defined

Mine, from last night. `const draftTown` was declared inside a bare block about
140 lines long; the geocode fallback I added reads it 200 lines past the closing
brace. **The entire frozen-facts block threw**, so `frozenGeo` and
`frozenFactsText` were never built from the name path, and the Google-address
recovery threw too because it passes `draftTown` into `buildFrozenFacts`. The
writer received no verified location data at all on any festival draft.

Fixed by hoisting to `let draftTown = ""` at function level.

**And the suite could not have caught it.** `useBeforeDeclare` checks ORDER; this
is SCOPE. The declaration comes first and is simply out of scope by the time it
is read, and in a diff those look identical. Added `readOutOfScope` in
`tests/tdz.mjs`, narrowed deliberately to bare `{` blocks: the first version
tracked brace depth across the whole component and produced several hundred
false positives, because JSX, object literals and arrow bodies all open braces.

### 2. Every gate finding was being published to readers

This is the one I would most want you to see.

`uncertainties` is a **published field**. `shapeForLive` carries it to the live
entry and `HowWeKnow.jsx` renders it to readers. The only thing that has ever
held anything back is `PUBLISHER_NOTE`, a closed list of four shouted prefixes.

**Not one of the gate findings I wrote last night matches that list.** So a
reader of the live guide was going to be shown:

- "This suggests a bus for the last leg, and the last leg was MEASURED at 8
  minutes on foot from Ribe Station."
- "ticketInfo credits a source, so it was cut back to the fact: ... became ..."
- "NOT FROM THE OFFICIAL SITE: 275 DKK."

You said last night: *"I can't deliver a product that makes mistakes. Especially
with the live guide."* I built that leak in one evening while closing others.

Fixed: every gate now writes to `t.__notes`, and the Studio panel renders them in
their own block labelled "for you, never shown to a reader". `__notes` rather
than a fifth shouted prefix, because **`shapeForLive` is an allow-list**: a `__`
field it does not name cannot reach a reader by accident, whereas a prefix rule
can be defeated by rewording a message.

### 3. A press-release republisher was ranked as the operator

Your run log, step 16:

    Source order: vindrosen-huset.dk (official) > billet.unitedtickets.dk ...

`vindrosen-huset.dk` is a volunteer centre in Esbjerg. Its URL slug is
`ribelund-festival-er-tilbage-for-fuld-musik`, the 2022 press-release headline
word for word. It was ranked **the operator's own website** and outranked
everything, including `oplev.esbjerg.dk`, which is the actual organiser.

It qualified because `officialHosts` was fed by "was scraped and is not a
listing", and a page reaches the scrape queue by MERELY MENTIONING the place. So
any blog reprinting a press release became the operator, and on this entry the
blog reprinting a four-year-old press release became the operator.

Fixed: a host is the operator's when the HOST names the place, or when Google's
business listing registered it. A headline is not a domain.

### 4. Founder notes were being saved into every shared guide

The Studio leak has a twin on the pipeline you care about most. The guide's
logistics gates write their findings into `planProblems`, which is stored on the
guide as `_planProblems`, and the save path stripped only `_testProfile` and
`_testPlan`. So sentences in the pipeline's own voice were written into the
saved payload of every shared guide and sent to every browser that opens the
link. Nothing renders them, so it is not a display leak, but it is developer
notes in the product's database.

Stripped. And **nothing tested that strip list at all**, so even the original
`_testProfile` guard was one careless edit from vanishing. It is tested now,
including that `_geo` and `_exactDurations` stay, because the render needs them.

### 5. The 2022 companion fact, root cause

Covered above. It survives because it arrives as an unlabelled snippet, not a
scraped page. With labelling plus the hierarchy plus the six-month rule, a
current page from Esbjerg Kommune saying **50 kr** should now beat it without the
older line being mentioned at all.

Worth saying plainly: **the draft's "companions get in free" is wrong.** Esbjerg
Kommune's own page says *"Hvis man har ledsager med, koster en billet til
ledsager 50 kr."*

---

## Open, and my recommendations

### A. The invented-claim check is the largest stochastic surface

It runs once, over the whole draft, and its verdict swings run to run. Your last
two runs prove it: ten UNVERIFIED findings one run, "every claim traced back to
the research" the next, on nearly the same entry.

**Recommendation: three refuters, different lenses, majority rules.** Not three
copies of the same question, which mostly buys three copies of the same
mistake. Per flagged claim: does any page we opened state it, is that page
inside six months, is it about this entity or a similar one. Roughly triples the
cost of that one step and it is the step doing the most damage.

### B. Deleting prose is right per sentence and dangerous in bulk

My "unverified prose is an invention, delete the sentence" rule from last night
is what made a rewrite return a shell. The refusal now catches the catastrophic
case. A better shape would be **claim-level edits**: ask for a list of
`{ field, sentence, action }` and apply them in code, rather than asking for the
whole JSON back. Then a truncated answer loses one edit rather than the entry.

### C. Two holes remain from yesterday

- The guide's style rewrite replaces prose with no re-check.
- **Every already-published row carries the old errors.** The gates protect what
  is published from here and touch nothing in Supabase. Worth running them over
  the existing rows to see the damage before deciding what to redraft.

### D. Money, since you offered

Nothing I found needs a paid service. Firecrawl is already wired and inert. The
one place spending helps is (A), and that is three more Perplexity calls on the
drafts that reach the last gate, not a new vendor.

---

## Where things stand

    Suite         3316 passing, 0 failing
    Mutations     roughly 175 run across the session, every one red before its commit
    Commits       fifteen written to your disk, NONE PUSHED

## Everything is on your disk

Your laptop dropped off the bridge for about twenty minutes around 00:20 and came
back, so every file above was written. Nothing is pending.

## First thing tomorrow

    cd C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project
    node tests/run.mjs          # expect 3316 passed, 0 failed
    cd ..
    git add -A && git commit -m "Provenance on every snippet, scope fix, publication leak" && git push

Then one Ribelund run. The log will now tell you which host every fact came
from, and the draft should no longer say companions get in free.
