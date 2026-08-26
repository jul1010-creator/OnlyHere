# Handoff — 26 August 2026, overnight

Suite **10,968 passed, 0 failed**. `npx vite build` clean. `tests/tdz.mjs` clean.
Everything below is written to `C:\Users\olive\...\OnlyHere\onlyhere-project` and
verified byte-identical. **Nothing is deployed.**

---

## THE HARNESS WAS PARTLY BLIND, AND HAD BEEN FOR A LONG TIME

Writing `whenever you're ready` into a JSX text node turned two unrelated
assertions red. The apostrophe looked like the start of a string literal, so
`stripNonCode` blanked everything to the next one.

**Measured: 73,513 characters — 1,574 lines of App.jsx — were invisible to every
source assertion in the suite.** 27 contractions already in the file
("Can't miss out", "Who's traveling", "You're on the list") had been doing this
for weeks.

The dangerous half is not the failure. **A blanked region makes a `!test(...)`
assertion PASS.** An unknown number of negative source checks were passing
vacuously.

The first fix demanded 27 pieces of user-facing English be rewritten. That is
the tail wagging the dog, so `scan` learned the difference instead: a real string
opener follows an operator, an opener, `=>`, an expression keyword, or nothing.
`you're` follows a letter.

Two things found while fixing it:

- **The fix reintroduced the O(n²) trap the file's own header warns about.**
  `out.join("").slice(-12)`, once per apostrophe, on 1.5 MB. 1,210 ms → 272 ms
  for byte-identical output across all 189 scanned files.
- **`=> '...'` was a hole in both versions.** `>` cannot go in the operator set
  because every JSX closing tag ends with one. There is no `=> '...'` in the
  codebase today, which is exactly why it needed pinning.

---

## AND MY OWN ASSERTIONS RAN AFTER THE SCOREBOARD

Twenty-five new assertions at the end of `tests/run.mjs`. The total stayed at
exactly 10,920. They ran, they incremented `passed`, and the number had already
been printed.

Same shape as the five things in HANDOFF_25AUG_NIGHT: **a limit hit is not a
limit reported** — this time inside the instrument that finds them. And silent in
the worse direction: a *failing* assertion down there still prints its FAIL line
at the bottom, so the suite exits 1 with a scoreboard reading `0 failed`.

There is now a guard. Its own first version searched for the scoreboard's text
with `stripNonCode`, which blanks template literals, found nothing, and passed —
the very failure it exists to catch, written into the catcher. It uses
`stripComments` now and asserts it found the line at all.

---

## T3: THE GUIDE CAME BACK IN DANISH, AGAIN

`/guide/ltpnhvjm333`. The brief says **"Neither of us has a word of Danish"** in
its first message, in English. The guide is Danish from the money paragraph to
the last stop note, with English weather blocks, English leg lines and English
section headings — the mixed case that is worse than either language alone.

**The bug is not in the prompt. It is in who decides.**

`guideLanguageBlock()` read `navigator.language` and nothing else. It contained
one sentence saying "write in the language the traveller used" and then appended
`nativeBlock`, which is fifteen hundred words written entirely in Danish, headed
`SKRIV DANSK SOM EN DANSKER`. A model given that writes Danish. `readerLanguage.js`
had already caught itself doing this once and fixed it by reordering sentences;
reordering was never going to hold against an entire manual in the wrong language.

So the decision moved out of the prompt and into code — **`src/utils/travellerLanguage.js`**:

1. A language the traveller said they cannot read is never used. Reads
   *"Neither of us has a word of Danish"* and *"One of us reads Danish, the other
   doesn't at all"* — the second bars Danish too, because a guide half the party
   cannot read has failed for that half, and English costs the Danish reader
   nothing.
2. Otherwise what they typed decides, in **both** directions: English brief on a
   Danish phone is English; Danish brief on an English phone is Danish, which is
   the half no reordering could ever have fixed.
3. Only then the browser tag, for the tick-box case and for every language
   nobody here can check. A German traveller's experience is unchanged.

**One value, three prompts.** The writer, the JSON repair and the per-day
enrichment each called the navigator separately. That is how the Limfjord guide
ended up Danish prose with English legs. Computed once now and passed down.

`guideLanguageBlock` is deleted rather than left unused. The wrapper *was* the
problem: it made "ask the device" the one-line answer and "ask the traveller" the
long one.

Also added: when a language is ruled out, the guide is told to **flag the steps
that still need it** — a phone number answered in Danish, an operator page with
no English version. That is the difference between a translated document and an
honest one.

---

## AND THE SAME GUIDE INVENTED A BUDGET

Three days told these travellers about **"din stramme dagsbudget"** — your tight
daily budget — and described **their own booked hotel as out of reach**. They had
written *"We eat well and we don't mind paying for it."*

Two faults in one sentence:

- `travellerBudget` had `don't mind the cost` and `don't mind spending` and not
  `don't mind PAYING`, which is how people say it. So `budgetSays` reached the
  accommodation prompt **empty**.
- `stayProblems` returns early when no budget was stated. **The one case where a
  writer invents is the one case nothing was watching.** The prompt still carried
  a paragraph explaining what a tight budget buys in Copenhagen, with nothing on
  the other side, and the model filled the gap with a claim about a person who
  had not spoken.

This is the shape you named on the Aalborg page: *"it doesn't actively write that
there is no annual festival. I assume it looks at the unconfirmed and just makes
it up from there?"* An absence reached a writer and came back as an assertion.

`budgetCharacterised` now flags a sentence that characterises their **means**
when they said nothing — in Danish as well as English. It deliberately does not
flag *"Your budget goes much further here than in Copenhagen"*, which an earlier
fix in that same file exists to produce. The suite caught that on the first run.

The enrichment prompt's empty-budget branch now says so out loud instead of
saying nothing.

---

## THE TWO YOU ASKED FOR LAST NIGHT

**Cards beside the chat, not under it.** The panel is 300px tall; a row of cards
under a reply pushes the reply out of it, so the illustration arrived by removing
what it illustrates. Both layouts are rendered and CSS shows exactly one — which
fits is a question about the viewport, and a media query answers it on every
resize for free. `utils/chatRail.js` owns both class names and the breakpoint so
they cannot drift apart in a 1.5 MB file.

The rail carries **one reply's worth**: the most recent that actually introduced
somewhere. A follow-up question leaves the last real one standing, because a
picture that vanishes while you type an answer is worse than no picture.

**"4/5 questions answered".** This reverses a call made in `briefPanel.js`, and
the old reasoning is quoted there rather than deleted: *"a ratio is the most
robotic possible way to describe how well somebody has been understood."* Both
are right about different things. A ratio **instead of** being understood is a
progress bar where a sentence should be; a ratio **beside** it answers the one
question the sentence cannot, which is whether you are nearly done.

Counted against `BLOCKING_SLOTS`, the same list `ready` is computed from, so
"7 of 7" and the build button cannot disagree. When one slot is left it is named
— *"6 of 7 — I still need whether a hotel is booked"* — because a count alone
tells somebody they are nearly there and not what to do about it.

`briefPanel.js` had **zero callers** for three days. That is this project's
signature bug and it is now wired.

---

## MUTATION TESTING

Twenty-two mutants applied and watched go red **by name**. Three findings from it:

1. **A headline assertion passed for the wrong reason.** *"A Danish browser does
   not override a brief that ruled Danish out"* survived deleting the ruled-out
   check entirely, because the Winter Light brief is in English and the branch
   underneath answered it. Added the case where the branches disagree: a Danish
   brief that asks for English.
2. **A sentence can name two languages.** *"Min mand forstår ikke dansk, så
   guiden skal være på engelsk"* — one negation, two languages, and the first
   rule barred both, including the one they had just asked for. The negation is
   now attributed to the nearest.
3. **Two equivalent mutants, both dead code, both removed rather than recorded.**
   An early return for an empty brief that the final fallback already answered,
   and a union with `brief.unanswered` in `briefProgress` — `unanswered` is built
   from slots that are *not* known, so it could never add a key the first filter
   had not already found. The rule was real and was being enforced twice.

---

## STILL OPEN

- **The guide's scoring against the eleven traps** is in the report, not here.
  T1, T2, T5-part, T9 and T11 pass. T3, T4, T6, T7, T10 fail. None of the fixes
  above are deployed, so a rebuild would still produce the same guide.
- `SUPPORT_TABLE.sql` still needs running.
- `evidence.js` still has no callers.
- The map numbers visits and the guide text numbers places, so tapping pin 6
  goes somewhere the text does not call 6.
- Day 10 of that guide shows `~6 hours 51 min by train/bus` on a driving trip
  whose own prose says three hours by car.
- `BOOKING_AFFILIATE_ID` is still empty and that guide carries **ten** unwrapped
  Booking.com links.
