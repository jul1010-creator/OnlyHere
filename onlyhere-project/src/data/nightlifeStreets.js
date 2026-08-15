// Bar streets: a whole strip known for its nightlife, sitting between a town
// and the individual venues on it. Drafted through Studio's "🍻 Bar street"
// type and published into this array by utils/liveContent.js.
//
// Oliver, 15 Aug 2026: "So Copenhagen -> Gothersgade -> List of bars.. like
// that." The bars are NOT stored here. Each bar keeps its own published row
// with its own location, and utils/nightlife.js matches them to the street at
// render time, so publishing one more bar on Gothersgade needs no edit here and
// deleting one cannot leave a dangling name behind.
//
// Empty until real entries are published. Do NOT hardcode places here, publish
// them through Studio instead.
export const nightlifeStreets = [];
