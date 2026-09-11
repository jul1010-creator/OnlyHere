# Gemlyx handoff, 11 Sep 2026

Everything below is ON HIS PC and verified byte for byte.
`C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project`

Suite: **15,341 passed**. The one failure is `and it is a real file in public/`,
which is the sandbox missing `public/og-default.jpg` and has been failing there
for weeks. Browser tests 19/19. Build clean.

## Working rules, do not relearn these the hard way

* Run the suite with `node --max-old-space-size=3072 tests/run.mjs`, about 110s.
* **Mutation testing is the discipline.** Revert each fix, run the suite, confirm
  the named assertion dies. A fix nothing catches is not finished.
* **Never run two mutation scripts at once. Never run the suite while a mutation
  is applied. Never edit a file a running batch restores.**
* The harness snapshot must be DERIVED from the mutant list
  (`TOUCHED = sorted({f for _, f, _, _ in M})`), never hand typed. It must verify
  a clean baseline before starting and treat a crash as a kill. A hand typed list
  once dropped two files, their last mutation was never restored, and every
  result after that point was meaningless.
* Patch scripts are all or nothing: assert each anchor matches exactly once,
  write only if every one does.
* `shapeForLive` in `src/utils/studioContent.js` is an ALLOW-LIST and the only
  insert path into `gemlyx_content`. A field missing from it does not reach the
  database. It has eaten a feature three times now.
* Delivery: build in the container, copy to `/mnt/user-data/outputs/`, stage HIS
  copies first and check for lines unique to them, commit with
  `expectedMtimeMs`, then re-stage and `cmp` every file.
* Supabase is unreachable from the container. The ~148 published rows live there
  and can only be changed through Studio in his browser.

## Shipped 11 Sep

### Islands

`island` is a stated field on any entry. `islandOf(entry, kommuneName)` in
`src/utils/geography.js` answers in three tiers: the stated field, then
`ISLAND_BY_KOMMUNE`, then `partOfCountry`. `namedIslandOf` is the same lookup
stopped one tier early, for pages that already have a part-of-the-country row.

Sejerø is why it exists: it shares Kalundborg Kommune with a stretch of Zealand
mainland, so both derivations answered "Zealand". Ærøskøbing gets
`island: "Ærø"` and stays a town, which is why this is a field and not a fifth
`placeKind`.

* `islandsPresent(entries, islandOfEntry)` is read by BOTH the Towns row and the
  Attractions row, so they cannot drift.
* Towns page: an Island row in the filter panel with per-option counts; `island`
  is in `matchesSearch`'s haystack.
* Studio Manage: an Island box in the place editor, so the already-published
  islands can be placed without redrafting.
* `cleanIsland` strips "on " and "the island of " and refuses a sentence.

**He still has to type the islands in.** Nothing is placed yet.

### Essentials on blog pages

`src/utils/essentialPlace.js` is new. An essential row now carries `scope`.

Not `town`, deliberately: FynBus is Funen's bus and belongs on Svendborg's page
as much as Odense's. A scope can be a town, an island, a kommune or a part of the
country, and `placeScopes(town)` returns every name a town answers to, narrowest
first, so one scope reaches every town inside it. Matching goes through
`samePlaceName`, so "København" reaches Copenhagen and "Fyn" reaches Funen.

* `essentialsForPlace(rows, town)` sorts essentials before tips, then narrowest
  scope first. National rows never appear on a town page.
* `DetailPage.jsx` draws the block on a town page. Nothing renders until a row is
  placed, so it is invisible everywhere today.
* The Essentials page labels a placed row with a 📍 chip. Nothing is hidden from
  it.
* Studio Manage: a "Where it applies" box in the same panel as "Which list", one
  save, two fields, still a PATCH and not the payload.

**Open question he has not answered:** should local rows come OFF the national
Essentials page entirely, or stay there labelled? Currently they stay.

**He still has to type the scopes in.** Odense Letbane wants "Odense", FynBus
Tourist wants "Funen".

### The word sweep

414 uses of genuinely, genuine, actually, truly and simply removed from prompts
and reader-facing copy: 94 in studioPrompts.js, 209 in App.jsx, 111 elsewhere.

The adverb is deleted and the adjective is replaced, which is grammar and not
taste. "how long is genuinely worth spending" loses nothing; "a more genuine
feel" would become "a more feel". That line was on his own Essentials page and
now reads "a more local feel".

* STUDIO_VOICE banned four of these words and used them twelve times in the
  paragraphs around the ban. Those are gone, "genuine" is on the ban list, and
  the banned-word list that an inserted paragraph had split in half is rejoined.
* `FILLER_ADJECTIVES = ["genuine"]` is COUNTED by the audit but NOT cut at read
  time, for the "a more feel" reason. The adverbs are still cut as before.
* A test bans all five words from `src`, with a named exception and an exact
  count per file. A new use cannot arrive under an old total.

Left alone on purpose: `NO_TRANSPORT` (App.jsx, entryAudit.js), `RIGHT_HALF`
(correction.js) and `CORRECTION_LEAD` (directAnswer.js) MATCH these words in what
a model or a person wrote. Sweeping a detector is not improving prose.

## Open, not started

* **Naming the street in the guide writing.** The refusal half is in
  (`strandedNight` in `nightlife.js`, `STRANDED_NIGHT` in `planGate.js`). The
  prose half needs the guide writer's per-stop facts to carry the street.
* **A sweep that proposes essential-to-tip moves.** Offered on 1 Sep, never
  answered. The manual control exists: Studio, Manage, the entry, Which list.
* **The premium seam.** `src/utils/premium.js` has `isPremium(session)` reading
  `session.plan`. No plan, tier or subscription field exists anywhere yet, so it
  returns false for everyone. Pub Crawl in Gemlyx Detour is gated behind it.

## His own tasks, not mine

* Oscar's rental cars
* GetYourGuide `Kampagner` campaign tags
* Two test rows in `gemlyx_suggestions`
* Booking.com through CJ
* Placing the islands and the essential scopes in Studio

## Standing preferences that keep coming up

* **No dashes anywhere.** Not em, not en, not hyphen as a pause. Hyphens only
  inside compound words and number ranges. Not in replies, not in generated
  content, not from any AI.
* Avoid "actually", "truly", "genuinely", "simply", and now "genuine". Check new
  copy before shipping, not after he points it out.
* No explaining why a form field is needed. A label and a control is the whole of
  a form field.
* Verify a fact is wrong before correcting it. When two sources disagree and
  neither settles it, say the disagreement is unresolved.
* Fable only when genuinely stuck, not as a default step.
