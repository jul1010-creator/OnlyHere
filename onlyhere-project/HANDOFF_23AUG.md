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

---

## 23 August, late: the settings screen, and then the suite itself

Written after "How much of this can you just fix yourself?" Four things were
promised. All four are done. The last one turned into the largest find of the
day.

### The guide builder was reading three languages fewer than the brief

`generateGuide` carried English-only copies of the day count, the arrival date
and the bare month, while `tripEvents.js` had read all six languages since
22 August. So "7 dage" left `requestedDays` null and no day count was enforced,
and "15. maj" left `arrivalDate` null, which is the wrong weather and the wrong
event month. The three local readers are gone and the shared ones are imported.

Two bugs went with them. The day count was read off `convoText`, which includes
Gemlyx's own turns, so the model could set the trip length by saying a number;
it now reads `saidByTravellerForGuide`. And the old bare-month branch pushed
"in August", written on 17 August, into the following year.

The builder also gained the relative-day branch it never had, so "next weekend"
and "om to uger" now reach it.

### Every toast shared one timer

46 `setToast` sites, 22 of them hand-rolling `setTimeout(() => setToast(null))`.
A toast raised while another was showing was cut short by the older timer, and
nothing cleared on unmount. There is now one `showToast(text, ms)` wrapper
holding one ref, and the 22 pairs are gone.

### And then: sixteen assertions that could not fail

`stripNonCode` blanks string CONTENTS as well as comments. That is right for
"is this code still here" and silently wrong for "is this sentence still here",
because the sentence lives inside a string. So

    ok("the false claim is gone", !/Most tourists see Denmark for/.test(stripNonCode(app)))

was reading a row of spaces where the copy is. It was green with the copy on the
page and would have stayed green if the copy came back.

Scanning raw source instead is the trap these assertions were moved off in the
first place: the comment above a fix quotes the line it removed, so the scan
finds the bug report and calls it the bug.

**`tests/tdz.mjs` now exports `stripComments` as well.** Same walk, one flag:
comments blanked, strings kept, positions preserved. Both failure modes go at
once. Sixteen assertions moved onto it, each mutation-tested twice: red when the
copy comes back inside a string, green when a comment merely quotes it.

**Fourteen hand-rolled comment strippers are gone with them.** Eleven were
`split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))`, which misses a comment
that trails code on the same line. Three were `.replace(/\/\/[^\n]*/g, "")`,
which eats everything after `https://` on any line holding a link. That one was
real: a sentence sitting after a URL was invisible to the assertion checking it
was gone.

**A guard now stops the class coming back.** The suite reads its own source and
fails if any NEGATIVE whose pattern is three or more plain words in a row runs
through `stripNonCode`. Three plain words is a claim about copy, and a claim
about copy may not be scanned with the strings blanked out. Declarations are
excluded by keyword, so `export const normName` stays where it belongs, and
matches sitting inside the suite's own comments and strings are excluded by
using `stripNonCode` as a position map rather than as text.

### Two assertions were passing on a comment

Found by a sweep that runs every positive twice, raw and stripped, and reports
the ones that only match raw. It lives in the repo as **`tests/comment-audit.mjs`**
and is not part of the suite; its own header says why.

* **AuthSheet** claimed the sheet says what is stored, matching "a few optional
  details about yourself". That wording had been REPLACED, and the comment above
  the new sentence quotes it to explain why. The whole paragraph could have been
  deleted with the assertion still green. It now names the sentence that ships,
  and asserts the old one gone through `stripComments`.
* **FilterBar** claimed "the sort still says it is not a filter". That sentence
  is a comment in FilterBar explaining the layout. No reader has ever seen it.
  It is now the structural claim the comment was describing: no sort control is
  drawn above the count.

### One caller/callee pin became a relationship

`fetchExactDurations` had its whole parameter list and whole argument list
pinned character for character, which is a transcript rather than a rule.
It now looks the trip date's slot up and asserts the caller fills THAT slot with
the arrival date. Proven three ways: red when the argument is dropped, red when
two arguments are swapped, green through a consistent rename.

That is the pattern for the rest of the 177 call-shape pins when somebody gets
to them. **The count is not the point.** Around thirty assertions broke on
correct code today and every one was pinned to a file name, a literal or a call
shape.

**9,663 passed, 0 failed. Build clean at 1,602.23 kB, and the bundle hash is
unchanged, which is the proof that none of this touched `src/`.**

Changed tonight: `tests/run.mjs`, `tests/tdz.mjs`, `tests/comment-audit.mjs` (new).

### And the Travelpayouts tag came out

He did not know what Emerald was, which is the best argument for deleting it.
It is Travelpayouts' automated monetiser: a script that reads your pages,
converts text into affiliate links, adds in-text tooltips and drops
recommendation boxes for hotels and tours that IT picks. Their own help centre
says a publisher cannot choose which brands it uses or cap how many links it
adds. On a site whose privacy policy promises nothing is ranked higher because
it pays, that is not a setting to leave on, it is a product to not have.

The tag was only ever there to pass their site check, and the Tiqets deep-link
template in `src/config.js` is issued, which does not happen before approval.
So `index.html` is back to one script, the app's own module entry.

An assertion now holds it there: `index.html` loads exactly one script, it is
`/src/main.jsx`, and nothing is inlined into the head. Counted as TAGS rather
than as a hostname, because the comment recording the deletion quotes the URL it
deleted, and a scan for the host would find the note and call it the script.
That is the same trap as everything above it.

---

## 23 August, evening: the legal pages, version 2.1

He sent four screenshots of Termly's generated Terms of Service and said "I want
you to adopt this language into the privacy and terms of use." Asked which he
meant, the clauses or the voice, he answered: **"The formal language. Your setup
is fine. But your language is too informal."**

So the structure stands and the register moves.

### What was taken from the template, and what was refused

The existing terms already covered all four screens, and covered them for the
right country: clause 8.1.2 claims the *sui generis* database right rather than
asking politely, 7.2 spells out that a reader may print a guide and send it to
the people travelling with them, and 7.4 preserves quotation, which the template
quietly removes.

**Three prohibitions were genuinely missing** and are now clauses 8.1.8 to
8.1.10: using what the Service knows to harass somebody, fishing for another
user's credentials, and filing a report of abuse the sender knows to be false.
The old catch-all moved to 8.1.11 so the three sit in front of it. Clause 4.4 is
new and states that the Service is offered from Denmark and that access from
elsewhere is on the visitor's own initiative.

**Two were refused, and the refusals are now under test as absences**, because
the failure mode is somebody pasting the template back in a year with no memory
of why it was cut:

* *"We are the owner or the licensee of all intellectual property rights in our
  Services, including all... photographs."* Clause 10.5 says the opposite and is
  correct. The photographs come from Wikimedia Commons and belong to their
  photographers. Claiming them would be a false statement on a public page and a
  breach of the licences this product attributes under.
* *"Disparage, tarnish, or otherwise harm, **in our opinion**, us and/or the
  Services."* A term making the trader the sole judge is the textbook entry in
  the annex to Directive 93/13/EEC, so it does not bind a consumer here, and a
  product whose promise is honest assessment cannot coherently forbid being
  assessed honestly.

### The privacy policy was the informal one

The terms were already in legal register. The privacy policy was not: "Gemlyx is
run by one person in Denmark", "A nickname is fine", "treat it like a door key
rather than a password". All seventeen sections are restated in the register of
the terms, with every fact, GDPR citation, table and retention period unchanged.

**One thing to know about this change.** GDPR Article 12(1) requires a privacy
notice to use "clear and plain language". Plainness there is a legal requirement
rather than a style, so the register was raised to formal and precise without
being made impenetrable. A contract has no such constraint, which is why the
terms can go further than the notice.

**And it caught a stale fact.** The required field was still described as "Name
or nickname" with "A nickname is fine" beside it, and that label was removed
from the signup form the same morning. It now reads "Name".

### Version numbers moved with it

Both pages are version 2.1, in force from 23 August 2026, and `TERMS_VERSION` in
`src/utils/profile.js` moved to `"2.1"` with them. New signups stamp 2.1;
existing accounts keep the 2.0 stamp, which is the accurate record.

Clause 21.3 requires 30 days' notice for an amendment that materially affects a
user's obligations. The version history states expressly that 2.1 imposes no
obligation clause 8.1 did not already impose, which is the basis on which it
takes effect immediately. **If he disagrees about the false-report clause, that
one should go out with notice instead.**

### Four assertions were pinned to sentences this rewrite changed

All four were the shape from this morning. Each is now a rule:

* `/In force from 22 August 2026/` became: the header version and date must match
  what the page's own version history says about that version, and the header
  must carry the newest version the page names.
* `Registration asks for ${WORD[n]} things you must give` became: read whatever
  number word the registration section states and compare it to
  `REQUIRED_PROFILE` plus the email address and the password.
* `carry no partner code at the moment and earn Gemlyx nothing` became: wherever
  the page names Booking.com and Ticketmaster together, the same sentence says
  they carry no code and earn nothing.
* `/What Gemlyx notices about you/` became: section 4 is identified by the rules
  it states, not by its heading.

**And the numbering is now checked.** Renumbering 8.1.8 to 8.1.11 by hand is
exactly the edit that skips a number, and nothing about the rendered page would
look wrong. Every clause number in terms.html must follow the one before it
within its parent, with no gaps and no repeats.

**9,686 passed, 0 failed. Build clean.** Deleting 8.1.9, pasting the
disparagement ban back, claiming the photographs, and saying four required items
where the code says five were each mutation-tested and each goes red.

---

## 23 August, night: his father could not be understood in Danish

Six photographs of a Danish conversation that planned a whole week from Faxe and
never once offered the button. Oliver: "As you can see, it still doesn't work.
Also, it's being made in akward Danish." And then: "It's my dad that wrote with
it btw." The same person as 22 August, and largely the same failure.

**The transcript replayed through `readBrief`, before any of this:**

    known   : days, interests
    missing : origin, when, party, transport, stay

He had written **"jeg rejser fra Faxe by"**, **"jeg kører i bil"** and **"jeg
rejser i dag"**, each one directly under the question that asked for it. Three
answers. The app heard none of them.

### Four places had to learn the language, not one

* **`ANSWER_FILLER` in tripEvents** decides whether a turn is an ANSWER about a
  date or a sentence that merely contains one. It allowed "jeg" and not
  "rejser", so "jeg rejser i dag" was discarded while a bare "i dag" was kept.
  Measured both ways before touching it.
* **`ORIGIN_RE`** knew fly, land, arrive, come, start, drive.
* **`TRANSPORT_RE`** knew by, on, in, with, plus an English vehicle.
* **`travelModeKey` in routeOrder**, and this is the expensive one. The
  transport slot only fills when it returns a key, so teaching `TRANSPORT_RE`
  Danish changed nothing on its own. It also sets `modeReachKm`, so an
  unrecognised mode means no distance ceiling: a Danish cyclist was being
  offered the whole country.

The vocabulary lives in `travellerWords.js` with the rest, so a seventh language
is a list entry. `TRAVEL_VERBS`, `FROM_WORDS`, `TRANSPORT_PREPS`,
`VEHICLE_WORDS`, `TRANSPORT_VERBS`, `PUBLIC_TRANSPORT`. **The definite forms are
not optional**: Danish glues the article on, so a list with `bil` and not
`bilen`, `tog` and not `toget`, reads "med toget" as no answer at all.

After: `origin, days, when, interests, transport` all read, and the only things
missing are `party` and `stay`, which he genuinely never said.

### And the button was unreachable by arithmetic

`brief.ready` needs seven slots and two of them are HARD. With three readers
deaf, it could never be true, so `App.jsx` stripped the model's ready marker on
every single turn. **"Den er klar." is what was left of the sentence after the
strip.** Three faults on top of that one, all now fixed:

* **The strip could veto and could never grant.** The button rested entirely on
  a model emitting an ASCII token while composing Danish. It writes "Den er
  klar." instead, which is the exact paraphrase the English instruction names
  and forbids. `brief.ready` now latches the button on its own.
* **The gate read the last assistant message and nothing else**, so the turn
  after a ready reply took the button away again and nothing brought it back.
  His screenshots four and five are that, in order. Readiness latches now.
* **The refusal spoke English.** `buildBlockedNote` had one English sentence for
  every language. It takes the reader's language and has `askDa` for every
  blocking slot.

### The Danish itself, prompted in Danish

Oliver, via Gemini: "you should prompt the Danish language in Danish. If that is
possible?" It is, and it is right. An instruction ABOUT Danish written IN English
is the exact fault the block itself warns about one paragraph later.

`nativeBlock` in `readerLanguage.js`, **Danish only and deliberately so**: a
native block is worth having only if somebody can read it, and Danish is the one
language in this repo its owner can check. Six machine-written blocks in
languages nobody here reads is how the awkward Danish arrived.

What the photographs actually showed was not stiffness:

* **"Hvornår rejser JEG af sted"** and **"skal JEG køre i bil"**. Gemlyx asking
  about its own holiday, in the two questions the intake depends on. Nothing in
  the English block forbade it, because in English "I" and "you" are hard to
  confuse and the rule never needed writing down.
* **"det ligger lige i JERES rejseperiode"** and **"400-600 DKK per person"**.
  He travels alone and said so by never saying otherwise. Danish forces a choice
  between du and I that English does not, and the model guessed plural.
* **"weekenderne er markant mere fyldte omgivelser det ellers er der de fleste
  ture ligger"**. Not a sentence in any language.

All three are named in the block, in Danish, in the words they went wrong in.
The chat variant restates the marker rule ("MARKØREN ER EN KODE, IKKE EN
SÆTNING") and names both paraphrases it produced. The guide variant restates the
JSON keys instead, because a translated key does not read badly, it stops the
guide loading.

**9,763 passed, 0 failed. Build clean at 1,608.70 kB.** His father's six turns
are now a test, and so are the sentences that must NOT fill a slot: "hvor lang
tid tager toget til Odense?", "det kommer i august", "we have no car", "walking
distance to the harbour". `kommer` is deliberately absent from the Danish
arrival verbs, and that check is behavioural, because the list contains
"ankommer", which contains "kommer", so a source scan for the word says the
opposite of the truth. It failed that way on its first run.

---

## 23 August, late night: a picture of what it just named

Oliver: "when Ribe is mentioned, show a picture of it as well. Make it distinct
from other AIs."

**What is distinct is the refusal, not the picture.** Any assistant can search
the web for a place name and show whatever comes back: a stock photograph of
somewhere that may or may not be the place, with no licence anybody checked and
nothing behind it. `utils/chatPlaces.js` shows a photograph **only** where
Gemlyx holds a published entry, which means a person fact-checked it, the
licence cleared `api/commons-photo`, and there is a page behind the image that
opens. A name with no entry gets nothing, and that silence is the honest signal.

Nothing here is a new mechanism. `mentionsPlace` is the boundary-safe matcher
the preview screen has used since 18 August, so "Als" does not match half of
"alsidige". `guideHero` already reads `photo` and `__photoCredit` off a
published row and skips craft, because a product shot is not a picture of
somewhere you can stand. Cards render after the typewriter finishes, not during,
so nothing moves under a sentence somebody is reading.

**The licence is not optional.** `imageCredits.js` states it: CC BY and CC BY-SA
make attribution mandatory and it has to sit near the work. A 124px card is near
the work, so the credit renders on the card, and a photo whose licence demands a
credit with no photographer known **is not shown at all**. The credit wraps
rather than truncating, because an ellipsis through "CC BY-SA 3.0" leaves an
attribution naming the photographer and not the licence.

### And the rejection reader was English too

Wiring this up found it: **"vi holder os væk fra Copenhagen denne gang"** named
Copenhagen and read as a recommendation. That is the 15 August preview bug in a
second language, and the cost had gone up: it used to put a wrong row on a list,
and it would now have put a **photograph of the one city a traveller asked to
leave** into the conversation.

`REJECT_BEFORE` and `REJECT_AFTER` now carry Danish, German and Dutch. Note that
`foundAt` folds the text first, so `væk` arrives as `vaek`: both spellings are
listed, and the first version failed for exactly that reason.

**A new rule for the verb that comes apart around the name.** "vi springer
Copenhagen over" is how Danish, German and Dutch say "we are skipping
Copenhagen": the verb splits and the particle lands on the far side. Neither
window sees a refusal alone. `SPLIT_VERB_BEFORE` and `SPLIT_PARTICLE_AFTER` must
BOTH match, which is what keeps "Copenhagen over to dage" and "du springer i
vandet ved Ribe" out of it.

### The eighth time today

The assertion that the credit must not truncate read the card component's raw
source for the word "ellipsis", and the comment inside that very block explains
why an ellipsis through a licence is a problem. It failed on correct code. Fixed
with `stripComments`, which was written this morning for this exact shape.

**9,792 passed, 0 failed. Build clean at 1,612.18 kB.**

### Emoji, while we were here

He asked whether the phone emoji can be used. **They already are.** Gemlyx ships
no emoji font, so every device draws them with its own: Apple's on an iPhone,
Google's on Android, Microsoft's Segoe on his Windows laptop. That is why the
ones in his screenshots look flatter than the ones on his phone. Measured in
Chromium rather than assumed: naming an emoji font in the stack changed nothing,
because the browser falls through to the platform set on its own.

Shipping one set for every platform is possible through Noto Color Emoji on
Google Fonts, which the CSP already allows. Apple's set cannot be shipped, it is
licensed to Apple platforms. Left native, and the reason is written here.

---

## 23 August, last: the voice landed, and an example that refuses to be invented

### He picked a rule, not a column

After reading three registers turn by turn: *"I think it's fine to mix all the
emojis depending on the tone... like 'aight, we not going Copenhagen then
(laughing emoji)'.. 'I think this is a good idea (happy emoji)' 'And when are you
travelling? (casual smiling emoji)' like that! Obviously not emoji on every
sentence but."*

That is better than any of the three columns, because it is **not a count**. A
face is chosen to match the feeling in the sentence it ends, and a sentence with
no feeling in it gets none.

**It replaced the opposite instruction.** The chat prompt had been saying "a few
fitting emojis are welcome ... like a 🚲 next to a bike tip or a 🌊 for a coastal
stop", which is the pictogram register he does not want, and is exactly where the
🚗 in his father's transcript came from. That clause is now the counter-example
rather than the rule: a pictogram labels the content and makes a reply look like
an interface.

**Four places never get one**, in both the English prompt and the Danish block:
beside a price, in an error or a refusal, beside anything stated as checked
(opening hours, ferry times, ticket status), and anywhere in the guide document.
A face beside a price reads as apology or as selling; a face beside a verified
fact makes it look breezy.

`AI_TELL_PHRASES` is untouched, and the assertions say so. Faces were never what
that list was about, and relaxing it was the cost of the register he did not pick.

### The example guide is built and empty on purpose

*"can we make an example of the guide somewhere? So people can see what Gemlyx
will create them?"*

`src/data/exampleGuide.js` holds `EXAMPLE_GUIDE = null`, and while it does, **the
route does not exist and nothing links to it**. `/example` is an ordinary 404
rather than a title over an empty page.

**Nothing in that file was written by hand and nothing in it ever should be.**
Every other sentence on this site is checked against the place's own sources
before it is printed, and terms.html clause 10.3 says what is protected is "the
selection, verification and arrangement" of facts. An invented example would be
the one page making that untrue, on the page whose whole job is showing a
stranger what Gemlyx is like. **This is the one thing in this session that only
Oliver can supply**: a real guide, built on the live site and fact-checked like a
published entry, pasted in.

The mechanism around it is done:

* `exampleGuideProblems` checks the shape, so a paste that lost half a day fails
  on `node tests/run.mjs` rather than on the site. Mutation-tested both ways: a
  whole guide keeps the suite green and switches the route and the link on; a day
  with no stops turns it red.
* The route and the landing link are gated on the **same** call, `hasExampleGuide()`,
  and an assertion counts the gates, because two gates that could disagree are a
  link to a 404 or a page nothing reaches.
* Nothing writes `/example` by hand; both sites read `EXAMPLE_GUIDE_PATH`.

Filling instructions are in the file header, in the same style as the Studio
paste blocks.

**9,828 passed, 0 failed. Build clean.**

---

## 23 August: "Ticketmaster approved me!!!!"

Ten days after "let's finish the ticketmaster affiliate", and the mail finally
worked.

### Five assertions failed on the good news

Switching the template on turned the suite red, and every one of the five was a
test of the STATE rather than of a rule: "nothing is active until he pastes the
template", "a Ticketmaster link is passed through untouched", "the disclosure
says nothing", "the template ships empty", and the privacy page's claim that
Ticketmaster earns nothing.

Each was true the day it was written and false the day he succeeded. **A suite
that fails on success is a suite somebody deletes on success**, so all five are
now rules that hold on both sides of approval:

* the wrapping and the disclosure appear **exactly when** the programme is
  active, which is red if a link is wrapped while inactive and red if a link is
  left bare while active;
* the privacy page and `config.js` must **agree** about which partners pay, with
  the paragraph split at its own non-paying clause and each partner checked to be
  on the side its config puts it.

That last one has a trap worth remembering: split on `". "` and not on `"."`,
because **"Booking.com" contains a full stop**. The first version cut the
sentence in half inside the partner's own name and then reported that the page
said nothing clear about Booking.com, which was the assertion being wrong about
the page rather than the page being wrong.

### What Impact actually handed him was not a template

```
https://ticketmaster.evyy.net/c/7614922/264167/4272?u=https%3A%2F%2Fwww.ticketmaster.com%3Firgwc%3D1...
```

Decoded, the `u=` already held a destination, and the destination was
**`https://www.ticketmaster.com`, the front page**, with Impact's own macros
(`{clickid}`, `{irpid}`, `{ircid}`) filled in server side on the redirect. It is
the generic homepage link, not a deep link.

**Pasting it verbatim would have sent every reader who tapped a ticket button to
Ticketmaster's home page instead of the event they were reading about, while
still paying, and nothing on the page would have looked wrong.** The new
assertion catches exactly that: a template with no `{url}` fails the suite. It
was written an hour before the link arrived and it fired on the real thing.

The tracking half is kept, the destination half is the placeholder:

```js
export const TICKETMASTER_AFFILIATE_TEMPLATE =
  "https://ticketmaster.evyy.net/c/7614922/264167/4272?u={url}";
```

Verified end to end: a `ticketmaster.dk` event wraps and still lands on that
event, `livenation.dk` wraps, `billetlugen.dk` is untouched, the reader label
reads Ticketmaster and the disclosure fires.

### Two things only a click can settle

1. **The generic link pointed at .com and his readers buy on .dk.** Danish events
   live on ticketmaster.dk, and `TICKETMASTER_HOSTS` wraps .dk, .com, .eu and
   livenation. If the programme covers only the US storefront, a wrapped .dk link
   earns nothing **and** adds a redirect for no reason, which is a cost to a
   reader with no benefit to anybody. Check the covered domains in Impact and cut
   .dk out of the host list if it is not among them.
2. **Deep linking has to be clicked once.** Open a real Danish event on the live
   site and tap the ticket button. The event page means this works. The front
   page means the programme does not allow an arbitrary `u=`, and the ticket
   buttons should go back to being plain links.

Both are written into `config.js` above the constant.

**privacy.html is version 2.2**, in force 23 August 2026: section 13 names
Ticketmaster alongside Tiqets as a partner that pays. Nothing about what is
collected changed, and the version note says so.

**9,829 passed, 0 failed. Build clean.**

---

## 23 August, after the approval: "There is no links on any of my events though"

He was right, and the reason was worse than a missing field.

### `ticketUrl` was written by nothing

Three occurrences in the entire app, and no producer among them:

```
src/components/DetailPage.jsx:819   const dest = String(item.ticketUrl || "").trim();   // read
src/utils/studioContent.js:478      if (isTiqetsProductUrl(t?.ticketUrl)) ...            // filtered
```

**The Tickets button was unreachable on every entry ever published.** Not empty
on some. Unreachable, always, by construction.

And the one gate that existed accepted a Tiqets product page and nothing else,
so the affiliate approved an hour earlier had no field to live in.

**`ticketLink.js` was dead in the same way.** `pickTicketUrl`, `ticketQuery`,
`ticketMatches` and `describeTicketSearch` were called from nowhere in `src/` or
`api/`, with 21 assertions covering a module nothing ran. **Eighth helper in this
codebase written, tested and left unwired.**

### Two producers, and both were already holding the answer

1. **`__ticket.url`.** `stampTicketSource` has stored the Ticketmaster listing
   for the exact event since 13 August, on a strong match only. Until tonight
   the only thing that read it was a findings message telling him to open it by
   hand. It is now the ticket link.
2. **`pickTicketUrl` over `pagesByUrl`**, every page the draft run already
   fetched, so a Tiqets product page or a Ticketmaster event the API never
   matched still becomes a link. **No extra API call**: these pages are re-read,
   not re-fetched, and the page's own text is the corroboration, which is a far
   stronger signal than a URL slug.

Strong-match-only on the first is the guard that keeps a Tickets button off the
wrong edition of a festival. The picker still returns null rather than a best
guess, which is the rule that file states about itself.

**The stored value is the plain listing.** Tracking is added at render from
`config.js`, which is the rule the Tiqets field already followed and the reason
his approval needed no database migration.

### The gate learned Ticketmaster and kept its refusals

`isBookableTicketUrl` is the one question everything downstream asks now. It
takes a Tiqets product page and a Ticketmaster or Live Nation event page, and
refuses the front page, a search, an artist page and a category listing.

**The front page refusal is not hypothetical.** The generic Impact link he was
given pointed at exactly that.

### And nothing can render a paid link without disclosing it

*"remember to make an affiliate section!!!! ... Otherwise I'm fked."*

He is not. Terms clause 14 has covered this in four sub-clauses since 13 August,
privacy section 13 says the same in plain language, and the per-link sentence
renders under the button. What changed tonight is that `ticketDisclosure()` is
gated on the template being set, so before he pasted it, **it returned an empty
string for every Ticketmaster link**. The sentence was written, tested, and had
never once rendered.

The risk was never the wording. It is a future edit that wraps a link and
forgets the sentence. So it is now asked structurally across every render file:
any file calling `ticketmasterUrl`, `tiqetsUrl`, `bookingUrl` or `carRentalUrl`
must also compute the matching disclosure **and print it**, because "computed and
never rendered" is a bug this codebase has already had once. Mutation-tested by
adding a new component that wraps a link with no disclosure: caught by name.

**9,873 passed, 0 failed. Build clean.**

---

## 23 August: "Køge Festuge and Copenhell without affiliate links"

*"is it possible to put in affiliate links on these? Like automatically enable
affiliate links if I am affiliated to the place. So if I redraft Køge festuge,
then the affiliate link will come with it."*

Two answers, and the better one does not involve redrafting either of them.

### They may already carry the listing

`stampTicketSource` has written `__ticket.url` onto the payload since 13 August
whenever the Ticketmaster match was STRONG, and **`shapeForLive` keeps it on the
live row** (line 305). So the Ticketmaster listing for an event drafted weeks
ago is already sitting in Supabase, and nothing had ever read it on the page.

DetailPage now falls back to it when `ticketUrl` is empty. A hand-corrected
`ticketUrl` still wins, and the fallback goes through the same refusals, so a
front page or a search never becomes a button. **If Copenhell got a strong match
when it was drafted, its Tickets button appears with no republish at all.**

If it did not, a redraft now fills the field through the chain built earlier
tonight.

### One door for every outbound link

This is the better half of what he asked for. There were four wrappers applied
by hand at whichever render site somebody remembered. There is now one:

```js
affiliateHref(url)   // tracked URL if a programme covers that host, else the link unchanged
affiliateNote(url)   // the sentence that must go under it, empty when nothing is earned
isAffiliateHref(url) // whether rel="sponsored nofollow" is required
```

**Every wrapper it composes is gated on a template read at RENDER.** So the day a
programme is approved, every entry ever published starts earning through it with
no migration, no republish and no redraft, and the day one ends they all go
quietly back to being ordinary links. That is the property the Tiqets field
already had and nothing else did, and it is exactly the "automatically enable
affiliate links if I am affiliated" he described.

A festival's own site is not a partner link: `copenhell.dk` passes through
untouched and says nothing, which is the honest answer and the common case.

### The invariant that makes the door safe

Asserted as a property over the whole matrix rather than case by case, because
the failure that costs a programme is one link somewhere that got wrapped and
said nothing:

* nothing comes out tracked without a sentence to put under it;
* nothing claims a commission on a link that earns none.

Mutation-tested by removing Ticketmaster from `affiliateNote`: three URLs named
in the failure. And by deleting the no-redraft fallback: caught by name.

Six assertions moved because they pinned the old per-agent wrapping by function
name. The branch did not disappear, it moved inside `affiliateHref` so every
render site gets it instead of one.

**9,888 passed, 0 failed. Build clean.**

---

## Phase: reading his own live guide (`/guide/4c1vzfmge00`)

He sent the link with "eh.. you might wanna take a look at this..". Nine
problems came out of reading it. Two are fixed here; the rest are listed at the
bottom of this section with what each one actually is, because several of them
need a fact from him and not a code change.

### Fix 1: a car leg shorter than a walk is a walk

The guide gave "5 mins by car", "12 mins by car" and "15 mins by car" for legs
inside central Copenhagen, on the same page whose own essentials paragraph told
the reader **"lad bilen stå: parkering er dyrt og svært"**. The guide was
arguing with itself.

`resolveLegMode` in `src/utils/guideEnrichment.js` had had the demote-to-walking
rule on the transit branch since the Ærøskøbing pass, where a bus for 400 m was
the visible nonsense. Driving never got the same rule, so nothing stopped a car
from being suggested for a distance a person covers faster on foot.

```js
else if (mode === "driving" && distKm <= WALK_MAX_KM && !isFerryText(how)) mode = "walking";
```

The ferry guard matters and is not decoration: a short hop across water is a
short distance and a car is the only way to make it. Without `isFerryText` the
rule would have told an Ærø reader to walk onto the Baltic.

### Fix 2: three hundred and fifty metres is not the same place

The guide printed **"Same place, nothing to travel"** between Design Museum
Denmark and Amalienborg. They are both on Bredgade and they are 350 m apart,
which is a five minute walk past three other things worth looking at.

`SAME_SPOT_KM` was `0.3`. It is now `0.12`, which is roughly a building and its
own forecourt, and which leaves the real same-place cases (two entrances to one
site, a museum and its café) still collapsing.

The assertion that pinned `0.3` broke, correctly, on a correct change. It was
pinning the number rather than the behaviour, so it has been rewritten as a
rule: the threshold must sit between 50 m and 150 m, and must be under a quarter
of `WALK_MAX_KM` so that "same place" can never swallow a leg the guide would
otherwise describe as a walk. The Design Museum/Amalienborg pair is now a named
case in the suite, with its real coordinates, so the specific thing he saw on
his own screen cannot come back.

### Still open from that guide, and what each one needs

1. **Møns Klint and Fanefjord Kirke have no coordinates.** The numbering falls
   back to letters, so his guide has stops "M" and "F" sitting among 1, 2, 3.
   That is a geocode gap in the data, not a layout bug.
2. **Rundetaarn's description is the single word "Bygget".** A truncation
   upstream of the render.
3. **Summer copy on a November trip**, in two places. Date-blind text.
4. **Rundetaarn "Free to enter"** needs his fact-check. It is not free.
5. **The inverted weather sentence.**
6. **~150 hardcoded English strings** in the guide surface, which is why his
   father's Danish guide still contains English furniture.
7. **The route line omits the return leg.**

**9,891 passed, 0 failed. Build clean.**

---

## Phase: the fifty point review, Layla, and a developer note on the live site

He brought back a fifty point product review from ChatGPT, addressed to Claude,
closing by asking which points were already built. Every one was checked against
the source rather than the live site.

**Seventeen already built and reaching people. Twenty-three part built. Seven
absent. One absent on purpose.** The reviewer could only see the surface, so a
large share of its "should eventually" items exist in code: the event relevance
score, the mode-aware reach ceiling, the accommodation writer, the honesty
notices, the transparency machinery, the edge prerendering for crawlers.

The finding it could not have guessed at is the tenth and eleventh instance of
this project's signature failure. Five pieces of finished, tested code with no
caller, listed at the top of `HANDOFF_NEXT.md`. The one that matters most is
`shutOnVisit`, which answers whether a place is closed on the day the guide
scheduled it, and which nothing calls.

The second finding worth recording: **`profileForPrompt` never reaches the guide
build prompt.** It reaches the chat and Ask Gemlyx, and the comment beside the
Ask Gemlyx call claims it hands the guide writer the same two blocks. It hands
it neither. Everything a returning traveller has told Gemlyx about themselves is
absent at the moment their trip is written. That is the same shape as the ticket
links: a comment asserting a wiring that was never made.

### A developer note was rendering on the live site

`WeatherStrip.jsx` printed, on failure, an instruction to check that
`/api/weather.js` was deployed with a working User-Agent. To travellers. On the
Essentials page and in the header strip.

It now says the forecast could not be loaded, that this is our end rather than a
quiet spell, and points at DMI or Yr. The wording is deliberate and follows the
rule the rest of the app already keeps: a failed request is not a fact about the
world, and a reader must never be able to read "no forecast" as "no weather
worth reporting". `ReviewsSection` keeps the same rule about a failed reviews
read, in the same words.

The assertion is a rule rather than a string, because one string is what this
codebase keeps catching one at a time. **No `.jsx` file may contain a path of
the shape `/api/<name>.js` once comments are stripped**, because a component
fetches the extensionless route and never needs the filename, so such a path is
always either a leaked developer note or a fetch that would 404.

Comments stripped first, in both directions, deliberately: the fix's own comment
quoted the old string, so a raw scan would have stayed green on a file that had
never been fixed. Ninth time.

Mutation tested by restoring the old string: five assertions named it.

**9,898 passed, 0 failed. Build clean.**
