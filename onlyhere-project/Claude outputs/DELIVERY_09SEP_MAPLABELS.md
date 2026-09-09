# Delivery, 9 Sep 2026: the map labels, the revising sweep, the theme drift

Eight files. Copy them over the same paths in `onlyhere-project`.

    src/App.jsx
    src/components/ChatMiniMap.jsx
    src/utils/chatRail.js
    src/utils/placeThemes.js
    src/utils/sweeps.js
    src/utils/studioPrompts.js
    src/utils/uiLanguage.js
    tests/run.mjs

Suite: **14,894 passed, 1 failed**, the only failure being the sandbox-only
`and it is a real file in public/` (og-default.jpg is not synced here; it passes
on your machine). `tests/browser.mjs`: 19 passed, 0 failed.

## What changed in the source

* The town draft prompt builds its theme list from `PLACE_THEMES` and its cap
  from `MAX_THEMES` instead of typing seven of the nine words out. `design` and
  `market` could not be drafted onto a town while the sweep offered them, the
  filter chips showed them and the cards rendered them.
* The themes sweep can be run over rows that already have themes. A second
  mode, chosen in the panel, with the current values shown to the model and a
  proposal that changes nothing stripped before it reaches you.
* No source change to the map labels themselves. They shipped last night; what
  changed here is that they now have tests.

## What the mutation round found

Two batches, 53 mutants.

**The map labels pass had almost no coverage: 15 of its 17 mutants survived.**
Only two assertions in that whole pass could fail. Everything else was source
text that stayed true under the break.

The one worth naming: reverting `distinctThemes` so every pin takes its own
first theme, which is the exact fault you reported with three cities all
reading History, passed all 14,852 assertions.

**The revising sweep scored 12 of 16**, and one of those twelve was a kill by
accident: deleting the line that strips no-op patches died on the unwired-export
scanner, not on anything about sweeps. It now dies on a run driven end to end.

One assertion could not be isolated by the rows it was written against, the same
shape as the Roskilde problem: a taxonomy row with no `placeKind` is refused by
`missing` whether the guard is there or not, so the empty list proved nothing.
Rewritten against a row that would be picked if the guard were gone.

42 new assertions. Every one of the 20 survivors was re-run and killed by the
assertion written for it.

## One thing the round settled about the labels

The tie-break inside `distinctThemes` is load-bearing, and I can now say what it
does. Where two arrangements are equally distinct at equal cost, it gives the
theme to the place that would keep its own strongest one. On Ribe [history],
Copenhagen [history, food, art] and Aarhus [food, art] it yields Ribe history,
Copenhagen art, Aarhus food: Aarhus keeps food rather than losing it to
Copenhagen.

So the label is each place's own strongest theme among those not already spoken
for. That makes "Here for the food" true of the place wearing it. "Best if you
want food" is still a comparison across the three that the data does not make,
which is the objection I raised and have not acted on. Your call.

## Not fixed, found while reading

The caption under the chat map is hardcoded English in a component that already
takes `lang`: "Where these are. Tap a pin to see it.", "Tap the pin to see it.",
and the "N earlier places are off this map." line. A Danish reader gets those in
English under a Danish map.
