// ── A PICTURE OF THE PLACE, IN THE CONVERSATION ──────────────────────
//
// Oliver, 23 Aug 2026: "when Ribe is mentioned, show a picture of it as well.
// Make it distinct from other AIs."
//
// ── WHAT MAKES IT DISTINCT IS NOT THE PICTURE ───────────────────────
//
// Any assistant can put an image next to a place name, and most of them do it
// by searching the web for the name and showing whatever comes back. That is a
// stock photograph of somewhere that may or may not be the place, with no
// licence anybody checked and nothing behind it.
//
// This shows a photograph ONLY when Gemlyx holds a published entry for the
// place, which means a human fact-checked it, the licence was cleared through
// api/commons-photo, and there is a page behind the picture that opens. A name
// with no entry gets no picture, and the silence is the honest signal: Gemlyx
// is not claiming to know that one.
//
// So the rule is the opposite of the usual one. Other products show a picture
// of everything and vouch for none of it. This shows a picture of the few it
// can vouch for, and the picture is a door rather than a decoration.
//
// ── NOTHING HERE IS A NEW MECHANISM ─────────────────────────────────
//
// mentionsPlace is the boundary-safe matcher the preview screen has used since
// 18 August, through matchVariantsOf and containsName, so "Als" and "Møn" do
// not match half of an unrelated word. guideHero already reads `photo` and
// `__photoCredit` off a published row for the guide's hero image and skips
// craft for the reason repeated below. A second copy of either would be how the
// chat and the preview come to disagree about which places were named.
import { mentionsPlace, isRejectedPlace } from "./previewMatch";

// Three. A reply that names six places and shows six photographs is a gallery
// with a sentence attached, and the sentence is the product.
export const CHAT_PLACE_CAP = 3;

export const placesNamedIn = (text, pools, { cap = CHAT_PLACE_CAP } = {}) => {
  const said = String(text || "");
  if (!said.trim()) return [];
  const list = Array.isArray(pools) ? pools : [];
  const hay = said.toLowerCase();
  const seen = new Set();
  const found = [];

  for (const p of list) {
    const name = String(p?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    // No photograph, no card. The entry may still be excellent; this is a
    // picture feature and an empty frame is worse than nothing.
    if (!String(p?.photo || "").trim()) continue;
    // A craft row is a product rather than a place, which is the same exclusion
    // guideHero makes and for the same reason: a product shot is not a picture
    // of somewhere you can stand.
    if (p?._src === "craft") continue;
    if (!mentionsPlace(said, name)) continue;
    // "ikke København denne gang" names Copenhagen and means the opposite. The
    // preview screen was shipped for two days showing a list of the one city a
    // traveller had asked to leave, and this reader exists because of it.
    if (isRejectedPlace(said, name)) continue;
    seen.add(key);
    const at = hay.indexOf(key);
    found.push({ place: p, at: at < 0 ? Number.MAX_SAFE_INTEGER : at });
  }

  // In the order the sentence names them, so the first place mentioned is the
  // first card. A variant matched the name without the plain string appearing
  // (an alias, a definite form) sorts to the end rather than to the front.
  return found
    .sort((a, b) => a.at - b.at)
    .slice(0, Math.max(0, cap))
    .map(x => x.place);
};
