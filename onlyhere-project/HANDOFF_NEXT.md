# Start here

Written 23 August 2026, at the end of a long session, for whoever picks this up
next. `HANDOFF_23AUG.md` is the running log of what happened and why; this file
is the orientation. Read this one first, then reach for that one when you need
the reasoning behind a specific decision.

---

## What Gemlyx is

A Denmark travel discovery and trip planning site at **gemlyxtravel.com**.
React 18, Vite 5, react-router-dom, Supabase for auth and content, deployed to
Vercel on push. One country, deliberately: Denmark is hardcoded past the point
of accident, and the reason is in `middleware.js:58`.

The repo lives at:

    C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project

Oliver commits and pushes himself. Claude writes files to his disk and tells him
what changed. Never commit or push without being asked.

Two commands before anything reaches him:

    node tests/run.mjs      # currently 9,898 passed, 0 failed
    npx vite build          # currently clean

A pre-push hook runs both. If either is red, nothing goes to disk.

---

## The four standing rules

These are his, not suggestions, and they hold everywhere: in replies, in code
comments, and in any copy the product generates.

1. **No em dashes and no en dashes, anywhere.** Use a comma, a colon or a full
   stop. `STUDIO_VOICE` already bans it for the model; the rule applies to
   everything you write too.
2. **Avoid the word "actually".** It is in the filler list for the same reason.
3. **Do not soften his criticism of Denmark in his own copy.** When he writes
   something blunt about a place, that is the voice, not an error.
4. **Scheduled tasks go through the Claude Code Remote MCP tools**
   (`create_trigger`, `send_later`), never the local `CronCreate` tools, which
   die with the session.

One more, about research: when `WebFetch` refuses a page on robots.txt, do not
reach for another way to get it. Use the browser bridge or say the page was not
reachable.

---

## How work is done here

**Every assertion is mutation tested.** Write it, then break the thing it
guards, and watch it go red by name. An assertion that has never failed is not
an assertion, it is a comment. This has caught real failures in the suite itself
more than once.

**Assertions pin behaviour, not numbers.** `is("three hundred metres is the
line", SAME_SPOT_KM, 0.3)` broke on a correct change, because it pinned the
figure rather than the rule. Its replacement pins a range and a real named case,
so a better number passes and a wrong one does not.

**Two strippers, and the difference matters.** `stripNonCode` blanks comments
*and* string contents; `stripComments` blanks comments only. A source-scanning
assertion written against raw source can be satisfied by your own explanatory
comment quoting the string it is looking for. That has happened nine times.
`tests/comment-audit.mjs` sweeps for it and is deliberately not part of the run.

**Do not add a new export to the suite without adding it to the bundle entry
line**, or you get `x is not a function` from a function that exists.

---

## The recurring bug, which is the most useful thing in this file

The signature failure in this codebase is not a crash. It is **a finished,
correct, well-tested function that nothing calls.** Ten instances so far. The
suite is green on all of them, because a unit test calls the function directly
and never asks whether the app does.

The second, related shape: **a check that answers a nearby question.** A
contrast assertion measuring a pairing nothing renders. A gate reading the last
message when it needed a latch. Both look right and both are green.

So: when you find a helper that does what you need, **grep for its call site
before you celebrate.** Import present is not called. And when a fix removes a
barrier, ask what else sits behind the same barrier before calling it done.

### The five that are unwired right now

Ordered by what they cost the reader. Each is an evening, not a project.

1. **`shutOnVisit`** in `src/utils/openingHours.js:252` answers "is this place
   closed on the day we scheduled it". No caller. Neither has `closedDays`,
   `dayOfVisit`, or `seasonalNotes`. A guide can send someone to a museum on its
   closed Monday and nothing objects.
2. **`profileForPrompt`** reaches the chat and Ask Gemlyx and **not the guide
   build prompt**. The comment at `App.jsx:18931` claims it hands the guide
   writer the same two blocks. It does not. Everything a returning traveller has
   told Gemlyx about themselves is absent at the moment the trip is written.
3. **`stampCheck` and `checkAge`** in `factSweep.js` are a closed loop where
   neither half runs. `stampCheck` writes the freshness stamp and is not
   imported outside the tests; `checkAge` reads it and is imported but never
   called. **Wire the writer first**, or the reader will correctly report that
   nothing has ever been checked.
4. **`selectedName`** in `GuideRouteMap.jsx:69` is destructured and never read,
   so a selected map pin gets no highlight.
5. **`auditEntry`**, 119 KB of it, is called only from the Studio assistant to
   build prompt text. It is not on the publish path. `App.jsx:8524` says it
   better than I can: a checker that reports is not a gate.

---

## Where things stand tonight

**On his disk and green:**

* `src/utils/guideEnrichment.js` plus `tests/run.mjs` and `HANDOFF_23AUG.md`,
  carrying the two guide fixes below.
* `src/components/WeatherStrip.jsx`, carrying the developer-note fix.

**Guide fix 1: a car leg shorter than a walk is a walk.** His live guide said
"5 mins by car" for central Copenhagen legs, on the same page whose essentials
said *lad bilen stå: parkering er dyrt og svært*. The transit branch of
`resolveLegMode` has had this rule since Ærøskøbing; driving never did. The
`isFerryText` guard is load bearing: a short hop across water is a short
distance and a car is the only way to make it.

**Guide fix 2: `SAME_SPOT_KM` is 0.12, was 0.3.** The guide printed "Same place,
nothing to travel" between Design Museum Denmark and Amalienborg, which are
350 m apart on Bredgade.

**Weather fix: a developer note was rendering on the live site.** The weather
strip's failure state read *"check /api/weather.js is deployed with a working
User-Agent"*, to travellers, on the Essentials page. Replaced with a sentence
that names the load as the thing that failed, so a failed request can never be
read as a claim about the weather. The new assertion is a rule, not a string: no
`.jsx` file may contain an `/api/<name>.js` path once comments are stripped,
because a component fetches the extensionless route and never needs the
filename.

---

## The fifty point review, and what to do next

He ran Gemlyx past ChatGPT, which returned fifty recommendations addressed to
Claude and asked for a triage. Every one was checked against the source rather
than the site. **Seventeen are already built and reaching people, twenty-three
are part-built, seven are absent, and one is absent on purpose.** The full
per-item triage, with file and line evidence for each, was delivered as an
artifact on 23 August and is the reference to work from.

The order I would work in, which is not the reviewer's order because the
reviewer could not see the code:

1. **Wire the five above.** Best value per hour on the whole list.
2. **The English frame around the Danish prose.** Around ninety hardcoded
   English strings on the guide surface, no `t()` and no catalogue anywhere. The
   model writes good Danish into a permanently English frame: four English
   essentials headings sitting on top of Danish paragraphs, twelve English
   loading labels. **This is the thing his father hit.** Tedious, not hard.
3. **Say on the homepage what the product is.** The meta description already
   stakes the right claim, about places checked against their own sources. The
   hero says "Beyond the guidebooks" and "Hidden gems", which every competitor
   says. Verification is the defensible position and it is nowhere above the
   fold.
4. **Stop shipping the Studio to travellers.** One 1.62 MB chunk, 530 KB
   gzipped, no code splitting at all. Every first-time visitor downloads the
   founder Studio and the 119 KB auditor to read the homepage. A `manualChunks`
   split plus `React.lazy` on the guide page roughly halves first paint with no
   design change.
5. **Keyboard and focus.** `tabIndex` is used zero times in the whole repo,
   there are thirty-seven clickable divs in `App.jsx` and thirty-eight instances
   of `outline: none`. Parts of the interface cannot be reached with a keyboard.

Still open from reading his live guide at `/guide/4c1vzfmge00`, unfixed:

* Møns Klint and Fanefjord Kirke have no coordinates, so the numbering falls
  back to letters and his guide has stops "M" and "F" among 1, 2, 3.
* Rundetaarn's description is truncated to the single word "Bygget".
* Summer copy on a November trip, in two places.
* Rundetaarn marked "Free to enter", which needs his fact check.
* The inverted weather sentence.
* The route line omits the return leg.

And from his own notes, still unanswered: events limited to two months ahead and
major-only in busy cities; how themes are assigned and why nightlife never
appears; "if uncertain, research further, ignore the 8-website limit"; region
shown above each attraction; too many restaurants.

---

## Things only he can do

* Verify Ticketmaster covers **.dk** and not just .com. Impact's link had a
  hardcoded `.com` front page destination, recorded in the comment above
  `TICKETMASTER_AFFILIATE_TEMPLATE` in `src/config.js`.
* Click one live ticket link and confirm the deep link carries through to the
  event page rather than the front page.
* Supply a real, fact checked guide for `src/data/exampleGuide.js`. It ships
  empty on purpose: `EXAMPLE_GUIDE = null`, and `exampleGuideProblems` explains
  why an invented example would be the one page on the site that breaks the
  promise the rest of it keeps.
* Put the settings screen in front of his father.

---

## One thing worth knowing about the competition

Layla is the closest funded competitor: Berlin, 3M euro seed from the founders
of Skyscanner and lastminute.com, over two million trips planned, 49 euro a
year on top of affiliate income. Their advantage is distribution, not product:
they had Beautiful Destinations' audience before they had a planner, then
bought the planner.

Independent reviews of Layla land on the same three complaints, and all three
are things Gemlyx has already built: no cost breakdown, no verification, and no
reasoning you can audit. **The thing every reviewer says the funded competitor
lacks is the thing Gemlyx built and does not say on its homepage.** That is
point 3 above, and it is why point 3 is worth more than it looks.
