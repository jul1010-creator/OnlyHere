# Handoff, overnight into 25 August 2026

Written while Oliver slept, on his instruction: the five things from the last
handoff, any further EU regulation that reaches the code, and a second reading
of the fifty point review.

**Six changes, all tested, all mutation tested.**

    node tests/run.mjs      10,048 passed, 0 failed
    npx vite build          clean

Changed on disk, uncommitted:

    src/utils/pageScan.js         the date reader
    src/utils/readPage.js         the redraft cache
    api/scan-source.js            the redraft cache
    api/search.js                 the domain pin
    api/directions.js             a comment that was teaching the wrong rule
    src/utils/entryAudit.js       price provenance
    src/utils/provenance.js       the sources gate
    src/utils/aiDisclosure.js     nothing, but see the size rule
    src/components/AskGemlyx.jsx  disclosure size
    src/pages/GuidePage.jsx       disclosure size
    src/App.jsx                   the callers for all of the above
    tests/run.mjs

---

## 1. Why a museum's own site read as 236 months old

The root of last night's wrong citation, and it is one line of arithmetic.

`factAge` takes the newest FULLY-QUALIFIED date on a page. Danish local sites
write their opening season without a year, `15. juni til 31. august`, so
`newestDateIn` cannot see the live content at all. What it can see is the history
section: *"Museet blev indviet 12. marts 2006"*. It aged the page from that.

**The asymmetry underneath is the actual defect.** A page with NO date passes,
because it cannot be aged. A page with ONE old date fails. So the more a place
writes about its own past, the less this trusts it about its present, and a
local museum is the worst possible case.

The fix reads the disagreement rather than either signal alone: **if the page
mentions a year newer than its newest full date, that full date is prose and not
a timestamp.** A page saying "indviet 12. marts 2006" and carrying "2026"
somewhere is a current page about old things.

Conservative in the direction that matters. A stale page has no newer
year on it, so nothing here can make one look fresh. Two of the mutations were
caught by assertions written in August for the old behaviour, which is the best
outcome a change like this can have.

## 2. A redraft may not be answered from yesterday

His instruction, and the comment above `FIRECRAWL_CACHE_MS` already described the
mechanism without noticing the consequence: *"gemlyx_research stores a place's
source URLs and reuses them on redraft... so a redraft an hour later asks for the
identical pages."*

A day of cache is right for a first draft. It is wrong for a redraft, because a
redraft is started BECAUSE somebody suspects the page changed, and answering
that from a copy taken before the suspicion is the one thing it must not do.

`fresh` now runs `firecrawlBody` → `readFirecrawl` → `readPage` →
`/api/scan-source?fresh=1`, and all five scan-source call sites mark a redraft
with `editingId !== null`. The suite counts the call sites and requires every one
to carry the marker, so a sixth cannot be added without it.

**One honest limit.** Firecrawl's response does not say whether it served a
cached copy, so this asks for a fresh fetch and cannot confirm it got one. That
is recorded rather than assumed.

## 3. A page that contains the number is not a source for it

`priceSource` walked the read pages in rank order and returned the first one
whose text contained a matching figure. Nothing asked whether the page was about
the entry. That is how Bybjerg's admission price, which is correct, ended up
citing a page that does not state it.

It now takes an injected `isAbout`, and the caller passes `sourceIsAboutPlace`,
the same test the ticket matcher already uses. Injected rather than imported so
`entryAudit` does not have to reach into `sourcePolicy` and make a cycle, which
is the pattern `reachOf` and `townPoint` already follow.

**A price found only on off-subject pages is refused, not downgraded.** It comes
back marked `offSubject`, the Studio says which page had the near miss, and
nothing is stored. An empty `__priceSource` means "we cannot show you where this
came from", which is true. A wrong one means "here is where this came from",
which is not.

A matcher that throws never passes a page, for the same reason a failed ferry
probe teaches nothing.

## 4. A constraint sent is not a constraint honoured

The generalisation of the ferry bug, swept across every endpoint. Three
constraints leave this app:

| | | |
| --- | --- | --- |
| `avoid=ferries` | `api/directions.js` | Google relaxes it. Now read from the returned route. |
| `include_domains` | `api/search.js` | **Was returned unchecked. Now filtered.** |
| `maxAge` | `utils/pageScan.js` | Firecrawl's own cache, not confirmable from the response. |

**The second one was live.** When a caller pins a search to a founder source,
the run report says "8 pages from that site", and nothing had ever confirmed the
pages were from that site. Results outside the pin are now dropped and `offPin`
says how many, so a silent narrowing is visible instead of a mystery.

A subdomain counts as inside the pin. Pinning `loekkenkoncert.dk` has to reach
`billet.loekkenkoncert.dk`, which is where a small Danish event sells its
tickets, and an exact-host test would have dropped the only useful page.

`mode` and `departure_time` are not in this class: they select what is computed
rather than restrict it, and a wrong answer shows up as a number somebody can
see rather than as a silently inverted geographic fact.

**And `api/directions.js` was teaching the wrong rule.** Its comment said a
returned route proves a land connection. Anybody reading it would rebuild the
bug, so it now says what the probe really measures, with the six islands named.

## 5. The field that was carried and never required

Coordinates have a gate. A dateless festival has a gate. The photo path is
probed before it is stored. `__sources`, the one field the product's whole
promise rests on, had nothing, so 148 entries went out and 77 of them cannot
show a reader where anything came from.

Publishing now raises a shouted `CHECK BEFORE PUBLISHING` note into the draft's
own uncertainties when nothing records where the entry came from. A note rather
than a refusal, because 77 rows already carry the defect and a hard block would
lock him out of editing his own library over something he inherited.

`hasEntrySources` refuses a string that is not a URL, which is the 7 August photo
lesson one field over: storing the key does not make it a source.

**One assertion in this block was weak and I caught it by mutation.** It counted
occurrences of the guard prefix, so pointing both publish notes at the same
sentence satisfied it, which is exactly the collapse it existed to prevent. It
now counts DISTINCT guards.

## 6. Article 50 has a size

The disclosure shipped at 10.5px on two of the three surfaces, which is the
smallest type on those screens. Article 50(1) asks for the information "in a
clear and distinguishable manner" and says it must meet accessibility
requirements. A legally required disclosure set in the text your eye skips is
arguable at best. Pinned at 11px or above, read off the render rather than
trusted.

---

## The second reading of the fifty point review

Two items were triaged as part-built and last night proved the built part was
defective, which is a different thing:

* **Item 8, prevent impossible itineraries.** "Validated against transport
  availability" was counted as built. An island classified as mainland is an
  impossible-itinerary generator, and it was running on every Danish island.
* **Item 39, make source freshness part of the architecture.** Counted as
  part-built. The built part was actively wrong and had produced a visible
  failure: it demoted the only authoritative source on the page.

**And item 9 is the convergent one.** "Introduce confidence / verification logic
internally", distinguishing Verified/live, Stable, Estimated and AI judgement.
ChatGPT asked for it in the review. Gemini arrived at the same idea independently
as its Priority 1/2/3 tiering. Our own week produced `MEASURED_FIELDS`,
`safetyClaims`, `__priceSource` and `factAge`, which are four corners of it built
separately. **Three independent sources and our own code all point at one system
that does not exist as a system.** That is the strongest signal in the document
and it is still unbuilt.

### What I think was overlooked: item 32

**There are no analytics at all.** The Travelpayouts script was the only tracker
and it was deliberately removed on 23 August. The published privacy policy says
no analytics and no tracking pixels.

Which means every decision in the last two days was made blind: what to charge,
whether the Copenhagen offers work, which of the 29 sourceless towns to redraft
first, whether anybody finishes a guide. Item 49 says the next milestone is
real-user testing, and there is currently no way to observe a real user.

**There is a clean path and it is worth knowing before the cookie banner
argument starts.** ePrivacy Article 5(3) is triggered by storing information on,
or reading it from, a device. Count events server-side with no cookie and no
identifier and that trigger is absent, and aggregate counts with nobody
identified are not personal data under the GDPR either. Denmark is not in the
group of member states that has published an explicit analytics exemption, so
this wants confirming with Datatilsynet rather than taking from me.

**I did not build it, deliberately.** The privacy policy currently promises no
analytics, and adding measurement while you sleep would make a published legal
document false. That is the exact failure the 23 August pass was written to fix,
and it is not mine to create at three in the morning.

---

## What I think you should do now

1. **Push this, then run the `updated_at` SQL.** It is in `manageGroups.js` and
   it is the only thing here that needs your hands.
2. **Decide about analytics.** Everything else you asked me this week was a
   question that measurement would answer. It is one endpoint, one table, a
   privacy policy version bump, and no cookie banner if it is done server-side.
3. **Build item 9 as one system**, since three independent reviewers and your own
   code have now converged on it. The pieces exist: `MEASURED_FIELDS`,
   `safetyClaims`, `__priceSource`, `factAge`, `__sources`. What is missing is
   one place that says which tier a field is in and one render that never gives
   an estimate the visual authority of a measurement.
4. **Then the 29 towns.** Not before the above: redrafting is the expensive fix
   and the freshness and provenance repairs landing tonight change what a redraft
   produces.

## How this was checked

Every change mutation tested: the mutation applied, the suite run, the failure
read by name, the file restored. Fifteen mutations across six changes, and two of them were caught by assertions written weeks ago for the behaviour they protect,
which is what a suite is for.

One mutation revealed a weak assertion of my own and it was rewritten before the
change shipped. One earlier mutation run silently did nothing, because a shell
`IFS=:` split the replacement strings on their own colons; it was redone
properly rather than counted as a pass.
