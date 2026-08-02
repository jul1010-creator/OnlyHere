# GEMLYX HANDOFF #4, for the next session
*(Written Aug 2 2026, end of the feedback-sweep session. Read GEMLYX_HANDOFF_3.md for the design system and front-door anatomy; this one covers what changed since and what's next.)*

## Non-negotiable rules Oliver stated this session
1. **Honesty**: Oliver has NOT visited every gem. "I don't lie to people." Never claim personal visits or physical verification anywhere. True framing: researched and fact-checked, omitted when unconfirmable. Approved hero line: "Hidden gems across the country, and this is how you find them."
2. **Dash ban, total**: never use em dashes, en dashes, or hyphens as pauses. Anywhere. Not in replies to Oliver, not in AI content, not in guides. Hyphens survive only inside compound words (check-in) and number ranges (2-3 hours). Guides and chat are also scrubbed deterministically (deDashText/deDashDeep in App.jsx), so this is enforced in code, not just prompts.
3. **Transport facts are frozen**: Rejsekort has check-in/check-out. The Copenhagen Card does NOT (activate once, show on request). DOT/DSB app tickets are shown on the phone. Never describe mechanics for anything except Rejsekort; unsure means name it and point at the official app. This lives as a VERIFIED DANISH TRANSPORT FACTS block in both the guide prompt and chat prompt. If a wrong transport claim ever ships again, add the correction as a new frozen fact.

## Shipped this session (all committed via device bridge, Oliver pushes manually)
1. Logo opening animation restored on the entrance: GemlyxIntro in GemlyxLogo.jsx, plays center stage (letters rise, compass pops and spins with overshoot, ring draws, tagline fades), then the whole lockup FLIES to the top-left corner and dissolves into the topbar logo, then the Denmark card pops. Once per browser session (sessionStorage gxIntroSeen), click skips, reduced-motion skips.
2. Compass is GOLD everywhere now (Oliver's call): GemCore/Mark/Logo/Loader default tone gold, favicon gold. Teal kept as tone="teal" variant.
3. Hero video "stopped" root cause: visibility was gated on onCanPlay, which never fires for a cached video, so it played invisibly behind the poster. Fixed with loadeddata/playing/readyState signals. Untested live.
4. "Today in Denmark" block modernized: one glass panel, weather pill chips, quiet Enable location row, segmented Live/Coming control, gold dates.
5. Honesty sweep of UI copy: hero line, Towns intro, footer ("It exists nowhere else · Denmark"), two FAQ answers rewritten to the research framing.
6. Painting re-upscaled from Oliver's lossless PNG (still 1024px source). Real phone sharpness STILL needs a 2048px+ export from his generator. front-page-2x.jpg is the live file.
7. Guide pipeline hardened: grounding search, build (Opus), day-count retry, independent Perplexity fact-check of the BUILT guide, targeted Opus correction (removes unverifiable claims instead of guessing), dash scrub, then geocode/durations/weather. Stages: "Fact-checking the guide", "Correcting flagged facts". Essentials fields have friend-texting voice rules.
8. Chat streaming smoothed: SmoothStreamText (module level in App.jsx) reveals ~90 chars/s via rAF with backlog catch-up, instant for history, bottom-pin only when reader is near the bottom. Pace is one number to tune if Oliver asks.
9. Filters rebuilt app-wide: FilterChip + FilterToggle (module level, deliberately, inner components would remount and close the sheet). Compact chip row, tap opens a bottom sheet. Events merged Local/Major/Viking into ONE grid with Scale as a chip (eventTab state retired for eventScale). Food, Towns, Attractions converted too. "Closest to me" chip on all four pages (townKmFromUser distance sort, asks for location, Denmark only).
10. Studio (/#studio): "Random guide setup" button under the Detour chat composes a randomized real-place trip brief and builds a guide with ZERO chat calls (generateGuide now accepts a msgsOverride array). Use it for cheap testing.
11. Fixed silent bug: home cards for Attractions and Gemlyx Detour pointed at picture7.jpg/picture9.jpg which never existed. Repointed to librarygarden1.jpg and plans.jpg until Oliver picks real photos.

## Still to do (Oliver's remaining backlog, rough priority)
1. Nightlife: card treatment plus room for an AI-written town description when a town is clicked (Copenhagen description was missing); Local/Major feels weird there, reconsider.
2. Towns-nav Leaflet map should actually look like Denmark, "not a kid's drawing" (mapShapes.js).
3. Detour guide map bugs: a 7-minute road shown as ~2 hours; public-transport-only plans showing 1-minute transit then a 30-40 minute walk. Look at fetchExactDurations, detectLegMode, /api/directions.js.
4. Guide output redesign: stop the "long book". Instant full-page view, short picture of the city plus every attraction by day, and at scroll-bottom the AI ready to respond to comments on the plan.
5. Two tick options near the bottom of the guide flow: Gemlyx checks the route, whether Kombardo/Flixbus/Orange Tickets are worth it, and which stays are worth it per day.
6. Essentials page still has the colored-emoji quick-jump grid; convert to Ico icons and cards.
7. Entrance art at 2048px+ from Oliver's generator, then swap into public/ and rebuild front-page-2x.jpg.
8. "Why this page exists" text under the entrance country card (waiting on Oliver's words).
9. Older: image-finder tool re-run for town photos, "map takes long to load" never investigated, Studio login 🔒 emoji, deeper App.jsx splitting.

## Conventions (unchanged, follow them)
Every delivery: new "# LATEST:" entry in CHANGES_THIS_PASS.md, demote the previous to "# EARLIER:", honest root-cause style, "please test before trusting". Verify every edited file: esbuild bundle (react/react-dom/react-router-dom/leaflet externalized, use --jsx=automatic), PLUS execute the bundle in Node with stub modules, PLUS a used-identifiers vs imports cross-reference. Visual work: static HTML replica, Playwright screenshot (chromium at /opt/pw-browsers), LOOK at it, iterate, then port. Device-bridge commits need fresh mtimes (device_list_dir right before committing). The sandbox cannot reach vercel.app; use the user's browser for live checks. No emoji in UI chrome; glyphs ◆ ✦ ◈ are fine. Oliver tests on phone and interrupts with rapid follow-ups: fold them in.
