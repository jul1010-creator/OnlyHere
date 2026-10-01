# Four languages: how it works, and what is still English

1 Oct 2026. Oliver: "look into a system where we can make this software multiple languages. So both English, German, Lithuanian, and Danish."

## The system, in three layers

The site already had one, set up in August and September (MULTILINGUAL_25AUG.md). Lithuanian now joins it as the fourth language.

| Layer | What it is | Where it lives | Lithuanian |
|---|---|---|---|
| A. Interface | Menus, buttons, messages, sign in, the guide's own labels | `src/utils/uiLanguage.js` (one line per string, one column per language) and `src/utils/entryWords.js` (headings and labels inside an entry) | Done tonight: all 235 + 122 lines |
| B. AI output | Chat, trip planner, guide text | Written by the model in the reader's language (`readerLanguage.js`) | Works: the model is now told "Lithuanian" by name |
| C. Published content | The entries themselves: descriptions, articles | The database rows, in English | Not translated (see below) |

A reader gets their language from the flag row in the menu. With nothing picked, a phone set to Lithuanian gets Lithuanian, and once somebody picks a language it stays picked. Nothing switches on location.

Adding a fifth language later is one new entry in `UI_LANGUAGES` plus one new column. The test suite refuses a language that is missing a single line.

## What a Lithuanian reader still sees in English

- **Page intros and headings outside Events**, e.g. "Attractions", "Food" and their intro text. They are written straight into App.jsx. Roughly 135 strings across AuthSheet, About, the guide preview, Support and Affiliates, the same list noted on 9 Sep. These are next, in the same way as tonight's Events page.
- **The entries themselves** (layer C). Every fact check in the code reads English, which is why translating the rows is the risky part.

## The recommendation for C

Do not translate the rows. Translate on the way out, the way `entryWords.js` already does for headings:

1. When an entry is published, have the model write a Lithuanian, Danish and German version of the description, and store it beside the English (`payload.i18n.lt`) rather than instead of it.
2. Keep an English fingerprint beside each translation, so an edit to the English marks the translation stale and it is written again.
3. Names, prices, times and dates are never translated, only the sentences around them. The same rule is already in the chat prompt.
4. Start with the Lithuanian pilot entries: few rows, and a reader who will notice.

Cost is small: one short model call per entry per language, once, not per visitor.

## Before this is shown to the tourism centre

Have one of your Lithuanian friends read LITHUANIAN_CHECK_01OCT.md. It lists every line with the English beside it and an empty column for a better version. Everything in it was written by Claude, and a native speaker will catch what a model misses, especially the plural forms after a number.
