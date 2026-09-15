// ── THE REPORTS, AS SOMETHING HE CAN WORK THROUGH ───────────────────
//
// Oliver, 15 Sep 2026: "all the reports should go to Oliververhein@gmail.com's
// account. So not on the mail, but in a report fixes tab for studio."
//
// The rows were already being written. What was missing is the other end: a
// place to read them, in order, with a way to say "done with that one".
//
// ── WHY NOT THE INBOX, WHICH IS WHAT THIS REPLACES ──────────────────
//
// A report in an email has no state. It cannot be marked handled, it competes
// for attention with everything else that arrives, and answering one means
// finding it again tomorrow. Twelve of them is a morning lost to scrolling.
// A list with a handled flag is the difference between a beta he can work and
// a beta that works him.
//
// ── PURE, SO THE PARTS THAT DECIDE THINGS CAN BE TESTED ─────────────
//
// Nothing here fetches. The panel passes rows in. Everything below is about
// reading a row correctly, which is where the mistakes live: a message with a
// context block glued to the end, a topic id that no longer matches its label,
// a timestamp from a row written before the column had a default.
import { CONTEXT_DIVIDER } from "./problemContext";
import { SUPPORT_TOPICS } from "./support";

// ── HANDLED IS A COLUMN, NOT A GUESS ────────────────────────────────
// gemlyx_support already has `handled boolean not null default false`. It was
// written for exactly this and nothing has ever set it.
export const isHandled = (row) => row?.handled === true;

export const unhandledCount = (rows) => (Array.isArray(rows) ? rows : []).filter(r => !isHandled(r)).length;

// ── WHAT THEY WROTE, AND WHAT THE APP ATTACHED ──────────────────────
//
// withContext glues the browser facts onto the end of the message under a
// divider, because adding a column would have meant a migration and there is
// already one of those outstanding in this project. That was the right trade at
// the time and it leaves this: the two halves have to be told apart again to be
// read.
//
// Split rather than stripped. The facts are the whole reason the report is
// actionable, and a panel that hid them would be throwing away the answer to
// "which browser" to save four lines of space.
export const splitReport = (message) => {
  const all = String(message ?? "");
  const at = all.indexOf(CONTEXT_DIVIDER);
  if (at < 0) return { said: all.trim(), context: "" };
  return {
    said: all.slice(0, at).trim(),
    context: all.slice(at + CONTEXT_DIVIDER.length).trim(),
  };
};

const LABEL = SUPPORT_TOPICS.reduce((m, t) => { m[t.id] = t.label; return m; }, {});

// A row carries a topic ID. The labels move, and moved on 15 Sep when "Something
// is broken" became "Feedback", so a row written last week must not display as
// a blank. Falls back to the stored id, which is ugly and true, rather than to
// "Other", which is tidy and a lie about what somebody chose.
export const topicLabel = (id) => LABEL[String(id || "")] || String(id || "") || "No topic";

// ── ORDER ───────────────────────────────────────────────────────────
//
// Unhandled first, then newest first inside each half. Not simply newest first:
// the list exists to be worked through, and the thing he has already dealt with
// should not keep taking the top of the screen because it happened to arrive
// last. Within the unhandled half, newest wins, because a bug reported this
// morning is more likely to still be there than one from a fortnight ago.
const stamp = (row) => {
  const t = Date.parse(row?.created_at || "");
  return Number.isFinite(t) ? t : 0;   // a row with no usable date sorts last, not first
};

export const sortReports = (rows) => {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  return [...list].sort((a, b) => {
    const h = Number(isHandled(a)) - Number(isHandled(b));
    if (h) return h;
    return stamp(b) - stamp(a);
  });
};

// ── FILTERS, WHICH ARE THE REASON THE PANEL IS USABLE AT TWELVE ─────
export const FILTERS = ["open", "all", "feedback", "problem"];

export const filterReports = (rows, filter) => {
  const list = sortReports(rows);
  if (filter === "all") return list;
  if (filter === "open") return list.filter(r => !isHandled(r));
  return list.filter(r => String(r?.topic || "") === filter);
};

// ── HOW LONG AGO, IN WORDS ──────────────────────────────────────────
//
// A timestamp is a thing to decode; "3 hours ago" is a thing to read. `now` is
// passed in rather than read from the clock so this is testable, which is the
// same rule the rest of this file follows.
//
// Stops at days. Anything older than a week during a beta is a report he has
// either dealt with or is not going to, and "47 days ago" is false precision
// about a decision that has already been made.
export const reportAge = (createdAt, now = Date.now()) => {
  const t = Date.parse(createdAt || "");
  if (!Number.isFinite(t)) return "";
  const secs = Math.max(0, Math.round((now - t) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

// ── AND THE SQL THAT MAKES ANY OF IT READABLE ───────────────────────
//
// gemlyx_support ships with an insert policy and NO select policy, on purpose:
// the anon key is in the bundle, so a select policy would have published every
// message and every address in the table to anybody who opened devtools.
//
// That is still right for anon. What it also did was lock HIM out, which is why
// the only way to read a report until now was the Supabase dashboard. These two
// policies open it to one account, matched on the email in the token, exactly
// as gemlyx_content's "only me" already does. The anon key carries no email
// claim at all, so it cannot satisfy either of them.
//
// Named as its own constant rather than added to SUPPORT_SETUP_SQL, because
// that one has already been run and a person re-running a whole setup block to
// pick up two lines at the end is a person who misses them.
export const INBOX_SETUP_SQL = `-- Gemlyx reports, readable in Studio. Run once.
drop policy if exists gemlyx_support_read on public.gemlyx_support;
create policy gemlyx_support_read on public.gemlyx_support
  for select to authenticated
  using ((auth.jwt() ->> 'email'::text) = 'oliververhein@gmail.com'::text);

drop policy if exists gemlyx_support_handled on public.gemlyx_support;
create policy gemlyx_support_handled on public.gemlyx_support
  for update to authenticated
  using ((auth.jwt() ->> 'email'::text) = 'oliververhein@gmail.com'::text)
  with check ((auth.jwt() ->> 'email'::text) = 'oliververhein@gmail.com'::text);
`;
