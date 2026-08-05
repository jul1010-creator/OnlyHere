# PLAN: login, and the traveler profile behind it

**Status: written, not built.** This is the plan for what you asked for on 5 Aug 2026, so you can push back on the shape before any code exists.

> "Saving guides, favourites, and also giving the AI an idea of who the person is. So if the user ever contacts Gemlyx about a restaurant, then Gemlyx already know what kind of person he is."

That third part is the interesting one, and it is also the part with the sharpest edges. Taking each in turn.

## Where saving happens today

Saved guides and hearted places live in the browser's local storage, on one device. Clear your browser data and they are gone. Open the site on your laptop and your phone's saves are not there. Your own privacy page states this plainly today ("stored only in your browser's local storage, on your own device. We never see them"), so **that page has to change the day accounts ship.** Worth flagging now rather than discovering later.

## What gets built

**Auth.** Supabase Auth, which you already run for the Studio login, so there is no new vendor and no new bill. Email and password to start. Magic link is worth considering instead: no password to forget, no password to leak, and it suits an app someone uses a few times around one trip. Google sign in is the other obvious option and is the lowest friction of the three, at the cost of sending Google a signal about your users.

**Two tables.**

```sql
-- saved guides and hearted places, one row per saved thing
create table if not exists gemlyx_saves (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,             -- 'guide' | 'town' | 'event' | 'food' | 'free' | 'nightlife' | 'craft'
  item_id text,                   -- the published row id, null for guides
  payload jsonb,                  -- the guide itself, for kind='guide'
  created_at timestamptz default now()
);
alter table gemlyx_saves enable row level security;
create policy "own saves" on gemlyx_saves for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- the traveler profile
create table if not exists gemlyx_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  travel_style jsonb,             -- the answers, see below
  updated_at timestamptz default now()
);
alter table gemlyx_profiles enable row level security;
create policy "own profile" on gemlyx_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Row level security on both, written so a logged in user can only ever reach their own rows. Not optional: without it, one anon key would read every user's saved trips.

**Migration, not loss.** On first login, whatever is in local storage gets offered up: "you have 3 saved guides on this device, add them to your account?" Nobody loses a trip they planned before they signed up. This is a small thing that people notice.

## The traveler profile, and how it reaches the AI

The goal in your words is that if someone asks Gemlyx about a restaurant, Gemlyx already knows what kind of person they are. Two honest ways to get there, and they are very different.

**The one I would build: a profile they fill in and can see.** A short set of questions in the account page. Roughly: who do you usually travel with, what is your budget shape, how far will you go off the beaten path, what do you actually care about (food, nightlife, history, nature, design, crafts), any dietary needs, do you drive. Six or seven questions, all optional, all editable, all visible.

Then the Detour chat prompt gets a short block: *"This traveler has told us: travels as a couple, mid budget, will go well off the beaten path, cares about food and history, no car."* One paragraph, from answers they typed themselves.

Why this shape. It is honest, because they can see exactly what Gemlyx knows and change it. It is useful immediately, from the first question answered, instead of needing a history to learn from. And it does not need a single line about them to be inferred, stored or guessed.

**The one I would not build yet: inferring the profile from their behaviour.** Watching what they save, what they ask about, which places they open, and building a picture from it. More powerful in theory, and considerably worse in practice here. It is invisible to the person, so it goes wrong quietly. It needs an activity log, which is a real privacy liability under GDPR and a real thing you would have to answer for. And your privacy page currently promises no tracking and no analytics, which this would directly contradict. If you want it later, it should be opt in, visible, and editable, and it should come after the explicit version has been running for a while.

## What has to change on the privacy page

The current page says no accounts, no tracking, saves never leave your device. All three become untrue on the day this ships. It needs: what an account stores, that saves move to your servers, what the profile holds, that the profile is sent to the AI as part of a chat, how to delete an account and everything with it. GDPR gives your users a right to deletion, so **"delete my account and all my data" has to be a real button**, not an email address you promise to read.

One more, worth saying plainly: **do not put dietary or health information into the profile as free text**. "Vegetarian" as a tick box is a preference. A free text field invites people to type allergies and medical detail, and that is a different category of data with a much heavier duty of care attached. Tick boxes only.

## The one decision I need from you

**Do travelers need an account to use Gemlyx, or is it optional?**

I would keep it fully optional: browse, plan and build a guide with no account at all, exactly as today, and sign up only to keep things across devices. An account wall in front of a discovery app costs you most of the people who would have loved it. But it is your product and your call, and it changes the build.

## Order of work

1. You decide account required versus optional, and email/password versus magic link versus Google.
2. Auth UI: sign up, log in, log out, forgotten password, plus the account page shell.
3. `gemlyx_saves` with RLS, saves moved off local storage, first login migration prompt.
4. Privacy page rewritten, and a working delete account button.
5. The profile questions, stored in `gemlyx_profiles`.
6. The profile block spliced into the Detour prompt. **This last step touches the chat prompt, which is Rule Zero, so it stops here for Fable or for your explicit go ahead.**
