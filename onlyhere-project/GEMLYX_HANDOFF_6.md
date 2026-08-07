# GEMLYX HANDOFF #6

*Written 6 Aug 2026, end of the PASS 52 to 63 run, at Oliver's request: "make a handoff to a new chat."*

Read this first, then `CHANGES_THIS_PASS.md` from the top, then `GEMLYX_HANDOFF_5.md` for the older scars. Persistent memory holds `/areas/gemlyx-decisions.md` (product decisions, PASS 39 onward) and `/areas/onlyhere.md` (architecture and standing rules, at its size cap).

---

## RULE ZERO, unchanged

**Only Fable touches the Gemlyx Guide.** Oliver clarified the scope himself on 5 Aug: *"That is guide and map code, so I have not touched it. I give you permission to get the maps bug fixed. I was talking about the structure. Sonnet kept screwing it up."*

So the rule is about the guide's **structure**, and he grants targeted permission when asked. Ask. Do not assume. Handoff #5 lists the files it covers.

---

## The one thing that governs every decision

His words, 5 Aug: *"I want to get to a point where I no longer need to fact-check. And we can only manage that, by making sure this works."*

That sentence rules out a whole category of fix. **Telling a model "here is the real fact, please use it" is a request, and a request has a failure rate.** Anything the system already knows must be applied as **code**. This has been proven necessary repeatedly: live Directions grounding was deployed and a draft still claimed no public transport existed.

The rules that came out of that, in the order they were learned:

1. **What you review must be what you publish.** Any value overridden at publish time is reconciled into the draft the moment it exists, or every review after it runs against fiction.
2. **Anything the system already knows is enforced in code, never requested in a prompt.**
3. **A rule written in the wrong place is not a rule.** Three separate bugs this week were caused by guidance of mine landing somewhere the model would apply it wrongly.
4. **An AI fact-checker is a lead generator, not a source of truth.** A primary source must settle it. If none can, the claim comes out.
5. **Never conclude a fact from a failed lookup.** ZERO_RESULTS is evidence; REQUEST_DENIED is not.

---

## What exists now that did not exist a week ago

### The correction pass and the Studio assistant (PASS 63, newest)

`src/utils/correction.js` plus `src/components/StudioAssistant.jsx`.

Oliver pastes a fact-check and says "correct it". Each claim is split out, verified independently, then applied, rejected with evidence, or left alone. Transport claims go to the Directions API rather than to a model. A "confirmed" with no primary source URL is downgraded to unresolved **in code**. Only the criticised fields may change, and `enforceScope` reverts anything else the rewrite touched, which is what stops a correction becoming a redraft.

The assistant floats on every page, renders only with a Studio session, routes deterministically between correct / ask / audit, and saves nothing without him seeing a field diff and pressing Save. Its **⧉ Context** button copies page + row id + stored payload + audit verdict, so he can paste that instead of screenshotting. He asked for it in exactly those words: *"Then I won't need to take pictures of what I mean."*

### Everything else from this run

- **`src/utils/transport.js`** ferry classification: required vs optional vs unknown, by re-querying with `avoid=ferries`.
- **`src/utils/entryAudit.js`** deterministic scoring of published rows, no AI, so auditing 55 entries is free and repeatable.
- **`tests/run.mjs`** 146 tests, zero dependencies, bundles the real source with the esbuild already inside Vite. Run `node tests/run.mjs`.
- **`src/utils/studioPrompts.js`** the eight draft prompts, lifted verbatim out of `generateArea`.
- **`api/commons-photo.js`** Wikimedia finder with server-side licence filtering.
- **`src/utils/auth.js` / `userSaves.js` / `AuthSheet.jsx`** optional traveler accounts.
- **`src/utils/liveFacts.js`** the Studio fact generator.
- **`PlaceMiniMap`**, photo credits, town events, the queue rework.

---

## STATE OF THE REPO, read this before doing anything

**Everything from PASS 52 onward is on disk and NOT DEPLOYED.** The last push was around PASS 51. Nothing in the newest work is live.

Oliver's repo is at `C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project` and **the device bridge is connected**, so you can read and write his real files rather than a snapshot. You cannot run commands on his machine: `npm run dev`, `node tests/run.mjs` and `git` are his to run.

Before writing to any file he may have touched: stage his copy, diff it against yours, and confirm every line unique to his side is one you deliberately replaced. Use the `expectedMtimeMs` guard on every commit.

### Waiting on Oliver

1. `git rm api/gemini.js api/route.js` (both dead code; Vercel Hobby caps at **12 serverless functions** and this is what frees the room), then commit and push.
2. The consolidated SQL at the top of `CHANGES_THIS_PASS.md`: `gemlyx_facts` (with `photo_credit jsonb`), the `gemlyx-media` storage bucket and its policies, `gemlyx_user_data` with RLS.
3. Supabase dashboard, only if he wants Google sign-in: enable the Google provider and set Authentication → URL Configuration. Email and password needs zero setup and already works.
4. Delete the duplicate "Dragør" town row in Studio.

---

## OPEN FINDINGS, not yet acted on

**1. The eight draft prompts contain 110 em and en dashes.** This is the exact bug already fixed once in `STUDIO_VOICE`, which contained 41 of them inside the rule that bans them. The model reads its instructions and sees 110 counter-examples. It is now easy to see because the prompts are isolated in `src/utils/studioPrompts.js`.

**Deliberately not fixed unattended.** It is 37 KB of prompt text and a mass replace changes drafting behaviour across every content type at once, with Oliver asleep and unable to review. Do it with him awake, one type at a time, and add a dash-count test per prompt exactly like the `STUDIO_VOICE` one.

**2. `data/shop.js` still holds invented content** (cities, products, camping spots) and there are 5 AI-seeded `craft_items` rows live. He ticked road trips and itineraries for removal but never ruled on these. `LeafletMap.jsx` is also hardcoded to Copenhagen and draws no marker, but it is used only by the shop view, so the content decision comes first.

**3. The road trip concept needs redesigning, not restoring.** His words: *"I like the concept of a road trip.. but it needs to be somehow redesigned."* Do not refill `data/roadtrips.js` by hand. The replacement has to be built from verified published content.

**4. `PlaceMiniMap` only appears on towns**, because `shapeForLive` stores `__lat`/`__lon` for towns and nothing else. The fix is upstream: store geocoded coordinates for festivals and attractions the way towns already do, and the map appears by itself.

**5. He signalled he may switch focus** from towns to events: *"maybe we've come far enough with towns... maybe we should swap to events!"* Ask before starting a big town-side piece.

---

## The mistakes that cost him the most time, so you do not repeat them

**I explained away a real bug four times before finding it.** He reported "I click open, it just starts researching again" repeatedly. I shipped two useless passes and two explanations. The cause was one line: `loadQueueResult` called `setStudioResult(null)`, and the entire draft editor renders inside `{studioResult && (...)}`. His clue *"All it does is put the title up on the researching thing"* was the answer the first time he said it. **When he reports the same thing twice, stop reasoning and go read the render gate.**

**Three separate bugs were caused by my own prompt text.** A filled-in example coordinate in the town schema that drafts copied verbatim, putting a pin 130 km away. An instruction to "point at rejseplanen.dk" that landed in the `nearestStation` glance field and rendered as a station called "check rejseplanen.dk". A ferry flag that answered the wrong question. **Read where a rule will actually be applied, not where you wrote it.**

**A missing `departure_time` made every published travel time wrong.** A transit query with no departure means "if you left this second", so a draft written at night published a figure over an hour worse than the real journey. Every transit query is now anchored to the next Tuesday 09:00 via `transitDepartureAnchor` in helpers.js. Driving is deliberately left unanchored.

**Verification is weaker than it looks.** esbuild proves imports resolve and syntax parses; it does not render a component, so a wrong prop or a hook-order error passes clean. Removing a function is not verified by a bundle check either, because an undefined identifier is a runtime error. Grep the name across the tree after every delete.

**Execute new regexes against the real strings from his drafts.** A lazy quantifier turned "5 hours 53 mins" into "5h". A licence gate let CC BY-NC through. A sentence detector flagged "Ribe St." as prose. All three looked fine by eye and all three were caught by running them against real values.

**He is right more often than the fact-checker is.** He corrected me on the Samsø ferry duration and he was right: the operator's own timetable says 80 minutes while its own front page says 1 hour 30. Gemini has been confidently wrong about his own system more than once. His content catches have been consistently correct.

---

## How he works

Solo founder, zero budget, tests on a real phone, sends screenshots and raw console output, follows up fast, works late. Accuracy is the identity of the app and he has chosen it over speed and cost every single time.

**The dash ban is absolute** and enforced in code, not just prompts. Never claim anywhere that places were personally visited; the framing is researched and fact-checked, omitted when unconfirmable.

He is not looking for reassurance, he is looking for root causes. Several times the honest answer has been "this was my mistake", and saying it plainly has been worth more than the fix.

---

## If you want the single highest-leverage next move

Get PASS 52 to 63 pushed and run one real correction pass on the Aarhus Festuge entry, with him watching. It exercises the whole new stack at once: the assistant, claim splitting, the ferry probe, source-gated verification, the scope guard, and the save path. Its `nearestStation` says "Aarhus" and should say "Aarhus H", and its ferry uncertainty is exactly the bug PASS 63 fixed, so there is a known right answer to check against.
