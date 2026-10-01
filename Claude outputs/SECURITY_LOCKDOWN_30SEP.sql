-- ── GEMLYX SECURITY LOCKDOWN, 30 SEP 2026 (revised 1 OCT) ──────────
-- After Fable's audit. Safe to run more than once. Supabase runs this as one
-- transaction, so it either all applies or none of it does.
-- Tables that do not exist are skipped, never an error.

-- 0. The daily counter the AI gate uses (same as SETUP_GUIDE_CAP.md, restated
--    so the gate can never meet a missing table).
create table if not exists public.gemlyx_guide_allowance (
  day date not null,
  key text not null,
  n integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, key)
);
alter table public.gemlyx_guide_allowance enable row level security;

create or replace function public.gemlyx_take_guide(p_day date, p_keys text[], p_limits integer[])
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare i integer; used integer;
begin
  perform pg_advisory_xact_lock(hashtext('gemlyx_take_guide:' || p_day::text));
  -- Counts older than 30 days go, as the privacy policy says (1 Oct 2026).
  delete from gemlyx_guide_allowance where day < p_day - 30;
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

-- 1. Who the founder is, for every write policy below.
create or replace function public.is_founder() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce(auth.uid() = '467fb712-e3e9-4d43-b1b8-e4e1bb32b76d'::uuid, false)
      or coalesce((auth.jwt() ->> 'email') = 'oliververhein@gmail.com', false);
$$;

-- 2. His tools and the content readers see: every old policy goes, then a read
--    rule for what the public site needs, and writes for him alone.
do $$
declare
  t text; pol record;
  reads jsonb := jsonb_build_object(
    'gemlyx_content',  'published = true or public.is_founder()',
    'gemlyx_sources',  'true',
    'gemlyx_facts',    'published = true or public.is_founder()',
    'gemlyx_notices',  'true',
    'gemlyx_feeds',    'public.is_founder()',
    'gemlyx_research', 'public.is_founder()',
    'photo_overrides', 'true',
    'craft_items',     'true'
  );
begin
  for t in select jsonb_object_keys(reads) loop
    if to_regclass('public.' || t) is null then continue; end if;
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read %s" on public.%I for select using (%s)', t, t, reads ->> t);
    execute format('create policy "founder writes %s" on public.%I for all to authenticated using (public.is_founder()) with check (public.is_founder())', t, t);
  end loop;
end $$;

-- 3. What members write: reviews and the trip library need an account now
--    (Oliver, 30 Sep 2026), with limits on size; he can remove anything.
do $$
declare pol record;
begin
  if to_regclass('public.gemlyx_reviews') is not null then
    execute 'alter table public.gemlyx_reviews add column if not exists user_id uuid default auth.uid()';
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'gemlyx_reviews' loop
      execute format('drop policy %I on public.gemlyx_reviews', pol.policyname);
    end loop;
    alter table public.gemlyx_reviews enable row level security;
    create policy "reviews are readable" on public.gemlyx_reviews for select using (true);
    create policy "members review" on public.gemlyx_reviews for insert to authenticated
      with check (user_id = auth.uid() and length(text) between 1 and 2000 and length(coalesce(author, '')) <= 60 and length(item_name) <= 200);
    create policy "founder moderates reviews" on public.gemlyx_reviews for delete to authenticated using (public.is_founder());
  end if;

  if to_regclass('public.gemlyx_trip_library') is not null then
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'gemlyx_trip_library' loop
      execute format('drop policy %I on public.gemlyx_trip_library', pol.policyname);
    end loop;
    alter table public.gemlyx_trip_library enable row level security;
    create policy "library is readable" on public.gemlyx_trip_library for select using (true);
    create policy "members add to the library" on public.gemlyx_trip_library for insert to authenticated
      with check (id ~ '^lib_[a-z0-9]{6,24}$' and length(title) <= 160 and pg_column_size(payload) < 400000);
    create policy "founder prunes library" on public.gemlyx_trip_library for delete to authenticated using (public.is_founder());
  end if;

  -- A saved guide is shared by its link. Anyone may still save one (an older
  -- open tab, a guide built before tonight), but only in the shape the app
  -- makes, and nobody may change or delete one.
  if to_regclass('public.gemlyx_guides') is not null then
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'gemlyx_guides' loop
      execute format('drop policy %I on public.gemlyx_guides', pol.policyname);
    end loop;
    alter table public.gemlyx_guides enable row level security;
    -- Read by its link only, through gemlyx_guide(id) below. A select rule
    -- for everybody let anyone list every guide ever saved.
    create policy "founder reads guides" on public.gemlyx_guides for select to authenticated using (public.is_founder());
    create policy "guides are saved in the app's shape" on public.gemlyx_guides for insert to anon, authenticated
      with check (id ~ '^[a-z0-9]{6,24}$' and pg_column_size(payload) < 800000);
    create policy "founder removes guides" on public.gemlyx_guides for delete to authenticated using (public.is_founder());
  end if;
end $$;

-- 3b. One guide by its link. The app and the link previews read a guide
--     here and only here; holding the id is the only way in.
do $$
begin
  if to_regclass('public.gemlyx_guides') is not null then
    execute $f$
      create or replace function public.gemlyx_guide(p_id text) returns jsonb
      language sql stable security definer set search_path = public, pg_temp as $q$
        select payload from public.gemlyx_guides where id = p_id limit 1;
      $q$
    $f$;
    revoke all on function public.gemlyx_guide(text) from public;
    grant execute on function public.gemlyx_guide(text) to anon, authenticated;
    -- The chat that built each guide was saved inside it until tonight. It is
    -- never read from a saved link, so it comes out of every row.
    update public.gemlyx_guides set payload = payload - '_convoText' where payload ? '_convoText';
  end if;
end $$;

-- 4. Forms visitors send (reports, suggestions, workshop requests): their own
--    insert rules stay; reading and marking handled is his alone.
do $$
declare t text;
begin
  foreach t in array array['gemlyx_suggestions', 'craft_requests', 'gemlyx_support'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "founder reads %s" on public.%I', t, t);
    execute format('create policy "founder reads %s" on public.%I for select to authenticated using (public.is_founder())', t, t);
    execute format('drop policy if exists "founder handles %s" on public.%I', t, t);
    execute format('create policy "founder handles %s" on public.%I for update to authenticated using (public.is_founder()) with check (public.is_founder())', t, t);
  end loop;
end $$;

-- 5. A member's own data, and nobody else's.
do $$
begin
  if to_regclass('public.gemlyx_user_data') is not null then
    alter table public.gemlyx_user_data enable row level security;
    drop policy if exists "own data" on public.gemlyx_user_data;
    create policy "own data" on public.gemlyx_user_data for all to authenticated
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- 6. Server-only tables: no door for the browser at all.
do $$
declare t text;
begin
  foreach t in array array['gemlyx_guide_allowance', 'gemlyx_ask_log'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- 7. Uploaded images: anyone may look, only he may upload or replace.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (coalesce(qual, '') ~ '(gemlyx-media|event-photos)' or coalesce(with_check, '') ~ '(gemlyx-media|event-photos)')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;
create policy "founder writes media" on storage.objects for all to authenticated
  using (bucket_id in ('gemlyx-media', 'event-photos') and public.is_founder())
  with check (bucket_id in ('gemlyx-media', 'event-photos') and public.is_founder());
update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  where id in ('gemlyx-media', 'event-photos');

-- 8. What is in place now, one row per table.
select c.relname as tbl, c.relrowsecurity as rls,
  coalesce(string_agg(p.policyname || ' [' || p.cmd::text || ' ' || array_to_string(p.roles, ',') || '] using(' || coalesce(p.qual, '-') || ') check(' || coalesce(p.with_check, '-') || ')', ' ;; '), 'NO POLICIES') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;
