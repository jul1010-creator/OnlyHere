// ─── DRAWN ICON SET ──────────────────────────────────────────────
// Redesign pass: replaces colored emoji in UI chrome (nav, headings, tabs,
// buttons) with consistent, drawn, monochrome icons. Emoji render differently
// on every OS and read as placeholder; these inherit currentColor and always
// match the design. Typographic glyphs (◆ ✦ ◈ ◉ ✓ ♥ ★) are NOT emoji — they
// render as text in the app font and are kept where they work.
//
// Usage: <Ico name="beer" size={16} color="#A6B0C6" style={{...}} />
// Unknown names render nothing (never crash a page over an icon).
import { C } from "../utils/theme";

const P = (d, extra = null) => (
  <>
    <path d={d} />
    {extra}
  </>
);

// Every icon is drawn on a 24×24 grid, stroke-based, 2px, round caps.
const ICONS = {
  compass: P("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M14.5 9.5l-1.6 4.6-4.6 1.6 1.6-4.6z"),
  ticket: P("M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z M13 6v2 M13 11v2 M13 16v2"),
  utensils: P("M7 3v7a2 2 0 0 0 2 2v9 M11 3v7a2 2 0 0 1-2 2 M7 3v4 M16 3c-1.7 0-3 2-3 5v5h3v8 M16 3v18"),
  beer: P("M6 5h9v16H6z M6 9h-.5A1.5 1.5 0 0 0 4 10.5v0 M15 9h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M9 9v8 M12 9v8 M6 5c0-1.1 2-2 4.5-2S15 3.9 15 5"),
  town: P("M3 21h18 M5 21V10l4-4 4 4v11 M13 21V13l4-3 3 3v8 M8 21v-4h2v4"),
  car: P("M5 16l1.2-4.5A2 2 0 0 1 8.1 10h7.8a2 2 0 0 1 1.9 1.5L19 16 M4 16h16v4h-2a1.5 1.5 0 0 1-3 0H9a1.5 1.5 0 0 1-3 0H4z"),
  map: P("M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z M9 4v14 M15 6v14"),
  calendar: P("M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M8 3v5 M16 3v5 M4 11h16"),
  pin: P("M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z", <circle cx="12" cy="10" r="2.6" />),
  bulb: P("M9 18h6 M10 21h4 M12 3a6 6 0 0 1 4 10.5c-.8.7-1 1.5-1 2.5H9c0-1-.2-1.8-1-2.5A6 6 0 0 1 12 3z"),
  user: P("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 21a7.5 7.5 0 0 1 15 0"),
  help: P("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7 M12 17h.01"),
  mail: P("M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M3.5 7l8.5 6 8.5-6"),
  book: P("M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5z M19 4h-6a0 0 0 0 0 0 0v16a2 2 0 0 1 2-2h4z"),
  search: P("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-5-5"),
  train: P("M7 4h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M5 10h14 M9 14h.01 M15 14h.01 M8 17l-2 4 M16 17l2 4"),
  ferry: P("M4 15l1.5-5H18.5L20 15 M12 10V6 M8 6h8 M2 19c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0"),
  bike: P("M6 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M18 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M6 14.5L9.5 8h5L18 14.5 M9.5 8L8 5.5h2.5"),
  tent: P("M12 4L3 20h18z M12 4l4.5 16 M12 4L7.5 20"),
  party: P("M5 13l-2 8 8-2 M5 13l6 6 M9 3l.7 2 M15 5l1.5-1.5 M19 9l2-.7 M14 10c2-2 4-2.5 6-2 M10 6c.5-2 0-4-1.5-5.5"),
  family: P("M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M17.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M3 21v-3a6 6 0 0 1 12 0v3 M15.5 21v-2.5a4.5 4.5 0 0 1 6.5-4"),
  sightseeing: P("M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z", <circle cx="12" cy="13" r="3.4" />),
  night: P("M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"),
  refresh: P("M20 8a8.5 8.5 0 0 0-15-1.5 M4 16a8.5 8.5 0 0 0 15 1.5 M4 4v5h5 M20 20v-5h-5"),
  edit: P("M16.5 3.5l4 4L8 20l-5 1 1-5z M14.5 5.5l4 4"),
  trash: P("M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6"),
  save: P("M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M8 3v5h7V3 M7 21v-8h10v8"),
  free: P("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9 15V9h3.5 M9 12h3"),
  walk: P("M13 6a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 13 6z M9 21l2.5-6L10 12l1-4.5L8 9.5 6.5 12 M11.5 8l2.5-.5 2 3 2.5 1 M11 15l3 2 1 4"),
};

// Small drawn Danish flag (Dannebrog) — replaces the 🇩🇰 emoji.
export const FlagDK = ({ height = 11, style }) => (
  <svg width={height * (37 / 28)} height={height} viewBox="0 0 37 28" style={{ display: "inline-block", verticalAlign: "-1px", borderRadius: 2, ...style }} aria-label="Denmark">
    <rect width="37" height="28" fill="#C8102E" />
    <rect x="12" width="4" height="28" fill="#fff" />
    <rect y="12" width="37" height="4" fill="#fff" />
  </svg>
);

export const Ico = ({ name, size = 16, color = "currentColor", strokeWidth = 2, style }) => {
  const body = ICONS[name];
  if (!body) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-2px", flexShrink: 0, ...style }} aria-hidden="true">
      {body}
    </svg>
  );
};

// Renders a drawn icon for data-driven emoji (data files store an `emoji`
// field per place/event). Known emoji map to drawn icons; anything unmapped
// falls back to the emoji character so content never breaks.
const EMOJI_MAP = {
  "🎪": "party", "🎉": "party", "🎊": "party", "🎭": "party",
  "🍽": "utensils", "🍽️": "utensils", "🍜": "utensils", "🌭": "utensils", "🍬": "utensils",
  "🍺": "beer", "🍻": "beer", "🌃": "night",
  "🚗": "car", "🚐": "car", "🚲": "bike", "🚶": "walk",
  "🚆": "train", "🚂": "train", "🚇": "train", "⛴": "ferry", "⛴️": "ferry",
  "⛺": "tent", "🏘": "town", "🏘️": "town", "🏰": "town",
  "🎟": "ticket", "🎟️": "ticket", "🆓": "free",
  "📍": "pin", "🗺": "map", "🗺️": "map", "🧭": "compass",
  "📖": "book", "💡": "bulb", "🔍": "search", "🔎": "search",
  "👤": "user", "❓": "help", "✉": "mail", "✉️": "mail",
  "👨‍👩‍👧‍👦": "family", "📷": "sightseeing", "🎫": "ticket",
};

export const EmojiIcon = ({ emoji, size = 16, color = "currentColor", style }) => {
  const name = EMOJI_MAP[emoji];
  if (name) return <Ico name={name} size={size} color={color} style={style} />;
  return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{emoji}</span>;
};

export default Ico;
