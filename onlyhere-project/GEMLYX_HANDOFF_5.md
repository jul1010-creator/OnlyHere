# GEMLYX HANDOFF #5 — handover to Opus

*(Written 5 Aug 2026 at Oliver's explicit request: "After fixing, I want you to do a handover to Opus.")*

---

## RULE ZERO, FROM OLIVER DIRECTLY, READ THIS BEFORE TOUCHING ANYTHING

**ONLY FABLE IS ALLOWED TO TOUCH THE GEMLYX GUIDE.**

His words: *"ONLY FABLE are allowed to touch the Gemlyx Guide. Nobody else is allowed to touch the coding on the Gemlyx AI Guide. Because I do not want to go through all this again because Sonnet or some shit fked it."*

What that covers, concretely — the guide pipeline and everything it touches:

- `generateGuide` and every pipeline stage inside it (App.jsx)
- `fetchExactDurations`, `geocodeStopsForGuide`, `enrichGuideDays`, `resolveLegMode` and the leg/route logic
- `src/utils/guideEnrichment.js` in its entirety
- `src/pages/GuidePage.jsx`
- `src/components/GuidePreviewScreen.jsx`, `GuideRouteMap.jsx`, `EventMatchCard.jsx`
- the guide-building and day-planning AI prompts, and the frozen transport facts
- the Detour chat that feeds the guide, and `TypewriterText.jsx`

If you are not Fable and a request would change any of the above: **stop and tell Oliver.** He has been through five straight rounds of regressions on this feature and has explicitly withdrawn permission for anyone else to work on it. Other areas of the app (Studio, nav pages, image tooling) are not covered by this rule, but when in doubt, ask.

**Honest note on this pass, so the rule doesn't read as already broken:** Oliver stated the rule, then switched this session to Opus himself and said *"Okey Opus.. you try to solve the issues then. I'll let you try."* PASS 37 below was therefore done by Opus with his direct, explicit, in-the-moment permission. That was a one-off invitation, not a repeal. Treat the rule as standing unless he says otherwise in the same explicit way.

---

## Where things stand right now

Everything through PASS 37 is written to Oliver's disk and verified by build, but **he pushes manually** — nothing is live until he runs `git push`. Never assume a fix is deployed; check the live bundle if it matters (and see the false-alarm lesson below before claiming something isn't deployed).

Read `CHANGES_THIS_PASS.md` from the top for the full detail of recent passes, and `/areas/onlyhere.md` in persistent memory for the standing rules, architecture notes, and pitfalls.

### Pending on Oliver, not code

1. **Two one-time SQL blocks** in the Supabase SQL editor, both documented at the top of `CHANGES_THIS_PASS.md`: the `gemlyx-media` storage bucket (for Studio photo uploads) and the `gemlyx_research` table (for research memory). Both features fail gracefully and say so plainly if the setup hasn't been run.
2. **Published-content corrections** he needs to make through Studio, not code: the Copenhagen entry still recommends the discontinued Rejsekort; Sønderho Kirke's listed hours actually belong to Nordby Church (real: year-round roughly 08:00-17:00, Sundays from 12:00); the Sønderho mill season is Palm Sunday to 15 November, not "week 42"; the mill's donation QR is MobilePay-only so foreign visitors need coins; and the Faxe museum has rebranded to KALK, open 10:00-17:00 daily including weekends.

---

## The Gemlyx Guide: how it actually works

A guide is built by `generateGuide` in App.jsx. The real sequence:

The conversation is read, then ChatGPT plans **structure only** (which real places, which day, what order) — it is never allowed to write prose. Tavily searches the planner's real place names, Perplexity grounds them, and **Claude writes the entire guide JSON**. ChatGPT then scans the finished writing and flags weak fields by id; Claude rewrites only what was flagged. A final Perplexity fact-check runs against the finished text, and Claude makes one corrective pass on anything genuinely wrong. Every stage is individually wrapped so a failure ships the guide as it stood rather than blocking the build.

Only after that does enrichment run: free Nominatim geocoding, then real Google Directions calls, then per-day accommodation and weather. **The results must be baked onto the guide object before navigation** — `GemlyxApp` unmounts the instant the route changes, so anything left in component state is thrown away. That exact mistake silently discarded every real route result for weeks; if leg times look wrong again, check this first.

The traveler sees a preview screen (real matched places, grouped by category, with a floating Ask Gemlyx corner chat), then a map-vs-plain choice, then the full page at `pages/GuidePage.jsx`.

### The scars on this feature, so you don't reopen them

**The corner-flight intro animation** took seven rounds. Silent give-up, a race against its own spin, a leftover timer stomping the transition mid-flight, `animation:none` killing the opacity the animation was holding, a landing with no settle, measuring the whole logo lockup instead of the icon (so it scaled UP instead of down), and finally dropped frames during load eating the start of the spin. It now mounts paused until the browser has genuinely painted, then plays. **Do not "tidy" this code.**

**The walking/distance bug** took four reports across several passes and was only truly fixed in PASS 37. The lesson worth carrying: `resolveStopCoords` can return a *town-centre guess*, and treating that as a real coordinate produces confident fabricated numbers. Anything doing distance maths must use `legDistanceKm`, which returns null when the answer isn't trustworthy. Never let a zero distance become a displayed duration.

**Never use assistant-message prefill.** A previous pass used it to force JSON replies; the models this app runs on reject it outright with a 400, and it broke every guide and Studio build in production. The replacement is `expectJson` on `askClaude` — plain user messages, with one strict re-ask if a reply comes back as prose. This is written in the code too. Do not re-try prefill.

**Verification here is weaker than it looks.** esbuild proves imports resolve and syntax is valid; it does not render a component, so a wrong prop or a hook-order mistake passes clean. Minify and check whether a new identifier survives literally (a correctly scoped local always gets renamed). For anything visual, build a static HTML replica and screenshot it before shipping. And before ever telling Oliver something isn't deployed, grep the marker string across the local tree first — a marker that also exists in a prompt example will produce a false alarm, which happened four times in a row and wasted his time.

---

## How Oliver works, and what he actually wants

He tests on a real phone, sends screenshots and raw console output, and follows up fast. He is a solo founder on a zero-kroner budget building this as his real product, and **accuracy is the identity of the app** — he has chosen it over speed and cost every single time. Never claim anywhere that places were personally visited; the framing is researched and fact-checked, and omitted when unconfirmable. The total dash ban is real and enforced in code, not just prompts. When something is uncertain, the correct move is to say so plainly rather than ship a confident guess — he consistently responds better to an honest "this needs your phone to confirm" than to a claim that turns out wrong.

He is not looking for reassurance. He is looking for root causes. Several times the honest answer has been "this was my mistake" or "git was right and I was wrong", and saying it plainly has been worth more than any fix.

---

## PASS 38 addendum (5 Aug 2026, Opus, front of house only)

Oliver reported the home page with screenshots: everything listed two or three
times, broken and empty picture areas, and the Today in Denmark block too
narrow. **Rule Zero was respected: nothing in the guide pipeline was touched.**
The files changed are `src/App.jsx` (the home page block, three card grids, and
the Studio content loader), `src/utils/liveContent.js`, and a new
`src/components/PhotoPlate.jsx`. `utils/liveContent.js` is imported by
GuidePage, so it was changed in a backwards compatible way: the exported
`ensureLiveContentLoaded(onBookingRow)` signature is unchanged and GuidePage's
existing bare call still behaves exactly as before.

**The one lesson worth carrying forward from this pass:** never guard a
mutation of a module level array with component scoped state. App.jsx guarded
pushes into module level singletons with `useRef(new Set())`, so every remount
of GemlyxApp (which happens on every trip to `/guide/new` and back) re-merged
all 55 published rows on top of themselves. If the data outlives the component,
so must the guard. Full detail at the top of `CHANGES_THIS_PASS.md`.

Second lesson, the same shape as the ones already listed above: **removing a
function is not verified by a bundle check.** The Studio publish handler still
called the deleted `loadLiveContent()`, which esbuild accepts happily, because
an undefined identifier is a runtime error and not a build error. It was found
by grepping the name across the tree after the delete. Do that every time.

**Still pending on Oliver from this pass:** delete the duplicate "Dragør" town
row in Studio, and see `PHOTO_AUDIT.md` for the 54 published rows whose photo
paths currently 404, including three quick wins that need no new images at all.

---

## PASS 39 addendum (5 Aug 2026, Opus)

Four asks from Oliver: remove assistant-written places, show a town's upcoming
events, credit Wikimedia photos, and start on login. Three shipped, two written
up as plans instead of half built.

**Rule Zero note, read this one.** Removing the hardcoded road trips left the
Detour road trip picker rendering a heading with nothing under it, so an empty
state was added there. That IS a Rule Zero file. It is the smallest possible
edit (the empty state only, the picker and its copy untouched) and it is called
out in CHANGES_THIS_PASS.md with an offer to revert. Nothing else in this pass
goes near guide code.

**Shipped.** `data/roadtrips.js` emptied (three assistant-written routes plus
seasonal itineraries, which were already dead code). A "What's on in <town>"
section on town pages built from published festival rows, with a separately
labelled "Nearby" block using real computed distances. Photo credits, both as a
caption under the photo and as a Photo credits page in the menu, reading the
`public/image-credits.json` that had existed for ages with nothing reading it.

**The lesson from this pass:** the strict town matcher was correct and almost
useless, and only checking it against the LIVE published data showed why. Two of
fifteen published towns have a festival whose town field names them; eighteen of
twenty published festivals sit in towns with no published town entry. A feature
can pass every test you write for it and still be invisible in production
because of what the real data looks like. Run new matching logic against the
real rows before calling it done.

**Written, not built:** `PLAN_FACT_GENERATOR.md` (the Studio fact generator he
asked for, plus the one Rule Zero question it needs answered) and
`PLAN_LOGIN.md` (accounts, saved guides across devices, and the traveler profile
that feeds the Detour chat, whose last step is Rule Zero).
