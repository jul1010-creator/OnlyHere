# The fact-checkers, audited

13 August 2026. You asked whether the fact-checking is ruining something before
the research reaches Claude.

**Short answer: yes, and not where you were looking.** The problem is not that
the check damages the research on its way to Claude. It is that **the checker is
grading Claude's draft against a body of text Claude was never shown**, and on
a normal run a large part of that text is missing from the checker's copy too.
A claim can be flagged as invented for the sole reason that the checker could
not see the page it came from, and the step after a flag deletes prose.

Three findings. All verified against the code, one of them adversarially, by a
second pass whose whole job was to prove me wrong. It could not.

    Suite      3803 passing, 0 failing
    Build      clean
    Fixed      1, the only one that is safe to make without your call
    Open       2 decisions, laid out at the end

---

## Finding 1: the checker is not reading what Claude read

    App.jsx:3687    let userContent = rawResearch;
    App.jsx:3718    userContent = `ORGANIZED RESEARCH NOTES ...:\n${structureResult.text}`
    App.jsx:3736    askClaude(`${prompts[sType]} ... ${userContent}`)

Line 3718 **replaces** the research. It does not add to it. So on every run
where the OpenAI structuring step succeeds, which is the intended path, Claude
writes from OpenAI's notes and **never sees `rawResearch` at all**.

Then, four hundred lines later:

    App.jsx:4505    const checkResearch = researchForCheck(rawResearch);
    App.jsx:4507    "Compare this finished draft against the research it was
                     supposedly written from ... Research it was written from:"

It was not. That is `rawResearch`, and Claude was handed OpenAI's compression of
it. The comment above the block states the same thing as a fact:

    App.jsx:4495    "this compares the draft against the SAME research it was
                     written from"

**The invariant the last accuracy gate rests on is written down twice, told to
the model once, and false.** The only run where it holds is the soft fallback at
3711, where OpenAI returned literally nothing and Claude drafts from raw
research. In other words it is true exactly when the pipeline has already failed.

This is worth being precise about, because there are two different questions
here and the pipeline currently asks neither cleanly:

    did the WRITER invent?        draft vs OpenAI's notes      nobody asks
    did the STRUCTURER invent?    OpenAI's notes vs research   nobody asks
    what is actually asked        draft vs research            conflates both

Conflating them is survivable on its own. Facts in the notes are a subset of
facts in the research, so a faithful draft should still trace back. What makes
it not survivable is Finding 2.

## Finding 2: the checker's copy is missing the middle, and the middle is the web research

`researchForCheck` caps at 20000 characters, keeping the first 7000 and the last
13000 and dropping everything between (`factCheckRead.js:308-322`).

`rawResearch` is assembled in this order (`App.jsx:3672-3678`):

    source order block -> hint -> frozen facts -> hours -> address -> tickets
    -> transport -> PERPLEXITY FINDINGS -> context

and `context` is everything from the web: the research memory, the main Tavily
loop, the journey query, the official site answer, **the founder vouched
sources**, then the scraped pages and the ticket pages.

So the head keeps the measured facts, the tail keeps the last scraped pages, and
**the hole in the middle is the search results.**

### Does it fire on a real run

Computed from the code's own caps, not from a live draft:

| run | rawResearch | over the cap |
|---|---|---|
| lean town draft | 23,900 | yes |
| typical town | 33,000 | yes |
| typical festival with founder sources | 47,700 | yes |
| full festival, ticket pages found | 60,600 | yes |
| a redraft carrying the 6,000 char research memory | 30,200 | yes |
| **every page scrape failed** | 17,900 | no |
| **venue type that read exactly one page** | 17,800 | no |

It stays under the cap only in the two failure cases. The richer the entry, the
more certain the truncation.

A floor you can check by hand, place type, no search snippets counted at all:

    source order block         2,500   (measured, 3 sources; more sources, more)
    Perplexity preamble        1,400
    transport                  1,600
    5 scraped pages           13,300   (2,200 body + framing, each)
    2 ticket pages             5,200
                              ------
                              24,000   before one Tavily result is added

And what lands in the hole:

| block | typical town | festival |
|---|---|---|
| Perplexity findings | 100% dropped | 100% dropped |
| main Tavily loop | 87% dropped | 100% dropped |
| founder vouched sources | n/a | 100% dropped |
| scraped official site text | kept | mostly kept |

The Perplexity findings block is dropped in **every** truncated run, because the
blocks ahead of it fill the 7000 character head on their own.

**Your founder sources are in the hole.** The research sources you set up, the
per-town and now per-region scoping, the whole feature: on a festival draft
those snippets are 100 percent inside the part the checker is not shown. It can
then flag a fact that came from `visitsønderjylland.dk` as unsupported, because
from where it is standing, it is.

### And the only thing standing between that and deletion is a polite request

The cap does leave a note in the text (`factCheckRead.js:320`):

    "A CLAIM YOU CANNOT FIND HERE MAY SIMPLY BE IN THE OMITTED PART: do not
     call anything invented on the strength of it being missing from this
     text alone."

That is an instruction to a model. Your own codebase, in the comment two hundred
lines below the call site, says why that is not enough:

    App.jsx:4608    "a request has a failure rate while code does not"

And the checker cannot tell what is missing. It sees a source order block naming
every ranked host at the top and real scraped page text at the bottom. That
reads like a complete research blob, not a truncated one.

Then `App.jsx:4592-4594`, the correction step:

    IN PROSE ... unverified means NOBODY WROTE THIS ANYWHERE AND THE WRITER
    PUT IT IN. That is an invention, not a doubt. DELETE THE SENTENCE.

**One honest narrowing**, and I want it stated rather than buried: a flagged
claim gets a second chance first. `App.jsx:4587` re-researches it with a fresh
Perplexity search, and if that finds the fact, the value is kept or corrected
rather than removed. So deletion needs **two** search failures, not one. That
makes this a leak rather than a flood. It does not make it rare, because the
second search is a single targeted query and the first one had your whole
research pipeline behind it.

## Finding 3: the downgrade that was written to protect the draft makes deletion more likely

This one is small, exact, and I think the most clearly wrong thing in the chain.

`relabel` (`factCheckRead.js:95`) downgrades a finding from CONTRADICTED to
UNVERIFIED when the checker admits its own search came up empty. The reasoning
is good and the file argues it well: a page that says something different and a
page that does not mention it are different findings.

The pipeline then announces the downgrade to you (`App.jsx:4567`):

    decide("fact-check finding", {
      winner: "the draft", loser: "the fact-check",
      rule: "I could not find it is not it is wrong. A finding that names no
             page stating otherwise is a gap, and a gap is not grounds to
             change a value.",
    })

**And then hands that finding straight to the step that deletes it.**

    App.jsx:4532   flaggedText = inventedRead.findings.map(f => `${f.label}: ...`)
    App.jsx:4533   const downgraded = inventedRead.findings.filter(f => f.moved)

`downgraded` is used for the note and the decide line and **nothing else**. It
never filters `flaggedText`. Every finding goes to the re-research at 4588 and
the rewrite at 4595, carrying its **new** label.

Which means the downgrade moves the finding from one bucket to the other:

    CONTRADICTED  ->  "replace the wrong value with the real fact"
    UNVERIFIED    ->  "IN PROSE ... DELETE THE SENTENCE"

So a finding the pipeline has just told you the draft **won**, and which it
weakened precisely because the checker admitted it found nothing, is the one
most likely to end with your sentence removed. The protection is cosmetic. It
changes the label on the screen and the instruction downstream, in the wrong
direction.

---

# What I fixed

**The flagged branch now says whether the checker saw all the research.**

The clean branch already did (`App.jsx:4548`). The flagged branch did not. So
the outcome where truncation could have *caused* the result was the only one
that never mentioned it, and it is the outcome that goes on to rewrite your
prose.

    App.jsx:4551   why: `${checkResearch.truncated
      ? `CHECKED AGAINST ${kept} OF ${total} CHARACTERS OF RESEARCH: the middle
         was not shown to the checker, so a claim can be flagged here purely
         for sitting in the part it could not see. `
      : ""}${flaggedText.slice(0, 160)}`

Two assertions, scoped to the branch rather than searched for file wide, because
the clean branch contains the same identifier and a file wide test would have
passed before the fix and proved nothing. Both mutations go red.

**This fix is also the measurement.** Everything above is computed from the
code's caps. The next draft you run that gets flagged will print the real
`total` for that entry, and you will know exactly how big your research actually
is instead of taking my arithmetic for it.

# Two things I did not fix, because they are your call

**1. Which research the checker should read.** Three options.

  a. **Check the draft against `userContent`**, what Claude was actually given.
     This makes the comment at 4495 true, and it is small enough that the 20000
     cap would never fire, so Finding 2 disappears. It costs the ability to
     catch OpenAI inventing during structuring.
  b. **Two checks.** Draft against notes catches the writer. Notes against raw
     research catches the structurer. Correct and honest, and it is one more
     paid call per draft.
  c. **Leave it, raise the cap.** Cheapest. Does not fix the asymmetry, and the
     cap has now been raised once already, from 3000 to 20000, for this exact
     failure.

  My recommendation is **(a) now, (b) when you want it**. (a) removes a whole
  class of false flags tonight for no extra cost.

**2. Whether a downgraded finding may delete prose.** Two options.

  a. **Mark it in the prompt**: tell the corrector that this finding was
     downgraded because the checker admitted it found nothing, and is not
     grounds to remove a sentence. One line, no behaviour change if the model
     ignores it.
  b. **Enforce it in code**: a downgraded finding warns you and is never sent
     to the correction step. Matches the `decide()` the pipeline already prints,
     and follows your own rule that a request has a failure rate while code
     does not.

  My recommendation is **(b)**, because the pipeline already declares the
  outcome in words and the code currently does the opposite.

Both are small. Say which and I will do them.

# Also worth knowing, not fixed

- **`App.jsx:2222` labels a Tavily answer as `[openai, a synthesised answer]`.**
  That label is load bearing: `sourceOrderBlock` teaches the writer to rank
  `[openai, ...]` lines below every named host. So a Tavily result is being
  demoted under a false name, not just mislabelled cosmetically.
- **The official site query throws its own results away** (`App.jsx:2222`). Only
  `oData.answer` is appended; `labelled(oData.results)` is never called, so
  those pages contribute URLs and no text.
- **`readInventedCheck`'s verdict regex is anchored with `^` and no `m` flag**
  (`factCheckRead.js:266`), so any preamble before `VERDICT:` makes the whole
  check unreadable. That is the safe direction, the draft is left alone, and
  there is already a test for it. Worth knowing it is a real exit path.

# Changed on disk

    src/App.jsx      the flagged branch reports truncated research
    tests/run.mjs    2 assertions, both mutations verified

Nothing pushed.
