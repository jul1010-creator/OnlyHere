# Handoff 10 — the live site, 12/13 August 2026

You pushed and went to bed with: *"do a full check up on coding. Look through the
website 'www.gemlyxtravel.com' and find anything that looks buggy. Go into pages
and blogs."*

I did, in your Chrome, on the real site. **Everything below is written to your
disk. Nothing is pushed.**

    Suite      3386 passing, 0 failing   (was 3316)
    Mutations  27 run tonight, every one red before its commit
    Build      vite build clean
    Files      8 changed or added, listed at the bottom

---

## The one I would fix first

**A festival that finished and a festival happening next year printed the same
string, and neither said which.**

Two entries, side by side on your live site tonight:

    Skanderborg Festival    "2 Aug to 9 Aug"      finished 3 days ago
    Copenhell               "23 Jun to 26 Jun"    happens in JUNE 2027

`getEventDate` formatted with `{ day: "numeric", month: "short" }` and no year,
ever. To somebody planning a trip today both of those read as "this summer,
roughly now". Skanderborg was still wearing a **"⭐ Can't Miss Out"** badge in
live gold on 12 August.

Fixed three ways, because it was failing in three places at once:

1. **The year prints whenever it is not the current year.** Silent inside this
   year, which is the whole reason a bare day and month was chosen.
2. **A finished edition says so.** The date line goes grey and picks up "This
   edition has finished". The page still exists, because the link can be shared
   and the festival is real; it just stops pretending.
3. **Search stopped dressing finished events as current ones.** Typing
   "Skanderborg" returned it looking exactly like a live entry. Every events
   GRID filters on `isUpcoming`, and `utils/eventDates.js` says in its own
   comment that a finished entry is therefore *"correct and INVISIBLE"*. That
   was not true: **search was the door left open**, and it filtered nothing at
   all. It now marks them and sorts them last, rather than hiding them, so
   somebody searching by name still finds the festival they meant.

---

## The rest, worst first

### 1. The "Visit website" button went back to Gemlyx on seven festivals

Seven rows store `website` with no scheme: `copenhell.dk`, `groenkoncert.dk`,
`randersfestuge.dk`, `rockunderbroen.dk`, `vikingebyen.dk`,
`www.borkvikingehavn.dk`, `www.jellingmusikfestival.dk`.

`DetailPage.jsx` rendered that straight into `href`, so the browser read it as a
**relative path**. Measured in your browser, on the live page:

    <a href="copenhell.dk">  →  https://www.gemlyxtravel.com/copenhell.dk

Which `vercel.json` rewrites to the app shell. The reader pressed the one button
on the page promising to take them to the festival and landed back on your
landing screen, with nothing telling them anything had gone wrong.

`HowWeKnow.jsx` already had an `isLink` guard requiring `https?://`. The button
right next to it had none.

New `externalHref` adds the scheme, and returns null for anything that is not a
plausible http(s) target, so a junk value now renders **no button** rather than a
button that goes nowhere. Fixes all seven at render, holds for the eighth.

### 2. A festival vanished from the Events grid on the morning it opened

    const upcomingInTab = eventTabSource.filter(e => isUpcoming(e.date));

`isUpcoming` only ever reads the START. A festival that opened yesterday and runs
all week is not "upcoming", so it dropped out of the grid on exactly the days it
is happening. `DetailPage.jsx:141` was given the `isCurrentlyLive || isUpcoming`
pair on 7 Aug. The grid a reader actually browses never got it, and neither did
the Studio "update current events" batch, which was therefore skipping precisely
the events whose ticket status was most worth refreshing.

The test counts the one-sided filter across the whole file, so fixing one site
and leaving the other now fails.

### 3. Which version of Ribe you see could change between two page loads

Five towns have duplicate published rows: **Ribe (49, 84), Samsø (24, 79),
Ringkøbing (33, 90), Dragør (50, 72), Møgeltønder (22, 80, 89)**. Your console
has been naming them for a week.

The dedupe keeps the FIRST row it meets. The fetch had no `order`, and PostgREST
makes no promise about order without one. **So which Ribe a reader got was
undefined**, and `middleware.js` ran its own separately-unordered lookup, which
means the WhatsApp card could describe one version and the page open the other.

Both now take `order=id.desc`: newest id wins, because a duplicate is a redraft.
The console warning stays, because the rows still want deleting in Studio.

### 4. Seventy-two banned dashes were live, and the fix needed fixing first

72 en and em dashes across `gemlyxFind`, `ticketInfo`, `budgetLevel`, `price`,
`bestTimeGlance`, `blogBody` and prose, on entries drafted before `stripDashes`
existed. `stripDashesDeep` was written for GUIDES and never ran over content
rows, so every one of those entries needed a redraft to clean a character.

Content rows are now cleaned **on the way in**, at the single loader every
published row passes through. All 72 fixed without touching the database, and it
holds for anything published later by a path that forgets.

**But I ran it over the real values before wiring it, and it was wrong on eleven
of them.** The old rule turned a dash into "to" only between two digits and into
a comma otherwise:

    "495 DKK – 595 DKK"   →  "495 DKK, 595 DKK"     TWO PRICES
    "May 1 – August 31"   →  "May 1, August 31"     two dates
    "Moderate–High"       →  "Moderate, High"       two ratings
    "Mid-June–Sept"       →  "Mid-June, Sept"       two months
    "Rødekro–Kliplev"     →  "Rødekro, Kliplev"     two towns

The price one is why this could not ship as it was: a reader shown "495 DKK, 595
DKK" reads two prices, which is a worse error than the dash it replaced.

The distinction that separates every real case is **em dash versus en dash**.
An em dash is punctuation whatever sits either side of it, including numbers
("200 DKK — about 25 euros"). An unspaced en dash is a range or a route. A
spaced en dash is British punctuation. All three rules are tested against the
actual live strings, and I re-ran the new version over all 51 dash contexts on
the site: every one now reads correctly, nothing left dashed.

### 5. /api/weather fired eight times on every homepage load

Four cities, twice each, on first paint, every visit. Both consumers guard
correctly:

    WeatherHeaderStrip:  if (!weather[c.key] && weatherLoading !== c.key) ...
    WeatherStrip:        if (!data && weatherLoading !== weatherKey) ...

They are mounted at once and their effects run in the **same commit**, so the
second one reads state as it was before the first one called. Two correct
guards, eight requests. A ref is the only thing true during a commit, so the
guard moved into `checkWeather` itself, which is the one function all consumers
go through. New `src/utils/inFlight.js`.

Also: `setWeatherLoading(null)` ran unconditionally, so the first of four
concurrent cities to finish blanked the indicator the other three were using.

### 6. Row 62, TinderBox, is stored with a start date after its end date

    date: "2027-06-24"    dateEnd: "2026-06-26"

Somebody bumped the start to next year's edition and left the end on this one.
It printed as "24 Jun to 26 Jun", a coherent-looking range for a festival that
ends before it begins. `eventDateIssues` has detected "end date before start
date" since it was written and nothing runs it over published rows.

`getEventDate` now drops a backwards end and lets the start speak alone. **The
row itself still wants fixing in Studio** — I did not touch your data.

### 7. No robots.txt

`/robots.txt` fell through the catch-all rewrite and every crawler got the app's
HTML shell with a 200. `middleware.js` has been serving a real `/sitemap.xml`
this whole time with nothing on the site pointing at it. Added, with the sitemap
line, and the suite checks the origin against `config.js` so a domain change
cannot leave a stale copy.

---

## What I checked and found clean

- **The blogs.** 91 rows, 586 blocks. No empty headings or paragraphs, no
  bullets with nothing in them, no image block missing its `src`, no
  `[object Object]`, no `undefined`, no truncation. The only problem in them was
  the 18 dashes, now handled at the loader.
- **The console.** Clean on every page I opened, apart from the duplicate-row
  warning above and one exception from a Chrome extension of yours, not the app.
- **Every network request.** All 200. No failed calls anywhere.
- **`readTheDay`.** Correctly said nothing on an ordinary 17 to 18 degree day,
  which is what it was built to do.
- **The share-card middleware.** Well built, and its fallback discipline is
  right: every path that is not "a crawler asked for a guide that exists" ends
  in `next()`.

---

## Still open, and not touched

- **The apex domain does not resolve.** `gemlyxtravel.com` fails DNS; only
  `www` works. That is a DNS record, not code, so it is yours to add. Anyone
  typing the domain without www gets a browser error page.
- **Nonexistent paths return 200** carrying the homepage's canonical and meta.
  `<Routes>` has no catch-all, so `/nonsense` renders nothing. A SPA cannot send
  a 404 status, but it can render a real "not found" screen, and the canonical
  should not claim every URL is the homepage.
- **A hash change does not re-open a detail page** without a reload. Reachable
  only by editing the address bar, so no reader hits it.
- **Seven festivals have empty dates**: Københavns Historiske Marked,
  Wonderfestiwall, Nakkefestival, Randers Festuge, Distortion, Grøn Koncert,
  Geopark Dage. They render "Dates not confirmed", which is honest, and they are
  the 2027 research you have not done yet.
- **Two glance fields still report an empty check**: Sydhavsøernes Frugtfestival
  ("price unconfirmed") and Faxe Kalkbrud ("price not confirmed"). The gate that
  catches this does not know the shape "check copenhell.dk", a bare domain with
  no organiser word, so Copenhell's `ticketInfo` and `camping` slip through too.
  Worth widening.
- **Food row 36, Hyttefadet, has no `desc` at all.**
- The three from last night: three-refuter panel on the invented-claim check,
  claim-level edits instead of whole-JSON rewrites, the guide's style rewrite
  still has no re-check.

---

## Files written to your disk

    src/utils/inFlight.js          NEW   one request per key
    public/robots.txt              NEW
    src/utils/helpers.js                 getEventDate, hasFinished, externalHref, stripDashes
    src/utils/liveContent.js             ordered fetch, dashes cleaned on load
    src/components/DetailPage.jsx        website button, finished marker
    src/App.jsx                          weather guard, events filter, search marker
    middleware.js                        ordered town lookups
    tests/run.mjs                        3386 assertions

## First thing tomorrow

    cd C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project
    node tests/run.mjs          # expect 3386 passed, 0 failed
    npx vite build              # expect a clean build
    cd ..
    git add -A && git commit -m "Live site sweep: event dates, website links, dedupe order, dashes" && git push

Then open Copenhell on the live site. The date should read **23 Jun 2027**, and
"Visit website" should actually go to copenhell.dk.
