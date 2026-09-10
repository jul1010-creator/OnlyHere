# The rest of the night, 10 Sep 2026

Four more files landed and verified. **Suite 15,034**, one failure and it is the
sandbox-only `og-default.jpg`. Browser 19 of 19. Batches 41 and 42, 19 mutants,
both survivors chased and killed.

---

## "Every find personally verified" is gone

The word doing the lying was `personally`, which reads as having been there. The
night it came off, a Tønder price nobody had looked at since August was sitting
on a live 2027 page, and nothing in this app has ever had a way to record that an
entry was re-checked after it was written.

**What stays is what is true.** "Hand-researched and checked against multiple
sources" is not the same claim: it says research rather than verification and it
never says you went anywhere. Cutting that too would leave nothing at all where a
reader asks why to trust the page, and they deserve the true answer rather than
none. The FAQ answer that admits older entries show fewer sources stays for the
same reason: it is the most honest sentence on the site.

The real version of the claim was already on every entry and is stronger than a
badge. HowWeKnow prints that entry's own sources, the corrections it needed and
the questions still open. Specific and checkable beats a promise in a footer.

---

## The empty box was never the missing photograph

It was the broken one.

The no-photo case already drew the emoji at full size on a tinted band. But
`item.photo` being truthy is what the header styled itself on, so a **path that
404s** got the has-a-photograph styling: emoji dropped to a quarter opacity,
image hidden by `onError`, and a 190px band with a ghost in it. Nothing anywhere
could tell that from a page whose photo had never been found.

One state now, decided before render, the way `showablePhoto` already does it for
the chat cards. A band with no photograph in it is 120px rather than 190, so it
reads as a marker for the entry rather than a picture that failed to arrive, and
the writing starts higher. The failure is forgotten when the entry changes, or
one bad image would collapse the header of everything opened after it.

And no credit line under a photograph that did not load. It credits nothing, and
it is the one line that tells a reader the picture is real.

---

## The sold-out sweep

`Sold out, read again`. Published festivals whose status currently says sold out,
re-read for price, availability and edition.

* **A status picks the rows, not a missing field.** Every one of them has a full
  `ticketInfo`; none is a gap. `only` is what narrows them.
* **Revise only.** Every row it wants already has a status, so a fill run could
  only ever return nothing, and offering the button would offer a run that cannot
  work.
* **The entry tier is skipped by name.** Tier 2 reads the entry and checks a
  quote against it, and a published entry says "2,495 DKK" and nothing about
  which edition it was reading. The quote check would refuse every row and cost a
  model call each to do it.
* **Both guards are in the question**, because this one writes a live price. The
  edition test is position rather than presence, and a sale that has not opened
  cannot be sold out.

It is in the Studio sweep list. Press "Look again at the filled ones".

---

## Two of my own tests proved nothing, and their mutants said so

Worth writing down because it happened twice in one night.

**The revise-only guard** was tested on the sold-out sweep, where a row with no
`ticketStatus` can never read as sold out, so fill mode is empty whether the
guard exists or not. Retested on a sweep where fill would otherwise return rows.

**The process description** appears four times in App.jsx, so a mutant that
changed one left three and the regex still matched. Pinned to the answer that
carries the claim, by its own sentence, and counted.

Same shape as the tour-order one earlier: an assertion that looked right and was
never in a position to fail.

---

## Still yours

The citations, and the date gate that guards `dateChanged` while
`ticketStatusChanged` and the notes walk past it. Same loop, both small, and I
left them rather than do them alone at five in the morning.
