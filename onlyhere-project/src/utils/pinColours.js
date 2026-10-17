// ── A DEAL'S PIN COLOUR ─────────────────────────────────────────────
// Oliver, 13 Oct 2026, choosing from a design review: a pin colour per deal.
// A short list rather than any colour, so every pin still reads on the maps
// and against the gold of the guide's own pins. The first is the gold itself,
// which is what an empty choice draws.
export const PIN_COLOURS = ["#C9A46A", "#E07A5F", "#2A9D8F", "#7B6CF6", "#4C9F70", "#3D8BFD"];
export const PIN_NAMES = { "#C9A46A": "Gold", "#E07A5F": "Coral", "#2A9D8F": "Teal", "#7B6CF6": "Violet", "#4C9F70": "Green", "#3D8BFD": "Blue" };
export const pinColour = (v) => {
  const c = String(v || "").trim().toUpperCase();
  return PIN_COLOURS.includes(c) ? c : "";
};
