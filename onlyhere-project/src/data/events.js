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
