# Handoff, 17 September 2026

Written for the next session, which Oliver is running on **Opus 5**.

---

## 0. READ THIS FIRST, IT IS NOT OPTIONAL

### Write to `onlyhere-project`, never to the repository root

The repository is `OnlyHere\`. **The app lives one level down, in
`OnlyHere\onlyhere-project\`.** That is where `package.json`, `vite.config.js`,
`index.html` and `node_modules` are.

There is also a stale partial copy at `OnlyHere\src\`, `OnlyHere\api\` and
`OnlyHere\tests\`, with no package.json and an 87-byte package-lock. It is not in
the build and git does not care about it.

Today this cost several hours. Fourteen files were written there. Every write
succeeded, because the folders exist. Every byte verification passed, because it
compared the file against itself at the wrong address. GitHub Desktop said
"0 changed files" and the deployed site never changed, and the conclusion reached
twice was "you have not pushed". A verification that cannot fail is not a
verification.

**Before the first commit of the session, list the target folder and confirm
`package.json` is in it.** After committing, if git shows no changes, the path is
wrong, not the user.

Oliver has not yet deleted the stale copy. Doing so is safe and worth suggesting.
`ISLANDS_17SEP_RUNLOG.md` also exists at the top level by mistake; the real one
is in `onlyhere-project`.

### Use Fable

Oliver's instruction, 17 Sep: he is on Opus 5 and **wants Fable used for these
tasks.** This supersedes the standing "avoid Fable" preference from 14 September
for the work in this handoff. Give Fable the review passes and the arguments that
need a second opinion, particularly:

- the open items in `ISLANDS_17SEP_RUNLOG.md` sections 1 to 5 and 7 to 8, which
  are all "two correct-looking rules disagree and one has to win"
- the notices design below, before it is extended
- `FOR_FABLE_16SEP_CHECKER.md`, which is still unanswered from yesterday

### His standing rules

- **No dashes anywhere.** Not em, not en, not a hyphen used as a pause. Not in
  replies, not in code comments, not in anything the app writes. Hyphens only
  inside compound words and number ranges. A count against a total may use a
  hyphen: "3 of 7 - 4 still to go".
- **Never** "actually", "genuinely", "truly", "simply", "genuine".
- No explanatory text under a form control. A label and a control is the whole
  of a field.
- Before correcting one of his facts, check it is wrong. He has been right and
  been "corrected" before.

---

## 1. WHAT HE HAS TO DO BEFORE ANY OF THIS WORKS

1. **Push.** Nothing from 16 Sep evening onward has been deployed. Verified by
   reading the live bundle: `index-BxlES1bY.js` has `nav.islands` and
   `Research sources` but no `outboundLink`, no `Community groups`, no
   `gemlyx_feeds`.
2. **Run three SQL scripts**, each offered with a copy button in the panel that
   needs it:
   - `gemlyx_feeds` (community groups and pages). Re-run it even if it was run
     earlier today: it gained a `kind` column.
   - `gemlyx_notices` (the near-you notices).
   - `alter table public.gemlyx_support add column if not exists name text;`
     still outstanding from an earlier session.

A quick way to tell whether a deploy landed: the script tag on gemlyxtravel.com
changes filename. If it still says `index-BxlES1bY.js`, it has not.

---

## 2. WHAT SHIPPED TODAY

All of it is in `onlyhere-project`, tested and building. **17,620 assertions
pass.**

### The Copenhagen Card affiliate link, and the hole it exposed

His ask: a Tiqets link on the Copenhagen Card. The row is now a two-link row,
`copenhagencard.com` first and the Tiqets DISCOVER product page second, with the
partnership stated in the row's own prose.

Getting there needed three fixes:

- **The merged-links renderer drew raw hrefs.** A two-link row is drawn by a
  different branch from a one-link row, and that branch had `rel="noreferrer"`,
  no `affiliateHref`, no disclosure, and asked `linkLabel` about the UNWRAPPED
  url, which answers "Official site". All four answers now come from one new
  function, `outboundLink` in `utils/affiliates.js`, and both branches ask it.
  **Wrap first, ask second** is the whole trick: a raw `tiqets.com` URL is not a
  partner link by any test in that file.
- **`partnerMerchant` could not name a tp.media deep link.** The shape the
  affiliate template itself generates had "tp" as its host label, so every deep
  link read "Partner site". It now reads the destination out of `u`.
- **`linksOf` dropped `android`**, so the DSB Google Play badge on "Getting a
  Ticket" had been unreachable since it was written.

### Islands as a source scope

A fourth scope tier beside town, region and part of the country. Typing
`Islands` in a research source's "only for" box reaches every draft the app can
place on a NAMED island, in any region. Matches on `ctx.island`, which uses
`namedIslandOf` and never `islandOf`: the latter falls back to the part of the
country, which would make Copenhagen an island. The singular "Island" is refused,
because in Danish that is Iceland.

### Four fixes to the fact-check panel

Found from his own screenshots and run logs.

- **His own sentence was read as a paste.** `whoseWord` treated any URL as the
  mark of somebody else's report, so "https://aeroexpressen.dk/en/ yes. Apply
  that it's also a vehicle crossing" came back "This came from a pasted
  fact-check rather than from you". A link now only marks a paste when nothing
  else in the sentence is him speaking. "should be" is deliberately NOT on the
  instruction list: a short Gemini line says exactly that.
- **The link he handed over was read by nothing.** One address plus one claim is
  the case with nothing to guess, and it now reaches the page reader.
- **The ferry probe was the wrong instrument.** It answers "is a ferry REQUIRED
  to reach this place", measured by asking for a driving route with ferries
  banned. His claim was about what the boat CARRIES. A carries-claim now skips
  the probe entirely.
- **"NOT applied. Not applied."** The panel and `correction.js` both wrote that
  headline. The evidence wins, because it can be specific.

### The link rule he asked for

The correction box now reads a bare host: `aeroexpressen.dk`,
`visitfyn.dk/lyoe`. An allow-list of endings rather than "word dot word", so
`oliver@gemlyx.dk`, `run.mjs` and `1.5` do not each cost a fetch.

Then three questions before it settles anything: is it a social page (refused),
does its address name a different year (refused), and how old is the page
(`factAge`). **The age gate cuts both ways**: a 2018 page cannot confirm today's
fare and cannot reject a correct entry either. It only bites on a claim that can
go off, so a 2018 page still answers what a ferry carries.

### The island ticket gate

Seven island drafts produced two bookable ticket links and both were wrong:
Langeland got a stand-up comedian's show called "Et kik ind i Langeland" playing
in Herning, and Bornholm got a concert venue in Rønne. The name test cannot catch
either. `typeHasAdmission(type)` now keeps the hunt off island drafts. Towns keep
theirs, because a city card is a real product.

### Community feeds

A panel listing Facebook **pages and public groups** to watch, and a sweep that
reads their recent posts and surfaces the ones carrying a date that has not
happened yet.

- Pages and groups use different endpoints with the same response, so
  `postsIn` reads one thing. A page's numeric id is resolved once on add.
- **A private group cannot be read by anything on a server**, and the email
  route does not rescue it: a Facebook notification carries about forty-five
  characters of the post and then an ellipsis. Verified against a real one in his
  inbox. There is a paste box for those instead.
- **The date parser is the value.** A group wall has no years and no month
  names: "lørdag d. 25.7. kl.15.00" against a post dated 18 July 2026. The post's
  own date is the anchor. A post in December saying "3. januar" rolls; a post
  that wrote a year never does. **A clock is not a date**: "kl. 12.10" is ten
  past twelve and reads exactly like 12 October, and the only evidence is the
  word in front.
- **A post is a lead, never a source.** Facebook stays in `NEVER_A_SOURCE`. The
  post reaches the draft in its own paragraph saying it may never be cited.

### The pretend location

`🧭 Pretend I'm somewhere` in the Studio toolbar. His words: "like a VPN". Type a
town or island or paste a coordinate, and the app's single `userCoords` moves.
The dozen readers of it are untouched, because what moves is the value and not
the question. Outside Denmark is refused, since every consumer is gated on
`isInDenmark`. A purple chip sits on every page saying where the site thinks you
are, with the way out on the same line.

### The near-you notices

His spec: "little notifications you get as a paid account... And when the event
is over, then the draft is gone. No return." Then: "when you've clicked the
notification, then the notification will be gone. But it will have its own tab
under 'near you'... Only what is current."

- Its own table, `gemlyx_notices`, NOT a type on `gemlyx_content`. A notice
  sharing a table with the entries would arrive in the Explore lists, the search
  index, the sitemap and the guide builder, each of which would need a rule to
  keep it out, and one would be forgotten.
- **Gone is a filter, not a job.** Nothing runs for a notice to expire and
  nothing can forget to run.
- The queue in Studio now has two exits: "Draft this" makes an entry, "Send as a
  notice" writes one row. A candidate whose place has no coordinate is refused,
  because "near you" is the entire promise.
- The pop-up is bottom right, dismisses on click, and that is the whole
  interaction: there is nowhere to go. The Near you tab keeps it until the event
  passes.

---

## 3. WHAT IS OPEN

### From the seven island runs, in `ISLANDS_17SEP_RUNLOG.md`

Give these to Fable. Each is two defensible rules disagreeing.

1. **Bornholm is published as 10h 44min from Copenhagen.** Live. The real answer
   is about three hours via Ystad. Google returned a door-to-door figure
   including an overnight wait, measured to a bus stop near the island's
   geometric centre, and "a measured duration always replaces a written one" put
   it on the card over the model's 4h25. Step 41 of the same run diagnoses it
   correctly and is discarded. **If one thing gets fixed, this is it.**
2. **An island's coordinate is its centroid**, so the nearest arrival point is a
   field. Bjørnø's came back as Avernakø Havn, a different island, 57 minutes on
   foot across open water. For an island the arrival point should be the harbour,
   and the journey should be measured to it.
3. **The Fejø price check contradicts itself** thirty seconds apart: step 23 says
   160 DKK is not from the official site, step 25 names the page it is on. The
   fare is right and on the ferry operator's own booking page, which had been
   demoted for being eight months old.
4. **The operator's own site keeps being demoted for looking old.** Small island
   ferry sites have 1994 in the footer and still sail today.
5. **A UK reseller read as a source**, ferrysavers.co.uk and aferry.com, while
   Kombardo Expressen, an actual operator, ranked last as a blog.
6. **The glance extraction is degrading every field it touches.** Nineteen
   overrules across seven runs and not one improvement. `May-Sept` became
   `Summer months`. A shape gate would settle it without touching the rule.
7. **The pipeline flags its own sentence.** The absence check reads a sentence a
   prompt told the writer to put there, and on Lyø that cost 200 seconds of a
   425 second run.

### Decided but not built

- **The FAQ read.** He chose the gate: "probably mainly anything that can be
  seasonal". Follow an FAQ link on the operator's own site only when a practical
  field is still empty, bar it from price and date, one page per draft.
- **Where a notice surfaces beyond the pop-up.** Asked and not answered: a strip
  on the front page, a bell with a count, or a push notification.
- **Private groups** are a future project in his words.

### Smaller, from the run log

Wikipedia ranked as an operator's own site on Avernakø. Punycode hosts
(`xn--ly-mka.dk`) shown raw in the log where he reads them. Perplexity ran out of
quota mid-run and the invented-claim check was silently discarded.

---

## 4. HOW THIS SESSION WORKED, WHICH IS WORTH KEEPING

- Project copied to a scratch folder, `npm install esbuild @babel/parser
  @babel/traverse`, then `node --max-old-space-size=3072 tests/run.mjs` and
  `npx vite build` before every commit.
- Every file committed to his disk is staged back and byte-compared. **Also
  check the path is the one the build uses.** `device_commit_files` wrote stale
  bytes twice today and the compare caught both.
- When something looks wrong on the live site, open it and read the bundle
  rather than reasoning from the source. Three messages were spent guessing
  before doing that.
