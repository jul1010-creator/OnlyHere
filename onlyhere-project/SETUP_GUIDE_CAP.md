# One guide a day, and a daily ceiling

Until you do step 1, the site works exactly as before. The review screen
already asks "Are you sure? You can only generate one guide a day." and the
browser remembers it, but the server does not count anything yet.

## 1. Run this once in Supabase

Supabase, SQL Editor, New query, paste, Run.

```sql
create table if not exists public.gemlyx_guide_allowance (
  day date not null,
  key text not null,
  n integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, key)
);

-- No policies on purpose: only the server (service role) reads or writes it.
alter table public.gemlyx_guide_allowance enable row level security;

create or replace function public.gemlyx_take_guide(p_day date, p_keys text[], p_limits integer[])
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i integer;
  used integer;
begin
  -- One build at a time per day, so two clicks in the same instant cannot
  -- both take the last guide.
  perform pg_advisory_xact_lock(hashtext('gemlyx_take_guide:' || p_day::text));
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    used := null;
    select n into used from gemlyx_guide_allowance where day = p_day and key = p_keys[i];
    if coalesce(used, 0) >= coalesce(p_limits[i], 0) then
      return p_keys[i];
    end if;
  end loop;
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    insert into gemlyx_guide_allowance (day, key, n) values (p_day, p_keys[i], 1)
    on conflict (day, key) do update set n = gemlyx_guide_allowance.n + 1, updated_at = now();
  end loop;
  return 'ok';
end
$$;

revoke all on function public.gemlyx_take_guide(date, text[], integer[]) from public, anon, authenticated;
grant execute on function public.gemlyx_take_guide(date, text[], integer[]) to service_role;
```

## 1b. Stopped builds do not count (added 28 Sep 2026)

Run this too, in the same way. It lets a traveller who presses "Stop building"
get the guide back for the day. Until it is run, a stopped build still gets
its one retry, so the traveller can start again once.

```sql
create or replace function public.gemlyx_refund_guide(p_day date, p_keys text[], p_refund_key text, p_refund_limit integer, p_spent_key text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  used integer;
begin
  perform pg_advisory_xact_lock(hashtext('gemlyx_take_guide:' || p_day::text));
  -- A pass handed back once is spent, so it cannot be handed back again.
  used := null;
  select n into used from gemlyx_guide_allowance where day = p_day and key = p_spent_key;
  if coalesce(used, 0) >= 1000 then
    return 'spent';
  end if;
  -- A browser can stop only so many builds a day.
  used := null;
  select n into used from gemlyx_guide_allowance where day = p_day and key = p_refund_key;
  if coalesce(used, 0) >= coalesce(p_refund_limit, 0) then
    return p_refund_key;
  end if;
  update gemlyx_guide_allowance set n = greatest(n - 1, 0), updated_at = now()
    where day = p_day and key = any(p_keys);
  insert into gemlyx_guide_allowance (day, key, n) values (p_day, p_refund_key, 1)
    on conflict (day, key) do update set n = gemlyx_guide_allowance.n + 1, updated_at = now();
  insert into gemlyx_guide_allowance (day, key, n) values (p_day, p_spent_key, 1000)
    on conflict (day, key) do update set n = 1000, updated_at = now();
  return 'ok';
end
$$;

revoke all on function public.gemlyx_refund_guide(date, text[], text, integer, text) from public, anon, authenticated;
grant execute on function public.gemlyx_refund_guide(date, text[], text, integer, text) to service_role;
```

A stopped build stays on the `site` row, because what it spent before it
stopped was spent. It comes off the visitor, account and network rows.

## 2. Uncap yourself in Vercel

Vercel, Project, Settings, Environment Variables. Add:

| Name | Value |
|---|---|
| `GEMLYX_UNCAPPED` | your Supabase user id, or your login email. Several can be separated by commas. |

Your user id is in Supabase under Authentication, Users. The id is safer
than the email. If `GEMLYX_UNCAPPED` is not set, `GEMLYX_FOUNDER_IDS` is used
instead when that one is set. With neither, you get one guide a day like
everybody else, including in Studio.

Redeploy after adding it, because Vercel reads env vars at deploy.

## 3. Optional numbers

Leave these out to use the defaults.

| Name | Default | What it does |
|---|---|---|
| `GEMLYX_GUIDES_PER_DAY` | 40 | Guides for the whole site per Danish day. This is the spending ceiling. `0` pauses the builder for everyone but you. |
| `GEMLYX_GUIDES_PER_IP` | 4 | Per network. More than one, because phones on the same mobile network, hotel wifi or campus share one address. |
| `GEMLYX_GUIDES_PER_VISITOR` | 1 | Per browser. |
| `GEMLYX_GUIDES_PER_ACCOUNT` | 1 | Per account, across devices. |
| `GEMLYX_GUIDE_REFUNDS` | 2 | Builds one browser may stop and get back in a day. |
| `GEMLYX_GUIDE_RETRIES` | 1 | Extra tries when a build failed halfway. A retry still counts against the network and the day, since it costs the same. |

To set the ceiling in kroner, take the cost per guide from the Studio cost
meter and divide what you are willing to spend a day by it. At 2 kr a guide,
40 guides is 80 kr a day at most.

## Checking it works

Table Editor, `gemlyx_guide_allowance`. After a build there is a row per
counter for today: `site` is the day's total, and `v:`, `u:` and `ip:` rows
are one visitor, one account and one network. The network rows are hashed,
so no IP address is stored.

The table grows by about four rows a guide. To tidy it now and then:

```sql
delete from public.gemlyx_guide_allowance where day < current_date - 30;
```

The Vercel logs say `build-pass not counting:` with a reason whenever a build
was let through without being counted (table missing, Supabase down), so a
cap that has quietly stopped counting shows up there.

## What this does not cover

It counts guide builds made through the site. Someone calling the AI
endpoints directly, without the site, is only stopped by the origin check
from 17 Aug (GEMLYX_SECURITY_17AUG.md, section 3). Adding a per-call limit
on those endpoints is the next step if that ever shows up in the bill.
