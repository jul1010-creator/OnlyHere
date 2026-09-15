# The Studio endpoints are locked against your own account

15 Sep 2026, measured in your browser on the live site rather than reasoned about.

**Every founder-gated endpoint refuses you. `GEMLYX_FOUNDER_IDS` does not contain
your user id.** One variable, one paste, and the whole Studio research half is
back.

---

## What the sweep queue was really telling you

The line under each event, "This account cannot run the social sweep.. A failed
call is not a 'no page', so it stays in the queue", is one string and it exists
in exactly one place: `api/social-find.js`, the 403 after `isFounder`. So the
queue was right to hold those rows. Nothing about them is wrong, and redrafting
or re-queueing them would have changed nothing.

## What was measured

Signed in as you, on www.gemlyxtravel.com, with the session the site was already
holding:

| call | answer |
| --- | --- |
| `/api/social-find` with your token | 403 `This account cannot run the social sweep.` |
| `/api/link-alive` with your token | 403 `This account cannot run Studio checks.` |
| `/api/scan-source` with your token | 403 `This account cannot run Studio research.` |
| `/api/social-find` with no token at all | 401 `Sign in to Studio to use this.` |

That last row is the one that settles it. The 401 comes from `resolveUser`, which
runs first. Getting a 403 instead of a 401 means your token was accepted, your
session was read, and Supabase handed back a user id. The only thing left between
that and the work is `isFounder`.

`api/places-locate.js` carries the same guard and the same message as
`scan-source`, so it is out too. `api/delete-account.js` uses `isFounder`
differently and is not part of this.

## Why it is the server variable and not the bundle

Two ids, and they agree at every point except the one that matters.

- The account the browser is signed in as: `467fb712-e3e9-4d43-b1b8-e4e1bb32b76d`,
  oliververhein@gmail.com, last sign in 04:51 today.
- The deployed bundle `index-DjlvMvVP.js` contains that same id. So
  `VITE_FOUNDER_IDS` is set correctly, it survived Vite's text substitution, and
  the client gate is working. That also rules out a repeat of the
  `import.meta?.env?` trap from last night.
- `auth.users` holds three accounts: the one above, oliver@gemlyxtravel.com
  (`c37f825f-...`), and verhein@gmail.com (`0483c2a2-...`). You are signed in as
  the first, which is also the one both `gemlyx_support` policies name, so the
  new Reports panel is pointed at the right account.

`isFounder` compares a plain string against a comma-split list, trimming each
entry, and an EMPTY list means everybody passes. So a 403 for a real signed-in
account can only mean the list is non-empty and your id is not in it.

## The fix

Set `GEMLYX_FOUNDER_IDS` to exactly:

```
467fb712-e3e9-4d43-b1b8-e4e1bb32b76d
```

for Production and Preview, then redeploy, because a Vercel function reads the
value the deployment was built with. Then press the sweep again.

The variable is marked sensitive, so neither of us can read what is in there now.
Overwriting is the only way to find out, and the likely candidates are an email
where a UUID belongs, a second account's id, or the value of another variable
pasted one row too high.

## Worth knowing afterwards

`VITE_FOUNDER_IDS` is compiled into the bundle and is therefore public. It is
what hides the Studio panel from a curious beta tester, and nothing more.
`GEMLYX_FOUNDER_IDS` on these five endpoints, plus the RLS policies, is the part
that actually holds, which is why it is worth having correct rather than empty.

An empty value would also make the sweep work, because an empty list passes
everybody. Do not use that as the fix: it would open every Studio endpoint to any
signed-in reader, and a beta tester with an account could spend your Perplexity
and API Direct budget from the developer console.
