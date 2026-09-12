# Gemlyx night shift, 12 Sep 2026

You put me on nightwork and picked three things: hunt bugs like tonight's, the
guide's own checks, and finish the map asks. Season work you left out, so I have
left it out.

Everything below is ON YOUR PC, suite green, build clean, and every mutant
killed. **15,501 → 15,647 passing.**

Committed and pushed by Oliver on the morning of 12 Sep, so all of it is live.

The five new findings all land in `_planProblems`, which renders above the guide
in Studio and is stripped on save, so they are Oliver's to read and never reach
a traveller. The one change a traveller WILL notice is the new question: anyone
who says they have booked somewhere is now asked which nights it covers.

---

## The one worth reading first

Your opening message to Gemlyx was:

> We have booked a stay at " 25hours Hotel Paper Island"

**The brief read nothing from that sentence at all.** Not "booked". Nothing. The
most structural fact in the whole brief, written in the plainest words there
are, and `readStay` had no branch that could see it: "stay" is not in its list
of places to sleep (the list has "somewhere to stay"), and the name sat behind a
quote mark, so even the four-word-name branch you added on 26 August could not
reach across it.

Every failure you reported that night follows from that one miss. The writer was
never told a bed existed, so it invented a check-in on Day 1 at 16:00. Days 2
through 9 got their own hotel recommendations, because the call that writes those
is one call per day and none of them had been told either. And WHAT YOU PAY
finished the job with "10 nights in the plan with no bed booked yet", on a trip
where you had named your hotel in the first message.

Fixed, with the false positive that would cost the most held out: a COMPLETED
booking verb is required, never a bare "book", so "I want to book somewhere like
the Admiral Hotel" is still an intention and not a booking.

---

## 1. It didn't ask what date you booked it for

> "It didn't ask what date I booked it for. It just assumed it was the first day."

The stay slot has only ever held one word: `booked`. A booking is a fixed point
and the slot's own question already promises it — "If you have, the whole plan
should sit around it" — but a fixed point with no date is not a fixed point.

**Now it asks.** A second slot, `stayWhen`, that only exists when there is a
booking to ask about. It is answered without a question wherever you have already
said it:

| what you write | what it reads |
|---|---|
| "booked for the whole trip" | every night |
| "booked for the first two nights" | days 1-2 |
| "the last two nights" | counted back from the end, whatever the trip turns out to be |
| "for the Saturday and Sunday nights" | resolved against your arrival day |
| "from the 14th till the 16th" | days 1-3 |
| "the whole trip", answering the question | every night |

And the things it deliberately does **not** read, because guessing is the bug:

* "for 3 nights" — says how many, not which. Reading that as the first three is
  exactly what Gemlyx did.
* "the whole trip is about food" — every word the pattern wants, in a sentence
  about nothing of the kind.
* "we booked the hotel, we land Thursday" — Thursday is when you arrive, not a
  night you paid for.

**What it does with the answer.** The writer is told which days already have a
bed and to put the check-in on the first of them and nowhere else. The per-day
accommodation call — the one that wrote eight wrong recommendations — is told,
per day, "this night is already booked, return nothing". And because WHAT YOU
PAY counts the days that still have a recommendation, the "10 nights with no bed
booked" line fixes itself.

**And when nobody has said.** The writer is told that plainly and told not to
decide, which is the half that stops Day 1 at 16:00 appearing again.

---

## 2. The guide contradicted itself about money, three times on one page

New file, `utils/moneyClaims.js`, wired into the build report beside the
closed-but-planned check and blocking like every other plan problem.

**Day 3: "the National Museum is free to enter" / WHAT YOU PAY: "150 kr".**
Nothing in the app was wrong. The row holds a real figure read off a real page on
a stamped date, and the ledger printed it correctly. A sentence disagreed with
it, and every gate in the project reads one field at a time. The check asks
`readPrice` and `normaliseTicketStatus` — the two functions the ledger itself
calls — so the gate and the panel cannot drift apart.

It only fires on a free claim about **getting in**. Free refills, a free
courtyard, "free for under-18s" and "free for under-18s, 150 DKK otherwise" all
pass, because a check that cries wolf is a check you turn off inside a week.

**Day 5: "hostels here run around 20-30 per night".** No currency. A reader in a
country whose money is 7.5 to the euro will read that as euros and book
accordingly. Anchored on the per-unit phrase rather than on a cost verb, so "the
tour runs about 90 minutes", "open 10 to 17" and "the ferry sails 4 per day" all
survive.

**Day 9: "hotels start around 44 DKK per night".** Nothing with a roof in this
country sleeps anyone for 44 kroner. The floor is 100 rather than a realistic
200 on purpose, so an honest sentence about a campsite is not flagged.

---

## 3. "Make it absolutely clear that you can add something"

> "I think this reads too much like a 'how is the guide looking'."

You are right and the reason is grammar. "What are you interested in here?" asks
about the READER. Every other door in the product is a verb about the TRIP — the
preview screen you compared it to says "Add attractions", and nobody has ever
wondered what that button does.

It now reads **"Add a stop to day 4"**, with a line underneath saying what
happens next, and the button at the bottom says "Ask Gemlyx to add one to day 4"
rather than naming where it goes.

---

## 4. Attractions on the map, only when zoomed in

> "It's naming alot of attractions, but not showing them on the map."

Your 8 September rule was "we only need to have the towns popping up on the
map", and it was right — about a map of Denmark, where a museum is a dot inside
a town already on the screen. The map has since learned to fly down to one
place, and on a ten-kilometre view of Copenhagen the town pin is the thing
saying nothing.

**That is the third rule of yours this week whose premise moved underneath it.**
The other two were the lone-pin-equals-the-country rule and the card that opened
itself, both written for a country map and both wrong once it zoomed.

So attractions are pinned at every zoom and **drawn only from zoom 11**, which
sits between the zoom that frames two towns together (10) and the one a
"zoom in" beat lands on (12). Compare two towns and you get two towns; settle on
one place and you see what is in it. They live on their own map layer that goes
on and comes off with the zoom, rather than being rebuilt on every zoom tick,
which would rebuild the card under your cursor.

Attractions only. Restaurants and bars are the same change again and you have
not asked for them.

---

## 5. Two guards that found real shipped bugs tonight

Both of these are mechanisms, not typos, and both are one escaping level away
from any patch script written against this repo.

**No control character in any source file.** Three regexes in `tripBrief.js`
shipped with a literal BACKSPACE where every `\b` should have been. It looks
right in an editor, greps as though the `\b` were simply absent, prints from
`String(regex)` as a perfectly ordinary pattern — and matches nothing at all,
because the pattern now demands an actual backspace either side of the word. The
feature silently did nothing.

**No half-escaped escape inside `new RegExp(\`...\`)`.** The same trap one level
down, which the byte check above cannot see: a template literal needs `\\b`, and
a single `\b` only becomes a backspace when the literal is evaluated. Two more
lines had it. `\s` and `\d` are the same mistake with a milder symptom — they
reach the regex as a plain "s" and "d" and quietly match the wrong thing.

---

## 6. Day 10 was physically impossible

Day 9 ends at Jutland, 15:00. The transfer card into Day 10 — the one the app
draws itself — says:

> ⚠ Getting to Day 10: About 294 km to Copenhagen, 4h 30m by car. That is most
> of a day of travelling, so this is the day rather than a transfer inside it.

Day 10's first stop is Paper Island, in Copenhagen, at **08:00**.

Every number in that was already computed: the distance, the duration, the
judgement that the journey IS the day, and the clock the next day opens at.
Nothing compared the last two, so one card told the reader the travel would eat
the day and the line directly beneath it scheduled the day as though it would
not. **Third time this week for that exact shape** — the closure warning against
the plan, the free claim against the costs list, and now this.

The gate assumes they leave at 08:00, because a night between two days makes
almost anything fit in raw hours and "they could leave at four in the morning"
is an alibi rather than a plan. It uses the same measured figure the card beside
it prints, so the two cannot say different things. And it only fires on a
journey big enough to BE the day — a ninety-minute hop before the first stop is
an ordinary morning.

It also says the plainest version of the fact when it applies: *the day before
ends at 15:00, so this starts earlier in the day than the one it follows.*

---

## Still open, in the order I would take them

1. **Samsø is drawn on the mainland** and its leg reads "3h 34m by car" while the
   stop itself says to take the ferry. The coordinate is in your database and I
   cannot reach Supabase from here — but the leg is checkable without it: a leg
   to an island in `ISLAND_KOMMUNE_NAMES` that is not a ferry is a gate worth
   having whatever the coordinate says.
2. **Day 8 shipped in Danish** and your own check caught it: "MIXED LANGUAGE:
   mostly en, but 1 field read as another: Ny Vestergade". It reported and did
   not stop it.
3. **Næstved Food Festival** is planned on 19 September and KEEP IN MIND, in the
   same guide, says its real 2026 dates are 26-30 August.
4. **Ny Vestergade** is a street given 1.5-2 hours, and it is the address of the
   National Museum already visited on Day 3.
5. The rest of the map asks: **photos on the guide route map cards**, and **a map
   of each day's stops**.
6. Smaller: a stop labelled **N** where every other one has a number; "Jutland"
   as a HALF DAY stop; "which is **a apartment**" in your checks panel.

## One thing I noticed and left alone

`GuidePreviewScreen.jsx` holds `ADD_LABEL` — the same three category keys as
`addIn.js`, with its own wording. That is the second copy of one list, which is
this repo's signature bug; the "Free to enter" label was fixed twice before
anybody found the third site. I did not merge them tonight because the wording
differs for good reasons and merging would change copy on a screen you did not
ask about. The note is in the source so the next person knows there are exactly
two.
