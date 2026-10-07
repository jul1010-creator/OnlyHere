-- ── GEMLYX SECURITY LOCKDOWN, 30 SEP 2026 (revised 1 and 2 OCT) ────
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
  -- Counts older than 30 days go, as the privacy policy says: once a day, not
  -- inside every call's lock (security review, 5 Oct 2026).
  if not exists (select 1 from gemlyx_guide_allowance where day = p_day and key = 'purge:done') then
    delete from gemlyx_guide_allowance where day < p_day - 30;
    insert into gemlyx_guide_allowance (day, key, n) values (p_day, 'purge:done', 1) on conflict (day, key) do nothing;
  end if;
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

-- 0b. Handing back a stopped build (copied word for word from
--     SETUP_GUIDE_CAP.md on 7 Oct 2026, so the revoke is never forgotten).
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

-- 1. Who the founder is, for every write policy below. By account id only:
--    an email in a token is a claim, and a second account given the same
--    address would have passed (security review, 3 Oct 2026, finding 20).
create or replace function public.is_founder() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce(auth.uid() = '467fb712-e3e9-4d43-b1b8-e4e1bb32b76d'::uuid, false);
$$;

-- 1b. The facts table, for a fresh project (from CHANGES_THIS_PASS.md, with
--     the two columns the Studio adds since). Its policies are section 2's.
--     Added 7 Oct 2026, so the app can point here instead of at old notes.
create table if not exists public.gemlyx_facts (
  id bigserial primary key,
  fact text not null,
  subject text not null,
  category text default 'history',
  photo text,
  photo_pos text,
  source_url text,
  published boolean default true,
  created_at timestamptz default now()
);
alter table public.gemlyx_facts add column if not exists photo_credit text;
alter table public.gemlyx_facts add column if not exists country text;

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
    -- 2 Oct 2026: the account behind a review stays private. The public roles
    -- read only the columns a page shows (the ones that exist), not user_id.
    execute 'revoke select on public.gemlyx_reviews from anon, authenticated';
    execute (
      select 'grant select (' || string_agg(quote_ident(column_name), ', ') || ') on public.gemlyx_reviews to anon, authenticated'
      from information_schema.columns
      where table_schema = 'public' and table_name = 'gemlyx_reviews'
        and column_name in ('id', 'item_type', 'item_name', 'author', 'text', 'created_at')
    );
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

  -- A saved guide is shared by its link. Since 7 Oct 2026 the server saves
  -- it (api/save-guide.js), and nobody may change or delete one.
  if to_regclass('public.gemlyx_guides') is not null then
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'gemlyx_guides' loop
      execute format('drop policy %I on public.gemlyx_guides', pol.policyname);
    end loop;
    alter table public.gemlyx_guides enable row level security;
    -- Read by its link only, through gemlyx_guide(id) below. A select rule
    -- for everybody let anyone list every guide ever saved.
    create policy "founder reads guides" on public.gemlyx_guides for select to authenticated using (public.is_founder());
    -- 7 Oct 2026: guides are saved by api/save-guide.js with the service key,
    -- counted per browser and network. The browser writes none itself. Run
    -- this section only once that route is live, or saving a guide stops.
    execute 'revoke insert on public.gemlyx_guides from anon, authenticated';
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

-- 3c. 7 Oct 2026: what members publish. The time and the account are the
--     server's, and each account has a daily limit. The library row now knows
--     its account, privately, as a review does.
do $$
begin
  if to_regclass('public.gemlyx_trip_library') is not null then
    alter table public.gemlyx_trip_library add column if not exists user_id uuid default auth.uid();
    revoke select on public.gemlyx_trip_library from anon, authenticated;
    -- The columns the trips page reads, the ones that exist, and not user_id.
    execute (
      select 'grant select (' || string_agg(quote_ident(column_name), ', ') || ') on public.gemlyx_trip_library to anon, authenticated'
      from information_schema.columns
      where table_schema = 'public' and table_name = 'gemlyx_trip_library'
        and column_name in ('id', 'title', 'days', 'stops', 'towns', 'mode', 'payload', 'created_at')
    );
  end if;
end $$;

create or replace function public.gemlyx_member_post_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare recent integer;
  cap integer := case tg_table_name when 'gemlyx_reviews' then 20 else 5 end;
begin
  new.created_at := now();
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'an account is needed' using errcode = '42501'; end if;
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 day''', tg_table_name)
    into recent using new.user_id;
  if recent >= cap then raise exception 'daily limit reached' using errcode = '54000'; end if;
  return new;
end $$;
revoke all on function public.gemlyx_member_post_guard() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['gemlyx_reviews', 'gemlyx_trip_library'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists gemlyx_member_post_guard on public.%I', t);
    execute format('create trigger gemlyx_member_post_guard before insert on public.%I for each row execute function public.gemlyx_member_post_guard()', t);
  end loop;
end $$;

-- 4. Forms visitors send (reports, suggestions, workshop requests): their own
--    insert rules stay; reading and marking handled is his alone.
--    2 Oct 2026, from the policy readback: gemlyx_support also carries
--    "gemlyx_support_read" and "gemlyx_support_handled" for every signed-in
--    account. Policies add up, so his own rule beside them would change
--    nothing. Every rule on these tables that is not an insert goes first.
do $$
declare t text; pol record;
begin
  foreach t in array array['gemlyx_suggestions', 'craft_requests', 'gemlyx_support'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t and cmd <> 'INSERT' loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('drop policy if exists "founder reads %s" on public.%I', t, t);
    execute format('create policy "founder reads %s" on public.%I for select to authenticated using (public.is_founder())', t, t);
    execute format('drop policy if exists "founder handles %s" on public.%I', t, t);
    execute format('create policy "founder handles %s" on public.%I for update to authenticated using (public.is_founder()) with check (public.is_founder())', t, t);
  end loop;
end $$;

-- 4b. 7 Oct 2026: what a visitor sends. Size and time are the server's, and a
--     flood is refused. A backstop: the per-network limit is in api/send-form.js.
do $$ declare t text; begin
  foreach t in array array['gemlyx_support', 'gemlyx_suggestions', 'craft_requests'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', t);
    execute format('create index if not exists %I on public.%I (created_at desc)', t || '_recent_idx', t);
  end loop;
end $$;

create or replace function public.gemlyx_form_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare recent integer;
begin
  if octet_length(to_jsonb(new)::text) > 20000 then
    raise exception 'form row too large' using errcode = '22001';
  end if;
  execute format('select count(*) from public.%I where created_at > now() - interval ''10 minutes''', tg_table_name) into recent;
  if recent >= 300 then
    raise exception 'too many messages just now' using errcode = '54000';
  end if;
  new.created_at := now();
  if tg_table_name = 'gemlyx_support' then
    new.handled := false;
    new.id := nextval(pg_get_serial_sequence('public.gemlyx_support', 'id'));
  end if;
  return new;
end $$;
revoke all on function public.gemlyx_form_guard() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['gemlyx_support', 'gemlyx_suggestions', 'craft_requests'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists gemlyx_form_guard on public.%I', t);
    execute format('create trigger gemlyx_form_guard before insert on public.%I for each row execute function public.gemlyx_form_guard()', t);
    execute format('drop policy if exists "founder removes %s" on public.%I', t, t);
    execute format('create policy "founder removes %s" on public.%I for delete to authenticated using (public.is_founder())', t, t);
  end loop;
end $$;

-- 4c. RUN ONLY AFTER api/send-form.js IS LIVE and a test report has reached
--     Studio: from then on the browser writes no form row itself.
do $$ declare t text; begin
  foreach t in array array['gemlyx_support', 'gemlyx_suggestions', 'craft_requests'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('revoke insert on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- 5. A member's own data, and nobody else's.
do $$ declare pol record;
begin
  if to_regclass('public.gemlyx_user_data') is not null then
    alter table public.gemlyx_user_data enable row level security;
    -- Every older policy goes first, as in the other sections (7 Oct 2026).
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'gemlyx_user_data' loop
      execute format('drop policy %I on public.gemlyx_user_data', pol.policyname);
    end loop;
    revoke all on public.gemlyx_user_data from anon;
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
      and (coalesce(qual, '') ~ '(gemlyx-media|event-photos)' or coalesce(with_check, '') ~ '(gemlyx-media|event-photos)'
           or (coalesce(qual, '') !~ 'bucket_id' and coalesce(with_check, '') !~ 'bucket_id'))
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;
create policy "founder writes media" on storage.objects for all to authenticated
  using (bucket_id in ('gemlyx-media', 'event-photos') and public.is_founder())
  with check (bucket_id in ('gemlyx-media', 'event-photos') and public.is_founder());
-- 20 MB, not 8: Studio uploads a photo as it comes off the camera, and an
-- original is often over 8 MB (review, 2 Oct 2026). Web image types only,
-- since an iPhone HEIC does not show in most browsers anyway.
update storage.buckets set file_size_limit = 20971520,
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

-- 9. Storage rules and who may run the counters (7 Oct 2026).
select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'storage' order by 1;
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_can_run
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('gemlyx_take_guide', 'gemlyx_refund_guide', 'gemlyx_guide', 'gemlyx_form_guard', 'gemlyx_member_post_guard');
