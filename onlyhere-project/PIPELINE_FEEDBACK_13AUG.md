# Feedback on the AI pipeline

13 August 2026, after a night inside it. Five things, ranked by payoff over
effort. Every one is grounded in code that is already in your repo, and most of
them are you applying a rule you already hold to a place you have not applied it
yet.

I want to say the honest thing first: **this pipeline is unusually good.** Not
polite good. The gates, the provenance, the source hierarchy, the refusal to let
a non-answer carry the authority of an answer, the habit of writing down why a
line exists so the next person cannot delete it by accident. Most content
pipelines are a prompt and a hope. The recommendations below are the kind you
only get to make about something already built well.

---

## 1. Your free checks read a slice. Your paid check reads everything. That is backwards.

This is the one to do first, and it is provable from two lines.

**The deterministic price tracer** (`App.jsx:4146`):

    const pt = tracePrices(readerText(t), scrapedSiteText, listingSiteText);

`scrapedSiteText` and `listingSiteText` are the scraped pages and the ticket
pages, and nothing else. So `tracePrices` **never sees**:

    the Tavily search results
    the Perplexity findings
    the founder vouched source snippets
    the frozen facts, the hours, the address
    the research memory from the last draft

**The model check** (`App.jsx:4505`) gets all of it, and has to be cut to 20000
characters to afford it.

So the check that costs nothing per character is given the narrow window, and
the check that costs money per character is given the wide one and then
truncated. Swap them and both get better at once:

- **`tracePrices` over the whole of `rawResearch`.** It is code. There is no
  budget. A price from a `visitsønderjylland.dk` snippet stops being untraced.
- **Then the model check only has to handle what code cannot**: tone, framing,
  a claim with no figure in it. Which is a much smaller job, which means a much
  smaller prompt, which means the cap stops firing.

And the same extension, one step further: you already have `pricesIn` and
`datesIn`. **A figure that appears in the draft and nowhere in the research is
the actual invention mode**, and it is a set-membership test, not a judgement
call. Numbers, dates, prices, distances, opening hours. Code can answer that
over 60,000 characters in a millisecond and never be wrong about it.

That leaves the model check doing the one thing it is genuinely better at, which
is prose that asserts something no number can carry: *"coach loads of visitors
arrive from around the country."*

You already framed this as moving surface from the right column to the left.
This is the biggest remaining piece of surface, and the machinery for it is
already written.

## 2. Nothing measures what each stage throws away

The pipeline is five compressions in a row and not one of them reports its ratio.

    web page              -> scan-source TEXT_CAP          20,000 per page
    scan-source           -> context slice                  2,200 per page
    context               -> rawResearch                   ~30,000 to 60,000
    rawResearch           -> OpenAI notes                   3,000 tokens, max
    notes                 -> Claude draft                  ~2,000 chars of prose

**The fourth arrow is the one to look at.** `askOpenAI(..., 3000)` at
`App.jsx:3691`, and your own comment at 3692 says the quiet part: gpt-5.6-sol is
a reasoning model and its internal reasoning shares that budget. So a 47,000
character research blob becomes at most about 12,000 characters of notes, and
on a run where it thinks hard, considerably less.

**That is the stage that decides what Claude is allowed to write about**, and
nothing anywhere records how much of the research survived it. If an entry ever
reads thin, or a detail you know was found never appears, this is the first
place to look and there is currently nothing to look at.

The fix is a `note()`, not an architecture change:

    note("Research organizing", {
      got: `${rawResearch.length} chars of research became ${structureResult.text.length} chars of notes`,
      why: ratio < 0.15 ? "most of the research did not survive this stage" : "",
    })

You have 55 `note()` calls and they are the best thing about debugging this
pipeline. This is the one that is missing, and it is at the tightest funnel.

## 3. Order the research by authority, not by arrival

`rankSources` already computes exactly the right ordering. `sourceOrderBlock`
then uses it to **tell the model** what the order is, and the research itself is
assembled in the order it happened to arrive (`App.jsx:3672-3678`), with
`context` last because that is where it was accumulated.

That is why truncation eats the search results. Not by design, by accident of
concatenation order.

If `rawResearch` were assembled in the authority order the pipeline has already
worked out, then **any cut, anywhere downstream, removes the weakest material
first.** Truncation stops being a thing to avoid and becomes a thing that is
safe. You would not have needed the plea in the truncation marker, because the
part being dropped would be the part that was already ranked last.

It also means the model reads the good sources first, which is where attention
is cheapest.

## 4. "Never a silently shorter list" applies to research too

You hold this rule and you enforce it well. The Discover panel says how many
candidates it removed and why. `App.jsx:2535` reports the domain variants past
Tavily's limit. That is exactly right.

The research stage drops things without saying so:

    candidate URLs past 5 (place types) or 3     App.jsx:3288
    Tavily results past 6 per query              App.jsx:2134
    founder domains past 4                       sourcePolicy.js:342
    ticket pages past 2                          pageScan.js:399
    the official site query's results entirely   App.jsx:2222

That last one is worth a separate look. The official site query appends only
`oData.answer` and never calls `labelled(oData.results, ...)`, so those pages
contribute their URLs to the candidate pool and **not one word of their text**.
For a query whose entire purpose is finding the official site, that is the
material you most wanted.

None of these is necessarily wrong as a cap. The point is that a run where 14
promising URLs were found and 5 were opened looks identical, in the log, to a
run where 5 were found and 5 were opened. One of those is a good draft and the
other is a draft with nine unopened doors, and you cannot currently tell them
apart.

## 5. One stage writes and is never read against its input

Every other stage in this pipeline is checked against something. The structuring
step is not: its output becomes `userContent` and the next thing that happens is
Claude writing from it.

The invented check does eventually catch a structurer invention, since the draft
is compared against `rawResearch`. But it catches it **four hundred lines later,
attributed to Claude, priced at a re-research and an 8192 token rewrite**, and
by then the blame is on the wrong stage and the fix is the expensive one.

The cheap version is the same idea as recommendation 1, one stage earlier: **do
all the figures in the notes appear in the research?** Code, free, instant, and
it catches the invention where it happened, in the run log, by name.

    note("Research organizing", {
      why: "3 figures in the notes are not in the research: 450 kr, 1893, 22 km",
    })

Same test, run twice, at the two places a number can appear from nowhere.

---

# What I would not change

Worth saying, because a feedback document that only subtracts is easy to
misread.

- **The hard fail on a real structuring error, soft fallback on empty.** That is
  the right asymmetry and the comment argues it correctly.
- **Warn rather than block on the hand editor.** Also right, for the reason you
  gave: a person fixing a real error should not be stopped by a rule that cannot
  see why.
- **Three verdicts on the invented check, not two.** "It did not answer" being
  its own outcome is the single most mature thing in this codebase. Most
  pipelines have two states and quietly fold the third into whichever is more
  convenient.
- **`keepMeasured`.** A model rewrite that can silently drop a Google measured
  travel time is the failure that would be hardest to ever notice, and it is
  closed.
- **The comments.** They are long and they are the reason a stranger could pick
  this up. Do not let anyone talk you into trimming them.

# The order I would do them in

    1. tracePrices over all of rawResearch          small, free, biggest win
    2. the two note() calls in section 2 and 5      an hour, and it makes the
                                                    rest measurable
    3. authority ordering of rawResearch            medium, makes truncation safe
    4. the drop counts in section 4                 mechanical
    5. figure tracing for dates and numbers         the real prize, and worth
                                                    doing after 1 proves out

Nothing here needs doing tonight. 1 and 2 together are maybe an evening, and
they would tell you more about your own pipeline than anything else on the list.
