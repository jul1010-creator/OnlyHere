# Morning, 15 Sep 2026

Everything below is committed and **verified back off your disk** file by file.
**The suite is green: 17,061 passed, 0 failed.**

Nothing is pushed. That is still your click.

One file landed silently wrong tonight: a commit of `src/App.jsx` reported
success and the old bytes were still on disk. Fourth time in this project. Every
file in this handoff was staged back and checked by size and by marker after
writing, so what is described here is what is there.

---

## 1. Do these before you push

**a. Run this in the Supabase SQL editor.** Two policies, or the new Reports
panel shows an empty list and offers you the same block.

```sql
drop policy if exists gemlyx_support_read on public.gemlyx_support;
create policy gemlyx_support_read on public.gemlyx_support
  for select to authenticated
  using ((auth.jwt() ->> 'email'::text) = 'oliververhein@gmail.com'::text);

drop policy if exists gemlyx_support_handled on public.gemlyx_support;
create policy gemlyx_support_handled on public.gemlyx_support
  for update to authenticated
  using ((auth.jwt() ->> 'email'::text) = 'oliververhein@gmail.com'::text)
  with check ((auth.jwt() ->> 'email'::text) = 'oliververhein@gmail.com'::text);
```

**b. And this one, still outstanding from before.** The "been there" list has
been failing to sync for weeks: it lives in the browser only and vanishes when
someone clears site data or opens Gemlyx on their phone.

```sql
alter table gemlyx_user_data add column if not exists been jsonb;
```

**c. Resend.** The `gemlyx` key is **Full access**. It should not be. It will sit
in a Vercel variable read by an endpoint whose only job is one POST, and Full
access lets it read every message in your logs, manage your domains and mint
other keys. On the `gemlyx` row: `...` then Edit API key, Permission
**Sending access**, Domain **gemlyxtravel.com**, Save. The token does not change,
so nothing you have pasted breaks.

**d. Supabase redirect allowlist.** Add `https://www.gemlyxtravel.com/**`
alongside the entry already there. The confirmation links carry a return route as
a query string, and an exact entry does not match a URL with one, so the "put you
back where you were" half is being dropped.

**e. Paste the email template.** `confirm-signup-email.html` is in the `OnlyHere`
folder, next to `onlyhere-project`. Authentication > Emails > Templates >
Confirm sign up, Source tab, replace the body.

### Already done, so ignore anything that says otherwise

- Site URL is `https://www.gemlyxtravel.com`, and the apex redirects to www.
- `GEMLYX_FOUNDER_IDS`, `VITE_FOUNDER_IDS` and `RESEND_API_KEY` are all in Vercel.
- `gemlyx_content` RLS was already correct. I told you to check it; that was me
  being cautious rather than me having looked. Two policies, `anyone reads
  published` for select and `only me` pinned to your email for everything else,
  both halves. Nothing to do.

---

## 2. What changed

### The confirmation round trip

Your answers were kept in `localStorage`, which is per browser, and a
confirmation link opens in the mail client's browser. So the questions came back.

A subset of the signup answers now travels in **GoTrue user metadata**, which
follows the account rather than the device, and is claimed on the first session
from whatever browser the link lands in. Deliberately a subset: metadata is
copied into the JWT, so everything there rides in the header of every request,
and `privacy.html` says phone, address and the free-text description live on the
profile row. Copying those into the auth row as a side effect of a bug fix would
have made that page untrue.

The return also says **"Mail confirmed. You are signed in."** as a toast, in all
three languages. Every other outcome on that path already had a message; success
was the only silent one, which is the one most worth saying.

### The theme changing on the way back

Same root cause, one layer down. The theme is in `localStorage` too, so a
confirmation opened elsewhere fell to `DEFAULT_THEME`, which is the navy one.

It now travels on the link, and is read by `storedTheme()` during the **first
render** rather than in an effect. That matters: reading it in
`captureRedirectSession` would have shown the wrong theme and then swapped it,
and a swap one frame later is not a fix for a complaint about swapping.

### Deleting an account

"Why do you want to delete your account?" sits **on** the confirm, not in front
of it. Five optional reasons plus a box, and the sheet says so: *"Optional, and
sent without your name on it. Delete works either way."* That wording is
load-bearing. A step inserted in front of erasure is not neutral under GDPR
article 17, and the dark-patterns guidance is specific about it. The reason is
sent with `keepalive` so it survives the navigation, carries no email, no id and
no reference, and nothing waits for it.

### Studio

Three doors, and two were open.

`studioLogin` accepted **any** Gemlyx account: it posts to the same
`grant_type=password` your readers sign in through. A beta tester could type
`/#studio`, enter their own credentials, and be in.

Now: the login checks whose account it is before storing anything, a stored
session is verified against Supabase rather than taken at its word, and the
**panel is not drawn at all** unless the signed-in reader is on the founder list.
Signed out counts as not-you once the list is set, so you sign in as a reader
first and then `/#studio` appears. That costs you one step and makes the panel
invisible rather than merely unusable.

**Do not think of `VITE_FOUNDER_IDS` as a secret.** Anything with that prefix is
compiled into the bundle. No client check is a boundary; someone determined can
edit the JS. What holds is `GEMLYX_FOUNDER_IDS` on the endpoints and the RLS
policies. The client gate stops a curious beta tester, which is the realistic
threat from 200 followers. A separate deployment is the real isolation when
Studio is worth protecting from someone who is trying.

### Feedback, and where it lands

The menu row is renamed **Feedback** and only appears for an account. The page
does not rely on that: `/support?topic=problem` is a URL anyone can type, so the
submit refuses and the button is off, under a block that says why.

**Support stays open on purpose.** It is the address in your privacy policy, and
someone exercising a right over their data must not first register with you. Same
for the "report content as illegal" topic. Only Feedback is gated.

Reports no longer email. They go to `gemlyx_support` and are read in a new
**📮 Reports** panel in Studio, next to Manage Published: unhandled first, newest
inside that, the person's words split from the browser facts, mark handled or
reopen, and their address as a mailto. Guide feedback writes the same row shape,
so the panel reads one list.

Two care points there. It reads with your **Studio token**, never the anon key,
because `gemlyx_support` has no select policy for anon on purpose. And marking
handled asks for the row back rather than trusting a 204, because a PATCH that
RLS refuses returns 204 exactly like one that succeeds. Your own note from 7 Sep
says so. Without that the tick would appear and nothing would save.

---

## 3. Three traps worth keeping

**Vite substitutes by text, not by meaning.** I wrote
`import.meta?.env?.VITE_FOUNDER_IDS`. Vite replaces the literal
`import.meta.env.VITE_FOUNDER_IDS` at build time; two question marks are a
different string, so nothing matched, no value reached the bundle, and an empty
list means open. The gate was off on the live site while the file read correctly
and the suite was green. **The only place the truth existed was the minified
bundle.** The spelling is now pinned in both directions.

**A fixture that contains the fix is not a test of the bug.** Checking the above,
I built a fixture with both spellings in one file and it showed both working, so
I told you the optional chaining was innocent. It was not: the correct line
pulled the env object into the module and the minifier folded the broken one
against it. Split into two files, one spelling each, the truth came out. I had
already sent you the wrong answer before catching it.

**The device is the wrong place for anything that has to survive leaving the
device.** Three separate bugs tonight, one shape: the signup answers, the theme,
and before them the pending guide save. `localStorage` is per browser and per
origin, and a link in an email opens somewhere else.

---

## 4. Open, for you to decide

- **`api/report-problem.js` is now unreferenced.** Nothing calls it. Left in
  place rather than deleted, because you may want a mail path back and removing
  it means removing its test block too.
- **Theme following the account.** The link carries it now, which fixes the
  confirmation trip. It does not fix opening Gemlyx on a phone a week later.
  Storing it on the profile row would, at the cost of one visible swap on a cold
  load in a new browser, because the row arrives after a network round trip.
  Your call, and I did not want to make it for you.
- **`hello@` versus `support@`.** Keep `hello@`. `support@` promises a desk with
  a response time, and you are one person. If you want it, make it an alias to
  the same inbox rather than a replacement: 19 places in the code use `hello@`,
  four of them in `terms.html` and `privacy.html`, which are documents rather
  than strings.
- **Env vars are Production only.** A Preview deployment has no founder gate at
  all, on the endpoints or in the bundle. Preview URLs are not secret. Widen the
  two founder variables to all environments if you ever open one.
