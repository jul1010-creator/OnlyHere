# Handoff, while you napped

25 August 2026. Three things, in the order you picked them.

    node tests/run.mjs      10,303 passed, 0 failed   (was 10,109)
    npx vite build          clean

Changed on disk, uncommitted:

    src/utils/readerLanguage.js   keepLanguageOf, and a corrected record
    src/utils/entryAudit.js       the quote class and two missing prose fields
    src/utils/factCheckCopy.js    NOT_A_CLAIM exported, nothing else
    src/utils/evidence.js         NEW. Item 9, the system half
    src/App.jsx                   the four language call sites
    tests/run.mjs
    copenhagen-round.html         the field sheet, also published

---

## 1. Copenhagen

**https://claude.ai/code/artifact/3f614891-786a-4776-becf-3df876b2bd39**

Eleven stops, one Indre By loop, built from your live table plus the shops' own
pages. The thing worth knowing before you read it: **the shops you would pitch
and the entries missing photographs are the same walk.** Skindergade 20 and 45
are Farfar's bodega and Hive, both with eight sources and no picture, a hundred
metres apart. Christiansborg is three photoless entries in one stop.

The line that matters most is the answer to *how many customers will this send
me*: **you cannot say, and saying so is stronger than any number you could
invent.** You have no analytics and your privacy policy says so in writing.

## 2. The four language gaps, closed

`previewWhy` was deterministically English on the preview screen. The three
rewrite passes could return one field of a German guide in English.

**The obvious repair was wrong in both directions and that is the whole
finding.** Appending `writeInLanguage()` fails twice:

| Browser | Traveller wrote | Guide is | What the obvious fix does |
| --- | --- | --- | --- |
| English | German | German | `readerLanguage` returns null, no block is added, **the bug survives its own fix** |
| German | English | English | The block is added naming German and **flips a correct English field into German** |

Both failures have one root: the browser tag says where a device is configured,
and a rewrite is not asking that question. **A rewrite is already holding the
answer.** So `keepLanguageOf` names no language, reads no navigator, and is
unconditional. `previewWhy` composes fresh prose rather than rewriting, so it
gets the reader block instead.

The assertions are anchored on **the line that puts the result in front of the
reader**, not on the prompt wording: `writeGuideProseField`, `parsed.title =`,
`setPreviewWhy`. A fifth rewrite pass cannot be added without a language rule,
because it will have to store its answer somewhere.

Eight mutations, all red by name. One of my own assertions was inert
(`Function.length` reads 0 either way when the first parameter has a default) and
the mutation walked straight past it. Rewritten to read the function body.

## 3. Item 9, and two defects found on the way to it

### The defects, both found by running the code rather than reading it

**`selfContradictions` could not see a typographic quote.** The character class
was `[""]`, which is two copies of the same ASCII quote, so a retraction note
written with `"` or `«` never matched, the claim was never extracted, and the
check returned **nothing at all**. No error, no finding, a clean pass. Models
write typographic quotes constantly, which means the check most likely to be
defeated was the check on the drafts written most carefully.

The lesson was already on the page. Thirty lines below, under *AND TYPOGRAPHY IS
NOT MEANING*, the identical fault is described and fixed for **apostrophes**, in
`norm`. It was fixed one character short: `norm` runs on the prose, `QUOTED` runs
on the raw note before `norm` ever sees it.

**And the field list missed `gemlyxFind`.** That field is defined in your own
drafting prompt as "ONE specific curated recommendation only Gemlyx would flag",
which is to say the one sentence per entry that is *meant* to make a strong claim
nobody else makes. An unsupportable superlative goes there first and the check
could not see it. `blogBody` was missing too, and after `shapeForLive` that is
where most published prose lives.

Both fixed. Six mutations red by name, and two of them were caught by assertions
written on 14 August for the behaviour they protect.

### Why those two are the argument for item 9

There are **five separate lists over one field namespace**, none complete, and
the gaps between them are invisible. Two exports are literally called
`PROSE_FIELDS` and they disagree about eleven fields.

### `src/utils/evidence.js`

One question: **how do we know this?** Not a confidence score. A number from 0 to
1 would be a guess wearing the costume of a measurement, which is the failure
this whole repository exists to prevent, and nobody could ever say why a field
scored 0.72. So four kinds of evidence, ordered, each a fact about the row that
you can disagree with by pointing at the row:

| | |
| --- | --- |
| **measured** | the pipeline fetched it and a rewrite may not overwrite it |
| **cited** | a specific page is recorded for *this field* (`__priceSource` today) |
| **sourced** | the entry was researched, but nothing ties this line to any of it |
| **unsourced** | nothing recorded at all |

**And a second axis, which is why one tier is not enough.** "Founded 1891,
unsourced" and "opening hours, unsourced" are the same tier and not the same
problem: one was right or wrong the day it was written, the other is decaying
while you read it. `unbackedPerishables` is the pair nothing in the codebase
could name before, because the sources gate saw one half and `factAge` saw the
other and neither saw both.

**It keeps no vocabulary of its own.** Every list is imported, and the suite
fails if one gets restated locally. The one list it does declare, the perishable
fields, maps entry by entry onto topics `pageScan` already names, asserted, so
the two instruments cannot drift.

Ten mutations, red by name, including one that tries to grow a confidence score
and one that keeps a local copy of `MEASURED_FIELDS`.

**Nothing calls it yet, and that is stated in the file rather than left to be
found.** It is the shape of this repository's own signature bug and calling it
phase one does not change that. Two places to wire it, and the cheaper one is
not a design decision:

1. **The Studio's Manage view.** `manageGroups.js` already groups rows by problem
   and already counts the ones with no sources. Founder-facing, so no visual
   judgement is involved.
2. **DetailPage, under a field.** That is the render, and it is yours: "never
   give an estimate the visual authority of a measurement" is a decision about a
   page and not one a module should make while you sleep.

A third publish note was considered and **not** built: `evidenceNote` and
`missingSourcesNote` would fire on exactly the same rows, and a second sentence
saying the same thing in different words is how a shouted note stops being read.

---

## What the live read found, which you have not seen

Read through your browser at 15:00, all 148 published rows.

**Only nine entries have both a photograph and a source.**

| | has sources | no sources |
| --- | --- | --- |
| **has photo** | **9** | 62 |
| **no photo** | 62 | 15 |

124 of 148 sit on that anti-diagonal. The library was built in two eras that
never overlapped: the old one got pictures and no provenance, the new one got
provenance and no pictures. **Your 77 sourceless rows and your 77 photoless rows
are almost entirely different rows**, so the redraft queue and the camera queue
are two jobs, not one.

**Type breakdown, which is recorded nowhere in the repo:** 45 festivals, 39
towns, 29 attractions, 23 food, 5 nightlife, 3 nightlife towns, 2 nightlife
streets, 1 food street, 1 essential.

**Eight duplicate rows across six names.** Møgeltønder is in there three times.
`order=id.desc` means only the newest is served, and two of them serve the worse
row: **Samsø is live with no photo while an older row with a photo sits behind
it**, and Geranium serves the newer row with eight sources over an older one with
a picture.

## What I think you should do now

1. **Push, then run both SQL files.** `SUPPORT_TABLE.sql` and the `updated_at`
   trigger in `manageGroups.js`. They are the only things here that need you.
2. **Copenhagen.** It is the only thing on this list that expires.
3. **Fix Samsø.** One field copy, and a picture you already own goes live.
4. **Wire evidence.js into Manage** before you build the render. It is the half
   with no design decisions in it, and it will tell you which rows to redraft
   before you spend a research run finding out.

## How this was checked

Twenty-four mutations across three changes, each applied, the suite run, the
failure read by name, the file restored. Two of my own assertions were wrong and
the suite said so before I shipped them, one inert and one that fired on its own
best case. One mutation was an equivalent mutant and is recorded as that rather
than counted as a pass.
