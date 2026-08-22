# Handoff, 22 August 2026

Written overnight while Oliver slept, after he said "break the rule. Opus is
allowed. Do all the things you feel is worth, then go through a search of bugs
and things you might have messed up in the coding, and end it with a handoff."

**Nothing is committed to git.** He commits himself. He pushed his own copy at
around 04:00, so anything below that is not in that push is on disk only.

Suite: **9068 assertions, all green**. `tests/tdz.mjs` clean. `npx vite build`
clean. Every new assertion in this document was mutation checked: the fix was
reverted and the assertion confirmed to go red. Where a mutant survived and the
code was genuinely equivalent, that is written down in the file itself rather
than papered over.

---

## Read this part first

Three things I shipped on 21 August were **worse than the bugs they replaced**,
and an adversarial review found them a few hours later. They are fixed, but the
pattern is the thing to carry forward, because it happened three times in one
day:

1. **The measured overnight leg printed "About 156 km to Aarhus, 3h 5m on a
   bike."** That is a train timetable with a bicycle's name on it, and it is
   worse than the "roughly 15 hours on a bike" it replaced, because a reader
   cannot tell it came from a measurement. Cause: `measured.modeUsed || key`
   fell back to the mode the traveller ASKED for, and Google does not echo
   `modeUsed` on the ordinary path.

2. **`withoutStump` amputated the subject of ordinary sentences.** It searched
   for the first comma in the sentence rather than the seam where the claim was
   cut out. "The two areas worth paying for are, in order, Indre By and Nyhavn,
   with easy day trips from Copenhagen" became "In order, Indre By and Nyhavn."
   Silently rewriting sentences that were never broken is worse than the fragment
   it was fixing.

3. **The profile learning wrote a blank profile over a real one.** `saveProfile`
   replaces the whole jsonb column, and the write ran with `userProfile` still
   null on two reachable paths. One flaky load, one guide built, and somebody's
   name, date of birth, gender, country, interests and description were gone from
   the server and every device, inside a catch that showed them nothing.

The shape all three share: **a fix that changes what a reader is told, tested
only against the case it was written for.** The suite was green for all three.

---

## What changed tonight

### The fifteen hour bicycle ride
`src/utils/routeOrder.js`, `src/pages/GuidePage.jsx`, `src/App.jsx`

Guide `scyek6rypzn` told a reader to cycle 156 km across the Great Belt, over a
bridge where **bicycles are banned**, while three other places on the same page
correctly said three hours by train. Four separate faults produced it:

- `fetchExactDurations` measured the cross-day leg only when the next day had
  exactly one stop. Every other overnight move fell through to a straight line
  divided by a fixed speed. The condition is gone; every cross-day pair is
  measured now, dated to its own day.
- The estimate had a **ninety minute floor**: `hours < 1.5` printed "under an
  hour and a half" for a six minute ride as well as for an eighty-nine minute
  one. `spokenDuration` replaces it and speaks minutes below the hour.
- **`beyondModeRange`** stops a duration being quoted for a leg longer than twice
  what the mode covers in a day. Deliberately a distance rule and not a bridge
  table: a bridge table goes stale silently and only ever covers the crossings
  somebody remembered. A bike stops at 120 km, so Aalborg to Skagen at 85 km is
  still a hard ride and the Great Belt is not a ride at all.
- **Two days in the same town are not a journey.** Three of that guide's seven
  overnight moves were "About 1 km to Copenhagen" between two Copenhagen days.
  `fromT` and `toT` were computed on adjacent lines and never compared.

The honesty note under the block now says which method was used, because saying
"straight line, not a measured route" under a measured route throws away
credibility the number earned.

### The profile learning, which had never worked
`src/utils/profile.js`, `src/utils/profileLearning.js`

`cleanProfile` returns an object literal of exactly the fields it names, and
`learned` was not one of them, so every observation was dropped on the way to
Supabase and dropped again on the way back. Since an observation must happen
twice before it counts, the only way to see the feature work at all was to build
two guides in one tab without reloading. Opening the profile sheet reset it.

`cleanLearned` moved into `profile.js` (profileLearning already imported from it,
so the other direction would have been a cycle) and `isBlank` excludes `learned`,
because an observation is by definition not something anybody told us.

### "These are," and the skipped stop numbers
`src/utils/accommodation.js`, `src/pages/GuidePage.jsx`

The fragment at the top of a Where to stay box, and the stop numbers that ran
1, 2, 3, 4, 5, _blank_, 7. Both were single faults with a single cause: a word
count that asked how MUCH was left rather than whether it was a sentence, and a
number badge that lived in only one branch of a ternary while the map's caption
promised every stop below was numbered.

### Twenty-six defects in my own last two days

Found by two independent adversarial reviews. The ones worth knowing about:

- The three at the top of this document.
- **`captureRedirectSession` hardcoded `recovery: false`** on the user-lookup
  failure path, so one flaky moment on mobile data turned a password reset into
  an ordinary sign in and burned a one-use link from a sender that allows two an
  hour.
- **A successful password reset was a dead end.** The sheet is held open by
  `recoverySession`, not `authOpen`, so finishing left the modal up; and nothing
  reset `authMode`, so the next opening from any door came back as "newpass",
  with no email field, no mode links, and a button calling `updatePassword(null)`.
- **The auth sheet kept the last person's email and password.** It is mounted
  permanently and the reset effect cleared five fields and left five. On a shared
  laptop that is person A's address in the field and A's password in the masked
  one for person B.
- **The resend cooldown ticked forever**, on a closed sheet, once a second, for
  the life of the page. Its own comment claimed the opposite.
- **`bandForYear` threw away the month and day** the whole date-of-birth change
  was made to collect, so somebody born on 31 December 2001 was banded as 25 on
  22 August 2026 when they are 24.
- **The caption dedupe keyed on the raw caption** while the page rendered the
  trimmed one, so two files differing only by the Flickr bot's tail both printed
  the same line. The exact fault the dedupe was written for, in the same file, on
  the same day.
- **`aspect-ratio: 4/3` with `object-fit: cover`** cropped every article figure
  into a landscape box, which loses about 44% of a 2:3 event poster. Oliver has
  already made exactly that complaint once, about the guide's stop photos. Now
  `contain`: the box is still reserved, nothing is cut.

---

## What still needs Oliver, and only Oliver

**1. Email, and it is blocking everything.** Supabase's built-in sender only
delivers to addresses on your own project's organization, and is capped at two an
hour. Nobody but him can create an account today. `SETUP_EMAIL.md` has the whole
thing: turn Confirm email off to unblock testing in a minute, custom SMTP through
Resend before anyone real arrives.

**2. `gemlyx_ask_log`.** The SQL in `SETUP_ASK.md` has never been run, and since
21 August `api/ask.js` returns **503** rather than passing through when the count
cannot be read. Ask Gemlyx may be hard broken on the live site right now. Ten
second check: open a guide, ask something. Note the two CREATE TABLEs disagree,
and the one in the console warning is the wrong one.

**3. Stadia Maps.** Still unregistered, still serving 401 tiles on a guide a
reader has been given. Account action, not code. Worth knowing: the runtime
fallback cannot save you, because a 401 that renders as a JPEG is a successful
image load and `tileerror` never fires.

**4. The Google consent screen.** The provider is already enabled in Supabase
(`"google": true`, read live). What is missing is the published consent screen,
which needs the privacy policy and terms. `GOOGLE_SIGN_IN` in `src/config.js` is
one line when they exist.

---

## Still open, in the order I would take them

1. **The learning panel rule 4 asks for.** `profileLearning.js` says in its own
   words that somebody has to be able to see what Gemlyx thinks it has noticed
   and clear it. The observations now persist, so the rule is live and the UI
   still does not exist. `learnedIsEmpty` is exported and imported by nothing but
   the test harness, which is exactly the predicate such a panel needs.

2. **The event placed on the wrong day.** A chosen event whose dates do not match
   its day prints a warning and stays put, with the whole day built around it and
   the booking panel telling the reader to book it. A warning is not a resolution:
   it has to move the day or drop out with a sentence saying why.

3. **The Copenhagen Card price**, and a sweep of wherever else a specific figure
   is composed rather than read. 859 DKK for 48 hours, not 450.

4. **Roughly 150 hardcoded English strings.** The guide is written in the
   reader's language now, and the furniture around it is not: section headings,
   leg descriptions, the weather block, the booking panel. A Danish guide today is
   Danish prose in an English frame.

5. **The currency line is invisible signed out.** It reads `userProfile?.country`,
   which only exists for an account. Most readers never see it. Product decision,
   not a bug.

6. **The accommodation mismatch is detected and thrown away.** `stayTierMismatch`
   fires on Capsule Hotel Nyhavn63, and the result lands in `_planProblems`, which
   is stripped from every save and share as scaffolding.

7. **The "actually" sweep.** 130 in copy and strings, 3 in prompts.

---

## Things worth knowing before you change anything

**Mutation testing is not optional here.** Every assertion added tonight was
verified to go red when its fix was reverted. Four survived the first pass and
every one of them was a weakness in the assertion rather than a bad mutant: an
`indexOf` comparison that passes when the string is missing entirely (`-1` is
less than everything), a regex matching a call inside the comment that quoted it,
a count that says how many exist rather than where they are, and a test value
chosen inside the range the guard already rejected.

**`stripNonCode` exists for a reason.** These files quote the code they replaced
in their own comments, on purpose, so a plain regex asserting the old shape is
gone will match the documentation and pass forever.

**Two vocabularies meet in `routeOrder.js`.** The app says "bike", "car",
"public transport"; Google says "bicycling", "driving", "transit". A measured leg
carries Google's. `howWord` and `sameMode` are the only place they are allowed to
meet, and every bug in the measured-leg work came from somewhere else comparing
them directly.

**The recurring bug shape in this codebase is a check that answers a NEARBY
question.** "Is the script tag in the document" is not "is the embed library
ready". "Is this block an image" is not "is there prose left to wrap around".
"How many words survived" is not "is this a sentence". "Are the two points far
apart" is not "does the traveller change town". Every one of those shipped.
