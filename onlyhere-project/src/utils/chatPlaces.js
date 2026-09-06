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

// ── A CARD HAS TO BE WORTH POPPING UP ───────────────────────────────
//
// Oliver, 26 Aug 2026: "the towns just popping up randomly is stupid.. there
// gotta be a reason to pop it up. Not just because the name is mentioned."
//
// He is looking at a reply that suggests Ribe for a proper Danish winter and
// mentions Copenhagen because Copenhagen is where he lands. Two cards appeared.
// One of them told him something.
//
// A NAME IN A SENTENCE IS NOT A RECOMMENDATION. This matched any published place
// whose name occurred anywhere in the reply, so the arrival airport's city, the
// town the traveller asked for by name, and a place mentioned only as route
// mechanics all earned the same 210-pixel photograph as a genuine suggestion.
//
// The rule underneath his complaint: a card is for something GEMLYX INTRODUCED.
// If the traveller named it themselves, they know what it is — a picture of it
// is decoration, and decoration under every reply is the noise he has objected
// to twice tonight in other forms.
//
// `alreadyKnown` is the traveller's own words. Injected rather than parsed here,
// because App.jsx already holds them and a second reader of the same transcript
// is how the arrival anchor once resolved to Copenhagen Airport on an Aalborg
// brief.
const mentions = (hay, name) => {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return false;
  return new RegExp(`(?:^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(hay);
};

// ── needsPhoto: THE CARD RULE THAT MUST NOT LEAK ONTO THE MAP ───────
//
// 6 Sep 2026, adding the chat map. Every rule in this function was written for
// a CARD, and the map reuses the matching rather than growing a second copy of
// it — which is the right call and the dangerous one, because two of these
// rules are about decoration and would be silently wrong as map rules.
//
// The photograph is the first. "No photograph, no card" is correct: an empty
// 210-pixel frame is worse than nothing. A PIN needs no photograph. Inheriting
// that rule would drop pins for published places that have a checked coordinate
// and no picture, and the map would be quietly missing somewhere Gemlyx had
// just recommended, for a reason that has nothing to do with where it is.
//
// (The second is `alreadyKnown`, and the caller handles that one by not passing
// it: a place the traveller named needs no INTRODUCING, but a map exists to
// show where things are, and leaving out the town they are flying into is the
// map being wrong about the shape of the trip.)
//
// Defaults to true, so every existing caller keeps the behaviour it was
// written with and this is opt-out rather than opt-in.
export const placesNamedIn = (text, pools, { cap = CHAT_PLACE_CAP, alreadyKnown = "", needsPhoto = true } = {}) => {
  const said = String(text || "");
  if (!said.trim()) return [];
  // What the traveller has already named. A place they asked for is a place they
  // do not need introducing to.
  const theirs = String(alreadyKnown || "").toLowerCase();
  const list = Array.isArray(pools) ? pools : [];
  const hay = said.toLowerCase();
  const seen = new Set();
  const found = [];

  for (const p of list) {
    const name = String(p?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    // THE RULE. Named by the traveller means no card: they know, and the picture
    // is decoration. Named by Gemlyx and not by them is a suggestion, and a
    // suggestion is exactly what a photograph is for.
    if (theirs && mentions(theirs, name)) continue;
    // No photograph, no card. The entry may still be excellent; this is a
    // picture feature and an empty frame is worse than nothing. A map pin is
    // not a picture feature, which is what needsPhoto is for.
    if (needsPhoto && !String(p?.photo || "").trim()) continue;
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

// ── AND THE ONES THAT WERE TURNED DOWN ──────────────────────────────
//
// 6 Sep 2026, for the chat map. placesNamedIn already refuses to CARD a place
// the sentence rejects ("ikke København denne gang"), which is enough when the
// card lives and dies with one reply. The map accumulates, so a pin dropped
// four replies ago stays on screen unless something takes it off, and "not
// Ribe then" leaving Ribe pinned is the map asserting a trip nobody agreed to.
//
// Same two readers, asked the opposite way round: which of these pools does
// this sentence NAME and TURN DOWN. Names are returned folded, because the
// caller keys its pins the same way.
export const rejectedIn = (text, pools) => {
  const said = String(text || "");
  if (!said.trim()) return [];
  const out = [];
  for (const p of (Array.isArray(pools) ? pools : [])) {
    const name = String(p?.name || "").trim();
    if (!name) continue;
    // BOTH, and in this order. isRejectedPlace looks for a refusal near a name;
    // asking it about a name the sentence never mentions is how a stray "no" in
    // an unrelated clause unpins somewhere.
    if (!mentionsPlace(said, name)) continue;
    if (!isRejectedPlace(said, name)) continue;
    out.push(name.toLowerCase());
  }
  return out;
};
