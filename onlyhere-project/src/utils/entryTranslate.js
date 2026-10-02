// ── AN ENTRY IN THE READER'S LANGUAGE ───────────────────────────────
//
// Oliver, 2 Oct 2026, asking how the drafts become other languages than
// English, and answering "Sure, you can do that" to this: when a place is
// published, the model writes Danish, German and Lithuanian versions of its
// sentences, stored beside the English (payload.__i18n), never instead of it.
//
// The English stays the one every check in the codebase reads, so nothing that
// verifies a fact has to learn three more languages. A translation is shown
// only while it still matches the English it was made from: each one carries a
// fingerprint of that English, and an edit to the English makes it stale, so
// the reader sees the English until it is translated again. A stale
// translation shown confidently would be the same mistake as a stale opening
// time.
//
// Names, prices, times and dates are never translated: only the sentences
// around them. A translation that loses or changes a number is refused field
// by field, and that field stays English.
import { stripDashes } from "./helpers";

export const TRANSLATED_LANGS = ["da", "de", "lt"];
// Each language named in itself. Not "Danish": the Studio's prompt wrapper
// (localisePrompt) turns "Danish" into "Lithuanian" on the Lithuanian site,
// and this prompt is about languages, not countries.
const LANG_NAMES = { da: "dansk", de: "Deutsch", lt: "lietuvių kalba" };

// The reader-facing sentences of a row, by path. Top-level prose fields, and
// the paragraphs and bullet points of the article. Headings are not here:
// entryWords.js already gives every standard heading in four languages.
export const PROSE_KEYS = [
  "desc", "popularityTag", "gemlyxFind", "priceNote", "ticketsGlance", "extraCosts",
  "accessibility", "bookingNote", "crowd", "tip", "howTo", "travelTime",
];

export const proseOf = (payload) => {
  const out = {};
  if (!payload || typeof payload !== "object") return out;
  PROSE_KEYS.forEach(k => {
    const v = payload[k];
    if (typeof v === "string" && v.trim().length >= 2) out[k] = stripDashes(v.trim());
  });
  (Array.isArray(payload.blogBody) ? payload.blogBody : []).forEach((b, i) => {
    if (b?.type === "paragraph" && typeof b.content === "string" && b.content.trim()) out[`blogBody.${i}.content`] = stripDashes(b.content.trim());
    if (b?.type === "bullets" && Array.isArray(b.items)) {
      b.items.forEach((it, j) => { if (typeof it === "string" && it.trim()) out[`blogBody.${i}.items.${j}`] = stripDashes(it.trim()); });
    }
  });
  return out;
};

// FNV-1a over the English, read the way the page reads it (dashes already
// taken out), so the fingerprint made at publish and the one made in the
// reader's browser agree.
export const fingerprint = (prose) => {
  const s = JSON.stringify(Object.keys(prose).sort().map(k => [k, prose[k]]));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
};

export const translatePrompt = (prose, lang, { name = "", where = "" } = {}) =>
  `Translate the text fields of a travel guide entry about "${name}"${where ? ` in ${where}` : ""} from English into ${LANG_NAMES[lang] || lang}.

RULES
- Write natural, plain ${LANG_NAMES[lang] || lang} for a visitor, in the same tone and at the same length. Do not add or leave out anything.
- Keep every proper name exactly as written: places, streets, businesses, people, dishes with a local name.
- Keep every number, price, time, date and currency exactly as written.
- No dashes as punctuation: no em dash, no en dash, no hyphen with spaces around it. Use a comma or a full stop.
- Answer with JSON only: the same keys, each with its translation.

${JSON.stringify(prose, null, 1)}`;

// Every run of digits in the English, as a multiset. A translation of a field
// must keep all of them.
const digitsOf = (s) => (String(s).match(/\d+/g) || []).sort().join(",");

// The model's answer, kept field by field: the key must be one we asked about,
// the value a string, and every number in the English still in it.
export const readTranslation = (text, prose) => {
  const raw = String(text || "");
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let j;
  try { j = JSON.parse(raw.slice(a, b + 1)); } catch { return null; }
  if (!j || typeof j !== "object") return null;
  const out = {};
  Object.keys(prose).forEach(k => {
    const v = j[k];
    if (typeof v !== "string" || !v.trim()) return;
    const clean = stripDashes(v.trim());
    if (digitsOf(clean) !== digitsOf(prose[k])) return;
    out[k] = clean;
  });
  return Object.keys(out).length ? out : null;
};

// Whether a row's translations are missing or made from different English.
export const needsTranslation = (payload) => {
  const prose = proseOf(payload);
  if (!Object.keys(prose).length) return false;
  const tr = payload?.__i18n;
  return !tr || tr.fp !== fingerprint(prose) || TRANSLATED_LANGS.some(l => !tr[l]);
};

// Make the three. `ask(prompt, maxTokens)` is the Studio's model call and
// returns { text } or { error }. Returns the __i18n object, or null when no
// language came back usable.
export const translateEntry = async (payload, ask, { where = "" } = {}) => {
  const prose = proseOf(payload);
  if (!Object.keys(prose).length) return null;
  const results = await Promise.all(TRANSLATED_LANGS.map(async lang => {
    try {
      const r = await ask(translatePrompt(prose, lang, { name: payload?.name || "", where }), 6000);
      return [lang, r?.error ? null : readTranslation(r?.text, prose)];
    } catch { return [lang, null]; }
  }));
  const got = Object.fromEntries(results.filter(([, v]) => v));
  if (!Object.keys(got).length) return null;
  return { fp: fingerprint(prose), at: new Date().toISOString().slice(0, 10), ...got };
};

// ── WHAT THE READER SEES ────────────────────────────────────────────
// The row with its sentences in the reader's language, when a translation
// exists and was made from the English the row carries now. Otherwise the row
// as it is.
const setPath = (obj, path, value) => {
  const parts = path.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = o[k];
    o[k] = Array.isArray(next) ? [...next] : (next && typeof next === "object" ? { ...next } : next);
    o = o[k];
    if (o === undefined || o === null || typeof o !== "object") return;
  }
  o[parts[parts.length - 1]] = value;
};

export const localizedEntry = (row, lang) => {
  if (!row || !lang || lang === "en") return row;
  const tr = row.__i18n;
  if (!tr || !tr[lang] || typeof tr[lang] !== "object") return row;
  const prose = proseOf(row);
  if (tr.fp !== fingerprint(prose)) return row;
  const out = { ...row };
  Object.entries(tr[lang]).forEach(([path, value]) => {
    if (typeof value === "string" && prose[path] !== undefined) setPath(out, path, value);
  });
  return out;
};
