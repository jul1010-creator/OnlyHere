// ── THE PIN BOTH MAPS PUSH IN ──────────────────────────────────────
//
// Oliver, 22 Sep 2026, looking at the guide's route map beside the chat's:
// "We need the same 'pointers' as on the chat map."
//
// He is right and it was one file's private helper. The chat map has drawn a
// real marking pin since 13 September, off a photograph he sent of a box of
// Markierungsnadeln, and the guide map, which is the one a traveller keeps,
// still drew flat numbered circles. Two maps in one product, one of them
// pointing at places and the other dotting them.
//
// So the pin moves here and both maps draw the same object. The comments below
// are the chat map's own, kept whole: they are the record of how this shape
// was arrived at, and the file they were written in no longer owns it.
//
// WHAT THE GUIDE MAP NEEDED ADDING, and nothing else: a NUMBER on the ball,
// because a route is an order and the list under the map is numbered to match,
// and a COLOUR, because that map says where a day starts and ends. A labelled
// pin gets a bigger head to hold its digits and a shorter needle to stay in
// proportion, both measured off the same single number the chat pin scales
// from.

// The pin's own colour, named once. Oliver, 8 Sep 2026, asked for the shape
// everyone knows and then, shown it in the site's gold, said "red". Gold is
// this app's accent and is already on every heading and badge, so a gold pin
// reads as furniture; red is the one colour nothing else here uses.
export const PIN_RED = "#E8232A";

// The ball on an ordinary pin, in pixels. The newest place gets the same pin
// larger rather than a second colour, which is the rule the teardrop set.
// ── HALVED, 14 SEP 2026 ─────────────────────────────────────────────
// "I like the pins, although maybe they should be ½ size." This is the only
// number that decides it; the needle and the tilt are ratios off it, so the
// whole pin scales from here.
export const PIN_HEAD_PX = 6;
// The needle, in ball diameters. Life is 2.7 and looks like a matchstick at this
// size; 2.1 keeps the pin under 40px tall, which matters on the 190px phone strip.
const PIN_REACH = 2.1;
const PIN_TILT = 10;
// Each gradient needs an id of its own or every pin on the map inherits the
// first one's, which is a single shared ball that never changes size.
// ── AND THE COUNTER IS SHARED NOW ───────────────────────────────────
// Two maps can be mounted at once (the chat's, and a guide opened behind it),
// and two <defs> answering to the same id is the bug this counter exists to
// prevent. One counter here rather than one per file, so the ids cannot
// collide across them either.
let pinSeq = 0;
export const pinId = (prefix = "p") => `${prefix}${pinSeq++}`;
// ── THE MARKING PIN ─────────────────────────────────────────────────
// Returns the markup and the three numbers Leaflet needs: the box, the point
// inside it that sits on the coordinate, and how much of the pin stands above
// that point, which is what the label layout measures against.

// ── THE BALL'S HIGHLIGHT AND ITS SHADOW, OFF ONE COLOUR ─────────────
// The red pin's gradient was three hand-picked hex values. A pin that can be
// green or gold needs its top and bottom derived from the colour it was given,
// or every other colour comes out flat beside the red one. Mixed towards white
// and towards black in sRGB, which is enough for a ten pixel ball and needs no
// colour space nobody can read in a stack trace.
const mix = (hex, towards, amount) => {
  const h = String(hex || "").trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return hex;
  const to = towards === "white" ? 255 : 0;
  const parts = [0, 2, 4].map(i => {
    const v = parseInt(full.slice(i, i + 2), 16);
    return Math.round(v + (to - v) * amount).toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
};
const lighten = (hex, amount) => mix(hex, "white", amount);
const darken = (hex, amount) => mix(hex, "black", amount);

// ── AND THE TWO THINGS A ROUTE PIN CARRIES ──────────────────────────
//
// `label` is the stop's number. It goes ON the ball, because the numbers under
// the map are the same numbers and a reader matches them by eye; printing it
// beside the pin would be a second thing floating next to a thing.
//
// A labelled ball has to be wide enough for two digits, so the caller hands in
// a bigger radius and the needle takes a shorter reach: at the chat pin's 2.1
// a ball that size stands sixty pixels tall and reads as a lamp post. Both
// numbers are ratios off `r`, which keeps the single-number rule the halving
// on 14 Sep was written to preserve.
//
// `color` is the ball, for the guide map's own reading: green where the trip
// starts, the accent where it ends, and the pin's red in between. The chat map
// passes nothing and gets red, which is what it has always drawn.
//
// `hollow` is a coordinate nobody could confirm: the stop is plotted at the
// middle of its town, and a pin drawn solid there is the map asserting
// something nobody checked, in the place a reader trusts most. Dashed outline,
// dark centre, same shape, so it reads as "near here" at a glance.
export const pushPin = (r, latest, id, { label = "", color = PIN_RED, reach = PIN_REACH, hollow = false } = {}) => {
  const L2 = r * reach * 2;
  const topW = r * 0.5, pad = r * 0.95;
  const w = Math.ceil(r * 2 + pad * 2), h = Math.ceil(r + L2 + pad * 2);
  const cx = w / 2, cy = pad + r, tip = cy + L2;
  const glow = latest ? ` drop-shadow(0 0 ${(r * 0.8).toFixed(1)}px ${PIN_RED}77)` : "";
  return { w, h, cx, tip, above: Math.round(L2 + r),
    svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible;`
      + `filter:drop-shadow(${(r * 0.3).toFixed(1)}px ${(r * 0.45).toFixed(1)}px ${(r * 0.45).toFixed(1)}px rgba(0,0,0,.62))${glow};${latest ? "" : "opacity:.88;"}">`
      + `<defs><radialGradient id="${id}b" cx="33%" cy="28%" r="75%">`
      + `<stop offset="0%" stop-color="${lighten(color, 0.55)}"/><stop offset="38%" stop-color="${color}"/>`
      + `<stop offset="100%" stop-color="${darken(color, 0.45)}"/></radialGradient>`
      + `<linearGradient id="${id}n" x1="0" y1="0" x2="1" y2="0">`
      + `<stop offset="0%" stop-color="#8892A6"/><stop offset="34%" stop-color="#F2F5FA"/>`
      + `<stop offset="68%" stop-color="#AAB4C6"/><stop offset="100%" stop-color="#636B7D"/></linearGradient></defs>`
      + `<g transform="rotate(${PIN_TILT} ${cx} ${tip})">`
      + `<path d="M${cx - topW} ${cy} L${cx + topW} ${cy} L${cx + topW * 0.1} ${tip} L${cx - topW * 0.1} ${tip} Z" fill="url(#${id}n)"/>`
      + `<path d="M${cx + topW} ${cy} L${cx + topW * 0.1} ${tip} L${cx - topW * 0.1} ${tip} Z" fill="#0A0F1E" opacity=".3"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${hollow ? "rgba(10,15,30,.78)" : `url(#${id}b)`}"`
      + ` stroke="${hollow ? color : "#0A0F1E"}" stroke-width="${(r * (hollow ? 0.16 : 0.11)).toFixed(2)}"`
      + `${hollow ? ` stroke-dasharray="${(r * 0.5).toFixed(1)} ${(r * 0.36).toFixed(1)}"` : ""} stroke-opacity="${hollow ? ".95" : ".7"}"/>`
      + `<ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.36}" rx="${(r * 0.34).toFixed(2)}" ry="${(r * 0.24).toFixed(2)}" fill="#fff" opacity="${hollow ? ".3" : ".78"}"`
      + ` transform="rotate(-30 ${cx - r * 0.3} ${cy - r * 0.36})"/>`
      // The number sits UPRIGHT inside the tilted ball, because a pushed-in pin
      // leans and a printed digit does not lean with it. Counter-rotated by the
      // tilt about the ball's own centre, so the ball keeps its lean and the
      // figure stays readable.
      + (label
        ? `<text x="${cx}" y="${cy}" transform="rotate(${-PIN_TILT} ${cx} ${cy})" text-anchor="middle" dominant-baseline="central"`
          + ` font-family="Inter, sans-serif" font-weight="800" font-size="${(r * 1.02).toFixed(1)}"`
          + ` fill="${hollow ? color : "#FFFFFF"}" stroke="rgba(0,0,0,.35)" stroke-width="${(r * 0.03).toFixed(2)}" paint-order="stroke">${label}</text>`
        : "")
      + `</g></svg>` };
};

