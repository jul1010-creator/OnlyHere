# Gemlyx, 14 Sep 2026, midday

**16,624 passing**, 0 failed, both timezones. Build clean. Three files on your PC,
sitting on top of whatever you pushed this morning:

```
src/utils/exclusions.js      a refusal at the end of a sentence is now read
src/utils/chatRail.js        a refusal now outlives the turn it was said in
tests/run.mjs
```

Both bugs were found by **using the chat**, not by reading the code. That is the
part worth taking from this handoff: I went looking for one thing and the live
app handed me a worse one on the second turn.

---

## 1. A refusal at the end of a sentence was not a refusal

I typed one message into the real Gemlyx:

> Driving up from Germany through South Jutland, 5 days, two adults, history and
> coast, **no Copenhagen please**

and the map came back with a Copenhagen pin. Measured straight after, with the
clause moved around:

```
["Copenhagen"]   no Copenhagen please
[]               history and coast, no Copenhagen please
[]               Driving up from Germany, no Copenhagen please
["Copenhagen"]   We are driving up from Germany. No Copenhagen please.
["Copenhagen"]   two adults, history and coast, skip Copenhagen
```

**A bare "no" was only ever read at the START of a message.** One clause in front
of it and the reader went blind. A full stop brought it back. "skip" worked
anywhere, which is why nobody caught it: everyone who tested this typed the
refusal on its own line.

A comma is a sentence boundary now. **The anchor was never the real guard**, which
is what made this safe to widen: "no car" and "no budget" are held out by the
capitalised-name rule and by a short list of tail words, and both still hold. Ten
sentences that must not fire are pinned, including "two adults, no car", "Odense
and Ribe, no problem" and "two adults, no Danish food".

Added while I was in there: **"anywhere but X"**, and its siblings "other than",
"except", "apart from". That rules a place out with no negation word in it at
all, so nothing in the file could see it.

**It costs more than a pin now.** Since last night the ruled-out list reaches both
build prompts, so a refusal this reader misses is one the planner never hears.

---

## 2. And then the live chat showed me the worse one

Fresh thread, cleared with your own Start over. First message said "no Copenhagen
please". Two turns later the map carried six pins and one of them was Copenhagen.

Reproduced with the real readers in three lines:

```
["Skip Copenhagen please"]                       ->  []
  + "Copenhagen has the better museums though."   ->  [copenhagen]
```

**A refusal was applied to the turn it was said in and then forgotten.** Every
rejection was handled as the walk passed the turn carrying it, and nothing
remembered it, so the next time anybody named the place its pin came back.

Gemlyx names a refused place constantly, usually in the sentence explaining why
it is leaving it out, which is the sentence most likely to put the pin back on
the screen.

A refusal sticks now. **Only the traveller can lift it**: a later turn of theirs
naming the place is them changing their mind, and they can change it back again.
Gemlyx arguing for it is Gemlyx talking, which is the rule this codebase already
keeps everywhere else about never reading the brief out of its own replies.

Two guards had to go in, both from cases the suite caught:

- The turn that refuses a place also NAMES it. Without a guard, "not Aarhus"
  would have lifted its own refusal on the same pass.
- A refusal of one place is a refusal of that one. "Skip Aarhus" followed by
  "Ribe and Aarhus are both worth it" leaves Ribe pinned.

### One existing assertion changed, and you should know why

It re-added Ribe from **Gemlyx's own line**, "Though Ribe deserves a second look",
and asserted only that it arrived once rather than twice. The duplicate half was
its real point and I kept it exactly as it was. What it also blessed, as a side
effect, was a reply overruling the traveller.

The re-add now comes from their turn, and a second assertion pins that Gemlyx
lobbying does not bring it back.

---

## What I saw in the live chat that was fine

Worth saying, since I spent the morning looking for faults:

- A fresh conversation with a starting point, a length, a month and two interests
  filled 5 of 7 slots off one message and asked exactly one question back.
- The second turn took it to 8 of 8 and offered to build. No re-asking, no
  invented day count.
- Pins matched what the reply named, apart from the refused one above.
- It recommended Ribe and Esbjerg, both of which you hold pages for, and pinned
  and carded both.

---

## Still open

1. **The map.** A detailed dark style on OpenFreeMap, per Friday night's note.
   The default is back on the old raster until then.
2. **The social sweep needs its Studio panel**, a column on `gemlyx_content` to
   hold the record, and a run. The reader and the endpoint are built and tested;
   the API Direct request shape is my reading of their docs and is unverified.
3. Two matchers for "is this row in a place ruled out": `isExcluded` uses
   substrings, the audit's `namesMatch` uses words. They disagree on "Ribe"
   against "Ribera".
4. **The gazetteer reaches `readExclusions` only from the map**, so "Take Aarhus
   off" unpins it but never reaches the note, the constraints or the prompts.
5. `_constraints.transport.ruledOut` is always empty, so `checkTransport` cannot
   fire.
6. **The chat prompt contradicts itself** on whether a ready reply may be a day
   by day plan.
7. `constraintNote` ends "Say the word and I will rebuild around it" and the
   panel has no button.
8. 170 em dashes left in strings, most inside prompts that forbid the em dash.
9. Three readers of transport disagree; "1 week and 2 days" reads as 2 days.
10. From the events audit, three decisions still yours: should a failed
    correction block publishing, should the untraced-price rule widen to food,
    and a Studio line showing how long since the last events run.
