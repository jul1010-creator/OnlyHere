# "Attractions all say free" — 27 August 2026

Your friend is right, and it was worse than a badge.

**29 of the 30 published attraction pages carried a green `· FREE`.
At least eleven of them charge money.** Legoland was one of them.

Suite **11,324 passed / 0 failed**. Build clean. tdz clean.

---

## Why it happened

The attractions pool's Studio type is called **`free`**, because it began as
free-entrance attractions — `data/freeEntrance.js` is still called that, and the
Studio prompt still says "this whole category is defined by being free."

When every row in it was free, `_kind === "free" ? "Free" : …` was a true
sentence. **Six people wrote it independently, because it kept being true.**

It stopped being true. The category is now the whole `attraction` segment and it
holds Legoland, Faarup Sommerland, AROS and Rundetårn. The renderers never
changed.

This is the leak `placeUrl.js` already named for URLs back in August:

> Studio calls these types `free` and `booking`; a person looking for
> Koldinghus is not looking for a free.

That got fixed for the address and left standing everywhere a person can read.

### The six places

| where | what it said | now |
|---|---|---|
| detail page badge | `· FREE`, hardcoded | only when the row says so |
| card type chip | "Free" | "Attraction" |
| card price slot | "Free" | the row's own price, or nothing |
| card green colour | green = in the free bucket | green = actually free |
| chat place card | "Free entry" | "Attraction" |
| filter option | "🆓 Free to enter" | "Attractions" |

---

## The failure underneath the failure

Fixing the renderers would have left **Legoland's badge still saying FREE.**

Its own Tickets row reads:

> **Children under 2: free entry**

Which is true, and says nothing about what anyone else pays. Same shape, all
live, all read off the site this morning:

| attraction | its own ticket line | really costs |
|---|---|---|
| Legoland | "Children under 2: free entry" | ~419 DKK |
| AROS | "Free entry for everyone under 18" | ~150 DKK |
| Ny Carlsberg Glyptotek | "Free last Wednesday of month" | ~145 DKK |
| Københavns Museum | "Free Wednesdays, under-18s daily & with Copenhagen Card" | charges otherwise |
| Trelleborg | "Free entry year-round to the fortress ramparts" | museum charges |
| Christiansborg Slotshave | "Free (garden only, palace interiors cost extra)" | interiors charge |
| Faxe Kalkbrud | "Quarry and Prismet free; museum entry extra" | museum charges |

`entryAudit.js` already had the concept and states it exactly: prices that are
all concession rates are **"NOT 'the ticket costs 100'"**. A free claim scoped to
**who**, to **when**, or to **which part** is the same shape.

So the rule is: **an unqualified free claim is a free attraction. Anything else
is a fact about somebody or something else.**

Done by subtraction, not by a list of qualifiers — the qualifiers are open-ended
(an age, a weekday, a wing of a building, a membership) and the words that may
innocently sit beside "free" are not. Take those away; anything left is the
qualifier.

### What the site will say after this deploys

- **quiet** (no price claim): Legoland, AROS, Glyptotek, Københavns Museum,
  Trelleborg, Christiansborg Slotshave, Faxe Kalkbrud, Folketinget
- **a real price**: Rundetårn `Adults: 60 DKK` · Amalienborg `125 DKK` ·
  Papirkunst `90 DKK` · Faarup `from 229 DKK`
- **still Free**, correctly: Davids Samling, Damparken, Haderslev Domkirke,
  Vadehavet, Mols Bjerge, Marselisborg, Kalø, Museum Østjylland and the rest

A range is shown from its **bottom**: Faarup's line is "229 to 399 DKK" and only
the 399 carries the currency, so reading the first complete amount would print
the expensive end as the price. entryAudit settled that one already — "what a
reader plans around is the cheapest way through the gate."

---

## Two things this costs, on purpose

**Folketinget goes quiet.** Its tours genuinely are free, but its line reads
"Free guided tours; booking required" and the rule cannot tell that from
"free for under-18s". A reader told nothing goes and looks. A reader told FREE
turns up with no money.

**Eight rows now say nothing about price at all.** That is a content gap the
badge was hiding, not one it created. Those rows never said what entry costs;
they said what it costs for somebody else. Worth a pass in Studio.

**And one to look at: `vesterbro-minigolf` says "Free entry".** Minigolf usually
is not. The renderer will believe the row, so if that one is wrong it is wrong
in the data.

---

## Two mistakes I made getting here, both caught by mutation

**Three source assertions were vacuous.** They used `stripNonCode`, which blanks
string *contents* — and every one of them was searching for a string (`"Free"`,
`"Free entry"`). Run that way they find nothing and pass whatever the file says.
Only the fourth failed loudly enough to expose it. `tdz.mjs` warns about this
trap in its own header. Switched to `stripComments`, which keeps the strings and
drops the prose.

**The order of two rules looked equivalent and was not.** Putting the free-word
test above the amount test broke nothing, because every priced example I had
carried a two-to-four digit figure. The two only come apart on a one-digit fare.
Added the row that says so.

Twelve mutants, every one dead by name — including the original bug put back
into the extracted badge, which is now caught by three *rendered* assertions
rather than by a regex over source.

The badge came out into `components/AttractionBadge.jsx` to make that possible.
DetailPage cannot be rendered in the suite: it draws the map, Leaflet reads a
real `document` at module scope, and standing up a fake DOM is what
`tests/render.mjs` refuses by name. Same move as the costs list yesterday —
**a surface that cannot be rendered cannot be checked**, and this bug was a word
on a page.
