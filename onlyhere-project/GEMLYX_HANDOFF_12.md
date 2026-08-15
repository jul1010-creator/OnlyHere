# Gemlyx handoff 12

Written 15 August 2026, at the end of a session that ran from the 13th. Read
this before touching anything. It is the only thing carried over.

---

## 0. The rules. These are not preferences

**NEVER use a dash. Anywhere.** Not em, not en, not as punctuation, not in a
reply to Oliver, not in generated content, not in a comment, not in anything any
model produces. Hyphens only inside compound words and number ranges. The
codebase has `stripDashes` and `stripDashesDeep` for exactly this and every path
from a model to a reader is supposed to run through one of them. He has raised
this more than any other single thing.

**Words he does not want:** "actually", "truly", "genuinely", "simply". Cut them
from prose and from replies.

**"You are allowed to edit. Just do NOT sync anything. Edit bugs is completely
fine."** Work on files freely. Do not push. Do not commit unless he asks.

**Never overwrite his files with older content.** If in doubt about whether his
disk copy is newer, ask rather than write.

**Web content only via WebFetch or WebSearch.** Never curl, wget, python
requests, or any other fetch. This is a hard product rule, not a preference.

**A request has a failure rate while code does not.** This is the codebase's
first standing rule and it decides most design arguments here. If a model is
being asked to remember something, that is a request. Make it code.

---

## 1. Where everything is

- **Sandbox:** `/tmp/oh/onlyhere-project` (this is where you work)
- **His disk:** `C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project`
- **Live site:** `https://www.gemlyxtravel.com`
- **Stack:** React + Vite SPA on Vercel, Supabase backend, serverless routes in `api/`
- **Size:** `src/App.jsx` is about 1.25 MB. Around 68 utils. Suite is `tests/run.mjs`.

To get work onto his machine: `SendUserFile`, then
`mcp__remote-devices__device_commit_files` with the absolute Windows path. Both
in one turn. He has approved this pattern.

**Nothing has been committed or pushed for this entire session.** The last
commit is `78329b6` from 13 August. There are 57 changed or new files against
it. Everything is written to his disk; the git history is untouched on purpose.

---

## 2. How to work in this codebase

**The suite is 4585 assertions and it is the product, not a chore.** Every rule
of any consequence has an assertion, and the comment above each one names the
report it came from, usually in Oliver's own words. Match that style. A comment
that says what the code does is noise; a comment that says what went wrong and
who found it is why this codebase can be edited at four in the morning.

**Mutation testing is required, not optional.** Writing an assertion is half the
work. Break the rule, confirm the assertion goes RED, restore the file, and
verify the restore with a checksum. Harnesses from today are at `/tmp/mut*.mjs`
and are worth copying. Rules learned the hard way:

- **A crash is not a failure.** A test that throws aborts the whole file and
  every assertion below it silently disappears, which reads as a pass. Use `?.`
  and `|| {}` liberally in fixtures. This happened twice today.
- **A test can pass for the wrong reason.** If a mutation survives, the
  assertion may be green for a reason unrelated to the rule. One survivor today
  was green because the fixture's tie-break gave the right answer anyway.
- **A survivor sometimes means the code is wrong, not the test.** One survivor
  today led to a better design (towns keep the widening tier).
- `stripNonCode()` blanks string literals, so an assertion about a message must
  read raw source.
- Always restore in a `finally`, then re-hash every file and print whether the
  restore held.

**Run `npx vite build` as well as the suite.** The suite does not catch every
JSX or import error.

**Fable.** Oliver has said repeatedly: "if you ever struggle and need Fable's
help, then just call for Fable to help you." Spawn an Agent with
`model: "fable"` for read-only audits of a subsystem. It found eight defects in
one morning's work, and today it produced the full diagnosis of two separate
pipelines. Give it the exact symptom, the file list, numbered questions, and ask
for file:line evidence and a CONFIDENT/PLAUSIBLE mark on each finding.

**How he reports bugs.** Almost always a screenshot or a pasted run log, with
one sentence. The sentence is usually right and usually understates it. Treat a
screenshot as measured evidence and go and find the line.

**Reading live state.** His Chrome is available through `mcp__claude-in-chrome__*`.
Today the decisive evidence came from pulling the guide object straight out of
the running React tree with `javascript_tool` (walk `__reactContainer$…` from
`#root`, look for `memoizedProps.guide`). That beats reasoning about what the
code probably did.

---

## 3. What was done today, so you do not redo it

Roughly, and only so you recognise the names. The `.md` notes named at the end
of each line carry the full story.

- **Guide leg correctness.** Root cause: `towns` was in `lookupRealPlace`'s
  pools, so any stop naming its own town ("Aarhus Ø", "ARoS Aarhus
  Kunstmuseum", "Kolding City Centre") matched the TOWN, marked precise, skipped
  geocoding, and was sent to Google as the town centre. Fixed: a town row may
  only match exactly. Plus `upgradeWorthIt` (a re-route must save five minutes),
  `COLLAPSE_KM`, the rescue path's missing guards, `preciseCoord` reading its
  own flag, and the no-route branch losing its private 3 km threshold.
  → `LEGS_15AUG.md`
- **Weather.** `FORECAST_HORIZON_DAYS` was 6 because the API sliced MET Norway
  to 7 buckets; MET carries about ten. Now 9 and 10, tied by an assertion. The
  normals sentence leads with the temperatures, does not assume an aeroplane,
  reads the horizon off the constant, and says when it covers fewer days than
  the trip has. The per-day weather point now reads the stop's stated `town` and
  the guide's own geocodes, which is why three of five days had no badge.
- **`closedButPlanned`.** A stop the guide's own prose calls closed may not also
  be a planned stop. Runs on the clause, not the sentence, so an honest "may
  already be closed" caution survives.
- **The preview narrowing.** `wantedCategories` reads the traveller's own turns
  and the intake form. A brief naming only events gets empty Attractions and
  Food sections with an "Add attractions" door; nightlife rides with events on
  his call. Ticked additions reach the PLANNER as fixed points. Each offered card
  has an Ask button that opens Gemlyx inside the preview overlay.
- **The Open button.** `studioLoading` is true for two different runs and only a
  manual one can hurt the editor; a queued run passes `queued: true` precisely so
  it cannot. `manualDraftRunning` now tells them apart, a held button looks held,
  and the reason is on screen rather than in a `title`.
- **The date gate.** His rule, verbatim: *"An event must NEVER be published
  without a date."* Now enforced in `publishDraft` beside the coordinate gate,
  and it blocks an edit too. The past-date strip that emptied the dates read
  `dateStart` against `now`; it reads the END of the run against the start of
  today now. A dateless draft can take an upcoming Ticketmaster listing's dates.
- **The Danish.** `glanceExtract`'s prompt had no language instruction and
  `mergeGlance` checked digits only, so untranslated Danish beat the writer's
  correct English. Both fixed. `looksUntranslated` is keyed on Danish function
  and ticketing words, never on æøå, because Danish proper nouns are correct in
  an English field.
- **`languageBarrier.js`.** His idea: *"make people aware that an event might
  have a great language barrier."* Measured off the organiser's own pages,
  stamped on the row, shown as a Language row in At a Glance. No operator page
  read means no row.

---

## 4. What is open. This is the payload

Ranked by what I would do next. Everything here is either measured or was
reported by him and never closed.

### 4a. Off the Kaløvig Havnefestival draft, found by Fable, not yet fixed

1. **`lastLegProblems` tells the writer to delete a true sentence.** The `1 min
   on foot` in `__notes` came from a radius search to "Under Rønnene/Åstrup
   Strandvej", a DIFFERENT bus stop from the one `__journey`'s last leg ends at
   ("Kaløvig Lystbådehavn/Åstrup Strandvej", reached by a 50 minute bus 17). The
   pipeline already adjudicated that pair and logged that the measured stop won,
   and then let the losing stop police the prose. `lastLegProblems`
   (`src/utils/journey.js`) never reads `__journey.legs`; it takes
   `frozenGeo.walkMinutes` (`src/App.jsx` around 3030, call site around 4706).
   It also matched the word "bus" in a whole-journey sentence, which
   `NOT_FOR_A_SHORT_WALK` cannot tell from last-leg advice. **Fix: read the
   measured journey's own last leg.**

2. **`hostMatchesName` cannot match a Danish domain to its own name.** It folds
   ø to "oe" (`src/utils/helpers.js` around 698) while Danish domains and this
   repo's own `slugify` use a plain o, so `kalovighavnefestival.dk` never matches
   "Kaløvig Havnefestival". Result: `website` on that draft is the HOTEL's site,
   because Google Places' registered business URL fills the field first
   (`src/App.jsx` around 4392) and the only relevance check is that broken one.
   Two folding conventions for one letter in one codebase.

3. **The whole logistics-checking layer is digit-only.** `LOGISTICS_IN_PROSE`
   requires `\d`, and `durationsIn`, `journeyDurations` and `transitProblems`
   all parse digits. That draft wrote "over four hours by train and bus" and "a
   three-and-a-half-hour drive" in words, so every logistics gate in the product
   saw nothing to check and reported clean.

4. **`auditEntry` gates nothing.** It is called from the StudioAssistant panel
   and from `factSweep` over already-published rows, never from `generateArea`,
   `gateDraft` or `publishDraft`. Every finding in it, including the
   verdict-as-prose and logistics ones added yesterday, runs after publication in
   a chat panel where somebody has to go and look.

5. **`ticketStatus: "unknown"` beside two exact prices.** The pipeline
   established a real price on the operator's own site and filed the entry as
   status unknown, and nothing pairs a priced `ticketInfo` with a status.
   Reader sees prices and no availability badge at all.

6. **`__priceSource` records one figure by construction.** `priceSource` returns
   the first matching key, so a two-tier price can never be recorded as two, and
   `PRICE_RE` cannot parse the Danish `395.00,- DKK` form at all, so that figure
   is invisible to the whole price-tracing layer.

7. `travelTime` hardcodes 🚂 on a train-plus-bus journey. `journeyParts` already
   computes the vehicle set one line away.

8. `nearestStation` stores a bus stop and throws away its kind, so `arrivalRow`
   guesses from the name and falls through to a generic "Nearest Stop".

### 4b. From the live guide `ofbyfygz4de`, still his to decide

9. **The guide contradicts itself about where you sleep.** MONEY says "basing in
   Aarhus for five days", Day 3's stop text says "before the train back to
   Aarhus", and Day 3's Where to stay says "Stay in central Kolding". The header
   says 4 TOWNS and "you change town 3 times" for what is one base with day
   trips. Same class as `closedButPlanned` and gateable the same way, but it
   needs a rule for what a day trip IS. **Ask him.**

10. "an affordable hostel from $76" two cards from "from 750 DKK". Dollars in a
    Danish guide.

11. The photo-less hero is still about 230px of nothing with a floating emoji.
    The guide page already solved this with a designed monogram plate. **Design
    decision, his.**

12. "NEARBY, WORTH KNOWING ABOUT" lists June and May 2027 festivals under a
    heading that implies relevance now. Either a horizon or say how far off.

### 4c. Older, still open

13. **Ranking attractions inside a named town.** Same defect as the region pass
    (database order). For Copenhagen it decides which three of thirty a traveller
    sees first. Needs his taste, not a rule. **Ask him for the axis.**
14. **The price layer's four remaining holes** (Fable found them; see
    `PIPELINE_15AUG.md`).
15. **The scrape queue ranking**, host versus path.
16. **The writing brief.** Four voices requested at once and 63 percent of
    instruction sentences carrying a prohibition. That is a rewrite and it is
    his to steer.
17. **"Island" as a wanted thing.** A seven-day ferry brief named no place and
    got an empty list.

---

## 5. Before he pushes

Say this to him, because it is the honest state: **the whole of 13 to 15 August
is unrun.** 4585 assertions are unit-level and source-level. The Studio doors,
the bar street type, the three-level nightlife navigation, the split
fact-checker, the guide legs, the preview narrowing, the date gate and the
language row have not been exercised by a real click or a real draft. One draft
end to end and one guide build would tell him more than another thousand
assertions.

He knows. He has been told twice. Say it once more when he asks about pushing
and then leave it.

---

## 6. Tone

He is building this alone, fast, and he is right about his own product far more
often than not. When he says something is wrong, it is wrong; the only question
is where. Be direct, own mistakes plainly (several of today's bugs were mine
from earlier the same day, and saying so cost nothing), and do not pad. He reads
everything.
