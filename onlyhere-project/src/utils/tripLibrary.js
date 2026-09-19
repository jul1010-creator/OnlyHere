// ── "BUILD A RECENTLY USED FINISHED TRIP SYSTEM" ─────────────────────
//
// Oliver, 19 Sep 2026, in his own work list: "So when someone used a guide, it
// will be published. Of course, if it had events, users will be able to replace
// that with something else, or another event recommended by Gemlyx."
//
// Asked what published means, he chose: public, stripped of the person. So the
// days, the stops and the notes stay, and the dates, the party, the budget and
// the conversation go. Asked how far to take the events half tonight, he chose
// the publishing half only, so a finished event keeps the refusal the costs
// block already prints and the swap is the next session's work.
//
// ── AN ALLOWLIST, BECAUSE A DENYLIST FAILS OPEN ─────────────────────
//
// This is the one module in the app that turns a private thing into a public
// one, and the guide object it reads has grown a new underscore field most
// weeks this month: _travelers on the 12th, _party and _planProblems since,
// _convoText since August. A list of fields to REMOVE is a promise that
// whoever adds the next one remembers to come here, and the cost of forgetting
// is somebody's conversation on a public page.
//
// So nothing travels unless it is named below. A guide with a field this list
// has never heard of publishes without it, which is the failure that shows up
// as a missing line rather than as a leak.
//
// ── AND THE CONVERSATION IS THE ONE TO BE SURE ABOUT ────────────────
//
// `_convoText` is the whole chat with a role prefix on every line: what they
// said about their children, their budget, what they had already seen. Nothing
// renders it on a guide page and it is in every saved payload, so it would have
// gone public with the first published trip.

// What a reader needs, and nothing else. `_mode` stays because how you get
// around a route is a property of the route rather than of the traveller, and
// the whole point of a published trip is that somebody else can take it.
export const TRIP_KEEPS = ["title", "days", "_mode"];

// Per DAY, the same rule again. A day's dates are derived from `_arrivalDate`
// at render, so dropping that one field takes every date with it.
export const DAY_KEEPS = ["day", "title", "stops", "glance", "note", "notes", "summary", "theme"];

// Per GLANCE. stayArea is a neighbourhood and recommendedStay is a hotel, both
// facts about places rather than about whoever slept there. `accommodation` is
// the prose that goes with them.
export const GLANCE_KEEPS = ["stayArea", "recommendedStay", "accommodation", "legs", "bestTime", "typicalCosts"];

// Per STOP. Everything a stop is, minus anything the traveller decided.
export const STOP_KEEPS = ["name", "town", "why", "note", "notes", "time", "type", "slug", "kind", "ticketUrl", "ticketStatus", "date", "dateEnd"];

const pick = (obj, keys) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
};

export const stripForLibrary = (guide) => {
  if (!guide || typeof guide !== "object" || Array.isArray(guide)) return null;
  const trip = pick(guide, TRIP_KEEPS) || {};
  trip.days = (Array.isArray(guide.days) ? guide.days : []).map(d => {
    const day = pick(d, DAY_KEEPS) || {};
    day.stops = (Array.isArray(d?.stops) ? d.stops : []).map(s => pick(s, STOP_KEEPS) || {});
    if (d?.glance) day.glance = pick(d.glance, GLANCE_KEEPS) || {};
    return day;
  });
  return trip;
};

// ── AND WHAT IT MUST NOT CONTAIN, CHECKED RATHER THAN TRUSTED ───────
//
// The allowlist above is the mechanism and this is the promise. Two lists
// pointed at the same fields would drift, so this one names what personal means
// and the suite runs it over a guide carrying every field the pipeline writes:
// if the allowlist ever grows a door, this says which field walked through it.
export const PERSONAL_FIELDS = [
  "_convoText", "_travelers", "_party", "_constraints", "_arrivalDate", "_arrivalPoint",
  "_budget", "_gid", "_geo", "_fx", "_weatherFetchedAt", "_grounded", "_exactDurations",
  "_noRouteFound", "_onlyWalking", "_lightMode", "_testProfile", "_testPlan", "_planProblems",
  "essentials", "savedAt", "arrivalDate", "id",
  // ── AND THE TWO THE FINDS BANNER ADDED, 19 SEP 2026 ───────────────
  // `_findsTurnedDown` is a list of things THIS traveller said no to, which is
  // a decision rather than content. `_community` is village events pinned to
  // this trip's own days, which would be somebody else's stale calendar the
  // moment the trip was published. Neither is in TRIP_KEEPS, so neither can
  // reach a published trip today; this is the check that says so if the
  // allowlist ever grows a door. See utils/guideFinds.js.
  "_findsTurnedDown", "_community", "_stay",
];

const walk = (value, at, out) => {
  if (Array.isArray(value)) { value.forEach((v, i) => walk(v, `${at}[${i}]`, out)); return; }
  if (!value || typeof value !== "object") return;
  for (const k of Object.keys(value)) {
    if (PERSONAL_FIELDS.includes(k)) out.push(`${at}${at ? "." : ""}${k}`);
    walk(value[k], `${at}${at ? "." : ""}${k}`, out);
  }
};

export const personalLeaks = (trip) => {
  const out = [];
  walk(trip, "", out);
  return out;
};

// ── WHICH TRIPS ARE WORTH PUBLISHING ────────────────────────────────
//
// "A recently used FINISHED trip". A guide somebody saved is a trip they kept,
// which is the closest thing to a vote this app has, and it is still not a
// reason to publish a two-stop afternoon. Returns the reasons it may not go up,
// empty when it may, which is the shape every other gate in this codebase uses.
export const MIN_LIBRARY_DAYS = 2;
export const MIN_LIBRARY_STOPS = 4;

export const notPublishable = (guide) => {
  const out = [];
  if (!guide || typeof guide !== "object" || Array.isArray(guide)) return ["not a guide"];
  if (!String(guide.title || "").trim()) out.push("no title");
  const days = Array.isArray(guide.days) ? guide.days : [];
  if (days.length < MIN_LIBRARY_DAYS) out.push(`fewer than ${MIN_LIBRARY_DAYS} days`);
  const stops = days.flatMap(d => (Array.isArray(d?.stops) ? d.stops : [])).filter(s => String(s?.name || "").trim());
  if (stops.length < MIN_LIBRARY_STOPS) out.push(`fewer than ${MIN_LIBRARY_STOPS} stops`);
  // A day with no stops renders a heading over nothing, which is the shape
  // exampleGuideProblems refuses for the same reason: it reads as the product
  // being broken rather than the trip being thin.
  if (days.some(d => !(Array.isArray(d?.stops) ? d.stops : []).length)) out.push("a day with no stops");
  // Test scaffolding on a public page describes a traveller who does not exist.
  if (guide._testProfile || guide._testPlan) out.push("a pipeline test run");
  return out;
};

// ── THE ROW, WITH THE BROWSABLE PART AS COLUMNS ─────────────────────
//
// The list page needs a title, a length and the towns to show a card, and
// downloading every payload to read three fields is how a list page becomes
// slow enough that nobody opens it. The payload is the trip; the columns are
// what a card is made of.
export const libraryRow = (guide, { id, at } = {}) => {
  if (notPublishable(guide).length) return null;
  if (id == null || String(id).trim() === "") return null;
  const trip = stripForLibrary(guide);
  // ── THE LAST GATE, AND THE REASON IT IS HERE ──────────────
  //
  // The allowlist above is a list, and a list is only as good as what it knows
  // about. Some of the fields it keeps are copied whole: `legs` is whatever the
  // route builder put in it, and a nested field nobody has looked at rides
  // along inside it. So the stripped trip is READ BACK before anything is
  // published, and if anything personal survived, nothing goes up at all.
  //
  // Refusing is the right failure here. A trip missing from a list is a gap
  // nobody notices; a conversation on a public page cannot be taken back.
  if (personalLeaks(trip).length) return null;
  const towns = [...new Set((trip.days || [])
    .flatMap(d => (d.stops || []).map(s => String(s?.town || "").trim()))
    .filter(Boolean))];
  return {
    id: String(id),
    title: String(trip.title || "").trim(),
    days: (trip.days || []).length,
    stops: (trip.days || []).reduce((n, d) => n + (d.stops || []).length, 0),
    towns,
    mode: String(trip._mode || "").trim() || null,
    payload: trip,
    created_at: at || new Date().toISOString(),
  };
};

// One line per card, from the columns rather than from the payload.
export const libraryCard = (row) => {
  if (!row || typeof row !== "object") return "";
  const bits = [];
  const days = Number(row.days) || 0;
  if (days) bits.push(`${days} day${days === 1 ? "" : "s"}`);
  const stops = Number(row.stops) || 0;
  if (stops) bits.push(`${stops} stop${stops === 1 ? "" : "s"}`);
  const towns = Array.isArray(row.towns) ? row.towns.filter(Boolean) : [];
  if (towns.length) bits.push(towns.slice(0, 3).join(", ") + (towns.length > 3 ? ` and ${towns.length - 3} more` : ""));
  return bits.join(" · ");
};

export const LIBRARY_PATH = "/trips";

// ── AND THE TABLE HE HAS TO CREATE ──────────────────────────────────
//
// Written here rather than pasted into a chat, for the reason SUPPORT_SETUP_SQL
// and INBOX_SETUP_SQL are: a migration nobody can find again is a migration
// that gets run twice with a different shape the second time. Safe to re-run.
//
// PUBLIC READ, and insert by anybody, which is the same policy gemlyx_guides
// carries: a guide is already public at its own link. No update and no delete
// policy at all, so a row cannot be edited or removed through the anon key.
export const LIBRARY_TABLE = "gemlyx_trip_library";

export const LIBRARY_SETUP_SQL = `-- Recently used trips, published stripped of the traveller.
create table if not exists ${LIBRARY_TABLE} (
  id text primary key,
  title text not null,
  days int not null,
  stops int not null,
  towns text[] not null default '{}',
  mode text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ${LIBRARY_TABLE}_recent on ${LIBRARY_TABLE} (created_at desc);

alter table ${LIBRARY_TABLE} enable row level security;

drop policy if exists "${LIBRARY_TABLE}_read" on ${LIBRARY_TABLE};
create policy "${LIBRARY_TABLE}_read" on ${LIBRARY_TABLE}
  for select using (true);

drop policy if exists "${LIBRARY_TABLE}_insert" on ${LIBRARY_TABLE};
create policy "${LIBRARY_TABLE}_insert" on ${LIBRARY_TABLE}
  for insert with check (true);
`;
