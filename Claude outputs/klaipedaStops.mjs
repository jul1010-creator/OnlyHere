// Builds src/data/klaipedaStops.js out of Klaipėda's open bus timetable.
//
//   node tools/klaipedaStops.mjs <unzipped GTFS folder> [read date YYYY-MM-DD]
//
// The feed is Klaipėdos keleivinis transportas' own, published at
// https://www.stops.lt/klaipeda/klaipeda/gtfs.zip and mirrored by the Mobility
// Database as mdb-1042. Oliver uploaded the mirror on 29 Sep 2026.
//
// WHAT IS KEPT is the half that changes once a year at most: where each stop
// stands, what it is called, which lines call there, and its page on stops.lt,
// which is where the live departures are. The times are left behind on purpose,
// the same call ferryRoutes.js made for Denmark: a departure read out of a
// snapshot goes stale in weeks, and the operator's page never does.
//
// A LINE COUNTS AT A STOP only if one of its trips calls there on a service
// running within 120 days of the read date, so a route kept in the feed for a
// season that is over does not get printed as a way to reach a museum.
//
// BOTH SIDES OF THE ROAD ARE ONE STOP to a reader. The feed files each
// direction as its own stop under the same name, a few dozen metres apart, and
// a line that only calls on the far side is still a line from "that stop". So
// same-named stops within 250 m are grouped and share their lines, while each
// keeps its own point and its own stops.lt page, so the nearest side is the one
// linked.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node tools/klaipedaStops.mjs <gtfs folder> [YYYY-MM-DD]"); process.exit(1); }
const readOn = process.argv[3] || new Date().toISOString().slice(0, 10);
const WINDOW_DAYS = 120;
const GROUP_M = 250;

const parseCsv = (text) => {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  const keys = head.map(k => k.replace(/^﻿/, "").trim());
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));
};
const read = (name) => parseCsv(readFileSync(join(dir, name), "utf8"));

const ymd = (s) => new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`);
const from = new Date(`${readOn}T00:00:00Z`);
const to = new Date(from.getTime() + WINDOW_DAYS * 864e5);

const running = new Set();
for (const c of read("calendar.txt")) {
  const anyDay = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].some(d => c[d] === "1");
  if (anyDay && ymd(c.start_date) <= to && ymd(c.end_date) >= from) running.add(c.service_id);
}
try {
  for (const d of read("calendar_dates.txt")) {
    const when = ymd(d.date);
    if (d.exception_type === "1" && when >= from && when <= to) running.add(d.service_id);
  }
} catch { /* the file is optional in GTFS */ }

const routeName = new Map(read("routes.txt").map(r => [r.route_id, (r.route_short_name || r.route_long_name).trim()]));
const tripLine = new Map();
for (const t of read("trips.txt")) if (running.has(t.service_id)) tripLine.set(t.trip_id, routeName.get(t.route_id));

const linesAt = new Map();
for (const st of read("stop_times.txt")) {
  const line = tripLine.get(st.trip_id);
  if (!line) continue;
  if (!linesAt.has(st.stop_id)) linesAt.set(st.stop_id, new Set());
  linesAt.get(st.stop_id).add(line);
}

const metres = (a, b) => {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const pageId = (url) => (String(url).match(/#stop\/([^/?#]+)/) || [])[1] || "";
const groups = [];
for (const s of read("stops.txt")) {
  const lines = linesAt.get(s.stop_id);
  if (!lines || !lines.size) continue; // a stop nothing calls at is not a way to get anywhere
  const pt = [Number(Number(s.stop_lat).toFixed(5)), Number(Number(s.stop_lon).toFixed(5))];
  const name = s.stop_name.trim();
  const g = groups.find(x => x.name === name && x.pts.some(p => metres(p, pt) <= GROUP_M));
  const entry = [pt[0], pt[1], pageId(s.stop_url)];
  if (g) { g.pts.push(entry); lines.forEach(l => g.lines.add(l)); }
  else groups.push({ name, pts: [entry], lines: new Set(lines) });
}

const lineOrder = (a, b) => {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  if (Number.isFinite(na) !== Number.isFinite(nb)) return Number.isFinite(na) ? -1 : 1;
  return a.localeCompare(b);
};
groups.sort((a, b) => a.name.localeCompare(b.name, "lt"));

const body = groups.map(g => `  ${JSON.stringify([g.name, [...g.lines].sort(lineOrder).join(" "), g.pts])},`).join("\n");
const out = `// GENERATED by tools/klaipedaStops.mjs. Do not edit by hand: re-run it on a
// fresh feed instead. See that file for what is kept and why.
//
// Source: Klaipėdos keleivinis transportas, open GTFS timetable
// (stops.lt/klaipeda, Mobility Database mdb-1042), read on ${readOn}.
// Each row: [stop name, lines that call there, [[lat, lon, stops.lt page id], ...]]
export const KLAIPEDA_STOPS_READ_ON = "${readOn}";
export const KLAIPEDA_STOP_PAGE = "https://www.stops.lt/klaipeda/index.html#stop/";
export const KLAIPEDA_STOPS = [
${body}
];
`;
writeFileSync(new URL("../src/data/klaipedaStops.js", import.meta.url), out);
console.log(`${groups.length} stops (${groups.reduce((n, g) => n + g.pts.length, 0)} points), ${running.size} running services, read on ${readOn}`);
