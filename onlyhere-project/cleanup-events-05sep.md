# The 52 event rows, and what to do with each — 5 Sept 2026

Read straight off `gemlyx_content`. 52 event rows, all published:
**28 upcoming · 10 dateless · 14 already finished.**

Two places do the work, and which one depends on the change:

| Change | Where |
|---|---|
| Delete a duplicate row | **Studio → Manage Published** |
| Fix a date, a name, any normal field | **Studio → Manage Published → Edit** |
| Change a row's `type` (festival → undated) | **Supabase → SQL Editor** — Studio cannot do this |

---

## 1. Delete the duplicates (Studio, no SQL)

`gemlyx_content` has no versioning and no undo, so delete one at a time and
check the survivor after each.

### Bork Vikingemarked — four rows

```
234  festival  23 Mar – 23 Apr 2026   made today 17:22
233  undated   (no date)              made today 17:21
232  undated   (no date)              made today 17:21
 61  festival   7 –  9 Aug 2026       made 29 Jul
```

The entry's own description says *"Every August, more than 300 Vikings set up
camp"*, so **61's 7–9 August is the real 2026 run** and **234's month-long
March-to-April range is wrong**. 232 and 233 are the same waiting entry twice,
from the double press.

**Keep 233. Delete 232, 234 and 61** — but do step 2 below before deleting 61,
because its dates are worth keeping.

### Køge Festuge — three rows, all finished

```
235  31 Jul –  5 Aug 2026   made today 20:29
231  25 – 26 Jul 2026       made today 17:21
 20  23 – 29 Aug 2026       "Køge Festuge 2026"
```

Three ranges for one festival, so at most one is right, and I cannot tell you
which. Worth thirty seconds on koegefestuge.dk before you choose. Note that
231's dates are 25–26 July, which is a two-day range for a week-long festival.

**Keep one, delete the other two.** Whichever survives is finished, so it then
belongs in the memory (step 3).

### Sebbersund Vikingemarked — two rows, same dates

```
230  5 – 6 Sept 2026   made today 16:13
 60  5 – 6 Sept 2026   made 29 Jul
```

A clean redraft: same dates, newer research. **Keep 230, delete 60.** This one
is running right now, so check the page still looks right afterwards.

### Jelling Musikfestival — two rows

```
229  27 – 30 May 2027   made today 15:29
 55  (older)
```

229 is today's redraft and its dates were confirmed on the operator's own site
during that run. **Keep 229, delete 55.**

---

## 2. Two things that are wrong on the live site tonight

**TinderBox (id 62): `2027-06-24` to `2026-06-26`.** The end is a year before the
start. `isUpcoming` reads the START, so this is showing to readers right now with
an impossible range. The end year is a typo: fix `dateEnd` to `2027-06-26` in
Studio.

**Schleswig Wikingertage (id 58)** is named *"Schleswig Wikingertage (technically
a German Event)"*. That parenthesis is a note to yourself and it is on the public
card. Edit the name.

---

## 3. Keep Bork's real dates before deleting row 61

Optional, and worth it: row 61 knows when Bork last ran, and the waiting entry
does not. Run this BEFORE deleting 61, and the card changes from *"It runs every
year. The next dates are not announced yet."* to *"Last ran 7 Aug to 9 Aug 2026.
It runs every year. The 2027 dates are not announced yet."*

```sql
update gemlyx_content
set payload = jsonb_set(payload, '{__waiting}',
      (payload->'__waiting')
      || jsonb_build_object('lastStart', '2026-08-07', 'lastEnd', '2026-08-09', 'expectYear', 2027))
where id = 233;
```

---

## 4. Move the dateless festivals into the memory (SQL)

**Do this last**, after the duplicates are gone. Running it first would create
undated copies of rows you are about to delete.

There are **eight**, not the two I said earlier. I only saw two because I never
scrolled the Major tab:

> Sommer på Tobakken · Distortion · Randers Festuge · Wonderfestiwall ·
> Københavns Historiske Marked · Geopark Dage i Det Sydfynske Øhav ·
> Grøn Koncert · Schleswig Wikingertage

All eight are live right now showing "Dates not confirmed" in the events grid.
`move-dateless-events.sql` in the repo root is still the right script and covers
all of them unchanged. Run its query 1 first and check the list matches the eight
above before running the update.

---

## 5. What is left after that

**14 rows whose dates have finished**, invisible to every reader:

```
Køge Festuge · Ambufest · Løkken Molefestival · Tønder Festival ·
Ribelund Festival · Fyn rundt for bevaringsværdige træskibe ·
Syd for solen · Skanderborg Festival · Riverboat Jazz Festival
```

(plus the duplicates above, which go away in step 1)

These are correct entries that no visitor can see. Each one still holds its real
last-edition date, which is worth more than the dateless rows have: moved into
the memory they can say when they last ran, not just that the next date is
unknown.

The thing SQL cannot decide is whether each one recurs. `recurrenceIn` answers
that from the entry's own prose, and it has to run in Studio. That is the pass I
suggested building: read all fourteen, propose a table, you approve, it writes.
Nothing written until the whole proposal has been seen, same rule the sweeps
follow.

Say the word and I'll build it.
