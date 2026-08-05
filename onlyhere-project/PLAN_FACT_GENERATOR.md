# PLAN: the Studio fact generator

**Status: written, not built.** This is the plan for what you asked for on 5 Aug 2026, so you can change the shape before any code exists.

> "The Guide loading facts needs to be improved actually. Having 7 guide facts is boring. We need a lot. Put into studio a random fact generator or something with an (upload image) next to it. So if it comes with a random fact about something, then I can input a picture to it."

## Where the 7 facts are now

`src/data/denmarkFacts.js`, hardcoded, assistant written, each one paired by filename with a photo already sitting in `public/`. Seven facts about H.C. Andersen, Ribe, Kronborg, the Jelling stones, Roskilde's Viking ships, Amalienborg and Harry's Place. They show on the carousel while a guide builds.

Two problems beyond the count. They were written from memory rather than researched, which is the same rule everything else in the app now follows and this file never did. And adding one means editing code and pushing, which is why there are seven.

## What it becomes

A **Facts** type in Content Studio that works like every other Studio type you already use, plus a generate button that does the picking for you.

**Generate.** You press "🎲 Draft a fact" and Studio picks a subject and researches it, rather than you having to think of one. Two sources for the subject, both real:

1. **From your own published content.** The strongest option. It picks a random published town, festival, food spot or attraction you already have and researches one genuinely interesting fact about it. This has a real second benefit: a traveler who sees "Ribe is Denmark's oldest town, founded around 700 AD" on the loading screen is being shown something they can then go and read in your app. The loading screen stops being filler and starts being a trailer for your own content.
2. **From Denmark generally**, for when you want breadth beyond what you have published. It gets a subject area (history, food, design, nature, language, daily life) and researches a real fact in it, with an explicit instruction not to repeat any fact already saved. That last part matters, because a fact generator with no memory of itself will hand you the Little Mermaid five times.

Either way it goes through the same pipeline as a Studio draft: real research, the STUDIO_VOICE rules, the dash ban, and an uncertainties field. **A fact that cannot be verified does not get saved.** You still see and edit the text before it is published, exactly like a town draft.

**Upload image, next to it.** Right beside the drafted fact, the same photo uploader the Media panel already uses, so you attach a picture from your phone the moment the fact appears. It lands in the `gemlyx-media` bucket and the URL is saved with the fact. Note this is the one part that is blocked: **the `gemlyx-media` bucket SQL still has not been run**, and the uploader cannot work until it is. The SQL is at the top of `CHANGES_THIS_PASS.md`. Until then the fact can still be saved with no image and get one later.

**A queue, not one at a time.** The Studio draft queue already exists and runs drafts sequentially in the background. Pointing it at facts means you press "draft 20 facts" once, go and do something else, and come back to 20 researched facts waiting for photos. That is how seven becomes a lot without it being an evening of work.

## Storage

A `gemlyx_facts` table rather than a new type inside `gemlyx_content`. Reasoning: everything in `gemlyx_content` is a browsable place with a name, a payload shaped by `shapeForLive`, and a detail page. A fact is not a place, has no detail page, and would need special casing in every list that reads that table. A separate small table keeps both clean.

```sql
create table if not exists gemlyx_facts (
  id bigserial primary key,
  fact text not null,
  subject text not null,          -- what it is about, e.g. "Ribe"
  photo text,                     -- gemlyx-media URL, nullable
  photo_pos text,                 -- optional object-position, same as denmarkFacts uses
  source_url text,                -- where it was verified
  published boolean default true,
  created_at timestamptz default now()
);
alter table gemlyx_facts enable row level security;
create policy "read gemlyx_facts" on gemlyx_facts for select to anon using (published);
create policy "auth all gemlyx_facts" on gemlyx_facts for all to authenticated using (true) with check (true);
```

`source_url` is not decoration. It is what makes a fact auditable a year from now when neither of us remembers where it came from.

## The one thing I need you to decide

The loading carousel is shown **during a guide build**, which puts the component that renders it close to Rule Zero. The data file it reads (`data/denmarkFacts.js`) is not on the Rule Zero list and is clearly mine to change. The renderer is a judgement call.

The clean way through, which needs no Rule Zero edit at all: `denmarkFacts.js` keeps exporting exactly the same array shape it does today, and gains a loader that fills that array from `gemlyx_facts` at runtime, exactly the way `liveContent.js` fills `towns` and `events`. The renderer reads the same variable it always has and never knows anything changed. The 7 existing facts stay as the seed so the screen is never empty on a cold start.

**If that is fine with you, this is buildable without touching a single Rule Zero file.** Confirm and I will build it in that shape.

## Order of work

1. You run the `gemlyx_facts` SQL, and the `gemlyx-media` bucket SQL if it is still outstanding.
2. Facts loader in `denmarkFacts.js`, same pattern as `liveContent.js`. Nothing visible changes yet.
3. Studio Facts panel: generate, edit, attach photo, publish, plus a manage list to delete a bad one.
4. Wire the existing draft queue to facts so you can batch them.
5. Migrate the 7 hardcoded facts into the table so there is one source of truth, and empty the hardcoded array.
