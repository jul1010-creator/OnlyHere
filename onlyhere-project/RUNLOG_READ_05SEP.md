# Reading the run log — 5 September 2026

Four runs in the export you sent: **Sebbersund Vikingemarked**, **Køge Festuge**,
**Bork Vikingemarked**, **Jelling Musikfestival**. Runs 5 to 8 were cut off by
the paste.

Everything below was checked against the code, not just read off the log. Where
I say a function does something, I have opened it.

The short version: **Jelling is the run that worked, and comparing it against
the other three names the fault exactly.** Jelling read the operator's own site;
the other three did not, and four separate checks quietly turned themselves off
as a result. Two of the three had the operator's page in their hands and did not
recognise it.

---

## 1. The operator's own page was read, and then not counted as the operator's

**Køge Festuge, steps 19 to 22.**

```
19. The ticket agent, asked for directly [perplexity · ok]
    got: 3 candidate pages: koegefestuge.dk, radar.promogogo.com, ...
20. Ticket page from Perplexity: koegefestuge.dk [fetch · empty · discarded]
    got: read, and it does not price this event, so it was discarded
22. Whose words the checks will use [fetch · empty]
    got: NO operator page was read. Only a listing on festt.io,
         concerts50.com, bandsintown.com, photos.bandsintown.com
```

`koegefestuge.dk` **is** Køge Festuge's own website. It was fetched, in that run,
two steps before the log said no operator page was read.

**Why.** The Perplexity ticket-agent branch appends everything it fetches to
`listingSiteText` and `listingDomains`, and tells the model in writing that the
page "is a ticket shop and NOT the operator... may never be called the official
site". That is the right default for a page found by asking where tickets are
sold. It is applied with no test, so a page that happens to be the operator's own
gets the same label.

**The app already owns the test.** `hostMatchesName` in `helpers.js` flattens
Danish characters and compares: `flat("Køge Festuge")` is `koegefestuge`, and the
bare host is `koegefestuge`. Exact match. `isNeverOwnSite` in `sourcePolicy.js`
already refuses the aggregator hosts that would otherwise false-positive. Both
are used elsewhere for exactly this question.

**What it cost, in that run.** Three checks reported "nothing measured" and one
reported a gap, all for the same reason:

- step 23 — What language this runs in: *"the operator's own site was not read"*
- step 40 — Dates against the official site: *"no operator page was read"*
- Prices against the official site: fell through to the listing branch

Jelling proves the machinery works when the page arrives through the ordinary
door: step 14 read `jellingmusikfestival.dk` as a plain source read, step 21 said
*"the operator's own page was read"*, and step 36 then confirmed the dates on the
site itself: **2027-05-27 to 2027-05-30**. That is the only date in these four
runs that came from the organiser.

**Bork is the same fault one step earlier.** It never found the operator at all.
It read `esmark.info` (a holiday-home rental site) and `kultunaut.dk` (a
calendar), and step 18 followed a link to
`ringkobingfjordmuseer.billetexpressen.dk`. The operator's own name is inside
that hostname and nothing derived `ringkobingfjordmuseer.dk` from it.

---

## 2. The host named beside a price is not the host that said it

This is the one I would fix first, because it puts a wrong citation on the most
actionable line in the log.

**Sebbersund, steps 27 and 40:**

```
What the pages say a ticket costs [fetch · FOUND A GAP]
  got: 10 DKK, from vikingeskibsmuseet.dk
```

`vikingeskibsmuseet.dk` is the Viking Ship Museum in **Roskilde** — a different
institution, on a different island, 250 km away. Whatever 10 DKK is, it is not
the entry price of a market near Nibe.

**Why the name is wrong.** `findTicketPrice` is handed two things: one
concatenated blob of *all* site text and one of *all* listing text, plus the
lists of hosts. It reads the blob. The run log then names the host like this:

```js
const priceFrom = (w) => (w.from === "official-site"
  ? (w.siteHosts?.[0] || "the operator's own page")
  : (w.listingHosts?.[0] || "a ticket shop or calendar"));
```

`[0]`. The **first** host in the list, never the one that carried the figure.
Nothing in the pipeline records which page a price came off, so the sentence
"10 DKK, from vikingeskibsmuseet.dk" is a guess wearing a citation.

**`entryAudit.js` already hedges this and `App.jsx` does not.** Its `whoSaid`
writes `"esmark.info (of 3 pages read)"` when it cannot tell which — which is why
Bork's founder note reads honestly and the run-log line above does not. Two
functions answering one question, one admitting its uncertainty.

Same mechanism, Jelling, steps 28 and 29, four lines apart:

```
28. What the pages say a ticket costs: festapp.io says entry is free
29. Where the price came from: 2095-2095 DKK is on jellingmusikfestival.dk
```

The "free" and the 2095 are in the same concatenated listing blob. Note that
`jellingmusikfestival.dk/info/billet-info` — the operator's own ticket page — is
*in the listing blob*, because of finding 1. So the operator's price is being
reported under an aggregator's name.

---

## 3. "Do the sources cover the subject" does not ask whether they are about it

**Sebbersund, step 29: `8 of 8 pages read mention the subject`** — on a run whose
sources were the Roskilde Viking Ship Museum and Ticketmaster category pages, not
one of which mentions Sebbersund Vikingemarked.

`sourceFit` tests each page's title and snippet against `QUERY_WORDS[type]`,
which for a festival is:

```
festival: "billetter datoer program tickets dates programme"
```

A Ticketmaster festivals category page contains "tickets" and "dates". A museum's
practical-information page contains "opening" and "programme". So they pass.

The check is not broken — it answers "does anything we read address the kind of
question this type asks", which is worth asking. But its **label in the run log**
promises the other question, the one that matters here: *are these pages about
this place?* Bork's `1 of 8` reads as a warning and Sebbersund's `8 of 8` reads
as a clean pass, and Sebbersund's sources were the worse of the two.

The name test exists: `containsName` and `matchVariantsOf` in `danishNames.js`,
`sourceIsAboutPlace` in `sourcePolicy.js`. Bork's step 27 already uses it —
*"the page is not about Bork Vikingemarked, so it is not a source for it"* — on
one price check and not on the one beside it.

---

## 4. Same shape, three times

Findings 1, 2 and 3 are one fault wearing three hats:

| Question | Test that exists | Check that skips it |
|---|---|---|
| Is this the operator's own page? | `hostMatchesName` + `isNeverOwnSite` | the Perplexity ticket-agent branch |
| Is this page about this place? | `sourceIsAboutPlace`, `containsName` | "Do the sources cover the subject" |
| Which page said this figure? | `whoSaid` hedges when unsure | `priceFrom` names `hosts[0]` flatly |

Every one of them is a check that already had the right tool in the same
repository and reached for something cheaper.

---

## 5. Smaller, still worth knowing

- **Ticketmaster answered nothing, 4 times out of 4.** *"no Danish listing with
  this name"* on every run, plus two `site:ticketmaster.dk` searches per run that
  also came back with nothing bookable. The log already says this is expected
  rather than a failure. Three calls per draft for an answer that has not
  arrived once in four runs is worth a decision, not a fix.

- **The coordinate refusal is working, and it is working twice on the same
  shape.** Sebbersund → Google returned "Vikingebyen"; Bork → "Bork Vikingehavn".
  Both refused, correctly, and both then fell back to a postcode read out of the
  research. Bork landed on 6893 Hemmet and its own step 12 admits the town centre
  it measured from is **6.1 km away**, with "Hemmet, 2 mins on foot" as the
  nearest arrival point. A market named after a neighbouring attraction is now a
  known pattern, and the fallback is guessing from a postcode that appeared
  somewhere in the research.

- **Jelling caught its own failure and said so, loudly.** Step 51: *"THE
  CORRECTION DID NOT LAND. 1 flagged claim is still in the draft after the
  rewrite... do not read the banner above as a pass."* That is the machinery
  working exactly as intended.

- **Sebbersund and Bork repeat their price gap word for word before and after the
  correction** (steps 27/40 and 26/39). The correction pass does not act on a
  price gap, so the second reading can only ever say the same thing. Not wrong,
  but two identical FOUND A GAP lines in one run read like a bug.

---

## What I would do first

1. **Test the Perplexity ticket page for the operator** with `hostMatchesName`
   before filing it as a listing. One condition, and it turns four "nothing
   measured" lines into real checks on the next Køge-shaped run.
2. **Record which page a price came off**, or make `priceFrom` hedge the way
   `whoSaid` already does. A citation that names the wrong page is worse than one
   that admits it does not know.
3. **Add the name test to the subject-coverage check**, or rename the step so
   `8 of 8` cannot be read as a pass.
