# Gemlyx, 13 Sep 2026, morning

**Your computer went offline while I was committing, so nothing in this round has
reached your PC yet.** It is all built and verified here. The moment your laptop
is awake again I can write it over, or you can tell me to and I will retry.

Suite **16,208 passing**, 0 failed, both timezones. Build clean. Started the
morning at 15,970.

---

## The one that matters most: Legoland was not free, and the app said it was

Your words: "it said Legoland and another children's attraction was free
entrance, and that only transport cost money."

Gemlyx did not invent that. The chat prompt built the attractions list like this:

```
FREE ENTRANCE ATTRACTIONS (free, no ticket needed):
  Legoland in Billund (theme park, free entry);
  LEGO House in Billund (..., free entry); ...
```

The words "free entry" were appended to every row unconditionally, and the
heading asserted it a second time. So the model was told three times over, and
"the theme parks and museums on your route are free entry, so your real cost is
transport and food for nine people" is a faithful reading of what it was handed.

The array is called `freeEntrance` for what it used to hold. There is already a
comment at the top of App.jsx saying "it used to mean it, and it holds Legoland
now". And `entryPrice.js` was written for this exact question. **The card on the
same screen was already using it**: your screenshot shows the Legoland card
reading "Entry is not free" beside a prompt saying it is.

Each row now carries what its own entry says: `free entry`, or
`COSTS MONEY: From 379 DKK online`, or `ENTRY PRICE NOT KNOWN, never call this
one free`. That third value is Legoland's real case, because its own ticket line
reads "Children under 2: free entry", which is a claim about who and not about
the door. The heading forbids the sentence you read by name.

---

## The events audit you asked for

Fable went through the whole events half. The short answer to "how do they
update" is: **there is one mechanism and it is a button, and almost everything it
finds it only flags.**

Studio, "Update current events", Run check. Sixty per run, broken first. Per
event it tries the operator's site, then the ticket link on it, then an image
reader on a poster, then a web search. A date it finds is refused if it is in the
past, earlier than the one on file, or in a different month unless the page
labels it as the event's own. Then it writes nothing: the panel's own words are
"This only flags it, update the real entry by hand." The one exception is a
waiting row with a new date, which gets a Publish button.

**Ticket status has no refresh at all.** The ticketing API is called twice, both
inside the draft pipeline. Nothing re-runs it on a published row, ever. So a
status is stamped once at draft time and never moves again.

### What that produced on your Midtfyns run

Eight findings, worst first. All eight are fixed.

1. **A guessed ticket status reached the reader in the same words as a measured
   one.** Your step 23 failed with the expired session, the status stayed the
   writer's "limited", the row was stamped `source: "writer"`, and the chat
   prompt was still handed "[tickets limited, book before travelling]" while the
   guide printed "Tickets are limited. Book before you fly." The card badge has
   told these apart with a tick since 13 August; the three places that turn a
   status into WORDS never learned. Worth knowing: the ticketing API has no
   sold-out code, so **every sold_out on every row is the writer's**, and the
   guide was crediting "the official site" for it.
2. **A measured status never ages.** A tick and "checked on 13 August" would sit
   on a row forever. The stamp's own comment says a status with no date "quietly
   ages into a lie"; the date was stored and nothing read it.
3. **The API failure was reported as an absent listing.** A failed call and a
   festival with no listing both return an empty array, so the log said
   "Ticketmaster returned nothing under this name", which is a fact about your
   login stated as a finding about the festival.
4. **"Did the correction land" was measured and then contradicted four lines
   later** by a banner that says AUTO-CORRECTED unconditionally. And a draft with
   a failed correction **can still be published**: none of the publish gates
   knows a correction was attempted.
5. **The 1235 DKK lives in the writer's own reader-facing text and nothing was
   ever asked to remove it.** The extractor refused its own proposed value, which
   leaves the writer's standing. Every price rule after that writes to founder
   notes, which are never published. The only stage that can remove a sentence is
   the correction pass, and the price checks were never wired to it.
6. **The chat prompt lost every event that was on right now**, because
   `isUpcoming` only looks at the start date, and then took its eight by database
   row order. Which events the model could plan around was decided by the order
   they were drafted in.
7. The sold-out sweep could inherit the tick, so a row could carry a status the
   API never said while still drawing the measured mark.
8. On the search tier, a refusal claimed "the page never says it is the event's
   own date" about a page nothing opened. **This is the most likely cause of the
   Næstved Food Festival dates being stuck**: an annual festival whose next
   edition falls in a different month can only be updated through the site-read
   tier, so a row with no website on file is refused every single run.

### What changed

One reader for "may this status be said to a traveller as fact", asking both who
said it and when, used by all four places that turn a status into words. A 120
day freshness window (Fable's number, stated as its own). The run log now says
when a lookup FAILED rather than reporting an absence. The correction banner
leads with "THE AUTO-CORRECTION DID NOT LAND" when it did not, and writes the
survivor onto the draft behind FIX BEFORE PUBLISHING so it is in front of you at
the moment you press Publish. A price on no page anybody opened is now fed to the
correction as a contradicted claim, scoped to types with a door. The chat prompt
includes what is ON NOW and takes the soonest eight.

125 new assertions.

### Three decisions left for you

1. **Should a failed correction BLOCK publishing?** It is visible now, not
   blocked. Fable would block it and says it is four lines. I agree: a
   contradicted claim is by definition one a page disproved.
2. **The untraced-price rule is scoped to festivals, attractions and bookables.**
   A restaurant's prices live on a photograph of a board as often as not, so "no
   page states it" is the ordinary case there. Widening it to food is your call.
3. **Everything about events is a button somebody has to remember to press**, and
   events are the only content type that goes stale by itself. The cheapest real
   improvement is a line in Studio saying how long since the last update run.

---

## The rest of the morning

**The `[[GEMLYX_READY_TO_BUILD]]` marker is gone from the assist.** Three places
render a reply and only one cleaned it; the other two printed the marker, the map
markers and every asterisk of markdown. One function now, and the suite fails if
a renderer stops using it.

**The scroll follows the text down.** It fired once when a message arrived, and a
reply is empty at that moment: it reveals word by word and the pictures load
later still. It watches the growing content now and lets go when you scroll up.

**"Maybe next week? Monday" reads as the 14th.** No day name was readable in any
of the six languages, and the answer test then threw away the half the reader had
not used. Both fixed, with the guards intact.

**The Kødbyen bias was real and Kødbyen was the mildest case.** Counted across
your six exports, Gemlyx's turns against yours: Dragør 13 to 0, Vesterbro 11 to
0, Nightpay 11 to 0, Nyhavn 9 to 0, Jomfru Ane Gade 9 to 1, Kødbyen 2 to 0. Every
inventory was handed to the model in database order on every turn, and the one
exception used `sort(() => Math.random() - 0.5)`, which is not a shuffle:
measured over 20,000 runs, the first element stayed first 3,910 times where an
even shuffle leaves it there 2,000. Real Fisher-Yates now, seeded once per
conversation. Events are deliberately not shuffled, because their order decides
which eight survive.

**The assist can add things now**, as a chip under the reply with a computed
caution: how full the trip already is, how many stops already share that theme,
whether the town is even on the route, whether the door costs money for a group.
It quotes the ticket line and never multiplies it.

**And the zoomed-in pins ask.** A short description from `cardLine`, the reader
the preview already uses, then "Is this interesting?" Yes/No. It asks only when
`unsureWhatTheyWant` is true, only on a place inside a town, only where you have
not already decided, and only on hover or tap. A No is real state, not a faked
sentence in the transcript, and it reaches the map, the preview, the guide
constraints, both build prompts and the chat prompt. There is a "Left out:
Legoland ✕" row under the map so a tap is visible and undoable.

**One thing found while wiring that up, and it is worse than the feature.**
`withoutExcluded` and `excludedNote` were imported into App.jsx and called
nowhere. `_constraints.excluded` reaches only the swap gate and the tour lookup:
**it never reaches the build prompts, and the violation check never runs on a
freshly built guide.** So when you type "skip Copenhagen", every reader we fixed
reads it correctly and the planner is then handed the whole conversation with no
exclusion list at all. The preview says it out loud now. The build path still
does not.

---

## Still open

1. **The exclusion path on the build.** See above. This is now the biggest one.
2. **The promise gate.** Nothing compares what the chat promised against what the
   plan contains.
3. Three readers of transport still disagree on your own sessions.
4. "1 week and 2 days" reads as 2 days.
5. Guide-side essentials are themed from Gemlyx's own words.
6. Kids revealed after the party question leave the party reading as "children"
   with no adult and no follow-up.
7. Day 8 in Danish, Ny Vestergade as a stop, photos on the route map cards, a map
   of each day's stops.
