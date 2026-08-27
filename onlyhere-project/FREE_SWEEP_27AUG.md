# The "free" sweep, and the redraft question — 27 August 2026

Suite **11,490 passed / 0 failed**. Build clean, tdz clean.

---

## Your screenshot is the fix working

Legoland now shows **"Walk in, no booking"** and no price claim. Nationalpark
Kongernes Nordsjælland and Christiansborg's Tower still say **Free**, correctly.
That's the renderer half, done this morning.

What's left is the data, and you put it exactly right: **the draft is fine.**

---

## Why Legoland has no price, and it isn't carelessness

Its ticket line reads *"Children under 2: free entry"*. I checked
[legoland.dk's own ticket page](https://www.legoland.dk/billetter-saesonpas/billetter/):

> Online **fra 349 DKK** · Ved indgangen **519 DKK** · *"Børn under 2 år får gratis entré"*

All three on one page. **The extractor read a true fact and kept the wrong one.**

Then [glyptoteket.dk's visitor page](https://glyptoteket.dk/besog/) showed me the
shape underneath it. It states *"Sidste onsdag i hver måned er der gratis entré"*
and **no price at all** — Glyptoteket's fares live on `billet.glyptoteket.dk`, a
ticket subdomain of the museum's own site. The extractor was handed a page that
prices nobody, and returned the true thing on it, which is precisely what
`glanceExtract` asks of it.

So the missing step isn't reading. It's *"this page prices nobody, go and find
the one that does."*

### And that step already existed

`App.jsx` has a price hunt that fires when nothing read so far prices the entry.
Its trigger condition is `concession-only`, which is entryAudit's own name for
this exact state, and its comment is the case word for word:

> every price on the page is a concession rate... "it means the page we read
> prices members and students and never says what everyone else pays"

**It was gated to festivals.** Attractions never got it. One line.

It's open to attractions now — and it costs nothing on a genuinely free one,
because a page saying "free entry" with no fare prices as `free`, so no call is
bought. I also had to branch the prompt: the festival version asks after "the
Danish event", warns about last year's edition, and lists Billetto and
Ticketmaster. A museum uses none of them. The attraction version looks for
*billetter / priser / entré / besøg* pages and, explicitly, for the ticket
subdomain — the shape that hid Glyptoteket's price in the first place. Widening
the gate without that would have been the half-wired version.

---

## The sweep itself

It lives in `publishedRepair.js`, because that file's whole thesis is yours said
back to it: *the prose is good, fixing the generator doesn't fix the rows, and
the repair is targeted, not a redraft.*

**Two kinds, and the split matters:**

| kind | what it means | example |
|---|---|---|
| **misleading-free** | the line names who gets in free, not what entry costs | Legoland, AROS, Glyptoteket |
| **no-entry-price** | the row says nothing about money at all | a silent row |

The misleading kind sorts first, and it's the worse of the two: an empty field is
a gap, but a field reading "free entry" is a wrong answer already on the site,
and you skim past it in Studio because it looks answered.

**On the eight live rows I swept, five need a price.** Rundetårn (`Adults: 60
DKK`), Davids Samling and Marselisborg are left alone — correctly.

Studio's audit panel now says it, separately from the structural problems,
because a row can be perfectly modern and still never have been told what its
door costs. And every finding carries `cost: "one field"`.

### Prices I could confirm from the operator today

- **Legoland** — from 349 DKK online, 519 DKK at the gate; under 2 free · legoland.dk, 27 Aug 2026
- **Glyptoteket** — free the last Wednesday of each month; the fare is on `billet.glyptoteket.dk`, not the visitor page

I stopped there rather than filling the rest from search results. Every price on
this site is supposed to come off the operator's own page with a stamped date,
and now that the hunt runs for attractions, a redraft of those rows will fetch
them properly instead of me pasting numbers in.

---

## And your other question: Copenhagen, Aalborg, Aarhus

**Yes, safely — and the risk is narrower than it feels.**

Nothing here holds a foreign key. Every relationship between an entry and a town
is matched **by name at render time**, through `samePlaceName` (which is why
København and Copenhagen resolve to one row). Which means:

- **rewrite the prose** → nothing breaks, that's what a redraft is for
- **change the name** → every relationship detaches at once, silently, and the
  URL moves
- **change the coordinate** → the region filter, the map pin, and every distance

Everything else on a town payload is prose or a glance value. The written
`region` field isn't even used for the region filter — that's derived from the
coordinate.

**Measured on the live site just now**, sweeping all 34 town pages:

| town | what points at it |
|---|---|
| **Copenhagen** | 8 towns list it as where you'd sleep (Køge, Dragør, Hellerup, Fakse, Vallekilde, Præstø, Rudkøbing, Ringsted), plus its nightlife venues, bar streets and scene guide |
| **Aalborg** | Øster Hurup bases from it, plus Jomfru Ane Gade and its venues |
| **Aarhus** | Samsø bases from it |

`utils/redraftImpact.js` computes that for any town and prints the brief before
you press the button. It reports; it doesn't gate.

**So: keep the name spelled exactly as it is, keep the coordinate, rewrite
everything else freely.** Copenhagen is the one to be careful with — not because
a redraft is riskier there, but because eleven-ish things detach if the name
moves and nothing anywhere would tell you.

---

## One assertion I had to retire

A test pinned the hunt's whole line, `sType === "festival"` included, so opening
it to attractions broke an assertion whose actual subject — *the hunt is an
escalation, not a step* — was untouched. Rewritten to pin the escalation
condition and not who's eligible. Six mutants on the new work, all dead by name.
