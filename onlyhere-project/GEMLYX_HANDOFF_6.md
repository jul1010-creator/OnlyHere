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

**PASS 52 to 63 IS NOW DEPLOYED.** Oliver pushed on 7 Aug 2026. The line that used to sit here saying none of it was live is no longer true. PASS 64 (below) is on disk and not yet pushed.

Oliver's repo is at `C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project` and **the device bridge is connected**, so you can read and write his real files rather than a snapshot. You cannot run commands on his machine: `npm run dev`, `node tests/run.mjs` and `git` are his to run.

Before writing to any file he may have touched: stage his copy, diff it against yours, and confirm every line unique to his side is one you deliberately replaced. Use the `expectedMtimeMs` guard on every commit.

### Waiting on Oliver

1. `git rm api/gemini.js api/route.js` (both dead code; Vercel Hobby caps at **12 serverless functions** and this is what frees the room), then commit and push.
2. The consolidated SQL at the top of `CHANGES_THIS_PASS.md`: `gemlyx_facts` (with `photo_credit jsonb`), the `gemlyx-media` storage bucket and its policies, `gemlyx_user_data` with RLS.
3. Supabase dashboard, only if he wants Google sign-in: enable the Google provider and set Authentication → URL Configuration. Email and password needs zero setup and already works.
4. Delete the duplicate "Dragør" town row in Studio.

---

## PASS 64, 7 Aug: OpenAI removed from every writing step

Oliver reported: *"the blog writing about events is openAI, which should be claude. So clear some rules are not implemented."*

He was reading the Studio drafting panel, which still said entries are drafted "via Tavily + OpenAI" from before Claude took over the writing. The entry drafts themselves were already Claude. But he was right that rules were not implemented, because tracing that one sentence turned up three real violations sitting behind it:

1. **The Studio fact generator wrote with OpenAI.** `draftOneFact` called `askOpenAI` to write the fact text a traveler reads on the loading screen. It had been that way since PASS 40, underneath a comment two functions above stating that OpenAI is never the writer. A 40-word fact is published prose. Now `askClaude`, with `expectJson`.
2. **Both raw `/api/openai` calls were dead.** The source scanner and the AI voice scan still sent `max_tokens`, which `gpt-5.6-sol` rejects outright. `askOpenAI` was fixed for this months ago; these two never were. The scanner surfaced it as an OpenAI error, the voice scan swallowed it in a `catch` and looked like it simply found nothing.
3. **The privacy copy named OpenAI as the writer** and never named Claude at all.

Also corrected: the Studio panel text, and every comment across App.jsx asserting OpenAI writes.

**The lesson, which is the reusable part.** The rule was written in comments in four separate places and still got broken, because a comment cannot fail a build. `tests/run.mjs` now has an **OPENAI NEVER WRITES PROSE** block that reads App.jsx as text: it pins the `askOpenAI` call sites at the seven audited planning/structuring ones, asserts the fact generator writes with Claude, asserts no raw OpenAI body carries the rejected parameter, and asserts the panel names the right writer. It was verified to fail 7 of its 9 assertions against the pre-fix file. **If that test fails, do not raise the expected count to make it green.** Read the new call site and ask whether OpenAI is planning or writing.

Not pushed yet. `node tests/run.mjs` has not been run on the real machine, only the new block in isolation, since npm and node are Oliver's to run.

---

## PASS 65, 7 Aug: the assistant hears a correction the way he types one

Oliver: *"the AI assistant that is meant to put in the newly fact-checked things is not thaaat great. I like having the assistant. But I would like to have an AI I can write to after the draft where I can say 'Fact-checkers say bla bla bla is wrong, and that really bla bla bla is true.'"*

Three separate causes, and none of them was the model.

**1. The router was deaf.** `routeMessage` fired a correction only on an imperative verb (correct / fix / change / apply). His own example sentence routed to `ask`, and so did five of six realistic correction messages: *"The station is wrong. It should be Aarhus H."*, *"Google says the date is wrong, it is actually 25 August."* The assistant discussed the fact-check instead of applying it, and he had to know the magic word. A correction is not a command, it is an **assertion**: something is wrong, and here is what is right. `WRONG_HALF` and `RIGHT_HALF` now trigger it, either half alone is enough, and `QUESTION` still wins so wondering aloud never fires a verification pass.

**2. It could not touch a draft.** `runCorrection` bailed unless the entry carried a Supabase row id, so standing in Studio with a fresh draft on screen it told him to go open an entry first. The exact moment he wants this was the one moment it refused. The Studio draft is now a second target. It is parsed from `studioDraftText`, **not** `studioDraft`, because that string is what `publishDraft` actually reads and he hand-edits it; correcting the object while he publishes the text would break the standing rule that what you review is what you publish. An open detail page still wins, because that is what he is looking at.

**3. It ignored him.** Rule 1 of `correction.js`, that criticism is a lead and not a source, was written about a *model's* criticism and is still right about that. Applied to Oliver it meant: he states the real value, no primary source turns up, the claim lands `unresolved`, and nothing changes. His call, and the trust model now is:

- **rejected** a source actively contradicts the claim. Never applied. This is the Samsø-ferry protection and it is untouched.
- **asserted** (new) nothing settled it either way and he supplied a value. Applied on his authority, marked ✍️ not ✅, written into `__corrections` as "asserted by the founder, not source-verified", and listed in `uncertainties` as still unconfirmed so it can never later pass for something a source backed.
- **unresolved** nothing settled it and no value was given. Still changes nothing, because there is nothing to write.

Silence no longer blocks him. Evidence still overrules him.

Also added: a one-tap **"Run the correction pass"** button on any answer that might have been meant as an instruction, so whatever the router still gets wrong costs a tap and never a retype.

Tests now **177**, up from 146. The new correction tests run `correctEntry` end to end against stubbed deps, offline, and the load-bearing one is *"a source that contradicts him still wins"*. Not pushed, and `node tests/run.mjs` still needs a real run on his machine.

---

## PASS 66, 7 Aug: the queue was writing into the editor

Oliver: *"the /#studio queues are good but, whenever it is the next in queue, it can't publish because the other is published."*

He found one symptom. There were four, all from one cause: `generateArea` writes the finished draft, the photo name, the publish status, the verified coordinates and both warnings into the **same component state the editor renders from**, and the queue calls it in the background while he is reviewing something else.

1. **His.** `loadQueueResult` never reset `publishStatus`, and the panel renders a green "✓ Published" line *instead of* the button. So the next draft arrived wearing the previous one's success state, with no button at all.
2. A background item completing could **replace the draft under review**.
3. **Silent and expensive.** `publishDraft` force-overrides the published station and coordinates from `studioFrozenGeo`. Queue drafts Ribe, moves on to Skagen, Skagen overwrites the frozen geo, he publishes Ribe: **Ribe goes live carrying Skagen's station and coordinates.** The mechanism built to stop coordinate hallucination was causing it, in the workflow he uses most, with nothing on screen to show it.
4. Found while fixing the rest: the auto-correction pass wrote the corrected draft to state but not to `t`, and `t` is what a queued run returns. **Every queued draft was stored and published uncorrected.**

Fix: `generateArea(name, type, { queued: true })`. Every editor-state write goes through a `ui()` guard that no-ops in a background run; the progress stage and the loading lock are deliberately not guarded. The draft's own geo and warnings travel in the return value, and only `loadQueueResult` puts anything into the editor. It also clears `editingId` now, because opening a queue draft while editing a published row would have PATCHed that row with the new draft.

A test walks `generateArea` and fails if any editor setter is ever called outside the guard again.

---

## PASS 67, 7 Aug: order, filters, and a search that searched nothing

From a friend's review, relayed by Oliver: alphabetical order, better filters.

**Danish alphabetical, not plain.** `daCompare` / `byName` in `helpers.js` use `localeCompare` with `"da"`. Æ, Ø and Å come after Z, and Aa is the same letter as Å, so a default sort files Ærø and Ålborg up among the A's on a site about Denmark. Applied to hidden towns, major cities, food, nightlife venues, the nightlife town list and camping, every one of which was rendering in source-array order: hardcoded rows first, then Studio rows in fetch order, an order that rearranges itself every time he publishes. Events keep soonest-first with an Alphabetical option, since for an event the date is the point. Attractions gained the same option, and it matters there because the old rating sort sinks everything unrated to the bottom and most of the list is unrated.

**Note for anyone writing a test against this: Ø sorts BEFORE Å**, so Ørsted comes before Aalborg. I asserted it the other way round and the test corrected me.

**Filter options are derived now, not typed.** The event month pills were hardcoded to Jun, Jul, Aug, Sep: written in summer and read all year, so in August there were events no pill could reach and in January every pill would be empty. Town regions were nine hardcoded strings. Both come from the rows themselves now, so a pill exists exactly when something is behind it. The region pills also filter the Major Cities grid, which they sit under and previously did not affect.

**Food gained a town filter.** It had budget and kind and nothing for location, on a guide covering a country.

**Deleted:** the "Sort & Filter" sheet, which could never open (nothing ever set its open flag true) and offered Fashion, Accessories, Bags and a 50 to 5000 DKK slider; and `craftType`, read by the Attractions filter with no UI anywhere to set it. `bookableOnly`, the one live control the sheet held, has its own pill and is untouched.

**The header search now searches Gemlyx.** It ran only against `data/shop.js`, so typing "Ribe" found nothing real, and the one thing it did surface is the invented content in open finding 2 below. It now covers towns, events, food, nightlife, free entry and workshops, ranks name matches above town matches, and opens the real entry through `openStopDetail`, the dispatcher a guide stop already uses.

Tests **215**, up from 146 at the start of the day. 35 fail against the pre-PASS-67 App.jsx.

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
