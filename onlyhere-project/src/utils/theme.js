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
    // See FIELDS below. 3.62:1 against surface, 3.92:1 against bg.
    fieldBorder: "#7E7053",
    fieldRing: "#E0AE4E",
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
    // 3.32:1 against surface, 3.52:1 against bg.
    fieldBorder: "#5A6A8C",
    fieldRing: "#D9A441",
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
    // 3.75:1 against surface, 3.41:1 against bg.
    fieldBorder: "#8C8269",
    fieldRing: "#9A6F1C",
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

// ── WHICH BOXES YOU CAN TYPE INTO ────────────────────────────────────
//
// Oliver, 21 Aug 2026, relaying his father, who is in his seventies: "the
// colors being so similar is making it more difficult to read.. but he wants to
// be able to know 'what he can write into' and 'what he can't write into'."
//
// That is not a readability complaint about the text. It is about the BOX. Every
// field in this app drew itself with `1px solid C.border`, and so did every
// decorative card, every panel and every divider, so nothing on the page said
// which rectangles accept typing.
//
// MEASURED, because "looks a bit low" is not a specification. WCAG 2.1 asks for
// 3:1 between a user interface component's boundary and the colour behind it.
// The border against the panel it sits on was:
//
//     warm   1.19:1        dark   1.29:1        light   1.39:1
//
// So it is not that the cue was subtle. At 1.19:1 there is, for practical
// purposes, no cue at all, and contrast sensitivity falls with age, which is why
// a man in his seventies hit it first and the rest of us did not.
//
// ── WHY THE FIX IS ALL IN THE BORDER ─────────────────────────────────
//
// The obvious second cue is to sink the field: make its background darker than
// the panel, the way a paper form has a shaded box. That was tried and the
// arithmetic killed it. Against the warm panel at #1C1912, PURE BLACK reaches
// only 1.20:1. There is no room left underneath a dark theme, so on two of the
// three themes a recessed field cannot be seen no matter what colour it is.
//
// So the border carries the whole signal, and it is spent on three things at
// once rather than only colour, because for low contrast sensitivity thickness
// reads as well as contrast does:
//
//   1. Colour, at better than 3:1 against BOTH surface and bg, since fields sit
//      on both. Roughly three times the old figure.
//   2. Width, 2px rather than 1px. NOT 1.5px, which was the first try:
//      measured in a real browser at device pixel ratio 1, Chrome floors a
//      1.5px border to 1px, so on an ordinary desktop monitor the thickness
//      half of this fix silently did nothing at all.
//   3. A focus ring in the theme's gold, so the field you are IN is also
//      unmistakable and not merely the field you can see. It carries its own
//      !important, which the first version did not: almost every field in
//      this app sets `outline: "none"` inline, so the ring computed to
//      nothing and only the border changed colour. Caught by looking at what
//      the browser actually computed rather than at what the rule said.
//
// And the border of a field is now brighter than the border of anything you
// cannot type into, which is the actual answer to what he asked: the difference
// between the two borders is the message.
//
// ── WHY IT IS A STYLESHEET AND NOT 69 EDITS ──────────────────────────
//
// There are 69 input, textarea and select elements across App.jsx and the
// components, every one carrying its own inline style. Editing them all is 69
// chances to miss one, and the seventieth field written next week would be born
// wrong. One rule keyed on the element type cannot miss any of them, and a
// field added later is correct without anybody remembering this.
//
// `!important` is here for the one reason it is ever defensible: inline styles
// win against everything else, and these ARE inline styles.
//
// ── AND THE WAY BACK IN, FOR A FIELD THAT IS NOT AN <input> ──────────
//
// `.gx-field` is the opt-IN, and it exists because the very first control on the
// screen his father was looking at is one. The arrival and departure pickers are
// <button> elements that open a calendar: they sit in a form, they are labelled
// ARRIVAL and DEPARTURE, they say "Select date & time", and to anybody looking at
// the page they are boxes you fill in. A selector on the element type cannot see
// that, and repainting every <button> in the app to catch them would repaint the
// real buttons too.
//
// So the rule stays keyed on what things ARE, and anything that is a field
// without being an input says so. One class, applied where it is true.
//
// `.gx-plain` is the way out for a field that has already earned its own
// border. Today that is the chat composer, which draws itself in the accent
// oxblood at 1.5px. It is the single field on the home screen anybody could
// already identify as typeable, which is what made it the model for this rule
// rather than a casualty of it.
const FIELD_STYLE_ID = "gx-field-affordance";
const FIELD_CSS = `
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]):not(.gx-plain),
  textarea:not(.gx-plain),
  select:not(.gx-plain),
  .gx-field {
    border: 2px solid var(--gx-field-border) !important;
  }
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]):not(.gx-plain):focus,
  textarea:not(.gx-plain):focus,
  select:not(.gx-plain):focus,
  .gx-field:focus {
    border-color: var(--gx-field-ring) !important;
    outline: 2px solid var(--gx-field-ring) !important;
    outline-offset: 1px;
  }
`;

// Written as CSS variables rather than by rewriting the rule text, so a theme
// change repaints every field without the stylesheet being touched.
export const applyFieldVars = (palette) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--gx-field-border", palette.fieldBorder);
  root.style.setProperty("--gx-field-ring", palette.fieldRing);
  if (!document.getElementById(FIELD_STYLE_ID)) {
    const tag = document.createElement("style");
    tag.id = FIELD_STYLE_ID;
    tag.textContent = FIELD_CSS;
    document.head.appendChild(tag);
  }
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
    applyFieldVars(C);
  }
  return key;
};
