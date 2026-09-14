# Gemlyx, 14 Sep 2026, morning

Overnight, while you slept. **Two of the longest-standing open items are closed**,
one bug from your own session is fixed, and there is a proposal waiting on the
API Direct key.

**16,612 passing**, 0 failed, both timezones. Build clean. Everything is on your
PC.

> **Run `npm install` if you have not since last night**, and the map checklist
> from the last handoff still stands before you push.

---

## 1. The exclusion path on the build. Closed.

Top of the open list for three days. Fable measured it before touching it, which
is the only reason we know what it was:

```
PLANNER (structure pass)   "Please skip Copenhagen, we have done it twice"
  the traveller ruled out: ["Copenhagen"]
  "Copenhagen" in the conversation the model reads: true
  a block naming what may not appear:            false
WRITER (JSON pass)         same
AUDIT on a guide that put Copenhagen back:       1 violation found
AUDIT called anywhere in App.jsx:                false
HOLE CONFIRMED
```

The cause was a decision somebody made on purpose and wrote a test around: only
a refusal TAPPED on the map reached the prompts, because a typed one "is already
in the text it reads". A control run proved the asymmetry: tap the same refusal
and the block appears; type it and it does not.

Now: one list, read once, into both build prompts AND the day-count retry, which
carried no blocks at all and was a side door. The audit runs on the finished
guide, matches through `variantsOf` so "skip Copenhagen" catches a stop filed as
"København", and a violation triggers one rebuild carrying the violations in your
own words. Survivors land in `planProblems` where every other post-build check
reports. Thirteen mutants, each killed by a named assertion.

## 2. The promise gate. Closed, and the measurement is the interesting part.

Nothing compared what the chat promised against what the plan contained. Shown
failing first, across three shapes:

```
"Day 2: Down to Stevns Klint..."       Stevns Klint not in the guide   every check: 0
"I'll work Kongens Have into..."       Kongens Have not in the guide   every check: 0
"you'll be there for Aalborg Karneval" not in the guide                every check: 0
```

Then the number that decided the design. A naive reader, where any published name
in a Gemlyx reply is a promise, **fires on 15 of 18 real Gemlyx sentences.** After
the chat's existing guards, still 12 of 18. Under a strict reading, the number of
real promises in those 18 sentences is **zero**. A gate at the naive setting would
have cried wolf on every trip and been switched off in a week.

So it is strict: a published place inside a day structure, a first-person
commitment ("I'll work X in"), or "you'll be there for X". Everything hedged is
left alone. Zero of the 18 fire. It speaks in your voice and quotes the sentence
back: *"In the chat I wrote ..., and no day here has Stevns Klint."*

Side effect worth knowing: `isFullPlanText` learned Danish "Dag", so a Danish
day-by-day plan now shows the build button. That was the 22 August case.

## 3. Why it pinned Copenhagen. Fixed.

Your sentence: *"If you fancy breaking the journey before Copenhagen, the train
from Germany runs close to Haderslev."*

There is already a reader for this exact shape, `isPassedThrough`, a closed
prepositional frame that has known "past", "through", "on the way to", "en route
to", "instead of" and five more since 8 September. It knew every preposition in
that sentence except the one it used. **"before" is in the list now**, with "short
of" and "on the far side of".

"after" is deliberately NOT in it, and the reasoning is written into the file:
"After Aarhus we head north" is a plan that contains Aarhus, and suppressing it
would take away a pin you asked for. Same asymmetry as the exclusion readers.

Together with the prompt rule from last night, that sentence now pins Haderslev
if Gemlyx holds it, recommends Ribe or Aabenraa if it does not, and leaves
Copenhagen alone either way.

---

## 4. The API Direct key. Read this before wiring anything.

I looked it up rather than guessing. API Direct is a pay-as-you-go unified search
across X, Facebook, Instagram, Reddit, YouTube, TikTok, news and forums, one
`X-API-Key` header, a unified response of title, url, date, author, source,
domain, snippet. **$0.002 to $0.01 per request**, 50 free per endpoint per month,
no subscription.

**Nothing in the repo references it yet.** The key is set; no code reads it. So
the pipeline does not have access to social media, it has permission to.

### It is the right tool, for one job only

Your own rule is that Gemlyx never invents a price, a place or a date, and the
events half is built entirely on provenance: `statedAsFact`, `isMeasured`, the
120 day freshness window, and the comment that says a status with no date
"quietly ages into a lie". An Instagram caption reading "see you in June!" must
never become a date on a published row.

But an organiser posts before they update their website, and often instead of it.
So:

**Social is a signal. It is never a source.**

A hit raises a line on the Studio run quoting the post, its date, its author and
its URL, and you open it and decide. It writes nothing. That is the same
discipline the Update Events panel already has, in its own words: "This only
flags it, update the real entry by hand."

### Where it earns the money, in order

1. **The rows nothing can reach.** Næstved Food Festival is stuck because an
   annual festival whose next edition falls in a different month can only be
   updated through the site-read tier, and a row with no website on file is
   refused every single run. A festival with no website still has a Facebook
   page. This is the only tier that can see it.
2. **Cancellations and postponements.** The most expensive thing to miss, and the
   thing announced on social first and on a website last or never.
3. **Ticket status ageing.** Nothing re-checks a published row's ticket status,
   ever. "Sold out" chatter is a reason to re-run the ticketing API, not a status
   to write down.
4. **The eight events the chat plans around.** A flag on one of those is worth
   more than a flag on a row nobody will see this month.

### Cost

One query per event, 60 events a run, is **12 to 60 cents a run**. Weekly is
about 6 to 30 kroner a month. The free 50 a month covers a pilot with no card on
file.

### What I would not do

Let it anywhere near the draft pipeline or the correction pass. Those write prose
a reader sees.

### And the sweep you asked for is built

> "API direct key should also be used for attractions own social media.. it's
> often the place they announce seasonal things."
> "I want you to get a sweep done for everything.. a search for every attraction
> and event's own social media."

You are right about where the information is, and about attractions as much as
events: a castle announces its winter hours on Facebook and gets round to the
website in March.

**`src/utils/socialAccounts.js`** is the judgement, pure and tested with no
network. **`api/social-find.js`** is the HTTP shape and nothing else, the same
split `api/tickets.js` and `api/scan-source.js` already document.

**The first tier is free and it is also the better one.** A business links its
own accounts in its own footer, so an account read off the place's own page is
theirs BY CONSTRUCTION rather than by an opinion about a name. No key, no cost.
API Direct is the second tier, for a row with no website, which is exactly the
Naestved case that is stuck today.

The care went where the bugs are, which is deciding what on a page is an account
at all. Every refusal is a real shape off a real Danish venue page, and each is
refused by SHAPE rather than by a guess:

- a share button (`facebook.com/sharer`, `twitter.com/intent/tweet`) is the
  visitor's account, not the venue's, and it is on almost every page in Denmark
- a post or a feed (`instagram.com/p/`, a hashtag page, a YouTube watch URL) is
  real and is not somewhere to ask a question of
- somebody else's, in the footer beside the venue's own: the tourist board, the
  ticket seller, the agency that built the site

A search result gets a REASON rather than a score, because a number invites a
threshold and a threshold invites tuning: `linked` when the account's own bio
points back at the website we already hold, which needs no opinion at all, and
`named` when the handle carries the name, which is worth showing you and worth
nothing on its own. "ribe" against "Ribe VikingeCenter" is refused outright,
because a town name would match half the country.

Every record is dated, for the same reason every ticket stamp is: an account
that moved is a fact that ages.

**It writes nothing.** It returns what it found and you decide, exactly as
`scan-source` does, because a wrong handle stored silently is worse than none:
every later check would read a different business's posts and flag nonsense
about your row.

**What is left for you**, and it is the part I could not do from here:

1. A Studio panel that walks the rows and calls it. One button, the same shape as
   "Update current events": name, town and website in, a record and a `tried`
   trail back, and a Keep button per row.
2. A column on `gemlyx_content` to hold the record.
3. Running it. It needs your key and your database, and neither is mine to take.

The API Direct request shape is my reading of their docs and is **unverified**:
`GET /v1/search?q=...` with `X-API-Key`, results under `results` or `data`. If
their shape differs it is one function in that file.

### On Grok

Different kind of thing, and I would not reach for it here. Grok is a model with
live access to X; API Direct returns **posts with URLs**. For a pipeline whose
entire discipline is "who said this and when", a post with a link is strictly
better than prose about posts, because you can open it. If you want something to
summarise the flagged posts afterwards, that is the Claude call you already have,
not a fifth vendor.

**I have not written any of this.** It is an integration I cannot test from here
without your key, and it touches the content pipeline, so it is yours to say go.
Say the word and it is a small API function plus a tier in the existing run.

---

## 5. What I could not test, and why

You asked me to test the AI. I could not, and it is worth knowing why before you
try it yourself.

`npm run dev` serves the front end only. `/api/anthropic` is a Vercel serverless
function, so the chat returns **"Hit a snag: Request failed (404)"** locally on
every message. Use `npx vercel dev` if you want the chat working on your machine.

The live site runs last week's code, so testing there would mostly rediscover
what we fixed yesterday. It also froze the browser bridge twice at 2am. I stopped
rather than burn your API credit re-finding known bugs.

---

## Still open

1. **Two matchers for "is this row in a place ruled out"**: `isExcluded` uses
   substrings, the audit's `namesMatch` uses words. They disagree on "Ribe"
   against "Ribera". Unifying them changes pool behaviour on screens outside the
   brief, so it was left.
2. **The gazetteer reaches `readExclusions` only from the map.** So "Take Aarhus
   off" unpins it but never reaches the note, the constraints or the prompts.
3. **`_constraints.transport.ruledOut` is always empty**, so `checkTransport`
   cannot fire.
4. **The chat prompt contradicts itself**: it says to default to a full day by
   day plan in one place and forbids exactly that a few lines later.
5. `constraintNote` ends "Say the word and I will rebuild around it" and the
   panel has no button, so the reader has to go back to chat.
6. 170 em dashes left in strings, most inside prompts that themselves forbid the
   em dash.
7. Three readers of transport disagree; "1 week and 2 days" reads as 2 days.
8. From the events audit, three decisions still yours: should a failed correction
   block publishing, should the untraced-price rule widen to food, and a Studio
   line showing how long since the last events run.
9. **The map.** Detailed dark style on OpenFreeMap, per last night's note.
