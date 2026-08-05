// CONTENT MOVED TO SUPABASE (Aug 5 2026, Oliver's call: "remove all your own
// examples of places. So we only keep the ones from Supabase.") — every
// hardcoded example entry that used to live in this array was removed. Real
// content is published through the Content Studio (/#studio) into the
// gemlyx_content table and merged into this same array at runtime by
// utils/liveContent.js (ensureLiveContentLoaded), so every render site keeps
// working unchanged. The old hardcoded entries are recoverable from git
// history if ever needed. Do NOT hardcode new places here — publish them
// through Studio instead.
export const towns = [];

export const TOWN_COORDS = {
  "Copenhagen": [55.676, 12.568], "Aarhus": [56.157, 10.210], "Aalborg": [57.048, 9.919],
  "Nørresundby (Aalborg)": [57.059, 9.922], "Odense": [55.396, 10.389], "Roskilde": [55.642, 12.088],
  "Gilleleje": [56.126, 12.310], "Tisvildeleje": [56.043, 12.078], "Liseleje": [56.076, 11.964],
  "Hundested": [55.964, 11.851], "Frederiksværk": [55.971, 12.022], "Kerteminde": [55.449, 10.658],
  "Maribo": [54.777, 11.500], "Præstø": [55.123, 12.045], "Jelling": [55.756, 9.420],
  "Skanderborg": [56.036, 9.926], "Vejle": [55.709, 9.536], "Tønder": [54.933, 8.864],
  "Slagelse": [55.403, 11.354], "Samsø": [55.836, 10.604], "Løgstør": [56.964, 9.256],
  "Sønderborg": [54.909, 9.792], "Ribe": [55.328, 8.765], "Dragør": [55.593, 12.669],
  "Ærøskøbing": [54.888, 10.411], "Skagen": [57.720, 10.590], "Faaborg": [55.095, 10.243],
  "Gudhjem": [55.214, 14.972], "Sønderho": [55.337, 8.474], "Mariager": [56.649, 9.977],
  "Sæby": [57.331, 10.519], "Thorup Strand": [57.143, 9.106], "Ebeltoft": [56.195, 10.679],
  "Nyhavn": [55.680, 12.590],
};
