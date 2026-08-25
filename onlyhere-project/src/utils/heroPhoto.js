// ── A HERO THAT DOES NOT LOAD IS NOT A HERO ──────────────────────────
//
// 25 August 2026, Oliver: "adding photos in the publish or manage doesn't make
// it the hero photo. I need to do that in 'add media.'"
//
// He is right, and the reason is written down in this repository twice already.
//
// ── THE THIRD TIME ──────────────────────────────────────────────────
//
// 7 AUGUST. `useCommonsPhoto` decided whether a row already had a hero with
// `p.photo || src`. Measured across all 71 published entries: 53 carried a local
// template path like /towns/ringkobing.jpg and 52 of those files did not exist,
// because the Studio type templates WRITE that path and leave adding the file as
// a manual step. Under `||` all 52 counted as "already set", so a real Commons
// photograph was appended to the body while the dead path stayed on the card.
// Replaced with an actual load check.
//
// 24 AUGUST. `uploadMediaFiles` still had `p.photo || firstUrl`. Its own comment
// records the finding: "THE FIX WAS APPLIED TO ONE DOOR AND NOT THE OTHER."
// Measured again across 148 rows: 27 still carried a relative hero that does not
// load, Præstø among them, with three Commons photographs in its own body and a
// dead /towns/praesto.jpg on the card. Replaced with the same load check.
//
// 25 AUGUST, TODAY, THE THIRD DOOR. `uploadDraftPhotos` — the "🖼 Add photos"
// button in the drafting panel, the one Oliver just used — still says
// `draft?.photo || firstUrl`. So a draft that carries a template path, which is
// every draft loaded back from a published row or pasted in from a run log,
// keeps that path and puts the photograph in the body. And because
// `shapeForLive` only lets an ABSOLUTE url beat the type template, publishing
// then regenerates the dead path and the upload never appears on the card at
// all.
//
// The panel sitting directly above that button reads: "No hero photo yet. The
// first one you add becomes it." That sentence has been false for any draft with
// a template path in it.
//
// ── SO THE RULE LIVES HERE NOW, ONCE ────────────────────────────────
//
// Three doors, three hand-written copies of one rule, and the third was the one
// nobody updated. A fourth copy is not the fix. The fix is that there is one
// function and every door calls it.
//
// `loads` is INJECTED rather than imported. The check is a HEAD request in the
// app and a stub in the suite, and this file has no business knowing which.

// The structural floor. `shapeForLive` applies exactly this rule when deciding
// whether a draft's hero beats the type template, and it cannot do better,
// because it is a pure function that runs at publish time with no network. So
// anything this file calls a hero must ALSO clear this bar — otherwise a door
// could accept a hero that publish then silently throws away, which is the
// failure mode Oliver actually hit.
export const isAbsolutePhoto = (url) => /^https?:\/\//i.test(String(url ?? "").trim());

// ── DOES THE HERO CURRENTLY ON THIS PAYLOAD NEED REPLACING? ─────────
//
// True means "put the new picture on the card". Three ways to be true:
//   • there is no hero at all
//   • the hero is a relative template path, which publish will discard
//   • the hero is an absolute url that does not resolve to an image
//
// And ONE way to be false: an absolute url that actually loads. A photograph
// that works is never overwritten by an upload, because somebody chose it.
//
// A `loads` that THROWS counts as "cannot confirm", and cannot confirm means
// LEAVE IT ALONE. The same rule constraintCheck's mode matcher follows: a broken
// checker must not quietly clear — or here, quietly clobber — everything. Losing
// a working hero to a network blip is worse than one upload landing in the body.
export const heroNeedsReplacing = async (photo, { loads } = {}) => {
  const url = String(photo ?? "").trim();
  if (!url) return true;
  if (!isAbsolutePhoto(url)) return true;
  if (typeof loads !== "function") return false;
  try { return !(await loads(url)); } catch { return false; }
};

// ── AND THE PATCH ITSELF, SO NO DOOR HAND-ROLLS THE SPREAD ──────────
//
// Every door was writing the same three-key object by hand, and the credit key
// is the one that gets forgotten: __photoCredit is what DetailPage renders under
// the hero, so a credit written when the picture did NOT become the hero
// attributes somebody else's photograph. It is set here only when the picture
// actually took the card, and never otherwise.
//
// Returns the fields to merge, not the whole payload — the caller owns the rest.
export const heroPatch = (replacing, url, credit) => {
  if (!replacing) return {};
  const src = String(url ?? "").trim();
  if (!src) return {};
  const c = credit && typeof credit === "object" && Object.keys(credit).length ? { __photoCredit: { ...credit } } : {};
  return { photo: src, ...c };
};

// The sentence the drafting panel prints when there is no usable hero. It said
// "No hero photo yet. The first one you add becomes it." on a draft that had one
// — a dead one — so it was both wrong and reassuring, which is the worst pair.
export const heroStatusLine = (photo) => {
  const url = String(photo ?? "").trim();
  if (!url) return "No hero photo yet. The first one you add becomes it.";
  if (!isAbsolutePhoto(url)) return `Hero is “${url}”, which is a template path, not a picture. Publishing drops it. The next photo you add takes the card.`;
  return "";
};
