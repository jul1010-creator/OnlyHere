// ── A PHOTOGRAPHER'S NAME, NOT COMMONS' TEMPLATE ABOUT ONE ──────────
//
// Measured live, 27 Sep 2026, on a guide's map: under "Hellerup" the credit
// read "No machine-readable author provided. EPO assumed (based on copyright
// claims)." That is the text of a Wikimedia Commons template, saying the
// uploader, EPO, is taken to be the author. The name in it is the credit, so
// the name is what is shown. Used where Commons is read and wherever a stored
// credit is drawn, so credits saved before this read the same way.
const ASSUMED = /^\s*No machine-readable author provided\.?\s*(.+?)\s+assumed\s*(?:\([^)]*\))?\.?\s*$/i;
export const readableAuthor = (name) => {
  const t = String(name ?? "").replace(/\s+/g, " ").trim();
  const m = t.match(ASSUMED);
  return m ? m[1].trim() : t;
};
