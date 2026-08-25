# What Gemlyx is missing, measured against the category

25 August 2026. Eighteen AI travel products censused against primary sources,
the retention and trust research read, and gemlyxtravel.com walked live.

**Read the first section before the gap list.** The gaps only mean something once
you know what the category actually rewards, and the evidence on that is not what
anyone building one of these would guess.

---

## 1. What the category actually is

**Planning is commoditised. The trip itself is nearly unserved.**

| Tier | Capability | Of 18 products |
| --- | --- | ---: |
| **Table stakes** | booking integration | 16 |
| | persistent, EDITABLE itinerary | 15 |
| | conversational entry point | 13 |
| **Common** | maps | 10 |
| | live prices | 10 |
| | collaboration / sharing | 8 |
| | notifications | 6 |
| | route optimisation | 6 |
| | in-trip mode | 6 |
| **Rare** | offline access | 5 |
| | proactive disruption alerts | 5 |
| | email / reservation parsing | 4 |
| | budget tracking | 4 |
| | packing lists | 3 |
| | human expert fallback | 3 |
| | calendar sync | 1 |

Four of the named products are now **one company inside Expedia**: Layla bought
Roam Around and Trip Planner AI, and Expedia bought Layla on 31 July 2026.

**And the highest-rated product in the category is not an AI product.**
Wanderlog has ~35,000 five-star US ratings against Layla's 160 and Mindtrip's
721. Read what its reviewers actually praise: map-plus-itinerary in one view,
importing plans from email, group sharing, and price-drop alerts. **Almost nobody
mentions the AI.** Its AI assistant is one bullet in an eight-item Pro list.

Meanwhile Mindtrip, the best-funded consumer AI planner in the category, is
**free to consumers and has pivoted its revenue to B2B**. If consumer
subscriptions for AI itineraries worked at scale, that pivot is hard to explain.

### The number that should change how you think about this

Six independent studies agree, and they are brutal:

* **6%** of travellers fully trust AI travel output (Booking.com, 37,325 people)
* **42%** always fact-check it
* **8%** think an AI answer is sufficient on its own (Phocuswright)
* **24%** trust AI-generated travel recommendations (Skift/Wunderkind)
* **2%** of travellers will let AI book autonomously

And the one that matters most to you, from Dansk Industri and Epinion, 1,047
Danes: **20% of Danes use AI to plan a holiday, and only 2% prefer an AI
recommendation, against more than 40% who prefer friends and family.**

**In your home market, "AI-planned" is close to worthless as a trust signal.**
The provenance block is worth more than the AI is.

### And the finding that justifies your whole architecture

*Journal of Travel Research*, 2026, two experiments, N=232 and N=225:
**hallucinations damage loyalty significantly more than ordinary mistakes**
(M=1.61 vs 1.98, p<.05), drive more negative word of mouth (p<.01), and the
penalty is **significantly worse for an AI than for a human agent** (p<.01).

Their sentence: *"Customers tolerate regular AI mistakes more than AI
hallucinations."*

Every gate you have built for a month is aimed at exactly that failure. **That is
not a nice-to-have, it is the measured retention lever in this category**, and it
is the one thing on this page you already do better than anyone.

---

## 2. What you already have that the category does not

Checked on the live site tonight, not assumed.

**The provenance block, and nothing else in eighteen products comes close.**
On the Skagen page:

> `Sources: last checked 17 Aug 2026 · 8 sources · 5 corrections · 2 open questions [Show]`

No other product in the census shows **corrections** or **open questions**. Most
show nothing at all. Tripadvisor's AI summarised a resort facing 412 illness
claims as "spotless". You publish the count of times you were wrong.

**Affiliate honesty stated in the UI.** *"Plain search links. Gemlyx earns no
commission on these."* Nobody does this. Layla's page title is literally
`60% Off Hotels` and reviewers complain it "pushes hotels".

**Live weather on the landing page**, four cities, five-day, with a written
read of the day. Layla prints a fabricated 27°C seven weeks out.

**Real measured travel time**, door to door, with the number of changes.

**"What's closest to me"** with *"Only used on your device, never stored"* said
at the point of use rather than buried in a policy.

**The tier verdict** as a ranking a person decided, not a star average.

---

## 3. What is missing, ranked by the evidence

### First tier: the ones with direct evidence behind them

**1. Add a place to a trip from its own page.** You have a ♡ save. Saving is not
planning. The single most-repeated line in Wanderlog's reviews is *"Every time I
see a place we might want to visit, I add it to the trip plan for that city."*
That accumulation habit is the retention mechanism in the highest-rated product
in the category, and your entry pages have no route into a trip at all.

**2. An itinerary you can edit in place.** 15 of 18 have one. Yours is generated
and saved, and every change means asking for it again. Layla puts a **Change**
next to every leg and every stay. This is table stakes and you do not have it.

**3. Offline.** 5 of 18, Wanderlog paywalls it, and reviewers buy it as trip
insurance. You have none. And your audience is Ærø, Langeland and the Wadden Sea
coast, which is precisely where the signal is not. A web app without a connection
is a blank screen.

**4. In-trip "today" mode.** 6 of 18. The clearest single review in the whole
corpus is a Mindtrip four-star titled **"Great for planning, not great for using
on your trip"**, asking for a view showing just today's plan. Two-thirds of this
category stops working the moment you board.

### Second tier: common, and cheap relative to what they return

**5. Sharing with the person you are travelling with.** 8 of 18. Your own test
message was *"two of us"*. Right now one of them is the secretary.

**6. Price-drop alerts, or any alert at all.** This is the **single most cited
"worth paying" moment** in the retention research: *"I was advised by the app
that my hotel is probably cheaper now than when I first booked... £105 less."*
You have affiliate links and no watch on anything behind them.

**7. Currency and units.** Layla localised to kr and °C without being asked. One
line, and it is the kind of thing that signals the product knows where you are.

### Third tier: rare, which is why they differentiate

**8. Email or reservation parsing.** 4 of 18. Repeatedly named in Wanderlog's
reviews. It is plumbing rather than a model problem, which is exactly why nobody
has built it.

**9. Calendar sync.** 1 of 18. One product in eighteen. An `.ics` file is a
morning's work and it puts your guide into the place people actually look.

**10. A human backstop.** 3 of 18, and it is Layla's most differentiated
retention mechanism: *"the agent already had all the context, so no
re-explaining."* **You are the human.** There is no way to reach you from inside
a guide, and you now have a support page that nothing links to from one.

**11. Packing list, budget tracking.** 3 and 4 of 18. Low value each, cheap each.

### And the two the research says almost nobody does at all

**12. Post-trip anything.** 1 of 18. Photos, a record, a way to remember it.
**13. Creator payouts.** 1 of 18. Not for you, but worth knowing it is empty.

---

## 4. Two things on the live site that are wrong tonight

**The FAQ overclaims by about half the library.**

> *"Are all finds verified? Yes, every listing is hand-researched and fact-checked
> against multiple sources, never invented. We show when each one was last
> checked."*

Skagen honours that exactly. **77 of your 148 published rows carry no `__sources`
at all**, so for slightly more than half the library the second sentence has
nothing to show and the first is not yet true. This is the one page on the site
where an overclaim costs the most, because it is the page that makes the promise.

Either soften it to what is true today, or say the real thing, which is better
anyway: *"Every listing is researched and checked by one person. Where we have
the sources recorded, we show them, including where we were wrong."*

**And the free/paid sentence.**

> *"Is Gemlyx free? Yes, completely free for travelers."*

You are building a subscription and a paid-only offer field. Layla's Trustpilot
carries a refund dispute and a chargeback over exactly this shape of change.
Decide now what that sentence becomes, and change it in the same push that makes
it false rather than after.

---

## 5. What I would do with tonight

**One: the entry-to-trip route.** "Add to trip" on every entry page, and a trip
that accumulates. It is table stakes, it is the retention habit in the
highest-rated product in the category, and it makes every one of your 148 pages
a way into the guide instead of a dead end.

**Two: the itinerary you can change.** A **Change** on every stop and every
stay. Without it, the guide is a document, and every product above you has an
object.

**Three: `.ics` export.** One of eighteen products has it. It is a morning, and
it puts your trip in the app people already open.

**Four: fix the FAQ.** Ten minutes, and it is the sentence your whole position
rests on.

**Not tonight, but next:** offline, and the today view. They are the two that the
evidence says the category has left open, and they are the two that need the
live-layer discipline written up this afternoon before they can be trusted.

---

## The one-line version

**The category has commoditised the thing you are competing on and left open the
thing you are best at.** Nobody trusts AI travel output, everybody verifies it,
hallucination specifically is what breaks the relationship, and in Denmark the
AI label is worth almost nothing. You are the only product in eighteen that
publishes its own corrections. **Stop selling the plan. Sell the checking, and
then be there on the trip.**
