# Scouting run, 13 August 2026 evening

You went to cook. Here is what the time found.

    Suite      3801 passing, 0 failing   (was 3775)
    Build      vite build clean
    Fixed      4 code, all mutation-verified
    Found      3 live bugs fixed, 8 festivals researched, 3 things for you

**Read the first fix if you only read one thing.** It is the one that was
silently removing real events from Discover.

---

## Fixed: every Danish Christmas market was being dropped from Discover

`splitFinishedCandidates` removes candidates whose edition has already run, and
it reads the date out of the hook in prose because the candidate list has no
date field. Its month table was twelve ENGLISH names matched on their first
three letters with an open tail:

    \bjul[a-z]*\b        \bmar[a-z]*\b

That was a trick to read Danish pages for free, and ten of the twelve months do
fall out of it by accident: `jan` catches "januar", `feb` catches "februar".
Only maj and oktober are missed, and a miss is the harmless direction.

What is not harmless is what an open tail matches besides a month. **Jul is
Danish for Christmas and marked is Danish for market**, so:

    jul[a-z]*   ->  julemarked, julemarkeder, julefrokost, juletraesfest
    mar[a-z]*   ->  marked, markedet, and English "market" too

And the month was chosen with `.find` over an array in **calendar order**, so
whenever a string named two months the earlier one won regardless of which one
the sentence was about. Put together, on the real function, today:

    "Et af Danmarks største julemarkeder, december 2026"

      julemarkeder matched july
      july beat december, because july is earlier in the array
      no day number, so "the whole of July, over on the 31st"
      13 August is after 31 July

      -> DROPPED as an event that already happened

A Christmas market, stating December in its own sentence, removed from the tab
you use to find events. The comment sitting directly above that table says why
this is the expensive direction, and it was right: *"A candidate wrongly dropped
is a real event he never hears about."*

Same fault, three more ways it fired:

| Text | Was read as | Now |
|---|---|---|
| Københavns Historiske **Marked** 2026 | 31 March, dropped | not a month, kept |
| A great little **market** running through 2026 | 31 March, dropped | not a month, kept |
| **Augustenborg** Slotspark, 2026 | 31 August | not a month, kept |
| Afholdes 20. **maj** 2026 | unreadable | 20 May, correctly dropped |
| Afholdes i **oktober** 2026 | unreadable | end of October |

Exact names now, Danish and English, never a prefix with an open tail. A
boundary is required at the END as well, which is what kills Augustenborg and
Marked on its own. Month chosen by where it sits in the **text**, not in the
calendar. And a four-digit year no longer donates a day: "Copenhell 2026,
august" was reading the 26 out of the year and calling it the 26th.

**One carve-out, and it is the whole reason the bug existed.** Bare `jul` is not
accepted as July, because in Danish it is Christmas and "Jul i Tivoli" is a real
event. `juli`, `july` and the abbreviation `jul.` are all still read as the
month. The cost is that a bare English "16-Jul-2026" is not read, which leaves
the candidate on your screen rather than removing it. That is the safe
direction.

**How I know the assertions work.** Four mutations, each putting one piece of
the old behaviour back:

    old prefix table            12 assertions red
    .find in calendar order      1 assertion red
    no four-digit blanking       1 assertion red
    bare jul accepted as July    0 assertions red   <- a hole

That last one is worth your attention, because it is the pattern that keeps
biting this codebase. Dropping the carve-out turned **nothing** red: `\bjul\b`
already refuses to match inside "julemarked", so every assertion I had written
still passed. The case it actually protects is `Jul` standing alone as a word,
which is a real Danish event name and which I had not written a test for. That
assertion exists now, and the mutation goes red.

Also worth saying plainly: **not one of the 3781 assertions already in the suite
went red for any of this.** They were all written in English.

## Fixed: an em dash in the most visible string on the site

Your rule is absolute: *"NEVER use dashes, anywhere: not in replies to him, not
in generated content, not from any AI."* The suite enforces it in **thirty-two
places** and not one of them looked at `index.html`, where the title read:

    <title>Gemlyx [U+2014 EM DASH] It exists nowhere else.</title>

Plus `og:title` and `twitter:title` carrying the same character. That is the
browser tab, every Google result, and every share card anyone has ever posted.

Now `Gemlyx. It exists nowhere else.`, a full stop, which matches the short
declarative voice the rest of the site uses. Pinned by a test that scans every
tag `index.html` serves, and separately asserts the two share cards still say
the same thing as the tab, because a fix applied to one and not the others is
how the canonical drifted for weeks.

*(And I broke the same rule four times inside the first draft of this report.
Corrected. Noted.)*

## Fixed: Ask Gemlyx was the one AI surface that never stripped dashes

Chasing the dash above, I checked every path a model's words can take to reach a
reader. All of them strip:

    liveContent.js     stripDashesDeep on every published row as it loads
    App.jsx            the plan builder strips its own output
    bodyEdit.js        the hand editor strips what a person types
    AskGemlyx.jsx      nothing                                   <- the gap

`api/ask.js` renders `data.answer` straight into the bubble. And it is the only
one of the four where a model talks **live to a paying visitor**, so it is the
worst one to have missed.

The prompt does ask. Twice, in both branches: *"Never use an em dash or an en
dash."* That is the whole problem, and this codebase already wrote the lesson
down one screen away in App.jsx: **a rule the model can forget is not a filter.**
It was the filter that was missing, not the instruction. The instruction stays,
because the two are cheaper together than either alone.

Stripped on the way in rather than at render, so what sits in state is what was
shown. **The traveler's own question is left exactly as they typed it.** Your
rule is about generated text, and rewriting somebody's own words back at them is
a different thing entirely, so that carve-out has its own assertion and its own
mutation.

One thing I checked before deciding where to put it: `gemlyx_ask_log` stores the
question and not the answer, so nothing with a dash in it was ever persisted.
This was only ever on the screen.

## Fixed: hostOf became the fourth copy of itself, and I wrote it

Scanning for functions declared in more than one file, which is this codebase's
single most repeated defect:

    src/components/HowWeKnow.jsx:31    const hostOf
    src/utils/pageScan.js:361          const hostOf
    src/utils/affiliates.js:78         const hostOf     <- added by me today
    src/utils/entryAudit.js:1122       const hostOf     (inline, pre-existing)

`pageScan` exports it now and `affiliates` imports it, with a test asserting
exactly one util declares it.

**Still open, pre-existing:** `HowWeKnow.jsx` and `entryAudit.js` each keep their
own. Neither is mine and both are one-line fixes whenever you want them.

## The rest of that scan, for when you want it

Eighteen names are declared at the top level of more than one file. Most are
harmless local helpers. These are the ones where the two copies could disagree
and nothing would say so:

    MONTHS, MONTH_RE     eventDates.js  factCheckRead.js
    PROSE_FIELDS         correction.js  entryAudit.js
    sameName             coordCheck.js  helpers.js  placeKind.js
    MONTH_NAMES          DateTimePicker.jsx  pageScan.js
    TIERS                accommodation.js  geo.js  placeThemes.js

The month pair is the one I just fixed, and I deliberately did **not** merge the
two tables. This one needs abbreviations and is zero-based for `Date()`; the
other is 1-based and must stay strict, because there a loose match *confirms* a
date rather than hiding a candidate. Same words, opposite risk. That reasoning
is written into the file so nobody merges them later.

`PROSE_FIELDS` and `sameName` I have not opened yet.

---

# The seven festivals with no dates

All researched against the organisers' own sites. **These are data fixes for
Studio, not code.** I cannot write to Supabase.

| Event | Dates | Source |
|---|---|---|
| **Wonderfestiwall** | **2026-08-13 to 2026-08-16** | wonderfestiwall.dk/info |
| **Randers Festuge** | **2026-08-07 to 2026-08-15** | randersfestuge.dk |
| Københavns Historiske Marked | 2026-05-22 to 2026-05-25 *(past)* | khm.dk |
| Nakkefestival | 2026-07-22 to 2026-07-25 *(past)* | nakkefestival.dk |
| Distortion | 2026-06-03 to 06-07, **2027-06-02 to 06-06** | cphdistortion.dk |
| Grøn Koncert | 2026-07-16 to 2026-07-26, eight cities *(past)* | groenkoncert.dk |
| Geopark Dage | **no fixed dates, by design** | see below |
| TinderBox (row 62) | 2026-06-25 to 06-27, **2027-06-24 to 06-26** | tinderbox.dk |

**Wonderfestiwall is running right now.** It ends in three days and your entry
says "Dates not confirmed". Randers Festuge ends on the 15th. Those two are the
urgent ones.

**Geopark Dage is a trap, and worth reading before you touch it.** Geopark
Odsherred *discontinued* its fixed-date festival after 2022 and replaced it with
GeoparkDage, which is deliberately a year-round programme with no date range.
Searching turns up "Geopark Dage 2026, 14 to 17 May" and **those dates belong to
a different UNESCO geopark entirely** (Det Sydfynske Øhav: Svendborg,
Faaborg-Midtfyn, Ærø, Langeland). Do not use them. The entry should describe a
year-round programme rather than carry dates.

**TinderBox row 62, diagnosed.** The stored row is `date: 2027-06-24` and
`dateEnd: 2026-06-26`. The start is the correct **2027** date; the end is a wrong
**2026** date, and off by a day even for 2026 (the real 2026 end was the 27th).
Two editions got merged into one row. It wants splitting into
`2026-06-25 / 2026-06-27` and `2027-06-24 / 2027-06-26`.

**Only two events have announced 2027 dates**: Distortion and TinderBox. The
other five have nothing published, confirmed on each organiser's own ticket or
press page. That is the normal state in August and the honest thing to print.

One note now that the parser is fixed: **Københavns Historiske Marked** is a
name that hit the Marked bug directly. If you ever wondered why it never turned
up as a Discover candidate, that is a plausible reason.

---

# Three things for you, not code

**1. Purge the CDN cache on `/sitemap.xml`.** A fetch of the bare path returned
an HTML shell whose canonical read `only-here-three.vercel.app`, the pre-10-Aug
build. The middleware is correct and serves real XML with the right
content-type. This is a stale edge cache holding an old response on that one
path. Everything else on the site serves the current build.

**2. `/sitemap.xml/` with a trailing slash serves the app shell.** The
middleware matches `url.pathname === "/sitemap.xml"` exactly, so the slash falls
through to the SPA. Harmless for Google, which requests the bare path, and a
one-character fix if you want it.

**3. The apex serves content rather than redirecting.** `gemlyxtravel.com` now
resolves and loads the site directly instead of redirecting to `www`. The
canonical tag is the only thing preventing a duplicate-content split. If you
added the apex in Vercel without picking the redirect option, set it now.

---

# Still open from before, unchanged

- **Billetto is in `MEASURED_SOURCES` and wired to nothing.** Build it or delete
  it. A source that can never speak makes the enum look covered.
- **The ancillary date.** Ticketmaster has three Wonderfestiwall listings dated
  2026-08-13 and `matchEvent` throws the date away with the shuttle bus. Now
  independently confirmed correct by the research above.
- **Nonexistent paths return 200 carrying the homepage canonical.** Confirmed
  live on `/nonsense-path` and `/denmark/not-a-real-town`.
- **The absence rule needs a second step**, so "no train station in Skælskør"
  can be stated with a source rather than deleted.
- **Ticket status**, the half that was left after price.
- Food row 36 Hyttefadet has no `desc`; five towns still have duplicate rows.

# One more thing, and I did not fix it

There are em dashes inside **string literals** across `src/`, not comments. Most
are UI error toasts, which are your own copy and yours to decide about. One is
not, and it is `pageScan.js`:

    `${i + 1}. ${r.host} [U+2014 EM DASH] ${r.label}`     sourceOrderBlock

That is a **prompt block**, sent to the model on every draft, using an em dash as
its separator on every source line. It is teaching the model the mark you spend
the rest of the pipeline removing.

The reason I stopped rather than swept: it is genuinely harmless downstream,
because `liveContent` strips every published row on load, so nothing a model
writes with that character survives to a reader. It is hygiene rather than a
bug, it touches a lot of lines, and a broad find-and-replace across UI copy at
this hour is how a real string gets mangled. Say the word and I will do the
prompt builders alone, which is maybe a dozen lines and the part that matters.

# Changed on disk

    src/utils/eventDates.js         the month table and lastDateInText
    src/components/AskGemlyx.jsx    strips the answer
    tests/run.mjs                   20 new assertions, 8 mutations verified
    index.html                      the em dash, in three tags
    src/utils/pageScan.js           exports hostOf
    src/utils/affiliates.js         imports it instead of declaring a fourth

Nothing pushed.
