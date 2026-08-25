-- Gemlyx support inbox. Run once in the Supabase SQL editor.
create table if not exists public.gemlyx_support (
  id          bigserial primary key,
  reference   text not null,
  topic       text not null,
  email       text,
  message     text not null,
  url         text,
  good_faith  boolean,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists gemlyx_support_created_idx on public.gemlyx_support (created_at desc);
create index if not exists gemlyx_support_reference_idx on public.gemlyx_support (reference);

alter table public.gemlyx_support enable row level security;

-- Anyone may write. Nobody holding the public key may read: the anon key ships
-- in the bundle, so a select policy here would publish every message and every
-- address in this table to anybody who opened the developer console.
drop policy if exists gemlyx_support_insert on public.gemlyx_support;
create policy gemlyx_support_insert on public.gemlyx_support
  for insert to anon, authenticated with check (true);
