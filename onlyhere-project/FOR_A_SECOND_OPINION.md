# Gemlyx pipeline: what is actually open

Written 14 August 2026 for a second model reading this codebase cold, to be sent
alongside a Studio run log.

Gemlyx is a Danish travel guide. Entries are drafted by a research pipeline:
Tavily and Perplexity search, Google Places, Google Directions, page scraping,
then OpenAI organises the research into notes, Claude Sonnet writes the prose,
and a chain of deterministic gates and one model fact-check runs over the
result. Roughly 1.2 MB of `src/App.jsx` plus 60 utility modules, with a test
suite of 3898 assertions.

**How to be useful here, stated first because two previous answers were not.**

Two earlier second opinions on this pipeline were confidently wrong in the same
way: both diagnosed a generic AI failure mode rather than this code. One said
the model was inventing map data and the fix was to decouple map data from AI
creativity. That had already been closed weeks earlier. One said the model
"panicked" and produced a wrong station name, when in fact the model wrote the
correct name and deterministic code overwrote it.

So, three requests:

1. **Cite file and line.** A claim with no location cannot be checked and will
   not be acted on.
2. **Say what you would expect to see in the run log if you are right**, and
   what would falsify you. The run log is the evidence and it is attached.
3. **Name what you could not verify.** An answer that marks its own gaps is
   worth more than one that does not.

---

# Already closed. Please do not re-diagnose these.

Each of these was a real bug and each is fixed and pinned by tests. Raising them
again costs a round trip.

- **The model does not corrupt map or coordinate data.** `frozenGeo` overrides
  every coordinate, `keepMeasured` (`utils/correction.js`) restores every
  measured field after any model rewrite, `travelTime` is force-written from
  Google Directions, and `nearestStation` is set back to the measurement even
  after a correction pass.
- **The fact-check is not what strips transport out of drafts.** `travelTime` is
  in `MEASURED_FIELDS`, and the invented-claim check's own prompt says a
  measured field is not to be second-guessed. It is already exempt.
- **The journey is measured, stored and complete.** `journeyParts`
  (`utils/journey.js`) returns every transit leg in order with line, operator
  stops and minutes; it is persisted on the row as `__journey` and allow-listed
  in `shapeForLive`.
- **`nearestStation` no longer comes from a radius search.** It is the arrival
  stop of the last leg of the measured route (`arrivalStop`). A car ferry slip
  used to win the radius search for an inland festival.
- **At a Glance is extracted, not written.** `utils/glanceExtract.js` runs an
  extraction pass over the full research for the data fields, with measured
  fields excluded and an empty extraction never blanking a written value.

---

# Open problem 1: Danish rural transit coverage

**This is the one where outside knowledge genuinely helps, and it is the most
valuable question in this document.**

The pipeline routes Copenhagen to a destination with Google Directions in
transit mode, anchored to the next Tuesday 09:00 for reproducibility. When
Google returns no transit itinerary, the codebase treats that as UNCONFIRMED and
forbids any draft from stating that no public transport exists, because that
claim has been wrong every time it was checked.

That rule is correct but it produces silence, and silence is what a reader gets.

Questions:

- **How complete is Google's transit feed for rural Denmark?** Specifically
  regional bus operators: Movia, Sydtrafik, Midttrafik, NT, FynBus. Are there
  known systematic gaps, and are they by operator, by route type, or by time of
  day?
- **Is Rejseplanen the right second source?** It is the Danish national journey
  planner. Static GTFS is understood to be free but to require permission. What
  does that process actually involve for a small commercial site, what is the
  realistic timeline, and is there a real-time API worth having as well?
- **Is there any third option** that covers Danish regional bus better than
  Google, including anything that has changed in 2026?
- **Island ferries specifically.** Google's driving mode crosses ferries and its
  transit mode often does not index them. Are Danish ferry operators in any
  routable feed?

Falsifiable form: name the source, say what it covers that Google does not, and
say how a developer would verify that claim in one afternoon.

# Open problem 2: two research bodies that should be one

Verified, with line numbers, and not yet fixed because the right answer is a
design decision.

    App.jsx:3687   let userContent = rawResearch;
    App.jsx:3718   userContent = "ORGANIZED RESEARCH NOTES ..." + openAiNotes
    App.jsx:3736   askClaude(prompt + userContent)          <- the writer
    App.jsx:4505   researchForCheck(rawResearch)            <- the checker

Line 3718 **replaces** the research rather than adding to it, so the writer sees
only OpenAI's compression of it. The checker then grades the draft against the
original text the writer never read. The comment above the checker asserts they
are the same research. They are not, on every run where the OpenAI step
succeeds.

The checker's copy is also capped at 20,000 characters, keeping the first 7,000
and last 13,000 and dropping the middle. Measured from the code's own caps, a
typical festival draft assembles 30,000 to 60,000 characters, so truncation is
the normal case, and because of the assembly order the dropped middle is the
Tavily results, the founder-vouched sources and the Perplexity findings.

Questions:

- Should the checker read the notes (catching writer drift, the stated purpose),
  the raw research (catching structurer invention), or both as two passes?
- If the answer is a cap, is head plus tail the right shape, or should the
  research be assembled in authority order so any cut removes the weakest
  material first?
- Is there a cheaper deterministic pre-pass? Every figure in the draft that
  appears nowhere in the research is a set-membership test over the full text,
  with no token budget and no truncation.

# Open problem 3: the writing

**You can do something here that we could not: read the live pages.**
`https://www.gemlyxtravel.com`. The published prose renders client side out of
Supabase, so a plain fetch returns only the shell. Our review is of the brief
only, never of the output.

What the brief (`utils/studioPrompts.js`, 48 KB, plus `STUDIO_VOICE` in
`utils/studioContent.js`) does, measured:

- **Four different voices requested at once**: "a well-travelled local giving a
  friend the real, slightly blunt version", "a premium travel editor's voice",
  "a travel journalist", and "would a 16-year-old understand every word".
- **63 percent of instruction sentences carry a prohibition.** Craft stated as
  prohibition outweighs craft stated positively better than two to one.
- **Three good example paragraphs exist and all are disclaimed**: "SHAPE-ONLY
  EXAMPLE" nine times, "not a prose quality bar" five times, and `STUDIO_VOICE`
  separately says the example "is not a sentence-rhythm template to imitate"
  while the labels call it a rhythm reference.
- **111 em dashes in a file whose rule is that the em dash is the single most
  recognisable AI tell.** `stripDashes` then converts each surviving one into a
  comma splice, and nothing checks for comma splices.
- The same rule restated up to nine times; for one content type 87 percent of
  the brief is boilerplate shared with the other eight.

Questions, in order of value:

- **Read five live entries and tell us what the prose actually does wrong.** Be
  specific about sentence shapes, openings and repeated constructions. This is
  the thing we cannot do.
- Do entries repeat their opening shapes across the corpus? Nothing in this
  codebase compares a draft against published entries, and `STUDIO_VOICE`
  predicts exactly this failure.
- Which of the measured problems above would you fix first, and what evidence in
  the live prose supports that ordering?

# Open problem 4: what a run log is missing

The pipeline emits a structured run log, one `note()` per stage, with what was
asked, what came back, and whether it was used. A sample is attached.

Nothing measures **what each stage discarded**. Five compressions run in a row
and none reports its ratio. The tightest is `askOpenAI(..., 3000)` at
`App.jsx:3691`, a reasoning model whose internal reasoning shares that budget,
turning up to 60,000 characters of research into at most about 12,000 of notes.

Question: what else should a pipeline like this be recording that would have
made the last three bugs visible before a human noticed them? The three were: a
list of four content types beside a list of eight, a measured journey computed
and never stored, and a postcode discarded because of the noun printed next to
it.

---

# What is attached

- A Studio run log for one draft: 29 stages, providers, what each asked and got,
  plus a DECISIONS section recording every place two sources disagreed and what
  won.
- The resulting draft JSON, including the `__` provenance fields.

Both are real output from this pipeline, not constructed examples.

# The house rules, so a suggestion is usable

- **Never an em dash or an en dash**, anywhere, in any suggested code, comment
  or prose. Hyphens in compound words and number ranges only.
- **A request has a failure rate while code does not.** A fix that consists of
  telling a model to behave differently is weaker than one that makes the wrong
  behaviour impossible, and this codebase prefers the second.
- **"I could not find it" is not "it is wrong."** Nothing may state an absence
  from a failed lookup.
- **Every assertion must be shown to go red** when the rule it guards is broken.
  A suggested test that passes both before and after a fix is worse than none.
