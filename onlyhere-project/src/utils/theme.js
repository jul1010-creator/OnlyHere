// ── THREE THEMES, ONE MUTABLE PALETTE ────────────────────────────────
// Oliver, 7 Aug 2026, after seeing the warm proposal next to the current dark:
// "Keep both. Give people an option to either have Light, Dark, or that warm
// one. But let the warm one be default."
//
// WHY `C` IS STILL A PLAIN OBJECT THAT GETS MUTATED, rather than a context or a
// hook. Every colour in this app is read as `C.bg` at render time, in hundreds
// of places across a 700 KB component. A context would mean touching all of
// them; CSS variables would mean rewriting every inline style. Reassigning the
// properties of the object they already read, then re-rendering the root, gets
// the same result and changes no call sites at all.
//
// The tradeoff, written down so it does not surprise anyone: a component that
// memoises across a theme change would keep the old colours until it re-renders
// for another reason. The app is effectively one component, so this does not
// bite today. If parts are ever split out and memoised, that is the moment to
// move to CSS variables rather than patching around it.

export const THEMES = {
  // The default, and the one the landing painting actually walks you into.
  // Ink-brown rather than blue-black: lit by something rather than emitted by
  // something. See the theme comparison written on 7 Aug for the reasoning.
  warm: {
    name: "Warm",
    hint: "Lantern-lit. The one the front door opens into.",
    bg: "#12100B",
    surface: "#1C1912",
    border: "#2E2718",
    accent: "#A83545",   // oxblood: sits with the gold instead of shouting over it
    gold: "#E0AE4E",
    text: "#F4F0E4",
    muted: "#968C76",
    light: "#D8D0BD",
    scrim: "rgba(10,9,5,0.72)",
    onGold: "#12100B",
    grain: 0.055,
    scheme: "dark",
  },
  // What the app looked like before. Kept because he asked for it kept, and
  // because plenty of people genuinely prefer a cold dark.
  dark: {
    name: "Dark",
    hint: "The original deep navy.",
    bg: "#0A0F1E",
    surface: "#0F1628",
    border: "#212C44",
    accent: "#E23B4E",
    gold: "#D9A441",
    text: "#EDF0F7",
    muted: "#64708C",
    light: "#A6B0C6",
    scrim: "rgba(10,15,30,0.72)",
    onGold: "#0A0F1E",
    grain: 0,
    scheme: "dark",
  },
  // Daylight. Warm paper rather than white, so it belongs to the same family
  // as the other two instead of looking like a different product.
  light: {
    name: "Light",
    hint: "Paper. Easiest outdoors in bright sun.",
    bg: "#F6F2E8",
    surface: "#FFFDF7",
    border: "#E0D8C6",
    accent: "#A83545",
    gold: "#9A6F1C",     // the gold has to darken or it vanishes on paper
    text: "#241F16",
    muted: "#7A705C",
    light: "#4A4335",
    scrim: "rgba(20,17,10,0.55)",
    onGold: "#FFFDF7",
    grain: 0.03,
    scheme: "light",
  },
};

export const THEME_ORDER = ["warm", "dark", "light"];
export const DEFAULT_THEME = "warm";
const STORAGE_KEY = "gemlyx_theme";

// The live palette. Starts on the default so the very first paint is already
// right, then applyTheme swaps it if the person has chosen otherwise.
export const C = { ...THEMES[DEFAULT_THEME] };

export const storedTheme = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES[v] ? v : DEFAULT_THEME;
  } catch { return DEFAULT_THEME; }
};

export const applyTheme = (nameOrKey) => {
  const key = THEMES[nameOrKey] ? nameOrKey : DEFAULT_THEME;
  Object.assign(C, THEMES[key]);
  try { localStorage.setItem(STORAGE_KEY, key); } catch { /* private mode, the choice just will not persist */ }
  if (typeof document !== "undefined") {
    // The page background sits behind everything and is set in index.html, so
    // it has to move too or a light theme keeps a black band during scroll
    // bounce. Same for the browser chrome colour on mobile.
    document.body.style.background = C.bg;
    document.documentElement.style.colorScheme = C.scheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", C.bg);
  }
  return key;
};
