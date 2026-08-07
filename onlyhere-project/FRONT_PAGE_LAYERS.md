# Front page: what to render, so it can be 3D

Written 7 Aug 2026, after Oliver asked for the landing page to be "more 3D and lively with better quality" and to "breathe a bit".

## Why the current one cannot be fixed by code

`public/front-page-2x.jpg` is 2048 x 1118. It is a 2x upscale of `Front Page.jpg`, which is 203 KB. Upscaling cannot invent detail, so the softness is in the source and no amount of sharpening, filtering or CSS reaches it.

It is also **one flat image**. The pan already in the app moves the whole world as a single plane, which is why it reads as a picture rather than a place. Depth is not a filter, it is geometry: separate things at separate distances, moving at different rates.

Two fixable-in-code things I will handle regardless, and they need nothing from you:

- `objectFit: "fill"` (App.jsx, the `.gxa-kb` img) stretches the painting to the viewport instead of preserving its shape. On any screen whose proportions differ from 2048 x 1118 it is literally distorted. One word.
- Several photos elsewhere are shipped raw at 6 to 8 MB. Your own code comments blame the intro's dropped frames on exactly this. Converting them makes the app faster and the compass settle land more smoothly.

## What I need from you

Same scene, same mood. It already looks right, this is about depth and resolution, not a redesign.

**Canvas:** 3840 x 2160, rendered natively at that size. Not upscaled from smaller.

**Overscan:** paint about 12% more scene than you want visible on every side. Parallax slides layers against each other, and whatever sits at the edge gets pulled into view. Without the margin the edges go transparent when the layers move.

**Format:** PNG with real alpha. Every layer on the same canvas at the same size, aligned pixel for pixel, so they stack with no offset.

**No baked-in shading:** leave out the vignette, the dark bands top and bottom, and the strongest lantern bloom. Those are already in CSS and they have to sit above the layers, or they will move with the wrong one.

### The five layers

| File | What is in it | How it moves |
|---|---|---|
| `fp-l0-sky.png` | The warm sky, the light behind the ruins, the distant canopy. Opaque, this is the backdrop. | Almost still |
| `fp-l1-far.png` | Everything seen through the arch: the far path, the distant tower and ruins, the deer. | Slight |
| `fp-l2-arch.png` | The stone archway, both gatehouse walls, the towers, the lanterns, the left-hand stairs. | Medium |
| `fp-l3-near.png` | The ground and everything sitting on it: flowerbeds, mushrooms, the cart, the books, the lute, the rock ledges. | More |
| `fp-l4-frame.png` | The two big trees at the left and right edges, and the canopy across the top. | Most |

`fp-l4-frame.png` is the one that sells it. It is closest to the camera, so it swings furthest, and it is what makes the arch feel like something you could walk through.

### If clean transparency is hard to get out of your tool

A three-file version still gives most of the effect:

1. `fp-back.png` — the full scene with the two framing trees and the top canopy removed, and the space where they were painted in.
2. `fp-frame.png` — only those trees and the canopy, everything else transparent.
3. `fp-glow.png` — optional: just the lantern and mushroom light on transparent, so the glow can pulse on its own.

Send whichever you get. I will build against five and degrade to three.

## What I do with them

- Pointer and device tilt drive the layers at different rates, with the ground as the pivot, so it looks like leaning into the scene rather than sliding a picture.
- A slow idle drift so it lives when nobody touches it, the "breathe" you asked for: the frame trees sway a little, the canopy light shifts, the depth eases in and out on a long cycle. Deliberately slow enough not to be noticed as animation.
- God rays through the arch, pinned to `fp-l1-far` so they sit behind the stonework and in front of the distance.
- The existing dust motes get parallax too, so they pass between layers instead of floating on the glass.
- AVIF and WebP with a JPG fallback, sized per device, so a phone never downloads the 4K plates.
- The whole thing switches off under `prefers-reduced-motion`, which the intro already respects.

## The intro settle

Separate from the art, needs nothing from you. The compass currently flies to the corner and the splash unmounts in a single frame, which is why it stops rather than arrives. Planned: a short overshoot and ease-back as it lands, and a light sweep across the GEMLYX wordmark on touchdown, which is the flash you asked for.
