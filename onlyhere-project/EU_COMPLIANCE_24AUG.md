# What EU law reaches Gemlyx

24 August 2026. Oliver: *"I want you to look up all the EU laws and regulations,
and then implement it into my app."*

**"All EU law" is not a bounded set**, so this is the set that binds a
one-person Danish consumer travel service with an AI chat, accounts, affiliate
links, hosted stranger text and a subscription coming. Everything below was
checked against the instruments or against law-firm and Commission summaries
dated 2026, not from memory.

**Not legal advice.** This is a reading, written down so a lawyer can check the
reasoning rather than rediscover it. Two things in here are worth paying one to
look at, and they are marked.

---

## Live obligations, in the order they bite

### 1. AI Act, Regulation (EU) 2024/1689, Article 50. IN FORCE NOW. **Implemented.**

Article 50 took effect **2 August 2026, with no grace period** for systems
already running. Three weeks before this was written.

**50(1)**: an AI system that interacts directly with people must inform them
they are interacting with an AI, "from the start of the first interaction", "in
a clear and distinguishable manner", unless it is obvious.

Gemlyx has three surfaces where a person types and a model answers: the trip
intake, Ask Gemlyx on an entry page, and Local Assist inside a guide. **None of
them said so.** All three now do, in the reader's language, through one shared
sentence in `src/utils/aiDisclosure.js`.

The "unless this is obvious" carve-out is arguable here and is deliberately not
relied on. The reasoning is in the file, and the deciding argument is not the
legal one: a product that prints "we could not verify this stop" and leaves a
reader to work out whether they are talking to a person is inconsistent with
itself before it is non-compliant.

**50(4)**: a deployer must label AI-generated text "published with the purpose
of informing the public on matters of public interest", **except** where it has
had human review or editorial control.

Not implemented, and the file records why. Published entries are drafted by a
model then fact-checked, edited and published by one named person through the
Studio, which is editorial control in the ordinary sense and is what this whole
repository performs. A generated guide is written for one traveller about their
own trip and is not published to inform the public. **Both conclusions break if
guides become public pages or if publishing stops going through a person**, so
they are written down rather than assumed.

### 2. Package Travel, Directive (EU) 2026/1024. **The one that shapes the roadmap. Recorded in code.**

Adopted 29 April 2026, in force 28 May 2026, member states apply it from
**29 March 2029**. It matters now because what changed is the architecture that
decides whether a website is a travel organiser.

**Linked travel arrangements are abolished** as a lighter separate category and
folded into "package". A package makes you an **organiser**: liable for the
performance of the whole trip, and required to hold insolvency protection
covering travellers' payments, repatriation, outstanding refunds and unredeemed
vouchers.

The limb that reaches a site like this one: separate contracts with different
providers bought through linked online processes such that **the first trader
transmits the traveller's personal data to another trader** and a further travel
service is bought within 24 hours.

**So the trigger is not the affiliate money and not the recommendation. It is
handing the traveller's details across.** Every link `affiliates.js` produces is
an ordinary outbound link with a tracking marker; no name, email, phone, account
id or booking reference crosses, and nothing posts a form on anybody's behalf.

That property is now asserted rather than assumed: the suite reads every query
parameter the file can emit and fails on an identifying one.

**Two honest caveats.** `bookingUrl` and `airbnbUrl` already put the traveller's
dates and party size into a search URL. A pre-filled search is a long way from a
pre-filled booking, but it is the same direction of travel. And the "bookable
itinerary" in the fifty point review is exactly the feature that would cross
this line. **Build it as a handoff, never as a transfer.**

**Worth a lawyer.** This is the item where being wrong is expensive.

### 3. GDPR and the Danish age floor. **Already done, and correct.**

The 23 August pass checked every claim against the regulators' own sites and
fixed five errors, including the age floor, which is **15** in Denmark under
databeskyttelsesloven section 6 since 1 January 2024, not 13. Privacy policy
v2.2, terms v2.1, ADR body named correctly as Mæglingsteamet for
Forbrugerklager. Nothing to add here.

### 4. Consumer law on affiliate links. **Already done.**

Undisclosed commercial communication is a blacklisted practice under the Unfair
Commercial Practices Directive. `affiliateNote` and the structural invariant
that nothing comes out tracked without a sentence under it already cover this,
and the new Gemlyx offer field carries `OFFER_NOTE` on the same terms.

---

## Applies, not yet done

### Digital Services Act, Regulation (EU) 2022/2065

Gemlyx hosts stranger text: reviews on entry pages and the Suggest a Place
inbox. That makes it a **hosting service**, which is the lightest tier and the
one that carries notice-and-action: a way for anyone to flag illegal content,
and a statement of reasons when something is removed. Micro and small
enterprises are exempt from the heavier online-platform duties, not from the
hosting ones.

**There is no way to report a review today.** That is a real gap and it is a
small build: a report control on each review, a record that it was seen, and a
line in the terms.

### European Accessibility Act, Directive (EU) 2019/882

Applied to e-commerce services from 28 June 2025. **The microenterprise
exemption applies to service providers**: fewer than 10 people AND turnover or
balance sheet at or below €2m, both required. Gemlyx is one person with no
revenue, so it is exempt as things stand.

Exempt is not the same as fine. `tabIndex` is used zero times in the whole repo,
there are thirty-seven clickable divs in `App.jsx` and thirty-eight instances of
`outline: none`, so parts of the interface cannot be reached with a keyboard at
all. It is already point 5 in `HANDOFF_NEXT.md` and the exemption is a reason to
schedule it rather than a reason to skip it, particularly since it evaporates
the moment the business grows.

### Geo-blocking, Regulation (EU) 2018/302

A trader may not treat customers differently by member state of residence
without justification. Nothing does today. It becomes live the day prices exist:
one price, all member states, no redirects based on IP.

---

## Not code, and only Oliver can do these

**VAT.** Selling a digital subscription to consumers in other EU countries means
VAT at the customer's rate once cross-border sales pass €10,000 in a year, via
the OSS one-stop shop. Danish moms is 25%, German 19%. This is the arithmetic
that decides the subscription price, and the other half of it is
`averageFor("guide")` in the Studio, which says what a guide costs to produce.

**Withdrawal right.** A consumer buying a digital service has 14 days to
withdraw. There is a mechanism to start supply immediately in exchange for the
consumer's express consent and acknowledgement that they lose the right, and it
has to be presented properly or it does not work. Design this into the payment
flow rather than retrofitting it.

**Digital Fairness Act.** A further EU consumer regime aimed at subscriptions,
dark patterns and personalisation is in progress. Not law yet. Worth watching
because subscriptions are its subject.

---

## What shipped in this pass

| | |
| --- | --- |
| `src/utils/aiDisclosure.js` | new. The Article 50 sentence in six languages, the reasoning, and the list of surfaces it must appear on |
| `src/components/AskGemlyx.jsx` | discloses |
| `src/pages/GuidePage.jsx` | discloses |
| `src/App.jsx` | discloses, on the trip intake |
| `src/utils/affiliates.js` | the package-travel constraint written where it would be broken |
| `tests/run.mjs` | both rules asserted structurally |

**9,954 passed, 0 failed.** Build clean.

Mutation tested four ways: the disclosure dropped from one of three surfaces,
the sentence hardcoded instead of shared, an email leaked into a booking link,
and the directive reference removed from `affiliates.js`. Each red by name.

## Sources

AI Act Article 50 and the Commission's transparency guidance; Commission news
of 28 May 2026 on the package travel overhaul; CMS and Garrigues analyses of
Directive (EU) 2026/1024; European Accessibility Act microenterprise guidance.
URLs are in the chat log for 24 August.
