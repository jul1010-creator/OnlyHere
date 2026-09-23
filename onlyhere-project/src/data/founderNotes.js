// ── WHAT A LOCAL TOLD US, AS PUBLISHED ──────────────────────────────
//
// EMPTY ON PURPOSE, the same way data/gems.js is. utils/liveContent.js pushes
// published `type === "note"` rows into it at runtime, and the chat prompt
// imports this one array rather than knowing where the rows came from.
// Do NOT hardcode a note here: a note written into the source has no date and
// no check on it, and those two are the whole of what makes one safe to put
// in front of a traveller. See utils/founderNotes.js.
export const founderNotes = [];
