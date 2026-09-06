# Event research — 12 runs read against the code, 5 Sept 2026

SUK excluded as you asked. Eleven runs, all festivals, all from this evening.

There is one finding here that causes most of the others, and it happens in the
first second of every run.

---

## 1. The locator refuses the venue, and a festival IS held at a venue

**"Where this place is" came back with nothing on 9 of the 11 runs.** Every one
of them printed the same sentence:

> Google's first listing for this search is "X", which is not Y. Nothing was
> taken from it: no website, no address, no hours, no coordinate. **This is what
> a search for a street or a square usually returns**, whichever business on it
> Google ranks first.

That explanation is written for a different failure. These are not streets. Look
at what Google actually returned and what got thrown away:

| Draft | Google found | What it is |
|---|---|---|
| Danish Travel Show | **MCH Messecenter Herning** | the venue it is held in |
| Bellahøj Kræmmermarked | **Bellahøj Hallerne** | the venue it is held at |
| Sebbersund Vikingemarked | **Vikingebyen** | the site it is held on |
| Teaterfestival for små og store | Sjællands Teater (Teatret Fair Play) | a theatre in it |
| Danish Outdoor Festival | **Friluftsfestival.dk** | the event's own site, in Danish |
| fantasyfestival | Fantasydage | very likely the same event |
| Vinterlys Festival | Strib Vinterfestival | a different festival — **correctly refused** |
| Næstved Food Festival | Næstved Metalfest | a different festival — **correctly refused** |

Two of those eight refusals are right. Five are the pipeline throwing away the
correct coordinate because the venue is not called the same thing as the event.

**A place has one name. An event has a name and a venue.** The rule assumes the
first and every festival in Denmark is the second.

### What it costs, in the same runs

The refusal is not one missing field. It cascades:

- **5 of 11 drafts end completely unplaced**: *"no Danish postal address anywhere
  in the research, so this draft stays unplaced"* (Danish Outdoor, Vinterlys,
  Danish Travel Show, Northern Winter Beat, fantasyfestival).
- With no region, the log says it plainly: *"every place-scoped source is left
  out"*. Your four founder sources stop being scoped to the right corner of
  Denmark.
- **"no transit itinerary was measured" appears 14 times.** No coordinate, no
  journey, so the travel time on the card is written rather than measured.

One refusal in second one degrades everything after it.

### What I would do instead

Do not loosen the name rule. Accept a venue when something else corroborates it,
and record it as a venue rather than as the event:

1. **The returned name appears in the research text.** "MCH Messecenter Herning"
   is all over a Danish Travel Show page. Free, and it is the strongest signal.
2. **The returned town matches a postcode found in the research.** You already
   read postcodes in the second attempt; this reuses that.
3. **The result's own website matches the event name.** `hostMatchesName` already
   does this and already exists.

Any one of the three is enough, and the provenance line should say *"the venue,
corroborated by the research"* rather than claiming it is the event's own point.

---

## 2. The operator's own site is in the listing pile, three more times

I reported this shape this morning. Here it is again, in tonight's runs, where
the domain sitting in the "only a listing" list **is the operator**:

```
Bellahøj Kræmmermarked   NO operator page was read. Only a listing on
                         markedskalenderen.dk, bellahojmarked.dk, ...
Danish Travel Show       ... hotelherning.dk, cantonfair.net,
                         expostandbuilders.com, danishtravelshow.com
Northern Winter Beat     ... winterbeat.dk, tickster.com, images.ctfassets.net
```

`danishtravelshow.com` and `winterbeat.dk` both pass `hostMatchesName` against
their event names today, with no new code. The page was fetched, read, and filed
as a ticket shop, which silently disables the language check, the
date-against-official-site check and the price-against-official-site check.

Five of eleven runs read no operator page. At least three of those five had it.

---

## 3. The correction pass reports a gap and then does not act on it

The price check runs twice, before and after the correction, and on four runs it
printed **the identical finding both times**:

```
25. What the pages say a ticket costs        FOUND A GAP   nordisk.eu states 0 DKK, draft states 280
39. ... after the correction                 FOUND A GAP   nordisk.eu states 0 DKK, draft states 280
```

Same on Næstved (12 DKK), Sebbersund (10 DKK) and Northern Winter Beat (500 vs
680). The second reading can only ever repeat the first, because nothing between
them acts on a price gap. Two identical FOUND A GAP lines in one run read like a
bug even though each is true.

Worth noting the Sebbersund one is still citing **vikingeskibsmuseet.dk**, the
Roskilde museum, for a market near Nibe. That is the wrong-host citation I
flagged this morning: the log names `hosts[0]`, never the page that carried the
figure.

## 4. And twice it caught itself, correctly

```
Danish Outdoor Festival   THE CORRECTION DID NOT LAND. "Camping itself opens Thursday at 10:00"
Danish Travel Show        THE CORRECTION DID NOT LAND. "away from central Herning"
```

Both times the rewrite was asked to remove a contradicted claim and did not, and
the run said so and told you not to read the banner as a pass. That is the
machinery working exactly as designed, and it is the reason I trust the rest of
this log.

## 5. Smaller

- **Ticketmaster answered nothing on 11 of 11 runs.** *"no Danish listing with
  this name"* every time, plus two `site:ticketmaster.dk` searches per draft on
  top. That is three calls per draft for an answer that has not arrived once in
  sixteen runs across two days. Worth a decision rather than a fix.
- **The postcode fallback captures junk.** It read `4700 Næstved Get` and
  `1165 Kbenhavn K` — a trailing word swept into the address, and `ø` stripped
  out of København. It still geocoded, so this is cosmetic today and a wrong
  match tomorrow.
- **Sources that could not be read at all**: maps.apple.com, tickster.com,
  vinterlys.rksk.dk, northside.dk and shop.northside.dk all failed. NorthSide
  failed three times on its own domain, which is why that run fell back to *"the
  centre of Aarhus, because no lookup found the place itself"*.

---

## Order I would take them

1. **The venue rule.** It is the root of the unplaced drafts, the unscoped
   sources and the unmeasured journeys, and the corroboration test is free.
2. **The operator test**, which is one condition and switches three dead checks
   back on for every future draft.
3. **Name the host that carried the price**, or hedge it the way `whoSaid`
   already does.

The first two together would have changed the shape of most of tonight's runs.
