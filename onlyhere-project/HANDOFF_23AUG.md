# Handoff, 23 August 2026

Written after a long session that started with "should we make the terms of use
and privacy file now" and ended somewhere else entirely.

**He commits himself. Claude writes to disk.** Most of the day is already
pushed: the legal pages, the themes, the `onGold`/`onAccent` wiring, the marker
tightening, the hook, the brand files.

**Five files are on disk and not yet committed**, all from the second wave:

    onlyhere-project/src/utils/travellerWords.js   (new file)
    onlyhere-project/src/utils/foodStyle.js        (new file)
    onlyhere-project/src/utils/tripEvents.js
    onlyhere-project/src/utils/tripBrief.js
    onlyhere-project/src/utils/helpers.js
    onlyhere-project/src/components/GuidePreviewScreen.jsx
    onlyhere-project/src/App.jsx
    onlyhere-project/tests/run.mjs

Run `node tests/run.mjs` and `npx vite build` before pushing. There is now a
pre-push hook that does both for you.

---

## Read this part first

**Three of the fixes shipped earlier in this session were worse than what they
replaced, and an adversarial review found all three.** They are fixed, but the
pattern is the thing to carry forward, because it is the same pattern the 22
August handoff opened with:

1. **Darkening the light gold "for contrast" made every gold button worse.**
   The justification was that white text on gold went from 4.43 to 5.38. Nothing
   rendered white text on gold. Sixteen buttons hardcoded `color: "#000"`, so
   the pairing that really renders went from 4.66 to **3.84**, below AA, on
   every primary call to action in the light theme. An assertion measuring
   `onGold` against `gold` stayed green throughout.

2. **Relative dates read ordinary conversation as an arrival date.** "Great,
   thanks, talk tomorrow!" filled the hard `when` slot. So did "is the weekend
   market in Odense good?". It also beat a stated month, so "we are thinking
   October, I will confirm tomorrow" arrived as tomorrow. That is the 21 August
   failure back again: a guide built confidently for dates nobody gave.

3. **The loosened ready marker matched real English and fused words.**
   `isReadyToBuild("I'll have Gemlyx ready to build your guide")` was true, and
   the strip rendered it as "I'll haveyour guide", on every assistant message,
   because `stripReadyMarker` runs on all of them.

The shape all three share: **a fix justified by a measurement of something the
product does not do.** A token nothing reads, a phrase nobody says, a pairing
nothing renders. The suite was green for all three.

**And a fourth, from later the same night.** The 22 August fix taught the `when`
slot Danish. It did not occur to anyone that `party` is HARD in exactly the same
way and was still English only, so his father could answer "min kone og jeg" in
Danish, get a fluent Danish reply, and be asked who was coming again. The fix
had moved the wall by one slot. **When a fix removes a barrier, ask what else
sits behind the same barrier before calling it done.**

---

## What changed

### The three regressions

`src/utils/theme.js`, `src/App.jsx`, `src/components/AskGemlyx.jsx`,
`src/components/AuthSheet.jsx`

`onGold` and a new `onAccent` are now read by the 27 places that used to
hardcode a foreground on a gold or accent fill. This is what makes the palette
numbers describe real pixels. Worth knowing why one token could not do both
jobs: for gold to clear AA as text on the cream page it needs luminance at or
below 0.156, and for black text on it to clear AA it needs 0.175 or above. No
colour satisfies both, which is the arithmetic proof that the foreground had to
move rather than the fill.

`src/utils/tripEvents.js` gains `relativeAnswerIn`. A relative date now counts
only when the TURN is an answer: take the date phrase out, take any trip length
out, and if a person still said something, it was a sentence rather than an
answer. "i dag" leaves nothing. "talk tomorrow" leaves "talk". `readWhen` also
runs it LAST, after the stated month, and per turn rather than over the whole
conversation joined together.

`src/utils/helpers.js` tightens the marker to bracketed with any separator, or
unbracketed with separators no human writes between those four words. The strip
replaces with a space instead of nothing, so it can no longer fuse words.

### Themes

All three now clear AA on every pairing the UI puts on screen. Two of dark's
colours were short and are fixed: `muted` 3.85 to 5.39, and the accent, which
carried white text at 4.23 on the send button and on every message a traveller
has typed, is now `#D23043` at 4.95. It is the smallest move that clears the
line while staying the same bright red rather than the oxblood the other two
themes use.

**`DEFAULT_THEME` is now `dark`**, per his request. `THEME_ORDER` is unchanged,
because that is the order they are offered in, which is a different question
from which one a person who has never chosen gets.

### The legal pages, corrected against primary sources

A research pass checked every legal claim against the regulators' own sites.
Five were wrong and are fixed:

- **The age floor was stated as 13. It is 15.** Denmark raised it on 1 January
  2024, in databeskyttelsesloven section 6. The page said 15 was "our own
  stricter line" when it is the statutory minimum. This one was live and wrong.
- **Center for Klageløsning no longer exists under that name.** It is now
  Mæglingsteamet for Forbrugerklager, alongside Forbrugerklagenævnet.
- **The text and data mining clause reserved the opposite of what it meant.**
  "Reserves the right to text and data mining" reserves a right to mine. Article
  4(3) reserves the USE of the content FOR mining.
- **The absolute mining ban was unenforceable.** Article 7(1) makes any contract
  term contrary to the Article 3 research exception void.
- **ADR competence follows the trader, not the consumer's residence.**

### The second wave: six languages, and a question with two answers

`src/utils/travellerWords.js` (new), `src/utils/tripEvents.js`,
`src/utils/tripBrief.js`, `src/App.jsx`, `tests/run.mjs`

**The 22 August fix taught `when` Danish and stopped there.** Oliver asked for
every way his father could get stuck, and the hunt found the successor to the
original bug sitting one slot over: `PARTY_RE` was still English only, and
`party` is HARD in exactly the way `when` is. So his father could answer "min
kone og jeg", watch Gemlyx acknowledge his wife in fluent Danish, and be asked
who was coming again. Forever. **The wall moved; it did not come down.**

Denmark's inbound market in 2024 decided the list: Germany 6.0m, Netherlands
2.0m, United States 1.1m, United Kingdom 0.9m, Sweden 0.8m. Six languages now
read: Danish, German, Dutch, English, Swedish, Norwegian.

`travellerWords.js` is one vocabulary that `tripEvents.js` and `tripBrief.js`
both import, so **adding the seventh language is a list entry, not a seventh
copy of the same regex.** It holds month names, day and week words, party
relations and possessives, headcount shapes, relative days, and yes/no words.
Two helpers matter:

- `alt(words)` dedupes, sorts longest first, **escapes regex characters**, and
  joins with `|`. The escaping is the part that bit: `DAY_WORDS` originally held
  `"days?"` as a shorthand and it became the literal string `days?`, so **"7
  days" stopped parsing in English** while "7 dagen" carried on. Put plain
  words in these lists. Never patterns.
- `edged(pattern)` is the word boundary, because **`\b` is ASCII only in
  JavaScript** and `\bén uge\b` never matches anything. It uses an explicit
  letter class covering the accented range.

Three things this taught the readers:

1. **"15. maj" failed twice over**, on the period after the day number and on a
   month name that was not English. By lexical accident about half the year
   worked (`maj`/`May`, `oktober`/`October`), which is worse than none of it
   working, because it hides.
2. **"man" is husband in Danish, Swedish and Norwegian and also the impersonal
   pronoun in all three.** "man kan tage toget til Ribe" must not fill the party
   slot. Relation words therefore require a possessive in front; only group
   words like `familien` and `alene` stand bare.
3. `relativeAnswerIn` now runs **last**, after `monthOnlyIn`, and per turn.

**The Yes/No card.** His words: "Instead of writing 'yes' when it asks to build,
let it pop up as yes and no, right where the guide will be. So you can click it.
Then you won't miss it."

What it replaced was one gold button labelled "Turn this into a guide", which is
a label rather than an answer, sitting under a chat that had just asked a
question. His father read the question, looked for somewhere to answer it, and
typed. The card asks "Shall I build your guide?" and offers two 52px buttons.
**"Not yet" sends a turn rather than closing the card**, because a No that
silently dismissed itself is another dead end, which is the failure the card
exists to remove.

### It ate the date off a Danish holiday

`src/utils/helpers.js`

`stripMarkdown` runs on every assistant message. `^\d+\.\s+` is the markdown
numbered-list marker and it is also, letter for letter, how Danish, German and
Dutch write a date. **"1. maj er en helligdag" reached readers as "maj er en
helligdag"**, on a guide to Denmark, where public holidays and festival dates are
most of what it says.

Guarded on the month name now, read from the same six-language vocabulary the
traveller parsers use, so a real list still loses its markers and a written date
keeps its day. Not complete: "3. sal" and "1. klasse" are ordinals too and still
lose their number. The month case is the one that was reaching readers, and the
remainder is asserted as a known gap rather than left as a surprise.

Two more from the same function, both from the same review:

- **It paired stray asterisks across a sentence.** `\*(.+?)\*` matched from the
  star in "a 4* hotel" to the star in "5* reviews". Real italics have no
  whitespace immediately inside the markers, which is what the `\S` anchors now
  require.
- **It missed the most common bullet there is.** The class was `[-•]`, so `* `
  bullets, `+ ` bullets and every indented bullet survived, which is the exact
  thing the function was added to remove.

### The brief knew the dates and the event filter did not

`src/utils/tripEvents.js`, `src/utils/tripBrief.js`,
`src/components/GuidePreviewScreen.jsx`, `src/App.jsx`

**This one was made worse by the six-language work, which is why it is here.**

`tripWindow` feeds `tripEvents`, which is what stops a February festival being
offered for an August trip. It read a written date and a bare month and stopped
there. So his father's conversation left the BRIEF saying "I know when you are
here" while the WINDOW came back `dated: false` and the event filter had nothing
to rule anything out with. Teaching the brief six languages widened that gap
rather than closing it: *heute*, *vandaag*, *nästa vecka* and three more all
filled the brief and gave the events nothing.

Both readers now go through one exported `latestRelativeAnswer`, so the
precedence cannot drift apart again: a written date beats a bare month beats a
relative answer, in the brief and in the window, by construction.

**And it takes an ARRAY of the traveller's turns, never `convoText`.** That
string is both halves of the conversation with a `role:` prefix on every line, so
splitting it there would read a date out of Gemlyx's own replies. A caller with
no turns gets exactly the old answer. Both call sites now pass the array.

### It said "saved to your account" and meant maybe

`src/App.jsx`

`commitGuideSave` writes to localStorage; a debounced effect pushes to Supabase
1.2 seconds later. `pushCloudSaves` returns a boolean saying whether that worked
and **nothing read it**, while the toast had already announced "Guide saved to
your account".

A signed-in person on a dead connection, or holding an expired token, was told
their trip was in their account when it was in that browser and nowhere else.
They find out by opening their phone to an empty list.

Three changes, and the reasoning behind the third is the one worth carrying:

1. The toast says what is true when it is said: **"Guide saved. Syncing to your
   account."** The old string promised an outcome that had not happened yet.
2. The push result reaches state instead of the floor.
3. **It is recorded, not announced.** A toast raised from that effect would be
   wiped by the save toast's own clear timer 900ms later, before anybody could
   read it. It shows on the account screen, where somebody goes to ask the
   question.

**And point 3 is a real finding on its own.** There are 50 `setToast` call sites
and 22 hand-rolled `setTimeout(() => setToast(null), n)` clears, so **any toast
raised while another is showing gets cut short by the older one's timer.** That
is latent across the whole app, not only here. The fix is one `showToast(text,
ms)` holding a single timer ref, and converting the 22. Eighteen of them are a
plain adjacent pair a script can do; four are multi-line ternaries and want
reading. It was deliberately not done at 3am on a 1.5MB file.

---

## What still needs Oliver, and only Oliver

**1. The Travelpayouts script.** Still live on the front page, still loading a
second chunk, still setting a cookie. `index.html` says in his own words that it
is temporary and that every Emerald tool must be off before it ships. While it
runs, the published privacy policy's "no analytics and no tracking pixels" and
"sets no cookies of its own" are both false. Dashboard setting, not code.

**2. Email.** The two aliases in Google Admin and Confirm email off in Supabase.
Until the aliases exist, privacy@ and hello@ bounce, and both are named in
published legal documents as the route for a GDPR request.

**3. The Google consent screen.** Both URLs exist and are linked. `public/brand/`
now has a 120x120 PNG, which is the size the consent screen asks for.

---

## Still open, in the order I would take them

### 1. The filters. BUILT. Read the fourth-dropdown decision below.

His words: "The filters are different on everything. That bothers me. Especially
food is horrible. You need the drop down of like type, area, fastfood/fine
dining, budget."

Food carried three separate bespoke rows: `foodKind` as pills, `foodCity` as a
scrolling pill row, `foodTab` as underline tabs. Three controls, three shapes,
each with its predicate written inline in the row AND again inline in the
`.filter()` below it, on the page directly beside Events and Attractions where
the same questions were already one row of dropdowns.

All three are gone. Food now renders the same `<FilterBar>` with four dropdowns:
**Type, Area, Style, Budget.** The three old pieces of state keep their names and
values, so nothing else that reads `foodTab`, `foodKind` or `foodCity` changed.

**Where the facets live, and why it matters:** `src/utils/foodStyle.js`, not
`App.jsx`. Same argument that moved `layoutBody` into `articleLayout.js`: they
decide what a reader sees, so a decision living in `App.jsx` can only be checked
by a regex over its own source. Declared in a file the suite imports, the tests
build a pool of rows, apply the facets and read what comes back. 49 assertions,
every one of them run rather than pattern-matched, and mutation tested.

**THE FOURTH DROPDOWN, which is the part you were asked to decide and I decided.**

There is still no field on a food entry that says fastfood or fine dining. What
`placeKind.js` already settled is what to do about that: "A place is only a
village if somebody SAID it is a village. Inferring it from a population figure
the entry does not carry, or from a name that sounds small, is exactly the
invention this codebase exists to refuse."

So `diningStyleOf` reads three things and refuses two:

| Reads | Why it is allowed |
| --- | --- |
| `diningStyle` on the entry | stated outright, and it wins over everything |
| `isFoodStreet` | a market is eaten standing up. Not a guess about the place, that is what the field means |
| `category` | a stated categorical field. `ATTRACTION_FACETS` already keyword-matches `i.what` through `kindKeys`, so this is the established move here |

| Refuses | Why |
| --- | --- |
| the description | prose. This is the invention the codebase exists to refuse |
| the price | Budget is its own dropdown two controls along. Derive style from price and the two are one filter wearing two labels |

**Three things make it safe to ship against data nobody has audited row by row.**

1. **An unclassified row belongs to no style.** The same answer `priceBand`
   already gives, in its own words: "an unpriced row must not vanish. Null does
   that better. It belongs to no band, so it shows under All and is claimed by
   nothing." A row this cannot read shows under All and is never handed to
   somebody who asked for a quick bite.
2. **The dropdown does not render below 50 percent coverage.** If the category
   words turn out not to match what is really published, three controls describe
   the whole page and the fourth is absent, rather than four where one describes
   a fifth of it and looks exactly like the three that do not.
3. **`unstyledEntries(foodSpots)` lists the rows it cannot read**, so the gap is
   readable rather than merely absent, and the fix for any of them is to state
   `diningStyle` on the entry.

**The Danish part that took two attempts.** A plain word boundary on the left
finds none of the compounds, and on a Danish food guide that is most of the
list: a *fiskerestaurant* is a restaurant, a *havnebryggeri* is a brewery, a
*madmarked* is a market. Danish welds the head onto the END, so the left edge is
open and the right edge does the work, with the definite and plural endings
allowed after it. That is what makes *kroen* the inn and *kroner* money.

**Still to do here:** Nightlife and Towns have no facet system at all. Nightlife
has no filter state of any kind. Converting those two is what turns "reduced"
into "gone".

### 2. The bundle, and the black landing page

`1,573.50 kB`, 514 kB gzipped, one chunk. First contentful paint measured at
**5,488 ms on a warm cache**, and `index.html` paints `#0A0F1E`, so a first time
visitor watches five and a half seconds of black. Cheapest real win is static
above-the-fold content in `index.html` that React replaces on mount. The actual
fix is route level code splitting, which is a refactor because almost everything
lives in one 1.5 MB `App.jsx`.

### 3. What the review found and I did not fix

From the adversarial pass, all demonstrated by execution, none fixed:

- **The Google sign in path has no age gate and no terms stamp.** The gate lives
  on the signup tab only. `GOOGLE_SIGN_IN` is false so it is latent, but it
  becomes live the moment that flag flips.
- **`underMinimumAge("2011")` is false in August 2026** although a December 2011
  child is 14. Year only rows admit underage users for up to a year. Deliberate,
  documented, but it is the number the terms promise.
- **The in-app privacy modal now overstates deletion.** It says deleting your
  account removes everything, while the delete sheet one screen away says the
  sign in record survives until you email hello@.
- **`buildBlockedNote` is English** inside a Danish conversation, which is the
  failure that started the day. It is on the same list as the other 150 strings.

From the elderly-user hunt, found and not fixed:

- **`generateGuide` has its own duplicate parsers**, still English only. The
  brief now reads six languages; the guide builder reads one. Same class of
  drift the shared vocabulary was created to end, one file over.
- **A held profile attaches to whoever signs in next.** If he abandons a signup
  and someone else on the same machine signs in, they inherit his answers.
- **Two tabs clobber each other's saves**, last write wins, silently.
- **Every toast can be cut short by an older toast's timer.** 50 `setToast` call
  sites, 22 hand-rolled clears. See the "saved to your account" section above
  for why it came up and what the fix is.
- **Google Translate crashes the page.** It rewrites text nodes React owns, and
  React's removeChild then throws on a node that moved. Elderly non-English
  speakers are the population most likely to have it on and the population this
  fortnight's work is aimed at. Worth a `translate="no"` on the chat transcript.

### 3b. The photo in the chat. Scoped, not built.

He asked for the chat to be able to show a photo when someone asks to see a
place. It is scoped and waiting on his go, deliberately not started.

### 4. Things carried over from 22 August

The learning panel rule 4 asks for. Events placed on the wrong day. The
Copenhagen Card price. The 150 hardcoded English strings. The currency line
invisible signed out. `stayTierMismatch` thrown away as scaffolding. The
"actually" sweep, which is now 130 in copy and confirmed live on two published
guides.

---

## Things worth knowing before you change anything

**The pre-push hook is real now.** `.githooks/pre-push`, armed with
`core.hooksPath`. It runs the suite and the build in the order CI does, so green
locally means green remotely. It stopped four broken pushes in its first hour,
three of them mine. It calls vite through node rather than npm, because npm
under the minimal sh git ships on Windows fails with `/usr/bin/env: 'bash'`.

**It tests the working tree, not the commits.** That is what makes it fast and
what lets it catch a file you have not committed yet. The cost is that a fix
newer than your commit passes the hook and pushes the old version.

**The suite now checks its own imports.** `const { foo } = M` where the entry
never exported `foo` gives `undefined` silently, and only crashes when something
calls it. An assertion that merely compares against a missing name has been
comparing against undefined, possibly for months. The suite reads its own source
and fails if any name it destructures is not a name it imported. It found
`MIN_STOPS_MIDDLE_DAY` immediately, and it caught `relativeAnswerIn` the same
way a few hours later. **That is two real catches on its first day.** Run it
before you push anything that adds a function.

**Assertions pinned to a call shape break on refactors that improve the code.**
Two broke today because they read `stripDashes(String(text ?? ""))` literally,
and wrapping that same call in `stripMarkdown` broke both while the behaviour
they protect was untouched. Pin the rule, not the shape.

**Before you push: four assertions elsewhere in the suite were pinned to code
this night moved.** All four are repaired, and two of them are better than they
were. The Budget filter and the Area filter were asserted by regex against
inline expressions in `App.jsx`; both moved into `foodStyle.js`, so both are now
APPLIED to real rows instead of read as text. That is what taking a decision out
of a render buys you, and it is the same argument that moved `layoutBody`.

The check that found them is worth reusing: extract every `/.../.test(var)` in
the suite, resolve `var` back to the file its `readFileSync` names, and run the
regex. 961 source assertions, four real breaks, two false positives from regexes
quoted inside comments.

**Two more found tonight, both in tests I wrote to catch exactly this.**

The suite's self-import check caught `relativeAnswerIn` destructured from `M`
and never exported, which is the same failure that broke a push the night
before. It has a blind spot worth knowing: it catches a name destructured and
not exported, and it CANNOT catch a name used and never destructured at all.
That one is a plain ReferenceError and only running the block finds it, which is
what found it. Run the suite. Do not syntax-check and assume.

And an assertion for the new Food empty state passed with the food empty state
deleted, because Attractions has carried the identical sentence since its own
redesign and the regex was reading a different page. Mutation testing found it.
It is now anchored on `filteredFood.length === 0`, and it goes red when the
block goes.

**The recurring bug shape is still a check that answers a NEARBY question**, and
today added a variant: **a measurement of something the product does not do.**
"Is `onGold` legible on `gold`" is not "is the button legible" when no button
reads `onGold`. "Does the text contain a time word" is not "did they answer the
question". Both shipped, both green.
