# Gemlyx, 13 Sep 2026, evening

Suite **16,261 passing**, 0 failed, both timezones. Build clean. Everything below
is on your PC. Push when you are ready.

---

## Why the chat got stuck, and it was not the kids

You said "the chat got stuck because I said 'kid's trip'". Two separate faults,
and the one that actually trapped you fired three turns earlier.

Your session, turn by turn:

```
Gemlyx  Have you got somewhere booked to stay already?
Oliver  nope i dont
Gemlyx  I still do not know what kind of trip this is. Name one thing.
Oliver  for kids
Gemlyx  I still do not know what kind of trip this is. Name one thing.
Oliver  history
Gemlyx  I still do not know what kind of trip this is. Name one thing.
```

You typed a word the question itself offers and got the question straight back.

Your turns are joined with a newline and read as one text. The refusal scrubber
ran forty-eight characters past any negation, stopping at a full stop, a comma or
a contrast word. **A newline was not on that list.** So "dont", in an answer about
a hotel, swallowed your next two turns whole:

```
withoutRefused("nope i dont\nfor kids\nhistory")  ->  "nope i  "
```

I bisected it turn by turn to be sure: every pair of turns containing "history"
read the history, and only the pair beginning "nope i dont" did not.

**This is a class, not your session.** Any "no", "not", "don't", "ikke" or
"nicht" anywhere in a conversation made the next one to three turns invisible, and
not only to the interests slot. The same scrubber feeds `briefThemes`, which
decides which places go into the prompt at all, and the check for children with no
adult. A refusal is a clause, a clause ends at a comma, and a turn ends harder
than a comma does. It stops at the turn now, in both directions.

## And "a kids trip" is what kind of trip it is

The second fault, and the one you named. There is no word for it in the interests
vocabulary, and there must not be one: that reader runs over the whole
conversation, and "kids" is the commonest word in the answer to a completely
different question. "9 kids" answering who is coming would have filled what kind
of trip it is, without you ever saying so. That is the exact failure the slot was
made hard to prevent.

What makes it an answer is the question in front of it. So it is read only from a
turn that was answering **this** question, and the value is `family`, which is
already the word THEME_WORDS and PLACE_THEMES use. Nothing new was invented. The
gate was the only part that could not hear it.

A theme you do name still wins: "history, and we have kids with us" is history.

## Every option Gemlyx names, read back

I took each ask apart and read its own options back through the reader for that
slot. Two failed, both in transport:

```
"How are you getting around once you're here? Car, bike, trains and buses,
 or a mix of them."     ->  "a mix of them" read as NOTHING
"Hvordan kommer du rundt undervejs? Bil, cykel, tog og bus, eller en
 blanding."             ->  "en blanding" read as an answer about INTERESTS
```

Same shape as the attractions list calling Legoland free: the app arguing with
itself while the traveller loses. The mix phrases are one list now, and which
question they answer is decided by which question was asked. A mix leaves the mode
open on purpose rather than guessing at one, because somebody with a car and a
train has the reach of whichever they use that day.

The suite now checks both directions: every option has to read back into its slot,
**and** every option has to still appear in the question, so the list cannot drift
away from the words on screen.

## Found by a test written for something else

"noget for børnene" named nobody. Danish glues the article on the end, so the bare
"børn" the pattern had is the form nobody writes in a sentence. Same for barnene,
barnen and German kindern. Three readers ask that question through that one
pattern, including the one deciding whether a night out gets planned for a trip
with children.

---

## The map

**The Copenhagen zoom.** Fable built an instrumented copy of the app and drove it
in a real browser to find this rather than reading for it. Four candidates
measured and cleared: a beat in the opening reply moves nothing, the default
centre is Denmark at zoom 5, no fit ever runs on the country view, and the
greeting is dropped before the pins are walked.

The cause is the fifth. `mapFocus` is App state and outlives the map component,
and React runs every effect on mount, so a map built after a beat had already
played **played it again**. Reproduced exactly as you described: a reply flies to
Copenhagen, clear it, an opening line naming no town, and the new map goes from
Denmark to Copenhagen at zoom 12 with zero pins on it. Leaving the Detour tab and
coming back did the same. Two readers of one beat: the reveal on the word, and the
mount. Only a beat newer than the one the map was born with moves the camera now.

**The categories.** The permanent label is the name alone. The theme word joins it
on hover or tap and leaves again, riding the same gesture the card and the "Is
this interesting?" question already use, so there is no second mechanism. Your
earlier rule is untouched: this only happens at all for somebody who has not said
what they are after.

**The phone map. I was wrong yesterday.** I told you it was fixed. It was not.
`shown = wide` returns null below 900px, so the CSS I wrote had no map to lay out.
The map is rendered on phones now and verified at 390x844: built in the same
commit as the second pin, 100% of the box under loaded tiles, two labelled pins, a
tap on a pin opening the question card with Yes and No both reachable.

Two real bugs surfaced in the doing. A tap fires mouseover then click, so hover
opened the card and Leaflet's own handler toggled it shut again; and a lifted
finger has no position, so mouseleave fired six times and shut it once more. Both
fixed. The zoom control also sat over the No button on a phone, so it is hidden
there.

It shows once there are at least two pins, because a 190px strip holding one pin
is a worse answer than the card already beside it.

---

## The dashes

Your rule is enforced on everybody except the app itself. `entryAudit` flags a
single em dash in a published entry as a voice failure, `correction.js` tells the
writer never to use one, and a deterministic strip runs over finished guides. All
of it aimed at the model.

Your screenshot reads **"5 of 7 — 2 still to go"**, and the first sentence of
every conversation carried two more. Those are fixed and pinned.

**170 more are left in strings, and most of them are prompts.** 108 in App.jsx,
17 in studioPrompts.js. Every one is an instruction handed to a model, written
with the punctuation the instruction forbids, which is a likely reason dashes keep
coming back in generated copy. Ten are in `essentials.js`, which a traveller
reads directly.

I have not touched them. Rewording a prompt changes what the model does, and 108
of them is not a change to make quietly while you are looking at something else.
Say the word and I will sweep them, prompts first or reader-facing first.

---

## One I did not fix, and why

You typed **"public transpor"**. The reader saw nothing, so the trip has no mode,
which means no distance ceiling, which is how somebody on buses gets offered
somewhere four hours away. Gemlyx itself answered "that's the main piece settled",
which it had not.

I can make a turn that is one character short of a known answer count as that
answer: "public transpor" is "public transport" missing its last letter, and it
only ever fires on a turn that was answering that question. That is a small,
testable rule. It is also the first typo tolerance in the app, and where that line
sits is your call rather than mine.

---

## Still open

1. **The exclusion path on the build.** `_constraints.excluded` never reaches the
   build prompts. Still the biggest one.
2. The promise gate: nothing compares what the chat promised against what the plan
   contains.
3. Three readers of transport disagree.
4. "1 week and 2 days" reads as 2 days.
5. Guide-side essentials themed from Gemlyx's own words.
6. From the events audit, three decisions still yours: should a failed correction
   block publishing (Fable and I both say yes), should the untraced-price rule
   widen to food, and a Studio line showing how long since the last events run.
