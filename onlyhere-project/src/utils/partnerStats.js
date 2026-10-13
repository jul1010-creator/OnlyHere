// ── WHAT A PARTNER'S PLACE BROUGHT, COUNTED WITHOUT ANYONE ──────────
//
// Oliver, 12 Oct 2026, asked how the offers and deals are tracked and whether
// a business needs an account. Nothing was tracked: the numbers under "What
// you would see" on /lithuania/business were examples. He said "Sure" to real
// counts and a private link per partner, with no account for anyone.
//
// What is counted, per place and per day, and nothing else:
//
//   w   the place was in a walk a visitor was shown
//   d   its offer was on and shown: on a walk, or in the "Deals near you"
//       list the Klaipėda page opens on (13 Oct 2026)
//   r   a visitor on the walk reached it (the phone says they are there, or,
//       with no GPS, they moved on from it)
//   rh  the same, by the hour at the place, for "your busiest hour"
//   x   a visitor opened the offer with "Redeem offer" to show at the
//       counter (13 Oct 2026). What the visitor did, not proof the counter
//       took it: nothing on the screen can know that.
//
// No account, no browser identifier and nothing about the visitor goes in.
// The counts live in the same daily counter table as the guide limits, so they
// go after 30 days, as the privacy policy already says of that table, and no
// new table or SQL is needed.
//
// This file is shared: the browser sends with it and the route reads with it,
// so the two can never disagree about a key.

export const PARTNER_STATS_DAYS = 30;
export const STAT_KINDS = ["w", "d", "r", "x"];
// A walk shows at most a handful of places; anything longer is not a walk.
export const MAX_WALK_IDS = 12;

// A place's id in a walk is `${type}:${row id}` (nowPlanner.js). Anything else
// is refused rather than cleaned, so a key can never carry text it was sent.
const STAT_ID = /^[a-z][A-Za-z]{0,15}:[A-Za-z0-9_-]{1,64}$/;
export const cleanStatId = (id) => (STAT_ID.test(String(id ?? "")) ? String(id) : "");

export const statKey = (kind, id, hour = null) =>
  kind === "rh" ? `st:rh:${id}:${String(hour).padStart(2, "0")}` : `st:${kind}:${id}`;

// Every key one place's page reads.
export const readKeysFor = (id) => [
  ...STAT_KINDS.map(k => statKey(k, id)),
  ...Array.from({ length: 24 }, (_, h) => statKey("rh", id, h)),
];

// The keys one event counts. `hour` is the hour at the place, 0 to 23.
export const eventKeys = (body, hour) => {
  const e = String(body?.e || "");
  if (e === "walk") {
    const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).map(cleanStatId).filter(Boolean))].slice(0, MAX_WALK_IDS);
    if (!ids.length) return [];
    const deals = new Set((Array.isArray(body?.deals) ? body.deals : []).map(cleanStatId).filter(id => ids.includes(id)));
    return [...ids.map(id => statKey("w", id)), ...[...deals].map(id => statKey("d", id))];
  }
  if (e === "deals") {
    const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).map(cleanStatId).filter(Boolean))].slice(0, MAX_WALK_IDS);
    return ids.map(id => statKey("d", id));
  }
  if (e === "redeem") {
    const id = cleanStatId(body?.id);
    return id ? [statKey("x", id)] : [];
  }
  if (e === "reach") {
    const id = cleanStatId(body?.id);
    if (!id || !Number.isInteger(hour) || hour < 0 || hour > 23) return [];
    return [statKey("r", id), statKey("rh", id, hour)];
  }
  return [];
};

// The rows the counter table holds for one place, summed into what the page
// shows. Rows for any other key are ignored, whatever the query returned.
export const statsFrom = (rows, id) => {
  const totals = { walks: 0, deals: 0, reached: 0, redeemed: 0 };
  const byHour = new Array(24).fill(0);
  const byDay = new Map();
  const field = { [statKey("w", id)]: "walks", [statKey("d", id)]: "deals", [statKey("r", id)]: "reached", [statKey("x", id)]: "redeemed" };
  const hourPrefix = `st:rh:${id}:`;
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row?.key || "");
    const n = Math.max(0, Math.floor(Number(row?.n) || 0));
    if (!n) continue;
    if (field[key]) {
      totals[field[key]] += n;
      const day = String(row?.day || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const d = byDay.get(day) || { day, walks: 0, deals: 0, reached: 0, redeemed: 0 };
        d[field[key]] += n;
        byDay.set(day, d);
      }
    } else if (key.startsWith(hourPrefix)) {
      const h = Number(key.slice(hourPrefix.length));
      if (Number.isInteger(h) && h >= 0 && h < 24) byHour[h] += n;
    }
  }
  const top = Math.max(...byHour);
  const busiest = top > 0 ? { hour: byHour.indexOf(top), n: top } : null;
  return { totals, busiest, byDay: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)) };
};

// ── SENT FROM THE BROWSER ────────────────────────────────────────────
// Fire and forget: a count that does not arrive is a smaller number, never a
// broken walk. keepalive so the last one still goes when the page is closed.
const send = (body) => {
  try {
    if (typeof fetch !== "function") return;
    fetch("/api/partner-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  } catch { /* counting is never worth an error */ }
};

export const walkSeenBody = (walk, country) => {
  const stops = Array.isArray(walk?.stops) ? walk.stops : [];
  const ids = stops.map(s => cleanStatId(s?.id)).filter(Boolean).slice(0, MAX_WALK_IDS);
  if (!ids.length) return null;
  return { e: "walk", c: String(country || ""), ids, deals: stops.filter(s => s?.deal && cleanStatId(s.id)).map(s => s.id) };
};
export const walkSeen = (walk, country) => { const b = walkSeenBody(walk, country); if (b) send(b); };
export const dealsSeen = (ids, country) => {
  const clean = [...new Set((Array.isArray(ids) ? ids : []).map(cleanStatId).filter(Boolean))].slice(0, MAX_WALK_IDS);
  if (clean.length) send({ e: "deals", c: String(country || ""), ids: clean });
};
export const dealRedeemOpened = (id, country) => {
  const clean = cleanStatId(id);
  if (clean) send({ e: "redeem", c: String(country || ""), id: clean });
};
export const placeReached = (stop, country) => {
  const id = cleanStatId(stop?.id);
  if (id) send({ e: "reach", c: String(country || ""), id });
};

// The partner page's address, from the token the route signs.
export const KLAIPEDA_PARTNER_PATH = "/lithuania/partner";
export const partnerPath = (token) => `${KLAIPEDA_PARTNER_PATH}?k=${encodeURIComponent(String(token || ""))}`;
