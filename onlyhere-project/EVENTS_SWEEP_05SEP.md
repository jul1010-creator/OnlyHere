# Events page — live site, 5 Sept 2026, ~17:30

Walked the Events navigation in your Chrome. Two screenshots attached.

**The section is live and it works.** "No confirmed date yet" is at the bottom of
the Local tab with Bork Vikingemarked in it, reading *"It runs every year. The
next dates are not announced yet."* under MARKET · BORK HAVN. So the deploy took.

---

## 1. Clicking Local or Major strands the page half way between two screens

**Reproduced twice, and it does not recover.**

Click either tab and the whole page slides left and stops there. The Events
column is cut off at the left edge (the intro paragraph reads "...ason across
Denmark", the first card is sliced in half) and the **Food page is parked in the
right third of the screen**, headline, filters, "25 places" and an Alma card all
visible. The nav still says Events. Clicking the other tab re-renders the grid
correctly but leaves the page in the same stranded position. See
`events-stranded-pager-05sep.jpg`.

The bottom pill (`Events | ● ● ● ● ▬ ● ● ●`) says the whole site is a horizontal
pager with one dot per nav item, so the Local/Major click is being read as a
swipe on that pager and it settles between two pages. This is the worst thing on
the page: the tabs are the first control anybody touches, and touching one breaks
the layout until a full reload.

## 2. Two dateless events are still sitting in the dated grid

- **Wonderfestiwall** (Allinge) — "Dates not confirmed", and **SOLD OUT**
- **Geopark Dage i Det Sydfynske Øhav** (Svendborg) — "Dates not confirmed",
  with "Best if already nearby" and "Selling fast"

Both are `type: festival` rows published before the 15 August gate, and
`isUpcoming("")` counts a missing date as upcoming, which is how they got in.
They are the exact case the new section exists for, so right now the page says
"Dates not confirmed" twice in the grid and "No confirmed date yet" once
underneath it, for the same fact, in two different treatments. See
`events-nodateyet-05sep.jpg`.

They are one PATCH each: set `type` to `undated` and add `__waiting`. Worth doing
before anything else here, because it is the section proving its own point.

**Wonderfestiwall also says SOLD OUT with no dates**, which means sold out for a
run that has already finished.

## 3. Three names for one field, on one screen

Same row, four labels, seen within two scrolls of each other:

| Card | Label | Value |
|---|---|---|
| Sebbersund Vikingemarked | Nearest **Stop** | Gæstgivergården (Hobrovej / Nibe) |
| Sydhavsøernes Frugtfestival | Nearest **Station** | Sakskøbing Station, under a 10-minute walk from Torvet, served by Lokaltog on the 710R Lollandsbanen line. |
| Græskarfestival | Nearest **Bus Stop** | Skælskør Busterminal |
| Ø Festival | Nearest **Station** | The nearest active train station is Svendborg Station. |

Two problems stacked. The label changes per card, and the value is sometimes one
word and sometimes a sentence. The last one reads "Nearest Station: The nearest
active train station is Svendborg Station", which says it twice.

## 4. "from CPH" is glued onto sentences that already say where they start

- *"A direct 'Frugtbussen' (Fruit Bus) service runs from Copenhagen on Saturday,
  September 19, 2026 **from CPH**"*
- *"Approximately 2 hours 15 minutes by train from Copenhagen to Jelling, with a
  single change at Vejle **from CPH**"*

Beside them, the same field done right: *"1h 59min 🚆 from CPH"*, *"Direct train
to Gråsten 🚆 from CPH"*. The suffix belongs on a duration, not on a sentence.

The first one also dates itself as **"September 19, 2026"**, US style, on a page
where every other date reads "19 Sept".

## 5. Almost nothing has a photograph

Counted across the Local tab: two cards with images (Bornholms Kulturuge, Kolding
Gin Festival) and the rest are the grey monogram plate. S, 5, S, G, R, J, R, G,
A, A. Same finding as this morning's front-page sweep, and it looks worse here
because the cards are bigger and there are seventeen of them in a row.

## 6. The floating page pill sits on top of the cards

`Events | ● ● ● ● ▬ ● ● ●` is fixed at the bottom centre and overlaps whatever is
under it at every scroll position. Caught it covering the title of Sebbersund
Vikingemarked, the date line of "500 års Reformations fejring i Haderslev", and
the "Read it ›" link on the Bork card.

## 7. Smaller

- **"Aarhus festuge"** is lower case on the front page strip while every other
  event is title case.
- **"Apple Festival West Funen"** is an English translation of a Danish market
  name, sitting next to **"Græskarfestival"** which is not translated. Pick one.
- Card heights are uneven inside a row, so a short card leaves a large empty
  block beside a long one.

---

## Order I would take them

1. The stranded pager. It breaks the page on the first click anybody makes.
2. Move Wonderfestiwall and Geopark Dage into `undated`. Two PATCHes, and it
   makes the new section true.
3. One label for the arrival row, and one shape for its value.
4. Photographs.
