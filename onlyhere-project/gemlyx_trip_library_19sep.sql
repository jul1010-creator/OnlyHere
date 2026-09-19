-- Gemlyx: recently used trips, published stripped of the traveller.
-- 19 Sep 2026. Safe to re-run. This file is a copy of LIBRARY_SETUP_SQL in
-- src/utils/tripLibrary.js, which is where it lives in the codebase.
--
-- Public read and public insert, the same policy gemlyx_guides carries: a guide
-- is already public at its own link. NO update and NO delete policy at all, so a
-- published trip cannot be edited or removed with the key that ships in the
-- browser.
--
-- The payload is the STRIPPED trip: days, stops, notes and the travel mode. The
-- dates, the party, the budget and the conversation are removed before anything
-- is written here. See stripForLibrary in src/utils/tripLibrary.js.

-- Recently used trips, published stripped of the traveller.
create table if not exists gemlyx_trip_library (
  id text primary key,
  title text not null,
  days int not null,
  stops int not null,
  towns text[] not null default '{}',
  mode text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists gemlyx_trip_library_recent on gemlyx_trip_library (created_at desc);

alter table gemlyx_trip_library enable row level security;

drop policy if exists "gemlyx_trip_library_read" on gemlyx_trip_library;
create policy "gemlyx_trip_library_read" on gemlyx_trip_library
  for select using (true);

drop policy if exists "gemlyx_trip_library_insert" on gemlyx_trip_library;
create policy "gemlyx_trip_library_insert" on gemlyx_trip_library
  for insert with check (true);
