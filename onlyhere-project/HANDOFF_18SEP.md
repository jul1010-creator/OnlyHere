# Handoff, 18 September 2026

Written for the next session. Oliver ran this one on Opus 5.

**17,999 assertions pass and the build is green.** That is up 262 from the
17,620 the 17 Sep handoff claimed, and 298 from the 17,584 that were committed
at the time.

Every named follow-up this handoff opened with has since been built. Sections
2.13 to 2.18 are the second half of the session, written after the first draft
of this file, and section 3 is what is left.

---

## 0. READ THIS FIRST

### The path trap, and how tonight went wrong for twenty minutes

The app is in `OnlyHere\onlyhere-project\`. There was also a stale partial copy
at `OnlyHere\src\`, `OnlyHere\api\` and `OnlyHere\tests\`.

Two things the 17 Sep handoff got wrong about it, both worth knowing:

1. **It IS tracked by git.** 13 files, 9 byte-identical to the real ones and 4
   earlier drafts. The handoff said "git does not care about it".
2. Deleting it with `git rm -r src api tests` from the repo root is right, and
   **a follow-up command without the `cd` line ran a level down and deleted the
   real `onlyhere-project\src`, `api` and `tests`.** He recovered them himself
   from OneDrive, which preserved the mtimes, so the uncommitted 17:04 work
   survived. A `git reset --hard` at that moment would have destroyed it.

**So: every command handed to him carries its own full `cd` line.** No
exceptions, however obvious the working directory seems.

The stale copy is still there, minus the two `api` files and the stray root
`ISLANDS_17SEP_RUNLOG.md`, which are deleted on disk and staged. The safe test
before deleting anything: the real `src` has 251 files, `main.jsx`, `config.js`
and a `pages` folder; the stale one has 10 files and none of those.

### His standing rules

- **No dashes anywhere.** Not em, not en, not a hyphen used as a pause. Hyphens
  only inside compound words and number ranges. A count against a total may use
  one: "3 of 7 - 4 still to go".
- **Never** "actually", "genuinely", "truly", "simply", "genuine". The adjective
  wants "real" or "local", since it cannot be deleted the way the adverbs can.
- No explanatory text under a form control.
- Before correcting one of his facts, check it is wrong.
- **18 Sep, new, and it applies to the whole affiliates page:** copy about a
  partner must not carry a founder's reservation. He read "the closest thing on
  this list to what Gemlyx already writes, which is the reason to be careful
  with it" under WeGoTrip and said "I doubt those partners will be happy seeing
  'be careful with WeGoTrip'.. why be careful?" That reservation was about our
  own product and read as a warning about theirs. It now lives in a code comment
  and the reader-facing line sells the thing honestly.

### Fable

He asked for Fable on the review passes, as the 17 Sep handoff said. Fable
reviewed the journey and geocode cluster (run log 1, 2, 9 and checker 1, 3) and
its answers are what sections 2.1 and 2.2 below are built on, including two
places where it said the run log's own diagnosis was wrong. Those corrections
were taken. The source-trust and glance clusters were decided in-session.

---

## 1. WHAT HE HAS TO DO

1. **Commit and push.** Twenty six files are changed on his disk, every one of
   them staged back and byte-compared after writing. The pre-push hook will run
   the suite and a build: both pass here.
2. **The three SQL scripts**, if they are not run yet. `gemlyx_tables_18sep.sql`
   is in the chat sidebar with all three in one paste, safe to re-run.
3. ~~Name the two partner-ads banners.~~ **Done, 19 Sep**, off his own two
   program pages: banner 77692 is Hotel Viking in Saeby (programinfo id 8081)
   and 112737 is Travelbetter.dk (id 11663). Both are in `config.js` and both
   render. What is left for him is the third bullet under point 4.
   ```js
   export const PARTNER_ADS_BANNERS = {
     [PARTNER_ADS_STAY_BANNER]: { merchant: "Hotel Name", site: "https://hotel.dk", town: "Aarhus" },
     [PARTNER_ADS_GEAR_BANNER]: { merchant: "Shop Name", site: "https://shop.dk" },
   };
   ```
   No BUTTON renders until then, on purpose: a label that cannot say whose page
   it opens is not a link this site prints. partner-ads disallows automated
   fetching of a klikbanner URL, so the name has to come from him or from his
   partner-ads dashboard. Everything around the button is live without it: the
   Tips block, and the row on the public affiliates page saying both programmes
   are signed up and neither is live.
4. **Press three buttons after the deploy**, because three things are wired
   that nothing here can prove from the outside:
   - **A Booking button** on a published guide. It should pass through
     `kqzyfj.com` and land on Booking's results for that town. If it lands on
     Booking's front page, CJ is not honouring the deep link and
     `BOOKING_CJ_LINK` should be emptied rather than left half working.
   - **The good and the budget button on the same day.** Both go to Booking for
     the same town and differ only by the sort key, `STAY_ORDER` in
     `utils/affiliates.js`. If the two pages come back in the same order,
     Booking is ignoring the key and the two labels are a distinction the page
     cannot keep.
   - **Both partner-ads buttons.** The hotel on a guide whose day is in Saeby,
     and the Travelbetter.dk button on the Tips tab. Each should pass through
     `partner-ads.com/dk/klikbanner.php` and land on the advertiser. Worth
     checking the click registers in his partner-ads dashboard, since that is
     the half no assertion here can see.

---

## 2. WHAT SHIPPED

### 2.1 Bornholm said 10 hours 44 minutes, live

`journeyFigure` in `utils/journey.js`, and it is the one function that decides
what a measured total MEANS. A total whose waiting is over an hour is cut to the
time in motion, because the wait is a fact about the departure time we asked for
and not about the route: Google found the next morning's sailing. An hour of
connection time stays in, or a real itinerary with two changes would be
understated.

Everything that reads the measurement now asks it: the travelTime override, the
transport check (`transitProblems`, which would otherwise have flagged the
pipeline's own new figure as unmeasured), and `verifyTransportClaim` in
`correction.js`, so a traveller correcting "10h 44min to Bornholm" is no longer
told they are wrong using the bad number. The run log names which of the two
rules was applied and how much waiting came off.

**Fable's correction to the run log, taken:** step 41 should NOT get authority
over the field. It is built from the same `transitParts` that wrote the field,
so it is one measurement read twice, and giving it authority is the rewrite loop
of run log section 8. The rule moved instead of the authority.

### 2.2 An island arrives at its harbour

Three changes, all behind the island flag so a town behaves exactly as before:

- `arrivalStop(parts, { island })` returns the last leg that crossed water.
  Bornholm's published arrival point was a rural bus stop three minutes from the
  island's geometric centre, because the last leg of the measured route is
  whatever bus runs inland from the boat.
- The radius search is **not asked at all** for an island. A search from a
  centroid answers what is nearest the middle of the island, and the middle of
  an island is a field. The log says it was not asked rather than reporting an
  absence it never looked for.
- **`walkTo` refuses a walking route that boards a ferry.** This is Fable's
  catch and it is the Bjørnø bug at the source: `/api/directions` has reported
  `hasFerry` since 6 August and this was the one caller that never asked, which
  is how "Avernakø Havn, 57 mins on foot" was offered for a different island.

### 2.3 The nineteen glance overrules

`COMPRESSION_GLANCE` in `utils/glanceExtract.js`: on `bestTimeGlance`,
`recommendedStayGlance`, `accommodationGlance` and `accommodationTip`, an
extraction now has to bring a FIGURE the written value did not have. Everywhere
else the rule is untouched.

Tested against all nine swaps from the run log. Seven are refused, including the
verbose one that repeats the writer's own figures at four times the length. Two
are allowed, both of them a page's number beating a writer's words, which is the
case the rule exists for. Filling an empty field is untouched, so Avernakø
Landhotel still lands.

### 2.4 The pipeline stopped checking its own sentences

Two of them:

- `NO_TRANSIT_NOTE` lives in `utils/journey.js` beside a `PIPELINE_SAID` list
  the absence check skips. The sentence is added by a prompt when the routing
  comes back empty, and the absence check was reading it as an unbacked claim
  and buying a rewrite: 200 seconds of a 425 second run on Lyø.
- The transport check is handed `readerText(writtenFields(t))` rather than
  `readerText(t)`, so on the correction pass it no longer reads the pipeline's
  own travelTime back as prose.

### 2.5 The price log stopped contradicting the next step

Fejø, steps 23 and 25, thirty seconds apart: "these figures came from a search
result or a blog", and then the page they are on, by name. The founder note has
asked `priceSource` for the host since 16 August; the run log line was the one
place that still guessed. It asks now, before the sentence is written.

### 2.6 Who is speaking

- **An encyclopedia can never be an official host.** `rankSource` filters
  `officialHosts` through `isNeverOwnSite`, which has listed wikipedia since it
  was written. Avernakø's source order read "da.wikipedia.org (official) >
  lex.dk (reference) > nn.wikipedia.org (reference)".
- **A shipping company is not a blog.** The hosts in `OPERATORS` rank as
  operators. Kombardo Expressen runs the Køge to Rønne boat and ranked last, as
  a blog, below trip.com and GetYourGuide.

### 2.7 The geocode that scoped a Copenhagen event to Aalborg

Checker section 1, and three parts:

- **A coordinate has to sit in the town the draft is about.** The name test
  passed for TinderBox because something at Copenhagen Airport really is called
  Tinderbox, and for Københavns Oktoberfest because the organiser's business
  name IS the draft's name. `coordFitsTown` runs against the town read BEFORE
  the lookup is allowed to name the town itself, and a far coordinate is refused
  with a decision in the log. Unplaced is a state the pipeline handles honestly
  and the later tiers recover it.
- **Danish puts an s on the town.** `townInName` accepts one trailing s as a
  boundary, so "Københavns Oktoberfest" finds its town. "Københavnsgade" still
  does not.
- **And the town list is keyed in English.** `townKeyFor` asks
  `variantsOf` too, so a Danish name finds the English key. Both halves were
  needed: the possessive alone still would not have matched "Copenhagen".

### 2.8 The facts panel could not pick a picture

His words: "the published 'facts' do not allow me to pick out Wikimedia. It just
chooses one from Wiki itself." The button asked for `limit=1` and took
`results[0]`, which for a subject with a Wikipedia article is that article's own
lead image. It now searches eight and shows a grid, keyed to the one fact row,
and picking one writes the image and its credit together.

The grid is a new component, `components/CommonsResults.jsx`. The Media panel
and the draft panel drew their own copies of it when this section was written,
and section 2.14 is them moving onto it later the same night.

### 2.9 A table one column short is not a missing table

`gemlyx_feeds` was made before pages arrived beside groups, so adding a Facebook
page answered "Could not read the community feeds (400 PGRST204)". Two faults,
both in `utils/studioErrors.js`, which exists to stop exactly this:

- It said READ on a button that writes. Four operations shared one sentence.
  The verb comes from the call site now.
- A missing COLUMN had no classification at all, so it fell through to dumping
  PostgREST's words about a schema cache. It is `OUTDATED` now, classified ahead
  of the missing-table test because Postgres words the same fault with "does not
  exist", and the panel offers the same copy-button script, naming the column.

Two latent copies of the same trap went with it: the notice send path read any
error naming `gemlyx_notices` as the table being absent, and the research strip
ended "there is no SQL to run".

### 2.10 Booking.com, and the affiliates

- **Booking.com pays.** `kqzyfj.com` is CJ's click domain and his inbox carries
  the programme welcome from `noreply@cj.com`, 17 Sep 20:50. The click link is a
  prefix and the destination rides on `url=`, so the town search survives. Four
  disclosure sentences asked `BOOKING_AFFILIATE_ID`, which is still empty, and
  would have gone on saying a paid link earns nothing: they ask `bookingEarns()`
  now. The stay button went through `outboundLink`, which gave it the wrapper
  and the `sponsored nofollow` a paid link needs and did not have.
- **Good hotel and budget hotel.** `STAY_ORDER` in `utils/affiliates.js`, two
  Booking sort keys, on every stay card. An unknown sort key degrades to an
  ordinary search rather than breaking, so it was safe to ship before anyone
  pressed it. **Worth pressing both once** to confirm Booking honours them.
- **The partner hotel takes the good slot** in its own town, with "Other good
  hotels" beside it so a reader can pick another, which he asked for in the same
  message. And the constraint he set before any code existed, "obviously don't
  make the guide give a biased route towards the hotel": `featuredStayFor`,
  `PARTNER_ADS` and `BOOKING_CJ_LINK` are on `INVENTORY_MAY_NOT_SELECT`, so the
  suite fails if any of those names appears in the window of `App.jsx` that
  plans days and picks stops.
- **How we're paid** generates a row per named partner-ads advertiser from the
  same config the site reads, so the page cannot be out of date with the
  placement. The car row stopped naming AutoEurope, whose programme closed on
  14 September, and hides itself while no car programme pays.
- The cost list goes through `outboundLink` too. Every other kind on it stores
  an already-tracked URL; a stay line cannot, so the one paid link on the list
  was going out untracked with no disclosure.

### 2.11 The FAQ read

His gate: "probably mainly anything that can be seasonal", barred from price and
date, one page per draft, the operator's own site only. Built as
`faqLink`, `FAQ_FIELDS`, `FAQ_RULE` and `faqWorthReading` in `utils/pageScan.js`.

It runs after the writer and after the ordinary extraction, because "still
empty" is the whole of the gate. **The bar is structural**: the field list handed
to the extraction IS the list of empty practical fields, so a price on an FAQ
page has no field to land in. A sentence in a prompt asking a model not to use
what it was given is the weakest rule in this codebase.

The section page wins over one answer inside it: depth first, length as the
tie-break, or `/faq/hunde-ombord` wins on being shorter and the draft gets a
page about dogs.

### 2.12 Smaller things

- **`xn--bjrn-hrac.net` reads as `bjørnø.net`.** RFC 3492's decode half, written
  out because this runs in a browser where no decoder is exposed, and verified
  against Node's own punycode module before it went in.
- **A quota is not a blip.** Perplexity ran out mid-run on Avernakø and the last
  accuracy gate reported the provider's raw sentence. One `looksLikeBilling`
  test, used by the guide builder and the invented-claim check, and the note says
  it will fail the same way until the account is topped up.
- **The notices have somewhere to go after the pop-up.** He was offered a
  front-page strip, a bell with a count, or a push notification and has not
  picked. **This is the bell**, in the quietest form the chrome had room for: a
  gold dot on the account button, which is the way to the list, and the count on
  the menu item. Gold rather than red, because red on that button means
  something about THEIR trip changed. Nothing to undo if he picks one of the
  other two.

### 2.13 The measured-field escape hatch

Follow-up 1 from the first draft of this file, built the same night. Checker
section 3c and Fable's design, in `utils/correction.js`:

- `MEASURED_BY` maps a field to the RECORD that makes it a measurement:
  `travelTime` and `nearestStation` to `__journey`, `lat` and `lon` to `__lat`
  and `__lon`. `isPipelineOwned(key, entry)` now locks a field only while its
  record exists, so a row carrying a travel time and no journey has PROSE in
  that field and a correction may fix prose. `website` and `ticketStatus` stay
  locked unconditionally: neither is derived from a coordinate, so a wrong one
  is not a symptom of a wrong point. The second argument is optional and the
  answer without an entry is the answer the function has always given, so no
  existing caller changed.
- `remeasureFor` is the hatch. A confirmed claim that resolves to a measured
  field does not patch the field: it drops the MEASUREMENT, journey and
  coordinate with it, empties the two derived fields rather than rewriting them,
  and records `__remeasure` carrying the ADDRESS the human gave. One pending
  re-measure per row. A claim that names no place is refused, because clearing a
  row for nothing is worse than leaving it wrong.
- **The address is the point of it.** Fable's warning: run 1 derived Aalborg St.
  twice, at steps 10 and 12, from one listing. `App.jsx` geocodes
  `askedAgain.from` BEFORE the name and never reuses the row's own coordinate,
  or the re-measure reproduces the same wrong stop and the hatch is theatre.
- `describeRemeasure` says what happened, in the terms he asked for on 7 Sep
  about affiliate links: tell him what was inputted so he can test whether it
  got it right.

The one part of Fable's design NOT built: a re-measure that lands within
`IS_THE_CENTRE_KM` of the invalidated point should report "same point" and
change nothing. Today it re-measures and the log says where from. Worth adding
the day somebody corrects a row and gets the same answer back.

### 2.14 The three Commons grids became one

Follow-up 2, and the reason it was safe to do after all: the facts panel's
Wikimedia button never had a grid. Oliver, 18 Sep: "the published facts do not
allow me to pick out Wikimedia. It just chooses one from Wiki itself." It asked
for one result and took it.

`components/CommonsResults.jsx` is now the one results grid: the loading line,
the error line, the nothing-found line, the which-lookups-answered warning and
the cards. All three panels draw it, `<CommonsResults finder onUse busy
busyUrl />`. The query box and the caption checkbox stayed where they were,
since those are each panel's own wiring, which is why the grid was never shared
in the first place. The suite's pinned strings moved to the component in the
same edit, each with a comment saying which panel they came from.

### 2.15 Who may decide a price

Follow-up 5. Checker section 4: TinderBox step 28 printed "1395 DKK, from
danceus.org", an American dance listing, which won the slot because the
operator's own shop could not be read.

`priceSource` in `utils/entryAudit.js` takes `mayDecide`, and `App.jsx` builds
it off the ranked sources it already has: `official` and `listing` may settle a
figure, `reference`, `tourism` and `blog` may surface a candidate and may not.
An unranked host is refused rather than admitted, which is the direction of
error this codebase takes everywhere. A near miss now returns
`refused: "mayNotDecide"` with the host named, so the log says "danceus.org had
the number and may not state it" rather than going quiet.

### 2.16 Firecrawl and a non-ASCII host

Follow-up 6, half of it. `bjørnø.net` was the top-ranked official source and
Firecrawl refused it twice, so the draft was written off a tourist board
listing. `asciiUrl` in `utils/pageScan.js` converts the host to its punycode
form before the request, using the encode half written beside the decode from
section 2.12, and `firecrawlBody` goes through it. The log still prints the
readable name.

### 2.17 The affiliate copy, and the Tiqets price

Three of his messages, all about the same thing: the page about money may not
say anything untrue, and may not hedge so hard that a partner reading it would
object.

- **"Book direct: that is often the better price" is gone.** He is right that it
  was not true: where an affiliate is materially pricier it is not included at
  all, and several of these programmes are the page people book from anyway. The
  five programme disclosures and `partnerDisclosure` now say **"You pay exactly
  what you would pay reaching the same page without it"**, which is the claim
  that holds, in English, Danish and German.
- **"Be careful with WeGoTrip" is gone**, and the reservation behind it (that it
  is the closest thing on the list to what Gemlyx writes itself) is a code
  comment. A row belongs on that page only if there is a reason to use it, and a
  new assertion refuses any roster row whose `why` warns the reader off the
  thing it recommends.
- **Tiqets: "nearly identical price", not "the same price".** His words: "tiqets
  prices seem to be slightly different from the page own. I don't want to lie to
  users... Sell the affiliate by saying it's much more convenient to use." Rows
  301 and 5 of `data/essentials.js` and the Tiqets roster row now sell one
  order, one card charged once, every ticket as a QR code, free cancellation on
  most of them, against four checkouts and four cancellation policies at four
  own sites. The price claim is "nearly identical to the gate price" and the
  attraction's own site is still named as the one to check against. Asserted for
  every paid essentials row rather than for these two, so a third cannot ship
  claiming an identical price.

### 2.18 Estimated cost in the guide

"Can you implement estimated cost into the guide?" `estimateFrom` and
`describeEstimate` in `utils/costLedger.js`, rendered under the What you pay
list rather than over it: a total at the top is a number a reader takes away on
its own, and this one has conditions that only make sense after the lines.

Every rule exists to stop it being wrong in a way nobody can see. DKK only,
because there is no live rate in this app and a guessed one puts a wrong number
inside a figure that looks precise. The LOW end of a range, so it is a floor and
says FROM. Free counted, at zero, because leaving it out would make the most
certain line on the list look unpriced. Unpriced lines counted AND NAMED, since
"and 2 more" is not a thing a reader can check. A bed named as not included,
because the stay line is a search rather than a quote. And `null` rather than
zero when nothing is priced: "from 0 DKK" over a trip is worse than no estimate.

**Writing the assertion found the bug in it.** The first version counted every
priced line, which on the February fixture meant Distortion's 450 DKK: more than
half the total, for a June festival, inside a figure printed under a line
saying "there is nothing to buy for your dates". A refusal is the page telling a
reader not to count on something, so a refused line is now its own bucket,
reported in the sentence and never in the number. The figure on that fixture
went from 865 DKK to 255.

### 2.19 What he found on the 19th, and what was wrong

Two complaints, both correct, and the second one was a real miss rather than a
misunderstanding.

**"The tips are still not there."** He gave two banners on 18 Sep with one
instruction each: the hotel "on priority", the gear one "on tips". The hotel got
`featuredStayFor` and a render site in GuidePage the same night. The gear one got
a config constant, no function, and NOWHERE TO APPEAR. Worse, the roster row
described a Tips placement that did not exist, and section 1 of this file told
him the only blocker was naming the banner. True of one of the two.

Now built: `partnerAdsGear` in `utils/affiliates.js` and a What To Bring block on
the Tips tab in `App.jsx`. **The advice is not gated on the partner.** Five
things worth having in Denmark render whether or not a shop is named, because a
section that exists only when it can sell something is an ad with a heading, and
because gating it is what kept the Tips tab empty. Only the button waits for the
name. `partnerAdsGear` takes its row as an argument so the suite can see what a
named banner produces, which is how a source regex stops standing in for "does
the button work". It is also on `INVENTORY_MAY_NOT_SELECT`: gear carries no town
so it cannot tilt a route, and an exception argued case by case is how that rule
stops holding.

**"The legal documents about our affiliates are not either."** He asked on the
18th to add the hotel and the tip to the how we're paid page. Every row on that
page is generated from NAMED placements, so it said nothing about either. The
reasoning was half right: a button needs the advertiser's name, and that page
does not. "A Danish affiliate network, two programmes signed up here, neither
live, nothing on the site links to them yet" is true without a merchant name,
and leaving it off the one page whose job is to be complete about money is the
omission he objected to. `partnerAdsPendingRow` adds it, earning nothing, in the
same size type as a live row, and it disappears on its own the day a banner is
named. The studio panel and the public page are compared through the slot now,
so one panel row can answer for a named row and a pending one.

**Two things from the concerns list, done in the same pass.** The refused lines
are named with their prices under the estimate, so a reader who adds up 145, 450,
160 and 110 can see exactly which figures were removed from 255 and why. And a
party gets a group total: `partyOf` reads a headcount out of `_travelers` only
where a number sits beside a word about people, in English and Danish, and
answers null everywhere else, because multiplying money by a wrong count is worse
than printing nothing. With children in the party the line says everybody was
counted at the adult price and that the real figure is usually lower.

### 2.20 Both banners named, off his own program pages

19 Sep 2026. He sent screenshots of partner-ads programinfo for both, which is
where the names came from: **Hotel Viking Aqua, Spa & Wellness** (id 8081,
banner 77692) and **Travelbetter.dk** (id 11663, banner 112737). The hotel's
town and site were checked against the hotel's own pages rather than assumed,
because `town` is what the row is matched against: Saeby, in Frederikshavn
kommune, and hotelviking.dk.

Three things came out of naming them that were not visible while the config was
empty.

**A klikbanner URL does carry a destination.** Every comment in affiliates.js
said it did not, which was true of the link he pasted and false of the network:
his program page offers `&htmlurl=PRODUKTLINK`, which lands the click inside the
advertiser's own site. `partnerAdsUrl(banner, { to })` now supports it, and the
guard is the feature: a destination is only sent when its host matches the
`site` configured for that banner, so the hotel's banner cannot be pointed at
the shop and neither can be pointed at anywhere else. `deepLink` is optional and
unset for both, because nothing here should guess a path on somebody else's
website.

**A town match that dies on one letter.** `sameTown` compared lowercased
strings, so a guide spelling it "Saeby", which half of Danish web writing does
and which this app's own danishNames.js exists for, would never have matched
"Saeby" written with the Danish letter. The hotel would simply not have
appeared: nothing on screen, nothing in a log, a paid placement that looks
unconfigured. It goes through `fold` now, and five spellings are asserted.

**A shop is not booked on.** `linkLabel` said "Book on X" for every named
partner, which is the wrong sentence about a rucksack. `partnerAdsSlot` is now
one definition of which banner is which, read by the placements, the roster
wording and the verb, so the hotel says Book on and the shop says Shop at.

The refusal for an unnamed banner did not go anywhere: it is asserted against a
banner id that is not in config, which is the state the next banner he is given
will be in until he pastes one line. Same for the pending row on the affiliates
page, which retired itself when the second name went in and is now tested
through its argument rather than through a config state nobody is in.

---

## 3. WHAT IS STILL OPEN

### His, to decide

- **Where a notice surfaces**, properly. The bell is in. A front-page strip and
  a push notification are still unanswered.
- **Private groups.** A future project in his words.

### Named follow-ups, in the order I would take them

The six in the first draft of this file are four built and two left. What
remains, and what the new work opened:

1. **The same-point answer for a re-measure.** Section 2.13. A correction that
   re-measures to within `IS_THE_CENTRE_KM` of the point it invalidated should
   say "same point, nothing changed" rather than quietly measuring again. It is
   the difference between a hatch that reports and one that absorbs.
2. **Ferry resellers.** `ferrysavers.co.uk` and `aferry.com` were read for
   15,000 characters across two runs. The operators now outrank them, which was
   the half that mattered, but they are still ordinary sources for a fare.
3. **The age gate and identity, properly separated.** Run log section 4. A small
   ferry's own page with 1994 in the footer is still demoted for perishable
   claims, which the run log itself argues is correct, and the contradiction it
   produced is gone. If he wants an operator's own page to be able to state a
   fare at eight months old, that is a product decision and not a bug.
4. **Bjørnø, the rest of it.** Section 2.16 fixed the host. Whether Firecrawl
   can read that site at all is unknown until a run tries it, and a draft
   written off a tourist board listing should probably say so in the log.
5. **The estimate on a guide with a real stay price.** Section 2.18 counts a
   stay line the day one carries a figure, and nothing carries one today:
   `bookingUrl` is a search, not a quote. If he ever wants a bed inside the
   number, that is where it would come from, and the caveat sentence already
   knows how to disappear.
6. **A deep link for either partner-ads banner.** `deepLink` in
   `PARTNER_ADS_BANNERS` is supported, guarded to the advertiser's own host, and
   unset. A hotel link that lands on the booking page rather than the front page
   is worth more than one that does not, and the path has to come from somebody
   who has looked at the site.
7. **Nothing from 18 or 19 Sep is deployed.** The whole of it is uncommitted on
   one laptop, and OneDrive rather than git is what saved the source directory on
   the 18th. Worth splitting into three or four commits before pushing: the
   affiliate and copy work, the measured-field hatch with the price decider, the
   Commons grid, the estimate. A single 26 file commit cannot be bisected if the
   deploy comes up wrong.

---

## 4. HOW THIS SESSION WORKED

- The repo was cloned from GitHub rather than staged file by file, which is both
  faster and exactly his committed state: `git clone` then `npm ci`. Worth
  repeating.
- `node --max-old-space-size=3072 tests/run.mjs` and `npx vite build` after
  every change, not at the end. Every assertion the change broke was updated in
  the same edit, which is the rule the pre-push hook exists to enforce.
- Every file written to his disk was staged back and byte-compared, and the path
  was checked against the one the build uses.
- **His laptop went to sleep mid-session** and `device_commit_files` timed out on
  a 7 MB batch. Smaller batches after that, largest files alone. Anything written
  under `/mnt/user-data/outputs/` reaches him through the chat sidebar whether or
  not the laptop is awake, so nothing was lost.
- Two scripted patches wrote `{{` into real code, from a Python format string
  that was never formatted. Caught by the build in seconds, but worth the note:
  a patch script that builds JavaScript needs its braces checked before it runs.
- **The assertion is part of the change, not a receipt for it.** Section 2.18 is
  the clearest case this session: the estimate passed a manual read and a build,
  and writing its test is what surfaced a figure that was 240 percent of the
  honest one. Nothing shipped tonight without its assertions in the same edit.
- Every file he has on disk was byte-compared at the end of the session, not
  only the ones written in the last batch. Two were the same size and different
  content earlier in the week, which is the failure that check exists for.
