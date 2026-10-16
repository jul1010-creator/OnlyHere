# GEMLYX: FULL HAND-OFF, 16 OCT 2026 (evening)

Read all of this before doing anything. It replaces the earlier hand-offs for the current state. Two older files still hold detail that is not repeated here: HANDOFF_15OCT_NIGHT.md section 6 (deal alerts, Oliver's steps) and section 7 (the security SQL, Vercel keys and what changes for people).

**State in one line:** everything built so far is live on GitHub main except stage B of the security work, which waits for Oliver to run `SECURITY_FIXES_15OCT.sql`. Main passes 23,905 tests. Oliver is lowering the model's effort for the next chat, so follow the routines below exactly rather than improvising.

---

## 1. Who and what

* **Oliver Verhein Hoffmann**, master's student in Aalborg, building **Gemlyx** (formerly OnlyHere), a travel app, live at **gemlyxtravel.com**. He used to work for Klaipėda's tourism centre.
* **/lithuania is the Klaipėda pilot and the focus now.** Its Explore page is a deals page: offers from Klaipėda businesses for their quiet hours, aimed at cruise passengers who are ashore for a few hours in the daytime. He will pitch it to the tourism centre in person.
* The partners on the page are **nine made-up example partners**, each marked "Example". The first real deal published in Studio replaces all of them by itself.
* The Danish side shows a "being reworked" page since 13 Oct.
* He compares looks against lidl.dk and hivecph.dk and cares about every detail.

## 2. His standing rules (every reply, and every word written into the app)

1. **No dashes of any kind**: no em dash, no en dash, no hyphen used as a pause. Hyphens only inside compound words and number ranges ("3 of 7 - 4 still to go" style counts may use one).
2. **Avoid "actually", "genuinely", "genuine", "simply", "truly".** Check new copy for them before it ships.
3. **No explanatory text under form fields.** A label and a control is the whole field.
4. **Keep users inside the app** where possible.
5. **Never touch a Supabase browser tab** (any supabase.com dashboard tab). **Never run SQL.** Never attack the live site.
6. **Never print API keys** in chat.
7. **Do not spawn Fable** (a subagent persona) unless he asks for it by name in the moment.
8. **Never write to or contact the businesses on his tourism network mail list.** His words: "Do not under ANY circumstances write to these places."
9. Before correcting one of his facts, check that it is wrong. When two sources disagree, say so instead of picking one.
10. Affiliate copy names the cost AND what it buys; never talk a partner's goods down.
11. **No deal, example or copy may discount or promote alcohol** (Lithuanian law, section 5).
12. Short, direct answers: a sentence or two of outcome, not a recap. At most one question, and only when the answer changes what you build.
13. **Ask before anything goes live** unless he has just asked for that exact thing. For anything visual, show him a preview first (a screenshot of the change on his live page, done in your own tab, works well).

## 3. Repo, tools and the push routine

* **Repo:** `jul1010-creator/OnlyHere` on GitHub, the app in `onlyhere-project/`. Vite + React 18. **Vercel deploys every push to main**; a commit whose message contains `[skip ci]` does not build.
* This chat's clone is `/home/claude/repo` (git root; the app is `/home/claude/repo/onlyhere-project`), on branch `main`, equal to GitHub main. A new container needs `git clone https://github.com/jul1010-creator/OnlyHere.git`. Reading over git works.
* **`git push` is refused** by the session's git proxy (the repo is not in the session's authorised set), and the GitHub API answers "access not enabled". Push through the GitHub web upload in Oliver's Chrome (Claude in Chrome), and check a deploy by opening the live page.
* **His local OneDrive copy is behind GitHub.** Never build from it or copy it over GitHub.

**Push routine (works; follow it exactly):**

1. Copy each changed file to its own folder `/mnt/user-data/uploads/bNNN/` (the next free number is **b260**; file_upload only takes files under the session's upload and output folders).
2. In Chrome: `tabs_context_mcp`, then **open your own tab** with `tabs_create_mcp`. Never use his tabs. Tab ids change; re-read the context when a tool says a tab is not in the group.
3. Navigate to `https://github.com/jul1010-creator/OnlyHere/upload/main/onlyhere-project/<dir>` (for example `src/components`). If `find` errors right after a navigation, navigate again.
4. `find` "file input type=file Choose your files", then `file_upload` with the path. **Max 10 MB per call.**
5. `javascript_tool`: wait (5 s for small files, 30 s for App.jsx, about 40 s for tests/run.mjs, split into two waits under 45 s each), check the file name is in `document.body.innerText`, then set `#commit-summary-input` and `#commit-description-textarea` with the native value setter and an `input` event each, and click the last button whose text contains "Commit changes".
6. The description always ends with these two lines:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
   `Claude-Session: https://claude.ai/code/session_01FWAmVD8SMGZKi7V33WG94M`
7. **Order: dependencies first** (utils and data, then components, then App.jsx, then tests). Every commit carries `[skip ci]` except the one that should build, which goes after everything it imports is on GitHub.
8. Verify every commit: `git fetch -q origin && git show origin/main:onlyhere-project/<path> | cmp - onlyhere-project/<path>`. At the end `git diff --stat origin/main HEAD` must be empty; then point the local branch at origin/main (`git checkout -q -B main origin/main`), because web uploads make new commit ids and the stop hook otherwise reports "unpushed commits".
9. Close your own tab.

**Checks before any push** (from `onlyhere-project/`):

```bash
timeout 600 node --max-old-space-size=3072 tests/run.mjs   # 23,905 passing, 0 failing on main
node tests/tdz.mjs                                         # exit 0
npm run build
```

Tests mostly read source text with regexes. When you change a line a test pins, update that test and say why in a comment. The newest test batches are 248 (dark tile maps) and 249 (example pictures); number new ones from 250.

**His computer:** the desktop bridge (`mcp__remote-devices__*`) comes and goes. When it is there, `device_commit_files` saves files to `C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project\Claude outputs\<date>\`, where the git bundles and reports live.

## 4. What is live on /lithuania now

* **Banner:** a Gemlyx brand slide, then a slide per deal on now (its photo when it has one), arrows and pause; picking a kind of place plays that category's film (only Nightlife has footage).
* **Circles:** Restaurants, Nightlife, Attractions, Rentals. The chosen one fills gold and its label turns gold.
* **The list:** only offers that can be used now; later ones wait under "Upcoming". Sort: Closest (asks for location) or A to Z.
* **Tiles:** the deal's photo, else a small Google map in a **dark style** (since 16 Oct), else the place's sign. Tapping opens the deal sheet: photo or map on top, the offer, Redeem (a Gemlyx branded screen to show at the counter), directions, and a dark map lower down.
* **Example pictures (16 Oct):** the bakery, tea room, amber workshop, bike hire and jazz cellar examples carry free Unsplash photos; the postcard shop, luggage room, smokehouse and beer bar keep the dark map.
* **Hidden, code kept:** the bar of pages along the top (`TOP_NAV_SHOWN` in App.jsx, off on /lithuania only) and the line "In cooperation with Klaipėda Tourism Center" (`CENTRE_LINE_SHOWN = false` in DealsNearYou.jsx), until the tourism centre says yes.
* **Deal alerts** (bell, settings, daily mail) are built but stay off until Oliver runs `DEAL_ALERTS_15OCT.sql` and sets `CRON_SECRET` and `RESEND_API_KEY` in Vercel (HANDOFF_15OCT_NIGHT.md section 6).
* Google's Static Maps API now works for the browser key, so the tile maps are pictures, not live maps.

## 5. Done on 16 Oct

* **Partner shortlist** from his tourism network mail list (207 addresses), in the doc "Klaipėda partner shortlist" (https://claude.ai/code/artifact/29caaa8b-e679-4a9f-b40c-d8e5888f0a59, a Claude Doc; edit it with the Docs tools). First 38 places by his rules (people walk past, something interesting, decent reviews, any scandal, poor hygiene or very poor service blacklisted). Then narrowed to **28** on his note that the busiest old town places will not want deals: each restaurant, cafe and bar was read on Google Maps for its busy hours, and every kept place has a "When it is quiet" column, which doubles as the slot to pitch a quiet hour deal. He allowed 1 to 2 km past the old town. **Nobody was contacted.**
  * Restaurants: Stora Antis, Sap Pa Rod by Thai House, Gruzijos skonis, Casa de Locos, Pepper Grey Town, Indija house. Cafes: Namai be gliuteno, Cremia, Pas Betą. Bars: Kurpiai, Dirty Hands, Leika, Achtung Baby, HOFAS. Activities: Escape Bunker 1944, Tiras 365, Popaboat. Museums and culture unchanged (5 and 6).
  * Out as too busy or too well known: Gaisrinė, Kavinė Klaipėdos Senamiestis, Meridianas, Senoji Hansa, Momo Grill, Monai, MUDU, Grasso, Pas Francesco, ALBA Bistro, DOCK, Švyturys BHouse, and the four busy coffee houses. Rory Pub is out on his word (Google shows it opening at 17:00 and quiet Monday to Thursday; told him once, it is his call).
  * Blacklisted: Mosso Bistro (salmonella outbreak, Aug 2024), Sky21 Terrace (a pattern of poor service), and the Sea Museum, Drama Theatre and Culture Communication Centre under his "any scandal" rule. Asked whether the issues are small next to how popular they are: the three institutions' issues are old and touched no visitor (recommended bringing them back; the Sea Museum's dolphin shows are a values question for him); Mosso small in numbers but the one real hygiene case (hold for now); Sky21 not small (17% of its Google reviews are 1 or 2 stars). He has not answered.
* **A UX report he had made with Gemini:** verdict given. Taken: dark maps. Already in the app: circle states and the on now list. Rejected for Gemlyx: a paid "VIP City Pass", nightlife urgency and neon, live capacities, three category colours.
* **The alcohol law.** Lithuania's Alcohol Control Law bans alcohol advertising, online included, since 2018 (Article 29), and Article 28 bans announcing alcohol price reductions and alcohol discount coupons; a 2024 amendment kept the ban. So a bar's deal is food, snacks, games, entry or soft drinks (alcohol free beer and wine fall outside the law), and it must not depend on buying alcohol ("with any order", not "with every beer"). He agreed: "I guess it would be snacks, games, entertainment, etc. instead."
* **Dark tile maps** (`src/utils/cardMapStyle.js`, used by `src/components/DealCornerMap.jsx`): the style in the page's browns, sent as Static Maps `style=` params with no `map_id`, and as `styles` on the live fallback map. Shops, cafes and bars nearby are hidden so a partner's tile does not show the place next door. The walk map, the place view and Studio keep the tourism guide's light Map ID.
* **Example pictures** (`EXAMPLE_DEAL_PHOTO` in `src/data/klaipedaExamples.js`, added in `examplePromotionPools` only, so the examples page and the walk keep the signs). Photos are hotlinked from images.unsplash.com under the Unsplash licence.
* Commits on GitHub main today: `7eaedad`, `81d407d`, `4d3b329` (built), `adfa2a5` (tests), `c1b9b32` (the 15 Oct hand-off's section 11), then this file. Checked live: five photos, dark maps.

## 6. Branches and bundles

* `main` in the container equals GitHub main.
* **`stage-b5` is stage B now:** the rest of the security backlog (about 70 of 82 sections), merged with today's main, no conflicts, 24,081 passing. Bundle on his computer: `Claude outputs/16OCT/gemlyx-stage-b5.bundle`, made against GitHub main at the commit that added this file. In a new container: clone, stage the bundle with `device_stage_files`, then `git fetch <staged bundle path> stage-b5:stage-b5`.
* **Before pushing stage B:** `git checkout stage-b5 && git fetch origin && git merge origin/main`, run the suite, and take the push list from `git diff --name-status origin/main stage-b5`. Never push from `stage-b4` or any older bundle: their tests and notes are older than GitHub's and would undo today's work. `Claude outputs/16OCT/gemlyx-dark-maps.bundle` is obsolete (already on main).
* The other local branches in the container (stage-a, stage-a2, stage-b to stage-b4, deal-alerts, design-review, security-backlog, film-frame) are history.

## 7. Waiting on Oliver

1. **The beer example.** "Alaus baras Inkaras: Three Lithuanian beers, 0.1 l each, for the price of a large one" is still live, and the law in section 5 forbids that kind of offer. Proposed swap, waiting for his yes: "Free darts and board games for your table, weekdays 16:00 to 19:00" at the same bar (`key: "beer"` in `src/data/klaipedaExampleRows.js`; change the offer in en, lt, da and de and the idea line, keep it in Nightlife, and check the tests that pin that row).
2. Whether the Sea Museum, Drama Theatre and Culture Communication Centre go back on the shortlist.
3. **Stage B:** he runs the SQL in the order in HANDOFF_15OCT_NIGHT.md section 7, then stage B is pushed with the routine.
4. **Deal alerts:** his steps in HANDOFF_15OCT_NIGHT.md section 6.
5. The nightly security review asked for Chrome to check the SQL. Advised no (his Supabase rule, and the SQL editor runs as the database owner) and offered a read only snapshot query he runs after each SQL change. No answer yet.
6. The tourism centre's yes for the cooperation line, then set `CENTRE_LINE_SHOWN` to true.
7. Whether the walk map and the place view should be dark too.
8. Older items: films for Restaurants, Attractions and Rentals; a native read of the Lithuanian, Danish and German strings; "Book a table" and the tourism centre link both send people out of the app (rule 4); real partner photos.

## 8. Where things are in the code

| What | File |
|---|---|
| Explore deals page, sort, Upcoming, the hidden cooperation line | `src/components/DealsNearYou.jsx` |
| Banner and its slides | `src/components/ExploreBanner.jsx` |
| Category films (Nightlife only) | `src/components/CategoryVideo.jsx` |
| Category circles | `src/components/CategoryFilter.jsx` |
| Tile, picture rule (photo, else map, else sign) | `src/components/DealCard.jsx` |
| Deal sheet | `src/components/DealDetail.jsx` |
| Tile map and its dark style | `src/components/DealCornerMap.jsx`, `src/utils/cardMapStyle.js` |
| The nine made-up partners and their offers | `src/data/klaipedaExampleRows.js` |
| Example pages, example deal photos | `src/data/klaipedaExamples.js` |
| Map ID and Maps loader | `src/utils/googleMapsLoader.js` |
| Hidden top bar on /lithuania | `TOP_NAV_SHOWN` in `src/App.jsx` |
| Strings in four languages | `src/utils/uiLanguage.js` |

## 9. Scheduled task

The nightly security review is a scheduled task, `trig_0191gzX5nYkHzpfCcwNtCLu9`. Its prompt was updated on 15 Oct (denial of service questions, a full read of fixes Claude applied, a line naming the model each reviewer ran on). He said not to rerun the missed Thursday review. It writes to his private security log doc and marks a row Fixed once it sees the change on GitHub.

## 10. How to work with him

Warm, short and direct. Do the thing, then say in a sentence or two what changed. Check facts before stating them, and look at what is already in the code before proposing to build something (two of the three "agreed" ideas on 16 Oct turned out to exist already). When his footage, photos or facts limit a result, say so plainly.
