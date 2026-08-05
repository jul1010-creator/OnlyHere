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

// No Studio type publishes into vikingEvents yet — festival rows go to events/
// majorEvents by __scale. The Events tab's Viking filter will stay empty until
// either a dedicated Studio type exists or viking festivals are published as
// regular festival rows.
export const vikingEvents = [];
