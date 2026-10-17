# GEMLYX: HAND-OFF, 17 OCT 2026 (early morning)

PRIVATE. Keep on Oliver's computer (Claude outputs/17OCT/). Never commit a hand-off to the repo: the repo is public and the suite refuses notes that name open security work, keys, bundles or private judgements.

Read with HANDOFF_16OCT_EVENING_private.md (in Claude outputs/16OCT/), which still holds the standing rules, the repo and push routine, and the waiting list. This note says what changed since.

## What went live on 16 and 17 Oct (all on GitHub main, Build Check green)

* Deal tiles: a small dark map in the corner of photo tiles; a distance pill in metres; tapping the corner map opens the deal on its map; a place across the strait says "By ferry" and counts the ferry in its minutes.
* Distances, Closest and Show directions use the visitor's position, else the Tourist Information Centre (Turgaus g. 7), with a line saying so. Never the ship.
* Show directions keeps the deal open while the phone is found.
* New menu: gold burger that turns into an X, frosted drawer from the right, circles for themes and languages, serif rows. On /lithuania no saved trips and no page list (MENU_PAGES_SHOWN).
* About page at /about, linked from a footer at the foot of /lithuania (About Gemlyx, Terms, Privacy, all one colour).
* Deal rules in red: No alcoholic drink promotions, No 18+ promotions, soft and alcohol free drinks are fine, breaking a rule means immediate suspension. Studio refuses such a deal. Terms 2.4, clauses 14.6 to 14.8. The beer example is now Baras Inkaras, a games bar: free darts and board games with any order.
* QR at the counter: each deal gets a code on its first Studio save (payload.__scan); Studio has a Sticker button (/sticker/<code>); a scan opens /s/<code>, which shows the offer as Redeemed with the time and a moving mark, counted once per phone per day as "scanned" on the partner page. Demo stickers: /sticker/demobakery, demopost, demoamber, demobike, demojazz, demotea, demofish, demobags, demobeer (add ?n=<name> for the name line).
* How it works strip: 1 Pick a venue, 2 Scan the QR code at the counter, 3 Show the screen to staff.
* AI guides out of sight (src/utils/features.js, AI_GUIDES_SHOWN = false): sign-in sheet talks about deals; account page leaves out Saved trips, About me and Plan; support topic no longer mentions guides.
* Security review of 17 Oct, code side: the two hand-off notes on GitHub replaced by stubs (full copies in Claude outputs/16OCT/), bundles and Claude outputs ignored, refused map picture shows the sign instead of a live map, cron secret at least 16 characters and one 401 for refusals, currency lookup timeout and cache, privacy 2.5 names Google Maps and Unsplash, sitemap and card reads capped with a miss cache.

## The push routine changed

The Build Check failure mails came from pushing code before its tests. Now: tests first with [skip ci], then the other files with [skip ci], and the file whose commit should build LAST, without [skip ci]. Check the run is green on the Actions page.

## Waiting on Oliver

1. Rotate the OpenAI, Gemini and Maps keys; make the repo private, or turn on GitHub secret scanning with push protection. Old files already committed (Claude outputs at the repo root, including a September security SQL) stay public until the repo is private.
2. Daily quotas on the browser Maps key for both Maps JavaScript and Static Maps, and a billing alert.
3. Stage B of the security work still waits for the SQL. The stage-b5 bundle predates today; merge main into it first.
4. The CSP item from the review (left alone, it could break the maps unattended).
5. Earlier list unchanged: tourism centre's yes for the cooperation line, deal alerts setup, native read of lt/da/de strings, Sea Museum etc. on the shortlist.
