// ── WHAT GEMLYX KNOWS ABOUT THE PERSON IT IS WRITING FOR ─────────────
//
// Oliver, 10 Aug 2026: "from logging into Google and making an account, you
// should be able to give an 'optional' description of yourself. Same with
// making a normal account. That would help the AI get to know the person.
// Obviously we have to know the ordinary things like sex, age, and name."
//
// This is the first half of the idea he described earlier the same day: "the
// more the user communicates, the more it knows him. So if he ever asks for
// advice, it'll already have a good idea." A typed profile is the cold start.
// Learning from conversation is the part that comes after, and it should read
// and write this same row rather than growing a second store beside it.
//
// ONE ROW, NOT A NEW TABLE. This is a `profile` jsonb column on gemlyx_user_data,
// the row that already holds saved_places and saved_guides. A separate table
// would mean a second set of RLS policies to get right, a second fetch on every
// sign-in, and a second thing that can be missing. See SETUP_SQL below.
//
// STORED FIELDS ARE THE ONES THAT CHANGE A GUIDE. That is the whole test for
// whether a field belongs here, and it is a privacy rule as much as a product
// one: a Danish business collecting a field it never uses has taken on a
// liability in exchange for nothing.
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

// Bands rather than a birthdate. A band is what actually changes a
// recommendation (a stag weekend, a family half-term, an unhurried week), and a
// date of birth is a much stronger identifier that buys no extra usefulness.
export const AGE_BANDS = ["Under 25", "25-34", "35-49", "50-64", "65+"];

// ── ON THIS FIELD, HONESTLY ─────────────────────────────────────────
// Included because he asked for it, and left OPTIONAL with a decline option
// because almost nothing in a Danish travel guide turns on it. What genuinely
// changes advice is who somebody is travelling with and how they like to move,
// which are the two fields under it. Worth deleting if it never earns its place.
export const SEX_OPTIONS = ["Woman", "Man", "Other", "Prefer not to say"];

export const COMPANY = ["Solo", "As a couple", "With friends", "With kids", "With family"];
export const PACE = ["Slow, few things a day", "Balanced", "Packed, see everything"];

export const DESCRIPTION_MAX = 600;

export const EMPTY_PROFILE = { name: "", ageBand: "", sex: "", company: "", pace: "", description: "" };

const str = (v, max = 120) => String(v ?? "").trim().slice(0, max);
const oneOf = (v, list) => (list.includes(String(v ?? "").trim()) ? String(v).trim() : "");

// Everything is optional, including all of it. A profile that is entirely blank
// is a valid answer and must round-trip as one rather than becoming a row of
// empty strings that later reads as "they filled this in and said nothing".
export const cleanProfile = (raw) => ({
  name: str(raw?.name, 60),
  ageBand: oneOf(raw?.ageBand, AGE_BANDS),
  sex: oneOf(raw?.sex, SEX_OPTIONS),
  company: oneOf(raw?.company, COMPANY),
  pace: oneOf(raw?.pace, PACE),
  description: str(raw?.description, DESCRIPTION_MAX),
});

export const isBlank = (p) => {
  const c = cleanProfile(p);
  return !Object.values(c).some(v => v !== "");
};

// ── WHAT THE MODEL ACTUALLY SEES ────────────────────────────────────
// Not the raw object. A prompt fragment, in plain language, naming only the
// fields that were filled in, so an empty profile contributes nothing at all
// rather than a row of "unknown"s that a model will try to be helpful about.
//
// "Prefer not to say" is dropped here as well as being offered in the form.
// Storing a refusal and then telling the model about it would make the decline
// meaningless.
export const profileForPrompt = (p) => {
  const c = cleanProfile(p);
  const bits = [];
  if (c.name) bits.push(`They are called ${c.name}.`);
  if (c.ageBand) bits.push(`Age band: ${c.ageBand}.`);
  if (c.sex && c.sex !== "Prefer not to say") bits.push(`Sex: ${c.sex}.`);
  if (c.company) bits.push(`Usually travels: ${c.company.toLowerCase()}.`);
  if (c.pace) bits.push(`Preferred pace: ${c.pace.toLowerCase()}.`);
  if (c.description) bits.push(`In their own words: "${c.description}"`);
  if (!bits.length) return "";
  return `ABOUT THIS TRAVELLER, given by them and not inferred. Use it to choose what to recommend and how to pitch it. Never repeat it back to them as though it were a discovery, never assume anything it does not say, and if it conflicts with what they ask for in this conversation, what they ask for wins.\n${bits.join(" ")}`;
};

// ── THE COLUMN HAS TO EXIST, AND SAY SO WHEN IT DOES NOT ─────────────
// gemlyx_research shipped weeks ago and did nothing at all, because the table
// was never created and both calls sat in catch blocks commented "memory is a
// bonus, never a blocker". The only symptom was a console line nobody had a
// reason to read. So this reports a missing column as a distinct outcome rather
// than folding it into "no profile yet".
export const SETUP_SQL = `alter table gemlyx_user_data add column if not exists profile jsonb;`;

// ── IS THIS "THE COLUMN IS NOT THERE" OR JUST "IT FAILED" ───────────
// A predicate rather than an inline regex at two call sites, because the two
// were already drifting apart in review and because a rule buried in an `if`
// can only be tested by asserting on source text, which is how a test ends up
// passing against a rule that has been switched off.
//
// PostgREST says it two different ways depending on which end you hit:
//   select: {"code":"42703","message":"column gemlyx_user_data.profile does not exist"}
//   insert: {"code":"PGRST204","message":"Could not find the 'profile' column of 'gemlyx_user_data' in the schema cache"}
export const missingProfileColumn = (body) => {
  const code = String(body?.code || "");
  if (code === "42703" || code === "PGRST204") return true;
  const msg = `${body?.message || ""} ${body?.hint || ""}`;
  return /profile/i.test(msg) && /column|does not exist|schema cache/i.test(msg);
};

const headers = (session) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${session.token}`,
  "Content-Type": "application/json",
});

// Returns { profile } on success, { missingColumn: true } when the column is
// not there, or null when the call simply failed. Three different situations
// that a bare null would flatten into one.
export const fetchProfile = async (session) => {
  if (!session?.token || !session?.userId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_user_data?user_id=eq.${session.userId}&select=profile`,
      { headers: headers(session) }
    );
    const body = await res.json();
    if (!Array.isArray(body)) {
      if (missingProfileColumn(body)) return { missingColumn: true };
      return null;
    }
    return { profile: body.length ? cleanProfile(body[0].profile) : null };
  } catch { return null; }
};

export const saveProfile = async (session, profile) => {
  if (!session?.token || !session?.userId) return { ok: false };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_user_data?on_conflict=user_id`, {
      method: "POST",
      headers: { ...headers(session), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: session.userId,
        profile: cleanProfile(profile),
        updated_at: new Date().toISOString(),
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    if (missingProfileColumn(body)) return { ok: false, missingColumn: true };
    return { ok: false, error: String(body?.message || body?.hint || "") || `Save failed (${res.status})` };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
};
