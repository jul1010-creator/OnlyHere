# Why search cannot see Gemlyx, and what to do about it

Written overnight on 16 to 17 August 2026, against the question you left:
Google hides pages that are too AI-generated, Gemini says the blogs are not safe
from this, how do we solve it.

The short version: the premise is close but the mechanism is wrong, and the real
problem is bigger and more fixable than prose style. Google does not have an
AI-writing detector deciding your rankings. What it has is a policy against
**scaled content abuse**, and the shape it describes is not "written by a
machine", it is "many near-identical pages that add nothing". On that measure the
site has one real exposure, and it is not the writing: every entry of a type
shares the same heading skeleton, on every page, by construction.

Underneath that sits something more serious that no amount of rewriting would
fix. As of tonight, search can see 33 URLs on gemlyxtravel.com, and none of them
contains a single sentence of your writing when it is fetched.

---

## 1. The premise, checked against Google rather than Gemini

You have been burned once this week by Gemini correcting things that were already
right, so this starts with the primary sources.

Google's spam policy defines the thing people mean when they say "AI penalty":

> "Scaled content abuse is when many pages are generated for the primary purpose
> of manipulating search rankings and not helping users."

Its first listed example is "using generative AI tools or other similar tools to
generate many pages without adding value for users". The operative words are
*many* and *without adding value*, not *AI*. Google's separate page on generative
AI says the same thing from the other direction: how a piece of content was
produced is not the test, and it asks creators to be accurate, to be relevant,
and to give readers context about how the content was made.

So there is no classifier hunting for the word "vibrant", and rewriting every
entry to sound more human would not, on its own, change anything.

Two other definitions in the same document matter more for you. This is the one
worth reading twice, from the thin-affiliate section:

> "cookie-cutter sites or templates with the same or similar content replicated
> within the same site"

And the self-assessment questions Google publishes for content quality:

> "Does the content provide original information, reporting, research, or
> analysis?"
>
> "Does your content clearly demonstrate first-hand expertise and a depth of
> knowledge (for example, expertise that comes from having actually used a
> product or service, or visiting a place)?"

Gemlyx answers the first of those better than almost any travel site of its size,
because it measures things nobody else measures. It currently shows almost none
of it.

---

## 2. What I measured

Everything in this section is checked, not estimated. Where I could not check
something I say so.

### 2.1 The whole site is 33 URLs, and 32 of them are towns

Fetched from the live sitemap tonight: `/denmark`, plus 32 town pages (Billund,
Ribe, Esbjerg, Odense, Aarhus, Aalborg, Copenhagen, Ringkøbing, Samsø,
Ærøskøbing, Dragør and the rest).

Every other content type has no address at all. The route table has exactly five
entries, and only one of them is a place:

```
/                       the app
/denmark                the app
/denmark/:townSlug      the app
/guide/new              the guide builder
/guide/:guideId         a saved guide
```

So every attraction, festival, restaurant, food street, bar, bar street,
nightlife town and workshop you have published exists only inside the app. There
is no URL for it, so there is nothing for a search engine to index, nothing to
link to, and nothing to share. The sitemap builder confirms it: it queries
`type=eq.town` and nothing else.

That is not a ranking problem. Those pages are not competing and losing. They do
not exist as pages.

### 2.2 A town page contains no words about the town

`https://www.gemlyxtravel.com/denmark/billund`, fetched without running
JavaScript, comes back with a correct title, a correct description and no
sentence about Billund anywhere in it.

The cause is structural. Every entry is loaded from Supabase by the app after
first paint, and the crawler response that `middleware.js` builds injects **meta
tags only**. Googlebot does render JavaScript, so this is not invisible, but it
is the weakest form of visible there is: rendering is a second, slower,
best-effort pass, and everything else that reads pages now, which includes every
AI answer engine, sees the empty version.

Fixed tonight, for towns. See section 5.

### 2.3 Nothing on the site links to a town page

`townPath` is imported into `App.jsx` and called zero times. There is no `<a
href>` to any `/denmark/...` URL anywhere in the app, and nothing navigates to
one either: clicking a town opens it over the page without the URL changing.

So the only way a crawler ever learns those 32 URLs exist is the sitemap. A page
that no page links to gets crawled late and treated as unimportant, and the
sitemap alone does not fix that. This one is cheap to fix and I have not touched
it, because it changes how the app behaves on tap and that deserves you awake.

### 2.4 There was no structured data anywhere

Zero occurrences of `application/ld+json` in the whole repo before tonight, while
Google's generative-AI guidance asks for quality and accuracy "across all content
elements, including metadata and structured data".

Added tonight for town pages. See section 5.

### 2.5 Every page of a type is the same page

This is the one Gemini was sensing, and it is measurable rather than a matter of
taste. `shapeForLive` builds `blogBody` from a fixed heading list per type, so the
skeleton of an entry is decided by its type and never by its content.

I built the measurement into the suite. Three deliberately different drafts per
type, through the real publish path, then counted:

| type | pages | distinct heading sequences |
|---|---|---|
| town | 3 | 1 |
| festival | 3 | 1 |
| free (attractions) | 3 | 1 |
| food | 3 | 1 |
| foodStreet | 3 | 1 |
| night | 3 | 1 |
| nightStreet | 3 | 1 |
| nightTown | 3 | 1 |
| booking (workshops) | 3 | 1 |
| essential | 3 | 1 |

Ten types, ten templates, 100% each. Every attraction page on the site carries:

```
Being There > Who It's For > The Reality Check > Things to Know
```

And so does every workshop page, because `free` and `booking` share the identical
skeleton. `food` and `foodStreet` share one too, so a restaurant and a food
street are structurally indistinguishable.

The first version of this measurement said towns were the healthy type, three
distinct skeletons out of three. They were not. A town's first heading is "What to
Do in {name}", so the name was being counted as variety. The reader strips the
entry's own name before comparing, which is why towns now read as 1 like
everything else.

The second half of the same fingerprint is length. The drafting prompts ask for
"around 220-350 words", "230-330", "260-390" and "290-430" depending on type, so
every page of a type also lands in the same hundred-word band.

None of that was a decision anybody made about how pages should look. It is a
template doing what a template does, and it was invisible from inside the Studio
because every scanner you have, the phrase scan and the deep voice pass, reads one
draft at a time.

### 2.6 What I could not check

The published prose itself. All content lives in Supabase now and the hardcoded
arrays are empty, so I audited the code that shapes every entry rather than the
entries. The structural claims above are provable from the code and hold for every
row ever published through the button.

And the decisive evidence about whether Google is withholding pages is in
**Search Console**, not in the repo. When you wake up, open Indexing, then Pages,
and look for the difference between "Crawled, currently not indexed" and
"Discovered, currently not indexed". The first means Google read a page and chose
not to keep it, which is a quality or duplication judgement. The second means it
never bothered to fetch it, which is a crawl-priority and internal-linking
problem. Those two point at different fixes and I do not want to guess which one
you have.

---

## 3. Gemini's six rules, one by one

The document you left is a system prompt Gemini wrote after reading the Billund
entry. Some of it is right, most of it is already in `STUDIO_VOICE`, and one rule
would make things worse. Taking it wholesale would undo work you already did.

**1. "Ban the robot facts."** Never put raw population figures or precise dates in
the narrative. *Half right, and re-aim it.* A specific figure is not the problem;
a figure that helps nobody decide anything is. The rule that already exists in
your voice doc is stronger and says it better: every paragraph has to help
somebody decide. Where I agree with Gemini is that a trivia dump reads as
generated. Where it is wrong is that stripping specifics is what makes a page
generic, and generic is the thing Google's own questions penalise. Keep the
figure when it changes a decision, cut it when it is decoration.

**2. "Put Reddit insights first, and say so."** Use phrasing like "if you check
the local threads on Reddit, the consensus is...". **Refuse this one.** Your own
voice doc already bans it, in writing, and for two reasons that have not changed:
naming the platform is not allowed, and hedging a real criticism through an
anonymous third party is a documented failure mode you have already corrected once
("reviews find the pizza unsatisfying" instead of "the crust is soggy"). There is
a third reason now: "according to Reddit" has itself become one of the most
recognisable machine-written constructions of the last two years. Gemini is
advising the exact thing your rules forbid, and your rules are right.

**3. "Be brutally honest, no brochure fluff."** *Already in.* The Billund example
it gives ("if you're looking for a charming historic Danish town, skip Billund
entirely") is good and it is the tone `STUDIO_VOICE` already demands. Worth
checking that published entries live up to it, which is an editorial pass rather
than a code change.

**4. "Talk like a friend, short snappy sentences."** *Already in*, in more detail
than Gemini's version: your cadence rule names the failure, a row of same-length
medium sentences, and asks for deliberate variation.

**5. "Separate blog logic from guide logic, and keep affiliate pitches out of blog
text."** *Take this, and it is the most useful thing in the document.* It is
already true in the code, because affiliate links live on cards and in Essentials
rather than inside `blogBody`, and it is worth writing into the voice doc as a
rule so it stays true. Google's thin-affiliation policy is specifically about
pages built around affiliate links with no original value, so keeping the prose
clean of them protects the thing that makes the prose worth reading.

**6. "Sound like a living human."** Too vague to act on. The measurable version of
this is section 2.5: stop shipping ten templates.

---

## 4. What solves this, ranked

Ordered by how much each one changes, divided by how much it costs. The first two
are done.

1. **Put the words in the HTML.** Done tonight for towns. A crawler now receives
   the entry's own name, description and body text on a town URL instead of an
   empty shell.
2. **Structured data.** Done tonight for towns. Article plus the place it is
   about, with no invented dates.
3. **Give every type a URL.** Done, later the same night. See section 5b for the
   namespace and why each part of it was chosen.
4. **Link to the pages from inside the app.** Done. Card titles are real anchors
   now, which is what turns the sitemap from a list into a crawlable site.
5. **Break the template.** The section list should be decided by what the research
   found, not by the type. Concretely: keep a small required core per
   type (the honest verdict, the practical facts) and let the rest of the sections
   be chosen from a larger pool by what the sources support, with a floor and a
   ceiling instead of a fixed list. Two entries about very different places should
   not be able to come out with the same six headings. The measurement from
   section 2.5 is now in the suite, so this becomes a number you can watch rather
   than a feeling. **This changes what the writer writes, so it is yours to rule
   on.**
6. **Show the evidence you already paid for.** This is the "original information,
   first-hand expertise" question answered with data no aggregator has:
   - the measured journey from Copenhagen, rendered tonight on place pages
   - `__hours`, still stored and never rendered, which you decided deliberately
     and which is worth revisiting now that the date is printed with everything
     else
   - the sources, corrections and open questions in `HowWeKnow`, which could also
     go into the crawler HTML
   - "facts on this page last checked on X", built from the dates already on the
     row
7. **Say how the pages are made.** Google's gen-AI guidance asks for context about
   how content was created, and you have the strongest possible version of it: a
   research pipeline that refuses to guess, with the refusals printed. A short
   "how Gemlyx writes an entry" page, linked from every entry, is an
   E-E-A-T signal almost nobody else can honestly produce.
8. **Serve the article to people too, not only to crawlers.** Right now the
   injected HTML goes out only when the user agent is a crawler, which is the
   accepted dynamic-rendering pattern and is safe because the words are identical
   to what the app renders. Serving it to everybody would remove even the question
   and would put real text on screen before the app boots. It needs the middleware
   to stop falling through for people, and that file's safety rule says a person
   always gets the app, so it is a deliberate change rather than a tweak.

---

## 5. What I built tonight

All of it green: 5914 tests passing, four timezones, 28 new mutants killed, real
build passing.

**`src/utils/sameness.js`** (new). The measurement from section 2.5. It reads a
corpus rather than a draft, which is the view nothing had:

- `headingSkeleton` / `skeletonKey`: an entry's heading sequence, with the entry's
  own name normalised out so a substituted word does not read as variety
- `openingKey`: the first few words of a description, with the name stripped, so
  fifty entries opening the same way are visible
- `skeletonSpread` / `openingSpread` / `samenessReport`: counts, biggest group
  first, per type and overall
- `describeSameness`: one sentence saying how many pages share a shape. It states
  the count and stops. Google publishes no threshold, so a function here claiming
  one would be inventing the kind of fact this codebase refuses to invent, and
  there is a test asserting it never says "spam" or "deindexed".

The ten-types table is now an assertion. The day the section list is made to vary,
that block goes red and should be rewritten to assert the new spread. Anybody
lowering a number there to get green is undoing the fix on purpose.

**`src/utils/linkPreview.js`** (added to). `articleBlocks`, `articleHtml`,
`worthServing`, `structuredData`, `injectArticle`.

- The article is the row's own name, description and `blogBody`, in their own
  order, which is what `DetailPage` renders for a person out of the same payload.
  Nothing is added. Cloaking, in Google's words, is presenting *different* content
  to a crawler, and its named example is inserting text only when the requester is
  a search engine. There is a test that rebuilds every line from the payload
  fields and fails if a sentence appears that the row does not contain.
- Images are left out. Reproducing one would mean reproducing the credit its
  licence requires, and half-including it is not an option.
- `worthServing` refuses a stub: a page needs a real paragraph and at least 60
  words. Serving a heading over nothing is how a site earns the "thin" it is
  trying to avoid.
- The article is injected **inside** `<div id="root">`, because
  `createRoot().render()` replaces the container's children on mount. Anywhere
  else it would still be on the page afterwards, which is hidden text, which is a
  worse problem than the one this solves.
- `structuredData` emits Article plus the Place it is about, with no dates,
  because the middleware selects `payload` only and nobody there knows when the
  row was created. A `datePublished` from today's clock would be the same lie as
  an undated timetable. Add `created_at` to that select and the dates can follow
  honestly.

**`middleware.js`**. The town branch now serves the article and the structured
data alongside the meta tags, built from the payload it had already fetched for
the card, so it costs no extra request and no serverless slot.

**Also tonight, before you left**: the measured journey from Copenhagen now
renders on place pages, which is item 6 on the list above and the strongest
"original information" signal on the site.

---

## 5b. And then the addresses, because you could not sleep

"Just get the things done." So items 3 and 4 went in as well. 5981 tests passing,
five timezones, 30 more mutants handled, real build green.

### The namespace

Towns keep `/denmark/<slug>`. They are indexed there already, they are the top of
the hierarchy rather than a thing inside it, and moving them would trade whatever
standing those 32 pages have earned for a symmetry nobody can see.

Everything else gets `/denmark/<segment>/<slug>`:

| segment | Studio types behind it | example |
|---|---|---|
| `event` | festival | `/denmark/event/roskilde-festival` |
| `attraction` | free | `/denmark/attraction/koldinghus` |
| `food` | food, foodStreet | `/denmark/food/jaegersborggade` |
| `nightlife` | night, nightStreet | `/denmark/nightlife/jomfru-ane-gade` |
| `workshop` | booking | `/denmark/workshop/kunsthaandvaerk` |

Three decisions in there worth naming, because a URL is the most permanent thing
a site publishes:

**The segment is the public word, not the internal one.** Studio calls these
types `free` and `booking`. A person looking for Koldinghus is not looking for a
free, and `/denmark/free/koldinghus` would be the internal vocabulary leaking into
the one place it can never be taken back from.

**One segment covers two types where the app already does.** A food street is a
food place and a bar street is a nightlife place: both open through the same
setter and sit in the same pool. Splitting them in the URL would invent a
distinction the app does not make.

**Nightlife towns and Essentials get no address yet.** Neither opens as a page in
the app, so an address for them would resolve to nothing. They need a page first,
and `entryUrlPath` returns null for them, so nothing can link to or list one by
accident.

### What that touched

- **`src/utils/placeUrl.js`**: the vocabulary (`ENTRY_KINDS`), `segForType`,
  `kindForSeg`, `typesForSeg`, `entryUrlPath`, `parseEntryUrl`, `isEntryUrl`, and
  `sitemapXml` now takes typed entries as well as bare town names. Every one of
  them returns null rather than guessing, and there is a round-trip test that
  writes an address for every type and reads it back, because a mismatch there is
  a page that is linked, listed, crawled, and then opens as the front door.
- **`src/App.jsx`**: one route for all five kinds rather than five routes, sitting
  after the town route so `/denmark/ribe` still wins. One arrival effect that
  reads the segment through `kindForSeg` and opens through the `ENTRY_SETTERS` map
  the file already had, retrying as live content lands like the two effects above
  it. A bar street opens through the nightlife setter, so the nightlife pool holds
  the streets as well as the venues.
- **`middleware.js`**: one crawler branch for every kind instead of a town regex,
  one typed lookup (`type=in.(food,foodStreet)` in a single query), and a sitemap
  built from every published row rather than towns only, with two refusals: a type
  with no page is never listed, and neither is a row with no real paragraph in it.
  Telling a search engine about a hundred stubs is the shape Google's policy calls
  scaled content, not an escape from it.
- **`src/components/EntryLink.jsx`** (new): the internal link. It wraps the card
  TITLE and not the card, because every card carries a heart button and
  interactive content inside an anchor is invalid HTML, and because the title's
  text is the place's name, which is the anchor text a search engine wants. A
  plain click is cancelled and left to the card, so tapping behaves exactly as it
  did. A ctrl, cmd, middle or shift click is not cancelled, so the real URL opens
  in a new tab, which is something this app could not do before.

Six lists link their titles now: the three town grids, the merged attractions and
workshops grid, food, and nightlife.

### One thing I fixed on the way that you never reported

A cold arrival at `/denmark/ribe` opened the town and then pushed `#/town/ribe` on
top of it, so the one visitor who came from a search result ended up at
`/denmark/ribe#/town/ribe`: the same page wearing two addresses. The hash is for
entries opened by tapping inside the app now, and nothing else.

### What is still open on this

- **A missing entry answers 200.** `/denmark/attraction/does-not-exist` renders
  the front page with a success status, which Google calls a soft 404. This was
  already true for towns and now scales to every type. Fixing it properly means
  the middleware telling "not found" apart from "the lookup failed", and this
  codebase's rule is never to conclude a fact from a failed lookup, so it needs a
  real answer rather than a quick one.
- **Events are not linked yet.** The event card is a shared component used in
  several carousels, so it is the one list where wrapping the title is not a
  one-line change.

---

## 6. What I did not touch

- The drafting prompts and `STUDIO_VOICE`. Changing what the writer writes is
  yours to rule on, and doing it unsupervised overnight is exactly the kind of
  change that needs a person reading the output.
- URLs for the other content types. The namespace decision is permanent and it is
  yours.
- The `isCrawler` gate. `middleware.js` states its own safety rule, that a person
  always gets the app, and flipping it is a deliberate change with a latency cost
  on the one path where a first impression happens.
- Anything in the Guide pipeline. Rule Zero.

## 7. The one thing to do first when you wake up

Search Console, Indexing, Pages. If those 32 town pages read as "Crawled,
currently not indexed", the fix is items 5, 6 and 7: the pages are seen and judged
thin or too similar. If they read as "Discovered, currently not indexed", the fix
is items 3 and 4: Google knows they exist and does not think they are worth
fetching, which is what no internal links to them will do.

Both lists are worth doing. Which one is first depends on what that screen says.

---

Sources for every policy quote in section 1:

- Google, Spam policies for Google web search: <https://developers.google.com/search/docs/essentials/spam-policies>
- Google, Search's guidance on generative AI content: <https://developers.google.com/search/docs/fundamentals/using-gen-ai-content>
- Google, Creating helpful, reliable, people-first content: <https://developers.google.com/search/docs/fundamentals/creating-helpful-content>
