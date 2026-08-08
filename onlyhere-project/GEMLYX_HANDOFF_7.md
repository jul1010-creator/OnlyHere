# Gemlyx handoff 7 — 8 August 2026

Everything from this session, what is verified, what is not, and what to do next.
Successor to `GEMLYX_HANDOFF_6.md`.

---

## The through-line

Three things shipped: **link sharing**, **a place taxonomy**, and **a crash fix**. Every one
of them turned up the same failure shape this project keeps hitting:

> **A silent failure that looks like a working feature.**

The Copy link button worked perfectly and every link landed in WhatsApp as a bare grey URL.
The taxonomy rendered in five places and the publish path dropped all three fields on the
floor. The TDZ scanner ran green while never scanning 98% of the file it was written for.

Nothing here is finished until you can *see* it failing when it fails.

---

## 1. Link sharing

### What a person sees

A share panel on any saved guide: native share sheet on mobile, copy-link with real
feedback, WhatsApp and email links on desktop. It opens itself the moment a guide is saved,
because that is the second somebody wants to send it. A **＋ Keep** button so whoever opens
your link can save it into their own guides — that path did not exist, so a shared guide was
a dead end for the recipient.

### The half that decides whether it works

`index.html` carried **no Open Graph tags at all**. WhatsApp, iMessage, Slack, Discord and
Facebook do not run JavaScript — they fetch the URL once, read the `<meta>` tags, and render
a card. So every Gemlyx link ever pasted anywhere arrived as a bare grey URL. A share button
alone would have shipped nothing.

| File | Role |
|---|---|
| `src/utils/share.js` | All share copy, **counted** from the plan (days, stops, endpoints), never written. All-or-nothing: returns `null` rather than a partial truth. |
| `src/utils/linkPreview.js` | Pure: crawler regex, `guideIdFromPath`, `buildPreviewHtml`, `injectMeta`. |
| `middleware.js` | Vercel Edge Middleware, `matcher: "/guide/:path*"`. Fetches the guide, injects per-guide tags into the real built `index.html`. |
| `index.html` | Site-level card for every other page. |
| `public/og-default.jpg` | 1200×630, cropped from the front-page painting. |
| `src/config.js` | `SITE_ORIGIN` — the one place the public domain is written down. |

### Why middleware and not `api/guide-preview.js`

It was built as a serverless function first and **could not deploy**: *"No more than 12
Serverless Functions can be added to a Deployment on the Hobby plan."* `api/` already held
exactly 12. Edge Middleware is counted separately, so it costs no slot.

It is the better design anyway: the crawler list is real JavaScript with a real `/i` flag,
unit tested, rather than a regex string in `vercel.json` verifiable only by deploying and
squinting at a WhatsApp preview. **`tests/run.mjs` now asserts `api/` holds ≤ 12**, so the
next person to add a route finds out in a second rather than from a failed deploy.

### Rules that must not be undone

- **Every path that is not "a crawler asked for a guide that exists" ends in `next()`.**
  Wrong user-agent, Supabase down, missing guide, un-fetchable shell, any throw. A person's
  browser always gets the app.
- **The response is the real built `index.html` with tags folded in, never a stub.** The
  first draft returned a script-less stub to anything on the crawler list, and that list
  included `Line/`, `Viber`, `Pinterest`, `Tumblr`, `Signal` — tokens that appear in the
  user-agent of the browser *embedded in those apps*, i.e. exactly where a shared link gets
  tapped. Tapping a guide inside LINE would have produced an unopenable page. Bot tokens
  only now, with a test asserting the in-app browsers stay out.
- **`injectMeta` REPLACES the shell's own tags, it does not append.** Crawlers take the
  *first* occurrence of a singular og property, so appending meant the site card always won
  and `og:url` pointed a shared trip at the home page. Found in review, after shipping.
- **A guide that could not be read never becomes a guide we describe.** Real payload → its
  own card; zero rows → the site's card (a card headed "A Denmark guide" over a dead URL
  makes a broken link look valid); lookup failed → claim nothing.

### How to verify after a deploy

Do not paste into WhatsApp and squint — it caches previews for hours.

```
curl -sA "WhatsApp/2.23.20" https://only-here-three.vercel.app/guide/<id> | head -40
```

`og:title` with the guide's real name means it works. Plain `index.html` means either the id
was not found or the crawler gate did not match.

**Known limit:** iMessage's preview fetcher sends a user-agent indistinguishable from
desktop Safari, so it cannot be detected. iMessage shares get the site-level card. Removing
the crawler gate would fix it, at the cost of a Supabase round trip before every guide page.

---

## 2. The place taxonomy

Oliver: *"Nyhavn is 'technically' a town, but it is within Copenhagen. How do we categorize
this? Ticking Filters? Categories?"* and then *"There are also villages in the 'towns' that
are under other towns."*

`TOWN_COORDS` held three different relationships under one label: **Nyhavn** (inside
Copenhagen), **`Nørresundby (Aalborg)`** (a district, with the relationship stuffed into the
name string where nothing can query it), and **Dragør** (its own municipality, 12 km out).

Filters cannot fix that. You cannot tick a filter that is not backed by a field, and no
single field can say both "this is small" and "this belongs to that". So **two independent
axes**:

```
WHAT IT IS      placeKind:  city | town | village | area
WHAT IT         partOf      — this place is INSIDE that one. Areas only.
HANGS OFF       dayTripFrom — where you would actually sleep. Villages, small towns.
```

Dragør is a *town* with a `dayTripFrom`. Nyhavn is an *area* with a `partOf`. Sønderho is a
*village* with a `dayTripFrom`. Copenhagen has neither. No special cases.

**Only `partOf` collapses.** A route through Copenhagen and Nyhavn visits one town. A route
through Nordby and Sønderho visits two, even though you sleep in one, because Sønderho
genuinely is somewhere else. `placeKind` is **never inferred** — `isMajorCity` → city and
`partOf` → area are safe derivations, but "village" must be stated. Guessing smallness from
a name invents the one thing a traveller uses that word to decide.

### Where it shows up

- Towns page: areas out of both peer grids into their own **"Inside Copenhagen"** section,
  grouped by parent. A derived **"Size of place"** pill row. The old tier pills relabelled
  from "Kind of place" to **"How well known"**, since they were answering the wrong question
  once a real kind filter sat beside them.
- Town detail: an **Inside** / **Where to base yourself** glance row.
- The parent's page: **"Without changing hotel"**, built by scanning for entries naming it as
  their `dayTripFrom`. This is the piece with real product value — the anti-concentration
  argument with a UI on it.

### Migration still to do

Nyhavn will not move until it is **re-published with `partOf: "Copenhagen"`**. The field is
in the draft schema, so a redraft picks it up. Do Nørresundby at the same time and drop the
parenthetical from its name.

---

## 3. The crash, and the scanner

`ReferenceError: Cannot access 'qt' before initialization` killed every guide build. `qt` was
`travelMode`: reordering the pipeline so accommodation lands before the route fetch left
`enrichGuideDays(parsed.days, travelMode, mixedModes)` above the two consts it reads. Second
crash of this exact shape in three days (the front page died the same way on 6 Aug).

`tests/tdz.mjs` now sweeps for it. Getting it honest took five passes and is worth reading
before touching it:

1. It flagged "real", "day", "broken" — plain English inside prompts. Needed a character walk
   that strips comments, strings and regex literals **but keeps `${...}` expressions**.
2. O(n²): it re-scanned the whole output at every `/`. Two minutes, then killed.
3. Property keys counted as reads — `setState({ fixed: 0 })` above a `const fixed`.
4. **It never scanned `function GemlyxApp(`** — 558 KB, all 26 `useEffect` calls, and the
   home of the 6 Aug bug. Discovery only looked for `const X = (` arrows.
5. JSX is not JavaScript: `Denmark's capital` opened a quote that never closed and `</div>`
   looked like a regex literal, so the component's braces never balanced. **esbuild strips
   JSX first now**, then the walk reads real JavaScript.

**Two instruments, on purpose.** A plain function is its own scope, so position comparison is
exact. A component is not: a callback on line 2333 reading a const declared on 2401 is normal
and safe. Position-comparing GemlyxApp gave nine findings and zero bugs. So the component
gets an exact check on **hook dependency arrays** instead — those are evaluated during
render, in the body's own scope, which is precisely the 6 Aug bug.

---

## 4. Also shipped

- **Nearest stop removed from towns.** A town is the destination, not a point; the stored
  Copenhagen row said `"Nørreport (9 mins walk)"`, which is nine minutes from whatever
  coordinate a geocoder picked for the middle of a city of 660,000 — and the station people
  actually plan around is København H. Suppressed at **render** (which fixes all 71 published
  entries) and removed from the draft schema. Kept for festivals, attractions, restaurants
  and workshops. The verified-stop lookup still runs for towns, deliberately: knowing the
  arrival point is a ferry terminal stops the model writing about arriving by train.
- **Photo credits on the guide loading screen.** Not polish — several Denmark-facts photos
  are Wikimedia CC BY-SA, which requires attribution wherever the image appears.

---

## 5. Bugs found in review, after shipping

A four-agent adversarial pass over everything written today. Nine were real and are fixed.
**Two of them silently killed the feature they belonged to**, which is the point.

| # | Bug | Consequence |
|---|---|---|
| 1 | `injectMeta` appended og tags next to `index.html`'s own | Crawlers take the first → the guide card never appeared and `og:url` pointed at the home page. **Sharing was dead.** |
| 2 | `shapeForLive` is an allow-list and never carried `placeKind`/`partOf`/`dayTripFrom` | Publish threw all three away → **every taxonomy render site was dead** on the only supported path. |
| 3 | An entry marked `area` with no `partOf` | Excluded from both peer grids and from every group → unreachable from the whole page. |
| 4 | Any "Size of place" pill hid the entire areas section | One click deleted every district with no way back except All. `"area"` was never in the pill list, so the guard was unreachable. |
| 5 | `areasInside` ignored `isArea` | A village with a `partOf` was listed under "Inside Aalborg / you are already there" while also standing in the peer grid as independent. |
| 6 | Self-reference unguarded in `relationLine`/`areasInside`/`dayTripsFrom` | "Where to base yourself: Ribe" on Ribe's own page, and a day-trip chip that reopens the page you are on. |
| 7 | A newline in a guide title | Broke `og:title` mid-attribute and swallowed the next tag. `escapeHtml` collapses whitespace now. |
| 8 | Both middleware fetches unbounded | A degraded Supabase becomes a Vercel error page that crawlers cache for hours. `AbortSignal.timeout(2500)` on both. |
| 9 | "MAJOR CITIES" heading gated on the unfiltered list | Heading over an empty grid after one click. One `townMatches` predicate now, read in four places. |

Plus a **blank-page state**: three rows of pills can be combined into a state where nothing
matches, and the page went empty with no explanation. There is now a "Nothing matches these
filters" line with a **Clear all filters** button.

### Test assertions that could not fail

The audit pass found six. All fixed:

- The XSS assertion used a fixture with **no `<` in it** — gutting `escapeHtml` to the
  identity function left it green.
- `existsSync` on the og image resolved to the `public/` **directory** when the tag was
  missing, and directories exist. Now `statSync(...).isFile()`.
- Four `indexOf`-anchored slices: a missed anchor gives `""`, and `!/x/.test("")` is `true`,
  so a JSX reformat silently converts a real guard into a passing one. **Anchors are now
  asserted before every slice.**
- One user-agent fixture (`"TelegramBot (like TwitterBot)"`) stood in for two tokens and
  proved neither. Split.
- `swept > 20` had no teeth: 11 of the 39 "functions" were parenthesised expressions.
- The scanner's own prose fixture used `"...\\n..."` rather than a template literal, so it was
  a one-line string testing nothing. Now it has a real read **inside** an interpolation,
  which is the whole reason the character walk exists.

**134 assertions.** `cd onlyhere-project && npm test`

---

## 6. What is NOT verified

Be honest about this list — none of it has been seen working in a browser.

- **Nothing in this session has been run in a browser or against a real deploy.** Every
  change is syntax-checked, unit-tested and reviewed. That is not the same thing.
- The `curl` preview check has **never been run against a live deployment**.
- `@vercel/edge` is a new dependency — `npm install` before anything else.
- The share panel, the ＋ Keep button, the areas section, the Size pills, the "Without
  changing hotel" list and the loading-screen credit have not been looked at on screen.
- No published entry carries `placeKind`/`partOf`/`dayTripFrom` yet, so every taxonomy render
  site currently renders nothing. That is correct behaviour, and also indistinguishable from
  it being broken. **Publish one area before believing any of it.**

---

## 7. Open items, roughly in order

1. **`npm install`**, then `npm test`, then deploy and run the `curl` check.
2. **Re-publish Nyhavn** with `partOf: "Copenhagen"`, and Nørresundby with
   `placeKind: "area"`, `partOf: "Aalborg"` — then drop the parenthetical from its name.
3. **Six duplicate published rows** to delete in Studio: Dragør (72), Samsø (79), Ribe (84),
   Møgeltønder (89), Ringkøbing (90), Møgeltønder (22).
4. **`gemlyx_research` SQL** still needs running in Supabase — the table has never existed.
5. **52 broken photos** — Studio → "🖼 Repair missing photos".
6. **The Copenhagen entry has crossed cost figures.** Body says water 1.20–1.50 EUR and
   hotdog ~7; `typicalCosts` says water ~4 EUR and hotdog ~1,20. The hotdog price in the
   glance field is the water price from the body. One entry, two contradictory answers.
7. **`hasMeasuredTravel` is unreachable in production**, and so is the guide page's travel
   total. `fetchExactDurations` only queries the day-boundary leg when the next day has
   **exactly one stop** (`App.jsx`, search `day.stops.length === 1`), so a normal 3×3 guide
   queries 6 legs while `tripShape` needs 8. It errs safe — the page withholds rather than
   lies — but "moving in total" and "Longest single journey" are permanently absent. Fixing
   it means more Directions calls; that is a cost decision, not a code one.
8. **`collapseToParent` has no callers.** The route-counting collapse (so a guide through
   Copenhagen and Nyhavn counts one town, not two) is written and tested but not wired into
   `routeTowns`/`tripShape`. Needs an optional resolver argument, since `share.js` is also
   imported by middleware where no app data exists.
9. **`refreshLiveContent()` does not bump `liveContentVersion`**, so a manual refresh does not
   re-render. `ensureLiveContentLoaded` does.
10. Existing 71 entries have no `realityCheck` until redrafted. Light theme second pass
    (hardcoded dark scrims). Front page is black for several seconds on cold load.

---

## 8. Standing rules

- **The writer rule.** Perplexity/Tavily research → OpenAI plans → **Claude writes every
  published sentence.**
- **The dash ban is absolute** and enforced in code (`stripDashes`), not requested in a prompt.
- **Anything the system already knows is enforced in code, never asked for in a prompt.**
- **Never conclude a fact from a failed lookup.** `ZERO_RESULTS` is evidence; `REQUEST_DENIED`
  is not.
- **All-or-nothing figures.** A total built from the legs that happened to resolve understates
  and misleads. Withhold instead.
- **One list, read twice.** Two lists of the same thing always drift — `kindFromName` is built
  on `arrivalRow` for exactly this reason.
- **Never prefix the service-role key with `VITE_`.** Vite inlines that into the public bundle.
- Danish compound place names carry their own type (`-museet`, `-kirke`, `-havn`, `-slot`).
  `\b` does not work on Æ/Ø/Å — check adjacent characters with `/\p{L}/u`.
- A global regex's `.test()` is stateful. Never use a `/g/` pattern as a guard.
