# Overnight, 15 August 2026

You went to bed at 03:47 and picked the guide's legs. Two more things came out
of your last screenshot on the way, and both were worse than the leg work, so
they got done first.

Suite is 4390 assertions, up from 4347. Build clean. Everything is written to
your disk. **Nothing committed, nothing pushed.**

---

## 1. "The claim is not confirmed by the checked sources."

That sentence was the **description** on the Hyllested Skovgårde card, on a
screen a traveller reads.

It is the fact-checker's own verdict, published as the entry's writing. The
auto-correction is told to remove what it cannot verify rather than guess, and
on that draft it removed the sentence and wrote down **why** in the same field:
a note to you, living where the prose should be.

`keepMeasured` has guarded the fields the pipeline measured for days. Prose was
unguarded, because prose is exactly what a correction is allowed to change. What
it may not do is stop being prose.

`keepProse` now sits directly after it. The test is comparative on purpose:

- Only language the correction **added** is refused. An original that already
  hedged keeps its hedge.
- **`uncertainties` is exempt entirely.** Saying what is unconfirmed is that
  field's whole job, and that is where a claim that cannot stand belongs.
- Field by field, not all or nothing. A correction that fixed three fields and
  spoiled one keeps the three.

When it fires you get told, in the same box as every other reason not to publish
yet, naming the field it put back.

---

## 2. Sparkær, 616 inhabitants, four hours away, for a two day trip

Your "IN 3 days!? Damn.. good luck." was the right reaction. The region pass I
built earlier worked, and then handed you Sparkær ("a small railway town of 616
inhabitants built around a railway junction"), Asaa and Øster Hurup: villages in
north Jutland, chosen for no reason at all except that they came first in the
array, which is Supabase id order.

That is the same defect as the Copenhagen list, one level out, and worse: the
second pass at least holds places inside a town you named, while this one is
free to reach anywhere in half a country.

Ranked now, then capped:

1. **Gemlyx's own tier.** That is the editorial judgement the whole app is built
   on, and a 616-person railway junction is not "Can't miss".
2. **What they said they were into**, read off the town's own words. "Quiet
   walks and history" now reaches a town whose page is about history.
3. **Major city**, then name, so two runs of the same brief give the same
   screen.

One note on the test for this. My first fixture passed for the wrong reason: a
mutation zeroing every score left it green, because the sort then falls through
to the name and Aarhus happens to sort first anyway. The weakest town in the
fixture is now deliberately the one that sorts first.

---

## 3. The guide's legs, which is what you asked for

The thing I proposed yesterday morning and never built.

`/api/directions` returns every step with its line, its operator, its two stops
and its minutes. `fetchExactDurations` stores the **whole** response on the
guide object. The leg chip read two fields out of it. A leg Google described as

> IC to Slagelse, change, bus 470R to Skælskør Busterminal

was sitting in the browser at full detail and reaching the reader as
`~1h 59 by train/bus 🚆`.

Under each chip now:

    🚆  train IC to Slagelse · 62 min
    🚌  bus 470R to Skælskør Busterminal · 38 min
    🚶  walking, both ends together · 15 min
    ⏱   waiting and connections · 4 min

Three things worth knowing about it:

- **Nothing is fetched for this.** It is the response the build already stored,
  so it cannot slow a guide down or fail on its own. Asserted.
- **A leg with nothing to say says nothing.** One unnamed ride is already fully
  described by the chip above it, and repeating it would be noise on every short
  hop. A line name or a stop to get off at is the threshold.
- **The walk says "both ends together"**, because `journeyParts` sums the walk at
  both ends and this must never read as "the station is 15 minutes from the
  centre". That exact sentence is what `journey.js` was written to stop.

Ferries survive too, named where Google names them, which is the fact that
decides an island leg and which the guide has been fetching and dropping.

---

## What I did not do, and why

- **Ranking attractions inside a named town.** Same defect as the region pass
  (database order), but it needs your taste rather than a rule: for Copenhagen
  it decides which three of thirty attractions a traveller sees first, and I
  would rather you pick the axis than have me guess it at four in the morning.
- **The price layer's four remaining holes** and **the scrape queue ranking**.
  Both still open, both self-contained, neither urgent tonight.
- **Anything on the writing brief.** Four voices requested at once and 63 percent
  of instruction sentences carrying a prohibition is a rewrite, not a fix, and it
  is yours to steer.

## Before you push

The whole of yesterday and tonight is unrun. 4390 assertions are unit-level and
source-level; the Studio doors, the bar street type, the three-level nightlife
navigation, the split fact-checker and these legs have not been exercised by a
real click or a real draft. One draft end to end and one guide build would tell
you more than another thousand assertions from me.

---

# Added after you sent the Hyllested link

I read the live page in your Chrome. Six things on it, four fixed in code, two
that need a decision or a redraft.

## Fixed

**"The claim is not confirmed by the checked sources."** That is the first
sentence of the entry, live. `keepProse` stops a new draft doing it; it cannot
reach a row already published, and that row is published. The **audit** can see
it now, as a critical finding, so Manage Published and the sweep will both show
it. **The row still needs a redraft or an edit: nothing I added rewrites live
content.**

**The Reality Check is carrying the journey.** It reads "Driving from Copenhagen
is the sane option, taking about 4 hours 9 minutes over 363 km, compared with
5h 39min by train, light rail and bus with two changes." Every draft prompt says
that field is never a logistics note, and nothing enforced it. Now audited.

**The Gemlyx Find repeats the body.** Body: "Ebeltoft Gårdbryggeri's café and
taproom sit on a farm dating from 1860." Find: "Ebeltoft Gårdbryggeri's taproom
on the 1860 farm." It is the one curated line in the entry. Now audited, on
distinctive-word overlap rather than on the sentence, so a reworded repeat is
caught too and a Find that names the same place with a genuinely new detail
passes.

**"These are plain search links. Gemlyx earns nothing from them yet."** The
"yet" is the tell: a founder's note about a plan, printed under a reader's
booking buttons. Now "Plain search links. Gemlyx earns no commission on these."

**And one from the front page:** "Ribelund Festival, 19 Aug to 19 Aug". A range
whose ends are the same day is a day. Compared on the date, not the timestamp,
so a row stored midnight to evening is still one day.

## Not fixed, because they are yours

**The hero.** A village with no photo gets a 🌲 floating in an empty dark band,
about 230px of nothing above the title. The guide page already solved this with
a designed monogram plate. Worth doing, but it is a design decision and I would
be guessing at what you want.

**"NEARBY, WORTH KNOWING ABOUT"** on that page lists NorthSide Festival in June
2027 and SPOT Festival in May 2027, both 38 km away and both nine months out,
under a heading that implies relevance now. Either the block wants a horizon or
it wants to say how far off each one is.

Suite is 4405. Build clean. Everything written to your disk, still nothing
committed and nothing pushed.
