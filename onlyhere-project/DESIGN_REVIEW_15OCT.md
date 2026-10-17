# Gemlyx design review, 15 October 2026

Explore on /lithuania, set beside hivecph.dk, lidl.dk, GetYourGuide, Tiqets, Too Good To Go and Airbnb's 2025 app. Desktop and phone. Reviewer: Fable, at Oliver's request.

## Verdict

The page is already built on current bones (dark first, one serif for display and one grotesk for UI, full width media, round category filters, photo tiles); what held it back was a layer of small things on top of those bones, and two things only content can fix: partner photos and the film's own footage.

## What changed between 2010 and 2026, and what it means for Gemlyx

A short timeline, each line with a source.

| Year | What happened | Source |
|---|---|---|
| 2010 | Responsive web design: fluid grids, flexible images, media queries. Windows Phone 7 "Metro": flat colour, type led, grid. | [A List Apart, 25 May 2010](https://alistapart.com/article/responsive-web-design/), [Wikipedia, Flat design](https://en.wikipedia.org/wiki/Flat_design) |
| 2013 | iOS 7 goes flat, with translucent overlays. Flat design takes over from skeuomorphism (bevels, textures, fake leather). Nielsen warns flat buttons lose their affordance. | [Wikipedia, Flat design](https://en.wikipedia.org/wiki/Flat_design), [Speckyboy](https://speckyboy.com/origins-and-evolution-of-flat-design.md) |
| 2014 | Google Material Design (25 June): paper and ink, cards, elevation shadows, motion with meaning. Full screen video heroes spread (Airbnb, Apple Music, Land Rover). | [Wikipedia, Material Design](https://en.wikipedia.org/wiki/Material_Design), [Econsultancy](https://econsultancy.com/10-successful-homepages-that-show-the-trend-for-video-backgrounds/) |
| 2016 | Variable fonts (OpenType 1.8, Adobe, Apple, Microsoft). Windows 10 gets a dark mode. | [Wikipedia, Variable font](https://en.wikipedia.org/wiki/Variable_font), [Wikipedia, Light on dark](https://en.wikipedia.org/wiki/Light-on-dark_color_scheme) |
| 2017 | Fluent Design puts depth and translucency back. NN/g measures flat UIs as 22% slower to use. | [Wikipedia, Flat design](https://en.wikipedia.org/wiki/Flat_design) |
| 2018 to 2019 | System dark mode on macOS Mojave (2018), Android 10 and iOS 13 (2019); CSS prefers-color-scheme (2019). Neumorphism named (Jason Kelly, 2019). | [Wikipedia, Light on dark](https://en.wikipedia.org/wiki/Light-on-dark_color_scheme), [Wikipedia, Neumorphism](https://en.wikipedia.org/wiki/Neumorphism) |
| 2020 to 2021 | Glassmorphism named (Michal Malewicz, 2020): translucency, blur, a light hairline edge. macOS Big Sur. Neumorphism fades over contrast and accessibility. Material You (2021). | [Webflow](https://origin.webflow.com/blog/glassmorphism), [Wikipedia, Neumorphism](https://en.wikipedia.org/wiki/Neumorphism), [Wikipedia, Material Design](https://en.wikipedia.org/wiki/Material_Design) |
| 2022 to 2023 | Bento grids (Apple's keynote recap slides): mixed tile sizes, one radius, one gap, hierarchy by size. Oversized hero type. | [WebDesignerDepot, July 2023](https://webdesignerdepot.com/what-is-the-bento-ui-trend-and-how-can-you-get-started) |
| 2025 | Apple Liquid Glass (WWDC, 9 June 2025): refraction, rounded translucent controls. Material 3 Expressive (May 2025): more motion, more colour. | [TechRadar](https://www.techradar.com/tech/apple-reveals-major-visual-redesign-for-ios-26-macos-26-and-more-at-wwdc-2025), [Wikipedia, Material Design](https://en.wikipedia.org/wiki/Material_Design) |
| 2026 | What the trend guides say reads as current: fluid type with clamp(), oversized headlines, dark first palettes with semantic tokens, restrained glass on floating controls, micro interactions under 300ms, scroll linked motion, real photography over stock, lighter pages, contrast built into the colour tokens. What they call dated: heavy carousels, aggressive parallax, autoplay with sound, generic stock photos, heavy frosted glass everywhere, fixed breakpoint font sizes. | [Line25](https://line25.com/articles/web-design-trends-2026/), [TinyFrog](https://tinyfrog.com/web-design-trends) |

### The checklist I used

Dated (2010 to 2016 tells):
1. Controls typed as glyphs (‹ › ❚❚ ▶) rather than drawn, so they change with the phone's font.
2. Something floating over content for no reason (a pill, a badge, a watermark that fights the tiles).
3. Small elements under a big banner: 64px circles under a 430px hero.
4. Many narrow tiles across a wide screen, type that stays phone sized on a computer.
5. Icons beside every nav label, chevrons on every item.
6. Text that appears and vanishes with a cut, no entrance, no exit.
7. A different radius on every box.
8. Colour emoji as placeholders.
9. Stock footage that is soft at 100%.

Current (2024 to 2026 tells):
1. One display face and one UI face, sizes from clamp(), one big headline.
2. Full width media with the least possible UI over it; the title and an eyebrow, nothing else.
3. Drawn icons from one set, one stroke weight.
4. Glass (blur, a hairline light edge) used only on floating controls.
5. Micro interactions: a 2px lift, a 1.03 to 1.05 picture zoom, 200 to 600ms with easing, all stopping for reduced motion.
6. A plain ground under tiles; brand marks as hero or as watermark, not both at once.
7. Four tiles across a 1100px column, 16px names, 16px gap, one radius.
8. Real photographs of the real places.

## How Gemlyx compares with Hive and Lidl

### The film first

What Hive does that makes its film read as premium: the film is the first thing on the page and it fills the viewport, edge to edge, no corners, no border; there is no control and no caption over it, only the black bar with the wordmark above it; the header and the film are both dark, so they read as one block; the footage is the club itself, at 1080p and about 10 Mbit/s with grain (46.6 MB for 37 s). The premium feeling is mostly footage and height, not code.

What Lidl does on a category page: the film sits in a wide banner the height of the front page's carousel, with the category name large at the bottom left over a soft bottom fade and nothing else.

Gemlyx is built to Lidl's shape, which is the right call for a deals page (a Hive height hero would push the deals under the fold). Measured against both:

| Point | Before | After (built tonight) |
|---|---|---|
| Framing | Full width, no corners, 30vw tall on a computer (432px at 1440), near square on a phone. Right. | Unchanged. |
| Entrance | Film fades in over 450ms; the title snaps on. | Film fades over 600ms; the title rises 14px and fades in over 650ms under a gold "Klaipėda" eyebrow, the same eyebrow as the brand slide. Keyed per film so each one makes its own entrance. |
| Exit | The word "Nightlife" vanished the instant the film started fading. | The name stays and fades with its film. |
| Overlay | Bottom fade to 55% black from 45% down. The film met the dark header with a hard edge. | Same bottom fade (Oliver asked for it not to be heavier). A faint 30% shade in the top fifth so the film sits under the header the way Hive's does. |
| Title type | Fraunces 500, clamp(36px, 5.5vw, 76px), white, soft shadow. Right. | Unchanged. |
| Controls | Pause as a typed "❚❚" glyph, no edge. | Drawn SVG pause and play, a hairline light edge and blur (the same glass as the pager pill), a hover lift. |
| Loop | Hard cut from the last clip back to the first. | Unchanged, see the footage notes. |
| Poster | The first frame (the whisky pour on black). Good: dark to dark. | Unchanged. |
| Quality | H.264 CRF 20 at 1920x1080, 4.9 Mbit/s. At 1440 CSS px the film is downscaled and looks sharp. On a 2x screen it is upscaled 1.5x and the two soft clips show it. | Code cannot change this. See the footage notes. |
| Playback start | The film only downloads when Nightlife is tapped, so there is a short poster only wait on a slow connection. | Unchanged, a big call below. |

### Then the logo

Three drawings of one mark are on the page: the header lockup (flat gold points inside an off white ring, 22px), the banner mark (cut gold with hairline gold ring, 350px, turning once in two minutes) and the background mark (the same cut gold, turning once in 90 seconds, as a watermark).

| Point | Before | After |
|---|---|---|
| Header lockup size | 22px mark, 13.6px wordmark, beside a 34px search pill. It read as a favicon. Hive's wordmark is about 38px tall, Lidl's logo 84px. | Scaled 1.18 from 1024px up (26px mark, 16px wordmark). Phones unchanged. |
| Wordmark | Oliver's own letterforms, wide tracked, hairline strokes. The wide tracking is a current luxury cue (hotels, fashion). The hairline weight is faint at 13px. | Unchanged. The letterforms are his. See big calls. |
| Mark in the banner | Cut gold, ring and all, inside the banner. Reads premium. | Unchanged. |
| Background mark | 22% opacity with a glow. Its points ran between the circles and under the tile names; its glow lit the first row of tiles (design_before_circles_zoom.png). Hive and Lidl put tiles on a plain ground. | 14% with the glow at half. Still on every screen, no longer fighting the content (design_after_circles_zoom.png). One number to change. |
| Consistency | The small mark has a white ring; the two large ones have gold rings. | Unchanged in code. A mock of a gold ring on the header mark is in design_mock_header_goldring_textnav.png. Big call. |

### The rest

| Section | Before | After |
|---|---|---|
| Page pill (bottom centre) | Floated over the category names and over the last line of the deals on a computer (design_before_desktop_explore.png). | Hidden from 1024px up, where the top bar already underlines the page you are on. Phones and tablets keep it. |
| Category circles | 64px with 12.5px labels under a 432px banner: four small coins with 100px gaps. Lidl's are 128px. | 80px with 13.5px labels from 720px up, 64px on a phone. A 2px lift and brighten on hover. |
| Deal tiles | Six 171px tiles across a 1088px column, 4:5 pictures, 14.5px names. Lidl: four 290px square tiles with 16px names. | Four across from 960px, square there, 16px gap, 16px names, 13.5px offers. Phones keep two across at 4:5. The picture eases to 1.04 on hover inside its own box. |
| Banner arrows | Typed "‹" and "›", no edge, 16px from the edge. | Drawn chevrons, hairline edge, 28px from the edge on a wide screen. |
| Deal slide headline | The offer sentence at up to 58px, three lines filled the banner. | Up to 50px. |
| Radii | Tiles 16, note box 14, menu 12, cards 18, badges 7. | Note box 16 to match the tiles. The rest unchanged. |
| Spacing | 18px under the circles at every width. | clamp(18px, 2.4vw, 30px). |
| Type | Fraunces display, Inter UI, eyebrows in tracked caps, clamp() sizes. Current. | Unchanged. |
| Colour | Charcoal, champagne gold, warm off white, bronze for details. Dark first, contrast measured in theme.js. Current. | Unchanged. |
| Motion | Category fade 200ms, slides 600ms, dots 250ms, reduced motion respected. | Film 600ms, title 650ms, hovers 180 to 500ms, all stop for reduced motion. |

## The clear wins made tonight

Each with the file, what changed, why, and the shots.

1. **src/components/ExploreBanner.jsx**: drawn chevrons and a drawn pause and play; a hairline light edge and blur on the three round controls; hover lift; the film's name rises in under a gold "Klaipėda" eyebrow and stays while the film fades out; a deal slide's offer a size smaller. Why: typed glyphs render in whatever font the phone has, the title had no entrance or exit, and the eyebrow makes the two states of the banner one lockup. Shots: design_before_desktop_nightlife.png to design_after_desktop_nightlife.png, design_after_desktop_slide2.png.
2. **src/components/CategoryVideo.jsx**: the film box fades over 600ms and carries a faint 30% shade across its top fifth. Why: Hive's film and header read as one block because they meet dark on dark. Shot: design_after_desktop_nightlife.png.
3. **src/components/SpinningMark.jsx** (and its test): 0.22 to 0.14, glow halved. Why: it fought the circles and the tile names. Shots: design_before_circles_zoom.png to design_after_circles_zoom.png.
4. **src/components/CategoryFilter.jsx**: circle size and label size as CSS variables, 64/12.5 on a phone, 80/13.5 from 720px; hover lift. Why: the row looked small under the banner on a computer. Shots: design_before_desktop_explore.png to design_after_desktop_explore.png.
5. **src/components/DealCard.jsx** and **src/components/DealsNearYou.jsx** (and the grid test): four tiles across from 960px, square there, 16px gap, larger tile type, a picture zoom on hover, the note box at the tiles' radius, more air under the circles. Why: six narrow tiles with phone sized type on a 1440 screen; Lidl shows four. Shots: design_before_desktop_deals.png to design_after_desktop_deals.png.
6. **src/App.jsx**: the page pill hidden from 1024px up; the header lockup scaled 1.18 there. Why: the pill covered content and repeated the top bar; the lockup read as a favicon. Shots: design_before_header_zoom.png to design_after_header_zoom.png, design_before_desktop_explore.png to design_after_desktop_explore.png.

Phones: design_before_phone_explore.png, design_after_phone_explore.png, design_before_phone_nightlife.png, design_after_phone_nightlife.png, design_after_phone_slide2.png. The phone was already close to right; the changes there are the drawn controls, the eyebrow and the title entrance.

## Big calls for Oliver, ranked

1. **Partner photos on every tile.** The single largest gap to Lidl, GetYourGuide and Tiqets, all of which are photo led. A tile without a photo shows a map (light coloured, a jolt in a dark page) or an emoji. What it takes: one photo per partner, landscape or square, from the partner or taken on a walk through Klaipėda. No code: the Studio already uploads them.
2. **A dark map style for the tile maps.** While photos are missing, the light Google map thumbnails are the brightest thing on a charcoal page (gemlyx_live_desktop_nightlife_deals.jpg). What it takes: a dark variant of the Map ID style in Google Cloud and the id in utils/googleMapsLoader.js; no page code.
3. **Text only navigation at 14px, with the chevrons kept** (mock: design_mock_header_goldring_textnav.png). Hive and Lidl carry no icons beside their nav words; icons plus labels plus chevrons is a 2012 to 2016 app pattern. The nav is shared with Denmark and your father reads it, so it is your call. What it takes: NavGroups.jsx, an afternoon, and a look at the German labels.
4. **A gold ring on the small mark** (same mock). The large marks have gold rings, the header one has a white ring. One mark at every size reads as one brand. What it takes: ringColor on the header lockup in App.jsx, then every other lockup to follow.
5. **A taller banner on a computer** (for example clamp(340px, 38vw, 600px)). It would show 65% of the film's frame instead of 53% and give the brand slide more presence, at the cost of pushing the circles under the fold on a 720px tall laptop. Hive's hero fills the screen because it has nothing below it that matters; Gemlyx's deals do. I would not do it; it is listed because it is the one thing that would make the film read more like Hive's.
6. **Prefetch the wide film on wide pointer screens.** The film downloads only when Nightlife is tapped, so there is a poster only wait on the first tap. A link rel=prefetch after a few idle seconds would make the first tap instant, at about 6.7 MB per desktop visitor who never taps. For the demo: tap Nightlife once before showing, it is then cached.
7. **The wordmark weight.** The hairline letterforms are faint at 13 to 16px on dark. A second, slightly heavier cut for small sizes (the way type families have an optical size) would keep the drawing and read better. What it takes: the logo file and an hour with the paths.
8. **A category film for each kind of place**, so Restaurants, Attractions and Rentals get what Nightlife has. Content: three ten second films of Klaipėda itself.

## Honest notes: where footage and content limit the result more than code

- **The two soft stock clips** (the marina toast and the sip) are soft in the source. No encoder setting sharpens them. Swapping those two clips for sharp ones is the fix.
- **A 1080p film on a 2x screen** is upscaled 1.5x at 1440 CSS px. Hive has the same limit and gets away with it because its footage has grain and movement. A 4K export of sharp clips would remove it.
- **The loop** cuts from the dancer back to the whisky pour. A video element cannot cross fade with itself. A 0.4s fade to black at both ends of the montage, in the export, makes the loop seamless.
- **Stock footage reads as stock.** Hive's film is Hive. Ten seconds of Klaipėda's own bars would do more for "premium" than anything above.
- **Partner photos** are the biggest visual gap on the page and are not a code problem.
- **The Example badge** stays while example partners show. Right to keep; it reads as a label on the demo.
- Locally the page shows the "could not load" banner and the Denmark nav because there is no Supabase; both are absent on the live site.

## Checks

- tests/run.mjs: 23,732 passing and 0 failing at the start; 23,732 passing and 0 failing after (two pinned tests were updated with a comment saying why: the mark's opacity and the tile grid, plus the film title's exit).
- tests/tdz.mjs: exit 0.
- npm run build: passes.
- Branch design-review, six commits on top of d808d94: 5772ea1, 93c611e, 1dcca63, 818b8ad, 1af9d15, 6a2bac1.
