// ── SHOPS YOU CANNOT GET AT HOME ────────────────────────────────────
//
// Oliver, 22 Sep 2026, on the shopping tick he had just had deleted: "well.. we
// can 'technically' add shopping and then add all the shopping centers." And
// then, after I argued that a mall is the one place in Denmark that is not only
// here: "I'd do it another way then.. put shopping centers with ->
// 'recommended Denmark-Only Shops' like with bar streets."
//
// So this array holds the SHOPS and not the centres. A shop belongs here when
// buying it in Denmark is different from buying it at home: a Danish label's
// own store, a second-hand or genbrug shop, a workshop that sells what it
// makes. Bestseller labels (Jack & Jones, Vero Moda, Only) are Danish-owned
// and stand in every European high street, so they fail that test whoever owns
// them.
//
// The shop is NOT stored on its street or its centre. Each keeps its own row
// with its own address and the match happens at render time, which is the same
// arrangement bars and bar streets have had since August and the reason
// publishing one more shop needs no edit anywhere else. See
// utils/placeContainer.js.
//
// Empty until real entries are published. Do NOT hardcode places here, publish
// them through Studio instead.
export const shops = [];
