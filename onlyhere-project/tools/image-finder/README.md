# image-finder

Automatically fills in destination photos that are referenced in `src/data/*.js`
but missing from `public/` — searches Unsplash, Pexels and Pixabay, uses Gemini
to double-check the photo actually matches the place, and saves it straight to
the exact path the site already expects. No code changes needed; the broken
image just starts working.

Runs up to **20 new images per day** by default (configurable via `dailyCap`
in `config.json`), so it works through the backlog gradually instead of
hammering the free API rate limits.

**Automatic search is scoped to just Attractions and Towns.** After finding
real, confirmed mismatches in Events too (a lighthouse photo attached to a
folk festival, a plain building for a cultural festival, on top of the
earlier wrong-country town misses), Oliver asked to narrow this down rather
than keep chasing individual bad matches: events (both regular and major
festivals), food spots, and nightlife/bars are now all left out of the
automatic search entirely, only Attractions (`freeEntrance`) and Towns get
auto-filled. Stock photo sites are a poor fit for a specific named festival
or a specific bar/restaurant — either there's no real photo of that exact
place on a free stock site, or what comes back is a generic "crowd at a
festival" shot that could be anywhere, or (as happened more than once) a
photo that's simply the wrong place or the wrong country entirely. For
these, a genuinely specific photo (or one uploaded by hand through Studio's
photo panel) is worth more than a "technically Denmark, technically a
festival" stock photo, so they're flagged in the console output as "left
for manual photos on purpose" instead of being auto-filled.

Towns briefly went on that same manual-only list after a real, confirmed
miss: Gemini accepted a stock photo of a completely different town (Nysted)
as a match for Præstø, and separately a photo with a sign literally reading
"Stadtverwaltung Plön" (a real town hall, in Germany, not Denmark) got
accepted for Fåborg. Both slipped past the verification prompt's own "hunt
for non-Danish evidence" step. The problem wasn't fixable by asking the AI
to look harder — a specific named town is exactly the case where
"generically Denmark-consistent" isn't good enough, and no amount of prompt
tuning changes that a vision model without real-world grounding can
genuinely mistake one small Northern European harbor town for another.

**Towns now come from Wikipedia/Wikimedia Commons instead of
Unsplash/Pexels/Pixabay, never from stock sites.** Unsplash/Pexels/Pixabay
only match on keywords, so "Fåborg Denmark" can return literally anything
that mentions those words. For each town it tries, in order:

1. **The town's own Wikipedia article's lead image** (Danish Wikipedia
   first, English as a fallback) — this is a human editor's pick for the
   single photo that best represents the place, which is a much stronger
   "this is actually a good photo" signal than a raw geosearch, and is why
   this is tried first, not just for correctness but for quality.
2. **Wikimedia Commons geosearch**, using the town's real coordinates from
   `TOWN_COORDS` in `src/data/towns.js` — finds files a human actually
   geotagged AT that spot.
3. **Commons name search** as a last resort, if a town has no known
   coordinates or nothing's geotagged there — still scoped to Commons' own
   place-categorized files, weaker than the other two but still a
   fundamentally different (and safer) source than a generic stock site.

Either way, the correctness comes from the source itself being tied to the
real place, not from asking an AI to guess whether a photo "looks right"
after the fact — Gemini still gets a final look (a cheap extra check, not
the main safeguard anymore), and it's now also asked to reject photos that
are technically correct but boring or generic (dim interiors, plain
building facades, anything that "could be an average neighborhood
anywhere") — a real, confirmed miss from Oliver ("man, some boring ass
pictures") on top of the earlier wrong-place misses. Files over 4MB (old
archival scans, common on Commons) are skipped outright too, no image
library in this project to resize them, so an oversized candidate is just
rejected rather than downloaded and left bloating `public/`.

**On copyright:** a Wikipedia article's lead image isn't automatically
public domain, English Wikipedia in particular allows non-free/fair-use
images hosted locally (album covers, logos, a person's photo with no free
alternative) — a real thing Oliver flagged. This script never queries
Wikipedia's own file storage though, it only ever resolves a file through
Commons' own imageinfo API, so a locally-hosted non-free file just isn't
found there at all and gets skipped automatically. That's still treated as
an implicit protection, not a guarantee: every candidate, from Wikipedia's
lead image or Commons search alike, also has its license metadata checked
directly now, and anything with no license tag, or one that reads like
fair-use/non-free/all-rights-reserved/restricted, is rejected outright
before it ever reaches Gemini or gets downloaded. Commons photos need real
attribution regardless (logged in `image-credits.json`'s `license` field,
they're Creative Commons licensed, not just courtesy-credited like the
stock sites). No API key needed for either Wikipedia or Commons, both are
public, unauthenticated, read-only access.

Events, food and nightlife are all manual-only now (see above — that's
partly a "no good photo exists" problem for festivals/bars specifically,
and partly just Oliver choosing to narrow scope after real misses turned up
in Events too), so the Wikipedia/Commons and boring-photo-rejection
improvements above don't get a chance to help there the same way; Attractions
photos go through the regular Unsplash/Pexels/Pixabay + Gemini flow.

Configurable via `manualOnlyArrays` in `config.json` (currently
`["events", "majorEvents", "foodSpots", "nightlifeSpots"]`) if you want to
change the scope again. If you ever see a wrong-place photo from a category
still running (`freeEntrance` or a bad Commons pick
for a town), it's worth adding that array here rather than trusting the
verification to always catch it, the check is a real backstop, not a
guarantee.

## 1. One-time setup

You need Node.js installed (you already have it, since this project uses
Vite). No extra packages to install — the script only uses Node's built-ins.

### Get your free API keys (all free tiers, ~2 minutes each)

1. **Unsplash** — https://unsplash.com/developers → "New Application" →
   accept API guidelines → copy the **Access Key**.
   Free/demo apps get 50 requests/hour, which is plenty for 20 images/day
   (each image only spends one Unsplash search call, so a full run stays
   well under the hourly limit).
2. **Pexels** — https://www.pexels.com/api/ → sign up → copy your **API Key**.
   Free tier: 200 requests/hour, 20,000/month.
3. **Pixabay** — https://pixabay.com/api/docs/ → sign up → your API key is on
   your account page.
4. **Gemini** — https://aistudio.google.com/apikey → "Create API key". Image
   input on `gemini-2.5-flash` is free of charge on the free tier.

(Rate limits and terms can change — check each site's current docs if
something looks off. Unsplash and Pexels both ask that you credit the
photographer/site when you use a downloaded photo, not just hotlink it — this
script logs everything needed for that in `public/image-credits.json`, but
you're responsible for actually displaying credit somewhere on the site if
required by the license you agreed to when signing up.)

### Configure the script

```
cd tools/image-finder
copy config.example.json config.json    (Windows)
# or: cp config.example.json config.json
```

Open `config.json` and paste in your 4 keys.

`config.json` and `state.json` are already covered by the `.gitignore` update
I made — your keys will never get committed.

## 2. Try it

First, a safe dry run — no network calls, no downloads, just shows what it
would search for:

```
node fill-missing-images.mjs --dry-run
```

Then a real run once, to see it actually work:

```
node fill-missing-images.mjs
```

Check the console output and look in `public/` (and `public/image-credits.json`)
to confirm the new photos look right. Re-run it as many times as you like —
it remembers what it already filled and won't repeat itself or re-spend API
calls on the same image, and gives up on a specific image after 5 failed
attempts (logged as "permanently skipped") rather than retrying forever.

## 3. Make it run automatically every day (Windows Task Scheduler)

1. Open **Task Scheduler** (search for it in the Start menu).
2. **Action → Create Basic Task…**
3. Name: `OnlyHere image finder`. Next.
4. Trigger: **Daily**, pick a time (e.g. 8:00 AM). Next.
5. Action: **Start a program**. Next.
6. Program/script: `node`
   Add arguments: `fill-missing-images.mjs`
   Start in: the full path to `tools\image-finder`, e.g.
   `C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project\tools\image-finder`
7. Finish.
8. Optional but recommended: right-click the new task → Properties → General
   tab → check **"Run whether user is logged on or not"**, and on the
   Conditions tab uncheck "Start the task only if the computer is on AC
   power" if this is a laptop. Also on the Settings tab, check **"Run task as
   soon as possible after a scheduled start is missed"** so a day your laptop
   is off doesn't just get skipped forever.

That's it — from then on it checks in once a day, fills in up to 20 missing
photos, and leaves a log of what happened in that run's console output (Task
Scheduler keeps history under the task's "History" tab if you want to check
on it later without watching it run).

## How it decides a photo is "right"

For a town, it first checks the town's own Wikipedia article for its lead
image (a human editor's pick), then falls back to looking up the town's
real coordinates and asking Wikimedia Commons for photos genuinely
geotagged near that spot, then finally a plain Commons name search if
neither of those finds anything — the correctness comes from the source,
not a judgment call.

For everything else (regular festivals, attractions, food spots), it builds
a search query from the place/event's name + region (e.g. `"Dragør
Copenhagen Area Denmark"`), pulls the top 3 results from Unsplash first,
then Pexels, then Pixabay as a fallback. Either way, each candidate photo is
still sent to Gemini with the place's name/region/description and a strict
yes/no question as a final check — the first one Gemini confirms is
downloaded; if nothing convincingly matches, it's left for the next run (or
permanently skipped after 5 failed runs, so it won't loop forever on
something no source actually has a photo of — you'll see those in the
"permanently skipped" list and may need to add a photo yourself).

## Files

- `fill-missing-images.mjs` — the script
- `config.json` — your real API keys (gitignored, created by you from the example)
- `config.example.json` — template
- `state.json` — tracks daily count + per-image attempt history (gitignored, auto-created)
- `public/image-credits.json` — auto-generated log of photographer/source credit for every downloaded photo
