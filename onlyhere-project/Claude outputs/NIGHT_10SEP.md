# Overnight, 10 Sep 2026

Ten files, all landed and verified. **Suite 15,010 passed**, one failure and it is
the sandbox-only `og-default.jpg` one. `tests/browser.mjs` 19 of 19.

Everything below was mutation tested. Four batches, 57 mutants, every survivor
chased and killed.

---

## What you asked for

**Hotel links off entry pages.** The three buttons and their small print are
gone. The guide keeps its version, and the difference is the argument: the guide
sends Booking a real checkin date and the day's stay area, a town page had no
dates to send and could only ever link to an empty search box. `airbnbUrl` had no
other call site in the app, so removing that row orphaned it; I parked it with
the date and reason rather than deleting it.

**Guided tour above self-guided**, in the order you asked.

**"What's on" is a dropdown**, closed by default, with the count on the row that
opens it so the question is still answerable without opening it.

**Affiliate links you can change, in Manage Published.** The panel could only
report before. Each row in the queue now has a field: paste a link, or empty the
box to take one off. What you paste goes through the same two gates the sweep's
own proposals go through, so a search page is refused with a sentence saying what
to paste instead rather than saving and then reappearing in the queue.

And it had a blind spot worth naming: **it audited `ticketUrl` and knew nothing
about `tourUrl`.** Every GetYourGuide link on the site was invisible to the one
surface built to tell you what your affiliates reach, while the number it printed
read as though it covered them. Tours are counted separately now, and only on the
types that can carry one, so the museums you deliberately leave out are not
reported as a hundred and forty gaps.

---

## The events faults

**Comic Con: a day of the event is not the event moving.** The prompt branch for
a dated event had one date field, so the model read 7 to 8 November correctly off
comicondenmark.com and had to pick an end. The gate could not tell, because it
was never given `dateEnd`. Both halves fixed: the gate takes the run, and the
dated branch now asks for `dateEndChanged` the way the undated one always has.
The model was right and the form was wrong.

**Tønder and Roskilde: the price says when it was true.** Nothing in this app
ever updates `ticketInfo`. It is written once by `shapeForLive` at draft time and
no pass touches it again, which is why 2,495 sold out sits on a 2027 page while
tf.dk sells the pass at 2,295. The page already knew when it was last looked at
and printed it 800 pixels below, so the ticket line now says it next to the
number: **"4-day pass 2,495 DKK (sold out) · checked 2026-08-16"**. One
definition, lifted out of `HowWeKnow`, because two copies drift.

**And which edition a price is for.** New field `ticketPricedFor`, on the
allow-list, asked for at draft time. I put an adversarial pass over realistic
Danish festival pages first, and it changed the rule I would have written:

> The test is POSITION, not presence. The year has to be in the ticket's own name
> or the heading directly above the price table. A year in the banner, the nav,
> the footer, a "siden 1974" line or a hashtag is on the page and not on the
> price.

Both of your real failures came from a year that was somewhere on the page. That
pass also put the share of prices that say nothing at all about their edition
at **roughly half**, on the marketing pages a search lands on in practice, so empty
is written into the prompt as the expected answer rather than a failure.

**And the one check that catches both without attributing anything:** a sale that
has not opened cannot be sold out, and neither can one whose early bird is still
running. Roskilde 2027 had not gone on sale. Tønder's early bird runs to 1
December. The prompt now names the Danish phrases for it.

---

## Still to do

The citations. `askPerplexity` returns `{ text, citations }` and the events loop
reads `text` and `error` and drops the rest, while `sweeps.js` line 616 already
does `citationUrls(res)[0]` for exactly this. That is the evidence link you asked
for and it is a small change; I left it because it touches the same loop as the
date gate and I would rather do the two together with you awake.

The date gate still guards `dateChanged` alone, so `ticketStatusChanged` and
`notes` walk past it. That is the Køge card contradicting itself in four lines.
Contained, and it wants the citations change beside it.

And `ticketPricedFor` is empty on all your existing entries. It is a one-field
sweep over festivals, which is exactly the shape `sweeps.js` is built for, and it
needs you to run it.
