# Overnight, 16 Sep 2026

Continues `HANDOFF_15SEP_AFTERNOON.md`. **Section 0 of that file still stands:
the API Direct pipeline work is on disk, dark, and Fable has to read it before
anything turns it on.** Nothing below changes that.

Everything here is on your disk and was staged back off it and checked by
marker afterwards.

## 0. THIS PUSH WAS RUN BEFORE IT WAS HANDED TO YOU

**17,271 assertions passed, 0 failed, and `vite build` is green.**

This is new, and it is the useful part of tonight. The whole project now runs in
the cloud sandbox: the src and api trees, the tests and the four root files the
suite reads were copied up, `esbuild` and the dev dependencies installed, and
`node tests/run.mjs` ran end to end. So the pre-push hook is no longer the first
thing that sees my work.

Two of your last three pushes failed on something I could have caught this way,
including the rollup one, which was a missing install rather than a test at all
and is exactly what `vite build` catches. Both now run here before the files
reach you.

One assertion fails in the sandbox and is not a real failure: *"and it is a real
file in public/"* looks for `public/og-default.jpg`, which is an image I did not
copy up. With it copied, the count is clean.

## 1. AI pictures: you were right, and it is narrower than you feared

"According to EU laws, I believe I need to explicitly state that the picture is
AI. I might be wrong."

You are right. AI Act Article 50(4) puts the duty on the **deployer**, which is
you, not on whatever tool made the image. What it catches is content that
resembles "existing persons, objects, places, entities or events" and "would
falsely appear to a person to be authentic". A photorealistic picture of a real
Danish harbour, on the page about that harbour, is squarely inside it. The
disclosure has to be visible, readable without special tools, and present "upon
first exposure at the latest". Article 50 has applied since 2 August 2026.

Two things it does NOT require, which is where the fear usually is: it is not a
watermark you have to burn into the picture, and it is not a legal notice. A
visible label on the picture is the whole obligation.

What shipped:

- **`src/utils/aiImages.js`** (new) holds the label, the flag and the reading,
  with the sources and a plain "NOT LEGAL ADVICE" line, so a lawyer can check it
  rather than rediscover it. It cross-references `utils/aiDisclosure.js`, which
  already handled the TEXT half of the same Article; between them Article 50 is
  covered once, in two files, with no overlap.
- **A second upload door in Studio**, `✦ Upload AI picture`. Not a tick box
  beside the ordinary upload: a tick box is a disclosure that depends on
  remembering, and this one cannot upload without setting the flag.
- **The disclosure reads as a credit, not a warning label.** Your call, 16 Sep:
  *"Just setup the AI as credits. Like 'AI-assimilation of [draft]'."* So the
  gold chip under the picture sits where a photographer's name would go, and the
  redundant "AI image" source line underneath is gone. The subject comes off the
  draft's own name at upload, so you never type it and it cannot be forgotten.
- **The word is "impression", and that is because of what these pictures are.**
  You then said they are "based off the atmosphere, area, and overall theme",
  which moves the wording toward MORE disclosure rather than less: these are
  mood pieces, not renderings of one building, and a reader who takes one for a
  photograph has been told something about a place that nobody checked. That is
  the stranding this project spends its whole time avoiding. *Impression* is the
  word a painter's caption uses and it means evocative rather than documentary,
  so `✦ AI impression of Ribe` tells a reader both things at once: a machine
  made it, and it is not a photograph. It still satisfies 50(4), because the
  duty is that a reader can tell the picture is artificially generated at first
  exposure, and the line leads with AI.
  It is one constant, `AI_LEAD` in `utils/aiImages.js`, and the assertions are
  written against the constant rather than the words, so you can argue about the
  wording without breaking anything. Two of them hold whatever you pick: the
  line starts with AI, and it never claims to be a photograph.

**One decision left for you, and it is a real one.** The entry page is labelled.
The hero thumbnail on a list card is not, and a card is also "first exposure" —
somebody scrolling Attractions sees the picture there before they open anything.
There is no shared card component, so labelling it means touching about eight
inline render sites in App.jsx. Three options, in the order I would consider
them:

1. **Do not use generated pictures as the hero image.** Generated pictures go in
   the body, where the label already works, and the card keeps a real photograph
   or the existing no-photo placeholder. No code, and it is the option that fits
   what Gemlyx claims about itself.
2. Label the cards, once the eight sites are worth unifying into one card
   component anyway.
3. Leave it, on the reading that a thumbnail in a list is not a publication of
   the image in itself. I would not rely on this one.

I did not pick for you because option 1 is a content policy, not a code change.

## 2. Arrival and departure are on the front page now

"People tend to miss this AI planner."

Two date fields sit directly above `Plan my trip`, and the button now lands on
the Sightseeing row of Detour with the dates already filled in.

**There is one set of dates, not two.** The hero fields write into
`intakeArrival` and `intakeDeparture` — the same two values the Detour intake
reads and writes. "Pre-filled" is therefore not a hand-off that can drift: it is
the same state, read on two screens. The obvious build, a pair of hero-only
states copied across on the click, works the day it ships and then shows a
traveller two different arrival dates for one trip. There is an assertion that
counts the arrival states in the whole file and fails at two.

**They are native `<input type="date">`, and that is deliberate rather than
lazy.** The hero is `overflow: hidden` (a full-bleed video sits in it) and it
lives inside the tab strip, which carries a live `translateX`. A transformed
ancestor is a containing block for `position: fixed`, so inside that box neither
a dropdown nor a fixed sheet can get out — your custom calendar would be sliced
off at the hero's edge. A native picker is drawn by the browser outside the
document and cannot be clipped. `min=` still refuses past days and still refuses
a departure before the arrival, and on a phone it opens the OS date wheel, which
is a better control than anything we would build. The custom `DateTimePicker`
stays where it is, in the intake, where it has room.

Details that will save you a bug report:

- A time you set in Detour survives a date change made in the hero. Somebody who
  entered a 22:40 landing and then corrects the day does not get put back to
  noon.
- A departure earlier than the new arrival is **cleared**, not quietly moved.
  Rewriting somebody's departure date for them is the kind of help that gets
  discovered at an airport.
- The hero writes the intake's own string shape, `YYYY-MM-DDTHH:MM`, local, no
  timezone suffix. A bare day would have been read as UTC midnight by
  `tripWindow` and `fetchGuideWeather`.
- An empty field is dimmed, so "filled in" is visible from across the screen
  rather than looking like a date somebody already chose.

Checked in a real browser at 1280, 390, 375 and 360 wide: nothing is clipped,
there is no horizontal overflow, and the round trip works — pick 2 Oct and 9
Oct in the hero, press the button, and Detour opens showing "2 Oct 2026, 12:00"
and "9 Oct 2026, 12:00" with the progress line already reading 2 of 7.

## 3. Islands are their own type and their own page

"There are alot of islands. So make such a navigation."

**Islands is the ninth tab, sitting next to Towns.** `#islands` in the address
bar, `Øer` in Danish, `Inseln` in German, its own drawn icon. The page is
deliberately plainer than Towns: a search box and one filter, bridge or ferry,
because there are not hundreds of Danish islands anybody visits and a five-facet
filter bar would be furniture. It ships empty and says so in a box rather than
rendering a heading over nothing.

### Your own earlier decision, which I kept

`geography.js` carries your argument from an earlier session: *"Sejerø IS an
island; Ærøskøbing is a town ON one. One field answers both"* — which is why
`island` is a FIELD on a town and not a value in `placeKind`. That is untouched.
What is new answers a different question: the page **about** Bornholm, not the
tag on a town that sits on it. Ærøskøbing stays a town carrying `island: "Ærø"`;
Ærø becomes its own entry. Both go through the same `cleanIsland`, so the Island
filter on the Towns page and an island's own page read one vocabulary. There is
an assertion that fails if a later pass deletes the field thinking the type
replaced it.

### What an island entry is

A town's fields, plus the door: `fixedLink`, `ferryOperator`, `ferryFrom`,
`ferryTo`, `crossingGlance`, `offSeasonGlance`. Every one of them is a separate
stored field rather than a sentence inside the prose, because a sailing time
buried in a paragraph cannot be checked, cannot go in At a Glance, and cannot be
found again when the operator changes it.

Every crossing field **defaults to empty and stays empty**. An island drafted
without the operator's own page in front of it prints no crossing at all, which
is the honest result — a default here would be a claim about a boat. The prompt
says to take them from the operator and not from the island's tourist board,
which is the pair that has already disagreed once in your own drafts.

**The bridge is asked about first**, because it is the thing an island entry is
most likely to get confidently wrong. Langeland has a road bridge. Mors has one.
Bornholm has neither and is reached through Sweden. "Ferry only" printed about a
place you can drive to is as wrong as the reverse.

It carries no `placeKind`: city/town/village/area answers how big a settlement
is, and an island is not a settlement. An island with a `placeKind` would be
swept into `isArea()` and vanish from its own page.

It is measured from Copenhagen, like a town, because an island IS the
destination — measuring one from its own centre would have printed a journey of
a few hundred metres.

### Converting a published town, which is the part that saves money

"Let me be able to change Præstø and Samsø from towns.. so I save money."

There is a **⛴ Make it an island** button on every published town row in Manage.
It opens six boxes, and nothing else: the prose, the photo credit, the
coordinate, the sources, the themes, the tier and every glance field carry
across untouched, because the island shape was written to match the town shape
field for field wherever the two mean the same thing. There is an assertion that
walks both shapes and fails the moment they drift apart, which is what keeps the
conversion free next month as well as today.

Three things it does deliberately:

- **It will not save without either a fixed link or BOTH ports.** A converted
  town is the one island entry guaranteed to have been researched without
  anybody asking about a ferry. One port on its own is not a crossing: Danish
  islands are routinely served from two or three mainland harbours.
- **It drops `placeKind`** on the way through, and changes the type and the
  payload in a single PATCH. Either half alone is a row that renders wrongly or
  not at all.
- **The photo path moves to `/islands/<slug>.jpg`** and the toast tells you to
  put a file there. A path is not a picture; your old town photo stays where it
  was.

There is no button back. An island converted to a town would keep crossing
fields the town shape drops on the next publish, so the way back is a redraft.

**One note on Præstø.** It is on Zealand, on the fjord, with roads in and out —
it is not an island. Samsø obviously is. The button will convert whatever you
point it at, so this is the only place the check happens.

### Still to do on islands

- **Put photos at `public/islands/<slug>.jpg`.** The folder does not exist yet.
- **Guided tours are switched off for islands.** `TOUR_TYPES` was left alone, so
  no island row searches GetYourGuide and none of them spends anything. Say the
  word and it is one line, but it opens an affiliate surface and you did not ask
  for one.
- **Audio walks stay town-only**, unchanged: `wegotripMatch`'s `TOWN_TYPES` is
  still `["town"]` and the reason is written there.

## 4. FOR FABLE, ADDED TO THE PIPELINE REVIEW

Oliver, 16 Sep 2026: *"put into note that Fable has to put into future events
that Facebook websites might publish the ticket links. So their Facebook site
has to be searched through when events get the weekly update."*

This is a NEW item on the Fable list in `HANDOFF_15SEP_AFTERNOON.md` section 0,
and it is a real gap. Today a Facebook page cannot reach an event at any stage:
`NEVER_A_SOURCE` in `sourcePolicy.js` matches facebook and instagram, so a page
found during research is refused, and `settlingStrength` in
`uncertaintyResolve.js` returns WEAK for the same domains, so a Facebook post
cannot settle a caveat either. The social sweep finds accounts and writes them
to `__social` for the section at the bottom of the entry. It never runs during a
draft and it never reads a post.

For a small Danish event, the Facebook page is often where the ticket link is
published first, and sometimes the only place it is published at all.

**Where it belongs: the weekly update, not the draft.** `api/update-events-check.js`
already walks the published events and asks whether each is still happening, on
that date, at that ticket status. That is the pass Oliver runs weekly from
Studio, and it is the right place for this, because a ticket link that appears
three weeks after publication is exactly the kind of change that pass exists to
catch.

What Fable has to settle, and the distinction is the whole question:

- **A LINK IS NOT A CLAIM.** `NEVER_A_SOURCE` exists to stop a Facebook caption
  becoming a fact in research prose. A ticket URL found on a Facebook page is a
  different object: it is an address to follow, and what it leads to can be
  checked on its own terms by `ticketLink.js`, which already knows what a real
  Tiqets, Ticketmaster or WeGoTrip ticket URL looks like. So the carve-out can
  be narrow: Facebook may SURFACE a candidate link, and the link only survives
  if `isBookableTicketUrl` recognises the destination. Facebook never supplies a
  price, a date or a sentence.
- **Which endpoint, and at what cost.** `/v1/facebook/page` returns page details
  including `website`; `/v1/facebook/page/posts` returns captions with
  timestamps. Requests per event, counted before anything is spent, behind the
  same explicit press as the paid sweep, same as the rest of the API Direct
  work.
- **What happens to a link that is not recognised.** It must not be written onto
  the row. The honest result is a note for Oliver in the update report saying a
  candidate was found and could not be verified, in the same shape the update
  pass already reports a date change.
- **The affiliate rule still applies.** `affiliateRoster.js` and the ticket
  policy decide which links may reach a reader at all. A link found on Facebook
  does not get a pass around that, and this must not become a side door for one.

## 5. A SECOND FABLE ITEM, AND IT IS THE URGENT ONE

`FOR_FABLE_16SEP_CHECKER.md`, written from your run log export.

Short version. "Aalborg St." on a Copenhagen event is not a checker bug, it is
step 1 of the run: the geocode that happens BEFORE the research took the
organiser's address in Aalborg and everything downstream inherited it, including
which region the founder sources were scoped to. TinderBox has the same failure
through Nominatim, and its own log line prints the contradiction out loud:
"scoped to Odense, in Storkobenhavn, on Zealand".

I checked oktoberfestdk.dk myself: it is the event's own site, it says
Radhuspladsen with metro access, and its "Fra 50 kr." is admission. So your guess
about the 50 kr being a parking fee is the one thing in there that is working
correctly, and it would have been easy to break it fixing the rest.

One fix went in tonight: the panel printed "Not applied, a source says otherwise"
over every rejection, including a page that could not be read and a page that
agreed with the correction. It says "Not applied" now and the evidence underneath
carries the reason, which it was already doing correctly.

The decision itself is still wrong and that part is Fable's, because it sits in
the middle of the publish path. The note lays out three stacked causes, and the
one worth his hour is this: `nearestStation` is a measured field, so the
assistant is structurally unable to correct it, which is right until the
coordinate it was measured from is wrong, and then it is a trap.

## 6. Still waiting on you

- `alter table public.gemlyx_support add column if not exists name text;` in
  Supabase. The insert retries without the field if the column is missing, so
  pushing first cannot lose a message, but the name will not be stored until you
  run it.
- The card-thumbnail decision in section 1.
- The Præstø question in section 3.
- Photos for any island you publish, at `public/islands/<slug>.jpg`.
- Fable on the pipeline work, Friday.
