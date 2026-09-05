# Front-page sweep — live site, 5 Sept 2026, ~06:35

Walked the live site in your Chrome. Screenshot attached: `frontpage-rows-05sep.jpg`.

Everything below is what the **deployed** build does. Tonight's commits are in the
repo, not on Vercel, so a few of these are already fixed and waiting for a
deploy — those are marked **(fixed, needs deploy)**.

---

## The one that looks worst

**Not one card in either row has a photograph.** All five in WORTH THE TRIP
RIGHT NOW are the grey placeholder letter — A, M, A, F, L. The preferences row
is mixed: Copenhagen, Aarhus and Kliplev have photos, Urban Camper Hostel and
The Barking Dog do not. On a site whose whole promise is "hidden gems, and this
is how you find them", the first two rows a visitor sees are five grey letters.

Worth checking whether these entries have no `photo` at all, or whether the
photo is there and `showablePhoto`'s licence rule is dropping it — that rule
refuses any CC BY / CC BY-SA image whose photographer is unknown, and it fails
silently. If it is the licence rule, the fix is filling in the credits, not
loosening the rule.

## The rows themselves

- **"WORTH THE TRIP RIGHT NOW" is not reading "right now".** It offers **Fårup
  Sommerland** and **Lakolk Strand** — a summer amusement park and a North Sea
  beach — on a 13–15 °C September day with rain around Aarhus, on the same page
  that says so 400 pixels higher. Either the row means "right now" and should
  take the weather and the season into account, or the heading is doing work the
  code is not.
- **All five are Attractions.** No town, no food, no nightlife. If that is the
  ranking working, fine; if it is a category that happens to sort highest, the row
  will look identical every day.
- **"Urban Camper Hostel — Nightlife · Closer to Nørrebro station th…"** The
  subtitle slot holds a *comparison* rather than a place, and it truncates
  mid-word. Under a name in a card, that line should say where the thing is.
- **"FITTING YOUR PREFERENCES" shows the empty state first.** On the first paint
  it reads "Tell Gemlyx what you like — pick a few interests and this row fills
  itself in", and only after the profile loads does it fill with five entries. A
  signed-in user with a profile is being told they have no profile for a beat.
- **The horizontal scrollbar under each row is the browser default** — a bright
  blue slab the full width of a dark page. It reads as a UI element rather than a
  scrollbar.

## Weather

- **The banner contradicts its own tiles.** "Rain around Aarhus today. **Dry
  elsewhere**" sits directly above a Copenhagen tile reading **1.2 mm rain** and,
  on a second load, an Aalborg tile reading **1.1 mm rain**.
- **Copenhagen disagrees with itself twice on one screen.** The tile says
  **☀️ 15°**; the forecast strip's own "Today" cell says **🌧 16°**.
- **The tiles show different fields on different loads** — Aalborg was "6 m/s
  wind" on one load and "1.1 mm rain" on the next. Whatever picks the second line
  is not deterministic.
- **The old weather card is still popping up** — "Day 1 now looks clearer than
  before", over the corner, on every load. **(fixed, needs deploy** — it is a bell
  with a count now, it says the actual figures, and dismissing it is permanent.**)**

## Events

**"COMING EVENTS" holds three events that have already started.** Aarhus Festuge
(28 Aug – 6 Sept) began eight days ago, Aarhus Food Festival (4–6 Sept) and
Bornholms Kulturuge (4–20 Sept) began yesterday. There is a LIVE EVENTS tab
beside it; these belong in it.

## Header

**"✦ Gemlyx Detour" is clipped to "✦ Geml"** at 1456 px wide — the exact bug you
reported. **(fixed, needs deploy** — the nav is a strip that scrolls with a
hover-to-strafe arrow and Detour is pulled out of it entirely, so it is always
whole.**)**

## Saved guides

The list is a good record of the intake bug: **"Billund Bricks & the Wadden Sea:
A Solo-with-Eight December Run"** (the one you reported), **"Dragør with Ten
Six-Year-Olds"**, **"Skagens lys og Aalborgs havn, fem dage med syv børn i
slæb"**. Four of the eleven have Danish titles and at least two of those were
English conversations — the language-mix problem, still open.

---

## What I would do first

1. The missing photographs. Five grey letters is the first thing anybody sees.
2. Move the started events out of COMING.
3. Make the weather banner read the same tiles it is printed above.
4. Decide what "right now" means in that row — season and weather, or rename it.
