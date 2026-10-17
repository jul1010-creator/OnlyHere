-- ── GEMLYX SECURITY FIXES, 15 OCT 2026 ────────────────────────────────
-- The SQL half of the security backlog applied on 15 Oct 2026 (the fix brief
-- from the nightly reviews of 9 to 14 Oct 2026). Run it in the Supabase SQL
-- editor, top to bottom, BEFORE the code on branch security-backlog goes live
-- on Vercel: the new code calls gemlyx_take_amount (section 6) on every guide
-- save and gemlyx_partner_stats (sections 64, 65 and 73) on every partner
-- page, and both fail until these exist. Every part also works with the code
-- live today. Section 11 has a measurement to run first; read it before
-- running the file.
--
-- Safe to run more than once: every part is "if not exists", "or replace" or
-- "drop ... if exists" first. Each part names the brief's section it comes
-- from. Where a part also lives in SECURITY_LOCKDOWN_30SEP.sql, that file has
-- the same text, so the repo copy stays the source of truth.

-- ── Section 1 ─────────────────────────────────────────────────────────
-- Names in a saved or published guide are text, never markup (lockdown 3d).
create or replace function public.gemlyx_names_are_text(p jsonb) returns boolean
language sql immutable as $$
  select not (
       jsonb_path_exists(p, 'lax $.title ? (@ like_regex "<[a-z!/?]" flag "i")')
    or jsonb_path_exists(p, 'lax $.days[*].title ? (@ like_regex "<[a-z!/?]" flag "i")')
    or jsonb_path_exists(p, 'lax $.days[*].stops[*].name ? (@ like_regex "<[a-z!/?]" flag "i")')
    or jsonb_path_exists(p, 'lax $.days[*].stops[*].town ? (@ like_regex "<[a-z!/?]" flag "i")')
    or jsonb_path_exists(p, 'lax $._geo.keyvalue().key ? (@ like_regex "<[a-z!/?]" flag "i")')
  );
$$;
revoke all on function public.gemlyx_names_are_text(jsonb) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.gemlyx_names_are_text(jsonb) from anon';
  end if;
  execute 'grant execute on function public.gemlyx_names_are_text(jsonb) to authenticated';
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.gemlyx_names_are_text(jsonb) to service_role';
  end if;
end $$;

do $$
begin
  if to_regclass('public.gemlyx_guides') is not null then
    -- A check, not a policy: api/save-guide.js writes with the service key,
    -- which passes every policy but not a check. NOT VALID: old rows stay.
    alter table public.gemlyx_guides drop constraint if exists gemlyx_guides_names_are_text;
    alter table public.gemlyx_guides add constraint gemlyx_guides_names_are_text
      check (public.gemlyx_names_are_text(payload)) not valid;
  end if;
  if to_regclass('public.gemlyx_trip_library') is not null then
    drop policy if exists "members add to the library" on public.gemlyx_trip_library;
    create policy "members add to the library" on public.gemlyx_trip_library for insert to authenticated
      with check (
        id ~ '^lib_[a-z0-9]{6,24}$' and length(title) <= 160 and pg_column_size(payload) < 400000
        and jsonb_typeof(payload->'days') = 'array'
        and case when jsonb_typeof(payload->'days') = 'array'
                 then jsonb_array_length(payload->'days') between 1 and 21 else false end
        and length(coalesce(payload->>'title', '')) <= 160
        and public.gemlyx_names_are_text(payload)
      );
  end if;
end $$;

-- ── Section 6 ─────────────────────────────────────────────────────────
-- Counts kilobytes of saved guides (lockdown 0c), and a size backstop on the
-- guides table (lockdown section 3). The new save-guide code calls
-- gemlyx_take_amount on every save and refuses the save when it is missing.
create or replace function public.gemlyx_take_amount(p_day date, p_keys text[], p_amount integer, p_limits integer[])
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare i integer; used integer; k text;
begin
  if p_amount is null or p_amount < 1 then return 'bad amount'; end if;
  -- The same per-key locks as gemlyx_take_guide, in the same sorted order
  -- (security review, 12 Oct 2026, section 59).
  for k in select distinct x from unnest(p_keys) as x order by x loop
    perform pg_advisory_xact_lock(hashtext('gemlyx_take_guide:' || p_day::text || ':' || k));
  end loop;
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    used := null;
    select n into used from gemlyx_guide_allowance where day = p_day and key = p_keys[i];
    if coalesce(used, 0) + p_amount > coalesce(p_limits[i], 0) then return p_keys[i]; end if;
  end loop;
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    insert into gemlyx_guide_allowance (day, key, n) values (p_day, p_keys[i], p_amount)
    on conflict (day, key) do update set n = gemlyx_guide_allowance.n + p_amount, updated_at = now();
  end loop;
  return 'ok';
end $$;
revoke all on function public.gemlyx_take_amount(date, text[], integer, integer[]) from public, anon, authenticated;
grant execute on function public.gemlyx_take_amount(date, text[], integer, integer[]) to service_role;

do $$
begin
  if to_regclass('public.gemlyx_guides') is not null
     and not exists (select 1 from pg_constraint where conname = 'gemlyx_guides_size') then
    -- jsonb prints a little wider than JSON.stringify, so this sits above the
    -- route's 800 KB. NOT VALID: old rows stay.
    alter table public.gemlyx_guides add constraint gemlyx_guides_size check (octet_length(payload::text) < 1000000) not valid;
  end if;
end $$;

-- ── Section 7 ─────────────────────────────────────────────────────────
-- The founder's email out of the edit log on rows already stored (7 Oct
-- 2026, finding 27); new edits write "founder". Guarded so an empty log or an
-- entry that is not an object is left alone: jsonb_set with a null value would
-- have emptied the whole row. Safe to run again.
do $$
begin
  if to_regclass('public.gemlyx_content') is not null then
    update public.gemlyx_content
    set payload = jsonb_set(payload, '{__edited}',
      (select jsonb_agg(case when jsonb_typeof(e) = 'object' then (e - 'by') || jsonb_build_object('by', 'founder') else e end)
       from jsonb_array_elements(payload->'__edited') e))
    -- A case, so a log that is not a list is never handed to the array
    -- functions (a where clause does not promise its order).
    where case when jsonb_typeof(payload->'__edited') = 'array'
               then jsonb_array_length(payload->'__edited') > 0
                    and exists (select 1 from jsonb_array_elements(payload->'__edited') e
                                where jsonb_typeof(e) = 'object' and e->>'by' is distinct from 'founder')
               else false end;
  end if;
end $$;

-- ── Section 11 ────────────────────────────────────────────────────────
-- A size ceiling on each column of a member's own row (lockdown 5b).
-- BEFORE running this part, run the measurement below on its own and look at
-- the numbers: if any is above a third of its ceiling (8 MB guides, 200 KB
-- places, 50 KB profile, 200 KB places been), raise that ceiling in the
-- function to three times the number first.
--
--   select max(octet_length(saved_guides::text)) as guides,
--          max(octet_length(saved_places::text)) as places,
--          max(octet_length(profile::text)) as profile,
--          max(octet_length(to_jsonb(u) ->> 'been')) as been
--   from public.gemlyx_user_data u;
create or replace function public.gemlyx_user_data_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare r jsonb := to_jsonb(new);
begin
  if coalesce(octet_length(r ->> 'saved_guides'), 0) > 8000000
     or coalesce(octet_length(r ->> 'saved_places'), 0) > 200000
     or coalesce(octet_length(r ->> 'profile'), 0) > 50000
     or coalesce(octet_length(r ->> 'been'), 0) > 200000 then
    raise exception 'saved data too large' using errcode = '22001';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.gemlyx_user_data_guard() from public, anon, authenticated;
do $$ begin
  if to_regclass('public.gemlyx_user_data') is not null then
    drop trigger if exists gemlyx_user_data_guard on public.gemlyx_user_data;
    create trigger gemlyx_user_data_guard before insert or update on public.gemlyx_user_data
      for each row execute function public.gemlyx_user_data_guard();
  end if;
end $$;

-- ── Section 59 ────────────────────────────────────────────────────────
-- The daily counter takes one lock per key instead of one per day, so every
-- count on the site no longer waits in one queue (lockdown sections 0 and
-- 0b; section 6 above already has the same locks). Same signatures, so the
-- code live today and the new code both work with it.
create or replace function public.gemlyx_take_guide(p_day date, p_keys text[], p_limits integer[])
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare i integer; used integer; k text;
begin
  -- Counts older than 30 days go, as the privacy policy says: once a day, not
  -- inside every call's lock (security review, 5 Oct 2026), under a lock of
  -- its own so two first calls of the day do not both purge.
  if not exists (select 1 from gemlyx_guide_allowance where day = p_day and key = 'purge:done') then
    perform pg_advisory_xact_lock(hashtext('gemlyx_purge:' || p_day::text));
    if not exists (select 1 from gemlyx_guide_allowance where day = p_day and key = 'purge:done') then
      delete from gemlyx_guide_allowance where day < p_day - 30;
      insert into gemlyx_guide_allowance (day, key, n) values (p_day, 'purge:done', 1) on conflict (day, key) do nothing;
    end if;
  end if;
  -- One lock per key, not one per day (security review, 12 Oct 2026). Taken in
  -- sorted order, here and in gemlyx_refund_guide and gemlyx_take_amount, so
  -- two calls can never wait on each other in a circle.
  for k in select distinct x from unnest(p_keys) as x order by x loop
    perform pg_advisory_xact_lock(hashtext('gemlyx_take_guide:' || p_day::text || ':' || k));
  end loop;
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    used := null;
    select n into used from gemlyx_guide_allowance where day = p_day and key = p_keys[i];
    if coalesce(used, 0) >= coalesce(p_limits[i], 0) then return p_keys[i]; end if;
  end loop;
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    insert into gemlyx_guide_allowance (day, key, n) values (p_day, p_keys[i], 1)
    on conflict (day, key) do update set n = gemlyx_guide_allowance.n + 1, updated_at = now();
  end loop;
  return 'ok';
end $$;
revoke all on function public.gemlyx_take_guide(date, text[], integer[]) from public, anon, authenticated;
grant execute on function public.gemlyx_take_guide(date, text[], integer[]) to service_role;

create or replace function public.gemlyx_refund_guide(p_day date, p_keys text[], p_refund_key text, p_refund_limit integer, p_spent_key text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  used integer;
  k text;
begin
  -- The same per-key locks as gemlyx_take_guide, in the same sorted order
  -- (security review, 12 Oct 2026).
  for k in select distinct x from unnest(p_keys || array[p_refund_key, p_spent_key]) as x where x is not null order by x loop
    perform pg_advisory_xact_lock(hashtext('gemlyx_take_guide:' || p_day::text || ':' || k));
  end loop;
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

-- ── Sections 64, 65 and 73 ────────────────────────────────────────────
-- The partner list and the partner page's narrow read. The code for these
-- sections landed on 14 Oct 2026 with PARTNERS_14OCT.sql; the two statements
-- below are that file's, word for word, so running either file is enough.
-- Added here: the id and name checks section 64 asked for on the table.
create table if not exists public.gemlyx_partners (
  id text primary key,                       -- the place, e.g. 'food:123'
  name text not null default '',
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.gemlyx_partners enable row level security;
revoke all on public.gemlyx_partners from anon, authenticated;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gemlyx_partners_id_shape') then
    alter table public.gemlyx_partners add constraint gemlyx_partners_id_shape
      check (id ~ '^[a-z][A-Za-z]{0,15}:[A-Za-z0-9_-]{1,64}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'gemlyx_partners_name_size') then
    alter table public.gemlyx_partners add constraint gemlyx_partners_name_size
      check (length(name) <= 80) not valid;
  end if;
end $$;

create or replace function public.gemlyx_partner_stats(p_id text, p_from date)
returns table (day date, key text, n integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.day, a.key, a.n
  from public.gemlyx_guide_allowance a
  where a.day >= p_from
    and p_id ~ '^[a-z][A-Za-z]{0,15}:[A-Za-z0-9_-]{1,64}$'
    and (
      a.key in ('st:w:' || p_id, 'st:d:' || p_id, 'st:r:' || p_id, 'st:x:' || p_id)
      -- The busiest-hour keys, st:rh:<place>:00 to 23. The id is checked
      -- above, and its underscores escaped so LIKE reads them as themselves.
      or a.key like 'st:rh:' || replace(p_id, '_', '\_') || ':__'
    );
$$;
revoke all on function public.gemlyx_partner_stats(text, date) from public, anon, authenticated;
grant execute on function public.gemlyx_partner_stats(text, date) to service_role;

-- ── Section 74 ────────────────────────────────────────────────────────
-- A member's posts are counted one at a time with a size backstop (the post
-- guard, lockdown 3c), and every column a member writes has a size, with
-- inserts granted only on the columns the app sends (lockdown 3e). The guard
-- relies on the user_id columns lockdown sections 3 and 3c add.
create or replace function public.gemlyx_member_post_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare recent integer;
  cap integer := case tg_table_name when 'gemlyx_reviews' then 20 else 5 end;
begin
  new.created_at := now();
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'an account is needed' using errcode = '42501'; end if;
  -- Security review, 14 Oct 2026: one account's posts are counted one at a
  -- time, so a burst sent at once cannot pass the daily cap, and no row is
  -- bigger than the largest trip the app makes, whatever column it hides in.
  perform pg_advisory_xact_lock(hashtext('gemlyx_member_post_guard:' || tg_table_name || ':' || new.user_id::text));
  if octet_length(to_jsonb(new)::text) > 1000000 then
    raise exception 'post too large' using errcode = '22001';
  end if;
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 day''', tg_table_name)
    into recent using new.user_id;
  if recent >= cap then raise exception 'daily limit reached' using errcode = '54000'; end if;
  return new;
end $$;
revoke all on function public.gemlyx_member_post_guard() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.gemlyx_reviews') is not null then
    alter table public.gemlyx_reviews drop constraint if exists gemlyx_reviews_shape;
    alter table public.gemlyx_reviews add constraint gemlyx_reviews_shape check (
      length(item_type) between 1 and 40 and length(coalesce(item_name, '')) <= 200
      and length(coalesce(author, '')) <= 60 and length(text) <= 2000) not valid;
    revoke insert on public.gemlyx_reviews from anon, authenticated;
    grant insert (item_type, item_name, author, text) on public.gemlyx_reviews to authenticated;
  end if;
  if to_regclass('public.gemlyx_trip_library') is not null then
    alter table public.gemlyx_trip_library drop constraint if exists gemlyx_trip_library_shape;
    alter table public.gemlyx_trip_library add constraint gemlyx_trip_library_shape check (
      id ~ '^lib_[a-z0-9]{6,24}$' and length(title) <= 160 and pg_column_size(payload) < 400000
      and days between 0 and 60 and stops between 0 and 600
      and coalesce(cardinality(towns), 0) <= 60
      and octet_length(coalesce(array_to_string(towns, '|'), '')) <= 4000
      and length(coalesce(mode, '')) <= 40) not valid;
    revoke insert on public.gemlyx_trip_library from anon, authenticated;
    -- created_at stays in the list so the app and this file can ship in either
    -- order; the trigger sets the time whatever is sent.
    grant insert (id, title, days, stops, towns, mode, payload, created_at) on public.gemlyx_trip_library to authenticated;
  end if;
end $$;

-- ── Section 76 ────────────────────────────────────────────────────────
-- The two photo buckets lose their "public read" select rules, which only
-- let anyone list every file, and are marked public in the file (lockdown
-- section 7). Files keep their public addresses; Studio's own rule ("founder
-- writes media", for all) still uploads and replaces.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
      and coalesce(qual, '') ~ '(gemlyx-media|event-photos)'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;
insert into storage.buckets (id, name, public) values
  ('gemlyx-media', 'gemlyx-media', true), ('event-photos', 'event-photos', true)
  on conflict (id) do update set public = true;
