# GEMLYX HANDOFF #3 — for the next session
*(Written Aug 2026, end of the big redesign session. Read GEMLYX_HANDOFF_2.md for the older AI-pipeline context; this one covers the design era.)*

## What Gemlyx is
A Danish travel app ("It exists nowhere else") built by Oliver — real, personally verified hidden gems across Denmark: towns, events, food, nightlife, attractions, plus **Gemlyx Detour**, an AI trip planner (multi-stage pipeline: GPT plans → Tavily searches → Perplexity fact-checks → Claude writes). Vision: multiple countries eventually; Denmark is country #1. Oliver's #1 standing rule: **never state anything as true unless verified; when uncertain, omit.** Repo: `C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project`, deploys via git push → Vercel at only-here-three.vercel.app. Oliver pushes manually; the assistant writes files into the repo via the device bridge.

## Working conventions (Oliver's expectations — follow these)
- Every delivery gets a new `# LATEST:` entry in `CHANGES_THIS_PASS.md` (demote the previous to `# EARLIER:`). Honest style: root cause, what was/wasn't verified live, "please test before trusting."
- Verify every edited file compiles with esbuild before delivering (bundle with react/react-dom/react-router-dom/leaflet externalized).
- For visual work: build a static HTML replica, screenshot it with Playwright (sandbox Chromium at /opt/pw-browsers/chromium; playwright lives in ~/.npm-global), LOOK at the render, iterate, then port to the app. Never ship visuals unseen — this caught many real misses.
- Copy style: no em dashes in AI-generated app content (STUDIO_VOICE bans them), simple international English. Oliver flags "awkward Sonnet English" — rewrite clunky lines when found.

## The design system (established this session)
- Fonts: **Fraunces** (display serif) + **Inter** (UI), loaded via @import in App.jsx's global `<style>`.
- Palette in `src/utils/theme.js` (C object): bg #0A0F1E, surface #0F1628, border #212C44, accent red #E23B4E (buttons/actions), gold #D9A441 (editorial/"finds"), text #EDF0F7, light #A6B0C6, muted #64708C.
- **Logo** (Oliver's own design): 8-point compass gem in teal (#2DD4BF/#14B8A6/#0E9384) + custom GEMLYX letterforms. Components in `src/components/GemlyxLogo.jsx`: GemlyxMark, GemlyxWordmark, GemlyxLogo (lockup), GemlyxLoader. **Color rule: compass adapts to context** — teal on dark navy, gold variant (`tone="gold"`) in gold-dominant contexts (parchment guide-build screen, chat thinking). Loader = ONLY the compass turning (no arc, no label) — Oliver was explicit.
- **No emoji in UI chrome** — drawn icons in `src/components/Icon.jsx` (`<Ico name>`, ~30 stroke icons, + FlagDK, + EmojiIcon mapper for data-driven emoji). Typographic glyphs (◆ ✦ ◈ ✓ ♥ ★) are fine and kept.
- Cards: surface bg, 1px border, radius 14, media plate with serif-italic monogram fallback (never a floating emoji), whole card tappable, 3D tilt on hover via shared `tiltMove`/`tiltLeave` handlers in App.jsx.
- One chip style (Pill component): outline idle, solid light fill + dark text active.
- Content pages sit in maxWidth 1120 centered containers.

## The front door (entrance page)
Current state (just shipped): full-screen overlay before the Denmark app (`entered` state in App.jsx, shows every load).
- Background: **Oliver's painted castle-gate artwork** `public/front-page-2x.jpg` (2x upscale of `public/Front Page.jpg` — source is only 1024px; if Oliver exports ≥2048px art, swap it in for the real phone-sharpness fix).
- **Pannable** ("swim"): painting is 124vw/227vh, both-axis scroll (landingPanRef centers on the gate on mount), UI floats fixed above.
- Animation rule for the painting: **only light animates, never objects** — breathing zoom (26s), 5 lantern + 1 torch warm pulses and 3 blue-mushroom cool pulses pinned to % positions of the aspect-locked wrapper, arch sunset breathe, 12 golden dust motes (fixed to screen).
- UI: Gemlyx lockup top-left; Log in / Sign up top-right (show "accounts coming soon" note via landingNote state); center = country card(s): Denmark card with `public/denmark-hero.jpg` (Little Mermaid photo, objectPosition "68% 42%"), flag + LIVE badge, per-country tagline (**Denmark: "The home of H.C. Andersen"** — each country gets its own line), Enter button; bottom = Customer Support (mailto).
- Reserved: space under the card for "why this page exists" text Oliver will write later.

## Done this session (all committed + pushed by Oliver, live)
Fonts/palette swap app-wide · chip unification · Detour intake folded into calm card ("When are you coming?" + fine-tune toggle) · GuidePage calm-down (Before-you-go card, serif day headers, monogram stop cards) · Instagram embeds reframed as media cards · Explore/home rebuilt (hero → strips → "Why Gemlyx exists" story) · nav menu + strips + Detour de-emojied · favicon (gem SVG) · Events + Food pages rebuilt as card grids with date badges/price badges/tilt · loader = spinning compass (gold variant in gold contexts) · chat thinking = spinning compass · **top of Denmark page: hero now first, weather/location/live-events moved into one "Today in Denmark" block under it** (this last one shipped in the handoff pass — Oliver hasn't tested it yet).

## Still to do (agreed backlog, in rough priority)
1. **Nightlife page** — still old text rows; give it the Events/Food card treatment.
2. **Attractions page** — same.
3. **Essentials page** — colored-emoji quick-jump grid (🌤✈️🚇💳…) still there; convert to Ico icons; content cards too.
4. Remaining data-driven emoji in content (EmojiIcon mapper exists, partially applied).
5. "Why this page exists" text under the entrance country card (waiting on Oliver's words).
6. Higher-res entrance art from Oliver's generator (≥2048px) to fully fix phone blur.
7. Country card hover/tilt polish on entrance; maybe transition animation on Enter.
8. Older open items: image-finder tool re-run for town photos (tool fixed earlier this session — stricter Gemini verification after a Union Jack slipped through; 10/day cap), "map takes long to load" (never investigated), Studio login box emoji (🔒), deeper App.jsx splitting.

## Gotchas
- App.jsx is ~5300 lines; the entrance overlay, Pill, EventCard, tilt handlers, global CSS all live in it. `src/data/studioTypes.js` holds all Studio prompts/config.
- `public/Front Page.jpg` has a space in the name (referenced nowhere now; front-page-2x.jpg is used).
- Device-bridge commits: always fetch fresh mtimes with device_list_dir first; CHANGES_THIS_PASS.md often rejects on stale mtime — re-commit with the current one.
- The sandbox can't reach vercel.app directly; use Claude-in-Chrome (user's browser) for live-site checks, Playwright+file:// for local visual tests.
- Oliver tests on phone a lot. He interrupts with rapid follow-ups mid-task — fold them in.
