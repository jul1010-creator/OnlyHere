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
