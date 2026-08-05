// CONTENT MOVED TO SUPABASE (Aug 5 2026, Oliver's call: "remove all your own
// examples of places. So we only keep the ones from Supabase.") — every
// hardcoded example entry that used to live in this array was removed. Real
// content is published through the Content Studio (/#studio) into the
// gemlyx_content table and merged into this same array at runtime by
// utils/liveContent.js (ensureLiveContentLoaded), so every render site keeps
// working unchanged. The old hardcoded entries are recoverable from git
// history if ever needed. Do NOT hardcode new places here — publish them
// through Studio instead.
// craftItems is the live, Supabase-backed array (craft_items table) — this
// fallback only seeds the very first render before that fetch lands.
export const craftItemsFallback = [];

// No Supabase table/Studio type exists for handmade craft shops yet — this
// section renders an honest empty state until one does.
export const handmadeCraftShops = [];
