-- ── MOVING THE TWO DATELESS EVENTS INTO THE MEMORY ──────────────────
--
-- Wonderfestiwall and Geopark Dage i Det Sydfynske Øhav are festival rows
-- published before the 15 August date gate. isUpcoming reads `!d ||`, so a
-- missing date counts as upcoming and they sit in the dated grid saying
-- "Dates not confirmed", directly above a section that says the same thing
-- properly.
--
-- gemlyx_content has no versioning, no audit log and no soft delete, so run
-- step 1 and read it before running step 2.


-- ── 1. LOOK FIRST ───────────────────────────────────────────────────
-- These are the rows step 2 would move. Expect two. If it returns more than
-- you recognise, stop and read them before going on.

select id,
       payload->>'name'    as name,
       payload->>'town'    as town,
       payload->>'__scale' as scale,
       payload->>'ticketStatus' as ticket_status
from gemlyx_content
where type = 'festival'
  and published = true
  and coalesce(nullif(trim(payload->>'date'), ''), '') = ''
order by id;


-- ── 2. MOVE THEM ────────────────────────────────────────────────────
-- One statement, so the type and the payload change together and there is no
-- instant where a row is a festival with no date or a waiting entry with no
-- __waiting for waitingLine to read.
--
-- WHAT GOES IN __waiting, AND WHAT DELIBERATELY DOES NOT.
--
--   lastStart / lastEnd are empty because nobody knows what dates these rows
--   used to hold. The card then says only "The next dates are not announced
--   yet", which is true. Typing a date in here by hand would put an unsourced
--   fact on a public card.
--
--   recurrence is null for the same reason. It is normally filled by
--   recurrenceIn reading the entry's own prose, and SQL cannot run that. The
--   cost is one sentence: the card loses "It runs every year." If you want it,
--   open the row in Studio afterwards and fill it in there.
--
--   ticketStatus goes to 'unknown', which renders as no badge at all. It is
--   currently 'sold_out' on Wonderfestiwall, and sold out for an edition that
--   has already finished is a claim about a run nobody can attend. 'unknown' is
--   the value the badge table already has for "we are not saying".

update gemlyx_content
set type    = 'undated',
    payload = payload || jsonb_build_object(
      'date',         '',
      'dateEnd',      '',
      'ticketStatus', 'unknown',
      '__waiting', jsonb_build_object(
        'since',      to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
        'lastStart',  '',
        'lastEnd',    '',
        'recurrence', null,
        'expectYear', null,
        'checked',    '[]'::jsonb
      ))
where type = 'festival'
  and published = true
  and coalesce(nullif(trim(payload->>'date'), ''), '') = '';


-- ── 3. CHECK ────────────────────────────────────────────────────────
-- Should return the same rows, now typed 'undated', and the first query above
-- should now return nothing.

select id, type, payload->>'name' as name, payload->'__waiting' as waiting
from gemlyx_content
where type = 'undated'
order by id;
