# Guide audit: scyek6rypzn

*History, Design & Coast: Copenhagen to Jutland in October.* 8 days, 23 stops, 5 towns.
Read live on 21 August 2026. Every external fact below was checked against a source,
named at the bottom.

**This guide is a large step up from siziuvwt6s3.** Every price is in DKK, the intra-day
legs are measured rather than guessed, the weather block is honest, and the day-level
time arithmetic mostly works. What is left is concentrated in three places, and one of
them is not merely wrong but impossible.

---

## 1. The inter-day legs are cycled, and one of them cannot be cycled at all

The header says *"A moving trip: you change town 5 times, mostly by bike."* Every
between-days line is a straight-line distance divided by a bike speed:

    Day 1 → 2   About 1 km to Copenhagen      under an hour and a half on a bike
    Day 2 → 3   About 38 km to Helsingør      roughly 4 hours on a bike
    Day 3 → 4   About 33 km to Copenhagen     roughly 3 hours on a bike
    Day 4 → 5   About 156 km to Aarhus        roughly 15 hours on a bike
    Day 5 → 6   About 2 km to Aarhus          under an hour and a half on a bike
    Day 6 → 7   About 30 km to Ebeltoft       roughly 3 hours on a bike
    Day 7 → 8   About 29 km to Aarhus         roughly 3 hours on a bike

**Copenhagen to Aarhus crosses the Great Belt, and cyclists are not allowed on the
bridge.** VisitNyborg, the tourist board for the town at the Funen end, states it
plainly: cyclists cannot ride across, and must put the bike on a DSB train, buying a
bicycle seat ticket in the DSB app. A tandem or cargo bike cannot make the crossing on a
train at all. So "roughly 15 hours on a bike" is not a slow estimate of a real journey.
There is no such journey.

**The guide already knows this and says so three times, in its own words.**

- MONEY: *"For the long Copenhagen-Aarhus crossing, Kombardo Expressen
  (kombardoexpressen.dk) runs direct and undercuts a full-fare DSB train; if you'd rather
  take the train, DSB Orange billetter booked ahead bring the fare down a lot."*
- GETTING AROUND: *"From Copenhagen Airport the Metro runs straight into the city."*
- Day 5, stop 13: *"Do the long crossing first thing, Kombardo Expressen runs
  Copenhagen-Aarhus direct, or a DSB train over the Great Belt takes about 3 hours."*

Three hours by train, or fifteen hours on a bicycle over a bridge that forbids bicycles,
on the same page, about the same journey.

The intra-day legs are measured properly and it shows: Day 3 gives *"~33 mins by
train/bus"*, broken down into *"train RE to Humlebæk St. · 10 min"* and *"walking, both
ends together · 24 min"*, with *"Run by DSB. Route and times measured with Google Maps."*
That is exactly right. The between-days line is the only one still doing arithmetic on a
straight line, and it is the one that carries the biggest journeys.

### 1b. The short ones are visibly absurd

    About 1 km to Copenhagen, roughly under an hour and a half on a bike
    About 2 km to Aarhus,     roughly under an hour and a half on a bike

At the speed implied by the 156 km figure (about 10.4 km/h), 1 km is six minutes. Ninety
minutes is a floor being applied to anything short, and it makes the guide look like it
cannot do arithmetic. Day 8 then contradicts its own inter-day line: the header says
*"About 29 km to Aarhus, roughly 3 hours on a bike"* and the leg inside the day says
*"2 hours 30 mins by bike"* for the same journey.

### 1c. And three of them are not journeys

Day 1 → 2 is *"About 1 km to Copenhagen"* when you are already in Copenhagen. Day 5 → 6
is *"About 2 km to Aarhus"* from Aarhus. Day 7 → 8 crosses back to Aarhus, which is real.
The guide already has the right sentence for a non-journey, and uses it between stops 14
and 15: **"Same place, nothing to travel."** A same-town day transition should say that,
or say nothing.

---

## 2. Culture Night is on the wrong day, and the guide says so out loud

Day 4 is titled **"Culture Night in the city."** Its third stop is Culture Night at 18:00,
carrying this warning on the card:

> ⚠ Runs Fri 9 Oct, which is not the day this stop falls on

The date is correct: kulturnatten.dk states *"The Culture Night will be October 9, 2026."*
The failure is that the event was placed on a day whose date does not match, the mismatch
was detected, the warning was printed, and the stop was left in place anyway, with a whole
day built around it and the BOOK BEFORE YOU GO panel telling the reader to book it.

This is the auto-tick problem rendered. A ticked event reaches the planner as *"EVENTS THE
TRAVELER HAS ALREADY CHOSEN, which are fixed points and not suggestions. Every one MUST
appear as a stop, on the day its own dates fall on."* It appeared as a stop. It did not
land on the day its dates fall on. Nothing downstream treated that as a reason to move it.

Two things are needed and only one is done: nothing arrives pre-ticked now, but a chosen
event that cannot be placed on its own date still needs to either move the day or drop out
with a sentence saying why. A warning is not a resolution.

---

## 3. Two factual claims that are wrong

**The Copenhagen Card price is roughly half the real one.** Day 3 says:

> base yourself near central Copenhagen with the Copenhagen Card (~450 DKK for 48 hours)

The adult Copenhagen Card DISCOVER is **859 DKK** for 48 hours (589 for 24, 1,039 for 72).
The HOP variant is 875 DKK for 48 hours. There is no 48-hour adult card at 450 DKK. A
reader budgeting from this figure is out by about 400 kroner per person before they have
bought anything else, and this is the one number on the page presented as a specific,
checkable price rather than a range.

**"One stop south by train to Humlebæk"** is wrong. Day 3, stop 9 says the Louisiana is
*"One stop south by train to Humlebæk, then a 10-minute walk."* Snekkersten and Espergærde
both sit between Helsingør and Humlebæk on the Kystbanen, so Humlebæk is the third stop
down the line. The 10 minutes is right; the stop count is not. It is the kind of detail a
reader checks against a departure board and finds wrong.

---

## 4. Output that is visibly broken on the page

**A sentence fragment where a template did not fill.** Day 3, Where to stay:

> **These are**, so base yourself near central Copenhagen with the Copenhagen Card…

Something was interpolated and came out empty. It is the first thing the eye lands on in
that box.

**Stop numbers skip 6 and 12.** The numbering runs 1, 2, 3, 4, 5, then Amalienborg with no
badge at all, then 7. Later: 10, 11, then Culture Night with no badge, then 13. Both of the
unnumbered stops render as the tall photo-card variant, and that variant drops the number
badge; Reffen is the same card type with an external link and keeps its 7, so it is
specifically the photo layout. The map note explains the M and E letters (unplaceable) and
explains the shared pin, so a reader who is paying attention can account for every
anomaly except the two missing numbers.

**Helsingor without the ø**, in the same Day 3 sentence, while every other mention is
Helsingør.

---

## 5. The map is still serving 401 errors

Every tile reads **"401 Error / Invalid Authentication / Learn more at
docs.stadiamaps.com/authentication"**, with QR codes tiled across the whole country. The
route line and the numbered pins draw correctly on top of it, which makes it worse: the
guide clearly has good coordinates and is rendering them onto an error page. Stadia
domain registration has been on the open list since the 19th and is now visible on a
guide a reader has been given.

---

## 6. Coordinate gaps in the library

The map panel is honest about these, which is good, but each one is a row worth fixing:

- **M/S Maritime Museum of Denmark** has no coordinate at all and is left off the map
  entirely.
- **Four pins are approximate**: Culture Night, ARoS Aarhus Kunstmuseum, Mols Bjerge
  National Park, Aarhus Ø harbour bath. They sit at the town centre rather than the door.

ARoS is the one to look at first: its own entry text on this page states the address,
*"At Aros Allé 2"*, so the guide is holding a precise address in prose and still cannot
place the pin. That is a row that needs the coordinate extracted from text it already has,
not new research.

---

## 7. Smaller things, in descending order of how much they matter

**A four-hour hole on Day 4.** Round Tower ends between 13:45 and 14:00, Culture Night
starts at 18:00, nothing between.

**Day 7 overruns.** Mols Bjerge is 3-4 hours from 10:00, so it can end at 14:00. The leg to
Ebeltoft is 57 minutes. Ebeltoft Old Town is scheduled at 14:30. On the long version of the
park visit the reader is 27 minutes late before they start.

**The Mols Bjerge leg says bike, the stop says bus.** Stop 20's text: *"Reach it by
regional bus toward Ebeltoft."* The leg out of it: *"57 mins by bike."*

**Two "hostel" recommendations that name hotels.** Day 1 says *"a hostel is the realistic
budget pick here"* and names Capsule Hotel Nyhavn63. Day 4 says *"a hostel or budget
private room"* and names Cabinn City, a budget hotel chain. Day 2 (Generator) and Day 5
(Danhostel) are correct, and Day 8 correctly says hotel and names one. So the fault is
intermittent rather than systematic, which usually means the accommodation sentence and
the named property are chosen by different steps.

**A "where to stay" on the departure day.** Day 8 recommends basing yourself in Aarhus Ø,
for a day whose own text says *"With the long haul back to the airport ahead."* Nobody
needs a bed for the night after they fly home.

**The TICKETS panel is written for the wrong season.** *"Denmark's bigger attractions take
timed entry in summer"* on a guide titled *…in October*. It is a static essentials string
that does not know when the trip is, while the weather block three panels up knows
exactly.

**The route line omits the returns.** *"Your route: Copenhagen → Helsingør → Humlebæk →
Aarhus → Ebeltoft"* reads as one-way progression. The trip actually returns to Copenhagen
on Day 4 and back to Aarhus on Day 8. Related: the header says *"you change town 5 times"*
and the day sequence contains six changes.

**Day 3 is titled "North Zealand castles"** and contains one castle and two museums.

---

## 8. What is right, and worth not breaking

- **Every price is in DKK.** No dollars, no euros, no bracketed conversions anywhere. This
  was the worst fault in the previous guide and it is completely absent here.
- **The weather block is the best thing on the page.** It states the ten-year normals, says
  in plain words that they are records rather than a prediction, gives the rain frequency,
  and tells the reader when a real forecast will replace it. It is the model the rest of
  the guide should follow: it says what it knows, how it knows it, and what it does not
  know yet.
- **The map panel discloses its own gaps** rather than quietly dropping stops.
- **Intra-day legs are measured**, name the operator, and say where the number came from.
- **Facts spot-checked and correct**: Andersen at Nyhavn 18, 20 and 67; Rosenborg as
  Christian IV's 1600s palace; the Round Tower's 1642 ramp; the changing of the guard at
  noon daily; Christiansborg on Absalon's 1167 castle; Den Gamle By's 75 buildings;
  Torvehallerne's roughly 60 stalls; Kombardo Expressen used on the corridor it actually
  covers.

---

## Suggested order of work

1. **Inter-day legs off straight-line-and-bike.** One fix removes the impossible crossing,
   the 90-minute kilometre, and the three phantom journeys between two days in the same
   town. It is also the fault the reader is most likely to notice.
2. **A chosen event that cannot sit on its own date must move the day or leave**, rather
   than staying with a warning attached.
3. **The Copenhagen Card figure**, and a check on wherever else a specific price is
   composed rather than read.
4. **The "These are," fragment** and the two missing stop numbers.
5. **Stadia registration.** It is one account and the whole map depends on it.
6. **Coordinates for the five rows above**, starting with ARoS, whose address is already
   in its own text.

---

## Sources

- Cyclists and the Great Belt: <https://www.visitnyborg.com/nyborg/plan-your-trip/transportation-across-the-great-belt-gdk1146643>
- Culture Night 2026 date: <https://kulturnatten.dk/en/>
- Copenhagen Card prices: <https://www.routesnorth.com/denmark/copenhagen/copenhagen-card-worth-buying/>
- Kystbanen station order: <https://en.wikipedia.org/wiki/Snekkersten>
