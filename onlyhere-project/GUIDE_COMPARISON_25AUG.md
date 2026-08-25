# Reading ChatGPT's Denmark guide next to ours

25 August 2026. Oliver: *"what makes our guide superior? And how can we make it
further superior?"*

The document is 1,584 words, seven days, Copenhagen to Roskilde to Odense to
Aarhus. **It is good, and the parts of it that are good are not the parts that
are easy.** What follows takes it seriously enough to say where we lose.

---

## What is actually superior, checked rather than asserted

Every one of these was verified in the code, not remembered.

**1. It knows what day the traveller is there, and ChatGPT does not.**

The strongest item, and ChatGPT names the gap itself: *"This is the part I can't
complete properly without your actual travel dates... Before finalising the trip,
I'd check whether your dates overlap with festivals, concerts, Christmas markets,
seasonal Tivoli openings."*

That is a list of things we already hold: 45 published festival rows with real
dates, a publish gate that refuses a dateless festival, and
`stopEventWhen(real, tripDayDate(...))` in GuidePage which puts the event against
the actual day of the trip. **They wrote down the hole. We are the hole filled.**

**2. Real weather, per day, and it says when it is stale.** ChatGPT again names
what it cannot do: *"If you're months away, I'd use historical climate
information rather than pretending there's a reliable forecast."* We call DMI and
Yr, warn per day through `dayWarnings`, and `weatherIsStale` decides when to
refetch.

**3. Real travel times with a named source.** Theirs are "around 25 minutes",
"roughly 1½ hours". Those happen to be right. Ours come from Google Directions
through `journeyFromStored` and print `JOURNEY_SOURCE` under themselves, so a
reader can see where the number came from and a wrong one is falsifiable.

**4. Ferries are classified rather than assumed.** Their route has no water on
it, so the question never arises. Ask the same model for Ærø or Samsø and it will
route you by land, which is what ours did until 24 August across six islands.

**5. It refuses.** `absenceClaims` will not let a draft say a train does not run.
`isBookableTicketUrl` returns null rather than a plausible link. The guide prompt
forbids a bare ticket price because most attractions have tiered pricing. Their
document has no mechanism that can refuse: it simply does not mention what it
does not know, which works exactly until it does not.

**6. Provenance.** 1,584 words, zero sources. "The burial place of generations of
Danish monarchs" is correct, and there is no way to tell whether it came from
Roskilde Domkirke's own site or the model's memory. Ours can now answer that per
field.

**7. It is alive.** Saved, revisitable, with Local Assist on the page so a
traveller can ask a question standing in the rain. Theirs is a text file.

---

## What theirs does better, and we should take all five

**1. "Why I Chose This Route", the counterfactual.** The best section in the
document:

> *I could have sent you Copenhagen → Aarhus and you'd get there quickly. But
> you'd miss much of what makes travelling across Denmark interesting. Roskilde
> gives you medieval royal history + Vikings. Odense gives you a smaller Danish
> city...*

We have `previewWhy`, which says why the route fits **you**. We have nothing that
says why **these stops and not the obvious ones**. There is no `whyThisRoute`
anywhere in the repository, confirmed by grep.

**And we are better placed to answer it than they are.** ChatGPT invents its
reasoning after the fact, because it never had a candidate list. Our planner
does: it holds a pool and rejects from it. We could report a real decision where
they can only narrate a plausible one.

**2. "Worth paying for?"** Per attraction, a verdict on the ticket rather than on
the place. Rosenborg: *"Yes if you're interested in monarchy or history.
Otherwise, enjoy the gardens and continue."* Amalienborg: *"The courtyard itself
is free, so you don't need to buy a palace ticket simply to experience it."*

We ban bare prices, which is right, and then leave the value question
unanswered. `tier` ranks the place. It does not say whether the ticket is worth
it, or whether there is a free way to get most of it.

**3. Empty time, scheduled on purpose, with a reason.** *"16:00 — Free time. This
is deliberate."* *"Don't over-plan tonight. You've just arrived."* *"No final
checklist of attractions."* Our schema warns against cramming a day. It has no
way to put a gap in one and say why it is there.

**4. Permission to skip.** *"If Andersen means nothing to you, shorten this
considerably. The itinerary should fit you, not force famous attractions onto
you."* Published entries carry `whoItsFor`; nothing carries who a stop is **not**
for, and nothing of either reaches a guide stop's note.

**5. The route spine.** A five-line diagram: Copenhagen, 25 min, Roskilde, 1½ hr,
Odense. We have a map, which is better for *where*. The spine is better for
*shape*, and they are not the same question.

---

## The uncomfortable finding

I checked all 25 places their itinerary names against the 148 published rows.

**Twelve of them do not exist in Gemlyx at all:** Rosenborg, Gråbrødretorv,
Nyhavn, the Meatpacking District, Nørrebro, the Viking Ship Museum, H.C.
Andersen's House, Møntergården, the Latin Quarter, Den Gamle By, Dokk1,
Moesgaard.

Read that list again. **The Viking Ship Museum is the stop their document names
as the entire reason to stop in Roskilde. H.C. Andersen's House is the reason to
go to Odense. Den Gamle By and Moesgaard are two of the three reasons to go to
Aarhus.** And there is no `town` row for Roskilde at all: the only Roskilde rows
in the library are two copies of Roskilde Festival.

So on this exact trip, our guide would fall back to general model knowledge for
most of the marquee stops, and then we are producing their document with more
machinery behind it. **The "we only recommend what a person published" advantage
is real in principle and thin in practice on the most-travelled route in
Denmark.**

### But look at what the library IS

Thirty-nine town rows: Asaa, Bybjerg, Hyllested Skovgårde, Kliplev, Lundeborg,
Møgeltønder, Nysted, Næsby, Ommel, Præstø, Sparkær, Sønderho, Tranekær,
Vallekilde, Ærøskøbing, Øster Hurup, Øster Hurup, Skagen, Ribe, Samsø.

**Almost none of those appear on any standard itinerary**, and that is not an
accident, it is what the last month was spent building. The conclusion is not
that our guide is worse. It is that **we are being compared on the one route
where our advantage is smallest, and we should not compete there at all.**

Ask that model for a week in Danish villages without a car and it has nothing
verified to give. We have thirty-nine towns and real ferry classification.

---

## What to build, in order

1. **`whyThisRoute`.** One field, and the only one here that has to come from the
   planner rather than the writer, because it must report a real rejection rather
   than compose a plausible one. Highest value, and it is the section of their
   document a reader would quote back to you.
2. **`ticketVerdict` per stop.** Is the ticket worth it, and is there a free way
   to get most of it. `free` is already a content type and `ticketsGlance` and
   `extraCosts` already exist, so the data is half here.
3. **A rest stop as a first-class kind**, with the reason attached. Cheapest of
   the five and it changes how a day reads.
4. **`notFor` on a stop.** Permission to skip, sourced from the published entry's
   own `whoItsFor` rather than invented per guide.
5. **The route spine**, above the map rather than instead of it.
6. **A guide type that deliberately avoids the obvious.** The one that plays to
   thirty-nine small towns instead of four big ones. This is a positioning
   decision more than a build, and it is the one that decides whether items 1 to
   5 matter.

## And two small things the comparison turned up

**A seventh duplicate, hidden by case.** `Roskilde Festival` and
`Roskilde festival` are two rows. Yesterday's duplicate sweep compared names
exactly and missed it, so the real duplicate count is at least nine rows across
seven names, not eight across six. The sweep should fold case before comparing.

**Every fact their document states is correct.** That is worth saying plainly
rather than skipping past: Christian IV and the early 1600s, five ships at
Roskilde, Grauballe Man at Moesgaard, the rough transit times. Their "~350 km"
is generous against a real ~305 km, and it is the only number I could fault.
**The difference between the two documents is not accuracy. It is that one of
them can show its working and the other is asking to be trusted.**


---

# Amendment, 25 August, evening: it was tested and it cited

The Ærø test was run. **It passed all nine checks**, including provenance, which
this document treated as ours.

Four load-bearing citations were verified against the operators' own pages:

| Claim | Verdict |
| --- | --- |
| Sort Sol tour, Sun 11 Oct 2026, 16:30-19:00, 245 kr | **Holds.** On Marsk Hotellet's own list |
| Ribe VikingeCenter, 31 Aug to 16 Oct, Mon-Fri 10:00-15:30, 160 DKK adult | **Holds**, exactly |
| ÆrøXpressen Marstal to Rudkøbing, Thu 08:50 arriving 09:40, later at 11:10 / 13:30 / 15:50 / 18:10 | **Holds**, every sailing |
| Fynshav to Søby 16:20, runs Tue, timetable valid to 18 Oct, reservation void if not there 10 min before | **Holds**, including the 10 minutes |

**So the sentence at the end of this document is now too generous to us.** "One
can show its working and the other is asking to be trusted" was true of the
first guide and is not true of the second. It showed its working and the working
checked out.

## What survives, stated more narrowly

**1. It cited Rome2Rio for every driving time**, and `sourcePolicy.js:200` puts
`rome2rio` in `NEVER_OWN_SITE` beside tripadvisor and booking.com.
`GuidePage.jsx:1375` carries Oliver's own words about it from 19 August. Those
numbers are modelled by an aggregator, not queried from a router. On the class of
fact that appears most often in the itinerary, the citation points at something
that is itself estimating.

**2. The precision is uneven and nothing marks the boundary.** Ferries and museum
hours: exact, cited. Sælhunden, Cafe Nanas Stue, Landbogaarden, Quedensgård: no
citation at all, same voice. The Fanø return ferry, the one departure that
constrains the whole Monday, has no time on it. In a document where most
sentences are cited, **the uncited ones inherit the credibility of the rest**,
which is worse than citing nothing.

**3. Nobody checked it. A person did, afterwards, by hand.** Four for four is a
good rate and it is not a guarantee. Nothing in that pipeline can refuse a page
that is off-subject, notice a 2025 timetable read as 2026, or decline to answer.
`priceSource`, `factAge`, `absenceClaims` and a named person pressing publish
exist because those are different things.

**4. None of it persists.** Every fact was fetched once, for one traveller, in
one chat. Tomorrow's traveller fetches them all again. Ours are rows: dated,
redraftable, correctable once for everybody. **That is the difference between an
answer and an asset, and it is the only one here that compounds.**

## The uncomfortable read

That answer is very good and it is free. A traveller comparing the two today
would struggle to say why they would pay for ours **on itinerary quality**.

So the wedge is probably not a better itinerary. It is the three things a chat
window structurally cannot be: something that persists and gets corrected once
for everyone, something with a named person accountable for it, and **something
with a free bag of candy in it.** ChatGPT cannot give anybody ten per cent off at
Sømods Bolcher.

The Copenhagen work is the moat. The itinerary is table stakes.


---

# Layla, 25 August evening

Layla is the real competitor, not ChatGPT. It has already built the layer this
document recommends: a trip object with editable legs and stays, a map, live
flight prices, hotel deals, currency and units localised, a human upsell. **The
position "build the layer around the AI" is occupied, and funded.**

## What it does better, and we should take

**The day header.** `Day 1 · Oct 13 · 27°C · 4 Experiences · <one-line theme>`,
collapsed so eight days fit on a screen. Four facts and a title, scannable in
half a second. Best single idea on the page.

**The trip as an object rather than a document.** 131 buttons, 27 images. Every
leg and every stay carries a **Change**. We are already closer to this than to
ChatGPT (`legs`, `stayArea`, `recommendedStay`, journey steps exist) and we
render them as reading matter.

**Bases as first-class.** "Days 5-8, Mitoyo" is its own block with its own
paragraph. Our guide is day-by-day; where you sleep is the real structure.

**The trip checklist**, and Oliver's correction of it: *"quite robotic"*. The
idea is right and the execution is a capture form. `utils/briefPanel.js` is the
answer and the reasoning is in that file.

## What we must not take

**A daily temperature seven weeks out.** The trip was 12-20 October, read on 25
August, and every day header carried a specific number: 27°C, 26°C, 26°C, 24°C.
No forecast model reaches past about two weeks. Those are climate averages
printed beside real dates with nothing marking them, and ChatGPT explicitly
refused to do the same thing on the same question.

**That is an estimate given the visual authority of a measurement, in the header
of every day, by a funded competitor.** It is our opening rather than a
criticism: the same header, honest, is something nobody else in this comparison
can print.

**The generation theatre.** "Scanning 2000+ airlines", "Reading 1B+ reviews for
you", at 6%. Ours can carry a true number on every line and one line nobody else
will ever ship: `Dropped 1 stop nothing could confirm is open in October`.

**The persona.** "Ooh, a blank canvas! I love it", "balling out",
"backpacker-chic". Our voice rules already ban that register.

## What the hotel search revealed

The monetisation surface, read on 25 August. Three searches for one leg:

    Finding you accommodation in Ribe for 2026-10-10 to 2026-10-17 ...
    Finding you accommodation in Ribe for 2026-10-10 to 2026-10-13 ...   <- correct
    Finding you accommodation in Ribe for 2026-10-10 to 2026-10-17 ...

The traveller is in Ribe for **three** nights. Two of the three ask for the whole
seven-night trip, which returns the wrong prices, the wrong availability, and
silently excludes anywhere full on days they are not there.

**That is `avoid=ferries` in a different costume**, on the surface where it costs
money: a constraint goes out, an answer comes back, nothing checks the answer
matches the question. Three paid calls, two of them wrong.

**And the Ribe panel is empty.** "Hotels in Ribe / See all hotels", no listings,
no prices, no ratings. One price on the whole page. The page title is
`Travel Agent AI Layla: Free Travel Agent 2026|60% Off Hotels`, which states the
business plainly: the product is hotel commission and the itinerary is the
funnel. **There is no funnel in Ribe.** Their monetisation is empty in exactly
the places our library is about.

## The reviews, and the one defect worth building against

4.6 on Google Play, 4.1 on Trustpilot, so these are cracks rather than a verdict.
Three of the seven recurring complaints are **one defect**:

* wanted a train trip, kept being routed through airports
* asked for Faro, repeatedly got Lisbon
* entered hotels already booked; recognised in chat, then omitted from the
  itinerary or replaced with different ones

A person said a thing. The model was told. The itinerary broke it anyway.

**This repository already had the sentence for that**, written on 24 August about
`api/directions` and `api/search`: *a constraint sent is not a constraint
honoured.* Three API constraints were audited that day. **The traveller's own
constraints were never audited at all**, and they are the ones people cancel
over. `utils/constraintCheck.js` is that audit, one level up.

And complaint 7, from a Danish reviewer: they could use free ChatGPT and get
recommendations as good or better, so they cancelled. That is the churn reason
and it is the third independent confirmation of what this document already says.

## What Oliver named, which is the design brief

> *"Layla is very smart and advanced... BUT it feels very overwhelming and just
> pay here and pay here."*

Two separate faults and they want two separate rules.

**Overwhelming is 131 buttons.** The cure is the collapsed day list: one screen,
expand what you want, one primary action.

**"Pay here and pay here" is commerce living in the same layer as information.**
Prices on the map, "Book this trip" as the only verb, a discount in the page
title, a signup wall before the trip is visible, "Non-Refundable" on a stay
nobody asked for. There is nowhere to just look.

So: **an affiliate link may only appear attached to something the plan already
requires, never offered on its own.** That is stronger than
`INVENTORY_MAY_NOT_SELECT`, which only says inventory cannot choose. This says
inventory cannot APPEAR unattached.

**And on the map specifically: zooming in should get more real, not more
commercial.** Overview, then the base, then the day's walking loop with the
parking and the entrance. A price on a map turns a place into a product, and the
fly-down is worth having precisely because it is the opposite of that.
