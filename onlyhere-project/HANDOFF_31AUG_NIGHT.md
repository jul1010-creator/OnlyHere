# HANDOFF — night of 31 August 2026

Suite **11,689 passed / 0 failed** (up from 11,607). Build clean.
Six source files changed. Everything below is mutation-tested: each fix was
reverted one door at a time and each mutant died naming its own assertion.

You said: *"Test through possibilities of us getting into situations where the
AI will get events wrong. Right now Vanvittig Vanvidshistorie - Aarhus is being
called free entry. And obviously it isn't on ticketmaster."* — then, correcting
me: *"It isn't free on Ticketmaster*"*.

So this is an audit of how an event gets published wrong, and six fixes from it.
I used Fable for a second reading. **Fable's top finding contradicted my own
diagnosis and was right** — that is section 8, and it is the one thing here I
have deliberately NOT fixed, because it needs your call.

---

## 1. Why Vanvittig Verdenshistorie was published as free entry

The page that priced it at nothing was **krop.aarhus.dk** — Aarhus Kommune's
KROP festival programme, which lists one date of a paid touring show as a free
programme item. `isOwnSiteFor` called it *the operator's own site*, so its
"gratis" was published with the operator's authority behind it.

It got there through **two doors**, and my first fix missed both.

**Door one — a city agreeing with a city is not ownership.**
The entry is called "Vanvittig Verdenshistorie - **Aarhus**", so `aarhus` is one
of its own name words, and the host label `aarhus` equals it. That is a
host-only match, which the code treats as a statement of ownership. By that rule
every page on `aalborg.dk` owns "Aalborg Karneval", and any calendar, programme
or news page on a city domain speaks for every event held in that city.

A host-only match now has to rest on at least one word that is **not a town
name**. The town list is read from `KOMMUNER`, the same list the file already
builds `KOMMUNE_HOSTS` from, rather than a second opinion about what a town is.
`marselisborgdyrehave.dk` still matches on *dyrehave*, `ribe-vikingecenter.dk`
on *vikingecenter*, and `aarhus.dk` on nothing.

**Door two — "a kommune speaks for the places inside it" is half a sentence.**
It really does speak for its parks, beaches and libraries, and that branch stays.
It does not run a commercial touring show that plays one night in its programme.
The branch now has its own precondition: an **event** is not one of the places
inside a kommune.

I got the first fix wrong before I got it right, and it is worth writing down:
my first version asked whether the *name* contained a non-town word. It does —
"vanvittig" — while the *host* had matched on "aarhus". Same wrong answer
through a longer sentence. The question is which word the **host** said.

---

## 2. A wrong-city Ticketmaster listing was a "strong" match

I added city ranking to `matchEvent` yesterday and put it in the **sort** only.
So it changed which listing got picked and not what the pipeline was willing to
claim about it: a listing in another city, within a fortnight of the date on
file, still came back `strong`.

`strong` is not a label. It is what writes `source: "ticketmaster"` and the
listing's own URL onto the row. On a touring show whose Copenhagen night falls a
few days from its Aarhus night, that publishes **Copenhagen's ticket link on the
Aarhus page** and calls it confirmed.

A known city mismatch can never be strong now. The listing is still handed back
and still named — it is real and worth your eye — at `weak`, which is the
confidence that does not write.

---

## 3. A tour was being fused into a festival that does not exist

`datesFromListings` read every listing carrying the name and fused anything
within a fortnight into one run with a start and an end. On Roskilde that is
right and it is why the function exists — eight day-tickets in one city across
eight days really are one run.

On a **tour** it invents a festival. Vanvittig Verdenshistorie plays Aarhus one
night and Odense the next week; both listings carry the name, both are inside
the window, and the offer was **"12 Sep – 19 Sep"** — a week-long run nobody can
attend, written straight into `dateStart` and `dateEnd`, on the one branch that
by definition has nothing else to check it against.

It now excludes the **known-wrong** city rather than keeping only the
known-right, and the difference matters: Danish venues often name no city at
all, and Kaløvig — the case this function was written for — had a city on not
one listing. A mismatch is evidence. An absence is not.

> Worth knowing: mutation testing said my first version of this fix **never ran
> in production**. I had fixed the function and not passed the entry to it at the
> one call site that uses it. Deleting the argument killed no assertion. That is
> the same "found and discarded" shape that keeps turning up in this codebase,
> and it is now pinned by a test that goes through `matchEvent` rather than
> calling the function directly.

---

## 4. A ticket-sale date was being published as the event date

`anchoredEdition` accepts a lone unlabelled future date, on the reasoning that
most festival pages are exactly that and refusing them would trade two wrong
rows for forty missing ones. Half of that still holds.

But the single most prominent future date on a **ticket page** is usually the
day the tickets go on sale. You said it yourself, on Rungsted: *"the 2027 early
bird is indeed possible to find on ticketmaster.dk."* An early bird has a
sale-opening date, it is in the future, and it is frequently the only parseable
date on the page.

The old test for this was literally `anchoredEdition("Smukfest. Billetsalget
åbner 04.11.26.")` asserting the date **was** read. Its comment defended the
trade by pointing at a second net — the month rule, which compares against the
date already on file. **A new draft has no date on file.** No slot, no second
net, nothing between a sale date and `dateStart`.

So the trade is kept and narrowed: a lone *unlabelled* date is still read, and a
lone date the page has **labelled as something else** is not. There is a new
refusal reason, `only-other-dates`, which says *"every future date on the page
belongs to a ticket sale or a deadline rather than to the event itself"* — not
"states no date", because those send you to two different places.

Two details that took a second pass:

- Sale dates are removed **before** the count, so a page carrying a sale date
  *and* the festival's own dates reads the festival's, instead of refusing the
  pair as a calendar.
- The vocabulary requires the **noun**, never the verb. "Festivalen **starter**
  4. august" is the event date written the ordinary Danish way.

---

## 5. Ticketmaster's "off sale" was overwriting a genuine "on sale"

This one is the *"MAKE SURE THAT THE TICKETS AREN'T TAKEN"* family.

`reconcileTickets` had `replaceable = filed === "on_sale" || filed === "unknown"`
under a comment saying *"It replaces a DEFAULT, never a stated sold_out or
free."* But `on_sale` is not a default. An empty field normalises to `unknown`;
anything reaching `on_sale` is something a writer actually wrote off the
operator's own page.

So the **ambiguous** value was overwriting the **certain** one. Ticketmaster's
`offsale` means, in their own data and in this file's own words, *"one of three
things and their data does not say which: sold out, sales not open yet, or sales
already closed"* — and it is **one seller's allocation**, not the event. A Danish
festival selling through its own site with a small Ticketmaster allocation reads
off sale there and on sale everywhere else.

The direction was already decided two branches up in the same function: *"A
wrong sold-out talks a reader out of a trip that would have worked."* Turning
"Tickets on sale" into "Not on sale right now" on evidence that explicitly
declines to say which of three things it means is that same mistake in a milder
badge.

Only `unknown` is replaced now. A stated `on_sale` is kept and **contradicted** —
raised as a finding at medium, naming the ambiguity, pointing at the operator's
own ticket page, and telling the writer in as many words not to say tickets are
unavailable.

---

## 6. A guided tour was being published as the entry price

Same fault as the IDA-members rate you caught on Food Festival, one word along.
"Take the lowest anyone can buy" is right among ways through the **gate**, and a
guided tour is not one — you buy it after you are already in.

A museum page reading *"Entré for voksne 180 kr. Rundvisning 50 kr."* published
the **50** as the cost of getting in.

There is now a second vocabulary for a thing sold *inside* rather than
*alongside*: rundvisning, omvisning, guided tour, workshop, kursus, foredrag,
smagning, sejltur. And a new state, `inside-only`, for a page that prices only
those — a museum's tours-and-workshops page has not priced the door, and saying
"concessions" about it would send you hunting for a students' rate that is not
what is wrong.

Two deliberate exclusions, both written into the file:

- **Day and partout tickets stay in.** This file's own reasoning for
  lowest-wins is that "a ticket page lists day and multi-day and what a reader
  plans around is the cheapest way through the gate" — and a day ticket *is*
  through the gate.
- **"Koncert" stays out of the list.** A music festival says it in every second
  sentence about its own programme, and catching it would throw away the
  admission price on exactly the pages this app writes about most. A
  single-concert ticket priced on a festival page is a real miss and it stays a
  miss rather than being paid for with false positives everywhere else.

Adding the second kind is what exposed that `"concession-only"` was being
compared against **by literal in six places**. Five of them would have let
`inside-only` straight through as a ticket price — the fault the kind exists to
stop, one word later. They all go through one predicate now.

---

## 7. A climate goal in 2030 was making a 2006 page look current

`factAge` has a rule: if a page mentions a year newer than its newest full date,
that full date is prose and the year is the better evidence. True — for a year
that could be *when the page was written*. A page cannot have been written in
2030.

*"Vi er klimaneutrale i 2030"* is one sentence on a museum's about page, and it
defeated **both** gates at once: it made the real 2019 timestamp look like prose,
so the age test was skipped, and it was newer than this year, so the year test
could not call the page old either. A page last touched seven years ago passed
as current, and stopping exactly that is the function's whole job.

One cap closes both directions, and both are right for the same reason: a future
year says nothing about when a page was written. It cannot make an old page look
fresh, and it must not make a fresh one look old — which matters more often,
because **a festival announcing its 2027 dates is the most ordinary page this
app reads.**

---

## 8. THE ONE I DID NOT FIX — and it needs your decision

I asked Fable to read the event pipeline independently. Its top finding
contradicted my own diagnosis of the Vanvittig bug, and after checking it
empirically, **Fable was right and I was wrong**. I want that on the record
because it changes how much weight to put on the rest of this document.

### `scrapeTier` returns `"operator"` for any host that is not a known listing site

There is no ownership test in it at all. Whatever page gets scraped, its text
becomes `scrapedSiteText`, and downstream:

- `findTicketPrice` labels it **"the operator's own page states it"**
- `datesConfirmedBy` uses it to **lock a date**

So this is a **second, wider path to the same "free entry" outcome** — sections
1 and 2 above close the `isOwnSiteFor` doors, and this one walks past them.

**I have deliberately left it alone**, because closing it changes what counts as
the official site across *every* draft, and the obvious fix risks regressing the
thing you were most emphatic about:

> *"If their own website tells you a date, then there is no page to contradict
> it.. what should contradict Roskilde-festival.com's page? Some blogger from
> USA? Be reasonable."*

A stricter `scrapeTier` makes fewer pages count as official. Get it slightly
wrong and Roskilde's own site stops being able to confirm its own dates. That is
not a change to make while you are asleep.

**The question for you:** should a scraped page have to pass `isOwnSiteFor`
before its text may be called the operator's? My recommendation is yes, with the
Google-registered-URL branch kept as an outright win (it already is), and with
the demotion reported in the run log rather than silent — so if it demotes
something it should not have, you see it in the trace on the first draft rather
than in a published row. Say the word and I will do it with the same mutation
discipline as everything above.

### Still open from Fable's list, not yet addressed

- **`ticketPriceOn` and a festival's side concerts.** Section 6 fixes tours and
  workshops. A single-concert ticket on a festival's own page is still taken as
  admission, deliberately — see the "koncert" note above.
- Nothing else from its eight is outstanding; the rest are sections 1–7.

---

## Files changed

| file | what |
|---|---|
| `src/utils/pageScan.js` | both ownership doors; the future-year cap in `factAge` |
| `src/utils/tickets.js` | one shared city reader; wrong-city can't be strong; tour dates can't fuse; off-sale can't overwrite a stated on-sale |
| `src/utils/eventDates.js` | `otherLabelAt`, the sale-date rule, the `only-other-dates` reason |
| `src/utils/entryAudit.js` | `A_THING_INSIDE`, the `inside-only` kind, `NOT_ADMISSION` / `pricesAdmission` |
| `src/App.jsx` | the type threaded into `hostNames`; six literal comparisons routed through the predicate |
| `tests/run.mjs` | 82 new assertions |

---

## Two things I changed in the tests that you should know about

I do not like editing an assertion to make a fix pass, so both of these are
spelled out rather than buried.

1. **`"a lone unlabelled date is still read"`** used the fixture `"Smukfest.
   Billetsalget åbner 04.11.26."` — a sale-opening date, asserted as the
   festival's own. That assertion *was* the bug in section 4, written down as an
   intentional trade. I kept the general case it was defending (on a fixture
   that is actually a festival date) and added the narrow refusal beside it.

2. **`"off sale replaces the default"`** ran on `filed("on_sale")` and called it
   "the default". It is not, and that conflation was the bug in section 5. It now
   runs on an empty field, with a separate assertion that a stated `on_sale`
   survives.

Two more small things, in the same spirit:

- I named a constant `EVENT_TYPES` in `pageScan.js` and the bundler refused it —
  `eventTypes.js` already exports that name for something else entirely (the
  tags a festival carries: music, art, market). It was right to refuse: in the
  test namespace one would have silently shadowed the other. Renamed
  `EVENT_SUBJECT_TYPES`.
- That set was `["festival", "event"]` and **this app has no "event" type**. I
  invented half of it. Mutation testing is what said so — deleting `"event"`
  killed exactly one assertion, and it was the one reading the set back to
  itself. It is filtered through `CONTENT_TYPES` now, so a type that is not in
  the app's vocabulary cannot be listed there. Same reasoning let me delete a
  guard in `otherLabelAt` that could never run.

---

## Still open from before tonight

- Rejseplanen deep-link using the measured Google stop names
- `BOOKING_AFFILIATE_ID` is still empty (~10 links a guide)
- `SUPPORT_TABLE.sql` / `gemlyx_user_data` not created in Supabase
- `evidence.js` has no callers
- Museum Østjylland's row needs you in Studio — "Middelalderens Mennesker"
- 8 attraction rows still say nothing about price
- `vesterbro-minigolf` still says "Free entry"
