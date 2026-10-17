-- ── GEMLYX PARTNERS AND THEIR NUMBERS ──────────────────────────────
-- 14 Oct 2026. Run this once in Supabase (SQL editor), as it is.
--
-- The security patch of 13 Oct 2026 counts visits and opened offers only for
-- places that have a partner link, and reads a partner's numbers through one
-- narrow function. Both need what is below. Until it has run, partner links
-- show "Not available just now" and nothing is counted. Nothing else breaks.
--
-- Safe to run again: everything is "if not exists" or "or replace".

-- 1. The places that have a partner link. Studio writes a row when it makes a
--    link. To end a partner's link, set revoked to true on its row.
create table if not exists public.gemlyx_partners (
  id text primary key,                       -- the place, e.g. 'food:123'
  name text not null default '',
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.gemlyx_partners enable row level security;
-- No policies on purpose: only the server (service role) reads or writes it.
revoke all on public.gemlyx_partners from anon, authenticated;

-- 2. One place's own counts from the counter table, and nothing else. The
--    table also holds every member's daily counts, so a partner's page reads
--    only these keys: st:w, st:d, st:r, st:x and st:rh for that one place.
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
