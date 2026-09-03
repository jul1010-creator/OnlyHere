// ── "THE PINK/PURPLE WRITING IS SO UNCOMFORTABLE FOR THE EYES" ──────
//
// Oliver, 3 Sep 2026, on the crowd line of the Jomfru Ane Gade entry: "it's
// fine to have a different color.. but find a better."
//
// ── WHERE THAT COLOUR CAME FROM, WHICH IS THE ACTUAL BUG ────────────
//
// Every published row carries a `color`, and the drafting model picks it.
// studioContent.js only supplies a default when the model leaves it blank
// (`t.color || "#5D4037"`), so what ships is an unconstrained hex chosen for
// vibe, by something that has never seen the page it lands on.
//
// Then the card renders it as TEXT — 11px, bold, on a dark ground — at whatever
// darkness the model happened to like. A deep magenta is a fine badge colour
// and a terrible ink. Nobody measured, because there was nothing in the render
// path that could.
//
// ── AND THE HOUSE RULE ALREADY EXISTED ONE FILE OVER ────────────────
//
// theme.js has carried it since 22 August, in numbers rather than adjectives:
// "#9A6F1C measured 4.03:1 against bg and 4.43:1 against surface, so the gold
// failed AA on paper in both places it is used… #8A6216 is 4.89 and 5.38." The
// palette's own text colours are measured against the ground and moved until
// they clear 4.5:1. The row colours were the one family of text colours in this
// app that never went through that, and they are the ones a model writes.
//
// So the same test is applied to them, at render, which fixes every published
// row at once rather than needing a redraft each. Same argument as
// stripDashesDeep and the research-voice strip: "suppressing it at RENDER so
// all 71 published entries were fixed at once."
//
// ── WHAT IT DOES NOT DO ─────────────────────────────────────────────
//
// It does not replace the colour. "It's fine to have a different color" — a hue
// that already clears the line comes back untouched, so the gold stays gold and
// the green stays green. Only a colour that cannot be read gets moved, and it
// is moved along its OWN hue, so a pink entry stays pink.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// #abc and #aabbcc, with or without the hash. Anything else is not a colour
// this can reason about, and the caller gets it back untouched rather than
// getting black.
export const parseHex = (v) => {
  const s = String(v == null ? "" : v).trim().replace(/^#/, "");
  const full = s.length === 3 ? s.split("").map(c => c + c).join("") : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
};

const hex2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
export const toHex = ({ r, g, b }) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

// WCAG 2.x relative luminance: sRGB channels linearised, then weighted.
const linear = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
export const luminance = (rgb) => (rgb ? 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b) : 0);

export const contrastRatio = (a, b) => {
  const A = typeof a === "string" ? parseHex(a) : a;
  const B = typeof b === "string" ? parseHex(b) : b;
  if (!A || !B) return 1;
  const l1 = luminance(A), l2 = luminance(B);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

// ── THE GROUND IS NOT THE SURFACE ───────────────────────────────────
// The pill sets `background: ${color}18` — the row's own colour at 9.4% over
// the card. Measuring the text against the card alone would score a colour
// against something that is not behind it, which is the same class of error as
// measuring a walk from a geocoded centroid. So the wash is composited first.
export const overlay = (fg, bg, alpha) => {
  const F = typeof fg === "string" ? parseHex(fg) : fg;
  const B = typeof bg === "string" ? parseHex(bg) : bg;
  if (!F || !B) return B || F || null;
  const a = clamp(Number(alpha) || 0, 0, 1);
  return { r: F.r * a + B.r * (1 - a), g: F.g * a + B.g * (1 - a), b: F.b * a + B.b * (1 - a) };
};

const toHsl = ({ r, g, b }) => {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0))
          : max === G ? (B - R) / d + 2
          : (R - G) / d + 4;
  return { h: h / 6, s, l };
};

const hue2rgb = (p, q, t) => {
  let x = t; if (x < 0) x += 1; if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
};
const fromHsl = ({ h, s, l }) => {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue2rgb(p, q, h + 1 / 3) * 255, g: hue2rgb(p, q, h) * 255, b: hue2rgb(p, q, h - 1 / 3) * 255 };
};

// AA for body-size text, and this text is 11px. theme.js measures its own
// colours against the same line and calls anything under it a failure.
export const READABLE_MIN = 4.5;

// ── AND SATURATION IS THE OTHER HALF OF "UNCOMFORTABLE" ─────────────
// Contrast is not the whole complaint. A fully saturated magenta at 11px bold
// on near-black shimmers at the edges — the two channels focus at different
// depths — and that reads as eye strain even at a passing ratio. Capped only on
// the colours being moved anyway; a colour that already reads is left alone.
export const MAX_INK_SATURATION = 0.62;

// The wash the pills paint behind this text: the hex suffix "18" is 24/255.
export const PILL_ALPHA = 24 / 255;

// Returns a colour of the SAME HUE that clears READABLE_MIN against what is
// actually behind it, or the original when it already does. Never returns null:
// a colour it cannot parse is handed back untouched, because guessing is worse
// than leaving a designer's literal alone.
export const readableOn = (color, background, { min = READABLE_MIN, alpha = PILL_ALPHA } = {}) => {
  const rgb = parseHex(color);
  const bg = parseHex(background);
  if (!rgb || !bg) return color;
  // Composited once, from the ORIGINAL colour, because that is the wash the
  // card paints. Recomputing it as the ink moves would chase its own tail.
  const ground = overlay(rgb, bg, alpha);
  if (contrastRatio(rgb, ground) >= min) return color;
  const groundIsDark = luminance(ground) < 0.5;
  const hsl = toHsl(rgb);
  const s = Math.min(hsl.s, MAX_INK_SATURATION);
  // Toward white on a dark ground, toward black on a light one. Derived from
  // the ground rather than assumed, or the light theme breaks the moment
  // somebody switches to it — which is exactly how a fix like this ships half
  // done and nobody notices for a month.
  const step = groundIsDark ? 0.02 : -0.02;
  let l = hsl.l;
  for (let i = 0; i < 50; i++) {
    l = clamp(l + step, 0, 1);
    // ── MEASURED AFTER ROUNDING, NOT BEFORE ─────────────────────
    // fromHsl returns floats and toHex rounds them to 8 bits, and the rounding
    // can cost a hundredth of a ratio. Scoring the float and returning the hex
    // shipped #999933 on paper at 4.49:1 — a colour this function had just
    // certified as passing. Measure the thing that is actually returned.
    const candidate = toHex(fromHsl({ h: hsl.h, s, l }));
    if (contrastRatio(candidate, ground) >= min) return candidate;
    if (l <= 0 || l >= 1) break;
  }
  // Ran out of hue. Plain legible text beats a colour nobody can read.
  return groundIsDark ? "#FFFFFF" : "#000000";
};
