// CONTENT MOVED TO SUPABASE (Aug 5 2026, Oliver's call: "remove all your own
// examples of places. So we only keep the ones from Supabase.") — every
// hardcoded example entry that used to live in this array was removed. Real
// content is published through the Content Studio (/#studio) into the
// gemlyx_content table and merged into this same array at runtime by
// utils/liveContent.js (ensureLiveContentLoaded), so every render site keeps
// working unchanged. The old hardcoded entries are recoverable from git
// history if ever needed. Do NOT hardcode new places here — publish them
// through Studio instead.
export const events = [];

export const majorEvents = [];

// ── AND THE ONES THAT ARE NOT PUBLISHED AT ALL ──────────────────────
//
// Oliver, 19 Sep 2026, after reading every island's own calendar:
//
//   "all the islands are actually very 'alive' in terms of events if you dig
//    deep enough. However, having all their small 30 participants-events on our
//    event line seems silly. I think we somehow need to keep these events
//    hidden, but present. So if it puts you onto Sejerø, it will include a small
//    local event happening at Sejerø, but not something published."
//
// sejero.dk/arrangementer is the page he was looking at. Asked what to call
// them: "consider it a community event. So along with the facebook ones."
//
// SEPARATE FROM events AND majorEvents ON THE SAME REASONING undatedEvents is
// separate, which is this file's one working safety model: nine readers take
// their rows from those two arrays, and a row that is not in either cannot be
// forgotten by any of them. No grid, no month chip, no front page line, no chat
// prompt. A guide reaches them, and only for a stop that is in that place.
//
// WHY NOT NEARBY, which is the question that makes this tier work at all. His
// answer: "Anything within reach is only for events that genuinely is major
// events. Community events are more local people getting together, which is
// something you can find many places. But is an interesting thing to be part of
// if you're there." A harbour night on Sejerø is worth knowing about when you
// are on Sejerø and is noise anywhere else.
export const communityEvents = [];

// ── "IT SHOULD BE IN A MEMORY" ──────────────────────────────────────
//
// Oliver, 5 Sep 2026. A festival whose next edition nobody has announced yet.
// SEPARATE FROM events AND majorEvents ON PURPOSE, and the separation is the
// whole safety model: an event with no date must never reach a grid, a month
// chip, a prompt or a guide, and nine different readers take their rows from
// those two arrays. A row that is not in them cannot be forgotten by any of
// them. See utils/undatedEvents.js for what is stored and what promotes a row
// out of here into events.
export const undatedEvents = [];

// No Studio type publishes into vikingEvents yet — festival rows go to events/
// majorEvents by __scale. The Events tab's Viking filter will stay empty until
// either a dedicated Studio type exists or viking festivals are published as
// regular festival rows.
export const vikingEvents = [];
