// ── Live Denmark facts loader ──────────────────────────────────────
// Oliver, 5 Aug 2026: "Having 7 guide facts is boring. We need a lot. Put into
// studio a random fact generator or something with an (upload image) next to
// it." This is the runtime half of that: facts drafted in Content Studio live
// in the `gemlyx_facts` table, and this folds them into the SAME
// `denmarkFacts` array the guide loading card has always read.
//
// WHY IT IS SHAPED THIS WAY, and this is the important part: the loading card
// is rendered during a guide build, which is Rule Zero territory (only Fable
// touches guide code). By mutating the existing module-level `denmarkFacts`
// array in place, the renderer keeps reading the exact same variable it always
// has and never learns anything changed. Not one line of guide code is touched
// to make this work. Do not "improve" this by having the card fetch its own
// facts.
//
// THE GUARD RULE, inherited from liveContent.js, which earned it the hard way:
// never guard a mutation of a module-level array with component-scoped state
// (useRef/useState). GemlyxApp unmounts on navigation to /guide/new, so a
// per-mount guard resets while the array it protects does not, and every row
// gets pushed in again. That bug shipped once already and showed up as
// festivals appearing three times. Both the array and the guard here are
// module-level, there is one loader, and the in-flight promise is cached so a
// second caller awaits the first fetch instead of racing it.
import { denmarkFacts } from "../data/denmarkFacts";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

const mergedIds = new Set();   // gemlyx_facts row ids already folded in
const mergedText = new Set();  // normalised fact text, catches the same fact saved twice
let loadPromise = null;

const textKey = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

const doLoad = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_facts?select=*&published=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const rows = await res.json();
    // A missing table returns an error object, not an array. That is a normal
    // state before Oliver runs the SQL, so it is a quiet console note rather
    // than a thrown error: the 7 seed facts keep working and the loading card
    // behaves exactly as it did before.
    if (!Array.isArray(rows)) { console.warn("gemlyx_facts not readable yet (run the SQL in CHANGES_THIS_PASS.md):", rows); return; }
    const dupes = [];
    rows.forEach(row => {
      if (mergedIds.has(row.id)) return;
      const fact = String(row.fact || "").trim();
      if (!fact) return;
      const k = textKey(fact);
      if (mergedText.has(k)) { dupes.push(`row id ${row.id}`); return; }
      mergedIds.add(row.id);
      mergedText.add(k);
      denmarkFacts.push({
        id: `live-${row.id}`,
        name: row.subject || "Denmark",
        category: row.category || "history",
        photo: row.photo || null,
        photoPos: row.photo_pos || undefined,
        fact,
      });
    });
    if (dupes.length > 0) console.warn(`gemlyx_facts: skipped ${dupes.length} duplicate fact(s) (${dupes.join(", ")}), delete them in Studio.`);
  } catch (e) {
    console.warn("gemlyx_facts load failed, keeping the built-in facts:", e);
  }
};

// Seed the guard with the hardcoded facts, so a fact Oliver later saves to the
// table that duplicates one of the built-in seven is skipped instead of showing
// twice in the same carousel.
denmarkFacts.forEach(f => { if (f && f.fact) mergedText.add(textKey(f.fact)); });

export const ensureLiveFactsLoaded = async () => {
  if (!loadPromise) loadPromise = doLoad();
  await loadPromise;
  return denmarkFacts.length;
};

// Explicit re-fetch after publishing a fact in Studio, so it appears without a
// page reload. Keeps the merged guards deliberately, exactly like
// refreshLiveContent: a refresh must never re-add rows already in the array.
export const refreshLiveFacts = async () => {
  loadPromise = null;
  return ensureLiveFactsLoaded();
};
