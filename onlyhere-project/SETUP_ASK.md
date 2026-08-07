# The traveler's assistant: what you have to do before it works

Written 7 Aug 2026, alongside PASS 76.

The code is on disk and does nothing useful until these three things exist. It fails
politely in the meantime: the button appears, and asking returns "The question
service is not configured yet."

## 1. The table

Run this in Supabase, SQL editor:

```sql
create table if not exists public.gemlyx_ask_log (
  id         bigserial primary key,
  user_id    uuid not null,
  day        date not null,
  question   text not null,
  place      text,
  looked_up  boolean default false,
  created_at timestamptz default now()
);

-- The quota query counts rows for one person on one day, so this is the index
-- that keeps it a lookup rather than a scan as the table grows.
create index if not exists gemlyx_ask_log_user_day on public.gemlyx_ask_log (user_id, day);

-- RLS ON, and deliberately with NO policies for normal users.
-- Nobody signed in can read, insert or delete their own rows. That is the point:
-- if a traveler could insert or delete here, they could hand themselves an
-- unlimited allowance. Only the service role reaches this table, and the service
-- role bypasses RLS, so /api/ask keeps working while the browser cannot touch it.
alter table public.gemlyx_ask_log enable row level security;
```

## 2. One environment variable, in Vercel

Only one, and it is the only secret involved.

1. Open your project on **vercel.com**, then **Settings**, then **Environment Variables**.
2. Key: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: from **Supabase**, your project, **Project Settings**, **API**, the
   key labelled **`service_role`** (marked secret). Click reveal, copy it.
4. Tick all three environments: Production, Preview, Development.
5. Save, then **redeploy**. Vercel only picks up new variables on a new build,
   so nothing changes until you deploy again.

`ANTHROPIC_API_KEY` and `PERPLEXITY_API_KEY` are already there from the existing
routes, and you do not need to touch them. The Supabase project URL is not a
variable at all: it is already public inside the browser bundle, so it is simply
in the code.

**Two things about that key.** It bypasses every row level security policy in
your database, so it must never be prefixed `VITE_`, because Vite inlines
anything with that prefix into the public JavaScript. And do not paste it into a
chat, including to me. I never need to see it. If it ever does leak, rotate it in
the same Supabase screen.

## 3. The function count

Vercel Hobby allows **12 serverless functions**. `api/` now holds exactly 12
with `ask.js` added. The next API route you want will need one of the existing
ones removed first.

## What it actually does

1. Verifies the traveler's session with Supabase. Not by decoding the token,
   which only proves a string has the right shape, but by asking Supabase to
   resolve it, which also proves the account still exists.
2. Counts their questions today, UTC. **Ten.** If the count cannot be read, the
   request is refused rather than allowed, because a quota that fails open is
   not a quota.
3. Answers **from the published entry first**, since that is the only text here
   that has been fact-checked.
4. Only if the entry genuinely does not contain the answer does Perplexity go
   and look, once, narrowly. That answer is labelled on screen as looked up and
   arrives with its sources. The two kinds are never blended.
5. Logs the question **after** answering, so a failed request never costs
   somebody one of their ten.

## Changing the limit

`DAILY_LIMIT` at the top of `api/ask.js`. It is a server constant on purpose:
the browser is never told what the limit is until the server says so, and it
holds no counter of its own.

## When you add payments

Nothing here changes shape. Read the subscription status alongside the user in
step 1 and pick the limit from it. The counter, the log and the whole answer
path stay exactly as they are.
