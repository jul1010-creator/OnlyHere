// ── ONE DEAL, OPENED FROM OUTSIDE EXPLORE ───────────────────────────
//
// 15 Oct 2026, for the deal alerts: a deal in the bell's list, and the link
// in a deal mail (/lithuania?deal=food:12), open that deal on Explore the way
// its own tile does. Explore may not be on screen yet, or its deals may still
// be loading, so the ask waits here until DealsNearYou has the deal in its
// list, and lapses after half a minute so an old ask cannot open something
// later by surprise. No React, so the suite reads it as it is.
export const DEAL_OPEN_EVENT = "gx:open-deal";
export const DEAL_ID_RE = /^[a-z]{1,16}:[A-Za-z0-9_-]{1,64}$/;
const LIFE_MS = 30000;
let asked = null;

export const requestOpenDeal = (id, now = Date.now()) => {
  const v = String(id ?? "").trim();
  if (!DEAL_ID_RE.test(v)) return false;
  asked = { id: v, at: now };
  try { window.dispatchEvent(new Event(DEAL_OPEN_EVENT)); } catch { /* no window in the suite */ }
  return true;
};
export const pendingDeal = (now = Date.now()) => (asked && now - asked.at < LIFE_MS ? asked.id : null);
export const clearPendingDeal = () => { asked = null; };
// The deal a mail's link names, or "".
export const dealFromSearch = (search) => {
  try {
    const v = new URLSearchParams(String(search || "")).get("deal") || "";
    return DEAL_ID_RE.test(v) ? v : "";
  } catch { return ""; }
};
