// ── TEXT THAT LEAFLET WILL TREAT AS HTML ────────────────────────────
// Security review, 9 Oct 2026. Leaflet writes a string tooltip, popup or
// divIcon html with innerHTML, so a stop name from a shared guide was being
// read as markup. Every label built from data goes through this first.
export const htmlText = (v) => String(v == null ? "" : v)
  .replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// A colour from a row, only when it is a plain hex value.
export const hexColour = (v, fallback) => (/^#[0-9a-f]{3,8}$/i.test(String(v || "").trim()) ? String(v).trim() : fallback);
