-- The three outstanding scripts from the 17 Sep handoff, in one paste.
-- Safe to run as often as you like: every statement is guarded, and the
-- policies are dropped before they are created, so Supabase will not roll the
-- whole script back on a "policy already exists".
--
-- Run it in the Supabase SQL editor.


-- 1. COMMUNITY FEEDS, the Facebook pages and public groups to watch.
--    Re-run this even if you ran it on 17 Sep: it gained a kind column.

create table if not exists gemlyx_feeds (
  id bigserial primary key,
  name text not null,
  kind text default 'group',
  group_id text default '',
  url text not null,
  place text default '',
  note text,
  enabled boolean default true,
  last_checked date,
  created_at timestamptz default now()
);
alter table gemlyx_feeds enable row level security;
alter table gemlyx_feeds add column if not exists kind text default 'group';
alter table gemlyx_feeds alter column group_id drop not null;

drop policy if exists "auth all gemlyx_feeds" on gemlyx_feeds;
create policy "auth all gemlyx_feeds" on gemlyx_feeds for all to authenticated using (true) with check (true);


-- 2. THE NEAR YOU NOTICES.
--    anon may read this one, since it is the only table here a reader sees.

create table if not exists gemlyx_notices (
  id bigserial primary key,
  headline text not null,
  body text,
  day date not null,
  end_day date,
  place text default '',
  lat double precision,
  lon double precision,
  source_url text,
  created_at timestamptz default now()
);
alter table gemlyx_notices enable row level security;

drop policy if exists "read gemlyx_notices" on gemlyx_notices;
create policy "read gemlyx_notices" on gemlyx_notices for select to anon using (true);
drop policy if exists "auth all gemlyx_notices" on gemlyx_notices;
create policy "auth all gemlyx_notices" on gemlyx_notices for all to authenticated using (true) with check (true);


-- 3. THE SUPPORT NAME COLUMN, outstanding since an earlier session.

alter table public.gemlyx_support add column if not exists name text;
