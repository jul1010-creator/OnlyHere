# Login pass, 14 Sep 2026 evening

Written while Oliver was cooking. Five files changed, all verified back off his
disk after committing. The suite has not been run: the pre-push hook runs it.

## The one that was not a bug

> "Apparently, logging into an account that doesn't exist, just 'creates a new account'."

It does not, and it cannot. `signUpWithPassword` is called from exactly one
branch of one function and that branch is the signup form. I pinned that as an
assertion rather than only saying it.

What the sheet DID do is print Supabase's own three words, "Invalid login
credentials", which are deliberately identical for a wrong password and for an
address with no account, so the form cannot be used to find out who has one.
Somebody who reads that, presses "New User? Sign up here!" and lands in an
account has watched the sheet create one. That is the sentence he wrote, and the
sheet earned it.

It now says: "That email and password do not match an account. Check the
password, or use Forgot password. If you have not made an account yet, sign up
below." Both possibilities named, because naming only one either guesses or
gives away who has an account here. Every other message from that endpoint still
passes through as itself, matched on wording rather than status, because "Email
not confirmed" is a real instruction and replacing it would be a lie.

## Forgot password: it was built, and it had nowhere to land

All five pieces existed and had since August: the link on the sheet,
`sendPasswordReset`, the recovery branch in `captureRedirectSession`, the
set-a-new-password screen, `updatePassword` behind it. Several of them had
tests.

The missing piece was invisible from inside any of those files. Supabase puts a
link in three emails, and where each one lands is decided by a `redirect_to` on
the request that sends it. **Only the Google button was setting one.** The other
three fell back to the project's Site URL, one value in a dashboard that has
pointed at a Vercel preview for most of this project's life. So the mail sends,
the token is real, and the link opens a different copy of the app at a different
origin, where the fragment is read by nothing and the one-use token is spent.

`returnUrl()` is now shared by all four. It goes on the QUERY STRING, which is
the part that is easy to get wrong: GoTrue ignores a body field of the same name,
so putting it in the JSON would have looked exactly like a fix and changed
nothing.

**This is half the fix and the other half is yours.** GoTrue only honours a
`redirect_to` that matches the project's Redirect URLs and silently falls back to
the Site URL when it does not. Check Authentication > URL Configuration:

- Site URL should be `https://www.gemlyxtravel.com`
- Redirect URLs should include `https://www.gemlyxtravel.com/**` and
  `https://gemlyxtravel.com/**`

Until that is right, the reset link will still land in the wrong place and
nothing in the code will look wrong.

## Log out now asks

"Are you sure you want to log out? Your saved places and guides stay in your
account and come back when you sign in, and they are taken off this device."

The question is inside `handleSignOut` rather than at each door, so the menu row,
the account page button and any third door all get it. The fact about the saves
is attached because that behaviour is an hour old and is not what a log out
usually does.

`handleSignOut` now returns whether it went ahead. The account page called it as
`navigate("/"); handleSignOut();`, so the moment a question appeared, Cancel left
somebody moved off the screen they said they wanted to stay on.

## Two dead ends found while reading the rest

**Signing up with an address that already has an account.** Supabase does not
error on this, for the same anti-enumeration reason: it answers 200 with a
user-shaped object and no session. So the person got "check your inbox" and
waited for a mail nobody sent, behind a Resend that also sent nothing. Detected
now by the one field that differs, `identities`, which has one entry for a
genuinely new signup and is an empty array for an address that exists. Checked as
"an array, and empty" rather than falsy, so a response shape without the field
falls through to the ordinary inbox screen instead of telling a new person they
already exist.

**I could not verify that against the live API.** This container's proxy blocks
`supabase.co`, so it is from Supabase's documented behaviour, not from a probe.
Worth one test: sign up twice with the same address and check you are sent to the
sign-in screen rather than the inbox screen.

**Signing in to an account that never confirmed its email.** "Email not
confirmed" on the sign-in screen is a dead end: the mail is what they need, and
the button that sends it is on the other screen, behind a signup they cannot
repeat because the address is taken. They are taken to that screen now, and the
confirmation is actually sent rather than merely offered, because that screen says
a link is on its way and it would be untrue otherwise. A refusal is Supabase's
hourly limit and is shown rather than swallowed.

## To test when you are back

1. Sign up with a throwaway address. Confirm from the mail. Check you land back
   on gemlyxtravel.com and are signed in.
2. Sign in with an address that has no account. Expect the new sentence, not an
   account.
3. Sign up again with the address from step 1. Expect the sign-in screen and
   "That address already has an account".
4. Forgot password on that account. Check the mail lands on gemlyxtravel.com and
   the set-a-new-password screen opens.
5. Log out. Expect the question. Press Cancel, check you stay put. Press OK,
   check the saves are gone from the device.
6. Delete the account, then register the same address again.

## Still open from earlier

- `CAR_RENTAL_LINK` is empty, waiting on the Adtraction link for Oscar.
- Supabase Rate Limits, now that Resend SMTP is in.
- `PARTNER_MERCHANTS` has `bajabikes` twice.
