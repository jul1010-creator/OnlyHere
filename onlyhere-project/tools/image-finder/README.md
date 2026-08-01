# image-finder

Automatically fills in destination photos that are referenced in `src/data/*.js`
but missing from `public/` — searches Unsplash, Pexels and Pixabay, uses Gemini
to double-check the photo actually matches the place, and saves it straight to
the exact path the site already expects. No code changes needed; the broken
image just starts working.

Runs up to **10 new images per day** by default, so it works through the
backlog gradually instead of hammering the free API rate limits.

## 1. One-time setup

You need Node.js installed (you already have it, since this project uses
Vite). No extra packages to install — the script only uses Node's built-ins.

### Get your free API keys (all free tiers, ~2 minutes each)

1. **Unsplash** — https://unsplash.com/developers → "New Application" →
   accept API guidelines → copy the **Access Key**.
   Free/demo apps get 50 requests/hour, which is plenty for 10 images/day.
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

That's it — from then on it checks in once a day, fills in up to 10 missing
photos, and leaves a log of what happened in that run's console output (Task
Scheduler keeps history under the task's "History" tab if you want to check
on it later without watching it run).

## How it decides a photo is "right"

For each missing image, it builds a search query from the place/event's name
+ region (e.g. `"Dragør Copenhagen Area Denmark"`), pulls the top 3 results
from Unsplash first, then Pexels, then Pixabay as a fallback. Each candidate
photo is sent to Gemini with the place's name/region/description and a strict
yes/no question — the first one Gemini confirms is downloaded; if none of the
9 candidates convincingly match, it's left for the next run (or permanently
skipped after 5 failed runs, so it won't loop forever on something no stock
site actually has a photo of — you'll see those in the "permanently skipped"
list and may need to add a photo yourself).

## Files

- `fill-missing-images.mjs` — the script
- `config.json` — your real API keys (gitignored, created by you from the example)
- `config.example.json` — template
- `state.json` — tracks daily count + per-image attempt history (gitignored, auto-created)
- `public/image-credits.json` — auto-generated log of photographer/source credit for every downloaded photo
