# Overnight, 15 Sep 2026

Everything below is committed and verified back off your disk. **The suite is
green: 16,880 passed, 0 failed.** I can now run it in full myself, so I should
not be sending you red pushes any more.

Nothing is pushed. That is still your click.

---

## 1. The confirm link, which is the only thing still blocking you

You got the mail, clicked it, and got `{"error":"requested path is invalid"}`.
That error is Supabase refusing a `redirect_to` that is not on the project's
allow list.

**I tested your allow list directly.** I asked GoTrue to verify a deliberately
invalid token with four different redirect values. All four were accepted, which
means these are already allowed:

- `https://www.gemlyxtravel.com/`
- `https://www.gemlyxtravel.com`
- `https://gemlyxtravel.com`
- no redirect at all, which falls back to your Site URL

So the URLs you added are fine. The link that failed was built by the **deployed**
bundle, which does not send `redirect_to` at all, so it fell back to Site URL.

**Check Authentication > URL Configuration and make Site URL exactly:**

```
https://www.gemlyxtravel.com
```

No trailing slash, no path. If it is currently a Vercel preview URL or
`localhost`, that is your answer.

Then deploy. Once tonight's code is live, the link carries an explicit
`redirect_to` that I have already confirmed your project accepts, so it stops
depending on that one field being right.

## 2. What you asked for tonight, all built

**Report a problem.** New row in the menu, above Support: "Something is broken".
It opens the support page with the topic already chosen, so the first thing a
stranger meets is the box to type in rather than a dropdown asking them to
classify their own bad experience.

The report carries what you would otherwise have to ask for: which page, screen
size, browser, language, build, and whether they were signed in. Not who they
are: no id, no token, no email unless they type one. Every one of those facts has
been the answer to a real bug in this project already.

**It reaches your inbox.** New `api/report-problem.js` sends through Resend. The
row still goes to `gemlyx_support` exactly as before; this is the second copy,
the one that arrives on the day. **It needs one thing from you:** add
`RESEND_API_KEY` to your Vercel environment variables. Until you do, it answers
cleanly and logs a warning, and nothing breaks.

**"Satisfied with the build?"** at the end of a guide, shown only to the person
who built it, never to a stranger who opened a shared link. Yes / Not really,
then an optional box. Asked once per guide, with a "No thanks" that counts as
answered. Goes to the same inbox.

**Two long-standing items.** `bajabikes` was in `PARTNER_MERCHANTS` twice, now
once. And the `been` column: it has been answering 400 on the live site for
weeks, handled so gracefully that nobody was ever told. The SQL is now a value
rather than a comment, it appears on the account page beside the profile one, and
the console names it next to the error. **Run this once in the SQL editor:**

```sql
alter table gemlyx_user_data add column if not exists been jsonb;
```

## 3. Seven real bugs found in my own overnight code

I had a subagent review everything I wrote at speed. It found seven, all fixed,
all pinned. Three were data loss and I want you to know they existed:

**The been list was being destroyed on sign out, under a toast saying the
opposite.** `cloudSyncOk` is set only by `pushCloudSaves`, which writes places
and guides and not `been`. So one boolean about two lists decided the fate of
three, and because the been column does not exist on your database, it read
"synced" while been had never synced once. Now all three lists are asked
separately.

**The rescued been marks were dropped on the floor.** `takeStash` reads and
removes in one call, and the been half was merged only inside a branch that runs
when the column exists. On your live database that branch never runs, so the
record was deleted and that half was lost. Now restored unconditionally, first.

**A failed stash was followed by an unconditional wipe.** The copy is written
while the originals are still there, so it briefly needs double the space, and a
saved guide carries its whole itinerary. On a full browser the write failed and
the clear happened anyway. Now retried in the space the clearing just freed.

The other four: a stale `cloudSyncOk` read across the confirm dialog's await; the
auto-sent confirmation marking an address as handled before the send that then
failed; `busy` surviving a close-and-reopen so the button sat disabled over a
blank form; and the guide feedback key being derived from an id that is undefined
for its entire audience.

## 4. Left for you

1. Site URL, above. This is the one blocking you.
2. `RESEND_API_KEY` in Vercel, or the report button writes rows and sends nothing.
3. The `been` migration SQL, above.
4. `CAR_RENTAL_LINK` is still empty, waiting on the Adtraction link for Oscar.
5. Run `node tests/run.mjs`, push, let Vercel finish, then test the mail again.

## 5. One thing I got wrong three times tonight

I told you Supabase was not talking to Resend, based on the Emails page saying
"No sent emails yet". That page lists accepted messages only; rejected attempts
are in Logs, which is where you found the real answer. Before that I told you the
domain must have verified because the 500 stopped, which was also wrong. Twice I
inferred around a screen I could not read instead of waiting for it.
