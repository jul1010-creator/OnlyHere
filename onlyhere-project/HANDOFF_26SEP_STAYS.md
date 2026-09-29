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

## Batch 145: the date check only spends on what is due

You: "But it costs me money to update all the time though :S"

- **What costs money in a run:** the search (Perplexity) for every event its own site did not answer, Firecrawl when a plain page read fails, and the poster reader (a vision model, capped at 30 a run). Every run redid all of it for up to 60 events, including the ones that said "not announced yet" last week.
- **Now each event remembers its last check.** For a database event that is `__lastCheck` on the entry. For an event in the code it is this browser's memory. A run only takes events that are due:
  - no date yet, or the date has passed: every 14 days;
  - on within 45 days: every 7 days;
  - further off: every 30 days.
  The numbers are `RECHECK_DAYS` in `utils/eventCheckDue.js`.
- **Before you press:** the panel says "N of M are due; the rest were checked recently". There is a "Check all anyway" link for the day you want everything.
- **The last run's results are kept in this browser**, so reopening Studio shows them without paying for another run. The summary says when it ran and how many rested.
- 14 new checks, all 7 mutants red.

## Batch 146: terms version 2.2, no responsibility for wrong information

You: "note in the Terms of Use that we take no responsibility for wrong information".

- **Most of it was already there, for Guides.** Clause 12 (a Guide may contain errors and go out of date, verify before relying on it), clause 18.1 (no warranty as to accuracy) and clause 19.2.1 (no liability for relying on a price, timetable or opening hour in a Guide).
- **What was missing:** everything that is not a Guide.
  - New clause 12.6 applies the same to all other Gemlyx Content: published entries, event dates and ticket information, cost estimates, weather, and the chat's and Ask Gemlyx's answers. It says in words that Gemlyx accepts no responsibility for any of it being incorrect, incomplete or out of date.
  - Clause 19.2.1 now names event dates, other content and chat answers too.
- **Clause 19.1 is unchanged.** Danish and EU law do not let you exclude liability for gross negligence, intent, personal injury or mandatory consumer rights, so no clause can promise more than that.
- **Version 2.2, in force from 27 September 2026,** with a version-history note. `TERMS_VERSION` is 2.2, so new signups record 2.2. Clause 21.3 says a material change needs 30 days' notice to existing account holders. This one widens a disclaimer the Service already made in 18.1, but if you want to follow your own terms strictly, email the few existing accounts.
- 4 new checks.

## Batch 147: one guide a day, a daily ceiling, and events in "Fitting your preferences"

You: "Yes, have a cap. And on the review, when someone clicks to build the guide, ask 'are you sure? You can only generate one guide a day.'" and "I want events put into 'your preferences' as well."

**Do these two things, in this order.** Until you do, the site works as it does today.
1. Run the SQL in `SETUP_GUIDE_CAP.md` in Supabase (SQL Editor, paste, Run).
2. Add `GEMLYX_UNCAPPED` in Vercel with your Supabase user id or login email, then redeploy. Without it you get one guide a day too, Studio included.

- **The question.** On the preview ("Here's what's coming up"), "Looks good, continue" now asks "Are you sure? You can only generate one guide a day." with "Yes, build it" and "Not yet". Studio (`/#studio`) skips the question.
- **Once today's guide is built,** the same spot says "You have built today's guide. You can build a new one tomorrow." with a "See ready-made guides" button to /trips. The day is Denmark's, so it resets at midnight in Copenhagen.
- **The server decides, not the browser.** Before any AI call, a build asks the new `api/build-pass.js`. It counts per Danish day:
  - each browser: 1
  - each account: 1, so a second device is not a second guide
  - each network: 4. More than 1 because phones on the same mobile network, hotel wifi and campus share one address. IPv6 is counted per household (/64), and only a hash is stored.
  - the whole site: 40. This is your spending ceiling. `GEMLYX_GUIDES_PER_DAY=0` pauses the builder for everyone except you.
  All numbers can be changed in Vercel; the table in the setup file lists them.
- **A build that fails halfway** gets 1 retry on the same pass. The retry still counts against the network and the day, since it costs the same.
- **It fails open.** If the table is missing or Supabase is down, the build goes ahead and the Vercel log says `build-pass not counting:` with the reason. A cap must never turn a traveller away because it is broken.
- **What it does not cover:** someone calling the AI endpoints directly without the site. The origin check from 17 August is still the only guard there, and a per-call limit is the next step if it ever shows up on the bill.
- **Events in your preferences.** Under Everything, the "Fitting your preferences" row now leads with up to three events that match your interests and are on now or have a confirmed date in the next 60 days, soonest first, with their dates on the card. The other chips name kinds of place, so events only show under Everything.
- **Reviewed by Fable,** as you offered. It found 5 things and all 5 are fixed:
  1. A retry skipped the day's ceiling and the off switch.
  2. A double tap on Map or Simple could start two builds.
  3. IPv6 phones got a fresh network count on every request.
  4. A day of failed builds was labelled "built".
  5. A cap that stopped counting was silent.
  The SQL was also run for real against Postgres (PGlite): it refuses a second guide, stops at the ceiling and resets the next day.
- **Checked:** 22,291 checks green, including about 60 new ones; mutants red; build clean; the browser navigation test 26 of 26; the confirm and "used today" cards clicked through in Chromium, with no sideways scroll at 380px.

### Guide test, and what I could not finish
- **The summerhouse guide you reported, bh99oe98lje, shows no Booking.com links now.** It has one "Houses near Rømø on Novasol" link with the right dates and party. Every Maps link carries a Google place id. The pins are where they should be: Ribe Cathedral, Ribe VikingeCenter, Rømø, Schackenborg and Haderslev.
- **Test guide sgd0yrp3lzx:** its stops and geo points are also correct.
- **A fresh build could not be finished tonight.** Your screen was off, so Chrome ran the Gemlyx tab in the background and slowed the chat to about a word a minute. I tried speeding the tab's timer up from outside, which froze that tab, so I closed it. Your other tabs were not touched. Tomorrow, with the screen on, I can do a full summerhouse build (Hamburg, 2 adults and 2 kids, 10 to 17 Oct).
- **Two things the test showed:**
  - **The panel argues against the car.** With "Stay in one part of Denmark" picked, it says "A car is the one that adds a cost this trip does not need". It says that even when the traveller has ticked Car and typed "driving our own car" as the starting point. For a family driving up from Hamburg to a sommerhus in West Jutland, where buses are sparse, that advice is backwards. It is also explanation text under a control. I left it alone because it is a written design choice. Say if it should go, or only show when Car is not ticked.
  - **The chat counter dropped after a reload.** The chat said "Everything I need, 7 of 7", and after a reload it said "6 of 7, and I still need what kind of trip". Not looked into yet.

## Batch 148: "Draft a mail to..." for photos

You: "next to Wiki and upload picture, you have 'draft a mail to..'"

- **Where:** in Studio, open an entry's media editor (the one with Upload photos and Find on Wikimedia). The new button is "✉ Draft a mail to <name>".
- **What it opens:** a draft you can edit, in Danish or English, with:
  - their email to fill in
  - a subject, e.g. "Billeder af WOW PARK til Gemlyx"
  - a short body that links the entry on gemlyxtravel.com and asks for one or two photos, only for where you write about them, with their credit line, and confirmation that they own the rights
- **One line is yours.** The draft has "[Skriv én linje om, hvorfor du valgte stedet]" in it, and the send buttons stay off until you replace it. That personal line is what gets small places to answer.
- **Sending:**
  - "Open in Gmail" opens a filled-in Gmail message as oliver@gemlyxtravel.com
  - "Open in mail app" opens your default mail program
  - "Copy" copies the subject and text
- **Links:** "Their site" and "Press photos?" (a search of their own site for press, presse and pressebilleder) sit above the draft, so you can check for a press page before writing at all.
- **No AI call.** It is a fixed template, so it costs nothing and cannot invent anything about the place.
- **"Find their email"** sits next to the email field when the entry has a website. It reads their front page and the press and contact pages it links to, and lists every address written there with the page it came from. The best one goes into the To field unless you already typed one. A press or marketing address on their own domain comes first, then info@ or kontakt@, then anything else. It uses plain page reads only, never Firecrawl or AI, so it costs nothing. On WOW PARK it found info@wowpark.dk. It runs through the new `api/find-email.js`, which is Studio only like scan-source.
- **"Open my profile" was broken.** You: "when you click 'open my profile' to fit preferences, it just swipes to a non-existent page". The button still sent you to the old "me" tab, which was removed when Info about me became its own page on 23 Aug. It now opens Info about me, on the About me section where the interests are. A new check makes sure every button that jumps to a tab points at one that exists.
- **Free and Paid on Attractions.** You: "put category on attractions called 'free' and 'paid'." There is a new Price dropdown next to Type and Island, with All, Free and Paid.
  - It reads each entry's own price words, the same rule the price chip on the card uses, and never the category name. That name is the old bug where Legoland showed as free.
  - **Free** means the entry says free and names no amount.
  - **Paid** means it names an amount, or says something like "free for children", which implies a price for everyone else.
  - An entry that says nothing about price is in neither, and shows only under All, so Free can never hand somebody a theme park. The counts beside each option show how many are in each.
- 28 new checks, and 2 older ones updated for the fixed profile button and the longer mail panel.

## Batch 149: stopping a build, attraction categories, Tiqets tours, and a look at every page

You: "if people cancel the making of the guide, then it doesn't count as their daily limit", "attractions need categories.. like history, nature, family, and (perhaps) unique", "on Amalienborg, an affiliate link has been implemented as a 'website ticket' when the 'ticket' is really just a guide", and "look through all the navigations".

**Run one more SQL block:** section 1b in `SETUP_GUIDE_CAP.md`. Until then, "Stop building" still works, and the traveller gets their one retry instead of the day back.

- **Stop building.** Before this there was no cancel at all: the only button during the wait was "Keep browsing", which keeps the build running. Now there is a "Stop building" button top left.
  - It ends the build at the next stage, before the next round of AI calls.
  - The server then takes the build off that browser, account and network for the day. It stays on the site total, because what it spent before stopping was spent.
  - The traveller is told "Stopped. It did not count as today's guide." only once the server has confirmed it.
  - One browser can stop 2 builds a day (`GEMLYX_GUIDE_REFUNDS`), and a stopped pass cannot be handed back twice or reused. Checked against a real Postgres.
- **Categories on Attractions.** A new Category dropdown with History, Nature, Family and Unique, and you can pick several.
  - History, Nature and Family use the entry's themes when it has them. Attractions never had themes, so until now they're read from each entry's own words.
  - A theme park, amusement park or water park counts as Family, never Nature.
  - Unique only when the entry itself says it's one of a kind: the only, the oldest or the largest, "Danmarks eneste" and so on.
  - New and redrafted attractions are now asked for themes, so the categories get more exact as you redraft.
  - Word matching is rough. For example, Glyptoteket also lands in Nature because of its winter garden.
- **Amalienborg.**
  - The entry page on the live site currently shows no ticket button, so I couldn't see the exact link you saw.
  - I fixed the two ways it could happen. A Tiqets product whose address says tour, guide, walk or audio and says nothing about a ticket, admission or entry is no longer shown as Tickets.
  - The Website button no longer shows when the website field holds a shop page (Tiqets, GetYourGuide, Ticketmaster, WeGoTrip, Viator and similar). A shop's page is never the place's own site.
  - If you saw it inside a guide or in Studio, tell me where and I'll check that exact spot.
- 35 new checks, and 4 older ones updated for the new stop button, the extra dropdowns and the Website rule.

### What I found wrong with the navigation pages

Checked on the live site, page by page, with the screen off, so I read text rather than looked at every layout.

1. **Shared page links lose their page.** Opening gemlyxtravel.com/#events (or #gems, #tips) in a fresh browser shows "Enter Denmark", and pressing it lands on Explore instead of the page in the link. That matters for anything you advertise with a link to one page.
2. **Shopping is empty.** It's a top-level page saying "Nothing published yet", one click from the front page. Hide it until it has entries, or fill it.
3. **The menu is cut off on a laptop.** At 1280 px wide the last items (Shopping, Towns, Islands) hide behind a small arrow after "Sh".
4. **Three different filter styles.**
   - Attractions, Food and Events have a row of dropdowns.
   - Towns, Islands and Cheap gems have a Filters button with a panel.
   - Nightlife has a town list.
5. **Search exists only on some pages.** Attractions and Towns have a search box, but Food and Events don't.
6. **Alphabetical first means weakest first.**
   - Towns opens on Asaa ("If you're nearby").
   - Islands opens on Agersø ("Worth a look").
   - Attractions starts at A.

   The first thing a visitor sees is often your least recommended entry. Sorting by your tier by default would put the best first.
7. **Stale or wrong page texts.**
   - Events says "Summer means festival season across Denmark" at the end of September.
   - Cheap gems says "you can try out the following shops" above a list that includes bars.
   - Attractions still describes itself as "free places and things worth booking ahead", which is the old free/bookable split.
8. **Danish text on the English site.**
   - The AI notices on Events and in the chat ("Mange billeder her er AI-indtryk…", "Du taler med en AI…") follow the browser's language, so a visitor with a Danish browser but an English site gets both languages on one screen.
9. **Tips and Essentials overlap.** Both cover transport and fines, so a visitor has two places to look for the same thing.
10. **Food cards.** Some show long category texts as the card's subtitle, e.g. "Fine-dining restaurant, one Michelin Star, awarded 2023, retained 2024-2026, the only Michelin-starred restaurant on Funen".

## Batch 150: the navigation review, fixed (all but the menu arrow)

Oliver, 28 Sep 2026: "Just fix it all except the arrow on." and "It also seems that attractions have no 'Length from you', unlike towns".

- **A correction to finding 1.** Page links work. gemlyxtravel.com/#events, #tips and the rest open their page. My test used #gems, and the real word for that page is #cheap-gems. What did fail was a link to an entry or town that does not exist (for example /denmark/attraction/amalienborg when the entry is amalienborg-slot): it sat on the front door forever. Once the library has loaded, such a link now opens the list it belongs to with a short note: "That page could not be found, so here is the list it belongs to."
- **Shopping is hidden while it's empty.** It leaves the menu and the swipe order once the library has loaded and has no shops. It comes back by itself when the first one is published, and Studio always shows it.
- **One filter style.** Attractions, Events and Food now have the same shape as Towns, Islands and Cheap gems: a search box, a Filters button beside it, and the panel opening underneath with every filter as a row of choices with counts. A choice that would empty the list is greyed out; All never is. On 19 Aug you preferred the dropdowns on Events, and this follows your 27 Sep direction instead. Say so if you want the dropdowns back.
- **Search on every list.** Events searches town, type, description and place. Food searches place, category and description.
- **Recommended first.** Towns, Islands and Attractions open by your tier (Can't miss, then Highly recommended, then Worth a look), then by name. Attractions has "Recommended" in its sort menu, and A to Z is still there.
- **Distance on attraction cards.** A card says "~136 km from you" when the reader is in Denmark, and otherwise "~X km from CPH" (nothing for places in Copenhagen itself). It's a straight line from the entry's town, hence the ~. Craft cards keep the travel time they had.
- **Page texts.**
  - Events no longer says summer means festival season.
  - Attractions no longer describes itself by the old free/bookable split.
  - Cheap gems is unchanged. The line about shops is your own wording, and a test protects it. Say if you want it to say places.
- **The AI notices.** They follow the page's language when the site can speak the reader's. A Danish browser reading in English gets the English notice. A Dutch or Swedish browser still gets its own language, since the site can't be shown in it and the notice must be clear to that reader. A guide written in a language follows the guide.
- **Tips and Essentials point at each other.** Each page has a line at the top that opens the other ("Tickets, money and the transit fine are on Essentials →" and "The Copenhagen Card, bikes and other extras are on Tips →").
- **Food cards.** The small line and the price chip show the first clause only, cut at a word, so "Fine-dining restaurant, one Michelin Star, awarded 2023…" reads "Fine-dining restaurant". The entry page still shows all of it.
- **Not done:** the menu arrow on laptops (your call).
- About 30 new checks. About 20 older ones were updated because they asserted the dropdowns, the old tab list, the alphabetical sort or the notice reading only the browser. Each has a comment saying so.

## Batch 151: what a Tiqets page sells, and Tiqets as the second choice

Oliver, 28 Sep 2026: "recommending Amalienborg through Getyourguide or zoo through Tiqets, is bad in the sense that it is 10 kr pricier. However, some of them do include packages that make it cheaper and have refunding." On the layout: "Up to you."

- **What was wrong.** A Tiqets venue page always has "tickets" in its address, whatever it sells. Amalienborg's sold only a guided tour. Experimentarium's and Louisiana's sold only the Copenhagen Card. Langeland and Roskilde, from my list earlier, were already hidden: islands and towns never show a Tickets button.
- **What the page sells is now stored beside the link** (`__ticketOffer`): entry, combo, tour or card, plus whether the page offers free cancellation or combo deals. The affiliate sweep reads the page before you tick it, and so does a new draft. Nothing is claimed that the page itself doesn't say.
- **On the entry page:**
  - A place with its own website: the Website button stays first, and Tiqets becomes a smaller line under it, e.g. "Also on Tiqets: usually a little dearer than buying direct, with combo deals on other sights ↗".
  - No website of its own: Tiqets stays the Tickets button, with what the extra buys under it when there is anything.
  - A tour page is offered as "Guided tour on Tiqets", and a card page as "Included in the Copenhagen Card, sold on Tiqets", never as Tickets, and neither becomes the Tickets row in At a Glance.
  - Free cancellation is only mentioned when the Tiqets page says so. None of today's venue pages do, so nothing claims it yet.
- **Already filled in live** for the eight rows with a Tiqets link: Zoo, Kronborg, National Museum, Tivoli and Legoland as entry with combos; Experimentarium, Louisiana and Humlebæk as card. It takes effect when this is pushed.
- The refund SQL (section 1b) is run and verified.

## Batch 152: both links, and a reason to pick Tiqets only when there is one

Oliver, 28 Sep 2026, with Tivoli's own checkout for 15 October at 220 kr against Tiqets' 190: "currently tivoli is cheaper on tiqets than on tivoli's own site". Then: "Maybe we should just add both links? For people to decide themselves? Then we can sell the affiliate with 'We recommend Tiqets for its 24-hours refund policy'", and "we can't rely on this price different forever."

- **No price claim either way.** "Usually a little dearer" from batch 151 is gone. It was wrong for Tivoli and would be wrong on other days elsewhere.
- **Both links, side by side**, where a place has its own site and a Tiqets ticket: "🌐 tivoli.dk" and "🎫 Tiqets" as equal buttons. The separate Website button steps aside there so the site isn't offered twice.
- **The line under them is the reason to pick Tiqets**, and only when its ticket page gives one:
  - Free cancellation: "We recommend Tiqets for its free cancellation up to a day before" (plus combos when there are any). National Museum and Legoland today.
  - A refundable ticket you choose at checkout, which may cost extra, is said as a fact and not recommended: "Tiqets lets you pick a refundable ticket at checkout." Tivoli today.
  - Only combos: "Tiqets also has combo deals on other sights." Zoo and Kronborg today, whose Tiqets tickets are nonrefundable.
- **Refunds are read off the ticket's own page**, because the venue page never mentions them. The sweep and new drafts follow the entry ticket's link from the venue page and read its terms. "This ticket is nonrefundable" clears any claim.
- Live rows updated to the new shape (`refund`: free, option or empty). A row still holding batch 151's `cancel: true` is read as free.
- A place with no site of its own keeps Tiqets as the Tickets button, with the same reason line under it. Tours and card-only pages are unchanged from batch 151.

## Batch 153: no "exactly the same price" anywhere

Oliver, 28 Sep 2026: "Don't say 'exactly' the same.. because that's a lie. It tends to be different price... you can instead reword it to 'We recommend using our partners [..] because it makes ordering tickets more convinient and often offer extra packages or refund deals.'"

- The line under every partner link now reads: "We recommend booking through our partners because it is more convenient, and they often offer extra packages or refund deals. Gemlyx may earn a small commission when you do." Same in Danish and German. It says "booking" rather than "ordering tickets" because the same line sits under audio walks, tours and bike rentals.
- The commission is still said, as the law asks.
- Under the Tiqets pair, where the line above already gives a reason ("We recommend Tiqets for its free cancellation…"), only the short commission sentence is shown, so "we recommend" is not said twice in a row.
- The Tips gear partner and the "Partner link." variant lost the same price promise too.

## Batch 154: affiliates checked before a reader sees them

Oliver, 28 Sep 2026, going to bed: "make sure these affiliates actually get it right... The Amalienborg Slot one must NOT happen. So if AI has to go through the affiliate link and compare with its own website, then do that." And: "make sure that there actually is a 24-hour cancellation... these affiliates has to be fact-checked." He asked for Fable to look through the affiliate system; Fable's review found twelve issues, and the ones that could put a wrong paid link in front of a reader are fixed here.

- **A Tickets button now needs evidence.** Before, a Tiqets link with no stored check counted as a real ticket, so every link stored before 28 Sep still said "Book tickets", Amalienborg's tour page included. Now:
  - Only a checked entry ticket for this place is shown as Tickets (the two buttons, or the Tickets row in At a Glance).
  - Unchecked links, combo-only pages, tours and Copenhagen Card pages are a quieter line saying what they are ("Also on Tiqets", "Combo tickets with other sights on Tiqets", "Guided tour on Tiqets", "Included in the Copenhagen Card").
  - The check is tied to the exact link it read. A link changed by hand is unchecked until it is read again.
- **The AI check against the place's own website.** One check runs wherever a partner ticket link is written: new drafts, the affiliate sweep, a pasted link, and a new button in the Affiliates panel ("Check what N ticket pages sell") for rows stored before today. It reads the partner page, the ticket's own page and the place's own website, and asks the model whether it is the same place and what it sells. The model's answer is never taken alone:
  - "Not this place" removes the link.
  - Tickets needs both the rules and the model to say entry ticket.
  - A refund the model reports counts only if its quoted sentence is really on the partner page.
- **Refunds are fact-checked, sentence by sentence.** Read only from the ticket's own page and stored with the sentence that says it. Nonrefundable tickets are stored as such, and the "partners often offer extra packages or refund deals" line no longer appears under them, under tours, under cards or under unchecked links; those get the commission sentence alone.
- **The guide.** It sold Amalienborg's tour page as "Buy tickets", because it read the address only. It now sells a partner link only when the place's page was checked as an entry ticket. It also refuses a link found by a looser name than the stop's own ("Tivoli Friheden" no longer gets Tivoli's ticket), while "Tivoli Gardens" still counts as Tivoli (both are in your saved guides).
- **GetYourGuide entry tickets**, as you agreed: allowed as a ticket where the product's own address says entry or ticket and nothing about a tour. Tours stay tours.
- **Live data, done tonight**, all nine partner ticket rows re-stored in the new shape with the page each answer came from:
  - Amalienborg: GetYourGuide entry ticket, free cancellation ("Cancel up to 24 hours in advance for a full refund"), official site denkongeligesamling.dk.
  - National Museum, Legoland: entry, free cancellation.
  - Tivoli: entry, refundable ticket you pick at checkout.
  - Zoo, Kronborg: entry, nonrefundable.
  - Experimentarium, Louisiana, Humlebæk: Copenhagen Card only.
- **Smaller fixes:**
  - The Zoo link carried somebody's Bing ad click (utm and msclkid) and now no stored ticket link can.
  - Links for another year's edition are refused even when pasted by hand or found from a page that would not open.
  - Tour links now match the town on the city part of the address only, so short names like Ry, Als or Møn can no longer match inside other towns' tours.
  - A guide titled as a sommerhus trip gets the house link and not hotels.
- **Not changed:** the "Official site" label on the website button (Fable rated it low) and the hotel label on hostel stays.
- **Guide test.** Chrome was in the background, so a full build ran at about one word every ten seconds. Instead I ran the guide's cost list with the new code on the stops from your ten most recent saved guides and the live ticket rows. Zoo, National Museum, Tivoli and Tivoli Gardens, Legoland, Kronborg and Amalienborg get their link; Experimentarium and Louisiana get none; Tivoli Friheden gets none. The sommerhus guide ("A Wadden Sea Autumn") is recognised as a house trip. A full build with the screen on is still worth doing once this is pushed.

## Batch 155: event updates, closed places, and what a card tells a family

Oliver, 29 Sep 2026: "events that are like, let's say, happening from the 18th till the 19th, will attempt on being updated till happening from the 19th", "events where something 'may be on sale', turns out to clearly not to be on sale", "can you program it, so it doesn't apply places that are permanently closed down? It found Hornslet bar", "sweep the tier system, but for like 'history' 'nature' 'kids'", "get rid of this 'walk in no booking' bs", "Paid also need to change somehow", and on kids: "Families might be misguided... recommended for families... We need to make this convinient."

- **18th to 19th read as "moved to the 19th".** The check that reads the event's OWN page never knew the event's end date, so a page naming the second day ("Lørdag 19. oktober") looked like a move. It knows the run now, and a page naming any day of it confirms the dates instead of changing them (and saves the paid search that used to follow). Dates are also compared as days, so "2026-10-18" and "18 Oct 2026" are the same.
- **"May be on sale" that wasn't.** A ticket status from the web search is now only offered when the event's own site or ticket page, read on the same run, says it: sold out needs "sold out" or "udsolgt", on sale needs a way to buy and no "coming soon" or "billetsalget starter". When the site could not be read, the status is not offered. The scheduled check applies the same two rules.
- **Permanently closed places.** Google's own listing status is now fetched with every branch and location lookup (same price tier), and a permanently closed address is never offered, in Studio's "find other addresses" or the Cheap gems location sweep. Temporarily closed ones are still shown, since they reopen. Nothing in the live library carries a Hornslet branch, so it was caught before it was applied.
- **Themes for attractions.** A new sweep in Studio, "What an attraction is for", fills history, nature, family (and the other theme words) on attractions, read from each entry's own words with a quote, the same way the town sweep works. "Family" is only given when the entry gives children their own reason to go (animals, play, rides, hands-on), never just because children get in free. The Category filter uses the stored answer once it is there.
- **Cards.**
  - "Walk in" and "Walk in, no booking" are gone. "Book ahead" stays, since being turned away at a door is the costly mistake.
  - "Good for families" appears on a card when the entry's stored themes include family, and only then.
  - "Paid" is gone. The price chip now says who pays what when the entry states it: "Adults 190 · kids 95 kr · under 3 free", "Adults 145 kr · under 18 free", "Adults 125 · kids 60 kr". When the entry gives no adult price it reads "Entry fee", plus what children pay when that is stated ("Entry fee · under 3 free"). A student or pensioner price is never read as a child price, and the first number in a mixed sentence is never taken as the adult price.

## Batch 156: Klaipėda, a demo for the tourism centre

Oliver, 29 Sep 2026. He worked for Klaipėda's tourism centre and wants to show
them what Gemlyx would add to klaipedatravel.lt before rebuilding the app to
work outside Denmark. He chose two trips: four hours off a cruise ship, and a
full day.

- Address: /lithuania/klaipeda. Linked from nowhere, and the page rewrites the
  robots tag to noindex while it is open.
- Written by hand in src/data/klaipedaDemo.js and drawn by
  src/pages/KlaipedaDemo.jsx. Nothing in the Danish app reads either file, and
  neither touches the pipeline.
- Every stop carries the page its facts came from. Hours and prices were read on
  29 Sep 2026 from each place's own site. Where klaipedatravel.lt disagreed
  (castle museum summer days), the museum's own site won.
- The day picker answers per stop whether it is open on the chosen day, in the
  season that day falls in, on Klaipėda time (an hour ahead of Denmark).
- Prices are euros. The cruise trip counts from the gangway (+0:15), because
  ships arrive at different hours.

For the local check before it is shown: walking times are estimates; confirm
the Black Ghost's spot in the castle harbour, whether Meridianas serves food
today (its restaurant site says yes, klaipedatravel.lt says it no longer does),
the talking sculpture count, and the Old Ferry timetable.

## Batch 157: an attraction card reads like a town card

Oliver, 29 Sep 2026: "We need this map at attractions as well.. why is located
and tier completely ignored? And also, attractions' distance from Copenhagen is
probably irrelevant tbh. It should rather just say what town it is located in or
close to."

- The tier badge is on the picture, top left, the same badge a town card has
  (tierBadge). The legacy "Hidden Gem" chip went, as it did on towns.
- The small map of Denmark is top right, from the attraction's own coordinate
  when it has one and its town's otherwise. No coordinate and an unknown town,
  no map. The heart moved to the bottom right corner to make room.
- The line under the name is now kind, town and distance from the reader:
  "MUSEUM · RIBE". attractionWhere says "Near Ribe" when the row's own
  coordinate is more than TOWN_NEAR_KM (3 km) from the town centre.
- distanceLine no longer falls back to "~N km from CPH". In Denmark it still
  says "~N km from you" (the 28 Sep request). The craft card's travel time from
  its town centre went too.
- The grid's own "N places" line is gone; the filter bar above already counts.

## Batch 158: Phase 0 of the Lithuania plan

Oliver, 29 Sep 2026, of LITHUANIA_PLAN_29SEP.md: "Yes, we just need something I
can present to my old supervisor." Phase 0 makes the country something the app
knows, with Denmark unchanged.

- New `src/utils/countries.js`: profiles for DK and LT (slug, name, currency,
  time zone, bounds, Google and Wikipedia language codes), `rowCountry` (no
  country means Danish), `countryFromPath` (only `/lithuania...` leaves
  Denmark), `activeCountry`, `isInCountry`.
- `liveContent.js` keeps only rows for the active country; `townFrame` checks a
  town against its own country.
- `helpers.js`: `isInDenmark` reads the same box from the profile.
- `studioContent.js`: `shapeForLive` keeps `country` when it is not Denmark.
- Named COUNTRY_PROFILES because `profile.js` already exports COUNTRIES (the
  home country list for sign up).
- Nothing on the Danish site changes: the whole suite passed untouched.

## Batch 159: Phase 1 of the Lithuania plan, Studio drafts abroad

Oliver, 29 Sep 2026: "Aight... let's go, build! Any APIs I need?" No new keys.

- Studio has a Country picker (Denmark, Lithuania) above the type chips. A
  queued name keeps the country it was queued with.
- `generateArea` builds `draftLand` from the picker or the queue item, calls
  `setWorkingCountry` for the length of the draft and clears it at the end.
  Every research query, the planner, the Perplexity prompts, the organiser,
  the fact-check prompt, Nominatim and the Google lookups name `draftLand`
  instead of Denmark. A Danish draft sends byte-identical strings.
- `studioPrompts(name, land)`: a Lithuanian draft gets the same prompts with a
  preamble saying the country, that Danish facts stay Danish, and to write
  prices as "€6". A Danish draft's prompts are unchanged.
- Tiqets and Ticketmaster are only asked for a Danish draft (neither sells in
  Klaipėda). GetYourGuide is still asked.
- The Danish postcode tier does not run abroad.
- `api/places-locate`, `places-hours`, `directions`, `commons-photo` take
  `country` (DK default). places-locate reads five-digit and "LT-" postcodes.
  Photos come from lt.wikipedia for a Lithuanian row.
- `coordCheck` checks a row against its own country, so a Klaipėda coordinate
  is not "outside Denmark". Danish sentence unchanged.
- `liveContent` still records another country's town point in TOWN_COORDS, so
  a Klaipėda museum drafted in Studio can measure itself against Klaipėda.
- Euros: `familyChip` reads "Adults €6, children €3" as "Adults €6 · kids €3";
  students and pupils are not read as kids. `priceBand` bands euro prices on
  €12 and €30 (his to move) with `priceBandsFor("EUR")` labels; the Food budget
  filter uses the page's currency.
- `denmarkClock` reads the page's country's time zone.

Not done yet, noted: the Danish-only text checks (literalDanish, danishNames)
still run on Lithuanian rows, which should be harmless; Manage Published on the
Danish Studio lists Lithuanian rows with a few Denmark-flavoured audit notes.

## Batch 160: Phase 2 of the Lithuania plan, part one, the pages

- gemlyxtravel.com/lithuania is the same app, reading only Lithuanian rows. The
  page's country is read once at load (`PAGE_COUNTRY` in App.jsx), and
  `placeUrl.COUNTRY` is the page's slug, so a Klaipėda entry opens at
  /lithuania/attraction/... and Klaipėda's town page is /lithuania/klaipeda.
- The Klaipėda demo moved to /lithuania/trips.
- On a Lithuanian page: no front door (straight in), no Danish video or photo in
  the hero (plain gradient until there is a Klaipėda photo), the country's name
  wherever the copy said Denmark, Klaipėda's weather, a Lithuania outline on the
  card maps, no planner, chat, Tips or add-to-trip (Phase 3), and a page with
  nothing on it (Islands, Nightlife, Cheap gems, Essentials) leaves the menu
  until something is published there.
- Danish essentials in data/essentials.js are dropped on a Lithuanian page.
- Trip.com reaches Klaipėda (id 38977) in euros.
- Home is HOME_PATH ("/" in Denmark) everywhere the app navigated to "/".

Not yet: a hero photo of Klaipėda (Wikimedia is blocked from the build machine,
so it needs picking by hand), the Events page redesign and calendar import
(part two), and the share cards in middleware.js for Lithuanian links.
