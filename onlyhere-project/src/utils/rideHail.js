// ── TOO FAR TO WALK? ────────────────────────────────────────────────
//
// Oliver, 1 Oct 2026, reading the Klaipėda tourism site's own tips: "One of
// which is Bolt, which is true. We should probably put that into the guide if
// the place you recommend is far away."
//
// So a walking leg that is long gets one line under it naming the ride app
// that works in that country, with a link to it. Only where it works: Bolt is
// what the tourism centre itself tells visitors in Klaipėda, and nothing is
// named for a country until somebody has checked it there. The link is plain,
// with no partner code, so nothing about it earns Gemlyx money.
export const RIDE_APPS = {
  LT: { name: "Bolt", url: "https://bolt.eu/" },
};

// A walk of this many minutes or more gets the line. Twenty, the same figure
// the guide already treats as the longest sensible walk between two stops.
export const RIDE_FROM_MINUTES = 20;

export const rideFor = ({ country = "", minutes = null, tooFar = false } = {}) => {
  const app = RIDE_APPS[String(country || "").toUpperCase()];
  if (!app) return null;
  const m = Number(minutes);
  if (!tooFar && !(Number.isFinite(m) && m >= RIDE_FROM_MINUTES)) return null;
  return app;
};
