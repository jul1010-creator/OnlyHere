# LATEST: real streaming chat, hard-fail pipeline with retry, em-dash ban, awkward-phrasing scanner

From the newest odt round:

1. **Detour chat now streams for real, token-by-token** — per "Like on this software. This level." — this is genuine streaming, not a client-side typewriter effect over an already-finished reply. `api/anthropic.js` now has a streaming path (only used when the caller asks for `stream: true` — Studio's drafting pipeline and every other Claude call still gets the original single JSON response, unchanged) that pipes Claude's real Server-Sent Events straight through to the browser as they arrive. `sendAI`'s chat call now reads that stream and grows the reply on screen character by character, exactly as it comes in from Claude. The pulsing "thinking" dots still show first (while Claude decides whether it needs to search); the chat bubble only appears once real text starts arriving, then fills in live.

2. **Studio's research pipeline now retries before it hard-fails.** Last round I made every core research stage (OpenAI planning, Tavily search, Perplexity fact-check, OpenAI structuring) stop the whole draft immediately on any API error, per your call that "the research is not allowed to be performed without all the APIs functioning." You asked whether Gemini could step back in as a last resort if Perplexity/Tavily fail — I'd actually recommend against that (a silent fallback to a weaker, more hallucination-prone model defeats the point of the hard-fail rule you just asked for, and you'd have no way to tell which source actually wrote a given draft). What I built instead, since you said "yes, retry": each of those 4 stages now retries the SAME API up to 2 extra times (3 attempts total, with a short pause between) before actually giving up and stopping the draft. A single flaky request no longer nukes a whole attempt, but a genuine outage still stops things cleanly, and it's always the real API doing the work, never a quiet swap to something weaker.

3. **Em dashes banned in AI-generated prose.** Added an explicit rule to both Studio's writing voice and Detour's chat system prompt: never use — or a double hyphen -- to join two clauses, since it's one of the most recognizable "this was written by AI" tells. A period, a comma, or a plain "and"/"but"/"so" instead.

4. **New awkward-phrasing scanner in Studio's pipeline.** After a draft is written, OpenAI now reads through it specifically looking for stilted, unnatural-sounding phrases (your example: "the town itself grew up...") — it only flags them, it never writes or rewrites anything itself. If anything's flagged, Claude then does a targeted rewrite of just those specific phrases, leaving everything else in the draft untouched. This is a non-fatal polish pass — if it fails for any reason, the draft still goes through exactly as it was, nothing blocks on this step.

**Not yet done from this round** (next up): the vintage-journal/parchment restyle of the "building a guide" loading screen, and the new guide "overview" page (a browsable grid of recommended places as a first step before the day-by-day itinerary). Also still owed: a reply on the `/api/perplexity` 405 error, and confirming "gemlyxFind" is intentional naming, not a typo.

---

# LATEST: found and fixed the "Empty response from OpenAI" bug (town/event Discover searches)

You flagged this after the streaming update: "Empty response from OpenAI. So something was off when searching for town and event." Traced it to the actual cause, not a guess:

`gpt-5.6-sol` is a reasoning-tier model (same family that needed `max_completion_tokens` instead of `max_tokens`, fixed a while back) — with these models, the token budget you set is shared between its INTERNAL reasoning and the actual visible reply, not just the reply like older models. Two of the smaller planning calls in the app were running on a genuinely tight budget: Studio's Stage 1 query planning was capped at 300, and Discover's query planning (the thing that runs when you click "Discover new towns" or "Find new events") was capped at 500. On either of those, the model can burn the ENTIRE budget on internal reasoning and have zero tokens left to actually write the search queries — which reads as "Empty response from OpenAI" even though nothing is actually broken, it just ran out of room before it got to answer.

**What changed:**
1. Bumped both of those to 1400, giving real headroom for reasoning + an actual answer.
2. Added retry-before-fail to Discover's two OpenAI calls (query planning and candidate extraction) — same pattern as Studio's main pipeline, so one flaky response doesn't kill the whole Discover run.
3. Added real diagnostics: if this ever happens again, the console now logs `finish_reason` and token `usage` alongside the failure, so it's provable at a glance whether it's this same cause (reasoning tokens ate the budget) or something new.

This should fix the town/event Discover errors specifically. If it still happens after this, the new console logging will show the real `usage` numbers — send me that and I can size the budget properly instead of guessing again.

---

# EARLIER: Road Trips folded into Gemlyx Detour, error boundary added, opening-hours lookup logging fixed

**1. Road Trips is no longer a standalone tab.** Per what we scoped: the whole "Road Trips" nav entry and page is gone. Everything about it that was worth keeping moved into Detour's existing "🚗 Road Trip" sub-tab (which already used the same `roadTrips` data to pre-fill an AI chat request):
   - The preset road trip picker — unchanged, still there.
   - "Your Saved Places" → "Ask Gemlyx for a road trip from these" — moved in as-is, minus the redirect step it used to need (you're already in Detour).
   - Camping & Tent Spots — moved in as-is, right below the road trip picker.
   - **Dropped entirely, per your call:** the manual "Build a Route From Here" tool (tap towns to build a custom route) and its "Saved Routes" list. Detour's AI chat already covers this conversationally — describing your own route to Gemlyx directly is arguably the better version of the same idea, so this removes a second, weaker way to do the same thing rather than losing a capability.
   - The homepage's "Road Trips" card and the "See a Road Trip →" button under the mission callout now both jump straight into Detour with the Road Trip sub-tab preselected, instead of a dead link.

**2. Error boundary added** (sent last message, included again here for the full picture) — a total black-screen crash now shows a "reload" screen instead, and logs the real error to console.

**3. Real Google opening hours** (also sent last message) — `api/places-hours.js` pulls verified business hours from Google's Places API for Food/Food Street/Nightlife/Attractions/Craft drafts.

---

# EARLIER: real Google opening hours wired in + a missed "Google AI" label fixed

1. **New `api/places-hours.js`** — looks up a place's REAL opening hours via Google's Places API (Text Search + `regularOpeningHours`), using your existing `GOOGLE_MAPS_KEY` and paid Maps Platform billing (same Cloud project as the nearest-station lookup — no new key or account). This is Google's own maintained business-listing data, not an AI reading web pages and guessing, so it's more reliable than Tavily/Perplexity for this one specific fact type. Note: this hits Google's "Place Details Enterprise SKU" pricing tier — priced higher per call than the basic Places calls already in use, so it's a real (small) added cost per draft, not free.
2. **Wired into Studio drafting** for the content types where a single venue's hours are actually a meaningful fact — Food, Food Street, Nightlife, Attractions, Craft (not Town/Events/Nightlife Town, since those aren't single-venue). When a real match is found, the writer gets a "VERIFIED OPENING HOURS" block it's told to use as-is rather than guess from search results. If Google has no listing or the lookup fails, drafting proceeds exactly as before — this only adds a stronger source when available, never blocks anything.
3. **Also flags business status** — if Google lists a place as temporarily or permanently closed, that gets surfaced to the writer so it can land in the draft's uncertainties rather than silently writing up a closed venue as if it's open.
4. **Fixed a "Google AI" label I missed in the Perplexity swap** — the internal fact-check context block was still labeled "GOOGLE AI FACT-CHECK" even though it's been running through Perplexity since the last update. Relabeled to "PERPLEXITY FACT-CHECK". Purely internal/prompt-facing, not something you'd have seen in the UI, but worth having correct.

---

# EARLIER: Discover — Tavily + OpenAI find new candidates for you, no more hand-typing every name

This is the feature we scoped: instead of typing "Ribe", "Gentofte", "Præstø", "Distortion" etc. one at a time, Studio can now go find real candidates itself.

**How it works, per your answers:**
1. **One Discover button per content type** — whatever type is selected in the pill row (Town, Events, Attractions, Food, Food Street, Nightlife, Nightlife Town, Craft), clicking "🔍 Discover new [type]" runs OpenAI-planned search queries through Tavily, then has OpenAI read the raw results and pull out real, specifically-named candidates — never invented names, only things actually named in the search results.
2. **Dedup against what you already have** — before showing you anything, candidates are checked against your existing towns/events/food/attractions/nightlife/craft lists (loose match, so spelling differences still count as a dupe) and filtered out. You only ever see genuinely new suggestions.
3. **Pick-list first, nothing drafts automatically** — results show as a checklist with a one-line hook for each (why it's worth including, from the actual search results). Tick what you want, hit "📖 Draft picked (N)", and it feeds them into the exact same draft pipeline as typing a name yourself — one at a time, with a "Next →" prompt once you're done reviewing/publishing the current one, so it never overwrites a draft you haven't dealt with yet. Each candidate also has its own "Draft this" shortcut if you just want one.
4. **A separate "🎪 Find new events" button** sits next to Discover (except when Events is already the selected type) — same engine, but framed specifically around real, dated, upcoming events inside Denmark, since you flagged these as the most time-sensitive.
5. **"🔄 Update current events"** — a different job entirely, so a different engine: this doesn't find new things, it re-verifies events you already have (still happening? tickets still available? date changed?) via Perplexity, since that's fact-checking a known claim, not open-ended discovery. Capped at 20 events per click so it doesn't silently rack up a huge bill — click it again to continue through the rest. Meant to be run weekly, not on every visit, per what you said. It only flags what changed; nothing gets auto-updated in your data files, since a wrong auto-edit there is worse than a manual one.

**Why Tavily (not Perplexity) powers Discover specifically:** Perplexity's whole design is picking the best sources and handing back one synthesized answer — exactly wrong for discovery, where the point is surfacing the obscure stuff, not the consensus answer. Tavily's raw snippets let OpenAI look across many different angles and pull out genuinely different candidates. This is the same reasoning from when we discussed Perplexity vs. Tavily for this — Discover uses Tavily+OpenAI, Update Current uses Perplexity, each doing the job it's actually good at.

**Worth knowing:** Discover runs 5 Tavily searches + 2 OpenAI calls per click, and Update Current runs 1 Perplexity call per event checked (up to 20) — so these aren't free actions, just click them with that in mind rather than constantly.

---

# EARLIER: Gemini replaced with Perplexity as the fact-checker everywhere

**Why:** every place Gemini got used in Gemlyx was purely a verification task (never writing, never discovery) — the pre-draft fact pre-check, the manual "fact-check this draft" button, the post-draft invented-claim check, and Detour's place/price check during guide-building. Independent comparisons found Perplexity structurally better at exactly that: it searches the live web first and grounds every answer with per-claim citations, vs. Gemini bundling citations at the end (or dropping them) and leaning more on trained knowledge — reported hallucination rates back it up (~7% for Perplexity vs. meaningfully higher for Gemini on search-grounded answers). Since Gemini had no other role in the pipeline, this is a clean full swap, not a partial one.

**What changed:**
1. **New `api/perplexity.js`** — proxy for Perplexity's Sonar chat completions API, reading `PERPLEXITY_API_KEY` (matches what you already set). Uses the `sonar` model (not `sonar-pro`/`sonar-deep-research`) since this is fact-*checking* — verifying specific claims — not open-ended research; `sonar-pro` is a one-line swap in that file if fact-check quality ever needs to go up.
2. **`askGemini` renamed to `askPerplexity`**, now calling the new proxy — same shape/signature, so all 4 call sites just needed the name swapped, no logic changes.
3. **All 4 fact-check call sites now use Perplexity**: Studio's automatic pre-check before every draft, the manual "◆ Ask Perplexity to fact-check this" button (was "Ask Google AI..."), the post-draft invented-claim check, and Detour's guide-build place/price verification.
4. **UI labels updated** — "Google AI" → "Perplexity" everywhere it showed up (the fact-check button, the cross-check banner, the "written with a ... cross-check" note).
5. **`api/gemini.js` left in the repo but fully unwired** — nothing calls it anymore. You can remove the `GEMINI_API_KEY` env var in Vercel whenever you want (not required, just no longer used); I didn't delete the file itself in case you ever want it back.

**Note on the "discover hidden gems" button you asked about** — that's still queued up next (separate from this Gemini→Perplexity swap): Tavily-powered discovery buttons per content type, an "Update current" button to refresh existing events weekly, and a pick-list before anything gets drafted, per what we scoped together. Sending that in a follow-up pass.

---

# EARLIER: package.json fix + your odt list (privacy text, chat glitches, Signature Routes, Studio prompt)

1. **`package.json` fixed — this was almost certainly the whole problem.** Line 6 was missing a comma after `"react-router-dom": "^6.26.2"`, making the whole file invalid JSON. That would fail the build immediately on install, before any of your code even runs — which explains both "the guide won't open" and why you were still seeing old loading-screen text: that build never shipped. Re-upload this file and the deploy should go through; once it's live, everything below should actually be visible for the first time.
2. **Privacy/disclaimer line near the Detour chat rewritten** — was "Answers are generated via OpenAI — please don't include personal details. Privacy" (stale, since chat runs on Claude now, and it actively discouraged sharing exactly the family/budget/car context that makes plans better). Now reads "Feel free to mention who's traveling — kids, budget, a car — the more Gemlyx knows, the better the plan." Dropped the "Privacy" link here since it was confusing next to that message (the Privacy & Data link elsewhere in the app is untouched).
3. **"Something went wrong!" — actually fixed, not just logged.** Turns out this was worse than a broken message: it was getting saved into the chat history exactly like a real Claude reply, so on your *next* message it got sent back to Claude as its own prior turn — which is why it would apologize ("that was my end...") for something it never actually said. Now: (a) if a reply comes back empty, it silently retries once before showing anything, since that alone clears most cases; (b) if it's still empty, the bubble is tagged as an error and excluded from what gets sent to Claude as history, so it can never poison a future reply again; (c) the visible message when it does happen is now "Hit a snag on my end — try sending that again" instead of the generic "Something went wrong!", so it reads clearly as an error rather than something Claude "said."
4. **"Gemlyx is thinking…" redesigned** — replaced the italic text line with three small pulsing gold dots in a proper chat bubble (matches the assistant message style). Chat messages (and the thinking indicator) now also fade/float in gently instead of popping in instantly. Full token-by-token streaming would need a bigger change to how the API is called (server-sent events end to end) — flagging that as a possible future upgrade if you want the reply to visibly type itself out, rather than doing it half-way with something that'd look glitchy.
5. **"Signature Routes" section removed** — the whole "Three ready-made seasonal trips" block (Liseleje/etc. seasonal itineraries with the expandable day-by-day) is gone from the Detour page. The separate "Road Trip" quick-start tab (the one that pre-fills a chat request for a route) is untouched since that's a different feature built on different data.
6. **Studio's "town" prompt tuned per Gemini's second-round feedback** — added explicit instructions to avoid "database voice" (writing that just restates a field name in prose), to make contrasting transit options scannable in one clause (e.g. "about 1h driving versus 2h15min by train and bus" instead of splitting the comparison across sentences), and to keep the At a Glance fields (recommendedStayGlance, bestTimeGlance, accommodationGlance) honest to whatever the body text actually says — so a town that "shuts down outside summer" doesn't get a glance field that implies it's fine to visit anytime.

---

# EARLIER: weather on the guide page + OpenWeatherMap proxy added

1. **The new full-page guide now shows weather per day** — turns out the data was already there and just wasn't being displayed. The existing modal already fetches real forecasts (Yr.no) in the background after a guide is built and patches them onto `day.weather`; I wired the same field into `GuidePage.jsx`'s day headers (identical badge style to the old modal). No new API call needed for this part — if you jump to "View as full page" the instant a guide finishes building, the badge may be briefly empty until that background fetch lands, then it'll appear.
2. **`api/openweathermap.js` added** — a proxy for OWM's free forecast endpoint, reading the `OPENWEATHERMAP` env var name exactly as you set it (not `OPENWEATHER_API_KEY` or any other variant — that exact-name mismatch has bitten this project before). Built, syntax-checked, NOT wired into anything yet — see my message for why (the free-tier tradeoff isn't a clean upgrade over what's already there, worth 30 seconds of your input before I connect it to something).

---

# EARLIER: guide page fully wired in (you sent main.jsx)

Done, not just planned this time — see INTEGRATION.md for exactly what changed in `main.jsx`/`App.jsx` and the one command you still need to run (`npm install react-router-dom`). Short version: the old guide modal still works exactly as before; there's a new "View as full page ↗" button in it that sends you to the new card-grid page, which can now actually save to Supabase and hand back a real shareable link.

---

# EARLIER: from your Gemini feedback doc — Detour chat cutoff, guide-build cutoff, loading screen

Studio drafting is confirmed working now, so this pass is about the three things in the doc you sent:

1. **Detour chat "cuts off"** — found it. The live chat call (`sendAI` → `callClaudeChat`) was capped at `max_tokens: 900`, while its own system prompt explicitly instructs "BE GENUINELY HELPFUL, NOT JUST BRIEF" (real DKK figures, full "Applied: ..." handoff paragraphs, etc.) — the code was contradicting its own prompt. Bumped to 2048. This is almost certainly what your screenshot showed ("Sorry, that got cut off").
2. **A second, probably bigger cutoff risk** — the actual guide-building call (the one that turns the conversation into a real multi-day itinerary) was capped at only `1800` tokens. For a longer trip (a week or two, several stops a day with real notes), that's nowhere near enough — bumped to `6000`. This one could easily have been silently truncating longer guides without you necessarily seeing an explicit error, just a shorter/broken guide.
3. **Same JSON self-repair pass now covers guide-building too** — I'd added a repair-on-parse-failure step for Studio drafts last round; pulled that into a shared `parseClaudeJSON` helper and wired the guide-building parse through it too, so a stray unescaped quote there gets the same automatic fix instead of silently failing.
4. **Loading screen — professional copy, no emojis, real percentage.** Replaced the map emoji + bouncing dots with a plain spinner and an actual progress bar tied to the real pipeline stages (not a fake animation):
   - Gathering real places and facts — 15%
   - Structuring your itinerary — 45%
   - Finishing the remaining days — 70% (only shown if a retry pass is needed)
   - Verifying exact locations and routes — 90%
   
   This didn't need OpenAI — it's just copy + a state value already being set at each real stage, now displayed as a percentage instead of thrown away.

## Guide-as-a-full-page — built, not fully wired in (see INTEGRATION.md)

You picked "full page + real shareable URL." What's in this zip:

- `src/pages/GuidePage.jsx` — new, self-contained, doesn't touch `App.jsx`. Card grid (reuses the same `.towns-grid` styling as the Hidden Towns page), grouped by day, with a "does this look right?" confirm step before saving, and a read-only shareable view once saved.
- `supabase_guides_schema.sql` — the exact SQL to run once in Supabase's SQL editor to create the table this needs (public read-by-id, public insert, no login required — same model as sharing a Google Doc link).
- `INTEGRATION.md` — exactly what's left: adding `react-router-dom` and 3 small wiring changes. I stopped short of making those changes myself because I don't have `package.json` (can't confirm the router isn't already installed differently) or `main.jsx` (can't see how the app is currently mounted) — guessing at either risks breaking the entire site's load, not just degrading one feature. Send me those two files and I'll finish the wiring in one pass; otherwise `INTEGRATION.md` has the exact steps to do it by hand.

---

# LATEST: JSON parse error fixed with a self-repair pass

Progress — the previous 3 fixes worked: Claude is now actually producing a full response instead of dying empty. The new error (`SyntaxError: Expected ',' or '}' after property value in JSON at position 1129`) is a different, much more common failure mode: Claude's prose almost always eventually hits a case where it quotes a phrase or nickname with a literal `"` inside a string value, which breaks strict JSON parsing — a one-character slip, not a structural problem.

Instead of guessing which quote broke it with regex (unreliable), I added a genuine repair pass: when the first parse fails, the code now sends the exact parser error message back to Claude and asks it to fix ONLY the syntax, not the content, then parses again. This is a general fix — it'll catch this same failure mode whenever it recurs, not just this one draft. If the repair pass also fails, you'll get a clear error saying so (rather than the vague "check the name" message).

---

# CONFIRMED FIXES (from your actual console log — earlier pass)

Your latest console log gave exact error text for all three, so these are no longer guesses:

1. **OpenAI 400** — `"Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."` `gpt-5.6-sol` is a reasoning-tier model that dropped `max_tokens` (same real-world behavior as OpenAI's o1/o3 models). Changed `askOpenAI` to send `max_completion_tokens` instead. This should bring Stage 1 (research planning) and Stage 4 (note structuring) back online — they've been failing on every draft.
2. **Gemini 404** — `"models/gemini-3.1-pro is not found for API version v1beta"`. Google's current docs (as of writing) give the model ID as `gemini-3.1-pro-preview` — updated `api/gemini.js` to that. If Google renames it again, check https://ai.google.dev/gemini-api/docs/generate-content/gemini-3 for the current ID.
3. **Claude "Empty response" — confirmed genuinely `stop_reason: max_tokens`** at the 4096 I'd bumped it to last time. Pushed further to 8192. Also: since OpenAI's structuring stage was broken (bug #1 above), Claude has been drafting from raw, unorganized research every single time instead of clean organized notes — fixing #1 should itself reduce how much Claude needs to write. If it still runs out at 8192 after that, expand the logged object in devtools (don't let it stay collapsed) and send me the actual `usage`/`stop_reason` values.

You mentioned switching Tavily to pay-as-you-go — that should clear the 502s independently of the above (those were Tavily quota, unrelated to the three bugs here).

---

# What changed in this pass (unverified — test before trusting)

Same rule as always: nothing here is confirmed live/working until you've tested it. Syntax-checked (parses clean with a real JS/JSX parser), not build-tested — still not the full repo, so it can't actually run end-to-end here.

## The "Couldn't draft that" / "Empty response from Claude" bug

Your console log was genuinely useful — here's what it actually shows:

- **`/api/openai` 400 (x2)** — both the research-planning stage and the note-structuring stage are failing on every single draft right now. These fail *silently* by design (a miss just degrades to raw, unorganized research — never blocks the draft), which is exactly why you never saw them before. Practically: your 5-stage pipeline has been running as a 3-stage one (no OpenAI planning, no OpenAI structuring) for a while now, and there was no visibility into that. I added `console.warn` logging for these so the real OpenAI error text shows up in devtools next time, instead of vanishing. I can't fetch that text from here — open the console next time you draft and send me what it says next to "OpenAI call failed:". My best guess: `gpt-5.6-sol` is either not a valid model name for your account, or (if it's a reasoning-tier model) it may need `max_completion_tokens` instead of `max_tokens` in the request — that's a real, common gotcha with newer OpenAI reasoning models.
- **`/api/gemini` 404** — same story, also silent-by-design, also now logged. Likely `gemini-3.1-pro` isn't the right model string for the generateContent endpoint. Send me the logged error text next time.
- **`/api/search` 502 (x4)** — you sent me the actual `search.js` file this round, so now I can say something concrete: the ONLY way this endpoint returns 502 is when Tavily itself rejects the request (see line 38-41 of that file). A *missing* `TAVILY_API_KEY` returns 500, not 502 — so this specifically means Vercel has a `TAVILY_API_KEY` set, but Tavily is rejecting it (invalid/expired key, free-tier quota used up, or a billing issue on Tavily's side). Check the Tavily dashboard directly and confirm the key there matches what's in Vercel.
- **The actual blocker — "Empty response from Claude"** — this is the one that stopped the draft cold. There's no console entry showing `/api/anthropic` itself failing (no 4xx/5xx), meaning the call succeeded but came back with no usable text. I made two changes: (1) bumped the draft call's `max_tokens` from 2200 → 4096 — the JSON schema for a town/festival entry is a dozen+ fields of real prose, and 2200 was genuinely tight, a response that runs out of budget mid-JSON looks identical to "empty" to the code reading it; (2) added logging of `stop_reason` and block types when this happens, so next time it'll tell you directly whether it was cut off by the token limit or something else entirely (e.g. a refusal).

None of this is a guaranteed fix — I can't call these APIs from here to confirm. But the OpenAI/Gemini failures are now visible instead of silent, and the Claude call has real headroom + real diagnostics if it happens again. Try a draft, and if anything still fails, paste me the console output — it should be much more informative now.

## Food Street — built as its own Studio category, as requested

- Studio's content-type picker now has a separate "🍜 Food Street" pill alongside "🍽 Food" — its own research queries, its own Gemini fact-check framing, and its own Claude drafting prompt (adapted for a market/street with multiple vendors — explicitly told never to write it like a single restaurant's kitchen).
- Food Street entries land in the same `foodSpots` data array as regular food entries (with `isFoodStreet: true`), not a separate array — because the live Food page shows them together with a new filter, not as a separate section.
- **Food page navigation**: added a "All / Restaurants / Food Streets" filter row above the existing Budget tabs, so Food Streets sit "along with Restaurants" as you asked, filterable independently.
- Also updated the ID-uniqueness check, the price-field mapping, the photo-folder mapping, the stay-duration estimate (60–120 min, since grazing multiple stalls takes longer than one sit-down meal), and the live-publish merge path so a published Food Street entry actually lands correctly — all the same plumbing regular Food entries get.

## Also fixed since last pass

1. **Nearest-station "walk" time was silently a transit time** — `findRealNearestStation` called `/api/directions` with the invalid `mode=walk` (valid modes are `driving/walking/bicycling/transit`), silently falling back to `transit`. Fixed to `mode=walking`. Strong candidate for your "extremely off estimates" complaint.
2. **"~0 km" display** — legs under 0.5 km now show "<1 km" instead of the confusing "~0 km" from your screenshot.
3. **Studio draft errors show the real reason** — appends the underlying error in parentheses instead of just "try again, or check the name."

## Renamed (labels only, not data/type keys)

- Studio content-type picker: "Festival" → "Events", "Free Entrance" → "Attractions"
- Saved-places caption, Suggest a Place modal: same renames, plus "Craft" → "Shopping"
- Detour's "Into" interest picker: added "Shopping" back (Craft stays removed)

## About "JS files.zip"

Two different things were in there:

- **`places.js`, `route.js`, `scan-source.js`, `search.js`, `weather.js`** — these are real, previously-missing `/api/*` endpoints that `App.jsx` calls but weren't in the original zip. All read clean, all match how `App.jsx` calls them (same query params, same response shape expected). Folded into this zip's `api/` folder — no code changes needed on these, they look correctly built.
- **`GemlyxPreview.jsx`** — this is NOT the current app. It's a different, much older prototype (a shopping/city-guide concept — `cities`, `shopTab`, `selectedProduct` — no Studio, no Detour AI chat, none of the pipeline we've been fixing). Its data arrays (`towns`, `foodSpots`, `craftItemsFallback` etc.) don't match the schema your current `App.jsx` and Studio actually produce. I did not use anything from it — using stale data shaped for a different app would silently corrupt what's live now. If you still have the CURRENT `src/data/towns.js`, `src/data/food.js`, `src/data/craft.js`, `src/data/freeEntrance.js`, etc. (the ones your real App.jsx imports today), those are what I'd actually need for deeper Food Street/data work — this file isn't a substitute for them.

## Still not touched

- Emoji removal — you said "considering," not decided.
- Guide-overwhelm redesign — you're handling that separately.
- The root OpenAI/Gemini model-string issues and the Tavily key problem — need your Vercel/Tavily dashboard, can't diagnose further blind.

## Files touched
`src/App.jsx` edited. `api/places.js`, `api/route.js`, `api/scan-source.js`, `api/search.js`, `api/weather.js` added (previously missing, now included so this zip is more complete). Everything else unchanged. All files parse clean (checked with a real JS/JSX parser).
