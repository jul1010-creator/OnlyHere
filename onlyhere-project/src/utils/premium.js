// ── WHAT A PAID ACCOUNT IS, IN ONE PLACE ────────────────────────────
//
// Oliver, 10 Sep 2026, adding Pub crawl to Gemlyx Detour: "That's for true
// bar-hopping. That is premium-account only." And, of the feature itself, "the
// 'account-only' will cost a bit of money obviously."
//
// THERE IS NO PAID TIER IN THIS CODEBASE YET. No plan, tier, subscription or
// entitlement field exists on the profile or anywhere else, and nothing reads
// one. PREF_NO_ACCOUNT and PREF_READY in interestFit.js are signed-in versus
// not, which is a different question and would let anybody with an email address
// into a paid feature.
//
// So this is the seam rather than the billing. It returns false for everybody
// today, because `plan` is a field nothing writes, and the day a plan column
// exists this one function is what changes. Nothing else in the app needs to
// know how the answer is reached.
//
// WHY NOT HIDE THE FEATURE UNTIL THEN. A paid feature nobody can see sells
// nothing, and shipping it ungated gives it away. The row is visible, it says
// what it is, and it says it needs a premium account. That is a real state and
// it is honest in both directions.
export const PAID_PLANS = ["premium"];

export const isPremium = (session) =>
  PAID_PLANS.includes(String(session?.plan || "").trim().toLowerCase());
