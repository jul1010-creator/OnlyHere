// ── CHEAP GEMS, AS PUBLISHED ────────────────────────────────────────
//
// EMPTY ON PURPOSE, the same way data/islands.js is. utils/liveContent.js
// pushes published `type === "gem"` rows into it at runtime, and every render
// site imports this one array rather than knowing where the rows came from.
// Do NOT hardcode gems here: a discount written into the source has no checked
// date on it, and the checked date is the whole of what makes one safe to show.
// See utils/cheapGems.js.
export const gems = [];
