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

// ── THE THREE HE ASKED FOR, AND WHY THEY TICK ───────────────────────
// Oliver, 21 Aug 2026, in the account spec: "MAKE TICKBOXES HERE! So you can
// click multiple!" then "Interests: History/Nature/Night Life/food", "Prefered
// transport: Car/Bike/Public Transport/Walks/Ship/Plane", "Prefered travelling:
// Participating in events/Hidden Gems/Common Attractions, a mix."
//
// Multi-select rather than one-of, and that is the point of them: every field
// above this line makes somebody pick a single answer, and none of these three
// has a single answer. A person who likes history AND food is the normal case,
// not an edge one, and forcing that person to pick history throws away the half
// of the answer that would have put a restaurant in their guide.
//
// These are also the first profile fields that map onto something the pipeline
// already reasons about: interestFit.js scores rows against exactly this kind of
// word, and tripBrief.js asks a traveller for interests it could have known.
export const INTERESTS = ["History", "Nature", "Nightlife", "Food"];
export const TRANSPORT = ["Car", "Bike", "Public transport", "Walks", "Ship", "Plane"];

// "A mix" is in his list and it is not a fourth thing to like, it is the answer
// "no strong preference". So it clears the others and the others clear it: see
// pickMany in ProfileSheet. Stored as an array all the same, because a caller
// reading `style` should not have to know that one of its values is special.
export const TRAVEL_STYLE_MIX = "A mix";
export const TRAVEL_STYLE = ["Participating in events", "Hidden gems", "Common attractions", TRAVEL_STYLE_MIX];

// ── WHERE THEY ARE COMING FROM, AND WHAT THAT BUYS ──────────────────
//
// Oliver, 21 Aug 2026: "In the create an account, ask what country they're from.
// Because then the guide can probably write in their currency."
//
// He asked for this straight after reading a guide line that said "hostels here
// run around DKK 600/night while central hotels start near $200" and judged it
// "just not true at all". Two currencies in one sentence, and the dollar figure
// was computed by a model rather than read off a page.
//
// SO THE FIGURE ITSELF STAYS IN DKK. api/ask.js already carries the rule for the
// language feature, and the reason generalises: "NEVER TRANSLATE A NAME. Place
// names, station and stop names... stay exactly as the entry writes them,
// because the traveller has to match them against a sign or a departure board
// that will not be translated. Prices stay in DKK with the figure unchanged."
// Everything a traveller actually pays in Denmark is priced in DKK, at the desk,
// in the app, at the bar. His call, asked directly: one dated rate line at the
// top of the guide, and no per-price arithmetic anywhere, because every bracket
// a model fills in is a number nothing checked.
//
// Stored as an ISO 3166 alpha-2 code rather than a display name, so a person who
// changes the interface language does not change what is on their row.
//
// The list is Denmark's real inbound markets plus the neighbours, not every
// country on earth: a picker nobody can scroll is worse than one that ends in
// "Somewhere else". "Somewhere else" stores nothing, which is the same as not
// answering, which is the correct behaviour for a field that is optional.
export const COUNTRIES = [
  { code: "DK", name: "Denmark", currency: "DKK" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "NO", name: "Norway", currency: "NOK" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "IE", name: "Ireland", currency: "EUR" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "PL", name: "Poland", currency: "PLN" },
  { code: "FI", name: "Finland", currency: "EUR" },
  { code: "BE", name: "Belgium", currency: "EUR" },
  { code: "AT", name: "Austria", currency: "EUR" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "IS", name: "Iceland", currency: "ISK" },
  { code: "CZ", name: "Czechia", currency: "CZK" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "BR", name: "Brazil", currency: "BRL" },
];

export const COUNTRY_CODES = COUNTRIES.map(c => c.code);
export const countryNamed = (code) => COUNTRIES.find(c => c.code === String(code || "").toUpperCase()) || null;

// The currency to quote a comparison in. Null for Denmark, because a Dane
// reading DKK needs no conversion, and null for anyone who did not say.
export const homeCurrency = (code) => {
  const c = countryNamed(code);
  return !c || c.currency === "DKK" ? null : c.currency;
};

export const DESCRIPTION_MAX = 600;

export const EMPTY_PROFILE = { name: "", country: "", ageBand: "", sex: "", company: "", pace: "", description: "", interests: [], transport: [], style: [] };

const str = (v, max = 120) => String(v ?? "").trim().slice(0, max);
const oneOf = (v, list) => (list.includes(String(v ?? "").trim()) ? String(v).trim() : "");
// Order comes from the OPTION LIST, not from the order they were tapped, so two
// people who picked the same things produce the same stored value and the same
// prompt sentence. Unknown values are dropped rather than kept, for the reason
// oneOf drops them: a stored answer nobody was offered is a bug that survives.
const manyOf = (v, list) => {
  const picked = new Set((Array.isArray(v) ? v : []).map(x => String(x ?? "").trim()));
  return list.filter(o => picked.has(o));
};

// Everything is optional, including all of it. A profile that is entirely blank
// is a valid answer and must round-trip as one rather than becoming a row of
// empty strings that later reads as "they filled this in and said nothing".
export const cleanProfile = (raw) => ({
  name: str(raw?.name, 60),
  country: oneOf(String(raw?.country ?? "").toUpperCase(), COUNTRY_CODES),
  ageBand: oneOf(raw?.ageBand, AGE_BANDS),
  sex: oneOf(raw?.sex, SEX_OPTIONS),
  company: oneOf(raw?.company, COMPANY),
  pace: oneOf(raw?.pace, PACE),
  description: str(raw?.description, DESCRIPTION_MAX),
  interests: manyOf(raw?.interests, INTERESTS),
  transport: manyOf(raw?.transport, TRANSPORT),
  style: manyOf(raw?.style, TRAVEL_STYLE),
});

export const isBlank = (p) => {
  const c = cleanProfile(p);
  // Arrays now, as well as strings. `[] !== ""` is true, so the old line called
  // a completely empty profile filled in the moment the three tick fields
  // existed, and "they filled this in and said nothing" is exactly what the
  // comment above cleanProfile says must not happen.
  return !Object.values(c).some(v => (Array.isArray(v) ? v.length > 0 : v !== ""));
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
  // Named, never converted. What this changes is how expensive things are
  // allowed to sound, not what any figure says.
  if (c.country) bits.push(`They are travelling from ${countryNamed(c.country).name}. Prices stay in DKK whatever this says: never convert a figure, and never add an approximate one in brackets.`);
  if (c.ageBand) bits.push(`Age band: ${c.ageBand}.`);
  if (c.sex && c.sex !== "Prefer not to say") bits.push(`Sex: ${c.sex}.`);
  if (c.company) bits.push(`Usually travels: ${c.company.toLowerCase()}.`);
  if (c.pace) bits.push(`Preferred pace: ${c.pace.toLowerCase()}.`);
  // ── AND THE THREE THEY TICKED ────────────────────────────────────
  // Said as a preference rather than a filter. Someone who ticked history and
  // nature has said what to lean towards, not what to delete: a guide that
  // refuses to mention the one good restaurant in a town because food went
  // unticked is obeying a box they treated as a hint.
  if (c.interests.length) bits.push(`Leans towards: ${c.interests.join(", ").toLowerCase()}. That is what to weight, not a list of the only things allowed in.`);
  if (c.transport.length) bits.push(`Happy to travel by: ${c.transport.join(", ").toLowerCase()}. Plan the moving around them, and do not build a day that needs a mode they left out.`);
  if (c.style.length) bits.push(c.style.includes(TRAVEL_STYLE_MIX) && c.style.length === 1
    ? `On famous versus hidden: no strong preference, so a mix is right.`
    : `On what a trip is for: ${c.style.join(", ").toLowerCase()}.`);
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
