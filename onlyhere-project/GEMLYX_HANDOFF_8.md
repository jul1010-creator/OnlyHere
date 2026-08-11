# GEMLYX HANDOFF 8

**10 August 2026.** Continues GEMLYX_HANDOFF_7.md (8 Aug).

Suite **1504 → 2192** assertions across the day, every new one mutation-verified red. Clean `vite build` throughout. The site is live on **gemlyxtravel.com** and the deploy is current as of this writing.

---

## 1. The one thing to read if you read nothing else

**Every shared guide link was a permanent dead end, and it had nothing to do with guides.**

`GuidePage.jsx` had three hooks (`useState`, `useState`, `useEffect`) declared *below* `if (loading) return` and `if (loadError || !guide) return`.

Open `/guide/:id` cold, from a WhatsApp link, a bookmark, a search result. `freshGuide` is null so `loading` starts true. Render one bails at the loading guard having mounted 22 hooks. The Supabase fetch resolves, `setGuide` and `setLoading(false)` commit together, render two falls past both guards and reaches hook 23. React throws *"Rendered more hooks than during the previous render"*, the ErrorBoundary catches it, and the recipient is told **"Something broke on our end"**. Reloading re-runs the identical path.

Why it survived: **the person who built the guide never hits it.** Saving navigates with the guide in router state, so `freshGuide` is set and `loading` was false from the first render. And a *broken* id sets `loadError`, returns at the same guard with the same hook count, and renders "Guide not found" perfectly.

Only a **valid** shared link crashed. The one case that never gets tested by hand, because it looks like the working case.

Fixed, with a test that scans for any hook below the first early return.

---

## 2. Money

**`api/ask.js` never enforced its daily quota. On anyone. Ever.**

The count read checked `catch` but never `countRes.ok`, and `fetch` only rejects on a network fault. A missing table (PostgREST 404/PGRST205), a mis-scoped service key (401) or an RLS refusal (403) all arrive as a *resolved* response with no `content-range` header. Then:

```
"" → "".split("/")[1] → undefined → parseInt(undefined) → NaN
!Number.isFinite(NaN) → used = 0
```

A read that **failed** was laundered into *"they have used none"*, so the limit could never be reached. The catch block's own rule ("a quota that cannot be read must not become a quota that does not apply") was unreachable for the failure that actually happens.

**And `gemlyx_ask_log` has never existed.** `SETUP_ASK.md`, named in that file as the home of its SQL, is not in this repo. So every question ever asked has been unmetered, each firing up to two Claude calls and a Perplexity call, while the panel reported "10 questions left today" because the logging write no-ops the same way.

Exactly the `gemlyx_research` shape, except this one costs money per request instead of merely doing nothing.

**Run this:**

```sql
create table gemlyx_ask_log (
  id bigserial primary key,
  user_id uuid not null,
  day date not null,
  created_at timestamptz default now()
);
create index on gemlyx_ask_log (user_id, day);
```

Until you do, Ask now returns 503 rather than serving an unmetered answer.

---

## 3. Things you must run in Supabase

```sql
-- the optional traveller profile (otherwise it silently cannot save)
alter table gemlyx_user_data add column if not exists profile jsonb;

-- the Ask quota, see section 2
create table gemlyx_ask_log (id bigserial primary key, user_id uuid not null, day date not null, created_at timestamptz default now());
create index on gemlyx_ask_log (user_id, day);
```

Both now report loudly in the UI if the object is missing, rather than failing into a catch block.

Still outstanding from handoff 7: `gemlyx_research` (its SQL is in a code comment), and `gemlyx_reviews` needs its select policy checked — see section 5.

---

## 4. Coordinates, four passes

Your stated main objective. *"If we get maps wrong, then the Gemlyx guide will become ruined."* You were right about the mechanism before I traced it.

**Pass one, two faults multiplying each other.** `resolveStopCoordsDetailed` read `real.lat`, and every published payload stores `__lat`. So the highest-quality tier in the chain had **never fired in production** and every stop fell through to Nominatim or the town-centre fallback. That is why fixes here kept half-working: the good branch was never the branch taken. `hasPreciseCoords` was one of the broken readers, so every stop was geocoded on every build, a cost bug too. Separately `lookupRealPlace` used a bare bidirectional substring test: "Vejlebrovej" matched Vejle, the stop "Møn" was answered by "Møns Klint", the stop "Ribe" by "Ribe VikingeCenter" 3 km outside town.

**Pass two, the pins.** Every pin used `resolveStopCoords`, which computes the `precise` flag and discards it. An unplaceable stop was plotted at its town centre and labelled "Day 3 · Samsø Island Distillery", drawn identically to a real geocode. Approximate pins now read "(somewhere in Samsø)", draw with a dashed ring, and are named under the map.

**Pass three, the endpoint sent to Google.** `originCoord ? "lat,lon" : name` — and a town-centre fallback is a truthy object whose whole meaning is *"we do not have this stop's coordinates"*. So unplaced stops were routed from the middle of their town, and because `api/directions.js` correctly refuses to append ", Denmark" to a coordinate pair, Google's own geocoder never saw the venue name. Measured, confident, wrong, and disagreeing with the Maps link beside it, which is built from names. That is the chip disagreeing with the link.

**Pass four, the stored coordinate itself.** `shapeForLive` writes `Number(t.lat) || null` straight from the model's JSON with no range check, no country check, and no comparison against the town the entry names. Then `liveContent.js:87` writes a published town's coordinate into `TOWN_COORDS` on every page load, and that is the reference frame every other entry in that town is measured against.

**Worth writing down: pass one made this worse before it made it better.** While the `__lat` tier was dead, a bad stored coordinate did nothing. Fixing it put an unvalidated model number at the top of the chain. *Promoting a number to the top of a chain without validating it is half a fix.*

New `src/utils/coordCheck.js` applies `isInDenmark` to a content coordinate for the first time ever (it had been in helpers since the beginning and used only on the browser's own location), checks distance from the town the entry names, and finds two entries sharing one exact point. `publishDraft` now **blocks** a fresh publish on a critical one. That gate is the first thing in the app that has ever stopped a bad coordinate reaching the database: `auditEntry` has carried coordinate checks since 6 Aug and gated nothing, being called only from StudioAssistant to build prompt text.

**Still open:** `townKeyFor` prefers the parent city over a specific place that has its own coordinate ("Nyhavn, Copenhagen" → Copenhagen); the Danish genitive silently unresolves ("Skagens Museum" gets no pin); `App.jsx` night-transport city detection still uses a bare `name.includes(city)` and feeds the result into the prompt labelled "not a guess"; `geocodeOne` and `unplaced` remain unwired.

---

## 5. The audit, 10 Aug night

### Fixed

**One question, seven regexes, five spellings.** "Is this leg a boat" was asked in `operators.js`, `guideEnrichment.js` (twice), `guideReading.js` (twice), `GuidePage.jsx` (twice) and `helpers.js`. Three of them did not contain **færge**, which is the Danish word for ferry, in a Danish travel guide.

Verified by running it: `detectLegMode("Take the færge to Ærø", "bike")` returned **`"bicycling"`**. A bike route across open water, which is the exact failure that function's own comment says it exists to prevent. Two of the pairs tested the *same variable* a few dozen lines apart, so a "færge" leg got the ferry booking notice under a train icon, and a "boat" leg made the trip summary announce a ferry crossing while the book-before-you-go list left it out.

One `FERRY_TEXT` now, with a test that fails if anyone writes an inline ferry regex anywhere.

**Bug A again, in a second file.** `api/commons-photo.js` kept its own `fold()` that ran `normalize("NFD")` *before* replacing ø/æ/å. NFD decomposes å into a + combining ring, the ring is stripped as an accent, and the å rule never runs. Verified: `mentionsSubject("Ålborg Slot", "Aalborg")` was **false**. Every Commons file titled with Å was rejected for an Aa-spelled Danish place. It imports the shared fold now.

**`tripCharacter` has never once appeared on a guide.** Its guard read `shape.days`; `tripShape` returns `{dayCount, stopCount, towns, km, minutes, longest}` and has no `days` key. Three tests built the shape *by hand* as `{days: 3, towns: [...]}` and asserted on the sentence. All three were green while the feature was dead. The tests now use the real producer's output.

**The sign-in merge deleted the guide you signed in to save.** Two effects key on `[userSession]`. The pending-save claim is synchronous; the cloud merge is async and read `savedGuides` from a closure captured *before* the claim, then wrote it back with a plain value. So the guide appeared, then vanished ~300 ms later, and line 4574 overwrote localStorage while `pushCloudSaves` uploaded the shorter list — destroyed on every device. The Google path made it certain rather than likely. Now reads the freshest local list and writes back functionally. Also: a refused cloud write used to produce a green "saves synced" toast.

**"Good to Know" vs "Things to Know".** `shapeForLive`'s town branch wrote a heading no other type and no codegen writes, so every town published through the button carried it, and `publishedRepair` classified it as unrecognised. My own test claimed the heading list "cannot quietly fall behind the generator" — it could, because it scanned `bbData(` and never `bulletsBlock(`. Both fixed, and the old heading is now a free rename.

**Smaller, all verified:** a lone gold `★` on every published event, because `shapeForLive`'s festival branch has no rating field and React prints `undefined` as nothing; a failed `gemlyx_reviews` read rendering "No comments yet, be the first to share your experience", which is a confident claim about someone else's data made from a failed request; the paste-ready `|| "??"` coordinate sentinel that could never fire, so a missing latitude pasted as `NaN` or `0.000`; `PlaceMiniMap` destroying and rebuilding its Leaflet map on **every** parent render because its deps held an array literal and a closure, throwing away wherever you had panned and re-downloading OSM tiles; `ProfileSheet` declaring a component type inside its render body, remounting twenty chips on every keystroke.

### Found, verified, NOT yet fixed

Ranked. Everything here was read in context.

1. **`liveContent.js:63` never checks `res.ok`.** Since 5 Aug every data file is `export const x = []`, so **100% of user-facing content** comes through this one fetch. A failure renders a Denmark travel guide with no towns, no events, no restaurants, no nightlife, behind a single `console.warn`. `middleware.js` guards the same table correctly.
2. **`GuidePage.jsx:315` tells people a real guide was deleted.** No `res.ok`, so a 401, a 500 or an RLS change takes the "This guide link doesn't exist or was removed" branch. Every shared link in every WhatsApp thread would say the trip was removed, while the sender's own copy still opens from router state.
3. **`imageCredits.js` drops every photo credit silently**, including two `CC BY-SA` images whose attribution is legally required. `creditIsRequired()` exists and has no callers.
4. **`guideReading.js:189` can render "The ferry on day undefined"** in the red Book-before-you-go box. `GuidePage` writes `day.day || dayIdx + 1` in six places; this is the one that does not.
5. **`weatherIcon` and `skyOf` classify the same `symbol_code` with different precedence** (rain-first vs thunder-first), and `WeatherHeaderStrip` calls both on the same value in the same card. A plain rain icon on a thunder-purple card for `rainandthunder` and four siblings.
6. **`FILLER_WORDS` has 4 entries, the prompt bans 7.** `really`, `quite` and `of course` can never be flagged. Separately, **17 phrases banned in `STUDIO_VOICE` are invisible to `scanForAITells`**.
7. **`api/update-events-check.js:57` claims its prompt is "identical to the in-app button".** It is a prefix: the scheduled run gets no `RESEARCH_SOURCE_RULES`, no founder-source list, and no Danish two-names hint.
8. **The theme effect lives in a component not mounted on `/guide/*`.** Cold-load a guide URL with Light selected and it renders in Warm.
9. **The weather-alert effect has `[]` deps but reads `savedGuides`**, so it never fires for someone whose guides arrive from the cloud merge — exactly the users accounts were built for.
10. **`mergeSaves` comment says local goes first**; the code spreads cloud first, so past 40 places the one hearted seconds ago is the one dropped.
11. **`GuidePage.jsx:233`** fires `ensureLiveContentLoaded()` with no version bump, so on a cold shared link whether stops are clickable depends on a race.
12. **Dead code:** `affiliateActive`, `nearestStationName`, `parsePrice`, `seasonRank`, `geocodeOne` are exported and referenced nowhere. `EmojiIcon` is imported and never rendered. Ten more (`isLongLeg`, `dayTripsFrom`, `baseTownFor`, `slugCollisions`, `staleEvents`, `untypedEvents`, `RESOLVED_PARTS`, `RESOLVED_SHAPE_INDEXES`, `currentRun`, `THRESHOLDS_ARE_ORDERED`) are written, tested, and wired nowhere. About 23 import bindings in `App.jsx` are unused.
13. **`checkLiveInfo`, `isPlaceSaved`, `toggleSavePlace` and `kmBetween` are byte-identical in two files.** Save caps (20/40) appear as seven bare literals. The leg cache key `` `${a}|${b}|${mode}` `` is hand-built at four sites and centralised nowhere, which is the exact shape of the original `resolveLegMode` bug.

---

## 6. Test-suite traps learned today

The standing rule is that every assertion must be verified to go RED by mutation. Four new ways an assertion can be a decoration:

- **`stripNonCode()` blanks regex literal contents**, not just strings and JSX. `/ferry|boat/i.test(x)` becomes `           i.test(x)`. A test hunting for an inline regex can never use it. Read raw source with comment *lines* dropped by hand instead.
- **A source-text assertion can survive the rule being switched off.** `ok(..., /return { missingColumn: true };/.test(src))` passed happily after the condition producing it was replaced with `if (false)`, because the now-unreachable return was still there to match. Extract a predicate and assert its *behaviour*.
- **A kind-only assertion can survive the rule being deleted.** Filtering findings by `kind === "far-from-town"` still matched after the critical branch was removed, because a softer branch fired with the same kind and count. Assert through the blocking list.
- **A mutation that crashes is not a mutation that fails.** A TypeError stops the suite, so every later assertion never runs. Degrade the read (`|| []`, `|| {}`) so it produces a named FAIL.

And the oldest one, hit three more times tonight: **your own comment quoting the old code defeats the assertion.** Paraphrase, or strip comments.

---

## 7. Standing rules

1. Never state a number or a name the pipeline did not verify. Where something is estimated, say so on the page. This is the product, not a style preference.
2. Every assertion must be verified to go RED by mutating the code it guards.
3. A privacy promise that quietly goes stale is worse than one never made. The auth sheet promised "no profile" until the profile shipped; both were changed in the same commit.
4. Fixing a writer does not fix what it already wrote. A published row is data. Every content fix needs a repair path for rows already in the database, or the site keeps showing the old thing forever.

---

## 8. Waiting on you

- Run the two SQL statements in section 3.
- `git mv build-check.yml .github/workflows/` — it has never run once, because GitHub only reads that folder. The version delivered today runs `npm test` before the build, which is what would have caught the middleware break.
- `git rm src/data/studioTypes.js` — emptied to a marker, safe to delete.
- Google Cloud Console → OAuth consent screen → App name → **Gemlyx**. The `vpxfahjn...supabase.co` line under it needs a Supabase custom domain, a paid add-on.
- Open Studio → Manage. The coordinate and heading audits are there now, they cost nothing to read, and they tell you the size of both problems across everything already published.
