// ── A STREET OR A CENTRE THAT HOLDS THE SHOPS ───────────────────────
//
// Oliver, 22 Sep 2026: "put shopping centers with -> 'recommended Denmark-Only
// Shops' like with bar streets. Unless you've put them onto some islands, of
// course."
//
// The second sentence is the rule that keeps this honest. A container is worth
// a row when it HOLDS several shops worth going to: Strøget, Jægersborggade,
// Bruuns Galleri. A workshop on Bornholm or a knitwear shop on Fanø has no
// container and never should, so it stays a shop on its own and this array
// never hears about it.
//
// AND A CENTRE WITH NOTHING ONLY-HERE INSIDE IT NEVER APPEARS. That is the
// whole argument for letting malls in at all: Fields is not a recommendation,
// it is an address for four shops that are. The page and the preview both fold
// the shops into it and a container with none of them is the empty state, the
// same rule a bar street with no bars already follows.
//
// Empty until real entries are published. Do NOT hardcode places here, publish
// them through Studio instead.
export const shopPlaces = [];
