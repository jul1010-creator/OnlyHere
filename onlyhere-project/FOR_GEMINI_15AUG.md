# Gemlyx: what is still open, and what to send with each question

14 August 2026. Replaces FOR_A_SECOND_OPINION.md from yesterday, which is now
out of date: most of what it listed has been built.

Gemlyx is a Danish travel guide. A research pipeline drafts each entry: Tavily
and Perplexity search, Google Places, Google Directions, page scraping, then
OpenAI organises the research into notes, Claude Sonnet writes the prose, and a
chain of deterministic gates plus one model fact-check runs over the result.
About 1.2 MB of `src/App.jsx` and 60 utility modules, with 3977 test assertions.

---

# Read this part first

Three earlier answers on this codebase were confidently wrong in the same
direction, and each cost a round trip. All three blamed a language model for
something deterministic code did:

1. **"The AI is inventing map data, decouple it."** Already closed weeks
   earlier. `frozenGeo` overrides every coordinate, `keepMeasured` restores
   every measured field after any model rewrite, `travelTime` is force-written
   from Google.
2. **"The AI panicked and produced a wrong station name."** The model wrote the
   correct name. The draft's own `__notes` recorded it. Deterministic code
   overwrote it from a radius search four hundred lines later.
3. **"OpenAI saw the ferry pier was closer and altered the data string."** The
   run log names exactly which three fields the OpenAI pass touched, and
   `nearestStation` is not among them. It cannot be: it sits in
   `MEASURED_FIELDS`, which the extractor excludes wholesale.

So, three requests:

- **Cite file and line.** A claim with no location cannot be checked and will
  not be acted on.
- **Say what you would expect to see in the run log if you are right**, and what
  would falsify you. The run log is attached and it is the evidence.
- **Name what you could not verify.** An answer that marks its own gaps is worth
  more than one that does not.

# Already built. Please do not re-diagnose these.

- The measured journey is kept whole: every transit leg in order with line,
  operator stops and minutes, stored on the row as `__journey`.
- `nearestStation` is the arrival stop of the last leg of the measured route,
  not the nearest transit-typed place by distance.
- `travelTime` comes from the measured integer, never parsed out of prose.
- At a Glance is extracted from the research rather than written, with measured
  fields excluded and every figure checked against the research before it lands.
- Coordinates: a postcode lookup is structured and must prove it found the
  postcode it asked for.

---

# The open questions, and what to send with each

## 1. Seasonal and event transit in Denmark

**This is the one where your search access is worth the most.**

The transit query is anchored to the next ordinary Tuesday at 09:00, on purpose,
so a published travel time does not depend on the accidental minute a draft was
generated. Measured on the live API, Copenhagen to Møgeltønder at 22:38 gives
5h53 and a normal weekday morning gives 4h39. Same route, 74 minutes apart.

The cost of that anchor is that **no seasonal service is ever in the feed**. A
Roskilde Festival draft routed via bus 202A to a stop called Roskilde Ring with
a 19 minute walk at the end, because Roskilde Festivalplads Station only runs
during the festival and the query asked about an ordinary Tuesday.

- How complete is Google's transit feed for rural and regional Denmark:
  Movia, Sydtrafik, Midttrafik, NT, FynBus? Are the gaps by operator, by route
  type, or by time of day?
- **Are Danish seasonal and event services in any routable feed at all**, and if
  so which? Festival shuttles, summer ferries, Roskilde Festivalplads.
- Is Rejseplanen the right second source? Static GTFS is understood to be free
  but to need permission. What does that process involve for a small commercial
  site, and how far ahead does its data reach?
- Google's feed does not extend to a 2027 festival date. Does any Danish source?

**Send:** this note, `api/directions.js` (11 KB), `src/utils/journey.js` (31 KB),
and the Roskilde run log and draft.

## 2. Two research bodies that should be one

    App.jsx:3687   let userContent = rawResearch;
    App.jsx:3718   userContent = "ORGANIZED RESEARCH NOTES ..." + openAiNotes
    App.jsx:3736   askClaude(prompt + userContent)          <- the writer
    App.jsx:4505   researchForCheck(rawResearch)            <- the checker

Line 3718 replaces the research rather than adding to it, so the writer sees
only OpenAI's compression of it and the checker then grades the draft against
the original text the writer never read. The comment above the checker asserts
they are the same research. They are not.

The checker's copy is also capped at 20,000 characters, first 7,000 and last
13,000, middle dropped. Computed from the code's own caps, a typical festival
draft assembles 30,000 to 60,000, so truncation is the normal case, and the
assembly order puts the search results in the dropped middle.

- Should the checker read the notes, the raw research, or both as two passes?
- If a cap stays, is head plus tail right, or should the research be assembled
  in authority order so any cut removes the weakest material first?

**Send:** this note, `src/utils/factCheckRead.js` (17 KB), and any run log.

## 3. The writing

**You can do something we could not: read the live pages.**
`https://www.gemlyxtravel.com`. The prose renders client side out of Supabase,
so a plain fetch returns only the shell.

Measured facts about the brief, not opinions:

- **Four different voices requested at once**: "a well-travelled local giving a
  friend the real, slightly blunt version", "a premium travel editor's voice",
  "a travel journalist", and "would a 16-year-old understand every word".
- **63 percent of instruction sentences carry a prohibition.** Craft stated as
  prohibition outweighs craft stated positively better than two to one.
- **Three good example paragraphs exist and all are disclaimed.** "SHAPE-ONLY
  EXAMPLE" nine times, "not a prose quality bar" five times, and the voice block
  separately says the example "is not a sentence-rhythm template to imitate"
  while the labels call it a rhythm reference.
- **111 em dashes in a file whose rule is that the em dash is the single most
  recognisable AI tell.** A post-processor then converts each surviving one into
  a comma splice, and nothing checks for comma splices.
- One rule restated up to nine times; for one content type 87 percent of the
  brief is boilerplate shared with the other eight.

Questions, in order of value:

- **Read five live entries and say what the prose actually does wrong**, in
  terms of sentence shapes, openings and repeated constructions.
- Do entries repeat their opening shapes across the corpus? Nothing compares a
  draft against published entries, and the voice block predicts exactly that.
- Danish terms are reaching English prose untranslated ("mosteri", "ponytræk").
  Is that visible on the live pages, and how widely?

**Send:** this note and `src/utils/studioPrompts.js` (48 KB). The live URL is
enough for the reading half.

## 4. Uncertainties about our own taxonomy

A Roskilde draft produced these, for a reader:

    "The 'Major' scale label could not be verified from the pages reached"
    "The 'Highly Recommended' tier label could not be verified"

Those are Gemlyx's own editorial labels. No page will ever state them. The model
is caveating our filing system to a traveller.

- Should `uncertainties` be restricted to claims about the world, and if so is
  that best done in the prompt or as a deterministic filter on the field names?

**Send:** this note and `src/utils/entryAudit.js` (76 KB).

## 5. What a run log should record and does not

The pipeline emits one entry per stage: what was asked, what came back, whether
it was used, plus a DECISIONS section naming every place two sources disagreed
and what won. A sample is attached.

Nothing measures **what each stage discarded**. Five compressions run in a row
and none reports its ratio. The tightest is a 3,000 token OpenAI call whose
internal reasoning shares that budget, turning up to 60,000 characters of
research into at most about 12,000 of notes.

- What else should a pipeline like this record, such that the last five bugs
  would have been visible before a human noticed them? Those five were: a list
  of four content types beside a list of eight; a measured journey computed and
  never stored; a postcode discarded because of the noun printed next to it; a
  regex whose group was "festival/event " while the model wrote "festival"; and
  a caveat that contradicted the field beside it.

**Send:** this note and the run log alone. No source needed.

---

# What NOT to send

`src/App.jsx` is 1.2 MB. Sending it produces a generic answer about large React
files. If a question genuinely needs it, send the named line ranges from the
section above instead.

The run log is worth more than any source file. It is what turned "the maps are
broken" into "step 2 discarded a postcode", and it is small.

# House rules, so a suggestion is usable

- **Never an em dash or an en dash**, anywhere, in suggested code, comments or
  prose. Hyphens in compound words and number ranges only.
- **A request has a failure rate while code does not.** A fix that consists of
  telling a model to behave differently is weaker than one that makes the wrong
  behaviour impossible, and this codebase prefers the second.
- **"I could not find it" is not "it is wrong."** Nothing may state an absence
  from a failed lookup.
- **Every assertion must be shown to go red** when the rule it guards is broken.
  A suggested test that passes both before and after a fix is worse than none.


---
---

# APPENDIX A: a real run log

Roskilde Festival, 14 August 2026, 241 seconds, 37 steps, 35 ok, 2 found
nothing, 0 failed. Providers: fetch, tavily, perplexity, google, ticketmaster,
openai. This is unedited output from the pipeline described above.

Read the DECISIONS section at the end first. It records every point where two
sources disagreed and states the rule that settled it, which is the fastest way
to see what this pipeline enforces in code rather than asks for in a prompt.

    PASTE THE ROSKILDE RUN LOG HERE
    (the 37 steps and the DECISIONS block, exactly as Studio printed it)

# APPENDIX B: the draft that run produced

    PASTE THE ROSKILDE DRAFT JSON HERE

Three known faults in it, so they do not need re-finding:

1. `nearestStation` reads "Roskilde Ring". The measured route genuinely ends
   there, because the transit query is anchored to an ordinary Tuesday and
   Roskilde Festivalplads Station only runs during the festival. This is
   question 1 in the note above.
2. Two of the four `uncertainties` apologise for Gemlyx's own labels, "Major"
   and "Highly Recommended". No page will ever state those. Question 4.
3. The website caveat contradicted the populated `website` field. Cause found
   and fixed: a filter whose regex group was the literal "festival/event " while
   the model wrote "festival". Included as an example of the failure shape this
   codebase keeps producing, where a check misses for its vocabulary rather than
   its logic.
