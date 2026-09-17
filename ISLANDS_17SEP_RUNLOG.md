# The seven island runs, read through

Oliver, 17 Sep 2026, handing over `After usage reset.odt`: *"This is from recent
islands. Check them well through."*

Seven island drafts, 16 Sep between 16:59 and 17:27: Endelave, Lyø, Bornholm,
Langeland, Fejø, Bjørnø, Avernakø. Every quote below is from that log.

Three things in it are fixed tonight and marked so. The rest are behaviour
changes in the middle of the publish path and are written down rather than done.

---

## 1. BORNHOLM IS PUBLISHED AS 10 HOURS 44 MINUTES FROM COPENHAGEN

The worst single thing in the batch, and it is live.

> travelTime: believed Google Directions (measured), overruled the model ("4h25min⛴")
> value: **10h 44min🚂**
> rule: A measured duration always replaces a written one.

Copenhagen to Bornholm is about three hours by train and ferry through Ystad, or
about five and a half on the Køge boat. 10h 44min is the number a reader sees on
the card, and it is the difference between a weekend and "not this trip".

**The run says so itself, thirty steps later, and nothing listened:**

> 41. The journey, against what was measured
> "10h 44min" is presented as time on board, and it is the DOOR TO DOOR figure:
> it includes the walk at both ends and the wait. **The measured time moving is
> 3h 13min.**

So one step wrote the figure and another step diagnosed it correctly, in the same
run, and the diagnosis was `discarded`. The prose check can see the problem and
has no authority over the field.

Two separate causes, and both are worth fixing on their own:

- **The wait is inside the number.** A 10h44 door-to-door to an island means
  Google found a sailing the next morning. What a reader wants is the journey,
  not the wait for it. `journeyParts` already separates moving time from waiting.
- **It was measured to the wrong point.** Step 8: the destination was
  `Åsedamsvej v. Oxholmvej`, a bus stop somewhere in the middle of Bornholm,
  three minutes' walk from the island's geometric centre. Nobody travels to
  there.

## 2. AN ISLAND'S COORDINATE IS ITS CENTRE, AND EVERYTHING IS MEASURED FROM IT

This is the root of most of the rest, and it is specific to the new type.

A town's coordinate is a place people arrive at. An island's is a point in a
field. Five of the seven runs show what falls out of that:

| draft | "nearest arrival point" | what it is |
|---|---|---|
| Bornholm | Åsedamsvej v. Oxholmvej, 3 mins | a rural bus stop |
| Langeland | Simmerbølle Kirkevej, 15 mins, then Strandlystvej / Kastanievej, 4 mins | residential streets |
| Bjørnø | **Avernakø Havn (færge), 57 mins on foot** | **a different island's harbour** |
| Endelave | Endelave Havn (færge), 45 mins | right place, unwalkable distance |
| Fejø | Fejø Havn (færge), 30 mins | right place, unwalkable distance |

Bjørnø is the one to look at twice. The pipeline offered the harbour of
**Avernakø**, another island entirely, and measured a **57 minute walk** to it
across open water. The measurement is not wrong about anything; the question was.

The walk gate added on 16 Sep (`ARRIVAL_WALK_LIMIT`, 25 minutes) keeps Bjørnø,
Endelave and Fejø off the At a Glance row, which is the right outcome by
accident. It does not help Bornholm or Langeland, whose wrong answers are three
and four minutes away.

**The fix worth arguing about:** for an island, the arrival point is the ferry
harbour or the airport, and the journey is measured TO the harbour, not to the
centroid. The pipeline already finds the harbour on four of seven. A reader
arrives at a harbour; the centre of the island is where they go afterwards.

And the second consequence of the centroid, which is quieter:

> 11. The journey was measured to a coordinate we replaced
> 3.8 km apart, so the measured 3 hours 47 mins (192 km) is about the earlier point

Langeland and Endelave both lost their transit journey this way, correctly, and
for an island this will happen nearly every time: a centroid and a postal address
are never the same point. Five of seven runs then say *"no transit itinerary was
measured, so nothing here can be checked"*, which disables the journey check as
well as the journey.

## 3. THE PRICE CHECK CONTRADICTS ITSELF INSIDE ONE RUN

Fejø, steps 23 and 25, thirty seconds apart:

> 23. Prices against the official site
> **NOT FROM THE OFFICIAL SITE: 160 DKK, 40 DKK, 65 DKK.** These figures do not
> appear anywhere in the official site's own text, so they came from a search
> result or a blog rather than from whoever charges it.

> 25. Where the price came from
> **160 kr DKK is on lollandfaergefart.lolland.dk**, the highest-ranked page read
> that states it: https://lollandfaergefart.lolland.dk/prices-and-booking

Both ran again after the correction and said the same two things again. The fare
is right, it is on the ferry operator's own booking page, and the run accuses
itself of inventing it.

The cause is that "the official site" resolved to `fejoeliv.dk`, a community
site, while the fares live on the county ferry operator's page, which step 19 had
already demoted:

> lollandfaergefart.lolland.dk (its newest date is about 8 months old) kept as
> background only

**Two rules collide here and neither is wrong on its own.** One site is "the
official site" and a different one is the authority on the fare. For a ferry the
timetable operator IS the primary source for the price, and `VERIFY_PROMPT`
already says exactly that in its own words: *"For a ferry it is the operator's
own timetable."* The price check does not know it.

## 4. THE OPERATOR'S OWN SITE KEEPS BEING DEMOTED FOR LOOKING OLD

Small Danish island ferries run plain sites that nobody redesigns. The age gate
reads them as dead.

- Bjørnø: `bjoernoefaergen.dk` — *"the newest year on this page is 1994"* →
  background only. Then step 16: **"NO operator page was read."**
- Fejø: the ferry operator, 8 months old → background only (section 3 above).
- Lyø and Avernakø: `lyø.dk` and `da.wikipedia.org`, newest year 2022 →
  background only.

`MAX_FACT_AGE_MONTHS` is 6. A ferry company that has not touched its footer since
1994 still sails today, and its page is still the only place the crossing is
described. The gate is right that the page cannot date a price; it is wrong that
the page cannot be the operator.

Worth separating those two, since they are already separate ideas everywhere
else in the codebase: **who is speaking** and **how fresh what they said is**.

## 5. A UK RESELLER READ AS A SOURCE, THE REAL OPERATOR RANKED AS A BLOG

Langeland:

> 12. Source read: **ferrysavers.co.uk** — 5,330 characters
> 15. Source read: **ferrysavers.co.uk** — 5,294 characters
> 18. Whose words the checks will use: the operator's own page was read, plus a
> listing on **ferrysavers.co.uk**, visitlolland-falster.com

Bornholm:

> 14. Source read: **aferry.com** — 4,867 characters
> 22. Source order: bornholm.info (official) > visit-bornholm.com > visitdenmark.dk
> > visitbornholm.com > trip.com (blog, 2026) > getyourguide.com (blog, 2025) >
> via.ritzau.dk (blog, 2025) > **kombardoexpressen.com (blog)**

Kombardo Expressen runs the Køge to Rønne boat. It is ranked last, as a blog,
below trip.com and GetYourGuide. It is also in your own Essentials list as a real
operator. Meanwhile `bornholm.info`, a tourism portal, is "official" and is where
the 199 DKK came from.

Two ferry resellers were read for 15,000 characters across two runs while the
actual shipping companies were either unread or ranked beneath aggregators.

## 6. THE TICKET LINK ON AN ISLAND *(fixed tonight)*

Seven island drafts, two bookable ticket links, both wrong:

> Langeland, step 32: https://www.ticketmaster.dk/event/nicolaj-lange-et-kik-ind-i-langeland-billetter/1484638276
> — **bookable, and vetted as being about this place**

It is a stand-up comedian's show called "Et kik ind i Langeland", a pun on his own
name, playing at MCH Herning Kongrescenter on 13 May 2027. Herning is on Jutland,
two hundred kilometres from the island.

> Bornholm, step 34: https://www.ticketmaster.dk/venue/musikhuzet-bornholm-ronne-billetter/mub/203
> — bookable, and vetted as being about this place

A concert venue in Rønne, which is on the island and is not it.

The vetting is not broken: both pages really are about something called Langeland
or Bornholm, which is all a name test can ask. The mistake is a level up. **An
island is not a thing you buy admission to**, so the right number of ticket links
for one is zero.

Both hunts now ask `typeHasAdmission(type)` first. Islands only: a TOWN is a
different argument, because a city card is a real product on Tiqets and the
Copenhagen Card is already an affiliate row. It also saves two Tavily searches on
every island draft.

## 7. THE GLANCE EXTRACTION IS MAKING EVERY FIELD WORSE

This is the one that surprised me. Across all seven runs, the extraction
overruled the writer nineteen times, and I cannot find one where the new value is
better:

| field | the writer wrote | what replaced it |
|---|---|---|
| bestTimeGlance | `May-Sept` | `Summer months` |
| bestTimeGlance | `May-Sept` | `Spring, summer and early autumn` |
| bestTimeGlance | `Apr-Oct, blossom to apple harvest` | `When the fruit trees blossom, when the sun is warm, or when the apples are ready to eat` |
| recommendedStay | `Two to three days` | `3 to 5 days` |
| recommendedStay | `3-4 days minimum, up to a week` | `Minimum 3–4 days; one week for cycling routes, hiking trails and relaxed exploration; two weeks for slow travel` |
| recommendedStay | `A day trip or one night` | `2 to 3 days` |
| accommodation | `Book cars and rooms ahead for July` | `Hotels, guesthouses, holiday homes and campsites` |
| accommodation | `Few options, book ahead in summer` | `Limited accommodation` |
| accommodation | `Book Spodsbjerg or coastal cottages ahead in summer` | `Campsites and holiday homes` |

At a Glance is a row a reader scans in a second. `May-Sept` is a glance value.
"When the fruit trees blossom, when the sun is warm, or when the apples are ready
to eat" is a sentence from a tourist board's marketing page, and it is now in a
field sized for six words.

The rule doing this is sound and its own comment says why: *"At a Glance is data.
A value stated on a page beats one composed by a writer."* It was written against
a model inventing prices. It is being applied to fields where the writer is not
inventing anything, he is COMPRESSING, and compression is the whole product.

**A shape gate would settle it without touching the rule.** An extracted value
that is longer than the written one, or that carries no number where the written
one did, is not data beating prose. It is prose beating prose.

Two smaller things in the same place:

- `accommodationGlance` on Avernakø went from empty to `Avernakø Landhotel`,
  which IS the rule working: a real name beats nothing.
- Bornholm's extracted value carries an en dash (`3–4 days`). `stripDashesDeep`
  catches it at render, so no reader sees it, but it is stored that way.

## 8. THE PIPELINE FLAGS ITS OWN SENTENCE

Fejø and Lyø, the last step before publishing:

> 45. Stated absences — FOUND A GAP
> "Google returned no public transport itinerary for this route, which is a fact
> about the routing feed and not about the place" states that something does not
> exist.

That sentence is in the draft because a prompt told the writer to put it there
when the routing comes back empty. The absence check then reads it as an
unsupported claim and feeds it to the correction as contradicted, which triggers
a rewrite. On Lyø that rewrite cost **200 seconds of a 425 second run**.

The check is right in general and wrong about this one sentence, which it can
recognise by its own words.

## 9. SMALLER THINGS WORTH ONE LINE EACH

- **Wikipedia ranked as the operator's own site.** Avernakø, step 23:
  `da.wikipedia.org (official) > lex.dk (reference) > nn.wikipedia.org
  (reference)`. The same encyclopedia is "official" and "reference" in one list.
  It happens when an island has no site of its own and the pipeline takes the
  Wikipedia article as its `website`; every check that says "the operator's own
  page" then means Wikipedia.
- **Punycode in the log.** `xn--bjrn-hrac.net` and `xn--ly-mka.dk` are bjørnø.dk
  and lyø.dk. You read these logs constantly; they should show the name.
- **Bjørnø had no operator page at all.** Firecrawl refused bjørnø.net twice
  (`firecrawl-refused`, steps 11 and 14) and it was the top-ranked official
  source. The draft was written from a tourist board listing.
- **Two Firecrawl 500s on ticket pages**, langelandslinjen.dk and
  kombardoexpressen.com, both of them the page the operator names as where its
  tickets are sold.
- **Lyø published a price nothing had read.** `typicalCosts: "Ferry prices start
  at 400 DKK for private cars under 10 m"`, while step 27 says *"no page that was
  read states this figure"*. This is the TinderBox failure exactly, and the money
  gate added on the night of 16 Sep refuses it now. These runs are from earlier
  that evening, so it is worth re-running one island to confirm it in the log.
- **Perplexity ran out of quota mid-run** on Avernakø, killing the invented-claim
  check: *"You exceeded your current quota"*. Worth a founder note rather than a
  discarded step, since that check is the last line of defence.

---

## WHAT IS FIXED TONIGHT

- **The ticket hunt is off island drafts** (section 6), which removes both wrong
  bookable links and two searches per draft.
- **A pasted link is read even without https://**, and a stale or social one
  cannot settle anything. Separate note, same session.
- Nothing else. Sections 1 to 5 and 7 to 8 are all in the publish path and all of
  them are a decision about which of two correct-looking rules wins, which is
  yours to make rather than mine.

## IF ONLY ONE THING GETS DONE

Bornholm says ten hours forty-four minutes on a live page. Everything else here
is a process that produced a defensible answer badly. That one is a number a
reader will act on.
