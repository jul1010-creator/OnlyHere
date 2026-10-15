-- ── GEMLYX DEAL ALERTS ─────────────────────────────────────────────
-- 15 Oct 2026. Run this once in Supabase (SQL editor), as it is.
--
-- Oliver, 14 Oct 2026: "make a notification system for users, so they can see
-- whenever a new discount has popped up. Also a mail one, but make it so
-- people can tick off what notifications they want from as well."
--
-- Three tables: the new deals the server has seen, each member's choices, and
-- which deals were mailed to whom. Until this has run, the bell in the header
-- stays hidden, the settings say "Not available just now", and
-- api/deal-alerts.js sends nothing. Nothing else breaks.
--
-- Safe to run again: tables and indexes are "if not exists", every policy is
-- dropped before it is made again, and the grants say the same thing twice.
-- Supabase runs it as one transaction, so it all applies or none of it does.

-- 1. ONE ROW PER NEW PROMOTION THE SERVER HAS SEEN.
--    deal_id names the place the way partner links do ('food:123'), and sig
--    is a fingerprint of the offer's text and hours (utils/dealAlerts.js
--    offerSig), so a changed offer is a new row and the same offer is not.
--    quiet marks the deals that were already on when alerts began: they are
--    written so they are known, and nobody is told about them.
create table if not exists public.gemlyx_deal_news (
  id bigint generated always as identity primary key,
  deal_id text not null check (deal_id ~ '^[a-z]{1,16}:[A-Za-z0-9_-]{1,64}$'),
  sig text not null check (char_length(sig) between 1 and 64),
  category text not null check (category in ('restaurants', 'nightlife', 'attractions', 'rentals')),
  name text not null check (char_length(name) between 1 and 120),
  offer text not null check (char_length(offer) between 1 and 140),
  short boolean not null default false,
  ends_at timestamptz,
  quiet boolean not null default false,
  created_at timestamptz not null default now(),
  unique (deal_id, sig)
);
create index if not exists gemlyx_deal_news_created on public.gemlyx_deal_news (created_at desc);
alter table public.gemlyx_deal_news enable row level security;
-- Members who are signed in read it (the bell); nobody but the server writes.
drop policy if exists "members read deal news" on public.gemlyx_deal_news;
create policy "members read deal news" on public.gemlyx_deal_news
  for select to authenticated using (auth.uid() is not null);
revoke all on public.gemlyx_deal_news from anon, authenticated;
grant select on public.gemlyx_deal_news to authenticated;
grant all on public.gemlyx_deal_news to service_role;
grant usage, select on sequence public.gemlyx_deal_news_id_seq to service_role;

-- 2. ONE ROW PER MEMBER: WHAT THEY TICKED.
--    cats: the kinds of place they want, all four until they untick one.
--    email_on: mail is opt in, so it starts off.
--    seen_at: when they last opened the bell, so the count is what is new.
--    last_digest_at: when their morning roundup last went (the server's).
--    unsub: the secret in the unsubscribe link, so a mail needs no sign in
--    to be turned off.
--    The row goes with the account (on delete cascade), so deleting an
--    account needs nothing else.
create table if not exists public.gemlyx_deal_alerts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cats text[] not null default array['restaurants', 'nightlife', 'attractions', 'rentals']::text[]
    check (cats <@ array['restaurants', 'nightlife', 'attractions', 'rentals']::text[]),
  email_on boolean not null default false,
  lang text not null default 'en' check (lang in ('en', 'da', 'de', 'lt')),
  seen_at timestamptz not null default now(),
  last_digest_at timestamptz,
  unsub uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now()
);
create index if not exists gemlyx_deal_alerts_mail on public.gemlyx_deal_alerts (email_on, last_digest_at);
alter table public.gemlyx_deal_alerts enable row level security;
-- A member reads and writes their own row and nobody else's.
drop policy if exists "own alerts read" on public.gemlyx_deal_alerts;
create policy "own alerts read" on public.gemlyx_deal_alerts
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own alerts insert" on public.gemlyx_deal_alerts;
create policy "own alerts insert" on public.gemlyx_deal_alerts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own alerts update" on public.gemlyx_deal_alerts;
create policy "own alerts update" on public.gemlyx_deal_alerts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own alerts delete" on public.gemlyx_deal_alerts;
create policy "own alerts delete" on public.gemlyx_deal_alerts
  for delete to authenticated using (auth.uid() = user_id);
-- And only these columns: a member cannot write their own last_digest_at
-- (and so ask for a second roundup) or choose their own unsubscribe secret.
revoke all on public.gemlyx_deal_alerts from anon, authenticated;
grant select, delete on public.gemlyx_deal_alerts to authenticated;
grant insert (user_id, cats, email_on, lang, seen_at, updated_at) on public.gemlyx_deal_alerts to authenticated;
grant update (user_id, cats, email_on, lang, seen_at, updated_at) on public.gemlyx_deal_alerts to authenticated;
grant all on public.gemlyx_deal_alerts to service_role;

-- 3. WHICH DEAL WAS MAILED TO WHOM, so nobody gets the same deal twice.
--    Only the server reads or writes it. The server removes rows older than
--    90 days, as the privacy policy says.
create table if not exists public.gemlyx_deal_mail_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  news_id bigint not null references public.gemlyx_deal_news (id) on delete cascade,
  kind text not null check (kind in ('instant', 'digest')),
  sent_at timestamptz not null default now(),
  primary key (user_id, news_id)
);
create index if not exists gemlyx_deal_mail_log_sent on public.gemlyx_deal_mail_log (sent_at);
create index if not exists gemlyx_deal_mail_log_news on public.gemlyx_deal_mail_log (news_id);
alter table public.gemlyx_deal_mail_log enable row level security;
-- No policies on purpose: only the server (service role) reads or writes it.
revoke all on public.gemlyx_deal_mail_log from anon, authenticated;
grant all on public.gemlyx_deal_mail_log to service_role;

-- ── TO CHECK AFTERWARDS ─────────────────────────────────────────────
-- The dashboard uses the service role and ignores row level security, so
-- these two are the tests that answer (a PATCH that matches nothing proves
-- nothing either way). Expect relrowsecurity true for all three, one policy
-- on the news table, four on the alerts table and none on the log.
--
--   select relname, relrowsecurity from pg_class
--   where relname in ('gemlyx_deal_news', 'gemlyx_deal_alerts', 'gemlyx_deal_mail_log');
--
--   select tablename, policyname, cmd, roles from pg_policies
--   where tablename like 'gemlyx_deal_%' order by tablename, policyname;
