# Gemlyx — 18/19 August

Everything is in the zip under `onlyhere-project/`, path-preserving. Copy the
folder over your repo. Your laptop dropped off before I could write directly, so
nothing has landed on disk yet.

**State:** 7716 assertions passing, four timezones (UTC, Europe/Copenhagen,
Pacific/Kiritimati, Pacific/Niue). `npx vite build` clean. 129 mutants across six
mutation suites, 0 survived. **Nothing is committed to git.**

---

## Do these two things first

**1. Register the domain with Stadia — do NOT set an API key.**

You set `STADIA_API_KEY`. That does nothing: Vite only exposes variables prefixed
`VITE_`, so a bare `STADIA_API_KEY` never reaches the browser, and the browser is
what requests the tiles. It is harmless sitting there, but inert.

And your instinct on `VITE_STADIA_KEY` was right, which is why I removed it.
`VITE_` inlines the value into the bundle at build time — it is a find-and-replace,
not a secret store. The key would have sat in a public JS file and in the query
string of every tile request, readable by anyone who opened the network tab, and
billed to you. Stadia's own docs say it: *"We recommend only using API keys in
cases where it is not likely to be leaked to an end user."*

The right mechanism needs no key at all. Stadia validate the `Origin` and
`Referer` headers the browser already sends:

> client.stadiamaps.com/dashboard → **Manage Properties** → **Authentication
> Configuration** → add the domain.

Per their docs, a site on `a.b.example.com` registers subdomain `a` and domain
`b.example.com` — so `gemlyxtravel.com` and its `www` subdomain are two entries.
Localhost needs nothing: *"As long as you're running via a development server
accessed via localhost or 127.0.0.1, you don't need an API key."* That is what
that "not strictly required" sentence I misread actually meant, and why nothing
looked wrong until it was deployed.

**2. `npm install` before `npm test`.** `package.json` now declares
`@babel/parser` and `@babel/traverse`; three test gates parse the source for real
instead of grepping it, and they fail loudly rather than skipping.

---

## The five you reported overnight

**South Jutland.** `partOfCountry` read `__lat` and nothing else, while its
sibling `regionOf` has always read `__lat ?? lat`. Two functions answering *where
is this row*, disagreeing about every row carrying a plain `lat`, and the Studio
coverage chip asks the blind one. A Ribe row with `{ lat, lon }` counted 0 in
south-jutland; the same row with `{ __lat, __lon }` counted 1. `discovery.js` had
the matching half in its latitude band.

The sentence was wrong in a second way that was worse: a row with no usable
coordinate is invisible to every geography filter, so "nothing published there"
was a claim about the **filter** dressed as a claim about your **library**. It now
counts the unplaceable rows and only says "content gap" when there are none.

**401 tiles.** Fixed properly — see above.

**Rome2Rio.** A leg chip read *"No direct route, check Rome2Rio"*, in gold, on a
guide someone paid for. It sent your reader to a booking aggregator and stated
something nobody checked: your own prompt rules say a missing Google itinerary
means UNCONFIRMED, not "no route exists", because Danish rural buses and island
ferries are often absent from the transit feed. It fired on Helsingør→Hillerød, a
scheduled train. Now Rejseplanen.

**"Far more things in the guide than in the review."** `MAX_PER_SECTION` is 6 and
the review sliced to it silently — on the screen you approve from. It now says
"showing 6 of 11, and the guide can use all of them". I also added a gate so a
**seventh content type cannot vanish**: a row whose `_src` has no section renders
nowhere at any count while the guide still uses it. Nothing is wrong today, but
that is exactly the state a new type breaks, and your own comment says why:
*"a thirteenth that fails silently is exactly how booking ended up missing from
the type picker."*

**"Fact-checking is too academic."** Both build stages renamed, both branches of
the panel reworded to lead with the method. The honesty is untouched and is now
asserted **per branch** — a file-wide regex could not tell which paragraph a
reader sees, and a mutation deleting the admission from the branch nearly everyone
gets passed it.

**The Vercel email.** Not reproducible; your files were byte-identical and the
tree builds clean. Send the failing log if it recurs.

---

## Then five more, all the same fault in different places

The South Jutland bug is a *class*, not an incident. I went looking for the rest.

**`DetailPage.jsx` had its own `nearbyEntries`** — thirty lines answering what
`nearbyPlaces.js` already answered, with its own flat-earth distance formula, own
radius, own limit, own self-exclusion rule, and no tests. It read `__lat` alone.
Worse: the pin and the dots resolved the place *differently* — the pin fell back to
the town centre, the neighbour list did not — so an entry could render a pin, zero
dots, and a caption reading "the pale dots are other Gemlyx entries nearby".
Deleted; one resolution feeds both.

**`liveContent.js` wrote the town reference frame from `__lat` alone.** This is the
worst place for it. `coordCheck.js` says it in its own words: a town's coordinate
is the frame every other entry in that town is measured against. So a town row
carrying a plain `lat` never entered `TOWN_COORDS` — its whole town had no frame,
and every unplaced stop in it fell through to no pin. **And nothing range-checked
it.** `publishDraft` has blocked bad coordinates on fresh publishes since 11
August, but pre-gate rows are still trusted, and this is where they do the most
damage. Both write sites now go through one gate that resolves `__lat ?? lat`,
coerces, and refuses anything outside Denmark. Refusals are named in one console
warning — **open your console once after this ships**; if any published town
carries a bad coordinate it will name it and the row id.

**Four copies of the walking speed, and the other modes disagreed.**
`claimCheck.js` has carried a test headed *"ONE SET OF SPEEDS, NOT TWO"* for days,
and it checked `claimCheck.js`. `routeOrder.js` had a second table anyway:

| | guideEnrichment (effective) | routeOrder's MODE_KMH |
|---|---|---|
| walking | 3.3 km/h | 4.5 |
| bike | 10.4 | 15 |
| transit | **35** | **60** |
| car | 56 | 70 |

Every row disagreed. The transit row matters most because the 35 is not a guess —
it was 55 until you measured one against Google (*"Public transport says 19
minutes... you then check maps, and it's 27"*) and 55 was already optimistic.
`routeOrder` was quoting 60. And it divided a great-circle distance with no
circuity factor at all. On Aalborg→Skagen, 85 km on a bike, it said **6 hours**;
the other model says **8**. Two numbers for one journey, on two screens of the same
guide. One model now, and a gate over every file in `src/`.

`routeOrder` also carried a **second haversine** (same maths, same earth radius)
and `DetailPage` was hand-rolling `* 62.06` for a longitude degree — cos(56.1°N)
computed once and frozen, right in the middle of the country and wrong at both
ends. Both delegate to the one in `helpers` now.

---

## The feasibility problem you and Sonnet worked out

Sonnet's read is right that the constraint that matters most was not being
checked, but the diagnosis is slightly off: **the gate exists.** `planGate.js` has
had a distance rule since 12 August, it runs on the planner's skeleton *before*
research, and it retries once with the problems named. What was broken is what it
measured with.

**`MAX_DAY_KM = 120`, flat, whatever the traveller said they travelled by.**
`routeOrder.js` has carried `MODE_DAY_KM` the whole time: walk 15, bike 60,
transit 250, car 300. So the gate was wrong in both directions at once —

- on a **bike** trip a 100 km day **passed** at 120 when the real ceiling is 60
- on a **car** trip a 150 km day **failed** at 120 when the real ceiling is 300

— so the planner was made to retry ordinary driving days while waving through days
nobody could ride. Your screenshot is the first case exactly: three days, parents
in their sixties, *"we want to cycle where it makes sense"*, *"time is"* the
constraint, and towns reading 9 / 222 / 101 / 129 km. The mode now reaches the
gate, the ceiling comes from the one table, and the problem sentence names the
number so the planner cannot satisfy it by moving one stop.

**And a second hole, which is the one I think matters more.** Rule 4 stays silent
on a day whose legs did not all resolve to a coordinate — correct, because a
partial total understates the day. But it never *said* so, and an unjudged day came
out of that function **indistinguishable from a day that passed**. On the product
whose whole promise is that nothing is asserted that nobody measured, that is the
wrong silence. The verdict now carries `unjudged` and `judgedDays`, the run report
names which days went unchecked and how much of each resolved, and the run log
records which ceiling was applied and why. It is never a blocking problem —
the planner cannot supply a coordinate you do not hold, and asking it to is asking
it to invent a town.

**On your "do I need directions at both ends" question:** no. The early check
needs no API call at all — it is already haversine over coordinates you hold, which
is why it costs nothing and can afford to run before research. Keep the real
Directions call at the end where the reader sees the number. That is what is now in
place.

---

## The missing website

> "It happens multiple times that the pipeline gives up on website (because it
> doesn't exist), when in reality, it actually is part of the city's official
> website."

One line of `App.jsx`:

```js
const host = new URL(u).hostname.replace(/^www\./, "").split(".")[0];
return nameWords.some(w => host.includes(w) || w.includes(host));
```

**The name was tested against the first label of the hostname and nothing else.**
For a park whose authoritative page is `aarhus.dk/dyrehave`, the label is "aarhus"
and the name words are marselisborg and dyrehave — no comparison can match. The
website field came back blank and, worse, `rankSource` then filed the
municipality's own page as a **blog**: beneath a ticket calendar, beneath
Wikipedia. In Denmark the kommune is the authority for parks, forests, beaches,
harbours and libraries, and almost none of those will ever have a domain.

**The same line was wrong in the other direction.** `host.includes(w) ||
w.includes(host)` is unbounded substring matching, both ways — the trap this
codebase has now fixed five times. "visitaarhus" contains "aarhus", so a tourism
board was promoted to "the place's own website" and its text entered the string
the run log calls the official site.

Both are fixed in one tested place. `isOwnSiteFor` reads the host **and** the path
with bounded matching, refuses a tourism board / ticket calendar / encyclopedia
outright, and honours Google's registered URL above everything. The kommune domain
list is derived from your own `kommuner.js` (99 names, folded so Æ Ø Å reach DNS)
rather than typed out a hundredth time, plus `kk.dk` which no rule would produce.

There is one extra rule worth knowing about: **a Danish domain is a compound with
no gaps.** `marselisborgdyrehave.dk` genuinely is that park's domain and no bounded
test can see it, because a hostname cannot hold a space. So a host label that
*equals* the name with the gaps closed up counts. **Equality, not containment** —
that is the whole safety of it, since `includes` would put "ribe" inside
`ribersgaard` all over again.

---

## Still open

**The one you reported that I have not touched.** A statutory prohibition is being
filed as a soft "tip". A rule with legal force and a ranger enforcing it is a
different *kind* of statement from "bring cash", and the schema has one slot for
both. That is a classification fix — the entry needs a severity, and the renderer
needs to treat a prohibition differently from advice. Worth doing and I did not
want to start it half-way.

One caution on that Google AI Mode page: the deer incident and the park closure
are its assertions, not verified facts. The *structural* points it makes are right
and are what I acted on. I would not put its account of the incident into an entry
without a primary source — which is the same rule the rest of the product runs on.

Then, in the order I would do them:

1. **Commit.** Nothing is in git.
2. Register the Stadia domain.
3. Delete the four stray paths at the repo root (`OnlyHere\...`) and the 8
   duplicate published rows.
4. The RLS SQL — `gemlyx_guides` is free-insert.
5. `coordFitsTown`'s 50 km tolerance is loose enough to pass a wrong town.
6. `vite@latest`.
7. The "helpful tips" split out of Essentials; geolocation start and "you are
   here" on the map; the account-aware quick guide; the freshness machinery.

**One thing I noticed and did not chase:** `mentionedModes` in App.jsx derives the
travel mode with its own inline regexes, while `travelModeKey` in `routeOrder.js`
does the same job with bounded, folded patterns and a test suite. That is a sixth
duplicated instrument. It has not caused a visible bug yet, which is exactly what
the other five looked like the day before they did.

---

## The two product calls, unchanged

The **$1-to-change-a-guide** charge prices the moment a person discovers they got a
date wrong — the moment they most need to fix it. The warning before generation is
the right half of that idea; the fee is the wrong half.

The **fun map** is decoration and should stay decoration. Every hour spent making
it accurate is an hour spent making it a worse version of the Google Maps view that
starts when the trip does.
