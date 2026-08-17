# Gemlyx security pass, 17 August 2026

Oliver, going for a nap: *"perhaps install some security while I'm black out."*

Written while he slept. Nothing deployed, nothing pushed. Ordered by what can
actually hurt him, and the first two are done in code.

---

## 1. Thirteen of fourteen API endpoints answered anybody. FIXED

The audit that started this. Of fourteen serverless functions, exactly **one**
checked anything: `api/ask.js` resolves a Supabase bearer token before answering.
The other thirteen took any request from anywhere.

That is not theoretical. This was a working request until tonight:

```
curl -X POST https://gemlyxtravel.com/api/anthropic \
  -H 'content-type: application/json' \
  -d '{"prompt":"write 4000 words","maxTokens":8192}'
```

Claude, on his card, from anywhere, no account, 8192 tokens a call, in a loop. The
same applied to `/api/openai`, `/api/perplexity`, `/api/search` (Tavily),
`/api/scan-source` (Firecrawl credits) and `/api/places-hours`, which is Google's
Place Details **Enterprise** SKU and the most expensive call in the app. He has
raised cost in nearly every conversation, and there was no login gate and no rate
limit in front of any of it.

### Why "require a login" was the wrong fix

A visitor builds a guide **without an account**, deliberately: `shouldOfferAccount`
exists precisely because the guide works first and the account is offered
afterwards. That build calls anthropic, openai, perplexity, search, directions and
weather. Gating those on a session would turn the front door into a signup wall.

### What was built instead: `src/utils/apiGuard.js`

Two levels, drawn where the line actually falls.

**Every endpoint: the request must come from the site.** A browser on
gemlyxtravel.com sends an `Origin` (on POST and any cross-origin request) or a
`Referer`. `curl` sends neither, and a script pointed at the domain sends the
wrong one. Presence is **required**, because allowing the neither-header case
leaves curl working and the whole control inert. Allowed origins are the live
domain, its www, the two dev-server ports, and vercel.app hosts belonging to this
project.

> One hole in my own first draft, caught by mutating it: the preview rule was
> `[a-z0-9-]+\.vercel\.app`, and anybody can put a page on vercel.app in two
> minutes. They could not read the response, since nothing here sends CORS
> headers, but the call would still land and still be billed. Now the host has to
> start with one of his own project names.

**Five endpoints also need a real Studio session:** `scan-source`, `places-hours`,
`places-locate`, `tickets`, `commons-photo`. Those five appear in no reader path
(checked caller by caller, not guessed), so they get the `ask.js` treatment: the
bearer token is resolved **by Supabase**, because decoding a JWT locally proves a
string is well formed and nothing else. `GEMLYX_FOUNDER_IDS` can narrow them to
named accounts later; unset means any signed-in account, which is the state that
works today rather than the one that locks him out on a 4 am deploy.

**The client half, which was the dangerous part.** Guarding those five without
updating their callers would have left every draft silently researching nothing
while he slept. All eleven call sites in `App.jsx` now send the token via a new
`routeAuth()`. It deliberately does **not** throw the way `studioAuth()` does:
those calls sit inside `try` blocks that treat failure as "this lookup found
nothing", so throwing would turn an expired login into a draft that quietly
researched less.

**Tests**: the endpoint list is walked from `readdirSync("api")`, not written out
here, so the fifteenth endpoint cannot be forgotten silently. 20 mutants, all
dead, including six that make the guard inert and four that break his own site.

### What this is NOT

It is not a rate limit, and it does not pretend to be one. A real limiter needs
shared storage; on the Hobby plan that means a Supabase table and his SQL. A
per-instance counter inside a serverless function resets whenever the platform
feels like it and would read as protection while providing almost none. Written up
in section 3 instead of half-built.

---

## 2. The crawler HTML path. CHECKED, ALREADY SOUND

`middleware.js` writes stored content into the page shell for crawlers, which is
the classic place a stored-XSS gets in. Both halves were already right:

- `articleHtml` runs every text node and list item through `escapeHtml`, which
  covers `& < > " '` in that order.
- `structuredData` escapes every `<` inside the JSON-LD to its unicode form, so a payload
  containing `</script>` cannot end the block early.
- The only attributes built from data are the canonical and one anchor `href`,
  both escaped.

Nothing to fix. Worth knowing it was looked at.

---

## 3. Row level security. HIS TO RUN, AND THE LARGEST REMAINING RISK

**The anon key is in the JavaScript bundle, and that is correct.** It is public by
design in every Supabase browser app. Which means the entire security of the
database rests on RLS policies, and I cannot read or set those from here.

What the client actually does, enumerated from the code:

| Table | Read | Write | Written by |
|---|---|---|---|
| `gemlyx_content` | anon | PATCH, DELETE | the founder's own token |
| `gemlyx_sources` | anon | POST, PATCH, DELETE | the founder's own token |
| `gemlyx_facts` | anon | POST, DELETE | the founder's own token |
| `gemlyx_research` | — | POST | the founder's own token |
| `gemlyx_guides` | anon | POST | any visitor (a saved guide) |
| `gemlyx_user_data` | own row | POST, DELETE | the signed-in user |
| `gemlyx_reviews` | anon | POST | the signed-in user |
| `gemlyx_suggestions` | — | POST | any visitor, anon key |
| `craft_requests` | — | POST | any visitor, anon key |
| `gemlyx_ask_log` | server | POST | `api/ask.js`, server side |

**If RLS is off on `gemlyx_content`, anyone who opens the JS bundle can rewrite or
delete every published entry on the site.** That is the single worst outcome
available in this architecture, and it is a settings question rather than a code
question. Run this in the Supabase SQL editor and check the output of the last
statement:

```sql
-- 1. Which tables have RLS on at all. Anything false here is world-writable
--    with the key that ships in the bundle.
select relname as table, relrowsecurity as rls_on
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relrowsecurity, relname;

-- 2. Turn it on everywhere. Safe to re-run.
alter table public.gemlyx_content     enable row level security;
alter table public.gemlyx_sources     enable row level security;
alter table public.gemlyx_facts       enable row level security;
alter table public.gemlyx_research    enable row level security;
alter table public.gemlyx_guides      enable row level security;
alter table public.gemlyx_user_data   enable row level security;
alter table public.gemlyx_reviews     enable row level security;
alter table public.gemlyx_suggestions enable row level security;
alter table public.craft_requests     enable row level security;

-- 3. Read: published content is public, everything else is not.
create policy "published content is readable"
  on public.gemlyx_content for select using (published = true);
create policy "sources are readable"
  on public.gemlyx_sources for select using (true);
create policy "facts are readable"
  on public.gemlyx_facts for select using (true);
create policy "guides are readable by link"
  on public.gemlyx_guides for select using (true);

-- 4. Write to the content tables: signed in only. Every one of these calls
--    already sends the founder's own token, so this changes no behaviour and
--    closes the hole.
create policy "signed in may write content"
  on public.gemlyx_content for all to authenticated using (true) with check (true);
create policy "signed in may write sources"
  on public.gemlyx_sources for all to authenticated using (true) with check (true);
create policy "signed in may write facts"
  on public.gemlyx_facts for all to authenticated using (true) with check (true);
create policy "signed in may write research"
  on public.gemlyx_research for all to authenticated using (true) with check (true);

-- 5. A visitor's own data, and only their own.
create policy "own row only"
  on public.gemlyx_user_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Insert-only for the public forms. No select, so nobody can read the
--    inbox with the key from the bundle.
create policy "anyone may suggest"
  on public.gemlyx_suggestions for insert to anon, authenticated with check (true);
create policy "anyone may request a craft"
  on public.craft_requests for insert to anon, authenticated with check (true);
create policy "anyone may save a guide"
  on public.gemlyx_guides for insert to anon, authenticated with check (true);
create policy "signed in may review"
  on public.gemlyx_reviews for insert to authenticated with check (true);
create policy "reviews are readable"
  on public.gemlyx_reviews for select using (true);

-- 7. Read it back and check every table has both RLS on and at least one policy.
select c.relname as table, c.relrowsecurity as rls_on, count(p.polname) as policies
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
group by 1, 2 order by 2, 1;
```

Two things to check by hand afterwards, because a policy can be right and still
not do what you want:

- `gemlyx_user_data` needs a `user_id` column that actually holds `auth.uid()`.
  If it keys on an email instead, policy 5 refuses everybody and saves break.
- If `gemlyx_content` has rows with `published = false`, policy 3 hides them from
  anon, which is intended. Confirm Manage reads them with the founder token and
  not the anon key, or drafts vanish from the panel.

---

## 4. Secret scan. CLEAN

- No `service_role` key and no `SUPABASE_SERVICE_KEY` anywhere in `src/`.
- No key-shaped strings (`sk-`, `AIza`, `tvly-`, `pplx-`, `fc-`) in `src/`,
  `api/` or `middleware.js`. Every provider key is read from `process.env` on the
  server only, so Vite never inlines one.
- The Supabase key in `src/config.js` decodes to `role: anon`, which is the right
  one to ship. Its whole safety is section 3.

One thing worth doing that I cannot do from here: the anon key and the project ref
have been in the bundle and in git history for weeks, which is fine, but if a
`service_role` key was ever pasted into a file and later removed, it is still in
the history and still valid. `git log -p -S "service_role"` will say.

---

## 5. Dependencies. ONE TO FIX, TWO THAT ONLY AFFECT HIS LAPTOP

`npm audit`, four advisories:

| Severity | Package | What | Reaches production? |
|---|---|---|---|
| high | `vite` ≤6.4.2 | dev-server path traversal, `server.fs.deny` bypass on Windows, **launch-editor NTLMv2 hash disclosure via UNC path on Windows** | No. Dev server only. |
| moderate | `esbuild` ≤0.24.2 | any website can make requests to the dev server and read the response | No. Dev server only. |
| moderate | `react-router` / `react-router-dom` 6.0.0–7.17.0 | open redirect via backslash in `<Link>`/`useNavigate`, leading to XSS | Yes, in principle. |

**The vite and esbuild ones are worth fixing anyway, and they matter more than
"dev only" suggests, because he is on Windows.** The NTLM hash disclosure fires
when a dev server is reachable and a UNC path is requested. Fix with
`npm i -D vite@latest` and run the suite.

**The react-router one I checked rather than assumed, and it is not reachable
here.** The advisory needs an attacker-chosen navigation target. Every target in
this app is built internally: `"/"`, `"/guide/new"`, `` `/guide/${id}` ``,
`location.pathname`, and `entryUrlPath(type, name)`, which folds a name into a
slug. Nothing takes a URL from a query string, a hash or stored data and hands it
to `navigate()` or a `<Link to>`. So the exposure is nil today, and the fix is a
**major** version bump (6.26 to 7.18+, no patched 6.x exists) which changes route
APIs. I did not do that at six in the morning while he was asleep. It should be a
deliberate, tested upgrade, and it should be watched for the day a navigation
target does start coming from user input.

---

## What I would do next, in this order

1. **Run the SQL in section 3.** Largest remaining risk by a distance, and it is
   ten minutes.
2. **`npm i -D vite@latest`**, run the suite, and keep going.
3. **A real rate limit** on `anthropic`, `openai`, `perplexity`, `search` and
   `directions`: one Supabase table, `(ip_hash, minute) -> count`, checked in
   `apiGuard`. The origin check stops casual abuse; it does not stop anybody who
   sets a header. This is the thing that makes the cost ceiling real, and it needs
   the table decision, so it waits for him.
4. **Plan the react-router 7 upgrade** for a day when it can be tested properly.
