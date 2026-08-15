# The legs, 15 August 2026

You sent `gemlyxtravel.com/guide/ofbyfygz4de` with "sick of logistics being our
problem". I read the live page in your Chrome, then pulled the guide object out
of the running React tree so I was working from the stored Google responses
rather than from what the chips happened to render. Fable read the whole
resolution chain in parallel.

Suite is 4487, up from 4463. Build clean. Everything written to your disk.
**Nothing committed, nothing pushed.**

---

## The two wrong numbers, measured

| leg | Gemlyx said | Google says |
|---|---|---|
| Den Gamle By → ARoS | ~24 mins by train/bus, 16 of them walking | 10 min walk, 700 m |
| ARoS → Aarhus Ø | ~1 min on foot | 20 min, 1.3 km |

Both are one line of code, and it is not in the routing.

## `towns` was in the pool that decides what a stop IS

`lookupRealPlace` matches a stop name against every place Gemlyx knows, in three
tiers. The middle tier says: the stop CONTAINS the entry's name, so the stop is
the more specific of the two. "Ribe VikingeCenter" contains "Ribe", so the stop
wins. That is right for every pool except one.

`towns` was in it. So:

    "Aarhus Ø"                 contains "Aarhus"   -> matched the TOWN of Aarhus
    "ARoS Aarhus Kunstmuseum"  contains "Aarhus"   -> matched the TOWN of Aarhus
    "Aarhus H"                                     -> the TOWN of Aarhus
    "Aarhus Street Food"                           -> the TOWN of Aarhus
    "Kolding City Centre"      contains "Kolding"  -> the TOWN of Kolding

at the **top** of the resolution chain, carrying the town centre coordinate,
flagged `precise: true`, because a published row is normally the most precise
thing there is.

Everything downstream then behaved correctly on a false premise.

**The geocoder was skipped.** `hasPreciseCoords` saw a precise coordinate and
did not call Nominatim. Your guide's `_geo` has entries for Den Gamle By,
Latinerkvarteret, Godsbanen, Møllestien, Koldinghus, Trapholt, Økolariet,
Spinderihallerne and Glud Museum, and **no entry for any of the five stops that
name their own town**. That is the fingerprint, on your own data.

**Google was asked about the wrong point.** `directionsEndpoint` sends a bare
coordinate pair when the coordinate is precise, so ARoS went out as the middle
of Aarhus. The stored response proves it: 3230 m and a `bus 3A`, for a leg that
is 700 m. Google measured a real journey, accurately, to a place that is not
ARoS.

**The collapse guard could not fire.** `legDistanceKm` refuses a distance when
both ends are imprecise and land on the same point. Both ends here said
*precise*, so 0 km survived, and `estimateMinutes`' `Math.max(1, …)` printed it
as "~1 min on foot".

**And three cards said "Town".** Aarhus H, Aarhus Street Food and Aarhus Ø each
carried the type badge and the ↗ link of the Aarhus town page. Same line.

A town row now answers an **exact** match and nothing else. It keeps the
widening tier, where the stop is spelled shorter than the row ("Nørresundby"
against "Nørresundby (Aalborg)") and the town is the right answer. I tried
dropping it there too and could not write an assertion that justified it, which
is its own answer.

## Four more holes in the same class, closed

**An upgrade did not have to be an improvement.** When Google says a walk is
over the 20 minute cap, the leg is re-routed. That re-route took any answer that
was not an error. On your Kolding day it stored a 32 minute bus in place of a 33
minute walk, and 18 of those 32 minutes were themselves on foot: a ticket, a
timetable and a change of vehicle to save one minute, with the leg list saying
so underneath. It has to save five minutes now or the walk stands.

**The rescue path had none of the guards the main path has.** The walking retry
that runs when transit finds nothing took `!wdata.error`: no usable() check, so
a zero minute answer went straight in, and no cap, so a 3.9 km leg with no bus
could be stored as a 55 minute walk under a transit cache key, where the render's
plausibility cap is Infinity. Every guard was missing on the one path that runs
when the main path has already failed.

**"Precise" did not mean precise in the Maps link.** `preciseCoord` promised
"NOT the town-center fallback" in its own comment and returned whatever row
matched, town centres included, with no look at the flag. That is why your Maps
link for ARoS → Aarhus Ø opened with a destination Google labelled "Aarhus".

**The no-route branch had its own threshold.** It accepted any leg up to 3 km as
"a short walk", which at the route factor is about 54 minutes, printed under a
rule that says 20. Four different walkability numbers existed in the codebase
(1.1 km, 1.5 km, 3 km, 4 km). That one is gone.

And the collapse guard is now a floor as well as a provenance test: two
separately named stops with a leg written between them are never 150 m apart,
and a venue measured against the middle of its own town is not a distance.

## "Really? With all the APIs?"

Two separate things, and you were right about one of them.

**The number.** `FORECAST_HORIZON_DAYS` was 6, because `api/weather.js` sliced
MET Norway's timeseries to 7 buckets. MET Norway carries about ten days. We were
throwing away three days of forecast we had already been sent and telling a
traveller nine days out that none existed. Ten buckets now, horizon 9, and the
suite ties the two together so neither can move alone.

**The trip in front of you was not that.** 26 October read in mid-August is 72
days out. Nothing forecasts that, and the ten year normals are the honest
answer. What was wrong there was the writing: eleven words of apology before any
content, and "check again a week before you fly" on a guide whose own transport
note says you arrive by train from Hamburg. It now leads with the temperatures,
says why rather than only that, reads the wait off the constant, and does not
assume an aeroplane.

**And three of your five days had no weather at all.** Days 3, 4 and 5 showed
nothing while the note above them said "on the days planned". The point for each
day was resolved from the stop's NAME through two matchers that both end at
`TOWN_COORDS`, which holds 34 towns. Day 3 was Koldinghus, Trapholt and Kolding
City Centre, and Kolding is not one of the 34. Day 4 was Glud Museum, Økolariet,
Spinderihallerne. Day 5 was Godsbanen and Møllestien. Eight stops, not one town
name among them we hold a coordinate for.

Every stop carries its own `town` as a stated field, and the guide's fresh
geocodes were computed a few lines earlier and not passed in. Both are read now.
And when the note covers fewer days than the trip has, it says so.

## One thing that is not logistics, from the same page

Your KEEP IN MIND says, in the guide's own words:

> Note also that Trapholt is currently closed for renovation, so check its
> official site for the latest reopening details before including it in your
> plans.

Trapholt is Day 3's 13:30 stop, for two hours.

The model that wrote the warning built the day, and told the reader to decide
something it had already decided for them. Nothing compared the two, because
they are different fields and every gate reads one field at a time.

`closedButPlanned` now does, and the hard part is not finding the word "closed".
The same paragraph carries an honest caution about a late-October visit, and a
gate that cannot tell a caution from a statement gets switched off inside a
week. So the test runs on the **clause**: the stop has to be named in the same
clause as the closure, and that clause has to state it rather than hedge it.
"so check its official site" arrives later and cannot rescue the first clause,
which is right, because a reader given a stop at a time, for a length of time,
has already been told it is on.

## What I did not touch, and why

**Where you sleep contradicts where you are.** MONEY says "basing in Aarhus for
five days". Day 3's stop text says "before the train back to Aarhus". Day 3's
Where to stay says "Stay in central Kolding". Day 4 says "Base yourself in
central Vejle". The header says 4 TOWNS and "you change town 3 times" for what
is one base with day trips. Same class as Trapholt and gateable the same way,
but it needs a rule about what a day trip IS, and that is yours.

**"an affordable hostel from $76"** sits two cards from "from 750 DKK". Dollars
in a Danish guide.

**NEARBY, WORTH KNOWING ABOUT** still lists 2027 festivals, and the photo-less
hero is still 230px of nothing. Both from last night, both still yours.

## Before you push

33 of 34 mutations went red against the assertion written for them, and the
survivor changed the design rather than being papered over. But all of this is
still unrun by a real click. One guide build through Aarhus would tell you more
than another thousand assertions from me, and it is the one thing I cannot do.
