// ── HOW LONG AN ANSWER IS ALLOWED TO BE ─────────────────────────────
//
// Oliver, 14 Sep 2026, after watching somebody else use Gemlyx: "We need a
// 'long' / 'Short' answers. Because my friend don't like these long replies."
// And then, in three words that are the whole specification: "She wants
// simplicity."
//
// She is right and the prompt already half agreed with her. It has carried the
// line "GET TO THE POINT. Most replies should be short and concrete, skip the
// long preamble before a recommendation" for weeks, and the reply she was
// reading ran to five paragraphs with a NightPay aside in the middle of it. A
// rule that asks for brevity in one sentence and then hands the model nine
// other things it must cover is not a rule, it is a preference, and the model
// resolves it the way models do.
//
// So this is not another sentence of encouragement. It is a budget, stated in
// sentences, and the short setting says plainly that a long answer is a failure
// even when every sentence in it is good. That is the part the existing line
// was missing: it never said what to LOSE.
//
// ── WHY SHORT IS THE DEFAULT ────────────────────────────────────────
//
// The person who complained is the first traveller to use this who did not
// build it. Somebody arriving at a chat box has not asked for an essay, and the
// one who wants the long version can say so in one tap and keeps that choice.
// The reverse default makes every newcomer read five paragraphs to find out
// they wanted three sentences.
export const SHORT = "short";
export const LONG = "long";
export const ANSWER_LENGTHS = [SHORT, LONG];
export const DEFAULT_LENGTH = SHORT;

export const cleanLength = (v) => (ANSWER_LENGTHS.includes(String(v || "").trim()) ? String(v).trim() : DEFAULT_LENGTH);

// ── THE BUDGET ──────────────────────────────────────────────────────
//
// Sentences, not words, because a model counts sentences reliably and guesses
// at words. Three is not arbitrary: it is a place, the one thing worth knowing
// about it, and what to do next, which is the shape of an answer a friend gives
// across a table.
//
// The question is carved out of the budget rather than counted inside it.
// Gemlyx has to be able to ask what it still needs, and a short setting that
// swallowed the question would turn a seven slot brief into a guess.
//
// AND WHAT TO LOSE IS NAMED. Every line here is a thing the long replies
// actually do: the recap of what they just said, the reasoning behind a pick,
// the aside about a discount app, the closing offer. Naming them is the
// difference between a rule and a wish.
const SHORT_BLOCK = `ANSWER LENGTH: SHORT. The traveller has chosen short answers, and this outranks every other instruction about what a reply may contain. Three sentences at most, plus one question at the end when you still need something. When you are laying out a route across several days you may use two short paragraphs, and no more.
What to cut, in this order: any recap of what they just told you, the reasoning behind a recommendation, any aside about an app, a discount or a booking tip they did not ask about, and the closing offer to do more. Name the place, say the one thing that matters about it, and stop.
A long reply is a failure here even when every sentence in it is good. If you cannot fit something, leave it out rather than compressing five things into one dense sentence: half the point of a short answer is that it is easy to read, and a paragraph with the spaces taken out is neither short nor simple.
If they ask for more on something, give it to them in full for that one answer, then go back to short.`;

const LONG_BLOCK = `ANSWER LENGTH: FULL. The traveller has chosen the longer answers, so cover what is worth covering. This is not licence to pad: the rules above about getting to the point and skipping preamble still hold, and a reply is still as long as it needs to be rather than as long as it can be.`;

export const answerLengthBlock = (mode) => (cleanLength(mode) === SHORT ? SHORT_BLOCK : LONG_BLOCK);

// ── AND THE RULE THAT WAS ARGUING WITH IT ───────────────────────────
//
// Oliver, 19 Sep 2026, after using the two settings on the same conversation:
// "the short and full versions are no different.. short should be no details,
// while full should be the current."
//
// He is right and the block above was never going to win on its own. Thirty
// lines before it the prompt said, unconditionally: "BE HELPFUL, NOT JUST
// BRIEF: a short, thin answer wastes their time more than a slightly longer,
// useful one does", and then asked for a DKK figure, a season warning, a
// transit quirk and a trade-off. One paragraph asking for brevity against
// forty asking for substance is not a rule, and "this outranks every other
// instruction" is a claim the surrounding text kept contradicting.
//
// So the depth paragraph moves in here and becomes one of the two settings. The
// long one is his current reply, word for word, because that half is what he
// wants kept. The short one asks for the same honesty about what matters and
// gives it one sentence to happen in.
//
// WHAT SURVIVES ON SHORT IS THE ONE REAL THING, which is what he chose when
// asked: "Keep it, cut everything else." A turn that gives nothing is the
// intake form this app has been pulling away from since August, so the thing
// given stays and the tip, the reasoning, the aside and the closing offer go.
const LONG_DEPTH = `BE HELPFUL, NOT JUST BRIEF: people planning a Denmark trip are often spending real money to get here, and a short, thin answer wastes their time more than a slightly longer, useful one does. "Concise" means no padding or filler, not "as few words as possible." When you answer, give the specific detail that changes what someone does: realistic costs (actual DKK figures, not just "moderate"), a heads-up if the season/weather makes something worth reconsidering, a transit quirk, a real trade-off between two options. Depth here means more real information, not more adjectives or enthusiasm. The "kill the brochure fluff" rule still fully applies to HOW you write, just not to how much you are willing to tell someone.`;

const SHORT_DEPTH = `BE USEFUL IN ONE SENTENCE. They have asked for short answers, so depth is one detail that changes what they do, not four. Pick the single most useful thing you know about what they just said, say it plainly, and stop: a price if the price is the thing, a closing time if that is the thing, one trade-off if that is. Never stack them. Everything else you know stays unsaid until they ask for it, and a reply that covers three things well is a failure here.`;

export const depthBlock = (mode) => (cleanLength(mode) === SHORT ? SHORT_DEPTH : LONG_DEPTH);

// ── AND THE CEILING, BECAUSE A RULE WITH NO EDGE IS A PREFERENCE ────
//
// Both settings ran on the same 8192 token budget, so nothing but the model's
// own judgement separated them, and its judgement was being formed by the forty
// lines above. Three sentences is a few hundred tokens with room to spare; the
// cap is not the rule and is not meant to be hit, it is the thing that makes the
// rule cost something when it is ignored.
//
// ── AND AT 1200 IT WAS HIT EVERY TIME, BY THE THINKING ──────────────
//
// Measured live on the deployed site, 26 Sep 2026, on a complete brief with the
// panel filled in. Three turns in a row on the Short setting came back with no
// text at all and the traveller got a diagnosis instead of an answer:
//
//   Gemlyx chat: no text in this turn
//   Gemlyx chat: the budget went on thinking, retrying with more room
//   Gemlyx chat: no text in this turn
//
// The same questions on Full answered first time. So the cap was not trimming a
// long reply, it was eating the reply whole.
//
// THE REASON IS THAT max_tokens IS NOT AN ANSWER LENGTH. On a model that thinks
// before it writes, that number is the budget for the thinking AND the answer,
// and the thinking goes first. A short answer is a few hundred tokens; the
// reasoning in front of it on a seven-slot brief is thousands. Capping the pair
// at 1200 does not make a verbose model terse, it makes a thoughtful one silent.
//
// SO THE RULE STAYS WHERE IT WORKS, which is the block above: SHORT_DEPTH tells
// the model what a short answer is, and it obeys it. This number goes back to
// being what its own comment says it is, a backstop that is not meant to be hit,
// at a height that leaves room to think. Still below the full setting, so the
// choice still costs something, and a turn that somehow needs more is escalated
// to the ceiling rather than to double. See runTurn in App.jsx.
export const SHORT_REPLY_TOKENS = 6000;
export const answerTokens = (mode, full) => (cleanLength(mode) === SHORT ? SHORT_REPLY_TOKENS : full);

// What the two buttons say. "Short" and "Full" rather than "Short" and "Long",
// because nobody picks the option labelled long.
export const LENGTH_LABEL = { [SHORT]: "Short", [LONG]: "Full" };
export const lengthLabel = (mode) => LENGTH_LABEL[cleanLength(mode)];

// ── AND IT SURVIVES A RELOAD ────────────────────────────────────────
//
// A choice about how somebody is spoken to is not a fact about one message.
// Wrapped, because this runs in a browser where storage can be off, and a
// setting that threw would take the chat down with it.
const KEY = "gemlyx_answer_length";
export const readAnswerLength = () => {
  try { return cleanLength(window.localStorage.getItem(KEY)); } catch { return DEFAULT_LENGTH; }
};
export const storeAnswerLength = (mode) => {
  try { window.localStorage.setItem(KEY, cleanLength(mode)); } catch { /* storage off, the session still has it */ }
  return cleanLength(mode);
};
