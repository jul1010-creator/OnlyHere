# Handoff, 26 September, later: where the beds are

Batch 128. **On your disk, not pushed.** 21,934 checks pass (from 21,857), the build is clean, and every new rule was broken on purpose to confirm its test goes red (8 of 8).

> "I think we should program it, so it has awareness of where the hostels are located and where summerhouses are located." Then: "Just go through it all."

---

## What was read

**Every hostel in the country.** The 50 on Danhostel's current list were each checked on their own page, and 11 private hostels were checked on their own sites (not booking aggregators), plus Kerteminde, which uses the Danhostel name but isn't on its list. The finding is starker than Aalborg:

- **A bed in a shared room is sold in nine towns only:** Copenhagen, Aarhus, Frederikshavn, Fjaltring, Ribe, Rødding, Tønder, Vordingborg and Svendborg.
- **Most Danhostels sell whole rooms**, family rooms included. Aalborg and Skagen are rooms only.
- **Odense has no checked hostel at all.** Odense City has closed and Kragsbjerggaard has left the network.
- **Most Copenhagen dorms are adults only:** Generator, Steel House, Next House, MEININGER, a&o and Sleep in Heaven (18 to 39). A family takes a room.

**70 sommerhus areas.** Each one was confirmed on Sol og Strand's, Dansommer's, Novasol's or Feriepartner's own area page, with coordinates from the Danish place-name register.

**No prices in either list**, and a test enforces that. Prices keep their own dated home.

Files: `src/data/stayPlaces.js`, `src/utils/stayAwareness.js`.

## What the guide does with it

1. **The hostel chip's sentence is now built from the list**, not written by hand about one town. It names the nine dorm towns, Aalborg and Skagen as rooms only, Odense as having none, and says Copenhagen dorms are adults only.
2. **Hostel chip, every night that needs a bed:** the checked hostels within 25 km go in as context the model may name from, the same way the island directory works. Five at most, and the ones that suit this traveller come first. A night with no dorm bed nearby says so plainly and names the nearest real one. With children, adults-only dorms are marked. When an exact day was given, a hostel shut that night is flagged from its own printed season.
3. **Sommerhus, day one:** the five checked coasts nearest the WHOLE trip, measured to its furthest stop. Each comes with the family places Gemlyx has published within 35 km. That list is worked out at build time, never stored, so a park you publish tomorrow shows up on the right coast. With children, a coast with parks in reach moves up, but only among coasts that are nearly as close. If the stops are more than 90 km apart, the guide says one house can't be the base for all of them.
4. **Studio: "How old the checked figures are".** All 15 dated figures, each with a lifetime by kind: pump 30 days, price 90, statistic 365, directory 180. This is the staleness sweep you chose over the weekly AI pass. Pump prices are the first to go old, on 24 Oct. A test fails if anyone adds a dated figure without registering it.

## Calls I made that you may want to change

- The hostel list only goes to the **hostel chip**. A hotel chip or no chip gets nothing, because offering hostels to someone who asked for a hotel is the app arguing with them.
- **MEININGER** is included. It calls itself a hotel but sells dorm beds.
- **Aalborg "rooms only"** rests on "35 rooms, all with bath". Its price page showed no table.
- **Five are "unclear" and never claimed either way:** Horsens, Esbjerg, Stevns, Gudhjem Hostel and Kerteminde.
- The stretch from Hirtshals to Hanstholm is labelled **Jammerbugt**, the agencies' name for it. Wikipedia calls Lønstrup's coast Skagerrak.
- A **family place** is a published entry with the Family theme, or one whose name says sommerland, Legoland, Lalandia, zoo, aquarium, waterpark and so on. A park Gemlyx hasn't published can't be found.

## Next

1. **Push, then build two real guides.** First, a 7-night north Jutland family trip with the summerhouse chip, which also covers the check still open from this morning's handoff. Second, a hostel chip trip through Aalborg. So far the new instructions are only confirmed as text; no guide has shown they work.
2. The Novasol half of your Skagen idea: the coasts list Novasol where it was confirmed, but no Novasol link exists yet.
3. Still open from this morning: the `kebabSaid` gate and the notes block, and whether the AI is told the app's checked dorm and street meal figures (your call).

---

## Tested live, same evening (batch 129)

Two real guides were built on gemlyxtravel.com, with every per-day accommodation call captured.

**Hostel chip: two 23 year olds, Aalborg for 2 nights and then Copenhagen for 2, 5 to 9 Nov.** Worked as intended. Both Aalborg nights said there's no dorm bed near those stops and recommended a room at Danhostel Aalborg, and the card shows "2 nights, Thu 5 Nov to Sat 7 Nov" with a single booking link. The Copenhagen nights picked real dorm hostels from the list: Danhostel Copenhagen City and a&o Nørrebro.

**Summerhouse chip: a family of four in north Jutland, 10 to 17 Oct.** This build found two faults, and both are fixed now:

1. **Wrong coast.** Day one picked Skallerup, 29 km from Fårup Sommerland, because the ranking used the trip's FURTHEST stop and Skagen pulled it north. The chat on the same trip had already said Blokhus. The ranking now uses the average drive, and with children a park close by pulls an area in. The same trip now picks Blokhus, 4 km from Fårup.
2. **One house in four places.** Every night is its own parallel call, so the later nights guessed where the house was: "near Skagen", "near Løkken", "near Aalborg" and "around Saltum". The code now picks the base once and every night is told the same name.

Suite at 21,940 and the build is clean. Both fixes were broken on purpose to confirm their tests go red.

**One gap found, not fixed.** The panel's chips only reach the chat and the planner as a sentence when "Build my trip" is pressed. If someone types straight into the chat, the per-day accommodation call still sees the chip, but the chat doesn't read the hostel sentence. In the hostel test the chat said "hostel dorms ... same as in Aalborg" before the guide corrected it.

---

## Who's traveling, and no bed price without it (batch 130)

> "We need to have the amount of people travelling at the top..."
> "Like how can we determine the budget of summerhouse and hostel per person, without knowing first the amount of people travelling"
> "Remember to then count the budget saying '(excluding accomadation)'"

1. **Who's traveling and the kids box sit under the dates now**, in the card that is always open, above the folded panel. They were the last fields in the panel.
2. **No bed price until the party is known.** It used to assume two sharing and say so in small print. Now, with a sleep chip ticked and nobody counted, the bed is left out and the figure reads, for example, "120 to 250 kr a day (excluding accommodation)". The line under it says "Say who's traveling and this becomes a whole day". The summerhouse mark doesn't appear either, and the planner is sent no bed figure. "Already booked" is unaffected, because nothing is being priced.

Suite 21,957, build clean, all three rules broken on purpose to confirm their tests go red.

---

## Live tests, later that evening (batch 132)

Guides were built on the live site and every Maps link was opened in Google Maps, as you asked.

### Maps: the link must open the journey the chip talks about

> "Aalborg shopping streets" showed "~10 min walk · Check Maps", and the link opened a 7 km, 1 hour 37 minute walk to Aalborg Storcenter. "This is NOT allowed to happen."

**What happened.** The build had measured that leg: 15 minutes, 1 km. The page then threw the measurement away, because neither stop was pinned to a real place, and printed the model's own "~10 min walk" instead. The link sent Google Maps the two names, and Maps' web search read "Aalborg shopping streets" as a mall on the edge of town. Google's routing service and the Maps website read the same name as two different places.

**The same fault on a second leg.** "Lille Vildmose, Øster Hurup" opened Restaurant Vildmose, 2 minutes away. The chip said 14 minutes by car to the bog.

**Fixed:**
- `api/directions.js` now returns the **place_id** of the two places Google measured between, and what kind of place each one is.
- Every leg link carries `origin_place_id` and `destination_place_id`. The name stays readable, and Google Maps opens exactly the places the chip was measured to.
- When Google found a real place at both ends, the chip shows the measured time rather than the model's guess, because the link now opens those same two places.

This only works for guides built after the push. An older saved guide has no place ids and links by name as before.

### A crash for families

With the kids box ticked and no kind of place named ("beaches and something fun for the kids"), pressing build showed **"Something broke on our end"**. It also came back on every reload of that tab. `wantedCategories` returns nothing when no category word is found, and the preview screen called `.has` on that. Fixed, and a test now checks every reader of it. It dates from 19 Sep; moving the kids box to the top made it more likely.

### Summerhouse: every night was told it was already booked

The summerhouse chip's own sentence ("booked by the week", "Saturday to Saturday") was read as the whole trip being booked. Every night was then told "THIS NIGHT IS ALREADY BOOKED" at "a place they have already booked", so day one never recommended the coast. Fixed at the reader: with no booking, there are no booked nights.

### Summerhouse: the writer put the house on the wrong coast

Every night said Blokhus, while the guide writer's own day one said "settle into the sommerhus" at Asaa, on the other coast. The base is now picked from the planner's skeleton **before** the writer runs, the writer is told it, and the same base goes to every night. Each night is also given its real straight-line distance to the house. Day one had invented "roughly 100 km" for a 50 km trip.

### Currency: one line, their own currency

> "just tell the user what the rate is in their own currency.. if it's a Dane, just leave it out."

The line now reads "100 DKK is about 13.38 EUR." Only the reader's own currency is shown. It comes from their account's country, then a home country they typed as the starting point, then their browser's region. A Danish reader gets no line, and a reader nothing tells us about gets no guess.

### Still open

- **Vague stop names.** "Aalborg shopping streets", "Aalborg waterfront" and "Aalborg" as a stop are not places. The place ids make the link match the chip, but the planner shouldn't write stops like these at all.
- **Wrong town labels.** Lille Vildmose was labelled Øster Hurup, and the town label is what gets sent to Google alongside the name.
- **Missing category word.** "Zoo" is not a category word in `wantedCategories`.

Suite 21,995, build clean, every new rule broken on purpose to confirm its test goes red.

---

## Free time, and the zoo (batch 134)

> "Naah it doesen't need to give a link I guess."

### A stop that is not a place is free time

A stop whose name is only a town plus what you do there, like "Aalborg shopping streets", "Lunch in Skagen", "Netto, Blokhus" or "Free time in Aalborg", now:

- keeps its card and its note, tagged **Free time** (Fri tid, Freizeit)
- gets **no leg chip and no Maps link**, in or out
- is **not measured** by the build and **not geocoded**, so it costs no Google call
- is **not a pin** on the map, and isn't counted as unplaced

**How it decides** (`looseStop` in `utils/guideEnrichment.js`): the town is taken out of the name, then filler words ("in", "the", "streets", "centre") and vague words (shopping, lunch, supermarket, kebab, café, bar, free, and a few Danish ones). If any other word is left, it's a name and the stop is a place. So "Café Luna, Aalborg", "Lille Vildmose, Øster Hurup", "Asaa beach" and "Aalborg waterfront" all stay places. A town on its own ("Aalborg") is a visit and keeps its legs. A published row is always a place. A supermarket chain with no branch named is free time; "Netto Vesterbrogade" is that branch.

**What it costs:** a leg from a real stop, through free time, to the next real stop shows no chip for either half. That's the trade you picked.

### Wrong town labels: mostly solved by the place ids

Lille Vildmose labelled Øster Hurup was the Maps web page misreading the name, not the label. The bog is a few km from Øster Hurup, so the label wasn't far off, and since batch 133 the link opens the exact place Google measured. I left town labels alone rather than guess corrections.

### The zoo

`wantedCategories` now hears zoo, aquarium, waterpark, sommerland, Legoland, playground, animals, wildlife, nature, beach and hiking as asking for attractions. One old test used "beaches and something fun for the kids" as a brief that names nothing; it now uses "something fun for the kids".

Suite 22,011, build clean.

---

## Sommerhus: weekends, price by coast, and who it suits (batch 135)

> "according to novasol, you can stay there for just a weekend if you want"
> "the place you might want to be located, can be pricier than other places. And good chance you might need car"
> "I find that summerhouse should probably only be recommended for nature people.." (asked about families: nature or kids)

### What was read on Novasol, 26 Sep 2026

| What | Found |
|---|---|
| Blokhus, Fri 6 Nov 2026, same houses | 2 nights 1,567 / 2,682 / 6,432 kr against 7 nights 1,785 / 3,352 / 7,751 |
| Rudkøbing, 14 Oct 2026 (your link) | 3 nights 3,120 against 7 nights 2,978, because the week had 40% off and the short stay about 21% |
| Blokhus, Fri 16 Jul 2027, 2 nights | No house at all. 54 were free for the Saturday week |
| July week (17 Jul 2027), house for six | Blokhus from 5,640 (24 of 54 read), Skagen cheapest 10,700 (all 20 read). The app's figure, the cheapest in all Jutland for 10 Jul, is 3,696 to 4,184 |

### What changed

1. **No more seven night minimum.** A short trip pays the whole week, spread over its own nights. So four people for three October nights are no longer recommended a house (146 to 189 kr a head against a 145 to 165 bunk), while six for the same three nights still are. The panel and the planner say it plainly: "Your trip is shorter than a week, and a house for a few nights costs about what the whole week does, sometimes more, so this counts the week. In the summer holidays it is the week or nothing."
2. **The chip no longer says** "let Saturday to Saturday and cannot be taken for fewer than seven nights". It says let by the week, and outside the summer holidays for a weekend too. The writer is told "for the whole trip", not "for the whole week".
3. **In July the panel says a popular coast costs more**, with the Blokhus and Skagen figures. Only July was read by coast, so only July says it.
4. **The ★/✓ mark only appears for nature or kids:** the kids box, the Nature tick, or nature words in the chat (beach, hiking, forest, quiet, strand, skov and so on), with refusals taken out. The chip itself stays for anyone to pick.
5. Both new readings are in the Studio's "How old the checked figures are" panel.

### Not done

- **A price for every coast.** Two coasts were read. The other 29 Novasol coasts need the same July read, and ideally a spring or autumn week too. I stopped because it runs in your Chrome and would take over the browser for a while.
- **Bus and bike reach per coast**, for trips without a car.

---

## After the live test: four panel fixes and every coast priced (batch 136)

> "It's pushed.. go test it and give me some suggestions." Then: "just fix it all.."

### The live test (27 Sep, 9 to 12 Oct, 3 nights)

The new rules worked: 4 adults got no mark, 6 adults with Nature ticked got ★ at 113 to 126 kr a head against 145 to 153 for hostel rooms and bunks, and a 3 night stay was priced as the week and said so. Four things were wrong, all fixed:

1. **No car, still strongly recommended.** With only Public transport ticked, nothing warned. Now the reason under the chip and the budget box both say: "Most holiday houses sit out on the coast, away from buses and bike rental, so without a car pick one close to a town with a bus stop, and check how far the house is from it before booking." The planner is told to put the base in or right next to a town with a bus or train. Nothing ticked is not treated as no car.
2. **A summer line in October.** "In the summer holidays it is the week or nothing" now only shows when the dates are in summer or unknown.
3. **The same sentence twice.** When the sommerhus is the picked stay, the reason under the chip keeps to the two prices, and the budget box explains the week.
4. **A long budget box.** It now shows one line (what the number covers and who it's split between) and a "Why this number" link for the rest.

### Every coast, read on Novasol

All 68 Novasol areas behind the coasts list, read on 27 Sep 2026 through Novasol's own search: seven nights from Sat 10 Jul 2027, Sat 16 Oct 2027 and Sat 9 Jan 2027, four adults, cheapest first. For each: how many houses were listed, the cheapest, and the cheapest sleeping six. Stored in `HOUSE_COAST` in `utils/summerhouse.js` and registered in the Studio's figure age panel.

Some of what it shows, for a house sleeping six:

| Week | Cheapest coast | Dearest coast |
|---|---|---|
| July | Houstrup 3,696 kr | Liseleje 12,598 kr |
| October | Søndervig 2,468 kr | Vejers Strand 6,635 kr |
| January | Houstrup 1,514 kr | Balka 5,770 kr |

Coasts with fewer than 8 houses listed are left out of that spread, because one house is not a market (Henne Strand had 5, Kandestederne 2). Grønhøj and Hou on Langeland have no Novasol area of their own and get no price.

**Where it shows up:**
- **The budget panel** (which doesn't know the coast yet) says how far apart the coasts are for this party in this season, and that its own figure is the cheap end.
- **The guide writer** is told what a week near the chosen base cost, and to quote that one if it gives a price.
- **Day one's card** gets the base's week and a "from X kr the week" for each other coast near the trip, so a cheaper coast nearby can be named.

The base is still picked by distance and family places, not price. Price only informs.

### Still open

- Bus and bike reach per coast. The no-car line names the risk but not which coasts are fine.

---

## A house trip offers a house, the form is not the last word, and Into moves up (batch 137)

### Booking.com on a sommerhus guide

> "this guide chose a summerhouse, yet filled a bunch of booking.com affiliates in" (guide bh99oe98lje)

Nine days from one house on Rømø, and seven "Find a room on Booking.com" links, one per night: the page split the stay wherever a day ended in a different town and offered a hotel for each piece.

Now a house trip (`utils/houseTrip.js`):
- is **one stay** covering every night. Night 1 shows "8 nights, Thu 8 Oct to Fri 16 Oct · Houses near Rømø on Novasol ↗"; later nights say "Same house as night 1".
- The link is **Novasol's own search** for that coast, on the trip's dates, for the party, cheapest first. The Novasol id for each of the 68 coasts was read in the same session as the prices. It is a plain link, not a partner one.
- **No hotel links** anywhere: not on the cards, not in the partners panel, not in the costs list, which now says "A holiday house".
- Book before you go says "The holiday house: one booking for the whole stay, near Rømø, through a holiday-house agency" instead of the hotel line about small towns in summer.
- New guides record the pick and the base (`_stay.kind`, `_stay.house`). Old guides like bh99oe98lje are read from their first night's text, so that guide is fixed too, once pushed.

### "Why does the AI just assume it wants to be a cheap trip and instantly builds?"

What happened on bh99oe98lje, read from the guide itself: the only message was the form. The panel's picks were a summerhouse and "Cheapest" food, and the form sent the panel's cost estimate as **"Budget: about 120 to 230 kr a day"**. The chat read that as a limit and wrote "your daily figure is tight", then offered to build straight away, because the form fills every slot the brief checks and the prompt said a complete form goes straight to the handoff.

Fixed, with your choice ("1, but, in the left corner where the process is, have a 'build from here'"):
- The form's line now reads **"What their picks cost, Gemlyx's estimate and not a budget they set: ..."**, and the chat is told never to call it tight or plan cheaper than they chose.
- **The reply to the form asks one question** about what the boxes can't say (a place they'd be sorry to miss, what a good day looks like), in the named-places shape. The ready marker is stripped from a reply to the form in code, and the "Shall I build your guide?" card waits until they've answered once.
- **"Build from here"** sits next to the progress bar once the brief has enough, for anyone who doesn't want to talk.

### Into moved up

> "this has to be put up before transport.. because everything that can recommend summerhouse, has to be before the summerhouse field"

"Into" now sits at the top of the panel, above how far, getting around and where you sleep, and above the budget switch, since it isn't a cost.

---

## The Food page is Danish food (batch 138)

> "Nobody comes to Denmark thinking 'I'm in Denmark for 4 days.. imma get myself some Thai Food.' So program it to only find Danish Cousines." / "That includes Danish Streetfood." / "So this is only about the navigation."

And of the food halls: "Street Food Halls should still exist. It's part of Denmark. Like China Town is also a unique part of Britain... It's Danish Tivoli."

**The rule** (`utils/danishFood.js`): the question is whether the PLACE is Danish, not the plate. In order:
1. the entry's own `danish` field, which every new food draft now answers
2. a food street or market is always in
3. the verdict on the 34 entries published on 27 Sep 2026
4. otherwise, out only if its category or name is another country's cuisine

**The 34 entries:**
- **Stay (16):** the six food halls and markets (Torvehallerne, Reffen, Aalborg Streetfood, Esbjerg Street Food, Storms Pakhus, Det Fedtede Hjørne), plus Dragsholm Slot, Sømods Bolcher, Aro, Café Broløs, Geranium, Niels Bugges Kro, Surt & Sødt, Smagsloet Vesterbro (flæskesteg sandwiches), Hyttefadet (smørrebrød and herring). Alma was here too until you said no grocery stores (see below).
- **Off the Food page (18):** SanGiovanni, Pizza by WH, Tony's, Flammen, Restau74, JOJO, Seoul BBQ, Burger Boom, Chickie's, Restaurant Provence, Grillen Burgerbar, both Hookeds, Rosita bistro, Catch me Sushi, Prinsens pizza & grill, Flamestone Pizzaria and Bones.

Nothing is deleted. The 18 are still published, so the chat, the guide and the preview can still name them, and the guide can still say a kebab shop is a cheap meal.

**Finding new ones:** the Studio's "search the web" for food is told to look only for Danish food (smørrebrød, pølsevogne, flæskestegssandwich, bakeries, røgerier, kroer, Danish and New Nordic, food halls), and what comes back is checked. A plain foreign-cuisine candidate is dropped, and the panel says "N more were left out as not Danish food". Food halls always pass.

**Calls I made you may want to change:** Flammen, Grillen Burgerbar and Bones are Danish chains serving grill, burgers and BBQ, and are off.

## Batch 139: no grocery stores on the Food page

You: "We probably shouldn't include grocery stores.. that's ridiculous.."

- `danishFood.js`: Alma is now `false`, and a new step zero runs before everything else in `foodOnNav`: a row whose category or name says supermarket, grocery, dagligvare or similar, or whose name is a Danish chain (Netto, Føtex, Bilka, Rema 1000, Lidl, Aldi, Kvickly, SuperBrugsen, Dagli'Brugsen, Løvbjerg, Meny, Min Købmand, 7-Eleven, Irma, Coop 365), is off the Food page even if the Studio draft said it was Danish. Food halls and markets are untouched. Spar is not on the list, since it is also the Danish word for "save".
- The Studio search is told to leave out supermarkets and grocery stores, and anything it brings back with a grocery word or chain name is dropped, same as a pizzeria.
- The food draft's `danish` field says FALSE for a supermarket or grocery store.
- Tests: five new checks, each seen failing with its piece of the change taken out.

### And a family of four priced as eight (found testing the AI live, same batch)

A test guide for "2 adults and 2 kids, 6 and 9" said "For 8 of you that is from 1200 DKK". The form sends the party with a note, "(that is 4 people in total, counted from what they typed...)", so the model does not re-guess it. The guide kept that whole line as `_travelers`, the brief had no counts for a form party so `_party` was empty, and `partyOf` added the note's 4 to the sentence's 2 and 2.

- `costLedger.js`: `partyOf` takes the note's number as the count when it is there, and `withoutCountedNote` strips it.
- `App.jsx`: `_travelers` is saved without the note.
- Tests: five new checks, each seen failing with its piece taken out. Guides already saved with the note now read 4 as well, since the fix is in the reader.

## Batch 140: what the live AI test found, fixed

The test guide was sgd0yrp3lzx: a family of 4, kids 6 and 9, 16 Oct 12:00 to 21 Oct 12:00, Nature, a rental car, nothing booked. You said "ALL".

1. **The night before a morning flight.** A noon departure is not a day in the plan (tripDays), but every bed reader counted the last planned day as the day they leave. So the family got 4 nights for 5, and day 5 was written as "before the flight".
   - New `sleepsAfterLastDay` and `nightsBetween` in `tripEvents.js`.
   - The guide carries `_sleepsAfterLast`, and `bedStateOf` counts that night.
   - The day writer gets a bed on the last day (`noNightAfter`).
   - The planner and the writer are told in dates that the last day is a full day.
   - The chat's form line says "all of them full days".
   - The sommerhus counts nights, not days.
2. **No hostel for a family who said nothing about money.**
   - With no budget: no hostel, no dorm, no "budget choice", unless they picked the hostel chip.
   - With children: never a dorm.
   - The bed search asks for hotels, or family hotels and apartments, not hostels.
3. **A holiday house from the chat, not only the panel.**
   - `briefBlock` offers a sommerhus as one named option when the trip suits one: kids or nature, 3 or more days, nothing booked, not a no-car trip. It also tells the chat to keep bed changes few with children.
   - If they say yes, `houseChosen` (houseTrip.js) makes the build treat the stay as a house, the same as the form's pick (`stayForBuild` in App.jsx).
   - The Novasol link now counts "2 adults and 2 kids" as 4, not 2.
4. **Car trips.**
   - A train leg between towns more than 10 km apart is driven on a car trip.
   - "Metro", "subway", "S-tog" and "tram" now read as public transport. Before, they fell to the car and printed "13 mins by car" under "leave the car parked".
   - The leg writer is told the car goes where they go.
5. **Season line.** The coast-theme line no longer fires inside Copenhagen, Aarhus, Odense or Aalborg (Hellerup). The preview writes one sentence for all coast towns instead of the same sentence four times.
6. **No Copenhagen Card for people who drive.** When they drive, the airport tip (chat and guide) is about the car.
7. **Small ones:**
   - "Hellerup, Copenhagen" gets its comma.
   - A trip that moves says "The plan moves you between...".
   - The Commons "No machine-readable author provided. X assumed" credit shows just X (`photoAuthor.js`, at the source and on every stored credit).
   - An empty departure picker opens on the arrival's month.
   - The "chat fired on arrival alone" was my own click: picking a day closes the picker, so my "Done" landed on Build my trip.

Tests: 41 new checks. Each was seen failing with its piece taken out (24 mutants), and older checks pinned to changed lines were updated.

## Batch 141: the time in Denmark, and night on the weather cards

You, at 20:18: "Put time in Denmark on front page and the weather need a 'night' demonstration.." The Copenhagen card showed a sun an hour after sunset.

- **The clock.** "Today in Denmark · 20:18" on the front page. It uses Denmark's time zone whatever the reader's clock says, and ticks every 30 seconds (`DenmarkClock` in WeatherHeaderStrip.jsx, `denmarkClock` in the new `utils/denmarkTime.js`).
- **Night.**
  - `weatherIcon` now reads MET's `_night` suffix and shows a moon for a clear or fair night. Before, it only read "clearsky" and always drew a sun.
  - Cloud, rain and fog codes carry no day or night suffix, so each card also works out the sun's height for its own city (`isNightThere`, dark below the almanac's -0.833 degrees). In a check against Copenhagen on 27 Sep, it turns dark at 18:55 to 19:00 and light at 07:00 to 07:15.
  - After dark the cards switch to night colours: deep blue when clear, darker grey or blue for cloud and rain. The line above them talks about tonight ("A clear night across the country.", "Rain around Aalborg tonight.") instead of "the kind of day the coast is for".
- Tested in a browser with the clock set to 20:18 and 12:18 and a faked forecast. Screenshots are in the chat.
- 20 new checks, each seen failing with its piece taken out, including one that reads the clock from a machine set to Sydney.

## Batch 142: the confirmation mail landing in junk

You: "apparently, the confirmation mail tends to end in junk mail. That happened to my friend."

- **Read from DNS:** the mail is sent through Resend and signed. There's a DKIM key at resend._domainkey, Resend's return path on send.gemlyxtravel.com, SPF for Google Workspace on the domain, and DMARC `p=none`. So the sending side checks out on paper.
- **The odd one out was the link.** `{{ .ConfirmationURL }}` goes to vpxfahjnerkkkoueovhl.supabase.co, and the template printed it twice. A mail from one domain whose only link goes to a random-looking other one is the phishing shape filters look for.
- **Code:** `verifyEmailLink` in `src/utils/auth.js` reads `?token_hash=...&type=email` (or `type=recovery`) on our own address, verifies it with Supabase by POST, signs them in, and flags a confirmation or a reset exactly as the old path did. `captureRedirectSession` tries it first. The token leaves the address bar before the call. This also stops Outlook's link scanner from spending the one-use token before the person clicks.
- **Signup** now carries the theme in the account metadata, so the template can put it on the link.
- **The check-your-email screen** now asks them to mark it as not spam if it lands there (en, da, de).
- **SETUP_EMAIL.md, Part 3:** the new links for Confirm signup and Reset password, mail-tester.com, and a DMARC reports address.
- **YOU NEED TO:** push first, then paste the new templates into Supabase. The old site does not understand the new link.
- 12 new checks. Browser and network are stubbed. All 10 mutants went red.

## Batch 143: Where is a filter on the Towns page

You: "why is this still not fixed? Put locations into filters and put filters into the position under the text bar".

- The All of Denmark / Jutland / Funen / Zealand / Lolland-Falster row sat by itself between the search bar and the panel, so the panel opened one row away from its button, and location was the only axis outside Filters.
- It is now the first row of the panel, titled "Where". It has counts like the other rows, counted with every other filter applied but not itself. The panel opens straight under the search bar.
- A chosen place still counts in "Filters · N" and is cleared by Clear all, as before.
- Not touched: Islands (region pills and no Filters button) and Cheap gems (a town row and no Filters button). Say if they should get the same treatment.
- 6 new checks, including that nothing sits between the search bar and the panel. 3 mutants all red.

## Batch 144: save the date check's findings from the check, the programme-page date, and a terms tick box

Your words: "I don't want to go in and individually change every draft", "make me able to directly change the drafts from there", "keep the link. So I can see where it got the source from", "'Sommer på Tobakken' makes no sense.. the link used is refering to a whole bunch of events. And the date refers to a specific event", "Yes" (Islands and Cheap gems layout), and "on account creation, remember to make people click 'accept terms of use'".

- **Save from the check.** Every row that found a new date or ticket status now has a "Save ... to the entry" button, and the top has "Save all N changes to their entries". It writes the date, the end date (empty if none was found, so last year's end can't sit after this year's start) and the ticket status. It also writes `__checked` with the day and the links it was read off. The "Read off:" links stay on every row. It re-reads the row right before writing, so nothing typed elsewhere is overwritten. See `utils/eventCheckApply.js`.
  - It never writes a possible cancellation (your call, it says so), an event that lives in the code rather than the database, a waiting entry (that has its own "Publish it now" button), a date already passed, or an end before a start.
  - The rows that only say what was ignored are folded under "Left alone: N". The old "This only flags it" line is gone, as are the dashes in the panel. The model's notes are passed through stripDashes.
- **Sommer på Tobakken.** tobakken.dk is the venue's programme. The parser pinned down one date, 28 November, which belongs to a concert there. On a page with many dates (now counting "Fre 3/10" style too), an unlabelled date is only used when the event's own name stands beside it with no other date in between. Dates written in words are located on the page for that check. `programmeDateProblem` and friends are in `eventDates.js`. The trace says "the page is a programme of many dates...".
- **Islands and Cheap gems** now use the Towns layout: search, a Filters button, and the panel under it (Where and Getting there on Islands; Where, What and Kind on Cheap gems). Islands rows have counts.
- **Terms tick box.** Signup now has "I accept the Terms of Service and the Privacy Policy" as a box that must be ticked, on both the email and Google routes. It starts unticked every time the sheet opens. The accepted version is still stamped by acceptedNow. Screenshot checked in a browser.
- 26 new checks and 8 older ones updated to the new layout and names. Every mutant tried went red (17).
