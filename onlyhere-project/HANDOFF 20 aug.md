# Gemlyx, 20 August

Everything below is on disk in `onlyhere-project/`. **8148 assertions passing**
across four timezones (UTC, Europe/Copenhagen, Pacific/Kiritimati, Pacific/Niue).
`npx vite build` clean. 36 mutants run across seven rounds, one survivor and it is
an equivalent mutant, explained in place. **Nothing is committed to git.**

## Do this first

**Deploy, then run the events check once and read the trace.** It now prints the
real reason per event, and the answer to last night's mystery is in it.

---

## The image reader, which is what you asked for

> "Is there no way we can install an 'image'-reader? Because you'll find alot of
> announcements on banners like that... it would obviously only be used if there
> was a banner to scan."

Built. `bannerImages` pulls candidate posters out of the raw HTML before
`stripToText` deletes every `src` and `alt`, `bannerImagesFromMarkdown` does the
same on the Firecrawl path, and a vision call transcribes what is printed. The
transcribed characters go through the SAME `nextEdition` parser and the SAME
refusal guards as text off a page, so a date that arrived as pixels is not
trusted more for having been harder to get.

Your conditions, all four kept: only for a row that is undated or already past,
only after the free reads of the site and its ticket page found nothing, only
when the page actually had a picture, and only up to 2 pictures per event and 30
per run. Logos, social icons, app store badges, SVGs, data URIs and lazy-load
placeholders are excluded before anything is paid for.

The measurement behind it, taken in a browser rather than assumed:
cphdistortion.dk's front page is 285 characters of text, the only date in them is
3-7 June 2026 which has already passed, "2027" appears once in 238KB of HTML
inside a query string, and the real answer, 2 to 6 JUNE 2027, exists on that page
only as pixels.

**One real bug found while testing it.** The attribute reader used `\b`, and
`\bsrc=` matches inside `data-src=`, because a hyphen is a non-word character. A
mutation that should have failed did not, which is how it surfaced. Same class as
the unbounded substring matching this codebase has now fixed six times, wearing a
regex costume.

---

## What your first run of the trace actually showed

Forty events, four different domains, every one saying "the page could not be
read" and every one saying "the web search itself failed". **Forty sites do not
break at once.** That is one door refusing, and the trace was blaming the
festivals.

**One confirmed cause, fixed.** `refreshStudioSession` has existed for days and
`publishDraft` was the ONLY caller. Every other founder-gated route, twelve of
them, sent the token once and took the 401 as the answer:

    scan-source (x5)   commons-photo (x4)   places-hours   places-locate   tickets

A Supabase access token lasts about an hour. So an hour into any Studio session
all twelve start failing, and publishing keeps working, which is exactly why it
never read as a login problem: the one action that would have said so plainly is
the one action that was immune. There is now one `studioFetch` that attaches the
token and, on a 401 and only a 401, refreshes once and retries. The suite refuses
a thirteenth bare call site.

**The Perplexity half is NOT explained and I have not guessed at it.**
`/api/perplexity` checks only the origin, so an expired session cannot be why it
failed, and drafting uses the same call and works. Two facts that do not fit
together, so I have left it open rather than picking a side. The next run answers
it: a refusal from our own endpoint now says so, carries the HTTP status, and
quotes the endpoint's own sentence, so you will see `403: This endpoint only
answers requests from the Gemlyx site` or `401: Your Studio session has expired`
instead of a paragraph about a broken festival website.

I tried to read it off your browser directly and the extension did not answer, so
I stopped rather than keep poking at your machine while you were away.

---

## Distortion, measured rather than argued about

I fetched both pages directly. These are quotes, not recollections.

    cphdistortion.dk          "Distortion 3-7 June 2026"   285 chars of text
    cphdistortion.dk/tickets  "2-6 June 2027"              plain characters

**The answer was one free fetch away the whole time.** The front page is 285
characters, so the verdict is "almost-no-text" and the read is BLOCKED, and two
separate places threw the ticket link away for that reason:

- `readPage` returned `tickets` only on the unblocked branch.
- The caller followed a ticket link only `else if (first.ok)`, so an unreadable
  front page ended the chain.

How much PROSE came back and whether the page has an ANCHOR on it are different
questions, and this is the second field in three days lost to that confusion, the
first being the poster. Both now survive the verdict about the text. Firecrawl's
markdown links are read too: that path returned `tickets: []` since it was written
with a comment claiming markdown carries no hrefs, and `[Tickets](/tickets)`
carries both halves. One scorer for both formats, not two.

This also saves money. Reading /tickets as text is free and exact; asking a model
to look at a poster is not, and it now only happens when there is genuinely no
text anywhere.

**Expect Distortion to resolve to 2027-06-02 to 2027-06-06 on the next run**, off
the ticket page, as text, with no vision call. If it does not, the trace will now
name the step that stopped it.

---

## The three from the nightlife screenshot

**Old Irish Pub.** > "adding in Old Irish Pub when it says they shouldn't go
there is just a wild bug"

You are right and it is the same hole `isDeparturePlace` was written to plug, one
tier down. That function knows "out of Copenhagen" is not a request for
Copenhagen. Nothing knew that "steer well clear of X" is not a request for X. The
matcher asked only whether the name APPEARS, and it appears just as plainly in the
sentence rejecting it, so the more carefully the answer explained what to avoid,
the more confidently the screen recommended it. Worse: the conversation text
includes Gemlyx's own reply, so the product was reading its own warning back and
recommending the thing it warned about.

`isRejectedPlace` now drops those. Narrow on purpose, and with the control that
matters: a caveat about a recommended place ("great, though avoid it on a
Saturday") is NOT a rejection, and a place mentioned twice, once warmly, is kept.
Reading a wanted place as unwanted empties the screen in the other direction,
which is the failure that replaced the first version of the departure test.

**Asking after deciding.** It ruled out a second city and then asked whether you
had booked anywhere. The rule now: answer what they asked in full, and hold the
decisions the missing answer would overturn. Recommending places is answering.
Deciding where they sleep, how many bases there are, which towns are in or out, or
what the route looks like is not, while `stay` is still unanswered.

**Food.** > "maybe we should get rid of food all together. Unless it's actually a
food trip... Let that instead be something Gemlyx has ready for the person."

Done, and the machinery already existed: the `_notAsked` door. Food rows still
travel to the screen, the section can still say Gemlyx holds nine places to eat in
Copenhagen, and they are one click away. They stop occupying the itinerary.
Nothing is deleted and nothing is hidden.

Food is the ONE category where silence narrows. Everywhere else a brief that names
nothing narrows nothing, because silence is not a preference. Not mentioning food
is what almost every traveller does, so it cannot be the thing that fills their
days with restaurants.

**And a second defect found doing it.** The interest reader was handed the WHOLE
transcript, both halves. `tripBrief.js` has carried the rule in writing since it
was built: never from Gemlyx's replies, because the app suggests things. The rule
existed in one file and the caller was breaking it. One Gemlyx sentence with the
word "restaurant" in it would have re-opened the door your new rule closes, and it
would have looked like your own request. Interests now come from the traveller's
turns only. The place matcher still sees both halves, and must: Gemlyx names the
places and the screen has to show the ones it named.

---

## Still open

1. **Commit.** Nothing is in git. `.git` sits at `OnlyHere\`, one level above.
2. The Perplexity half above, which the next run will name.
3. Must-see ordering for towns, attractions and events. Agreed, not built.
4. The Danish dish content type. You write the dishes, I build the mechanism.
   Restaurants get no tier, on your call; the must-try belongs to the dish.
5. `src/utils/libraryContext.js` is written, unwired, and deliberately still not
   on disk. An unwired helper is a defect pattern here.
6. From the 19th: Stadia domain registration, RLS on `gemlyx_guides`,
   `coordFitsTown`'s 50 km tolerance, the statutory prohibition filed as a soft tip.
