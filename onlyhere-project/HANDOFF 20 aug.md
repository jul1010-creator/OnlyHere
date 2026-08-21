# Gemlyx, 20 August

Everything below is on disk in `onlyhere-project/`. **8239 assertions passing**
across four timezones (UTC, Europe/Copenhagen, Pacific/Kiritimati, Pacific/Niue).
`npx vite build` clean. **65 mutants, 0 survivors**, reproducible with
`node tools/mutate-20aug.mjs` (see below). **Nothing is committed to git.**

## The mutation runner is now in the repo

`tools/mutate-20aug.mjs`, 65 mutants over everything built today, 0 survivors.
Run it in slices, it takes about ten minutes end to end:

    node tools/mutate-20aug.mjs --from 0 --to 22
    node tools/mutate-20aug.mjs --from 22 --to 43
    node tools/mutate-20aug.mjs --from 43 --to 65

**Read this before you run any mutation script in this repo.** Every one of them
says at the top that its SIGTERM/SIGINT handlers protect the working tree. They
do not. `execFileSync` blocks the event loop, so a signal arriving while the test
suite is running is never delivered, and the first run of this file proved it: a
tool timeout killed it mid-mutant and left `readPosterText` swapped for
`readDatesFromImage` in App.jsx, four bytes different, with the suite red and
nothing saying why.

So this one keeps its protection ON DISK. It writes
`tools/.mutate-20aug.restore.json` before the first mutant and deletes it after
the last, and finding one at startup means a previous run died: it restores from
it before doing anything else. It also takes `--from` and `--to`, because the
honest answer to a ten minute cap is to run in slices rather than to hope. The
older `mutate-*.mjs` files still have the hole and are worth the same treatment.

Two mutants are deliberately NOT in the list: widening `DATE_LABEL_WINDOW` or
`REJECT_WINDOW_BEFORE` survives, and both are equivalent mutants rather than
gaps. What bounds those rules is the regex anchor, not the window, so the window
can be any size and nothing changes. Both are written up in place.

---

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

## Two corrected, two broken, same fault (evening)

    Sommer på Tobakken, Esbjerg     none        ->  2026-10-29
    Skanderborg Festival            2026-08-02  ->  2026-11-04

A summer season proposed for late October, and a festival that has run in the
first week of August for forty years proposed for November. Both read off the
operator's own site.

`nextEdition` takes the earliest FUTURE date anywhere in the text. tobakken.dk is
a VENUE: its front page is a concert calendar, so the first future date is
whoever is playing next. smukfest.dk carries a programme, ticket releases and
news, all dated. The parser was right about every date it found and wrong about
which one it was looking for, which is the same shape as the unbounded matching
this codebase has now fixed seven times: a rule answering "is there one" when the
question is "is it this one".

**Two nets, because one is not enough.**

1. `anchoredEdition`: a page with more than one future date has to SAY which one
   is the event's. A label wins outright (Danish, English and German: `Datoer`,
   `afholdes`, `finder sted`, `Dates`, `takes place`, `Termin`, `findet statt`).
   A page with exactly one future date is accepted, because most festival pages
   are that and refusing them trades two wrong rows for forty missing ones.
   Otherwise it refuses, and the trace says "the page lists several future dates
   and never says which one is this event's" — which is a different sentence from
   finding nothing, and it matters: on a concert calendar there was plenty found.
2. An annual festival keeps its slot. A proposal in a different month from the
   one on file is refused unless the page LABELS it, because a site announcing a
   genuine move says so in words. Only applies when there is a date on file; an
   undated event has no slot to keep.

**And a third bug found writing the fixture.** `dateRangesInText` used
`t.match(DAY_RANGE)` on a non-global regex, which returns the FIRST match and
stops. A festival page that opens with last year's recap and states this year's
dates further down lost the real answer to the recap, every time, invisibly: one
date came back and looked like the only one on the page. That is precisely the
Distortion page's shape. Every month-name range is read now.

---

## The office, from your three files

Your Danish fact-check names it exactly: the pipeline read the FOOTER of
copenhagencooking.dk, found Vigerslev Allé 18 in Valby, and used the secretariat
as the festival's location. Everything downstream then behaved perfectly on a
wrong input — `nearestStation` "Sjælør Boulevard", `travelTime` "15min", both
correctly measured, both to an office nobody is going to. The real hub is
Festivalpladsen in Kødbyen; the real stations are København H and Dybbølsbro.

The fact-checker's own explanation is the right one: *"Fordi en computeralgoritme
ikke automatisk ved, at man ikke kan holde en stor madfestival for 80.000
mennesker inde på et administrativt kontor."* A footer address is the cheapest
address on a website to find and the least likely to be the venue.

Built, in your order:

- `looksLikeOffice(address, context)` — refuses on the address itself
  (`kontor`, `sekretariat`, `postboks`, `c/o`, `att.`, `CVR`, `head office`,
  `Geschäftsstelle`) or on the 160 characters around it, which is what catches
  Valby: the giveaway was the CVR number beside it, not the street. Folded and
  bounded, so `Kontorhotellet 4` and `Pressefotografvej 2` are not refused.
- `eventLocation({ fromSite, fromPlaces, ... })` — the site first, Places second,
  and an office refused at BOTH tiers, because Places will happily return the
  secretariat when that is what is registered under the festival's name. When
  both are offices it publishes NOTHING and says why. An unconfirmed location is
  a state this product already handles honestly; a wrong one sends somebody to
  Valby.
- The festival draft prompt now separates the venue from the organisation before
  the mistake is made, names the words that give an office away, and says empty
  is the correct answer.

**Not yet wired into the draft's own location resolution**, and I have not
pretended otherwise. `mapHint` comes straight off the model's draft today, so the
prompt rule is what is live; `eventLocation` is tested and exported but the
pipeline does not call it yet. Wiring it needs the festival research step to
return the site's stated venue as its own field, which is the rest of your
"make OpenAI structure the research so the official website/ticket place is
immediately found". That is the next task and it is the one I would do first.

**The other two findings in those files I have NOT acted on yet:**

- **The invented 1,990 DKK.** eurotravelo.com published "$35 to $250", something
  converted 250 at about 7.9, and the figure was then attributed to the official
  site. Third-party travel-slop domains (eurotravelo.com, carnifest.com) recycle
  old data — the Israels Plads hub is 2017 — and are currently treated as
  ordinary sources. They should be demoted the way LISTING_DOMAINS are, and a
  price that came from one must never be logged as the official site's.
- **"Even the fact-checker defended the draft against Gemini."** Worth taking
  seriously on its own; I have not looked into it.

---

## Still open

1. **Commit.** Nothing is in git. `.git` sits at `OnlyHere\`, one level above.
2. **Wire `eventLocation` into the festival research step** (see above). Tested,
   exported, deliberately not called yet.
3. **Demote the travel-slop domains** and stop a price from one being credited to
   the official site.
2. The Perplexity half above, which the next run will name.
3. Must-see ordering for towns, attractions and events. Agreed, not built.
4. The Danish dish content type. You write the dishes, I build the mechanism.
   Restaurants get no tier, on your call; the must-try belongs to the dish.
5. `src/utils/libraryContext.js` is written, unwired, and deliberately still not
   on disk. An unwired helper is a defect pattern here.
6. From the 19th: Stadia domain registration, RLS on `gemlyx_guides`,
   `coordFitsTown`'s 50 km tolerance, the statutory prohibition filed as a soft tip.
