# HANDOFF — night of 1 September 2026

Suite **11,906 passed / 0 failed** (from 11,813). Build clean. Everything
mutation-tested: each fix reverted one at a time, each mutant dying by name.

Two halves tonight. The first is what you asked for. The second is Fable finding
**four severe defects in code I wrote this week and told you was verified** —
including one I "checked" with a probe I fed inputs the pipeline never produces.
That section is first, because it matters more than the features.

---

# PART ONE — what Fable found in my code

## 1. roskilde-festival.dk had stopped being Roskilde Festival's own site

The worst thing I have shipped this week, and it was live in what I sent you.

Sunday's town-word rule asks whether a host matches on a word that isn't just a
town. For **"Roskilde Festival"** the pipeline's own `distinctiveWords` strips
"festival" as generic, leaving `["roskilde"]` — and `ownershipWords` then strips
"roskilde" as a town, leaving **`[]`**. So the festival's own domain matched
nothing, and the run log would have told you *"NO operator page was read"* while
`roskilde-festival.dk` sat in the pile marked "other".

Same for Skanderborg Festival, Tønder Festival, CPH Distortion — every name that
is a town plus a generic word. And in the other direction **`skagen-avis.dk`, a
newspaper, was the operator for Skagen Festival.**

**How it got past me is the part worth your attention.** I ran a probe. I watched
it print `ok true https://www.roskilde-festival.dk/`. I fed that probe
`["roskilde", "festival"]` — nameWords **I typed**. The pipeline has never
produced that array. I built the verification out of the answer I wanted.

That is the same vacuous-pass failure this codebase has warnings about on nearly
every page, committed inside the fix for the last one.

Fixed: the whole-name comparison reads the **raw name**, because a domain is
built from the name, generic word and all. It also had to move *above* the loose
name gate — placed below it, `skanderborgfestival.dk` was still refused, because
"skanderborg" inside "skanderborgfestival" has no word boundary after it. Every
assertion for this now runs through `distinctiveWords`.

## 2. Copenhagen is not København, to `fold()`

`fold` maps ø→o, so "København" becomes `kobenhavn` and "Copenhagen" stays
`copenhagen`. Neither contains the other.

So **every Copenhagen event went weak against its own Ticketmaster listing** —
no measured ticket status, and no affiliate ticket URL, which is the thing you
asked for on Copenhell. Worse: in the no-date branch every København listing
counted as *known-wrong*, which put the invented multi-city "run" straight back —
the exact bug the city filter was added to stop, reopened by the fix for it.

An **exonym**, not a spelling. No character mapping reaches it; this repo already
knew the pairs in `samePlaceName` and I reached for `fold` because it was nearest
to hand. Two more faults in the same three lines: the test was `does either
contain the other`, so **Ryslinge matched Ry** and Aalsgaarde matched Als — the
unbounded-substring trap this codebase names in five separate comments — and the
postal district defeated both halves, so "København S" failed even after the
exonym fix.

Now: postal letter stripped, then `samePlaceName`, then bounded `containsName`.
Copenhell is strong again.

## 3. The sale-date rule only ever ran on numeric dates

`dateRangesInText` pushes the single date it finds with `at: -1` — deliberately,
because it answers *which* date and not *where* — and every label reader refuses
a negative position.

So the rule worked on `"Billetsalget åbner 04.11.26"` and **not** on
`"Billetsalget åbner 4. november 2026"`, which is how a Dane writes it. My
fixture used the one format that carries a position: a test written to the code
rather than to the requirement.

A date with no position now gets asked of the **page** instead — does a sale
label stand immediately in front of a date anywhere on it. Verified against five
sale phrasings and five real festival dates.

## 4. The future-year cap aged fresh pages by three decades

My cap **discarded** the year signal when the newest year was in the future,
instead of taking the newest year *up to* now.

So `"Museet åbnede 12. maj 1998. © 2026"` was current, and the same page with
`"Festival 2027"` added became **"about 340 months old"**. A festival announcing
next year's dates — which my own comment in that function calls the most ordinary
page this app reads.

`newestYearIn` already takes a ceiling. It's asked for the newest year no later
than now, and both directions stay closed.

## 5. The booking chip was a regex over free prose

I put `desc` in `BOOKING_FIELDS`, so yesterday's chip fired on things that are not
the door:

| the row says | the card said |
|---|---|
| "Free to wander. You can **book online** for the tower climb." | Book ahead |
| "The café is a popular **drop-in** for cyclists." | Walk in, no booking |
| "The restaurant next door needs a **reservation**." | Book ahead |

That is `A_THING_INSIDE` one file along — a tower climb, a café, the restaurant
next door. **I removed a hardcoded chip and replaced it with a prose-derived one
wrong in both directions**, and `bookingProblems` then reported those rows as
*answered*, so they never reached the worklist either. Prose is out; only fields
where a row states a fact about admission remain.

## 6. researchVoice was deleting true history

Tonight's own fix, over-reaching within hours. "the sources", "the search" and
"the research" are ordinary words in the history of a Danish town, and these were
being cut from published pages silently at render:

> "Ribe is first mentioned in **the sources** in 854, and its market rights were
> **confirmed** by the king in 1269."
> "**The claim to fame** here is the light that drew the Skagen painters."

My safety argument — that a research *actor* is what makes a sentence ours — was
right; my actor list included phrases a chronicler uses. Narrowed to the checking
named as **ours**, and "The claim" as an opener now needs the verification verb
after it.

---

# PART TWO — the four things you asked for

## The leaked fact-check sentence

Hyllested Skovgårde's description opened *"The claim is not confirmed by the
checked sources."* — an internal verification note in the reader's slot.

New `src/utils/researchVoice.js`, cleaned **on the way in**, which is the argument
`liveContent.js` already makes about the dash ban: *"Cleaning on the way IN fixes
all 55 without touching the database and holds for anything published later."*
Both merge points, short fields and `blogBody`. It **never empties a field** — a
blank description is indistinguishable from a broken row — and the audit still
names the row, because the render-time clean is a patch and the fix is a rewrite.

## The Studio warning shown to travellers

"MARKED AS AN AREA, BUT NOT TOLD WHICH PLACE" is now **"Elsewhere in Denmark"**,
and the card says what kind of place it is rather than which field is empty. The
section still renders — it exists because an unplaced area belonged to no group
and was reachable only by search — and the warning survives for you, gated on
`studioSession`, pointing at Studio → Manage → 📍 Kind.

## The doubled travel time

`18 MINS BY CAR (8.0 KM) FROM COPENHAGEN. FROM CPH` — two authors writing one
sentence. The stored value sometimes carries the origin; the renderer appended
its own regardless. The tail is stripped and the house suffix re-added, so every
card ends the same way instead of in three formats. Known limit, written down: a
value that *opens* with the origin keeps its sentence, because an unanchored
strip would cut real prose out of the middle of one.

## Report outdated information / Review article

On all five detail pages, threaded in **one shared edit** so the five can't drift
apart — this codebase's own scar: *"Four lists, one omission, which is not four
mistakes."*

- **Report outdated information** — open to everyone.
- **Review article** — signed-in only; a signed-out tap opens the account sheet
  explaining that reporting needs no account.

Both post to **`gemlyx_suggestions`**, the table Suggest a Place already writes
to. Deliberate: a new table means a button that posts into nothing until you run
SQL, and `SUPPORT_TABLE.sql` is still unrun. This works the moment it deploys.
Not `gemlyx_reviews` — that list is travellers talking to each other about the
**place**; these are a reader talking to you about the **writing**. The entry
name, its type and the exact URL travel with every report, because "the price is
wrong" with no page attached is unactionable.

**One guess I made while you slept:** I read "(user-only)" as the signed-in
*traveller* (`userSession`), since that's the word this app uses for them and the
contrast was with a button for everybody. If you meant yourself, it is
`studioSession` in place of `signedIn` and nothing else changes.

An existing invariant caught me here too — *"no unnamed opener sets Create"*. My
button forced the sign-up screen; a button that doesn't say "Sign up" opens on
Sign in. I rewrote that assertion from a hardcoded tally of five doors to the
rule itself, so the seventh door doesn't break it.

---

# PART THREE — Fable's site audit, for you to rank

Reader-facing, none of it fixed. Ordered by how badly it would land on a stranger.

1. **"Stay in the loop" on Home stores nothing.** `App.jsx:17912` — checks for an
   "@" and prints *"✓ You're on the list. We'll be in touch."* No request, no
   storage. Anyone who signs up is told a lie.
2. **A failed content fetch reads as "nothing published".** Home, Events,
   Nightlife and Attractions all render their empty state when the Supabase load
   fails or is slow. Nightlife's says *"...appear as soon as they go live through
   the Studio"* — founder vocabulary on a public page. Attractions says *"Try
   clearing one"* with no filter applied.
3. **The camping cards on Detour → Road Trip are hardcoded and one is
   geographically wrong.** `data/shop.js:20` — "Bøtø Nor Shelter … near Præstø"
   with mapHint `4780 Stege`. Bøtø Nor is on Falster, Præstø is on Zealand, Stege
   is on Møn; **Get Directions sends a driver to the wrong island.** Copy
   includes "locals-only secret" and "Best stargazing spot in Denmark".
4. **Three different vocabularies for the same tier.** Towns says "Can't miss /
   Worth a look"; DetailPage says "Can't Miss Out / Worth Considering"; EventCard
   exact-matches a third set — and DetailPage renders an *unrecognised* tier
   verbatim with a green 👍, which `tierLabel`'s own comment says must return null.
5. **Two different "Gemlyx Find" blocks on one town page** — `gemlyxFind` and
   `highlight`, both under that heading.
6. **"🍬 Handmade" on Attractions can only ever show "Nothing published here
   yet"** — `handmadeCraftShops` is `[]` with no writer anywhere.
7. **Town stays links search `accommodationGlance`** — whose prompt example is
   "Day trip from Copenhagen", so Booking.com gets searched for that phrase. The
   link also carries `rel="sponsored"` with `BOOKING_AFFILIATE_ID` empty.
8. **"○ Common Attraction"** is printed for any popularityTag that isn't "Hidden
   Gem" — so a *Local Favourite* is labelled Common.
9. Smaller: literal `*asterisks*` render in Essentials copy; the FAQ points at a
   "Saved tab" that doesn't exist; `ArticleFeedback` is missing from the
   craft/workshop sheet (you said every blog — that one has a different sheet);
   Home's "newest first" subtitle sits over a week-seeded shuffle; footer version
   is hardcoded `v2.87`.

---

## Still open from before

- **`scrapeTier` third tier is not in the writer prompt.** The code gates are
  closed, but a page in the new `"other"` tier is still labelled *"OFFICIAL
  WEBSITE CONTENT"* to the model. Worth fixing next — it costs a wrong draft plus
  a correction pass.
- **`scrapeTier` with empty `nameWords` returns "operator" for every page.** Any
  name whose words are all generic or under four characters reopens the old hole.
- Towns: merge the two filter rows, add a Nightlife category, the 7 missing
  Gemlyx Finds — all still yours to call.
- Rejseplanen deep-link; `BOOKING_AFFILIATE_ID`; `SUPPORT_TABLE.sql`;
  `evidence.js` has no callers; Museum Østjylland's row; `vesterbro-minigolf`.
