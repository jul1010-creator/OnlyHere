# GEMLYX: HAND-OFF, 15 OCT 2026 (night)

Read this before doing anything. It follows HANDOFF_14OCT_FULL.md, whose rules, push routine and checks still apply (sections 2 and 3 there).

**State in one line:** stage A went to GitHub on 15 Oct at about 18:15, after Oliver said "Just commit changes." Stage B still waits for him to run `SECURITY_FIXES_15OCT.sql`, and deal alerts stay off until `DEAL_ALERTS_15OCT.sql`, `CRON_SECRET` and `RESEND_API_KEY` exist (section 6). Section 10 has the evening's notes.

---

## 1. What is ready

| Stage | What | Safe to push | Suite |
|---|---|---|---|
| A | New nightlife film, the tourism centre line, Fable's design polish, deal alerts (switched off until its SQL and keys exist), and three security fixes that need no SQL: section 1 (Critical, stop names ran as HTML on the maps), 55 (High, OpenAI counted like Sonnet) and 2 (links are http(s) only) | Yes, now | 23,886 passing, 0 failing; tdz 0; build OK; real browser smoke test of /lithuania OK |
| B | Stage A plus the rest of the security backlog (about 70 of the 82 sections in the fix brief) | Only after Oliver runs `SECURITY_FIXES_15OCT.sql` | 24,062 passing, 0 failing; tdz 0; build OK; smoke test OK |

`tests/browser.mjs` fails 5 of 6 on GitHub main as well, before any of this work: it expects the Danish landing page, which is the "being reworked" page since 13 Oct. Not caused by this night.

## 2. Where the work is

* This night's container (may be gone by morning): `/home/claude/repo`, branches `stage-a2` (stage A) and `stage-b2` (stage B), both on top of GitHub main `d569603`.
* Oliver's computer, `onlyhere-project/Claude outputs/15OCT/`: `gemlyx-stage-a.bundle` and `gemlyx-stage-b.bundle` (git bundles of the two branches), the four film files, the two SQL files, `DESIGN_REVIEW_15OCT.md`, the screenshots, and this file.
* A new session: clone GitHub (section 3 of the 14 Oct hand-off), stage the bundle from his folder with `device_stage_files`, then `git fetch /mnt/user-data/uploads/onlyhere-project/Claude\ outputs/15OCT/gemlyx-stage-a.bundle stage-a2:stage-a2` and `git diff --stat origin/main stage-a2`. Same for stage B with `stage-b2`.
* His local OneDrive folder is BEHIND GitHub (it has no CategoryVideo.jsx, no public/video). Never build from it or copy it over GitHub.

## 3. Push plan

Follow the routine in section 3 of HANDOFF_14OCT_FULL.md (own tab, upload page per folder, 10 MB per file_upload call, `[skip ci]` on every commit but the last, verify each commit with `git show origin/main:<path> | cmp - <path>`).

**Stage A, in this order** (paths under `onlyhere-project/`):
1. `public/video`: nightlife-wide.mp4 + nightlife-wide.jpg in one file_upload call, nightlife-tall.mp4 + nightlife-tall.jpg in a second, one commit.
2. `src/utils`: uiLanguage.js, dealAlerts.js, dealAlertsStore.js, dealOpen.js, htmlText.js, aiGate.js, correction.js.
3. `src/components`: DealAlerts.jsx, DealsNearYou.jsx, ExploreBanner.jsx, CategoryVideo.jsx, CategoryFilter.jsx, SpinningMark.jsx, DealCard.jsx, AboutMePage.jsx, DealStudio.jsx, GuideRouteMap.jsx, PlaceMiniMap.jsx, ChatMiniMap.jsx, CheapGemsPage.jsx, InstagramEmbed.jsx, StoreBadge.jsx.
4. `src/pages`: GuidePage.jsx.
5. `src`: App.jsx (wait 30 s).
6. `api`: deal-alerts.js, save-guide.js.
7. Root and `public`: vercel.json, DEAL_ALERTS_15OCT.sql, SECURITY_LOCKDOWN_30SEP.sql, HANDOFF_15OCT_NIGHT.md, DESIGN_REVIEW_15OCT.md; `public/privacy.html`.
8. `tests`: run.mjs LAST, without `[skip ci]` (wait 40 s).

Check every path against `git diff --name-only origin/main stage-a2` before starting; that list is the truth.

**Stage B**: only after Oliver has run the SQL (section 6 below). `git diff --name-status stage-a2 stage-b2` lists about 95 files across api/, src/utils, src/components, src/pages, root SQL and notes, and tests. Push it the same way. Two parts need care:
* Section 9 deletes the stale copy of the app at the repo root (`/src`, `/tests/run.mjs`, `/confirm-signup-email.html`), 13 files. On the web each delete is its own commit (routine step 9); it can wait for a later session without harm.
* `.github/workflows/build-check.yml` and `.githooks/pre-push` change (section 43). GitHub may refuse a workflow file from the web upload; if so, leave it for Oliver.

After the last commit: check the Vercel status (routine step 8), then open gemlyxtravel.com/lithuania and tell Oliver to hard refresh (Ctrl + F5), because the film files keep their names.

## 4. The film

* From Oliver's original upload (`1014.mp4`, 3844x2160, 60 fps, 72 MB, a silent sound track).
* The export is mostly 25 fps footage repeated to fill 60 fps. Every repeated frame was made an exact copy of the one before, so the encoder spends nothing on them and the motion is the export's own.
* One stock clip (the cocktail sip) had black bars of 40 px on both sides. The whole film is trimmed 1% at each edge, so the bars are gone everywhere.
* Recipe from the 14 Oct hand-off: H.264 CRF 20, `-tune film`, preset slower, High profile, faststart, no sound, a 0.4 s fade in and out. Two changes: the 4K export is cropped and scaled to exactly 1920x1080 (scale=1920:-2 would have given 1078), and level 4.2 with 4 reference frames so older phones decode 1080p60 in hardware.
* Wide 1920x1080: 6.74 MB, SSIM 0.993 against the master. Phone 960x1080: 4.36 MB, SSIM 0.991, cropped per scene so every subject stays in (whisky x480, toast x460, sip x620, shot x400, dancer x480). Stills from 0.8 s. All four files under the suite's 7 MB limit.
* At 100% the film matches the export. The marina toast and the sip are soft in the stock footage itself; no encode can sharpen them. Hive's hero film, for comparison: 1920x1080, 25 fps, 37 s, 46.6 MB (about 10 Mbit/s), their own venue.

## 5. The tourism centre line

Under the deals on /lithuania: "In cooperation with Klaipėda Tourism Center", the centre's name the link to klaipedatravel.lt (Lithuanian page for lt, English for the rest). Keys `explore.coop` ("In cooperation with {name}") and `explore.coopName` in all four languages; the old `explore.more` key is gone. Oliver wrote "Klaípeda" and "coporation"; written as Klaipėda and cooperation. A native speaker should read the Lithuanian ("Bendradarbiaujant su Klaipėdos turizmo centru").

## 6. Deal alerts (built 15 Oct)

**What Oliver asked:** members see when a new deal pops up, and can get it by email, ticking which kinds of place they want ("so they don't get tons from museums"). Logged in members only. Email: one daily roundup, but a short promotion ("for the next 3 hours we give free table") goes out at once.

**What exists:**
* A bell beside the account avatar on the Lithuania site, signed in only, with a count. It opens "New deals" (a dropdown on a computer, a bottom sheet on a phone); a tap opens the deal on Explore. Settings: the four kinds of place as switches and "Email me new deals" (off by default). The same settings on /me under "Deal alerts".
* `api/deal-alerts.js`: Vercel Cron every 10 minutes (needs `CRON_SECRET`), finds new published Klaipėda deals, mails short promotions at once and sends the roundup from 09:00 Klaipėda time, at most one a day. Studio pings it after a deal is saved and shown (founder only). One click unsubscribe (`?unsub=`), with a confirm button for mail scanners.
* Rules in `src/utils/dealAlerts.js`. Short promotion: not ongoing, has a last day, and its last usable moment is at most 24 hours away on Klaipėda's clock. The first run writes every existing deal quietly, so nobody is told about deals from before alerts began. At most 40 mails a run; each mail has a duplicate guard; the mail log is deleted after 90 days.
* Mails in the member's language, from deals@gemlyxtravel.com, reply to hello@gemlyxtravel.com, through Resend.

**Oliver's steps, in order:**
1. Supabase SQL editor: run `DEAL_ALERTS_15OCT.sql`, then its two check queries at the end.
2. Vercel (Production): add `CRON_SECRET` (a random string of 16 characters or more) and `RESEND_API_KEY` (a Resend key with sending access for gemlyxtravel.com).
3. After the deploy: Vercel's Cron Jobs page should list /api/deal-alerts every 10 minutes, and the first run answer 200.
4. Resend, Domains: open and click tracking off (the privacy page promises no tracking pixels). The free plan is 100 mails a day.
5. Test once: sign in on /lithuania, turn on email, publish a deal in Studio that ends in a few hours, check the mail, try its unsubscribe link.

**Privacy page, his decision:** the new "Deal alerts and deal emails" subsection is in section 3. Sections 8 and 12 still say "No marketing email", section 9 names Resend for account mail only, and the version and date at the top are unchanged.

## 7. Security: the fixes that were missed

Oliver asked whether fixes had been missed. They had: the fix brief in the "Gemlyx security log" doc listed 82 sections still open, and none of the 8 to 12 Oct reviews had been applied, including a Critical one (a stop name in a shared guide ran as code on the maps, with access to the Studio session) and a High one (OpenAI calls counted like Sonnet, about $400 a day per account possible).

**Applied in full:** 1, 2, 4, 6 to 17, 19, 22 to 25, 28 to 42, 44 to 56, 58 to 62 and 74 to 82. **Partly:** 3, 5, 27, 43 and 63. **Already in the code from 14 Oct:** 64 to 73. **Not done:** 18, 20, 21 and 57 wait for a decision; 26 (dependency upgrades) needs an npm install on a machine with the network. Stage A carries 1, 2 and 55; stage B the rest.

**Waiting for Oliver's decision:** 3 (approve trips before /trips lists them), 5 (the mail greeting and the name scrub), 18 (MFA), 20 (what sign up says about existing addresses), 21 (privacy page 2.5 and how long workshop requests are kept), 26 (dependency upgrades), 27 (weekly deletion of unconfirmed accounts), 28 (how long contact rows are kept), 36 (repo visibility), 57 (whether a stopped guide build gives the day back).

**SQL, before stage B goes live** (every part also works with today's code):
1. Measure first: the gemlyx_user_data size query in section 11 of `SECURITY_FIXES_15OCT.sql`. If a number is above a third of its ceiling, raise that ceiling first.
2. If `SECURITY_LOCKDOWN_30SEP.sql` has not been run whole since 7 Oct, run it whole.
3. Run `SECURITY_FIXES_15OCT.sql` top to bottom. It includes the partner SQL from 14 Oct (sections 64, 65, 73), so PARTNERS_14OCT.sql no longer needs its own run.

**Vercel and accounts:** set `GEMLYX_HASH_SALT` (32 random letters and digits); rotate the OpenAI, Gemini and Maps server keys and delete `VITE_OPENAI_KEY`, `VITE_GOOGLE_MAPS_KEY`, `VITE_GEMINI_KEY` and `GEMINI_API_KEY`; spend limits in the OpenAI and Anthropic consoles; Supabase minimum password length 8; GitHub email private.

**What changes for people when stage B is live:** a sign in or reset link works only in the browser that asked for it; a new password needs 8 characters and the account page asks for the current one; when Supabase is down, AI answers say they could not check the sign in instead of running uncounted; Studio says "Nothing was changed" where it used to say Saved on a refused write; the content security policy reports to /api/csp-report for a week before it is enforced.

The security log doc was not edited. The nightly review marks a row Fixed once it sees the change on GitHub.

## 8. Fable's design review

Full report: `DESIGN_REVIEW_15OCT.md` (in the repo with stage A). Verdict: current bones, held back by small things now fixed, and by two things only content can fix: partner photos and the film's own footage.

**Clear wins made:** drawn arrows and pause with a glass edge; the film's name rises in under a gold KLAIPĖDA eyebrow and fades out with its film; a faint shade at the film's top so it meets the header dark on dark; the turning background mark from 22% to 14%; category circles 80 px on a computer (64 on a phone) with a hover lift; deal tiles four across from 960 px with larger type; the page pill hidden from 1024 px (it covered the circles); the header lockup a step larger on a computer.

**Big calls for Oliver, ranked:** 1 a photo on every partner tile; 2 a dark map style for the tile maps; 3 text only navigation (mock: design_mock_header_goldring_textnav.png); 4 a gold ring on the small header mark; 5 a taller banner on a computer (Fable advises against); 6 prefetching the film on wide screens; 7 a heavier cut of the wordmark for small sizes; 8 a film for each kind of place, shot in Klaipėda. Fable's note about a loop fade is already done: the new film fades in and out over 0.4 s.

## 9. Still open from 14 Oct

* Photos for the nine example partners.
* Films for Restaurants, Attractions and Rentals.
* Undecided: "Book a table" web links and the tourism centre link send people out of the app (rule 4); he asked for the centre link on 14 Oct.
* A native read of the Lithuanian, Danish and German strings added this night.

## 10. 15 Oct evening

* **Stage A is on GitHub**, nine commits from `3164724` (the film) to the tests commit, each checked byte for byte against `stage-a2`. Ask Oliver for a hard refresh (Ctrl + F5) on /lithuania, since the film files kept their names. One commit message is off: `5e98b69` says the guide page change is about map names; it is the http(s) check on the "Where this comes from" link.
* **Stage B is now the branch `stage-b3`**: `stage-b2` merged onto GitHub main after stage A, keeping this evening's hand-off. Its tree is `stage-b2`'s apart from this file, so the suite count (24,062) still holds. Bundle: `Claude outputs/15OCT/gemlyx-stage-b3.bundle`, which needs GitHub main `79b7937` (`git fetch <bundle> stage-b3:stage-b3`). The push list is `git diff --name-status origin/main stage-b3`: 89 files, of which 73 changed, 13 deleted, 2 new and 1 renamed. Do not push from the old `gemlyx-stage-b.bundle` as it is: its copy of this file is older than GitHub's.
* **GitHub's upload page has new field names.** The commit message box is `#commit-summary-input` (name `message`, no longer `commit_summary`) and the description is `#commit-description-textarea`. The rest of the routine is unchanged. Commits now carry the Claude co-author lines in the description.
* **The nightly security review was changed** (his yes, 17:59): it reports which model each reviewer ran on and whether Fable held back; the breaker also hunts denial of service (no rate limit, no size limit, no timeout, things a bot can repeat for free) and the auditor's checklist has item (i) for the same; code that a Claude session wrote to apply fixes gets a full read by the breaker within 36 hours. He said not to rerun the missed Thursday review.
* **Open question from him (18:04):** should the night review get Chrome, to check the SQL? Advised no: his own rule keeps Supabase tabs off limits, the SQL editor runs as the database owner, and Chrome holds all his sign ins. Offered instead: a read only snapshot query (row level security, policies, grants, functions, storage buckets, no user data) that he runs after each SQL change; the result kept in the private security log for the Wednesday review. Waiting for his answer.
