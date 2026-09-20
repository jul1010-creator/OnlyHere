# Overnight, 19 Sep 2026

Batches 30 and 31 are on your disk, byte compared. **19,326 assertions, tdz, render and build all green.**

Nothing here needs undoing before you look at it. The one thing that needs YOU is at the bottom.

---

## 1. Stage 6 could delete a fact you had checked by hand

`askPerplexity` fact-checks the finished guide against the web, and the fields it
checks carry the frozen facts: Rejsekort, Kombardo Expressen, Flixbus, DSB Orange,
and every published Gemlyx essential quoted into the prompt.

So the likeliest thing for a search to flag was the thing checked hardest.
"The Rejsekort app requires MitID" is wrong, is all over the web, and is the exact
claim the frozen fact exists to correct. Perplexity flags it, Claude rewrites the
field, the verified fact is gone. On a finished guide. Silently.

**`src/utils/frozenFacts.js`.** Two halves:

- the checker is told what was verified against the operator's own pages and why a
  flag on one is expected rather than a finding
- **a rewrite that drops a frozen name is thrown away and the original stands.** That
  is what makes it a rule rather than a request, and it is the shape `correction.js`
  already uses on your own rewrites.

What is compared is the NAME, never the wording, so a rewrite is still free to be a
rewrite. Stage 5 got the same guard: it rewrites the same fields, is told "change
wording only", and nothing checked.

Every refusal goes in the run log with what was flagged, so you can settle it by hand.
A repeat on the same fact means the web has moved and somebody should look.

**One tradeoff, deliberately taken.** Sometimes the flag is right for the opposite
reason: the field names Kombardo Expressen on a trip that never leaves one region and
the correct fix is to remove it. That rewrite is refused too, because from there the
two edits are identical. Refusing a correct removal leaves a weak recommendation about
a real company; allowing it lets a checked fact be replaced by the myth it corrects.
The refusal is logged with the complaint, so you can do it by hand in ten seconds.

## 2. The short day retry threw away everything the build knew

When the writer came back with fewer days than asked, the retry used a DIFFERENT,
shorter prompt written out at the call site. It carried the JSON shape, the ruled out
places and the language. It dropped the frozen facts, the DKK rule, the booked bed,
the chosen events, the places they had been, what is on in the villages, and the
planner's skeleton. On the one path where a guide was already going wrong.

The other two retries in that function have always sent the whole prompt.

It does now too. **`src/utils/dayCount.js`.** Also fixed: the accepting test read
"at least as many days as last time", so seven asked, three back and four on the
retry was recorded as fixed and the build carried on with a four day guide. Those are
two different questions now. `better` decides which attempt to keep, and an empty day
is not a day. `shortBy` decides whether the traveller is still owed days, and if they
are they are told, above the guide, in their own terms.

## 3. The advertisement page

You and whoever told you were right, and it was worse than it looked.

**Measured before changing anything:** the stay card renders per NIGHT, gated only on
needsABed, and carries up to three outbound buttons. A seven night trip put **up to
21 hotel links on one page.** Nineteen of them were the same search again, because a
trip sleeping three nights in Odense is one booking.

**`src/utils/stayDoors.js`.** The door is now on the night that OPENS a stay, which is
once per decision you make. The second booking site is offered once on the
whole guide instead of beside the first every night. On a real week: **12 buttons
down to 4.**

Your standing rule survives and is asserted: the card and the sentence are still on
every night, and a guide with a night in it always shows a way to book it. A night
that lost its button says why ("Same bed as night 3, so there is nothing new to book
tonight"), or the page reads as broken.

The costs list still renders a ticket link per published stop. That is one link per
real thing, so I left it. Say the word if you want it capped too.

## 4. Danish and foreigner, carried through

The answer reached the community block and stopped there. `placeActivity` counted
EVERY event on an island, so Læsø with eleven things on, nine of them spoken Danish
and a members' dinner, ranked above an island with three a visitor could walk into.
The guide then sent a German family to the first.

Every row is counted twice now: `count` is what is on, `usable` is what this traveller
can get into, judged by the same `accessOf` the day cards use. A members' evening is
closed to everybody; language only counts against a non speaker. For a Dane the two
numbers are identical and nothing changes.

On the real Læsø shape, with the same nine rows:

- a Dane is sent to Læsø
- a visitor who reads no Danish is sent to Sejerø

and the block tells the guide the thing that matters: **"6 things on and only 2 open
to somebody who does not read Danish."** Both numbers came off the same calendar, so
that gap is a fact about the island rather than about what Gemlyx happens to hold,
which is exactly what a low count never is. It is told to say the gap and never to
call the island quiet. Your asymmetry survives intact.

Both readers get it: the guide build and the chat.

## 5. And I tested the island directory against the real sites

You said I could. It failed on **both** islands it was written for, and neither
failure was visible from a fixture I had written myself.

**Avernakø.** Its whole directory is one page, and the only link to it anywhere says
"Besøg Avernakø". That matched `see`, and the reader followed only stay and eat links.
So pasting avernak.dk came back with **nothing at all**: the front page lists no
businesses and the one page that lists every one of them was never followed.

**Sejerø.** Its front page links to Turist på Sejerø and nothing else useful. The links
to Overnatning and Handels- & spisesteder are ON that page. A reader that only looks at
the source stops one click short of every bed on the island.

Both fixed. `visit` is its own kind now and ranks first, the reader follows one hop
past the visitor page and never two, and the page budget went to four, which is what
Sejerø takes and one more than Avernakø needs. Verified against both sites'
actual markup: multiline class attributes, nested `<strong><u>`, `&amp;` in hrefs,
http links on an https page.

---

## What needs you

1. **Paste the DiscoverCars link into `CAR_RENTAL_LINK`.** `affiliates.js` already
   carries `discovercars: "DiscoverCars"`, so the button labels itself and carries its
   disclosure the moment you save it. There has been no car button anywhere since
   AutoEurope closed on the 14th. Oscar still wins on inventory if it ever answers,
   and the swap is the same one paste.

2. **Run the notices SQL once.** Two new columns, `headline_da` and `body_da`, or the
   next notice Add fails on the whole row. The panel hands you the script.

3. **Read the island directory once on a real island** and tell me what came back even
   if it looks right. I have tested the parser against both sites' markup and the
   extraction against nothing: that half is a model reading a handwritten page.

Still open and untouched: wiring `readPosterText` into the community sweep, so a
Facebook post whose content is a picture can be read.
