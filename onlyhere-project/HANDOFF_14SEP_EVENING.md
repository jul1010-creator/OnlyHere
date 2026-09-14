# Gemlyx, 14 Sep 2026, evening

Written while you slept. Everything below is on your PC and nothing is deployed.
**Deploy is step one when you wake**: the live site is still last week's build, so
none of today counts until it is pushed.

```
src/App.jsx              the add button, and the app's first heading
src/config.js            AutoEurope out, Oscar in, and two corrections
src/utils/affiliates.js  Adtraction, before your link exists
src/utils/socialSweep.js the social sweep (new)
src/utils/socialAccounts.js
src/utils/answerLength.js  Short and Full (new)
src/utils/briefPanel.js    3 of 7 - 4 still to go
src/utils/studioContent.js
src/utils/studioPrompts.js 143 dashes out
src/utils/apiGuard.js
src/components/CostsBlock.jsx
src/pages/GuidePage.jsx
api/social-find.js
public/privacy.html
tests/run.mjs
```

---

## 1. I retract one of the blockers I gave you

I told you every tab link lands on the front door. **It does not.** I tested
again properly and a cold load of `/#events` skips the door and parks on Events,
correctly, at index 4 of the pager.

What fooled me: I was changing `location.href` to a different hash inside an
already loaded page. A hash change is not a page load, so the lazy initialiser
that reads the tab out of the address never re-ran, and I watched the app stay
where it was and called it a bug. The one time I did see the door with a hash on
it was the first load in a cold browser pane and it has not happened since.

Nothing to fix. I would rather tell you this than quietly drop it from a list.

## 2. The share cards are fine too, and I checked the wrong way first

I reported that `/denmark/billund` serves the generic title and the default
image. It does, to a browser, and that is correct: `middleware.js` hands a
person straight to the app and only injects meta for a crawler. My test could
not prove anything either way, because a browser refuses to let a script set a
User-Agent header, so my "crawler" request went out as Chrome.

Read rather than fetched: `CRAWLERS` in `utils/linkPreview.js` carries
`facebookexternalhit`, which is what Instagram, Facebook and WhatsApp send, and
the crawler branch builds an article with its own `h1` and the real title and
photo. So a link posted to a story or sent in a DM gets the right card.

Worth confirming for real once you deploy, with Facebook's Sharing Debugger.

## 3. The add button. Fixed.

Reproduced on the live site: the question DID arrive, "What is worth seeing in
Haderslev on day 1?" was sitting in the composer, and the traveller was looking
at the country picker.

So the feature worked perfectly and was invisible, which is the worst of the
three available outcomes, because nothing looks broken enough to report.

`entered` is what holds the front door up, and nothing arriving by a client side
navigate had ever set it: it flips when somebody presses Enter Denmark, or on
arrival when the address already names a page. A traveller coming back from
their own guide entered several screens ago. One line, and the effect moved
below the const it now reads, for the reason the address effect four hundred
lines down spells out in capitals.

## 4. The app had no headings in it. Fixed.

`document.querySelectorAll("h1").length` was **0** on every screen, and the six
page titles were divs as well. A screen reader had nothing to jump to and
nothing to announce as the page.

It survived because the crawlers were already fine: `linkPreview.js` hands a bot
an article with its own `h1`, so every SEO check passed while the thing a person
uses had no outline in it. Worth keeping as a shape: a check that passes for the
machine can hide a hole only a person falls into.

One `h1` now, the front page's own line, and the six page titles are `h2` under
it. They are not `h1` because the pager keeps all nine pages mounted at once and
that would put nine headings in one document.

## 5. Account creation, which you said you needed to sort out

I read your Supabase project's own public settings rather than guessing:

```
google: true          email: true          disable_signup: false
mailer_autoconfirm: TRUE
phone: false          anonymous_users: false          passkeys: false
```

**Signing up works right now.** Google is on, email and password is on, signups
are open. Nothing is blocking a beta.

**The thing to decide is that autoconfirm.** It is ON, so an account is created
and confirmed the instant somebody submits the form, with no verification email.
For a beta that is the right setting and I would leave it: no confirmation mail
to land in spam, no SMTP to configure, one less step between a follower and the
product.

What it costs you, and it is worth knowing before 200 people arrive:

- **No address is ever verified.** A typo creates an account whose owner cannot
  reach it, and anybody can sign up as anybody's address.
- **The password reset is the one mail that still has to send**, and a Supabase
  project on the built in mailer is rate limited to a handful an hour and, on
  the default setup, will only deliver to project members. So the first beta
  user who forgets their password probably never gets the mail.

The fix for the second one is custom SMTP on the Supabase project, pointed at
the Google Workspace you already have on this domain. That is a settings job,
not a code job, and it is the single thing I would do to account creation before
posting the link.

I did not create a test account. Creating accounts and typing passwords is not
something I will do on your behalf.

## 6. Two small ones

**Google Fonts is now named in the privacy policy.** Your own browser asks
fonts.googleapis.com for the two typefaces before the visitor has done anything,
so their IP reaches Google, and the policy did not say so. Wikimedia is named
for the same reason. No cookie is involved either way.

**You still do not need a cookie banner.** `document.cookie` is empty,
localStorage holds one key (`gemlyx_theme`), and there is no analytics and no
pixel anywhere. Functional storage is exempt. The policy already says this and
it is still true.

---

## Still yours

1. **Deploy.** Nothing above is live.
2. **Custom SMTP on Supabase**, or accept that password resets will not arrive
   during the beta.
3. **The Oscar link.** Generate it on Adtraction and paste it into
   `CAR_RENTAL_LINK`. The app already knows the host and the merchant, so the
   button labels and discloses itself the moment the string is there.
4. **Confirm hello@ and privacy@ deliver.** The domain is on Google Workspace
   with SPF, so the mail can arrive; what I cannot check is whether those two
   aliases land somewhere you read. Both are named in the policy and the terms.
5. **The half Danish UI.** A Danish browser gets Danish chrome over English
   prose, and the language switcher is in the burger menu, which is not reachable
   from inside an open entry. Your followers are mostly international so this
   will mostly not bite them, but it bites every Dane you show it to. I left it
   alone because moving that control is a design decision and you were asleep.
6. `PARTNER_MERCHANTS` has `bajabikes` twice. Harmless, one line.
