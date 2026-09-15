// ── WHAT A BUG REPORT HAS TO CARRY TO BE WORTH ANYTHING ─────────────
//
// Oliver, 15 Sep 2026, past one in the morning: "considering it's going to be
// beta.. we need to create a 'report problems' button."
//
// The button is the easy half. The half that decides whether the button is
// worth having is what arrives with it, because "it didn't work" from somebody
// who has closed the tab is a report nobody can act on, and asking them is a
// second round trip with a stranger who has already been let down once.
//
// So the message carries the answers to the questions he would otherwise have
// to ask: which page, which browser, how wide the screen was, which build, and
// whether they were signed in. Every one of those has been the answer to a bug
// in this project already. The pager bug on 15 Sep was a width question. The
// avatar bug on 23 Aug was a signed-in question. The Studio 401s were a build
// question.
//
// ── AND WHAT IT DELIBERATELY DOES NOT CARRY ─────────────────────────
//
// No token, no user id, no email unless they typed one into the form
// themselves, and nothing out of localStorage. A bug report is not a reason to
// collect more about somebody than the page already had, and it lands in an
// inbox rather than in a system with access control, which is the strongest
// argument of the three.
//
// Signed in is a yes or a no, not a who. The reference on the row is what ties
// a report to a person when there is a reason to look, and looking takes a
// deliberate act rather than a glance at an email.
//
// ── A PURE FUNCTION, SO IT CAN BE TESTED AT ALL ─────────────────────
//
// Everything this needs is passed in. The browser half is read once, at the
// call site, by readBrowserFacts below, which is the only part that touches
// window and the only part a test cannot run.

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// Long enough for a real user agent, short enough that a hostile one cannot
// make the email unreadable. Everything here is capped for the same reason: a
// field somebody else controls is a field somebody else can make enormous.
const CAP = 200;
const cap = (v) => clean(v).slice(0, CAP);

export const CONTEXT_HEADING = "What the app could see";

// The order is the order he would ask in: where, then what, then who.
export const problemContext = (facts = {}) => {
  const rows = [];
  const add = (label, value) => { const v = cap(value); if (v) rows.push([label, v]); };
  add("Page", facts.route);
  add("Screen", facts.viewport);
  add("Browser", facts.userAgent);
  add("Language", facts.language);
  add("Build", facts.version);
  // A yes or a no. Written out rather than left to a boolean's own wording, so
  // the email never says "false" at somebody.
  if (typeof facts.signedIn === "boolean") rows.push(["Signed in", facts.signedIn ? "yes" : "no"]);
  if (typeof facts.savedGuides === "number") rows.push(["Saved guides", String(facts.savedGuides)]);
  return rows;
};

// Rendered as plain lines rather than JSON, because this is read by a person in
// a mail client at the end of a long day, not parsed.
export const contextBlock = (facts = {}) => {
  const rows = problemContext(facts);
  if (!rows.length) return "";
  return `${CONTEXT_HEADING}\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`;
};

// ── APPENDED TO THE MESSAGE, NOT ADDED AS A COLUMN ──────────────────
//
// A column would be tidier and would need a migration, and there is already one
// outstanding migration in this project that has been quietly failing for weeks
// (gemlyx_user_data.been). Shipping a second thing that only works after he
// runs some SQL is how the first one happened. This works the moment it
// deploys.
//
// The divider is a line nobody types by accident, so the two halves can still
// be told apart by eye and by anything reading the table later.
export const CONTEXT_DIVIDER = "---- sent by Gemlyx ----";

export const withContext = (message, facts = {}) => {
  const body = String(message ?? "").trim();
  const block = contextBlock(facts);
  if (!block) return body;
  return `${body}\n\n${CONTEXT_DIVIDER}\n${block}`;
};

// The one part that reads the browser. Separate so the rest of this file is
// testable, and defensive throughout: a report about something being broken is
// the worst possible moment for the reporting code to throw.
export const readBrowserFacts = ({ version = "", signedIn, savedGuides } = {}) => {
  const facts = { version, signedIn, savedGuides };
  try {
    if (typeof window !== "undefined") {
      // The hash, because this is a hash router and the path alone would say
      // "/" for every screen in the app.
      facts.route = `${window.location.pathname}${window.location.hash}`;
      facts.viewport = `${window.innerWidth}x${window.innerHeight}`;
    }
    if (typeof navigator !== "undefined") {
      facts.userAgent = navigator.userAgent;
      facts.language = navigator.language;
    }
  } catch { /* a locked-down browser is not a reason to lose the report */ }
  return facts;
};
