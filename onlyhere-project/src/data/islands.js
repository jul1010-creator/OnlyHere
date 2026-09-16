// ── THE ISLANDS, WHICH ARE NOT TOWNS ────────────────────────────────
//
// Oliver, 16 Sep 2026: "I think we should make 'islands' their own navigation.
// Instead of being part of towns. There are alot of islands."
//
// This array is EMPTY on purpose and stays empty. It exists for the same reason
// data/towns.js exists as an empty array: utils/liveContent.js pushes published
// `type === "island"` rows into it at runtime, and every render site imports
// this one array rather than knowing where the rows came from. Do NOT hardcode
// islands here; publish them through Studio.
//
// ── AND THIS DOES NOT REPLACE THE `island` FIELD ON A TOWN ──────────
//
// utils/geography.js:306 carries the argument, and it still holds: "Sejerø IS
// an island; Ærøskøbing is a town ON one. One field answers both." That field
// is about a TOWN and answers "which island is this town on". This array holds
// entries whose subject IS the island: the crossing, the operator, how long to
// stay, what the winter timetable does to a day trip.
//
// The two meet at one vocabulary. An island entry and a town entry both carry
// `island`, cleaned by the same cleanIsland, so the Island filter on the Towns
// page and an island's own page are reading the same names.
export const islands = [];
