# Afternoon, 15 Sep 2026

Everything below is on your disk and verified back off it file by file. Nothing
is pushed, and your pre-push hook already caught two of my mistakes today, which
is the reason the two of them are fixed rather than live.

## 0. THE ONE THING THAT IS NOT DONE, AND THE GATE ON IT

**FABLE HAS TO REVIEW THE PIPELINE WORK WITH API DIRECT BEFORE IT SHIPS.**

Oliver, 15 Sep: too few credits to run Fable today, saving for Friday. So the
API Direct work is WRITTEN AND SHIPPED DARK. Every module and the endpoint mode
are on disk and tested; NOTHING CALLS THEM. The publish gate does not know they
exist, so pushing them changes no behaviour, and the one line that turns them on
goes in after Fable has read them.

The call site, when it goes in, is beside `dateClaimProblems(shaped)` in
App.jsx's publish gate: the same block, the same shape of problem, with the
`high` severity blocking and the `note` severity reporting.

What Fable is being asked to check, specifically, so the review is not a vague
second opinion:

- The source ranking for a dated claim, and whether the carve-out in
  `sourcePolicy.js` stays narrow. Social is refused today by `NEVER_A_SOURCE`
  and `NEVER_OWN_SITE`. The change opens ONE channel for dated claims and must
  not become a hole that lets a Facebook caption into research prose.
- The conflict path: a disagreement between the ticket page and the official
  site has to reach Studio as Needs Redraft rather than being resolved quietly.
  A silently resolved conflict is the failure mode this project keeps finding.
- The Facebook probe. It must be incapable of SETTING a date. If a reading of it
  can ever write a date onto a row, it is wrong.
- Cost. Requests per row, counted before anything is spent, said out loud in the
  panel, and behind the same explicit press as the paid sweep.
- Whether any of it can strand a traveller. A wrong date in a built guide is the
  one error here that costs somebody a day of their trip.

## 1. What the API actually returns, checked against their docs today

This matters more than the design, because the design was built on it and this
file has been wrong about API Direct once already.

| endpoint | returns | use |
| --- | --- | --- |
| `/v1/facebook/events` | `event_id`, `title`, `url`, `count`, `pages`. Filters on `start_date` and `end_date` | **No date comes back.** Can confirm or contradict a date we already hold, cannot supply one |
| `/v1/facebook/page/posts` | `posts[].message`, `posts[].timestamp`, `posts[].date`, needs `page_id` | Captions with times. A caption is prose, not a date field |
| `/v1/facebook/page` | page details including `website` | Already used, settles a named candidate against the site we hold |
| `/v1/facebook/pages`, `/v1/instagram/users` | search results | Already used by the sweep |

So "read the event date off Facebook" is not available at any price. What is
available is a yes or no against a date we already have.

## 2. The decisions Oliver made today

- **Official wins, conflict flagged.** Ticket page first, official site second.
  Where they disagree with anything social, the page keeps the official date and
  the disagreement is recorded for him. Nothing on a live page ever shows a date
  no official source states.
- **Facebook events yes, Instagram captions no**, as a principle. Section 1 is
  why the Facebook half becomes a check rather than a source. Instagram captions
  never set a date and only ever raise a flag.
- X is in the platform list and is close to noise in Denmark. Keep it in the
  sweep, expect nothing from it.
- **Keep the dollar line** in the sweep panel. He is on credits, so the money is
  already spent, and he still wants the figure.

## 3. Shipped today, before the pipeline work

- **The support page asks for no address.** "I just want their mail gone." The
  email box is gone, an optional name box takes its place, capped at 80. A
  signed-in message still carries the account address from the session, never
  retyped, so Feedback stays answerable. Everything else arrives unanswerable
  and the receipt says so at the moment it is sent.
- **The voice is a team.** "The Gemlyx team read all feedback." No claim that
  mail was sent, no response time. Trader identity stays in terms.html.
- **`name` is a new column.** `alter table public.gemlyx_support add column if
  not exists name text;` is in SUPPORT_SETUP_SQL. The insert retries without the
  field if the column is missing, so pushing before you run it cannot lose a
  message.
- **The solo tip moved to Tips.** It was rendering on Essentials AND Tips, so
  this is one guard rather than a move.
- **The gate swirl**, twice. First pass was pale and pinned to the archway.
  Second pass: centred, deeper amber, eight strands with a halo each, dust, and
  the white wash held back 0.3s. The two fixes that mattered were not colour:
  `mix-blend-mode: screen`, so gold ADDS to the painting the way light does, and
  a dim layer that takes the scene down half a stop while the strands turn.
  Tested by rendering it over the real painting frame by frame.
- **Detour copy**: the chat bar now says "Let Gemlyx know what you're looking
  for". The intake heading stays "When are you coming?".
- **The arriving half of the gate.** The white wash lived inside the landing, so
  when the landing unmounted the white vanished in one frame and the explore page
  was simply there: every frame of that transition was on the leaving side. There
  is now a white layer on the app side that the page fades up through, and the
  swap moved from 700ms to 980ms, because the wash now finishes at 1040ms and the
  old timer was landing the swap while the screen was only about six tenths
  white. Opacity only on both halves: a transform there would have made the
  element a containing block for the fixed header.
- **The social media section on entries.** New `SocialSection.jsx`, rendered
  below the directions button and above the feedback block, outside the article.
  It draws `__social`, which the sweep has been writing and nothing has ever
  shown. It names how it knows: own website, links back, or matched by name and
  therefore not confirmed. Nothing renders until the sweep finds something.

## 4. The 403 that was blocking Studio

`GEMLYX_FOUNDER_IDS` did not contain your user id, so social-find, link-alive,
scan-source and places-locate all refused your own account. Set to
`467fb712-e3e9-4d43-b1b8-e4e1bb32b76d`, redeployed, and verified: the sweep
answers 200. Full write-up in `SWEEP_403_15SEP.md`.

## 5. The pipeline work, written and dark

**`src/utils/dateAuthority.js`.** The ranking and the reconciliation. Ticket page
4, official site 3, Facebook event 2, any other social 1, unknown 0, and only the
top two may set a date. `reconcileDate` returns the winner AND the disagreements,
split into `conflicts` (two date-setting sources disagreeing, a blocker) and
`flags` (a social source disagreeing, a note). Recency is the tiebreak inside a
tier and never across tiers, which is the one place this departs from what Oliver
first sketched, and the reason is in the file. Nothing in it writes a date onto a
row, and there is an assertion that says so.

**`src/utils/eventLd.js`.** The find of the day. Most ticket systems and a lot of
organiser sites publish `schema.org/Event` JSON-LD with `startDate`, on pages
this pipeline already fetches, and `pageScan.js` has never had a JSON-LD reader,
so every one of those dates has been walked past. This reads them: graphs,
subEvents, a broken block that does not lose the good ones, `eventStatus` carried
so a cancellation is visible, and a name match that returns null rather than
guessing when two events on a page both look like the row.

**`api/social-find.js` gained `?check=event-window`.** One request, the window
padded two days each side, and it can answer confirmed, moved, or absent. `moved`
is only ever claimed when the optional wide search was run, because an empty
window on its own says nothing: plenty of Danish events are not on Facebook.

**Still to do after the review:** the call site in the publish gate, the writer
that puts observed claims on the row as `__dateClaims`, the narrow
`sourcePolicy.js` carve-out, and `__eventCheck` in shapeForLive so a republish
cannot silently drop the flag. Captions stay unbuilt: they spend requests to
produce suspicions rather than facts.

## 6. Two things to know before the next push

- **Files reported as written and were not, six times today.** Every file in
  this handoff was staged back off your disk and checked by marker after
  writing, and one of them needed a forced rewrite before the bytes changed.
  Keep checking rather than trusting the success line.
- **Your pre-push hook is doing the job.** 17,082 assertions, and it caught the
  two support assertions I had missed. Three more that my own later copy change
  would have broken (the composer placeholder was pinned in three places) are
  fixed and now anchor on a named constant with an assertion that fails loudly
  if the anchor goes missing.
