# For Fable: two bad rejections and the coordinate underneath them

Oliver, 16 Sep 2026, on the "Argue with this draft" panel: *"what da fuck. Aalborg
st. is the closest to Rådhuspladsen in Copenhagen? And even when I give the fact
checker a direct ticket link, it rejects it."* And then: *"put a note to Fable to
check through this as well."*

This is a second Fable item alongside the API Direct pipeline review in
`HANDOFF_15SEP_AFTERNOON.md` section 0. It is separate work and it is more
urgent, because everything below is live and publishing today.

Evidence: his run log export, `After usage reset.odt`, runs 1 and 2. Every quote
below is from that log or from the panel itself.

---

## 0. WHAT I CHECKED AGAINST THE REAL WORLD

I fetched `oktoberfestdk.dk` myself before writing any of this.

- It is the event's own site.
- It says the event is in **Copenhagen, at Rådhuspladsen**, with direct metro
  access, on 17 to 19 September 2026.
- Its one entry price is **"Fra 50 kr."**, and it is admission, not parking.

So Gemini was right on the station, the draft was wrong, and Oliver's guess
about the 50 kr being a parking fee is the one thing here that is NOT a bug: the
price is real and the pipeline read it correctly. Worth saying plainly, because
he raised it and it would be easy to "fix" something that works.

---

## 1. THE ROOT CAUSE IS STEP 1, AND IT POISONS EVERYTHING DOWNSTREAM

Both runs fail in the same place, before a single research query is written.

**Run 1, Københavns Oktoberfest:**

> 1. Where this place is [google · ok] at 1.4s
> asked: run BEFORE the research, so the searches and the founder sources know which corner of Denmark this is
> got: 57.0414, 9.9131 via Google Places, which found it as **"Gammel Kærvej 11, 9000 Aalborg"**, Nordjylland (Aalborg Kommune)

That is an organiser's address in Aalborg, for an event on Rådhuspladsen in
Copenhagen. Everything downstream inherited it and every downstream step was
internally consistent and externally wrong:

> 2. Founder sources chosen: **scoped to Aalborg, in Nordjylland, on Jutland**
> 10. Nearest arrival point: **Aalborg St. (rail), 5 mins on foot**
> 12. Nearest arrival point, re-derived from Google's own address for this business, Gammel Kærvej 11: **Aalborg St. (rail), 5 mins on foot**

Aalborg St. is 5 minutes from that address. The measurement was correct. The
point it measured from was a different city.

**Run 2, TinderBox:**

> 1. Where this place is [fetch · ok]: 55.6287, 12.6492 via Nominatim, on the name, which found **"Tinderbox, Lufthavnstorvet, Kastrup, Tårnby Kommune"**
> 2. Founder sources chosen: asked: **scoped to Odense, in Storkøbenhavn, on Zealand**

TinderBox is a festival in Odense, on Funen. Nominatim matched something called
Tinderbox at Copenhagen Airport. Line 2 prints the contradiction on its own
face: **"Odense, in Storkøbenhavn, on Zealand"**. Odense is not on Zealand and
nothing compared those two halves.

**The guard that should have caught this already exists, one layer away.** The
festival drafting prompt carries a long rule headed THE VENUE IS WHERE THE EVENT
HAPPENS, NEVER WHERE THE ORGANISATION SITS, written after a Copenhagen food
festival was drafted with its secretariat in Valby. That rule governs the MODEL.
Step 1 is not the model. It is a name-only geocode with no check against
anything, and it runs first, which is the worst possible order: the wrong answer
is treated as ground truth by the source scoping, the arrival point and the
journey.

### What Fable should settle here

- **A name-only geocode is a candidate, not a location.** What would it cost to
  check it against the operator's own page before scoping anything to it? The
  pipeline reads that page at step 13 anyway. Run 1 would have had Rådhuspladsen
  in hand from its own research, twelve steps after committing to Aalborg.
- **The region contradiction is free to catch.** "Odense, in Storkøbenhavn, on
  Zealand" is checkable with what `geography.js` already knows. A town and a
  landmass that cannot both be true should stop the run, not label it.
- **The festival prompt's own rule should apply to the geocoder.** An address
  that looks like an office, or that sits in a different kommune from the town
  the draft names, is the case the rule was written for.

---

## 2. THE HEADLINE ON A REJECTION WAS A HARDCODED CLAIM (fixed tonight)

`StudioAssistant.jsx` printed one sentence over every rejection:

```
Not applied, a source says otherwise. <evidence>
```

It was true of exactly one of the three ways a claim gets rejected. The two he
hit were the other two:

- **TinderBox ticket link.** Evidence: *"shop.tinderbox.dk returned almost no
  readable text, which usually means the page builds itself in JavaScript, so
  nothing was concluded from it."* No source said otherwise. No source said
  anything. Confirmed in the log: steps 19 and 20, `queue.tinderbox.dk` and
  `shop.tinderbox.dk`, both **firecrawl · FAILED**.
- **Oktoberfest station.** Evidence ends: *"That makes Aalborg St. clearly wrong
  as the nearest station, and supports the proposed correction to Rådhuspladsen
  (Metro)."* The evidence argued FOR the change and the headline announced a
  source against it.

Changed to `Not applied. <evidence>`. The evidence was accurate in both cases and
now carries the reason on its own. This is the same failure `correction.js`
already guards against at the verdict-versus-reasoning level, one layer up, in
the one line nothing was comparing against anything.

**17,293 assertions pass and the build is green with that change in.**

---

## 3. THE REJECTION ITSELF IS STILL WRONG, AND THIS ONE IS FABLE'S

Fixing the sentence does not fix the decision. Three things stack up, and Fable
should rule on each.

**a. The bar to CHANGE a field is higher than the bar that SET it.**
`settleCitation` returns `verdict: ""` when a cited page supports the correction
but is not the operator's own site: *"supporting evidence rather than the
deciding source."* Meanwhile the value it is protecting, "Aalborg St.", was
never sourced at all. It came from a geocode of the wrong address. A rule that
demands a primary source to remove an unsourced error will keep errors.

**b. `oktoberfestdk.dk` was judged not to be the operator's own site.**
`ownSiteFor` returns "" unless `entry.website` is a real URL AND
`hostMatchesName(url, name)` passes. For "Københavns Oktoberfest" against
`oktoberfestdk.dk`, that test is doing real work and may be failing on the
Danish possessive. Worth checking directly: it decides whether a page can settle
anything.

**c. `nearestStation` is in `MEASURED_FIELDS`, so the assistant can never fix
it.** `isPipelineOwned` protects `travelTime`, `ticketStatus`, `website`,
`nearestStation`, `lat` and `lon` from correction, and `keepMeasured` restores
them afterwards. That is right when the measurement is trustworthy. When the
coordinate is wrong, it means the one field a human can see is wrong is the one
field he is structurally unable to correct. Both halves of that are defensible
on their own and together they are a trap.

The question for Fable is not "loosen the rules". It is: **what is the escape
hatch when a measured field is measured from the wrong point?** A candidate
shape, for him to argue with rather than adopt: a correction that names a
measured field does not edit the field, it invalidates the MEASUREMENT, drops
the coordinate and the journey with it, and sends the row back for a re-measure.
That keeps the rule that a human may not hand-write a measured value, and stops
a wrong coordinate being permanent.

---

## 4. ONE MORE THING IN THE LOG, NOT YET RAISED WITH OLIVER

Run 2, step 28:

> What the pages say a ticket costs [fetch · FOUND A GAP]
> got: **1395 DKK, from danceus.org**

An American dance-listings site is being read for the price of a Danish
festival, and it won the slot because the operator's own shop could not be read.
The price checks behaved correctly afterwards and flagged the draft's own
figures as unsourced, so nothing wrong was published. But the source order is
letting a page like that into a price question at all, which is the same class
as the Facebook carve-out in the other Fable note: what may SURFACE a candidate,
and what may DECIDE one.

---

## 5. THE TICKET PRICE THAT NOBODY CHARGED (fixed tonight)

Oliver, on the same draft: *"'3-day ticket 250 DKK; 1-day ticket 120 DKK' was
what Gemlyx said for Tinderbox.. which is very wrong."*

The log caught it three times and shipped it anyway. Steps 27, 30 and 42 say the
figures are not on the official site and *"on no page this run read"*. And in the
DECISIONS block, the step that put them there:

> ticketInfo: believed the research (extracted), overruled the writer (**"2027
> weekend tickets are on sale through an external ticket shop; no price listed on
> the official site."**)
> value: 3-day ticket 250 DKK; 1-day ticket 120 DKK
> rule: A value stated on a page beats one composed by a writer, **and a value
> nobody stated stays empty.**

The writer was right, the shop could not be read, and the extraction overruled
that honest sentence under a rule whose own second half forbids what it did.

**The hole was two different meanings of "stated on a page".** `numbersTraceable`
checked the digits against the whole research blob, every snippet and title;
`tracePrices`, which found the problem later, checks the pages that were OPENED.
"250" and "120" are ordinary numbers and a Danish search blob is full of them.

Fixed narrowly: money in a glance value must now appear as MONEY on a page this
run read, using `pricesIn`, the same reader `tracePrices` uses. Refused rather
than repaired, so the writer's value stands, which on this run was correct.

Also note for Fable: `accommodationTip` went the same way in both runs, replaced
by "Nobis Hotel Copenhagen" and by the bare word "Odense". Same rule, no digits,
so nothing gated it. Worth deciding whether an extraction that produces a
fragment should beat a written sentence at all.

## 6. THE 2022 TICKET LINK (fixed tonight)

> 39. Ask ticketmaster.dk directly
> got: https://www.ticketmaster.dk/event/partout-tinderbox-**2022**-billetter/484597
> — bookable, and vetted as being about this place

It was about this place. That was the whole of the vetting. The draft is for June
2027. A stale ticket link is the worst wrong link this site can carry, because it
is bookable and a reader can reach a checkout on it.

`pickTicketUrl` now takes the edition year off the draft's own date and refuses a
URL whose path names a different one. A URL with no year is untouched, since most
ticket pages carry none, and the id at the end of a Ticketmaster path is not read
as a date.

## WHAT IS ALREADY DONE

- The rejection headline (section 2).
- The money gate on extracted glance values (section 5).
- The edition-year filter on ticket links (section 6).
- Nothing else. The geocode, the own-site test and the measured-field escape
  hatch are all behaviour changes in the middle of the publish path, and the
  cheapest hour Fable can spend is on those three before any of them is touched.
