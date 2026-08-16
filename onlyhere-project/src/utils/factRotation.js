// ── "SHOULDN'T SHOW THE SAME FACT TWICE" ────────────────────────────
//
// Oliver, 9 Aug 2026, watching a guide build: "Loading Screen for guide
// shouldn't show the same fact twice. And it shouldn't start with a instant
// swap from H.C. Andersen. It should start on the first fact... has to look
// professionel."
//
// Two complaints, one screen, and they come from two different lines.
//
// ── THE REPEAT ──────────────────────────────────────────────────────
// The rotator picked a fresh random card every 15 seconds:
//
//   let next = Math.floor(Math.random() * denmarkFacts.length);
//   while (next === i) next = Math.floor(Math.random() * denmarkFacts.length);
//
// That excludes the card currently on screen and nothing else. With eight
// facts, the chance that a card he already read comes back inside the next
// three ticks is not small, it is the normal case: roughly one in seven per
// tick, compounding. A guide build he watches for two minutes shows eight
// cards drawn with replacement, and a repeat inside eight draws from seven
// options is more likely than not. He was not unlucky, he was looking at how
// this works.
//
// Sampling without replacement is the fix, and that is a shuffled ORDER walked
// in sequence rather than a die rolled each tick. Nothing can repeat until
// everything has been shown, which is what "shouldn't show the same fact twice"
// means when there are only eight facts.
//
// ── THE INSTANT SWAP ────────────────────────────────────────────────
// Separate bug, same screen. The index started at 0, so the first frame painted
// H.C. Andersen, and then an effect ran:
//
//   setFactCardIdx(Math.floor(Math.random() * denmarkFacts.length));
//
// An effect runs AFTER the browser has painted. So every build showed the first
// card for a few milliseconds and then replaced it, which is exactly the flicker
// he described, and it is unmistakably the look of something that has gone
// wrong even to someone who could not say why.
//
// Deciding after the paint is the bug, so the order has to exist BEFORE it. It
// is chosen when the previous build's loading screen closes, sitting ready, and
// the first card painted is order[0] with nothing scheduled to replace it.
//
// The very first build of a session uses the identity order, so it opens on
// fact number one exactly as he asked, and every build after that is shuffled
// so the sequence is not identical every time (his own earlier ask: "more
// random, instead of always being the same"). Both are satisfied without either
// one fighting the other.

// `rand` is injected so the shuffle can be tested against a fixed sequence.
// A shuffle tested with Math.random can only be tested for "did not crash".
export const shuffledOrder = (n, rand = Math.random) => {
  const out = Array.from({ length: Math.max(0, n | 0) }, (_, i) => i);
  // Fisher-Yates, downward. The upward variant with `rand() * n` is the famous
  // wrong one: it generates n^n equally likely paths onto n! permutations, so
  // some orderings come out more often than others. Not visible to a traveler,
  // but this is the kind of thing that gets copied.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const identityOrder = (n) => Array.from({ length: Math.max(0, n | 0) }, (_, i) => i);

// ── "IT HAS TO BE RANDOMS, BUT IT HAS TO START ON A FACT" ───────────
//
// Oliver, 16 Aug 2026, correcting the reading of his own August complaint:
// "I never said I wanted it to open on fact 1.. I said I didn't want it to go
// 'inbetween' two facts when opening. Like it would show H.C. Andersen for half
// a second and then go off to the first fact."
//
// The comment at the top of this file took "it should start on the first fact"
// to mean denmarkFacts[0], and built a rule around it: identity order for the
// first build of a session, shuffled after. He meant the opposite of what that
// implemented. There was never a request to open on H.C. Andersen. There was a
// request not to see a card swap out from under you.
//
// The two asks were never in tension:
//
//   NO FLICKER    the order must exist BEFORE the first paint, because an
//                 effect runs after it. That is the whole of that complaint.
//   RANDOM        including the first card.
//
// ── AND A SEED, RATHER THAN A STORED ARRAY ──────────────────────────
// The old version stored the shuffled array in state, chosen when the previous
// build closed. That carries a second bug: denmarkFacts GROWS at runtime, since
// Studio publishes into it and liveContent merges into it after mount. An order
// captured when the array was empty is `[]`, and factAt on an empty order
// returns 0 for every position. Fact zero, forever, which is the symptom he
// reported.
//
// A seed has no length in it. The order is derived from the seed and whatever
// the array holds right now, during render, so it is settled before paint and
// it is correct however late the facts arrive.
//
// mulberry32, because Math.random cannot be seeded and a shuffle tested against
// Math.random can only be tested for "did not crash". Same reason `rand` is
// injectable above; this is the injectable thing.
export const seededRandom = (seed) => {
  let a = (Number(seed) >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// The order for one build. Pure: the same seed and the same count always give
// the same sequence, which is what lets it be computed during render on every
// pass without the cards reshuffling under the reader mid-build.
export const orderFor = (n, seed) => shuffledOrder(n, seededRandom(seed));

// A seed for the NEXT build. Kept here rather than inlined at the call site so
// the whole rotation, including where its randomness enters, lives in one file.
export const nextSeed = (rand = Math.random) => Math.floor(rand() * 0xFFFFFFFF) >>> 0;

// Walking the order, wrapping at the end. Wrapping is the point where a repeat
// becomes legitimate: everything has been seen, so starting again is not the
// bug he reported.
export const advancePos = (pos, n) => (n > 0 ? ((pos | 0) + 1) % n : 0);

// The card to paint. Tolerant about a stale order, because the facts array can
// grow between builds: Studio publishes into denmarkFacts (see App.jsx, "folded
// into the same denmarkFacts array"), so an order chosen when the last build
// closed can be shorter than the list is now. A modulo here means a stale order
// shows a valid card instead of an undefined one.
export const factAt = (order, pos, n) => {
  if (!Array.isArray(order) || !order.length || n <= 0) return 0;
  const idx = order[((pos | 0) % order.length + order.length) % order.length];
  return Number.isInteger(idx) && idx >= 0 && idx < n ? idx : 0;
};
