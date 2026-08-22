# Review, 21 August 2026

You asked me to look through our work and say what needs changing. This is what I
found, worst first. Every claim below is cited to a file and line and was checked
against the code rather than remembered.

Three of the top five are mine, from the last two days.

---

## 1. The profile learning feature does not work at all

Built yesterday, on your "this account is also so the AI knows the person.
Everytime a user uses the app, it gets to know him more." It is inert.

`observeTrip` runs after a successful build (`App.jsx:10642`) and the result is
handed to `saveProfile` (`App.jsx:10644`). `saveProfile` writes
`profile: cleanProfile(profile)` (`profile.js:349`), and `cleanProfile`
(`profile.js:177`) returns an object literal with exactly eleven named keys:

    name, bornYear, country, ageBand, sex, company, pace,
    description, interests, transport, style

`learned` is not one of them, so it is **dropped on the way to Supabase and
dropped again on the way back** (`fetchProfile`, `profile.js:338`). It exists only
in React state and dies on reload. Since an observation needs to happen twice
before it counts (`OBSERVED_MIN = 2`), the only way to ever see it work is to
build two guides in one tab without refreshing.

It is worse than dead: opening the profile sheet **resets the counter**, because
`ProfileSheet.jsx:55` sends back a cleaned object with no `learned` key and
`App.jsx:18651` sets it as state.

No migration is needed. It rides inside the same `profile` jsonb. The fix is a
passthrough in `cleanProfile` and nothing more.

**Also from that same file, rule 4, in its own words:** "IT HAS TO BE VISIBLE AND
REVERSIBLE. Somebody has to be able to see what Gemlyx thinks it has noticed and
clear it." No such UI exists. The tell is `learnedIsEmpty`, exported at
`profileLearning.js:82` and imported by nothing but the test harness. It is
exactly the predicate a "here is what we noticed" panel needs, and it has no
consumer. This is a Danish business and that rule was not decoration.

**And the suite gives false comfort here.** `tests/run.mjs:28363` asserts only
that the four rules are *written down*, by regex over the source text. That is a
test that the comment exists.

---

## 2. Ask Gemlyx may be hard broken right now

`api/ask.js:117` says plainly that `gemlyx_ask_log` "has never existed". The SQL
is in `SETUP_ASK.md`, and nothing anywhere records it as having been run.

That used to mean the feature was quietly unmetered. Since yesterday it means
something worse: `ask.js:128` now returns **503** when the count cannot be read.
If the table is still missing, every question fails with "Could not check your
question allowance just now."

**And the two schemas disagree.** `SETUP_ASK.md:14` creates the table with
`question`, `place`, `looked_up`. The `console.warn` at `ask.js:129`, which is the
SQL an operator actually sees when it breaks and therefore the one they would
copy, creates only `id, user_id, day, created_at`. The insert at `ask.js:283`
writes all three of the missing columns. Copy the wrong one and every insert fails
with PGRST204, `if (logged.ok)` never fires, and the quota silently stops
counting: the exact unmetered state that block was written to end.

One thing to check on the live site before anything else: open a guide, ask a
question, and see whether it answers.

---

## 3. ~~Fifteen serverless functions against a limit of twelve~~ NOT AN ISSUE

**Corrected 21 Aug 2026, on Oliver's word: the Vercel account is PRO, not Hobby.**
The twelve-function ceiling does not apply and `api/fx.js` is fine where it is.

I raised this because `middleware.js` and `SETUP_ASK.md` both still say the cap
is twelve. Both were written against the old plan and both have now been
corrected in place, so the next person reading them is not told the same wrong
thing. That is the actual defect here: a stale note that sounds authoritative.

One real thing survives from that section. `App.jsx:10457` reads
`userProfile?.country`, and `userProfile` is only populated for a signed-in user,
so **the currency line is invisible on the signed-out path the product leads
with**, which is most readers. That is a product decision to make, not a bug to
fix: either the guide asks where somebody is from before it builds, or the rate
line only ever appears for people with accounts.

---

## 4. The guide audit findings are almost entirely untouched

From `GUIDE_AUDIT_21AUG_scyek6rypzn.md`, checked against current code:

**The impossible bike crossing is still there.** `describeOvernightMove`
(`routeOrder.js:485`) still divides a great-circle distance by a fixed speed:
`straightLineHours(move.km, key)` → `guideEnrichment.js:716`, with
`bicycling = 14 km/h` and a 1.35 route factor. All seven audit lines reproduce
exactly, including 156 km → 15.04 hours → "roughly 15 hours on a bike" for a
crossing where **bicycles are banned from the bridge**. Nothing consults a bridge
or ferry restriction anywhere.

The smallest real fix: `App.jsx:9198` already builds a cross-day leg for the
Directions API, but only inside `if (day.stops.length === 1 && di > 0)`. Drop that
single-stop condition so every last-stop-to-next-first-stop pair is measured, and
have `describeOvernightMove` print the measured leg whenever it has one.

**The 90-minute floor** (`routeOrder.js:496`, duplicated at `:409`) still turns a
1 km hop into "under an hour and a half".

**The phantom journeys between two days in the same town** are still there.
`GuidePage.jsx:1918` computes `fromT` and `toT` right next to each other and never
compares them. The correct sentence already exists for intra-day legs
("Same place, nothing to travel", `GuidePage.jsx:1301`). One line at
`GuidePage.jsx:1913` fixes it.

**"These are," is still a live fragment.** The interpolation is
`withoutDayTripClaim` (`accommodation.js:449`); the cut regex at `:454` removes the
day-trip clause and stops at the comma, leaving a dangling subject. Running the
real regex reproduces the audit's line byte for byte. The only guard counts words
and waves 17 through.

**Stop numbers still skip.** `GuidePage.jsx:1736` opens the tall photo-card
variant, which has no badge; the badge lives only in the `else` branch at `:1770`.
So a photo stop consumes a pin number on the map and prints none on the card.

**Stadia is still unregistered.** That one is an account action, not code:
`client.stadiamaps.com` → Manage Properties → Authentication Configuration, two
entries for the domain and its www subdomain. Worth knowing: the runtime fallback
**cannot save you here**. `mapTiles.js:241` swaps basemaps after three `tileerror`
events, and a 401 that renders as a JPEG is a *successful* image load, so
`tileerror` never fires. To make the fallback real, probe one tile with `fetch()`
at init and treat a non-2xx as a refusal.

**The hostel-that-is-a-hotel is detected and then thrown away.**
`stayTierMismatch` (`accommodation.js:350`) does fire on Capsule Hotel Nyhavn63.
But the result lands in `_planProblems`, which is stripped from every save and
share as scaffolding (`userSaves.js:85`). Nothing rewrites, nothing tells the
reader. Cabinn City is not caught at all, and the file says so in its own comment.

---

## 5. Signing in with Google did not work. FIXED 21 Aug 2026

Written as "Google signup throws away everything the person typed", which was
true and was the smaller half. Investigating it turned up something worse.

**The session came back with no user id.** Supabase returns OAuth tokens in the
URL fragment, and the fragment carries no user object, so `shape()` set
`userId: ""`. The old code filled it in from `/auth/v1/user` inside a floating
promise that called `write()` and nothing else, so localStorage was eventually
right and React state was wrong for the whole visit. Every cloud call is gated on
that field:

    userSaves.js:25   if (!session?.token || !session?.userId) return null;
    userSaves.js:43   if (!session?.token || !session?.userId) return false;
    profile.js:327    if (!session?.token || !session?.userId) return null;
    profile.js:343    if (!session?.token || !session?.userId) return { ok: false };

So somebody who signed in with Google was signed in, saw their email, and had no
saves sync, no profile load and no profile save until they reloaded the page. The
only visible symptom was the "Signed in, but your saves could not sync right now"
toast, which reads as a passing network problem rather than the account not
working. Anybody who signed in with Google before today still has a stored session
with an empty id, so `getSession` now repairs one rather than making them work out
that signing out is the cure.

**A failed sign in was completely silent.** A disabled provider, a redirect URL
not on the allow list, or Cancel on Google's own screen all return
`#error=...&error_description=...` and no token. The old capture checked only for
`access_token`, found none, returned null, and the person landed on the home page
with no account and nothing on screen. It reads and shows the reason now.

**And it threw away where you were.** `redirect_to` was origin plus pathname, and
this is a hash router, so signing in from `#/guide/abc` returned you to the
landing page. The route is carried in a query parameter now, because the fragment
is where Supabase puts the tokens and a URL has only one of those. Checked on the
way back rather than trusted, since the value round-trips through a third party.

**The signup form is held before the redirect**, using the same `holdProfile`
mechanism the email path already used, and the mandatory fields are checked
first. `takeHeldProfile` on the far side was already keyed on `userSession`
specifically so the Google cold load would work. Nothing was putting anything
into it.

**Still yours to check in the Supabase dashboard**, because none of it is
reachable from code: the Google provider is enabled, and `gemlyxtravel.com` plus
the www subdomain are in Authentication → URL Configuration → Redirect URLs. If
either is missing you will now see the reason on screen instead of nothing.

## 6. Smaller, but real

- **Ask Gemlyx inside a guide preview has no idea who it is talking to.**
  `GuidePreviewScreen.jsx:910` renders `AskGemlyx` with no `traveller` prop, so it
  defaults to `""`. Both the typed profile and the observations are dropped.
  `App.jsx:18189` passes it; the preview screen does not.

- **The `profile jsonb` migration is written out three times.** `SETUP_SQL` is
  exported from `profile.js:299` and then hard-coded again at `App.jsx:9118` and
  `:9124`. It also appears in no `.md`, so the only place it is ever communicated
  is an in-app banner that fires *after* a save has already failed.

- **Only one company value can ever be observed.** `App.jsx:10640` passes
  `intakeFamilyMode ? "With family" : ""`, so four of the five options are
  unreachable and the sentence at `profileLearning.js:174` can only say one thing.

- **Nothing is committed to git.** Two days of work, no commits.

---

## Suggested order

1. Check whether Ask Gemlyx answers on the live site. If it 503s, run the
   `SETUP_ASK.md` version of the SQL, not the one in the console warning, and fix
   the warning to match.
2. `cleanProfile` passthrough for `learned`. One line, and it turns yesterday's
   work from dead to alive.
3. The inter-day legs. One fix removes the impossible crossing, the 90-minute
   kilometre and the phantom journeys, and it is the fault a reader is most likely
   to notice.
4. Stadia registration.
5. The learning panel rule 4 asks for.

Done since this was written: the Google sign in faults in section 5, and the
Instagram embed.
