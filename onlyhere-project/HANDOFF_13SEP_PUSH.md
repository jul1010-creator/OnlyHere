# The push, 13 Sep 2026

**It will go through now.** Suite **16,217 passing, 0 failed**, build clean.
Both files are already on your PC: `src/utils/tickets.js` and `tests/run.mjs`.
Pull nothing, just push.

---

## What your hook caught

```
16212 passed, 2 failed
FAIL the day it turns is the window itself   expected true   actual false
FAIL the age is counted in days              expected 10     actual 11
```

Both green here, both red on your desk, which is the whole finding: **the
failure was your timezone.** `TZ=Europe/Copenhagen node tests/run.mjs`
reproduces it exactly. UTC and New York pass.

A ticket check is stored as a full instant, `new Date().toISOString()`, which is
UTC. The age was read by taking the first ten characters of that string. East of
Greenwich the UTC date rolls back two hours before the Danish one does, so a
status measured at half past midnight in Copenhagen is written down as
yesterday and reads as a day older than it is.

An off-by-one inside a 120 day window changes nothing a reader sees today. It is
fixed anyway, because `calendarDay.js` exists for this exact shape and its
opening comment is about the second independent instance of the same bug. This
was the third. One reader now, `dayStart`, which reads an instant as the local
day it fell on.

**And the date printed under the tick was the same question read a second way.**
`ticketProvenance` sliced ten characters off the string too, so on your own
machine a check made after midnight would hover "checked on 12 September" over
an age of nought days. Two readers of one question, which is this codebase's
signature bug and the reason it keeps getting written down. Both come from
`dayKey` now, so the sentence and the number cannot disagree.

## Two more found while checking it

I ran the suite from Honolulu to Kiritimati, UTC-10 to UTC+14, including a
half-hour offset. Two fixtures were pinned to UTC instants while asserting local
calendar days:

- The weekday block from last night anchored on `2026-09-13T09:00:00Z` and
  called it a Sunday. Nine hours behind UTC it is a Saturday, so "sunday" meant
  tomorrow rather than a week away. Local anchor now.
- The sold-out sweep fixture stamped `2026-08-13T09:00:00Z` and expected the
  reader to print the 13th.

Neither could ever have fired in Denmark. They are fixed because a suite that is
only true in one hemisphere is not measuring what it claims to.

## The guard

Three new assertions, and the pair of them is deliberate: a check half an hour
into today must read as nought days old, and one half an hour before midnight as
a day. The first fails in every zone ahead of UTC under the old reading, the
second in every zone behind it. In UTC both are right either way, which is
exactly why this went green here and red on your desk, and why one assertion
would not have caught it.

---

## Still waiting for you, from this morning

1. Should a failed correction **block** publishing? Fable would. I agree.
2. Should the untraced-price rule widen to restaurants?
3. A line in Studio saying how long since the last events update run.

## Still open

1. **The exclusion path on the build.** `_constraints.excluded` never reaches
   the build prompts. Biggest one.
2. The promise gate.
3. Three readers of transport disagree.
4. "1 week and 2 days" reads as 2 days.
5. Guide-side essentials themed from Gemlyx's own words.
6. Kids revealed after the party question.
