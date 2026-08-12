# Studio audit, night of 11 to 12 August 2026

You asked for a narrow search through the Studio for bugs, and for anything that
could improve the prompts and the pipeline. This is what I found, what I fixed,
and what I deliberately did not touch because it needs your call.

**Suite: 2715 passed, 0 failed. Clean build. Every fix below is mutation-verified
red, meaning I broke each one on purpose and confirmed a test caught it.**

Nothing here is a guess. Every finding was read in the source and, where it could
be, run. Where I could not settle something I say so.

---

## The one that matters most

### The auto-correction threw away everything the pipeline measured

At the very end of a draft, if the invented-claim check flags anything, the
pipeline re-researches those claims and asks Claude to fix them. It then did
this:

```js
const corrected = await parseClaudeJSON(fixResult.text, 8192);
if (corrected && corrected.name) { t = corrected;
```

One key checked, then the **entire draft replaced** with model output. And it
runs last, after every value the pipeline had just measured in code:

| Field | What it was |
|---|---|
| `travelTime` | measured by Google Directions, the only real measurement in a draft |
| `ticketStatus` | read off Ticketmaster's own listing |
| `__ticket` | which seller said it, and when |
| `__dateSource` | the operator's own published dates |
| `__lat` / `__lon` | the frozen geocode, or a deliberate clearing of a bad one |
| `__hours` | Google's business listing, bought once |
| `__sources` | every page the research actually opened |
| `website` | the URL the owner registered, not a guessed domain |
| `uncertainties` | including "STOP, DO NOT PUBLISH: this event is CANCELLED" |

The prompt does ask the model to leave those alone. That is a **request**, and
this codebase already has the rule about requests: anything the system knows must
be applied as code, because a request has a failure rate and code does not. An
8192-token JSON round-trip is exactly where a key that looks like internal noise,
and all seven `__` fields do, gets dropped or tidied away.

So a draft could lose its measured travel time, its verified ticket status, its
map pin and a cancelled-event stop order, while the panel above it said
**AUTO-CORRECTED**.

**The sharpest part: the fix already existed.** The manual correction path, the
one you paste a fact-check into, has run through `enforceScope` all along. Only
the automatic path had nothing.

**Fixed.** `keepMeasured(before, corrected)` in `correction.js`. The rewrite's
prose is accepted; every measured or pipeline-owned field is put back; a dropped
stop order goes back at the front where the pipeline puts it. An overreach is
logged as a step and recorded as a decision instead of happening in silence.

It is a **rule, not a list**: anything starting with `__` is pipeline-owned. Five
`__` fields have been added to this codebase and `shapeForLive` forgot four of
them. The sixth is protected the day it is written.

---

## Fixed tonight

### Every workshop draft survived only by luck

The `booking` schema listed 22 keys and `desc` was not one of them. The code:

```js
: !t.desc;
if (!t.name || noContentField) throw new Error("empty");
```

A model that obeyed "Respond with ONLY strict JSON" returned no `desc`, and the
whole booking draft **threw after several minutes of paid research**. It only
worked when the model disobeyed its own schema and added the field anyway,
prompted by a line of prose mentioning "the existing desc field".

Booking is the only type where this was true; the guard correctly checks
`vibeLocation` for food, `characterAndFit` for town, and `desc` for the rest.

**Fixed** by adding `desc` to the booking schema. The durable half is a test that
walks `CONTENT_TYPES` and asserts each type's schema asks for whatever the code
refuses a draft without, so the tenth type is covered on the day it exists.

### Festivals were invisible on your own front page

Four places read `tier` back. Two match loosely and are right (`placeThemes.tierOf`,
`DetailPage`). Two matched **exactly**, each on a different spelling:

- the event card badge matched `"Can't miss out"`
- the front-page "Worth the trip right now" picker matched `"Can't Miss Out"`

And the prompts disagree the same way: the **festival** schema asks for
`"Can't miss out"`, every other type asks for `"Can't Miss Out"`. So a festival
tiered by its own prompt was silently excluded from the front-page section, and a
town tiered by its own prompt showed no badge on its card.

`placeThemes.js` already saw this coming, in its own comment: *"the stored strings
are long and inconsistently cased across 71 rows written over weeks."* It built
the correct matcher and two call sites never used it.

**Fixed.** Both now use `tierOf`, and a test asserts no exact tier comparison
survives anywhere in the app.

### The second inventing default

```js
popularityTag: t.popularityTag || "Hidden Gem"
```

An attraction the writer said nothing about was filed as a **Hidden Gem**, which
is the claim this entire app is built on, made by a fallback. Identical to the
`ticketStatus || "on_sale"` bug fixed yesterday, and sitting eight lines below the
comment written about that one. The `booking` branch already used `""`.

**Fixed.**

### A Places outage read as "Google has no listing for this place"

```js
const hoursRes = await fetch(`/api/places-hours?...`);
const hoursData = await hoursRes.json();
```

Neither `hoursRes.ok` nor `hoursData.error` was ever checked, and `places-hours.js`
returns `{ error }` at **HTTP 200** for a Google failure and 500 for a missing key.
Every field below then read `undefined` and the step carried on as a clean
no-listing: no registered website, so the official-site enforcement fell back to a
guessed domain; no verified address; no hours; and **no `businessStatus`, so a
permanently closed business was not caught**.

Nothing threw, so the failure note at the bottom of the block could never fire.
In the run log an outage, a dead key and a genuine no-listing were one blank.

Five other fetches in that function already check. This is the sixth, and it now
says which of the three happened.

### Google's verified address rode on the opening hours

`realAddressText` reached the writer only when `realOpeningHoursText` was also
non-empty. A festival with a `formattedAddress` and no weekly hours, which is the
**normal** case for a festival, lost it entirely, despite the comment beside it
calling it "the single most transport-relevant fact there is".

**Fixed.** The address travels on its own now.

### The wrong type picked the source rules

Three research calls inside `generateArea` read the component state `studioType`
rather than `sType`. The function's own header says every reference below uses
`sType` for exactly this reason. On a **queued** draft, the founder-vouched source
list was filtered by whatever type chip happened to be selected in the UI rather
than by the item being drafted.

**Fixed** at all three sites, with a test asserting none come back.

### A fabricated founding year sitting in a schema

```
"category": "e.g. Bakery, est. 1652"
```

This is the exact burn the town schema documents in its own comment: an example
coordinate printed in a schema was copied verbatim into map pins 130 km wrong. It
also collides with the STUDIO_VOICE rule that a year must name which event it
belongs to. A bakery with no founding date in its research could publish
`category: "Bakery, est. 1652"`, which renders as a coloured pill on the page.

**Fixed**, and a test asserts it does not return.

---

## Found, not fixed: these need your judgement

### 1. The invented-claim check fails silently, and a failure looks identical to a pass

`askPerplexity` never throws, it returns `{ error }`. The whole final block is
gated on `!inventedCheck.error`, so on a bad key, a 500 or a network blip the
last accuracy gate in the pipeline is skipped. There is **no `note()` anywhere in
it**, the only stage in the function with none, so nothing records that it was
skipped. What you see is a finished draft with no invented-claim warning, which
is the same thing you see when every claim traced back to the research.

I did not fix this because the right behaviour is a decision: does a failed final
check block the draft, or warn loudly? Adding a `note()` is trivial and I can do
it on your word. Making it blocking is a product call.

### 2. Perplexity's citations defeat the source-relevance filter

Tavily records each URL's own title and snippet. Perplexity's citations all get
the **same 400 characters of Perplexity's answer**, which is about the place by
construction. So `mentionsThisPlace` tests the model's answer rather than the
page, and admits or rejects all citations as a block.

Those URLs land in `__sources`, which now renders on the live page under a
heading promising how we know. The filter exists to stop precisely the case in
your own comments: a village smithy sourced to Frederiksborg Castle.

The fix needs a per-citation snippet, which means either a second call or
accepting that Perplexity citations cannot be scoped. Your call which.

### 3. The copy-paste code block is built before every correction

The "📋 Or copy code" output is assembled from `t` **before** the nearestStation
cleanup, the website override, the lat/lon override-or-clear, the measured
travelTime and the auto-correction. So the manual-paste path carries the model's
own coordinate, the exact thing the override exists to replace, plus an unmeasured
travel time. The Publish button is unaffected.

Directly under a comment reading: *"WHAT YOU REVIEW MUST BE WHAT YOU PUBLISH."*
Either move the block after the enforcement, or drop the manual path. I did not
choose for you.

### 4. Two silent failure paths still uninstrumented

The Directions measurement (`catch { /* directions unreachable */ }`) has its
`note()` **inside** the try, after the await, so a network throw skips it. And a
Places failure on the nearest-stop lookup discards a perfectly good geocode,
because both sit in one try and `frozenGeo` is assigned after the station call.
That second one costs you a map pin on an entry that could have had one.

Both are small fixes. I left them because they change control flow in the most
expensive function in the app and I would rather you were awake.

### 5. Prompt contradictions worth resolving

- **"Check locally" is both required and banned** in STUDIO_VOICE, about 4,000
  characters apart. A field with nothing in the research has two mutually
  exclusive correct answers, so it is non-deterministic across redrafts.
- **Every SHAPE-ONLY EXAMPLE uses the em dash** the same file bans "no
  exceptions" — 20 of them across six prompts, two joining clauses outright.
  The examples teach the tell the rules forbid.
- **The en dash is banned in `correction.js` and mandated in two schemas**
  (`"May–Sept"`, `"40–70 DKK"`). Drafts obey the schema, then the correction pass
  is told to strip what the schema required.
- **`"Local Favourite"` is an offered answer the UI renders as "Common
  Attraction"**, its near-opposite, and it matches no filter anywhere.
- **The single-field rewrite gets the whole STUDIO_VOICE**, including "every
  response needs an uncertainties array", while its own instruction says reply
  with only the rewritten text. A rewrite can come back with a JSON wrapper.
- **Towns publish a `nearestStation` no town prompt asks for**, and paragraph 3
  is explicitly written *around* it ("beyond the At a Glance station name"), so
  every town omits the station name to avoid repeating a field that is empty.
- **Undated facts hardcoded in prompts**: `"From 24 DKK per ticket"` for the real
  DOT app, `"180 DKK"` for Viking Center Ribe, `"around 45 DKK"` plus a smoking
  claim for Toga Vinstue, `"~40,000 students"` for Aarhus. Each is copyable when
  the drafted entity *is* the example. Your own rule: an hours array with no date
  is a claim that quietly ages into a lie.
- **The Reality Check rule is stated four to six times** in different words
  across the prompts, which is how the `tier` spelling drifted in the first place.

I did not touch any of these because they are 47 KB of prompt you have tuned by
hand, and a bulk edit by me overnight is exactly the kind of change that produces
a worse draft you cannot trace. Each is a small deliberate edit and I will do them
in whatever order you want.

---

## Checked and clear

Worth saying, because a negative result is a result:

- **The field round-trip is healthy.** I extracted all nine schemas and diffed
  them against every field `shapeForLive` reads. No field a prompt asks for is
  dropped at publish. The three mismatches all run the other way, and two are
  above (`desc`, `nearestStation`); the third is `budgetLevel`, read for festivals
  and never requested, harmless.
- **`tierOf` and the `TIERS` table were already correct.** The bug was two call
  sites not using them.
- **The Danish sort in Manage Published is correct**, including Aarhus landing
  after Ærøskøbing, because Danish sorts "Aa" as "Å". It looks like a bug and is
  not. One line to change if you disagree.

---

## What I would do next, in order

1. **Re-run the free fact-check sweep over the published library.** Several fixes
   tonight change what a correct entry looks like, and the fourth standing rule
   applies: fixing a writer does not fix what it already wrote. The heading repair
   is still unrun, and Viborg still says "Good to Know" on the live site.
2. **Decide on the invented-claim silent failure**, since it is the last gate.
3. **The prompt contradictions**, one at a time, with a redraft of the same
   entry before and after so you can see what each one bought.
4. **The apex domain.** Still unfixed, still the cheapest thing on any list:
   `gemlyxtravel.com` without `www` resolves to nothing.
