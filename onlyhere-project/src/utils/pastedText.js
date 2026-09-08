// ── WHAT ARRIVES FROM A CLIPBOARD IS NOT ALWAYS WHAT WAS COPIED ─────
//
// Oliver, 8 Sep 2026: "when I copy directly from Gemini, at least on phone, it
// will do it in code like %20%20%20%".
//
// That is percent-encoded text: every space is %20, every newline %0A, and the
// fact-check box receives a wall of escapes instead of sentences. Nothing
// downstream can read it. routeMessage sees no words it knows, the claim
// splitter finds no claims, and the whole pass comes back with nothing to say
// about a fact-check that was perfectly good before the phone touched it.
//
// The app cannot fix a clipboard. It can notice.
//
// ── THE SIGNAL IS AN ENCODED SPACE, TWICE ───────────────────────────
//
// Not "does this contain a percent sign": prices, discounts and humidity all
// carry one, and "50% off" must survive untouched. Not "does decodeURIComponent
// change it" either, because that is true of any text with a stray %2 in it.
//
// The tell is an escape that stands for WHITESPACE, appearing more than once.
// Real prose does not contain "%20" at all, and prose that has been through an
// encoder contains almost nothing else, because a sentence is mostly spaces.
// Two of them, so a single literal "%20" in a sentence about URLs is safe.
const ENCODED_SPACE = /%(?:20|0A|0D|09)/gi;

// A run of valid escapes, decoded together so a multi-byte character survives:
// "ø" is %C3%B8 and decoding either half alone is meaningless.
const ESCAPE_RUN = /(?:%[0-9A-Fa-f]{2})+/g;

// ── AND A URL IS NOT PROSE ──────────────────────────────────────────
// A ticket link legitimately carries %20 in a query string, and decoding one
// breaks the address. A paste that is a single unbroken URL is left exactly as
// it came in, whatever it contains.
const IS_ONE_URL = /^\s*https?:\/\/\S+\s*$/i;

export const looksPercentEncoded = (text) => {
  const t = String(text || "");
  if (!t || IS_ONE_URL.test(t)) return false;
  return (t.match(ENCODED_SPACE) || []).length >= 2;
};

// ── DECODED TOLERANTLY, BECAUSE THE PASTE IS OFTEN TRUNCATED ────────
//
// decodeURIComponent throws on a malformed sequence and returns nothing at all,
// so one stray "%" at the end of a paste would discard the entire fact-check.
// His own example ends in exactly that: "%20%20%20%". So each RUN of valid
// escapes is decoded on its own and a run that will not decode is left as it
// is: the readable part is recovered and the broken tail stays visible, which
// is the honest outcome and the one he can see and fix.
export const decodePastedText = (text) => {
  const t = String(text || "");
  if (!looksPercentEncoded(t)) return t;
  return t.replace(ESCAPE_RUN, (run) => {
    try { return decodeURIComponent(run); } catch { return run; }
  });
};
