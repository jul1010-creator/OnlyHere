# How Claude Sonnet writes here, and what would make it better

13 August 2026.

**First, a limit on this review, stated up front.** I could not read your
published prose. It renders client side out of Supabase, the middleware injects
meta tags only and only for crawlers, and this container's network will not let
a headless browser reach the site. So this is not a critique of the output. It
is a critique of **the brief**, which is the only real lever you have on how a
model writes, plus the voice enforcement that runs after it. If you paste two or
three live entries into the chat I will do the other half properly.

Everything below is verified against the files, not inferred.

---

## The finding that explains the most

`STUDIO_VOICE` says this, and it is right:

    NEVER USE THE EM DASH [U+2014] OR A DOUBLE HYPHEN (--) TO JOIN TWO CLAUSES, this
    is one of the single most recognizable AI-writing tells to a real reader,
    full stop, no exceptions.

**`studioPrompts.js` contains 111 em dashes.** Most of them join two clauses,
and several sit inside the example paragraphs the model is shown as a target.

A model mirrors the register of what it is told. You are handing it four
thousand words written in the exact construction you are banning, and then
asking it not to use that construction. That is not a rule, it is a temptation
with a warning label.

And then the loop closes in code. `stripDashes` rewrites a spaced dash as a
comma:

    "There is nowhere to sit [U+2014] this is a grab-and-go stop, not a café."
      becomes
    "There is nowhere to sit, this is a grab-and-go stop, not a café."

**That is a comma splice.** Every clause-joining em dash the model writes,
having learned the habit from the brief, is mechanically converted into one, and
nothing anywhere checks for comma splices. So the tell you care most about is
not removed. It is converted into a subtler tell, and the pipeline calls that a
pass.

Three things follow, in order of how cheap they are:

1. **Rewrite the 111 em dashes out of `studioPrompts.js` and `studioContent.js`.**
   Not for your own rule's sake, though it is that too. For what it teaches.
2. **Put the em dash in `scanForAITells`.** It is currently checked in
   `entryAudit.js` only. The two live-editing paths, `bodyEdit.js` on typed text
   and the studio draft scan, call `scanForAITells` directly and therefore never
   flag the tell the brief names as the most important one there is.
3. **Teach a replacement, not just a ban.** The brief offers "a period, a comma,
   a semicolon, or a plain connecting word" and leaves the choice open. A model
   with no guidance picks the comma every time.

## You have three genuinely good example paragraphs, and the file disclaims all of them

This is the largest missed lever in the codebase.

Few-shot examples are the strongest style control that exists. You have written
three good ones. The Silo Bakery paragraph is real editorial prose:

    Locals go for one thing: the rye sourdough, baked in a single batch each
    morning that sells out by 10am most weekdays.
    A loaf runs 45 DKK. That's standard bakery pricing here, not a discount and
    not a premium. Expect a real line by 9am on Saturdays.

That is the voice. And every example in the file is labelled:

    SHAPE-ONLY EXAMPLE            9 times
    not a prose quality bar       5 times
    apply the rules independently of how this reads

So in the one place the model is shown what good looks like, it is told the
target may be wrong.

**And the two disclaimers contradict each other.** The labels say the example is
a "structure and rhythm reference". `STUDIO_VOICE` says:

    the real example shown below for this content type demonstrates the LEVEL of
    specificity and rigor required, it is not a sentence-rhythm template to
    imitate

One says use it for rhythm. The other says do not use it for rhythm. A model
receiving both will use it for neither, which is what you are getting.

`STUDIO_VOICE` also says the example is **below** it. In all nine prompts the
example is **above**. The one sentence telling the model to take the example
seriously points the wrong way.

**Delete the disclaimers. Fix the em dashes inside the examples so they survive
`stripDashes`. Say plainly: write like this.** That change is free and I would
expect it to be the single biggest improvement available.

## The brief asks for four different voices

    a well-travelled local giving a friend the real, slightly blunt version of a
    place, closer to a good Reddit or Google review than a tourism board

    a premium travel editor's voice, never Wikipedia          (5 of 9 types)

    Does this read like a travel journalist rather than an AI

    assume the reader is not a native English speaker, would a 16-year-old
    understand every word

A blunt Reddit reviewer, a premium travel editor, a travel journalist and a
writer of B1 English are four different people. A model given four targets
lands on the average of them, and the average of those four is exactly the
flavourless middle you are trying to escape.

Two details that make the point sharper than it sounds:

- **"premium" is a banned word.** It is in `AI_TELL_PHRASES`. The brief names
  its own target voice with a word the entry may not contain.
- **"curated" is a banned word** and is required in eight of the nine field
  specs, as "ONE specific curated recommendation only Gemlyx would flag".

Pick one voice. My vote is the first one, because it is the only one that is
specific enough to write from and it is the one your best example actually
executes.

## The brief is 63 percent prohibition, and the prohibitions are the vivid part

Roughly 3,400 to 4,200 words of instruction ship on every draft call. For a
`nightTown` entry, 87 percent of that is shared boilerplate and 413 words are
about nightlife towns.

Of the craft instruction inside `STUDIO_VOICE`, prohibition outweighs
construction better than two to one. That is survivable on its own. What is not
survivable is **which half is written well.**

The accuracy rules are told as stories. A real confirmed error. A real
embarrassing error. A town four hours away guessed at ninety minutes. The ferry
timetable. The 988 town rights. They are memorable because they are narrative.

Nothing about good prose is told with that force. There is no story about an
entry that was accurate and dead on the page.

So the model weights fear over flair, because fear is what the brief dramatises.
The brief knows this and tries one sentence of inoculation: *"None of the rules
below exist to make you write flatter or more boring."* One sentence cannot
outweigh a hundred and eighty.

**The fix is not fewer accuracy rules.** It is one story on the other side. A
paragraph that was true and useless, next to the version that was true and
worth reading, with a line saying which one ships.

## The Reality Check rule is stated nine times

Not four to six, as your own 12 Aug audit estimated. For a `free` entry I count
nine restatements of the same instruction, plus the field spec repeated
byte for byte across four types.

Ten more rules are repeated verbatim across types: "a premium travel editor's
voice, never Wikipedia" five times, "do NOT write a separate Overview" four
times, the three-bullets spec five times, the curated-find sentence eight times,
the uncertainties sentence in all nine.

Repetition in a long prompt does not strengthen a rule. It dilutes every other
rule in the file, because attention is finite and you are spending it restating
things the model already agreed to. Moving the shared specs into one constant
would recover roughly two thousand words per call and make everything that
remains proportionally louder.

## What I would predict the prose does wrong

From the brief alone, five specific shapes. Check these against your live
entries and you will know quickly whether this review is worth anything:

1. **Openings that all match.** `food` and `foodStreet` mandate name, then
   landmark, then why locals go. Both examples execute it with the same verb:
   "Silo Bakery **sits** two doors down", "Reffen **sits** on a former shipyard
   peninsula". Both follow with "Locals go for...". Expect most food entries to
   open `[Name] sits [preposition] [landmark]` with "Locals go for" as sentence
   two.
2. **"Skip this if..."** opening most Reality Checks, because "who should skip
   this" is listed first in four types and first-listed options dominate.
3. **The "X, not Y" negative appositive**, about one per paragraph. The brief
   teaches it constantly: "a working medieval cathedral rather than a recreated
   one", "the actual medieval core, not a rebuilt tourist version", "a
   grab-and-go stop, not a café". It is a recognisable AI tell and it is in no
   ban list.
4. **Uniform sentence length.** The cadence rule asks for a sentence under five
   words next to a longer one. Across the examples, the sentence lengths run 12
   to 29 words and almost none are under five. The rule is stated and never
   demonstrated, and the "2 to 3 sentences MAXIMUM" caps leave no budget for a
   four-word sentence anyway.
5. **Filler the brief itself supplies.** The brief uses "genuinely" 42 times and
   "actually" 44 times while telling the model those are filler words to cut.
   The field labels then require them: "who this genuinely suits". Expect
   entries flagged by your own filler detector for using the words your own
   field names asked for.

## The tell scanner catches 2019 AI writing

`AI_TELL_PHRASES` is 86 entries and it is a good list of *vocabulary*: nestled,
vibrant, boasts, tapestry, delve, hidden gem. Modern model prose does not fail
on vocabulary. It fails on **shape**, and the scanner checks no shapes at all.

Not caught, in rough order of how often I would expect them:

    the em dash                    named by the brief as the worst tell
    ", making it ..."              the brief quotes this as its canonical
                                   generic sentence and never bans it
    "not X, but Y"                 taught by the examples
    rule-of-three lists            actively induced by the festival brief
    uniform sentence length        trivially measurable, measured nowhere
    comma splices                  manufactured by stripDashes

Nineteen things the brief bans in words are also missing from the scanner,
including some odd near misses: "must-visit" is caught, "must-see" is not.
"hidden gem" is caught, "hidden treasure" is not. "something for everyone" is
caught, "locals and tourists alike" is not, and that one is quoted twice in
`STUDIO_VOICE` as the canonical failure.

Two bugs in the scanner itself:

- **Double counting.** "elevated" contains "elevate", "boasts a" contains
  "boasts", "immerse yourself" contains "immerse". Each fires twice, which
  inflates the count past the three-tell high-severity threshold.
- **A guaranteed false positive on required output.** "hidden gem" is a tell and
  `popularityTag` is an enum whose values include "Hidden Gem". The audit walks
  every string field, so the enum you require trips the scanner you wrote.

And the deepest gap, which `STUDIO_VOICE` diagnoses correctly and nothing acts
on:

    You have no memory of what you wrote in other drafts, so nothing stops you
    from reaching for the same favourite openings and phrases every time

Every check in this codebase runs on one entry in isolation. Nothing compares a
draft against the published corpus. **The failure the brief predicts is the one
failure nothing can see**, and it is the one a reader browsing five towns will
notice first.

That is worth building and it is not hard: the published rows are already
loaded. Count the opening three words of every paragraph across the corpus, and
flag a draft whose opening shape you have already used four times.

---

# In priority order

    1. Delete the example disclaimers, say "write like this"     free
    2. Rewrite the 111 em dashes out of the prompt files         an hour
    3. Pick ONE voice                                            a decision
    4. Add em dash + "making it" + "not X but Y" to the scanner  small
    5. Deduplicate the brief, one shared constant                half a day
    6. Corpus-level repetition check                             the real prize

1 and 2 together are an evening and I would expect them to change the output
more than anything else on this list.

I have not touched `studioPrompts.js`. It is 48 KB you tuned by hand, the same
reason your own August audit gave for leaving it alone, and a bulk edit while
you are asleep is exactly the change that produces a worse draft you cannot
trace. Say the word and I will do them one at a time, with the before and after
in front of you.
