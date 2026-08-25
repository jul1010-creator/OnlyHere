# What it would take to make Gemlyx multilingual

25 August 2026. Written against the ChatGPT brief, which asks for an
architectural assessment before any implementation. Nothing in the plan below
has been built. Two things adjacent to it have, and they are at the bottom
under "what changed today", because one of them was a live defect rather than a
proposal.

Oliver's steer: **"at least German, Danish, and Chinese covered."**

---

## The finding that reorganises the whole brief

The document treats this as one project. **It is three, and they have nothing in
common except the word "translation".**

| | What it is | Volume | Risk | Cost |
| --- | --- | --- | --- | --- |
| **A. Interface** | Buttons, labels, nav, errors, empty states | ~344 certain, 600-750 realistic | **None.** No string carries a fact | A week of typing |
| **B. Model output** | Chat, itinerary, preview prose | 10 call sites, **6 already done** | **Low.** Generated per traveller, stored nowhere, indexed by nobody | ~£0. One paragraph on a prompt already being sent |
| **C. Published content** | 148 rows of edited editorial | ~2,200 prose fields | **High, and it is a different kind of high** | See below |

A and B are ordinary work. **C is the one that can make the product worse**, and
the brief's ten numbered points give it the same weight as the other two.

### Why C is a different animal

**Every fact gate in this repository reads English.** `entryAudit`, `factSweep`,
`claimCheck`, `checkScope`, `correction`, `absenceClaims`, `looksUntranslated`,
`scanForAITells`, `fillerWordCounts`, `priceSource`. Not one of them can see a
German row. Publishing a translated entry means publishing an entry that **no
gate in this codebase has ever looked at.**

That is the exact inverse of the last month's work. `readerLanguage.js` already
says it, in its own header, on 15 August: *"every fact gate in this codebase
reads English, so a translated row sits outside all six of them."* It was
written as a reason not to do C. It still is.

Three consequences worth naming before any of this is costed:

* **77 of 148 rows still carry no `__sources`.** Translating an unsourced row
  into three languages produces three unsourced rows. The provenance repair
  comes first or it never happens.
* **`scanForAITells` and `fillerWordCounts` silently no-op** on any non-English
  text. "Charming" and "nestled" have German equivalents and the scanner has
  never heard of them. The quality gate does not fail; it passes, emptily.
* **The `blogBody` headings are inside the stored rows**, not rendered from a
  constant. "The Reality Check", "Who It's For", "Things to Know". Translating
  the interface does not touch them. They are a content migration wearing a UI
  costume.

---

## The one architectural decision worth making now

The brief's §7 asks that facts never diverge between languages, and its §9 asks
for graceful fallback. **Both are the same decision, and it is structural rather
than a discipline anybody has to keep.**

> **Never store a translated fact. Store a prose-only overlay, and render every
> other field from the English row.**

A German page is `{ ...englishRow, ...germanProseOverlay }`. The overlay carries
only the fields on the prose allow-list. Everything else (price, opening hours,
`travelTime`, `ticketStatus`, `nearestStation`, `lat`, `lon`, `website`,
`__sources`) comes from the English row **by construction, because it is not in
the overlay to be wrong.**

What that buys, in one move:

* **§7, facts identical across languages:** not a rule to enforce. There is only
  one copy of each fact and the German page reads it.
* **§9, no broken keys:** there is no such thing as a missing key. A field the
  overlay does not carry falls through to English prose. `attraction.description.de`
  can never render because no such string exists anywhere in the design.
* **Staleness (§10):** hash each English prose field at translation time and
  store the hash beside the overlay. When the English field changes, its hash
  stops matching and **that field alone** is stale. Per-field, not per-row,
  because he edits one paragraph at a time.
* **A partial translation is publishable.** A German page with three fields
  translated and twelve in English is honest and useful. Under a duplicated-row
  design it is a half-empty page.

The alternative, a `payload_de` column or a parallel row per language, is the
design the brief itself warns against in §7, and it fails the way he predicts:
one price changes, one row gets updated, three do not.

---

## The ten questions, answered

**1. What i18n infrastructure exists.** No library. `package.json` has six
dependencies and none of them is one. There is no `t()`, no catalogue, no locale
file. What exists is a **convention**, stated in `aiDisclosure.js`: *"A seventh
language is a line in this object, exactly as it is a list entry in
travellerWords.js."* Four files already follow it: `travellerWords.LANGUAGES`
(6 codes), `readerLanguage.FALLBACK` (20), `AI_DISCLOSURE` (now 9),
`languageBarrier.DANISH_MARKERS`.

**2. Which library.** **None.** Recommended, with the case against stated:
react-i18next is a solved problem with real tooling for finding untranslated
keys, and hand-rolling is how you get a bespoke thing only its author can
maintain. Against it: ~40KB gzip onto a bundle already flagged at 533KB gzip;
the features it sells (ICU plurals, namespaces, lazy loading) are needed at
maybe a dozen of 344 strings, and Danish and German both use the same two-form
plural as English; and it solves exactly none of C, which is where all the
difficulty is. What actually matters is **completeness enforcement**, and this
repo does that better than a library would: an assertion that every key in `en`
exists in every other language, and that no reader-facing JSX text node is a
bare literal. `tools/englishStrings.mjs` already finds them.

**3. Static UI.** ~344 strings that provably render, plus ~90 in `src/data/`
(essentials, shop, facts). **392 Studio strings and 275 model prompts are
excluded and must stay excluded**, because he is the only reader of the first and a
model is the only reader of the second. The Studio boundary is mechanical, not a
judgement call: two `{isStudio && ...}` blocks in `App.jsx`, brace-balanced, and
`tools/englishStrings.mjs:203` already implements the finder.

**4. Editorial content.** The overlay, above. Keyed on the row id, written by a
one-off pass, never on page load. Note one inherited fragility: five towns have
genuine duplicate rows and `order=id.desc` is load-bearing in `findBySlug`. An
overlay keyed by id inherits that; deduplicate before translating, not after.

**5. AI chat and itinerary.** Already 6 of 10 call sites, and the design is
right: the model composes in the target language from verified Danish data
rather than translating an English answer, which is what §3 of the brief asks
for. Four gaps, all reader-facing, listed under "what I did not fix" below.

**6. Caching and storage.** No runtime translation, ever. Pre-generated, stored,
served. The chat/itinerary side needs no cache at all: it is one paragraph
appended to a prompt that was already being sent.

**7. Detecting stale translations.** Per-field content hash. Covered above.

**8. URL and SEO.** The good news is that the hard part exists. `middleware.js`
already injects per-row `<title>`, description, canonical, Open Graph, JSON-LD
and a real `<article>` for crawlers, server-side, per entry. Adding `/de/denmark/...`
is a `matcher` change there plus `hreflang` injection in `linkPreview.js`.
Recommended: **prefix routing, English unprefixed.** Do not move 148 indexed
URLs to `/en/`. `hreflang` on every localised page including `x-default` pointing at
English, self-referencing canonicals per language.

**Three things to know before touching this.** `<html lang="en">` is hardcoded
in `index.html` and never changed by JS. `document.title` is never set
client-side at all, so a human browsing the SPA sees one tab title everywhere, which
the SEO story for English is itself unfinished, and language sits downstream of
it. And **do not publish a localised route until the content behind it is
actually translated**: `/de/` serving English prose in a German shell is
duplicate content, and it damages discovery rather than helping it.

Geo-blocking Regulation (EU) 2018/302 is worth naming here because the brief
gets it right by instinct in §5: **never switch language on IP.** Browser
language may suggest; the traveller decides; the choice persists.

**9. API cost.** Roughly **$3.50 per language for the whole 148-row corpus**,
one pass, at Sonnet-class pricing. Call it $11 for three languages, and about
$2 a month in re-translations if he edits a fifth of the library. The
chat/itinerary side is a rounding error on a call already being made.

**So the money is not the cost, and treating it as the cost is the trap.** $11
of tokens produces 444 pages that none of the six fact gates has read. The
expensive resource is checking, at roughly ten minutes a row to confirm the
names survived, the prices are unchanged, no fact was invented to make a
sentence flow. That is **~25 hours per language he can read**, and for a
language he cannot read it is not a number of hours at all.

**10. Which parts of the codebase change.** `App.jsx` (the string extraction and
the selector), all 34 components, `src/data/*`, `middleware.js` and
`linkPreview.js` (routing, hreflang, per-language meta), `studioContent.js` (the
overlay write path), `index.html` (`lang` becomes dynamic), plus one new
`utils/i18n.js` and one catalogue file per language.

---

## Which languages, and the honest answer about Chinese

**German: yes, first, no argument.** 6.0m overnight stays in 2024, the largest
foreign market by a wide margin, and already a line in every table in the repo.

**Danish: yes, and for a reason worth stating plainly.** Domestic tourism is the
largest single segment of Danish tourism, so the market is real. But the better
argument is the one his own code already makes: **Danish is the only language
he can check.** `readerLanguage.js`: *"a native block is only worth having if
somebody can check it, and Danish is the one language in this repo that its
owner can check."* Every gate that reads English is blind in German. In Danish,
**he is the gate.** That makes Danish the right place to learn what translated
content does to this pipeline, before betting on a language where nobody can see
the result.

**Chinese: already covered where it is cheap, and the rest should wait.**

This is the pushback, and it is specific rather than a general caution:

* **The chat and the itinerary already work in Chinese, today, in production.**
  `readerLanguage` has kept the `zh-Hans` / `zh-Hant` script subtag since 15
  August, deliberately, because of Oliver's own question about a Mandarin
  speaker. A Mandarin traveller can already have a Mandarin conversation and be
  handed a Mandarin itinerary built from verified Danish data. That is job B,
  and it is done.
* **What is missing for them is job C, and C is where Chinese is hardest.** The
  toolchain assumes Latin script and spaces between words. `fillerWordCounts`,
  `scanForAITells`, the 60-word `worthServing` thin-content guard,
  `DANISH_PAGE_RATIO`, `looksUntranslated`. Every one of them counts words, and
  Chinese does not have spaces. They will not fail. They will return numbers
  that mean nothing.
* **The proper-noun rule is weakest exactly where it matters most.** In German,
  "Nørreport Station" sits in a German sentence in the same alphabet and a
  traveller can match it to the sign. In Chinese, the model is pulled hard
  toward 诺瑞港站, and the only thing standing in the way is **a sentence in a
  prompt**. There is no code that checks it, and no `looksUntranslated` for
  Chinese to write. The single failure this whole language layer exists to
  prevent is the one that is least guarded in the language he named.
* **And nobody can read the result.** For a product whose stated position is
  that uncertainty is displayed rather than hidden, publishing 148 pages whose
  honesty no one on the team can assess is not a risk to manage. It is a
  contradiction.

**Recommended launch set**

| Stage | What ships |
| --- | --- |
| Now | Interface in **da + de**. Model output: close the four gaps. Works in all 20 languages already, Chinese included |
| Next | Content overlay in **da only**, as the pilot, because he can check every row |
| After that | Content overlay in **de**, once Danish has proved the pipeline and the staleness detection |
| Chinese | Chat and itinerary: already live. Pages: when there is somebody who can read them |

Nothing in that order is wasted if he later disagrees about Chinese. The
overlay, the staleness hash, the selector and the routing are language-agnostic;
only the checking is not.

---

## What about the Studio? Are drafts written in more than one language?

Oliver asked this directly, and it is the question the three-way split above
exists to answer. **No, and the pipeline has to stay that way.**

### Why a draft is different from an itinerary

The brief is right about the itinerary in §3: generate natively in German, never
English-then-translate. It is right there for a reason that does not hold here.

An itinerary is composed from **facts that have already been checked**. The
research ran in English, `entryAudit` examined it in English, a person published
it, and the model then writes German prose around figures that were settled
before it opened its mouth. Nothing new is asserted.

**A draft is where facts enter.** The research runs, the model writes claims that
nobody has seen before, and six gates then examine those claims. Write the draft
in German and every one of those gates is looking at text it cannot read:
`entryAudit`, `factSweep`, `claimCheck`, `checkScope`, `correction`,
`absenceClaims`, plus `scanForAITells` and `fillerWordCounts` which count English
words and will report zero.

> **Compose natively where the facts are already checked. Draft in English where
> the facts are being established.**

That is the whole rule, and it maps exactly onto the A/B/C split at the top of
this document. It is also already the pipeline's posture rather than a new
policy: `looksUntranslated` and `glanceExtract.js` exist to keep Danish OUT of
reader-facing fields, so "drafts in several languages" would invert a rule this
repository already enforces on every publish.

### So nothing about the Studio changes

He keeps writing and editing in English. **Translation is a post-publication
step**, downstream of the gates rather than beside them: draft, gate, publish,
then translate the published row as a prose-only overlay. One audited body of
content with three renderings of it, instead of four unaudited bodies.

A "Translate" action belongs on a published row in Manage, never in the draft
editor. And the staleness hash closes the loop: edit an English paragraph, that
paragraph's translations go stale, and Manage says so.

### The one gate that can read a language nobody on the team speaks

The translation pass may be told to compose naturally in German rather than
translate sentence by sentence, which is the brief's instinct and it is a good
one. It may not be allowed to introduce a fact the English row does not carry,
and that turns out to be **mechanically checkable without reading the language**:

* **Every digit sequence in the English prose must appear in the translation.**
  "60 DKK" is "60 DKK" in every language on the list. A German paragraph saying
  80 is refused.
* **Every proper noun the row already stores must appear verbatim.** `name`,
  `town`, `nearestStation`, `mapHint`, `website`. This is the strongest thing in
  the design, because **it works in a script nobody here reads**: if a Chinese
  paragraph does not contain the literal characters "Nørreport Station", it
  wrote 诺瑞港站 and it is refused, and no one had to be able to read it to know.

**And the honest limit, which matters as much as the check.** This verifies that
facts were not ALTERED. It cannot verify that the German sentence means what the
English one meant. The failure it cannot see is the loss of a hedge: "probably
closed in winter" and "closed in winter" have identical digits and identical
names. `readerLanguage.js` already names that exact fault about hedging words in
its own prompt block. So the check narrows the danger to prose judgement; it does
not remove it, and the Chinese argument above survives it.

## Risks the brief does not mention

* **`slugify` folds Danish letters and the photo path is built from `name`.**
  `studioContent.js`: *"Change it and 71 photos stop resolving."* A translated
  `name` changes the URL and orphans the image. `name` is already on the
  do-not-translate list; this makes it load-bearing rather than merely correct.
* **Closed vocabularies must be mapped, never translated.** `themes`, `tier`,
  `ticketStatus`, `placeKind`, `bookingType` are compared as strings by code. A
  German `tier` reading "Unbedingt sehen" is the Copenhagen publish failure
  again, in a language nobody can debug.
* **`uncertainties` is mixed.** It carries both reader-facing uncertainty and
  founder-only shouted publisher notes. A translation pass that does not respect
  `isPublisherNote` will translate "CHECK BEFORE PUBLISHING" into German and
  `correction.js`'s `SHOUTED_NOTE` will stop protecting it.
* **The disclosure obligation follows the language.** AI Act Article 50(1) wants
  the disclosure clear to the reader. Serving a language means serving the
  disclosure in it. That gap existed as of this morning and is fixed below.

---

## What changed today

**Nothing from the plan above.** Two defects in shipped code, both found while
surveying for it.

**1. The Article 50 disclosure has been English for every reader since it
shipped.** `aiDisclosureFor` passed `readerLanguage()`'s return value, an object
shaped `{ tag, name }`, into a lookup expecting a language code. `String({...})` is
`"[object Object]"`, the key missed, and the English fallback that exists so an
unknown language still gets informed absorbed it silently. Six translations,
none reachable. Two further misses in the same expression: `navigator.language`
is `"de-DE"` and the key was `"de"`, and `"nb-NO"` is Bokmål where the key is
`"no"`.

The suite had three assertions on this and all three were true: the table has six
entries, all three surfaces call `aiDisclosureFor`, an unknown language falls
back to English. **None of them asks what a German reader sees**, which is the
only question Article 50 asks. The new assertions call the function the way the
render sites call it and read the sentence that comes back.

**2. Chinese added to the disclosure, both scripts.** Not part of the plan above
and not optional: the chat already answers in Mandarin, so 50(1) already applied
and was not being met. Bare `zh` resolves to Simplified.

    node tests/run.mjs      10,109 passed, 0 failed
    npx vite build          clean

Mutation tested seven ways: the original object-passing restored, raw indexing
returned, the script step dropped, the Bokmål alias dropped, Traditional made a
copy of Simplified, the object tolerance stripped, a region read as a script.
Five went red by name. **Two were equivalent mutants and are recorded as such
rather than counted as passes**: restoring the old object-passing call now
behaves identically, because the repair made the function accept both shapes on
purpose, and that tolerance is itself asserted now, so stripping it goes red; and
reading a region as a script changes no current behaviour, because the scripted
lookup is guarded and no region-keyed entry exists. The four-letter test mirrors
`languageName` one file over and is kept for that reason rather than because a
test forces it.

## What I did not fix, and would with one word

Four model calls that write prose a traveller reads have **no language
instruction at all**, so a German guide can revert to English mid-document:

| Where | What it writes |
| --- | --- |
| `src/App.jsx:10790` | AI-tell rewrite pass. Runs *after* the guide is built in the traveller's language and rewrites flagged fields with no language rule |
| `src/App.jsx:10830` | Fact-check fix pass. Same shape, same path |
| `src/App.jsx:11092` | Retitle when `titlePromises` finds a false claim. Replaces the guide title with an English one |
| `src/App.jsx:12208` | `previewWhy`, the "why this route fits you" sentences on the preview screen. **Always English**, deterministically, because it composes fresh prose rather than rewriting existing prose |

The last one is a certainty rather than a risk. The first three depend on the
model following its input language, which it usually does and is nowhere told to.

`readerLanguage.js` currently claims the 22 August pass covered *"the rewrite
passes"*. It did not, and that comment should be corrected in the same change.
