# GEMLYX: FULL HAND-OFF, 14 OCT 2026 (evening)

Read all of this before doing anything. It replaces every earlier hand-off for the current state. The previous chat ran from 13 Oct to the evening of 14 Oct and pushed everything; the repo is clean and live.

**The first job in this chat:** Oliver has a large new CapCut export (a nightlife video, with sound he cannot switch off). Compress it for the Explore banner without visible quality loss and put it live. Section 4 has the exact recipe and the mistakes already made. Do not improvise new settings.

---

## 1. Who and what

* **Oliver Verhein Hoffmann**, master's student in Aalborg, building **Gemlyx** (formerly OnlyHere), a travel app. Live at **gemlyxtravel.com**. The Danish guide is the main site; **/lithuania** is the Klaipėda pilot (he used to work for Klaipėda's tourism centre).
* On /lithuania, **Explore is the deals page**: partner offers from Klaipėda businesses, Lidl+ style. The partners currently shown are **nine made-up example partners**, marked "Example", until real ones sign up.
* He is a perfectionist about looks and compares against **lidl.dk** and **hivecph.dk**.

## 2. Oliver's standing rules (apply to every reply and every word written into the app)

1. **No dashes of any kind** in replies or generated text: no em dash, no en dash, no hyphen used as a pause. Hyphens only inside compound words and number ranges. (Exception he gave: "3 of 7 - 4 still to go" style counts may use a hyphen.)
2. **Avoid "actually", "genuinely", "genuine", "simply", "truly".** Check copy for them before shipping.
3. **No explanatory text under form fields.** A label and a control is the whole field.
4. **Keep users inside his app** wherever possible: "think of it like Nightpay".
5. **Never touch the Supabase browser tab** (tab id 2079662009 in the last session; ids change, so check the URL: any supabase.com dashboard tab is off limits).
6. **Never print API keys** in chat.
7. **Do not spawn Fable** (a subagent persona) unless he asks for it by name in the moment.
8. Before correcting one of his facts, verify it is wrong.
9. Affiliate copy names the cost AND what it buys; never talk partners' goods down.
10. He wants direct, short answers; one sentence of outcome when done, not a recap.

## 3. Repo, tools and the push routine

* **Repo:** `jul1010-creator/OnlyHere` on GitHub, app in `onlyhere-project/`. Vite + React 18, deployed by **Vercel** on every push to main (commits containing `[skip ci]` do not build).
* The last chat's clone was at `/home/claude/repo`. A new container needs a fresh clone (`git clone https://github.com/jul1010-creator/OnlyHere.git`); reading over git works, **pushing does not** (no credentials). Pushing is done through the GitHub web upload in Oliver's Chrome via **Claude in Chrome**.
* Sizes: `src/App.jsx` about 2.6 MB (35,900 lines), `tests/run.mjs` about 5.9 MB (83,300 lines), 86 components, 26 serverless routes in `api/`.

**Push routine (works, follow it exactly):**

1. Copy the changed files to `/mnt/user-data/uploads/bNNN/<dir>/` (file_upload only accepts files under the session's upload/output folders).
2. In Chrome: `tabs_context_mcp` (createIfEmpty true), then **create your own new tab** with `tabs_create_mcp`. Tab ids change between calls and the group can vanish; re-read context when a tool says a tab is not in the group.
3. Navigate to `https://github.com/jul1010-creator/OnlyHere/upload/main/onlyhere-project/<dir>`. If `find` errors right after navigating, navigate again (the previous commit's redirect sometimes lands late).
4. `find` "file input type=file Choose your files", then `file_upload` with the paths. **Max 10 MB per file_upload call**; for bigger sets, call file_upload twice on the same input before committing.
5. `javascript_tool`: wait (5 s small files, 30 s for App.jsx, 40 s for run.mjs), check the file names appear in `document.body.innerText`, set `input[name="commit_summary"]` with the native setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set`), dispatch `input`, then `setTimeout(()=>btn.click(),50)` on the last button whose text contains "Commit changes". An HTTP 400 on a big file means upload again and wait longer.
6. Verify every commit locally: `git fetch -q origin && git show origin/main:onlyhere-project/<path> | cmp - onlyhere-project/<path>`. At the end: `git reset -q origin/main` and `git status --short` must be empty.
7. **Order: dependencies first** (utils/data, then components/pages, then App.jsx, then tests). Every commit ends in `[skip ci]` except the last one (normally tests/run.mjs). A Vercel failure on 13 Oct came from pushing a component before the util it imported.
8. Check the build from a GitHub tab: `fetch('https://api.github.com/repos/jul1010-creator/OnlyHere/commits/<sha>/status')`, expect `success`, "Deployment has completed".
9. Deleting a file: open `https://github.com/jul1010-creator/OnlyHere/delete/main/onlyhere-project/<path>`, click "Commit changes...", fill the dialog's input, click its "Commit changes".
10. Close your own tab when done.

**Checks before any push:**

```bash
cd onlyhere-project
timeout 560 node --max-old-space-size=3072 tests/run.mjs   # 23,731 passing, 0 failing at hand-off
node tests/tdz.mjs                                         # exit 0
npm run build
```

* Playwright: `import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs"`, executable `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Preview with `(npx vite preview --port 4173 &)`; stop with `kill $(lsof -t -i:4173)` (never pkill). Locally the page shows a "We could not load the latest content" banner because there is no Supabase access; that is expected. **Headless Chromium cannot play H.264**, so videos show their still image there.
* Test bundle gotchas: JSX at module level breaks the test bundle ("React is not defined"), so icon maps are functions. Theme colours live in a mutable `C` object (applyTheme), so style objects must be functions, not module-level constants.
* Tests mostly assert source text with regexes; when you change a line a test pins, update that test and say why in a comment.

## 4. THE VIDEO TASK (do this first)

**Where the film plays:** Explore on /lithuania opens with a full-width banner (lidl.dk style). Tapping a category circle (Nightlife) replaces the banner with that category's film, its name large at the bottom left, a pause button bottom right. Only Nightlife has a film.

**Files:** `onlyhere-project/public/video/nightlife-wide.mp4`, `nightlife-tall.mp4`, `nightlife-wide.jpg`, `nightlife-tall.jpg`. Keep the same names for a straight swap; no code change needed.

**Code:** `src/components/CategoryVideo.jsx` holds `CATEGORY_VIDEO = { nightlife: { wide: "/video/nightlife-wide", wideStill, tall: "/video/nightlife-tall", tallStill } }`; `.mp4` is appended in a single `<source type="video/mp4">`. Tall is chosen by `TALL_QUERY = "(orientation: portrait) and (max-width: 820px)"`. Muted, looping, inline, pauses out of sight, still image for reduced motion, data saving or a failed load.

**Mistakes already made (Oliver rejected the result twice: "it looks like 360 quality", then "Our quality is far inferior" next to Lidl and Hive):**

* **WebM (VP9) smoothed the grain away** and most browsers picked it. It is gone. **Serve H.264 MP4 only.**
* **Never encode from an already compressed copy.** Always from Oliver's original upload.
* **The phone cut must match the banner's shape, not 9:16.** The phone banner is almost square (about 390 × 437 CSS px). A 608 px wide 9:16 strip showed only 608 × 730 real pixels, stretched. Cut **960 × 1080 from the middle** of a 1920 × 1080 source.
* **Bitrate was too low** at about 2.3 Mbit/s. CRF 20 with `-tune film` passed (SSIM 0.993 against the source, grain intact).
* Some softness can be in Oliver's source clips. Compare a 100% crop of the original against the output before blaming the encode, and tell him plainly which it is.

**Recipe:**

```bash
F=/path/to/original.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of compact "$F"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
OUT=$(python3 -c "print(round($D-0.45,2))")
FADE="fade=t=in:st=0:d=0.4,fade=t=out:st=$OUT:d=0.4"

# If the export is 4K, put scale=1920:-2, in front of $FADE in both lines below.
ffmpeg -y -i "$F" -an -vf "$FADE,format=yuv420p" -c:v libx264 -preset slower -crf 20 -tune film -profile:v high -movflags +faststart nightlife-wide.mp4
ffmpeg -y -i "$F" -an -vf "crop=960:1080,$FADE,format=yuv420p" -c:v libx264 -preset slower -crf 20 -tune film -profile:v high -movflags +faststart nightlife-tall.mp4
ffmpeg -y -ss 0.8 -i "$F" -frames:v 1 -q:v 3 nightlife-wide.jpg
ffmpeg -y -ss 0.8 -i "$F" -frames:v 1 -vf crop=960:1080 -q:v 3 nightlife-tall.jpg

# Quality check against the source
ffmpeg -i nightlife-wide.mp4 -i "$F" -lavfi "[1:v]$FADE,format=yuv420p[r];[0:v][r]ssim" -f null - 2>&1 | grep -o "All:[0-9.]*"
# Contact sheet to see the scenes, and a tall sheet to check nobody is cut out
ffmpeg -y -i nightlife-tall.mp4 -vf "fps=1,scale=-1:320,tile=10x1" -frames:v 1 tallsheet.jpg
```

* `-an` strips his sound track. For a 4K source, scale to 1920 wide first; for the tall cut, scale to 1080 high then `crop=960:1080`. If the subjects sit off centre, shift the crop (`crop=960:1080:X:0`) after looking at the contact sheet.
* Last accepted sizes: wide 6.6 MB, tall 4.4 MB. The test (tests/run.mjs, block "The nightlife film") requires each of the four files to be **under 7 MB** and no WebM `<source>`. Raise the limit only if needed and tell Oliver the size.
* Push the four files to `public/video` (two file_upload calls if they are over 10 MB together). The last commit of the batch must not contain `[skip ci]`, so Vercel builds: if only the video files change, give that commit no `[skip ci]`; if a test changed too, push tests/run.mjs last without it. Tell him to hard refresh (Ctrl + F5) because the file names are unchanged.

## 5. What was built 13 and 14 Oct (all live)

**Deals on Explore (/lithuania):**

* `src/components/DealsNearYou.jsx`: the deals page. Tiles two per row on phones (DealTile), live deals then **Upcoming** (offers outside their hours/days are hidden and shown as upcoming, Lidl+ "Friday candy" style). Sort Closest / A to Z. Opening a tile shows **DealDetail** (portal sheet, Redeem, Show directions, Book). **RedeemSheet** is the gold screen shown at the counter (counted as `st:x`). **WalkMode** walks to the deal (portaled to body). Phone Back closes Redeem, then the detail, then the category (history `gxSheet` 1/2 and `gxCat`).
* With prop `banner`, it renders **ExploreBanner** full width on top, then a 1120 px column with the circles (max 640 wide) and the deals.
* `src/components/ExploreBanner.jsx`: slides (Gemlyx's own "Deals near you / Only on Gemlyx." with the turning gold mark, then up to 3 live deals with "See the deal"), auto advance every 7 s, arrows on hover devices, swipe on phones (`data-own-swipe` so App's pager ignores it), dots below, pause button. Height `clamp(300px, 30vw, 520px)`, phones `min(112vw, 470px)`. Category film replaces the slides.
* `src/components/CategoryFilter.jsx`: the four round circles, **Restaurants, Nightlife, Attractions, Rentals**: dark with a fine gold edge and gold line icons; the chosen one gold with a dark icon. One at a time (navigation, not tick boxes); tapping the shown one again shows all. Changes fade.
* `src/utils/dealCategories.js`: categories, `dealCategory()` (Studio's `__category`, then words, then row type), colours kept for map pins.
* `src/components/SpinningMark.jsx`: the Gemlyx mark turning slowly behind Explore at opacity 0.22, drawn by **GemlyxMarkFine** (`GemlyxLogo.jsx`): the same icon as cut gold (gradient faces, hairline edges, fine ring). Oliver called the earlier flat version "cartoonish".
* `src/components/DealStudio.jsx` + `src/utils/dealStudio.js`: Studio editor for deals at **/lithuania#studio** (Oliver logged in): place, category, photo upload, Google find, map tap, offer text, days, hours, "No last day" (ongoing) or a date, booking, pin colour, show/hide, preview, partner link. **Translations:** three boxes (Lietuvių, Dansk, Deutsch) and a Translate button; empty boxes are filled by Claude on save; `trFor` records which English text they belong to.
* `src/utils/offer.js`: `cleanOffer` (supports `ongoing`, `tr`), `offerLive(offer, today, zone)` reads the place's calendar, `offerTextIn(offer, lang)` returns the translation only while `tr.src` equals the text.
* Example partners: `src/data/klaipedaExampleRows.js` (nine partners with lt/da/de offer text, `exampleOffer()`), `src/data/klaipedaExamples.js`.

**Languages:** the load banner, Essentials/Tips headings, FAQ, "Still need help?", weather box (meteo.lt for Lithuania), banner words, all in en/da/de/lt via `uiT` keys in `src/utils/uiLanguage.js`. Lithuanian badge dates read "Iki gruodžio 31 d.".

**Theme:** dark charcoal `#0E0E11` with gold `#C9A46A` (`src/utils/theme.js`); Oliver: "move away from the 2012 to 16 look".

**Security patch of 13 Oct** applied (partner stats via a narrow RPC, founder gates, safeFetch limits, global logout, and more). **Fable's review** of the deals work: all 8 findings fixed.

## 6. Open items

1. **Oliver must run `PARTNERS_14OCT.sql`** in the Supabase SQL editor (in the repo root of onlyhere-project). Until then partner links say "Not available just now" and visits are not counted. Remind him; never run it yourself.
2. **Photos for the nine example partners** (Kepyklėlė Rūta, Rūkykla Marios, Gintaro dirbtuvė Lašas, Arbatinė Debesis, Alaus baras Inkaras, Atvirukų krautuvėlė, Rūsys, Dviračių nuoma Vėjas, Bagažinė). He may send stock photos; landscape, about 1600 px, no readable brand names. They become each partner's `photo` and then show on tiles, deal sheets and banner slides.
3. **Films for the other three categories** when he has footage (add entries to `CATEGORY_VIDEO`; same recipe). He hopes to get the tourism centre's Canva footage later.
4. **Undecided:** "Book a table" web links and the tourism centre link both send people out of the app (conflicts with rule 4).
5. Offered, not started: a screen recording of the real redeem flow as a "How it works" banner slide, once places have photos.
6. A native speaker should read the Lithuanian.

## 7. How to talk to him

Short, warm, direct. Report what changed in a sentence or two, not a list of every step. Ask at most one question, and only when the answer changes what you build. When something is his footage or his facts that limit the result, say so plainly.
