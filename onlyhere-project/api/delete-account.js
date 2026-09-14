// /api/delete-account.js
// Deletes the signed-in person's ACCOUNT, meaning the login itself, and not
// only the rows attached to it.
//
// Oliver, 14 Sep 2026, ten minutes after turning email confirmation on: "we need
// a log out option.. so I can create a new one. Also, make a 'delete account' in
// the account info."
//
// ── WHAT WAS THERE ALREADY, AND WHY IT WAS NOT THIS ─────────────────
//
// utils/auth.js has deleteMyData, and AboutMePage has a button labelled "Delete
// my data" with a line under it reading "Contact hello@gemlyxtravel.com to also
// remove the sign-in record." That sentence is the whole problem in his own
// product's words: the rows go and the auth user stays, so the address is still
// taken, the person cannot register again, and a GDPR erasure request ends in a
// mailbox rather than in a button.
//
// It also blocks the thing he was trying to do tonight, which is how it
// surfaced: he wanted to sign out and make a second test account and could not
// reuse his own address.
//
// ── THE ONE SECURITY PROPERTY THIS FILE HAS ─────────────────────────
//
// IT NEVER READS A USER ID FROM THE REQUEST. Not from the body, not from the
// query, not from a header. The id comes from resolveUser, which hands the
// caller's bearer token to Supabase and asks whose it is. So the worst a
// forged request can do is delete the account it already holds a valid token
// for, which is the account it is allowed to delete.
//
// A version taking `?id=` would be a public endpoint for deleting any account
// in the database, and it would look almost identical in a diff. That is why
// this paragraph exists.
//
// NOT founder-gated, unlike every other endpoint that uses resolveUser. This
// one is FOR readers, and isFounder here would lock out everybody it is built
// for. The guard is the token, and the token only ever unlocks its own row.
import { requestIsFromSite, NOT_FROM_SITE, resolveUser } from "../src/utils/apiGuard.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://vpxfahjnerkkkoueovhl.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "";

export default async function handler(req, res) {
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  // POST only. A deletion behind a GET is one a link preview, a prefetch or a
  // crawler can perform by looking at it, and this app hands its own pages to
  // crawlers on purpose.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const who = await resolveUser(req.headers, { supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY });
  if (!who.ok) {
    // resolveUser's own wording says "Sign in to Studio", which is right where
    // it is used today and wrong here: the person reading this is a traveller
    // who has never heard of Studio. The STATUS is passed through, because that
    // is a fact about the request, and the sentence is rewritten because that is
    // a fact about who is reading.
    const said = who.status === 401
      ? "You are signed out. Sign in again and the delete button will work."
      : "Could not check who you are just now. Try again in a moment.";
    return res.status(who.status).json({ error: said });
  }

  // ── AND THE DELETE ITSELF ────────────────────────────────────────
  //
  // Supabase's admin endpoint, which needs the service role key and is the only
  // way to remove an auth user: the anon key the browser holds cannot do it, by
  // design, which is why this has to be a server route at all rather than one
  // more call in utils/auth.js.
  //
  // The id is who.userId and nothing else. See the paragraph at the top.
  try {
    const gone = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(who.userId)}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    // 404 is a success from the reader's point of view: the account they asked
    // to remove is not there. Reporting it as a failure would leave somebody
    // pressing a button that has already done its job.
    if (!gone.ok && gone.status !== 404) {
      return res.status(502).json({ error: `Your data was removed, but the login could not be deleted (${gone.status}). Mail hello@gemlyxtravel.com and it will be done by hand.` });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: "Your data was removed, but the login could not be deleted just now. Mail hello@gemlyxtravel.com and it will be done by hand." });
  }
}
