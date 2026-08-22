// /api/ask.js
//
// ── THE TRAVELER'S ASSISTANT, ANSWERED SERVER SIDE ───────────────────
// Oliver, 7 Aug 2026: "There is a studio/admin assistant and a paid subscriber
// assistant ready on every page to answer questions", and earlier, on cost:
// give every logged-in traveler a small daily budget, enforced server side, no
// paywall yet.
//
// WHY THIS IS A SERVER ROUTE AND NOT A FEW LINES IN THE COMPONENT.
// A limit counted in the browser is not a limit. Anyone can open devtools, set
// the counter to zero, and spend his Anthropic and Perplexity credit all night.
// The count has to live somewhere the person asking cannot reach, which means
// the database, written with the service role key, from here.
//
// THE SHAPE OF AN ANSWER, and it matches the Studio assistant on purpose:
//   1. Answer from the published entry, which is the thing that was actually
//      fact-checked. If it is in there, that is the answer and it is free of
//      a live search.
//   2. If the entry genuinely does not have it, the model says NOT_IN_ENTRY and
//      Perplexity goes and looks, once, narrowly.
//   3. The two are never blended. A looked-up answer says so and carries its
//      sources, so a reader can always tell which kind they are holding.
//
// SETUP: exactly ONE new environment variable in Vercel.
//
//   SUPABASE_SERVICE_ROLE_KEY   Supabase > Project Settings > API > service_role
//
// It bypasses row level security, which is precisely why the quota can be
// trusted and precisely why it must never be prefixed VITE_: Vite inlines
// anything with that prefix straight into the public bundle.
//
// The project URL is NOT an environment variable, because it is not a secret.
// It already ships inside the browser bundle in src/config.js, so asking Oliver
// to copy it into Vercel would have been one more step protecting nothing.
// ANTHROPIC_API_KEY and PERPLEXITY_API_KEY are already set for the existing
// routes. The gemlyx_ask_log table is in SETUP_ASK.md.

const DAILY_LIMIT = 10;          // per logged-in traveler, per UTC day
const MAX_QUESTION = 500;        // characters. A question, not a document.
const NOT_IN_ENTRY = "NOT_IN_ENTRY";

const json = (res, code, body) => res.status(code).json(body);

// The day key. UTC on purpose: a local-midnight reset would hand anyone willing
// to change their clock a second allowance every day.
const todayKey = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });

  // Public, and already in the client bundle. The env var is only here so a
  // future project move needs no code change.
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://vpxfahjnerkkkoueovhl.supabase.co";
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
  if (!SERVICE_KEY) return json(res, 500, { error: "The question service is not switched on yet." });
  if (!ANTHROPIC) return json(res, 500, { error: "The question service is not switched on yet." });

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return json(res, 401, { error: "Sign in to ask a question." });

  // WHO IS ASKING. Supabase is asked to resolve the token rather than this
  // route decoding it: a decoded JWT proves the shape of a string, not that the
  // account still exists or that the session was not revoked.
  let userId = null;
  try {
    const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!who.ok) return json(res, 401, { error: "Your session has expired. Sign in again." });
    const u = await who.json();
    userId = u?.id;
  } catch {
    return json(res, 503, { error: "Could not verify your session just now." });
  }
  if (!userId) return json(res, 401, { error: "Sign in to ask a question." });

  const { question, entry, entryName, lang, nearby, traveller } = req.body || {};
  // ── ANSWER IN THE LANGUAGE THEY READ IN ─────────────────────────
  // Oliver, 15 Aug 2026, on somebody who only reads Mandarin. Neither prompt in
  // this file said a word about language, so both answered in English and
  // nobody chose that. The client sends the tag because a serverless handler
  // has no navigator; the WORDING lives here so the two prompts below cannot
  // drift, and so does the rule that matters most: a station name is not
  // translated, because the traveller has to match it against a sign.
  //
  // Deliberately inlined rather than imported from src/: api/ deploys as
  // separate serverless functions and does not share the client bundle.
  // ── AND THE ORDERING BUG WAS STILL IN HERE ────────────────────────
  // readerLanguage.js found and fixed this on 17 August, for the chat only: the
  // block opened with "ANSWER IN DANISH." in capitals and put "match the
  // language they used" in a trailing clause, so the browser setting won a
  // fight it was never meant to be in. A Danish phone typing English got Danish
  // back. That is half of Denmark's phones. The identical arrangement survived
  // here because this string is deliberately a separate copy, which is the cost
  // of not being able to import from src/. Reordered to match: the typed
  // language leads, in capitals, and the tag is named as the hint it is.
  const answerIn = (!lang?.name || /^en/i.test(String(lang.tag || ""))) ? "" :
    `\n\nMATCH THE LANGUAGE OF THE QUESTION. Read the question below and reply in the language it was written in. That rule outranks everything else in this paragraph. Their browser is set to ${lang.tag}, which suggests ${lang.name}: that is a hint about a device, not a statement about the person, so use it only when the question itself gives you nothing to go on.\nNEVER TRANSLATE A NAME. Place names, station and stop names, street names, ferry routes and the names of festivals and venues stay exactly as the entry writes them, because the traveller has to match them against a sign or a departure board that will not be translated. Prices stay in DKK with the figure unchanged.`;
  const q = String(question || "").trim().slice(0, MAX_QUESTION);
  if (!q) return json(res, 400, { error: "Ask me something first." });

  // ── THE QUOTA ──────────────────────────────────────────────────────
  // Counted from the log rather than an incrementing column, so a crash between
  // "charge" and "answer" cannot leave someone charged for nothing. The row is
  // written AFTER a successful answer for the same reason: a failed request
  // should not cost a traveler one of their ten.
  // ── AUDIT, 10 AUG 2026: THE QUOTA APPLIED TO NOBODY ────────────────
  // The block below checked `catch` but never `countRes.ok`, and fetch only
  // rejects on a network fault. So a missing gemlyx_ask_log table (PostgREST
  // answers 404 / PGRST205), a service key with the wrong scope (401), or an
  // RLS refusal (403) all arrived as a RESOLVED response carrying no
  // content-range header. Then:
  //
  //     "" -> "".split("/")[1] -> undefined -> parseInt(undefined) -> NaN
  //     !Number.isFinite(NaN) -> used = 0
  //
  // A read that FAILED was laundered into "they have used none", so the limit
  // could never be reached, and the catch block's own rule (a quota that cannot
  // be read must not become a quota that does not apply) was unreachable for
  // the failure that actually happens.
  //
  // AND THE TABLE HAS NEVER EXISTED: SETUP_ASK.md, named above as the home of
  // its SQL, is not in this repo. So this is not hypothetical. Every question
  // asked has been unmetered, each one firing up to two Claude calls and a
  // Perplexity call, while AskGemlyx reported "10 questions left today" because
  // the logging write no-ops the same way. The gemlyx_research shape again,
  // except this one costs money per request rather than merely doing nothing.
  const day = todayKey();
  let used = 0;
  try {
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_ask_log?select=id&user_id=eq.${userId}&day=eq.${day}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: "count=exact", Range: "0-0" } }
    );
    if (!countRes.ok) {
      console.warn(`ask: quota read failed (${countRes.status}). A 404 or PGRST205 means gemlyx_ask_log does not exist. create table gemlyx_ask_log (id bigserial primary key, user_id uuid not null, day date not null, created_at timestamptz default now()); create index on gemlyx_ask_log (user_id, day);`);
      return json(res, 503, { error: "Could not check your question allowance just now. Try again in a moment." });
    }
    // No header is not zero. It means the answer carried no count, and the only
    // honest reading of that is that the allowance is unknown.
    const parsed = parseInt(String(countRes.headers.get("content-range") || "").split("/")[1], 10);
    if (!Number.isFinite(parsed)) {
      console.warn("ask: quota response carried no content-range count. Refusing rather than serving an unmetered answer.");
      return json(res, 503, { error: "Could not check your question allowance just now. Try again in a moment." });
    }
    used = parsed;
  } catch {
    // A quota that cannot be read must not become a quota that does not apply.
    return json(res, 503, { error: "Could not check your question allowance just now. Try again in a moment." });
  }
  if (used >= DAILY_LIMIT) {
    return json(res, 429, {
      error: `That is your ${DAILY_LIMIT} questions for today. It resets at midnight UTC.`,
      used, limit: DAILY_LIMIT,
    });
  }

  const askClaude = async (prompt, maxTokens) => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `Claude failed (${r.status})`);
    return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  };

  try {
    // 1. THE ENTRY FIRST. It is the only text here that has been fact-checked,
    // so it outranks anything a model happens to know about Denmark.
    const entryJson = JSON.stringify(entry || {}, null, 2).slice(0, 24000);

    // ── AND THE LIBRARY SECOND, BEFORE ANY SEARCH ────────────────────
    //
    // Oliver, 21 Aug 2026: "it pretty much just answers exactly what the page
    // says really.. and is a poor version of google."
    //
    // He asked what was near Bybjerg. This route had one row, that row does not
    // list its neighbours, so it went straight past the library to Perplexity
    // and reported that it could not confirm anywhere nearby. Roskilde Festival
    // at 23 km and Køge Festuge at 42 km were on his screen at the time, in
    // Gemlyx's own strip, put there by the same coordinates this block now
    // receives.
    //
    // In the SAME call rather than a second tier, for three reasons: both blocks
    // are Gemlyx's own checked material and neither outranks the other on
    // trustworthiness, one call is one call's latency and one call's money, and
    // an answer built from them is still an answer that needed no search, which
    // is what the "looked up just now" badge on the client claims.
    //
    // The distances are straight line and the prompt has to say so, because the
    // page says so under its own strip and an assistant quietly implying driving
    // time would contradict the page a reader is looking at.
    const near = Array.isArray(nearby) ? nearby.slice(0, 8) : [];
    const nearBlock = !near.length ? "" : `

OTHER GEMLYX ENTRIES NEAR THIS ONE, which are checked in exactly the same way and are yours to answer from:
${near.map(r => `- ${r.name}${r.note ? ` (${r.note})` : ""}: ${r.away || `${r.km} km`} away, straight line`).join("\n")}

These distances are measured in a straight line between centres. They are not driving or walking times, so never present one as a journey time, and never invent a route between two of them. If somebody asks what is nearby, or what else there is to do, or where to eat, these are the answer and you do not need to look anything up.`;

    // ── AND WHETHER IT IS FOR THEM ───────────────────────────────────
    //
    // Oliver, 21 Aug 2026: "the account will also help questions on attractions
    // and towns... because Gemlyx will be able to answer quickly that 'this
    // place is probably not for you' or 'it's low rated, but for you, it's
    // probably a great place to visit'."
    //
    // The material is already in the entry. Every content type in this product
    // ends in a Reality Check, added on 8 August for exactly this reason: a
    // heading like "Why People Love It" made criticism impossible, so the schema
    // was changed to demand a reason NOT to come. A stated downside plus a
    // stated person is enough to answer "is this for me", and that is the one
    // question a rating average cannot answer at all.
    //
    // The rule that keeps it honest is the same one the rest of this endpoint
    // runs on: FIT is reasoning, FACTS are not. It may weigh what the entry says
    // against what it knows about them; it may not invent a fact about either.
    const whoBlock = !String(traveller || "").trim() ? "" : `

WHO IS ASKING:
${String(traveller).slice(0, 1200)}

You may answer whether this place suits THEM, which is the one question a star rating cannot. Weigh what the entry already says, its downsides above all, against what is written here. Say plainly when it does not suit them, and say so first: "probably not for you" is a useful answer and a short one. When the entry is lukewarm about the place but the thing it warns about is not something they care about, say that too, in those terms.

THIS CHANGES WHAT YOU MAY CONCLUDE, NOT WHAT YOU MAY STATE. Every fact still comes from the material above. Never invent a detail to make a place fit somebody, never invent a preference they have not been recorded as having, and never present a judgement about fit as though it were a fact about the place. If what is written here does not settle whether it suits them, say what the place is like and let them decide.`;

    const first = await askClaude(
      `You are Gemlyx's assistant, answering a traveler about ONE place they are reading about.

Answer ONLY from the material below. Never add a Danish fact it does not contain, and never fill a gap from general knowledge: this guide's whole value is that what it says has been checked.

ANSWER THE QUESTION, DO NOT RECITE THE PAGE. They are looking at this entry while they type, so quoting a paragraph of it back is worth nothing to them. Give the part that answers what they asked, in a sentence or two.

IF THE MATERIAL DOES NOT CONTAIN THE ANSWER, reply with exactly ${NOT_IN_ENTRY} and one short sentence naming what is missing, and nothing else. Something else will go and look it up. Answering from memory instead is the one mistake that matters here.
${NOT_IN_ENTRY} IS A CODE, NOT A PHRASE. It is read by a machine and it must come back byte for byte, in capitals, as the very first thing in your reply, whatever language the rest of the sentence is in. Do not translate it, do not put a word in front of it, do not wrap it in quotes or bold. The sentence AFTER it is prose and follows the language rule below like everything else.

Be short and plain. No preamble. Never use an em dash or an en dash.${answerIn}

Entry:
${entryJson}${nearBlock}${whoBlock}

Question:
${q}`,
      700
    );

    let answer = first;
    let sources = [];
    let lookedUp = false;

    // 2. ONLY IF IT GENUINELY IS NOT THERE.
    // ── AND THE CHECK STOPPED BEING BYTE EXACT ──────────────────────
    // startsWith is the strictest possible reading of a token produced by a
    // model, and it silently fails open: a stray quote, a bold marker or a
    // leading word means the branch never fires, the lookup never happens, and
    // the reader gets "the entry does not say" with no attempt made and nothing
    // in any log saying why. Under a capitalised instruction to answer in
    // another language the risk was worse, because a model asked to write
    // Danish will translate a bare English token given half a chance.
    //
    // Still anchored at the START, so a normal answer that merely mentions the
    // words cannot trigger a needless Perplexity call. Only the wrapping is
    // forgiven, never the position.
    const saysNotHere = new RegExp(`^[\\s"'*_\\[(]{0,4}${NOT_IN_ENTRY}\\b`, "i").test(first);
    if (saysNotHere) {
      const PPLX = process.env.PERPLEXITY_API_KEY;
      if (!PPLX) {
        answer = `The entry does not say, and I cannot look it up right now.`;
      } else {
        lookedUp = true;
        const gap = first.slice(NOT_IN_ENTRY.length).replace(/^[\s:.-]+/, "").trim();
        const pr = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${PPLX}` },
          body: JSON.stringify({
            model: "sonar",
            max_tokens: 500,
            messages: [{
              role: "user",
              content: `Using real, current web search, answer this specific question about ${entryName || "this place"} in Denmark.

Question: ${q}
${gap ? `What is missing: ${gap}\n` : ""}
Be short and concrete. Prefer the venue's own site, the organiser, or an official transport or tourism source over an aggregator. If you cannot confirm it, say exactly that rather than offering a likely answer.`,
            }],
          }),
        });
        const pd = await pr.json();
        if (!pr.ok) throw new Error(pd?.error?.message || `Search failed (${pr.status})`);
        const research = pd?.choices?.[0]?.message?.content || "";
        sources = Array.isArray(pd?.citations) ? pd.citations.slice(0, 3) : [];
        answer = research.trim()
          ? await askClaude(
              `Answer the traveler's question using ONLY the fresh research below. Short and direct. If the research does not actually settle it, say so plainly rather than hedging. Never use an em dash or an en dash.${answerIn}\n\nQuestion: ${q}\n\nFresh research:\n${research}`,
              400
            )
          : "I could not find an answer to that just now.";
      }
    }

    // 3. CHARGE ONLY FOR AN ANSWER THAT HAPPENED.
    let spent = used;
    try {
      const logged = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_ask_log`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json", Prefer: "return=minimal",
        },
        // The question text is stored so Oliver can see what travelers actually
        // ask, which is the most useful signal this feature produces. No IP, no
        // device, nothing beyond the account that already exists.
        body: JSON.stringify({ user_id: userId, day, question: q, place: entryName || null, looked_up: lookedUp }),
      });
      if (logged.ok) spent = used + 1;
    } catch { /* the answer is already written; losing the log entry is the cheaper failure */ }

    return json(res, 200, { answer, sources, lookedUp, used: spent, limit: DAILY_LIMIT });
  } catch (err) {
    return json(res, 502, { error: String(err?.message || err) });
  }
}
