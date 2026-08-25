# Handoff — 25 August 2026, night

Suite **10,750 passed, 0 failed**. `npx vite build` clean. `tests/tdz.mjs` clean.

Everything below is in the sandbox mirror at `/root/gemlyx`. **Nothing is deployed.**
The live site still shows the old FAQ, which is how I know.

---

## THE THING THAT HAPPENED FIVE TIMES TONIGHT

**A limit hit is not a limit reported.** Every one of these was code that knew
something had gone wrong and printed a sentence that did not say so:

1. **The chat.** `streamClaudeChat` turned every block type it had not met into
   `{type:"text", text:""}`, so a reply made of thinking blocks, a stream cut off
   by a function timeout, a request that died before sending anything, and a model
   that genuinely said nothing all arrived downstream identical — and all four
   printed *"Hit a snag on my end."*
2. **The run log.** `endLog` swallowed a failed `localStorage` write entirely, so
   a full quota meant the shelf silently stopped advancing and the panel showed an
   old run as though it were the last one.
3. **The logistics gate.** On a clean run it reported *"every duration and change
   in the prose matches the measured route"* — true of the ONE journey this
   pipeline measures, and read as a statement about the draft. Five unchecked
   claims and zero unchecked claims produced identical output.
4. **The absence gate.** Its reasoning was general and its patterns were all about
   transport, so *"There's no single big annual festival"* shipped on the page for
   the city with the largest carnival in Scandinavia.
5. **My own mutation harness.** A crashed suite prints no `FAIL` line, so seven
   mutants were recorded as SURVIVED when the truth was that my assertions threw.
   It now reports CRASHED and AMBIGUOUS separately.

And the sibling rule, which cost more: **finished, correct code that nothing
surfaces.** `runLog` had kept twelve runs since the day it was written and the
panel rendered `logs[0]`. `DetailPage` had `isSaved`/`onToggleSave` wired on all
six kinds and rendered them as an unlabelled 32px heart on a photograph.

---

## FIXED TONIGHT

### From Oliver's four-item list
- **FAQ** — both overclaims corrected in `src/App.jsx`.
- **`.ics` export** — `utils/calendarExport.js`, wired through
  `components/TripCalendarCard.jsx` into GuidePage's share panel.
  Extracted into its own component **so the render instrument could read it** — a
  surface gated behind `useState` cannot be rendered, and "what does the screen
  say" is what four shipped bugs this month turned on.
  Generating a real file and **reading it** found what the tests could not:
  `icsFold` counted characters where RFC 5545 counts **octets**. æ/ø/å are two
  bytes each, so 75 characters of Danish is 150 octets and ships unfolded and
  invalid. The function's own comment said "octets". Every fold test used `"x"`.
- **Add-to-trip** — `utils/savedTrip.js` + a labelled action row on DetailPage,
  plus `planFromSavedPlaces` in App.jsx closing the loop into the intake.
- **The Change button** — `utils/stopSwap.js` + `components/StopChangeSheet.jsx`,
  wired onto every stop card. Two screens: it asks WHY first (five reasons, not a
  text box), replacements come from the 148 published rows rather than being
  regenerated, "too far" cannot return something further away, and it **refuses**
  rather than substituting when nothing real fits. Gated on `constraintCheck.js`,
  which had no caller until now.

### From the live site
- **Hero photo** (`utils/heroPhoto.js`). `p.photo || newUrl` had been retired
  three times and re-added by hand each time; the drafting panel's `🖼 Add photos`
  still had it. One rule, six call sites. The structural guard that was meant to
  catch it now sees `draft?.photo` — the optional chain is what it slipped through.
- **Run-log picker** — a chip per kept run, named by subject, marked when the run
  is worth opening, plus **Copy all N**.
- **`listProse` read keys that do not exist.** It read `item.heading` /
  `item.paragraph`; a real payload is `{type, content}` and `{type:"bullets", items}`.
  **Every prose check reading `blogBody` has been reading nothing** since the day
  it was widened. Found from Oliver's pasted Aalborg payload.
- **`launderedAbsence`** (`entryAudit.js`) — pairs an uncertainty saying a thing
  was *not found* with prose saying it *does not exist*. Oliver's diagnosis, and
  better than a regex for absence phrasings: the draft has already told us what it
  failed to establish.
- **`contradictedAbsence`** (`journey.js`) — the same claim checked against the
  app's own published event rows for that town. Not "nothing established this" but
  "our own page disagrees".
- **`sentences()`** — shared splitter. `"Aalborg St."` ends in a full stop, so the
  walk and the station landed in different fragments and the Odense/Esbjerg gate
  could never fire. `"St."` was also missing from `STOP_WORDS` — a gate for Danish
  railway prose that could not read a Danish railway abbreviation.
- **`journeyCensus` / `censusNote`** — counts logistics claims and reports the
  fraction nobody measured, on every run, clean or not.

### From Oliver's exported chat report — four reader bugs
His first message states where he lands, when, who is coming, how long, how they
get around and where they sleep. Three BLOCKING slots came back empty and the next
question was *"How many days have you got?"*

- **`alt()` escapes regex metacharacters.** `"kids?"` has always meant the literal
  string `kids?`. **"we have kids" and "travelling with friends" have never filled
  the party slot.** `family`/`children`/`solo`/`alone` carry no metacharacter and
  work, which is why nobody noticed. The suite now asserts that no word-list entry
  contains a quantifier.
- **`PARTY_POSSESSIVES`** held every first-person singular possessive in five
  languages and no plural one. `my son` filled it; `our son` did not.
- **Transport** required a movement word beside the vehicle, so `"Trains, buses and
  ferries only"` — how anybody answers "how are you getting around?" — matched nothing.
- **Day counts** read digits only, and two dates in one sentence never became a
  length. `departureDateIn` is new.

Oliver's exact first message now reads **`ready: true`, `missing: []`, 5 days.**

---

### The pre-push hook (Windows)

The hook failed on Oliver's machine with `ERR_UNSUPPORTED_ESM_URL_SCHEME:
Received protocol 'c:'`. Four faults, all in the render instrument written today,
all invisible on Linux:

- `await import(join(root, "tests/render.mjs"))` — a POSIX absolute path carries
  no scheme so Node accepts it; `C:\Users\...` parses the drive letter as the
  **protocol** and throws. Three call sites.
- `await import("file://" + bundle)` — on Windows that parses the drive letter as
  the URL **host** and throws differently.
- `await import(out)` in `render.mjs` — same as the first.
- `new URL("..", import.meta.url).pathname` — returns `/C:/Users/...` on Windows,
  a leading slash in front of the drive letter, so `join()` builds a path that
  resolves to nothing.

All now go through `pathToFileURL` / `fileURLToPath`. **The suite asserts the
rule**: no dynamic import of a path may be a bare path or built by pasting
`file://` onto one, and no path may come from a URL's `.pathname`. Both mutants
verified red.

A test harness that only runs where it was written is a harness that stops the
person who actually ships from pushing.

## STILL OPEN

- **`briefPanel.js` and `evidence.js` have no callers.** Same disease.
- **The generation progress ledger** — he chose "build it end to end now" and it
  was never built.
- **No emojis / no ja-nej buttons in chat**, and **inline photos at the mention**
  rather than dumped at the end. Both still outstanding from his UI note.
- **`"Accommodation: Many hotels"`** — a content-free glance field, live.
- **Oliver still needs to run `SUPPORT_TABLE.sql`** and the `updated_at` trigger.
- **The Limfjord Test** is out and unanswered:
  `https://claude.ai/code/artifact/6ef5e902-7ae0-4c41-9bd8-7b77cf4e6f25`
  Eleven traps, and what to send back is the guide link, **Copy all N**, the
  founder `__notes`, and his own pass/fail.

## HOW TO CHECK MY WORK

`node tests/run.mjs` · `npx vite build` · `node tests/tdz.mjs`

Mutation harnesses are in `/tmp/mutate-ics.mjs`, `/tmp/mutate3.mjs`,
`/tmp/mut-swap.mjs`, `/tmp/mut-brief.mjs`. They restore on every exit path,
report CRASHED apart from SURVIVED, and refuse a find string that appears more
than once — all three of those were bugs in the harness before they were features.

**One equivalent mutant is recorded honestly** rather than counted as a pass: the
`span <= 31` guard in `departureDateIn` is unreachable by construction. It is
written down at its assertion site.
