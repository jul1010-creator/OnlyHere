// ── A WAY TO REACH A PERSON, AND THE ONE THE LAW REQUIRES ───────────
//
// Oliver, 25 Aug 2026: "we need a proper customer support page. Mail you write
// from, topic, and then what you're writing."
//
// Three fields, and that is the whole of what he asked for. The rest of this
// file is one extra obligation he agreed to fold into the same page rather than
// build twice, and it changes two of those three fields in one case only.
//
// ── WHY THE DSA IS HERE AND NOT IN ITS OWN BUILD ────────────────────
//
// EU_COMPLIANCE_24AUG.md recorded the gap: Gemlyx hosts stranger text, reviews
// on entry pages and the Suggest a Place inbox, which makes it a HOSTING SERVICE
// under Regulation (EU) 2022/2065. Micro and small enterprises are exempt from
// the online-platform duties. They are not exempt from the hosting ones, and the
// hosting one is Article 16: anybody must be able to notify the provider of
// content they consider illegal, and the mechanism must be easy to access and
// user-friendly.
//
// There was no way to report anything at all. Asked whether to build the report
// route separately, Oliver: "Yes, one page with a topic for it."
//
// ── WHAT ARTICLE 16(2) ACTUALLY REQUIRES OF THE FORM ────────────────
//
// A mechanism that allows the submission of notices containing all of:
//
//   (a) a substantiated explanation of the reasons why the content is illegal
//   (b) a clear indication of the exact electronic location, in particular the
//       exact URL, and where necessary additional information enabling the
//       content to be identified
//   (c) the name and email address of the person submitting, EXCEPT where the
//       content is considered to involve one of the offences in Articles 3 to 7
//       of Directive 2011/93/EU
//   (d) a statement confirming the submitter's good-faith belief that the
//       information in the notice is accurate and complete
//
// (a) is the message box with a different label. (b) is a URL field that only
// appears on this topic. (d) is a tick box whose words are below, because a
// statement the submitter never read is not a statement they made.
//
// (c) IS THE ONE THAT LOOKS LIKE A MISTAKE AND IS NOT. The carve-out means the
// mechanism may not REQUIRE identification for that category of offence, so on
// the report topic the email address becomes optional, and the form says what
// leaving it blank costs: nobody can be told what was decided. Everywhere else
// on this page it stays required, because Oliver's own sentence starts with
// "mail you write from" and a support request nobody can answer is not support.
// Article 16(4) ties the two together and confirms the reading: the duty to
// confirm receipt applies "where the notice contains the electronic contact
// details".
//
// NOT LEGAL ADVICE. The reading is written down so a lawyer can check it rather
// than rediscover it, which is the same standing as EU_COMPLIANCE_24AUG.md.

// ── THE TOPIC LIST IS A CLOSED VOCABULARY ───────────────────────────
//
// placeThemes.js already argues this at length and it is the same argument:
// free text cannot be filtered, cannot be counted, and no two people write it
// the same way. It matters more here than on a card, because the first thing he
// will want from an inbox is "how many of these are about the same thing".
//
// Kept short on purpose. A dropdown long enough to describe every possible
// message describes none of them, and a person who cannot find their own case
// picks the first entry, which makes the field noise.
export const SUPPORT_TOPICS = [
  { id: "question", label: "A question about a trip or a place" },
  { id: "wrong", label: "Something on a page is wrong or out of date" },
  { id: "account", label: "Account, sign-in or a saved guide" },
  { id: "privacy", label: "Privacy, my data, or deleting my account" },
  { id: "report", label: "Report content as illegal or harmful" },
  { id: "business", label: "A business or partnership enquiry" },
  { id: "other", label: "Something else" },
];

// Named rather than written as a string in four places. The report topic is the
// only one that changes what the form requires, so every branch that asks "is
// this the DSA one" asks it here.
export const REPORT_TOPIC = "report";

export const topicIds = () => SUPPORT_TOPICS.map(t => t.id);
export const topicLabel = (id) => (SUPPORT_TOPICS.find(t => t.id === id) || {}).label || "";
export const isTopic = (id) => topicIds().includes(String(id || ""));

// Article 16(2)(d), in words a person can actually read before ticking. Kept as
// one sentence: a good-faith statement written as a paragraph of legal register
// is a paragraph nobody reads, and an unread statement is not one they made.
export const GOOD_FAITH_STATEMENT =
  "I believe in good faith that the information in this report is accurate and complete.";

// What the message box asks for, per topic. Article 16(2)(a) wants a
// SUBSTANTIATED explanation, and "Tell us what's wrong" does not ask for one.
export const MESSAGE_PROMPT = {
  report: "Explain why you believe this content is illegal. Be specific: what it says, and which law or right it breaks.",
  wrong: "What does the page say, and what is actually true? A link to where you saw it helps.",
  privacy: "Tell us what you would like us to do. A copy of your data, a correction, or deletion.",
};
export const MESSAGE_PROMPT_DEFAULT = "What would you like to tell us?";

export const messagePrompt = (topic) => MESSAGE_PROMPT[topic] || MESSAGE_PROMPT_DEFAULT;

// ── LIMITS ──────────────────────────────────────────────────────────
// The minimum is not an obstacle course. It exists because "hi" and "call me"
// arrive in every inbox and neither can be answered, and because Article
// 16(2)(a) asks for a substantiated explanation rather than an accusation.
export const MESSAGE_MIN = 15;
export const MESSAGE_MAX = 4000;
export const EMAIL_MAX = 254; // RFC 5321 path limit, and the one every mail host enforces

const said = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// ── EMAIL ───────────────────────────────────────────────────────────
//
// Deliberately loose. This is not authentication and there is nothing to
// protect: the only cost of accepting a wrong address is that a reply bounces
// on his side, and the cost of rejecting a real one is that somebody with a
// legitimate complaint is told their own address is invalid by a website. Every
// clever email regex ever written rejects addresses that work.
//
// So: something, an @, something, a dot, something, no spaces. That refuses the
// two mistakes people actually make, a name typed into the wrong box and a
// half-finished address, and refuses nothing that could deliver.
export const looksLikeEmail = (v) => {
  const s = said(v);
  if (!s || s.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s);
};

// Article 16(2)(b) asks for the exact electronic location. A page title is not
// one, and neither is "the review on the Skagen page", so this wants something
// that resolves. Same spirit as hasEntrySources in provenance.js: storing the
// words does not make it a location.
export const looksLikeUrl = (v) => {
  const s = said(v);
  if (!s) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return !!u.hostname && u.hostname.includes(".");
  } catch { return false; }
};

// ── WHAT IS WRONG WITH THIS FORM, FIELD BY FIELD ────────────────────
//
// Returns a list rather than the first fault, so somebody who left two things
// out is told both at once instead of being sent round the loop twice. Same
// shape as bodyEditProblems and offerProblems, and for the same reason.
//
// EVERY PROBLEM NAMES ITS FIELD. A message that says "something is missing"
// without saying which box is the publish gate this repository has already had
// to fix once: a gate whose instructions cannot be followed is a wall.
export const supportProblems = (form = {}) => {
  const out = [];
  const topic = said(form.topic);
  const email = said(form.email);
  const message = String(form.message ?? "").trim();
  const reporting = topic === REPORT_TOPIC;

  if (!topic) out.push({ field: "topic", message: "Choose what this is about." });
  else if (!isTopic(topic)) out.push({ field: "topic", message: "Choose what this is about." });

  // The Article 16(2)(c) carve-out, and the only place on this page where an
  // address is optional.
  if (!email) {
    if (!reporting) out.push({ field: "email", message: "We need an address to reply to." });
  } else if (!looksLikeEmail(email)) {
    out.push({ field: "email", message: "That does not look like an email address." });
  }

  if (!message) out.push({ field: "message", message: "Tell us what you would like to say." });
  else if (message.length < MESSAGE_MIN) out.push({ field: "message", message: "A little more detail, so we can actually help." });
  else if (message.length > MESSAGE_MAX) out.push({ field: "message", message: `That is longer than we can take. ${MESSAGE_MAX} characters is the limit.` });

  if (reporting) {
    if (!said(form.url)) out.push({ field: "url", message: "Give the address of the page the content is on." });
    else if (!looksLikeUrl(form.url)) out.push({ field: "url", message: "That does not look like a web address." });
    if (!form.goodFaith) out.push({ field: "goodFaith", message: "Please confirm the statement below before sending a report." });
  }

  return out;
};

export const problemFor = (problems, field) =>
  (problems || []).filter(p => p.field === field).map(p => p.message)[0] || "";

// ── THE REFERENCE ───────────────────────────────────────────────────
//
// Shown on screen and stored on the row, so a person who writes again has
// something to quote and he has something to search. Six characters from an
// alphabet with no 0/O/1/I/L, because this is a string somebody reads off a
// screen and types into an email, and those four are the ones that get typed
// wrong.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const supportReference = (rand = Math.random) => {
  let out = "";
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length) % REF_ALPHABET.length];
  return `GX-${out}`;
};

// ── THE ROW ─────────────────────────────────────────────────────────
//
// An allow-list, exactly like shapeForLive, and for the identical reason: a
// field not named here does not reach the database. A form is the one place in
// this app where a stranger controls what is in the object, so "everything in
// the form object" is the wrong write.
//
// `url` and `good_faith` are stored ONLY on a report. Carrying an empty URL on
// every question would make the report column meaningless as a filter, and
// storing a good-faith flag against a message where nobody was asked for one
// would record a statement that was never made.
//
// AND THERE IS NO `page` FIELD, WHICH WAS A DELIBERATE DELETION. The obvious
// version of this form records where the person came from, and it would be
// genuinely useful on "something on a page is wrong". It is also a second
// collection point in a privacy notice that has to describe every one of them,
// bought for a fact the person can simply type. The message prompt asks for the
// link instead.
export const supportPayload = (form = {}, { reference, at } = {}) => {
  const topic = said(form.topic);
  const email = said(form.email);
  const row = {
    reference: reference || supportReference(),
    topic,
    email: email || null,
    message: String(form.message ?? "").trim(),
    created_at: at || new Date().toISOString(),
  };
  if (topic === REPORT_TOPIC) {
    row.url = said(form.url) || null;
    row.good_faith = !!form.goodFaith;
  }
  return row;
};

export const SUPPORT_TABLE = "gemlyx_support";

// ── AND THE FALLBACK, WHICH IS THE POINT OF HAVING ONE ──────────────
//
// If the insert fails, for any reason, the person in front of the form has
// written something and it must not evaporate. So the page hands them a mailto
// carrying what they already typed, and says plainly that nothing was recorded.
//
// This is also what makes the page useful the moment it is pushed, BEFORE the
// table exists. The SQL below is his to run; until he does, every submission
// takes this path and still reaches him.
//
// The body is encoded rather than concatenated, because a message containing an
// ampersand would otherwise silently truncate at it, which is the failure mode
// where somebody's complaint arrives with half of itself missing.
export const SUPPORT_EMAIL = "hello@gemlyxtravel.com";
export const PRIVACY_EMAIL = "privacy@gemlyxtravel.com";

export const supportMailto = (form = {}, reference = "") => {
  const topic = said(form.topic);
  const to = topic === "privacy" ? PRIVACY_EMAIL : SUPPORT_EMAIL;
  const subject = `Gemlyx${reference ? ` ${reference}` : ""}: ${topicLabel(topic) || "Support"}`;
  const lines = [
    said(form.email) ? `From: ${said(form.email)}` : "",
    topic === REPORT_TOPIC && said(form.url) ? `Content reported: ${said(form.url)}` : "",
    topic === REPORT_TOPIC && form.goodFaith ? GOOD_FAITH_STATEMENT : "",
    "",
    String(form.message ?? "").trim(),
  ].filter(Boolean);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
};

// ── WHAT THE CONFIRMATION MAY SAY ───────────────────────────────────
//
// Article 16(4) requires a confirmation of receipt without undue delay where
// the notice carries contact details. The screen IS that confirmation, and it
// is why the reference is shown rather than merely stored.
//
// AND IT MAY NOT SAY MORE THAN IS TRUE. Nothing in this app sends email: the
// only mail Gemlyx has ever sent is Supabase's own signup confirmation, through
// Supabase's SMTP. So this does not say "we have emailed you a copy", does not
// promise a response within any number of hours, and does not say "our team".
// One person reads this inbox and the sentence says so. The same rule the
// weather strip and the ticket refusals already follow, arriving at the one
// screen where the temptation to sound like a company is strongest.
export const supportReceipt = (form = {}, reference = "") => {
  const reporting = said(form.topic) === REPORT_TOPIC;
  const anonymous = reporting && !said(form.email);
  return {
    reference,
    title: reporting ? "Report received" : "Message received",
    lines: [
      `Your reference is ${reference}. Quote it if you write again.`,
      reporting
        ? "Gemlyx is run by one person, who reads every report and decides on it. Nothing is removed automatically."
        : "Gemlyx is run by one person, who reads everything that arrives here.",
      anonymous
        ? "You did not leave an address, so there is no way to tell you what was decided."
        : "A reply comes from a person, not a system, so it will not be instant.",
    ],
  };
};

// ── THE TABLE ───────────────────────────────────────────────────────
//
// Written here rather than in a migration folder because there is no migration
// folder, and manageGroups.js already carries its `updated_at` trigger the same
// way: the SQL lives next to the code that depends on it, so the two cannot
// drift apart unnoticed.
//
// RLS with insert-only for anon is the shape that matters. `gemlyx_suggestions`
// takes the same anonymous POST and this follows it, with one difference: SELECT
// is denied to anon outright. A suggestion box holding "there is a nice bakery
// in Ribe" and an inbox holding somebody's email address next to a complaint
// about a named business are not the same object, and the second must not be
// readable by anyone holding the public key, which is everyone.
export const SUPPORT_SETUP_SQL = `-- Gemlyx support inbox. Run once in the Supabase SQL editor.
create table if not exists public.gemlyx_support (
  id          bigserial primary key,
  reference   text not null,
  topic       text not null,
  email       text,
  message     text not null,
  url         text,
  good_faith  boolean,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists gemlyx_support_created_idx on public.gemlyx_support (created_at desc);
create index if not exists gemlyx_support_reference_idx on public.gemlyx_support (reference);

alter table public.gemlyx_support enable row level security;

-- Anyone may write. Nobody holding the public key may read: the anon key ships
-- in the bundle, so a select policy here would publish every message and every
-- address in this table to anybody who opened the developer console.
drop policy if exists gemlyx_support_insert on public.gemlyx_support;
create policy gemlyx_support_insert on public.gemlyx_support
  for insert to anon, authenticated with check (true);
`;
