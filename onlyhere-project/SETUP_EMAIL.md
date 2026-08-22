# The signup email

Written 22 August 2026, after "Nothing gets to my mail btw.. I try to create an
account.. but I can't."

Two separate jobs. **Part 1 is why nobody can sign up.** Part 2 is what the email
looks like once it can be sent. Do them in that order, because a beautiful
template that reaches nobody is worth nothing.

---

## Part 1. Why no email arrives

Your project's auth settings are correct. Read live on 22 August:

    "email": true            signups by email are on
    "disable_signup": false  signups are allowed
    "mailer_autoconfirm": false   a confirmation IS required, so a mail must be sent
    "google": true           the Google provider is already enabled

Nothing there is wrong. The problem is the sender.

**Supabase's built-in email service only delivers to addresses that belong to
your project's organization.** They restricted it in September 2024 after their
upstream provider threatened to cut off all sending unless abuse dropped. Any
other address gets nothing at all, silently, behind a 200 response that looks
exactly like success. On top of that the shared sender is capped at two messages
an hour, which is why even your own address goes quiet while you are testing.

So today, nobody but you can create an account, and you can do it twice an hour.
That is a hard restriction and no setting turns it up.

### To unblock yourself right now, one minute

Supabase dashboard → **Authentication** → **Sign In / Providers** → **Email** →
turn **Confirm email** OFF.

Signup then returns a session immediately and the app signs you straight in. No
code change is needed: `signUpWithPassword` already returns
`{ session, needsConfirmation }` and the caller takes whichever path came back.
The confirmation screen simply never appears.

Turn it back on once Part 1b is done. Leaving it off permanently means anybody
can make an account on somebody else's address.

### 1b. Custom SMTP, before anyone real uses this

**Resend** is the easiest fit: you already own gemlyxtravel.com, the free tier is
3,000 emails a month, and Supabase has a direct integration.

1. Create a Resend account and add **gemlyxtravel.com** as a domain.
2. Add the DNS records Resend gives you (SPF, DKIM, and a return-path CNAME) at
   whoever hosts the domain's DNS. Verification usually lands within the hour.
3. Supabase dashboard → **Authentication** → **Emails** → **SMTP Settings** →
   enable custom SMTP and fill in:

       Host        smtp.resend.com
       Port        465
       Username    resend
       Password    <your Resend API key>
       Sender email  hello@gemlyxtravel.com
       Sender name   Gemlyx

4. Turn **Confirm email** back on.

Two things this buys beyond simply working: the per-hour limit goes from two
messages to thirty new users, and the mail comes from your own domain instead of
a shared Supabase sender that Gmail frequently treats as junk.

**Check the DNS records are still passing a week after you set them up.** A
half-verified domain sends mail that silently lands in spam, and the failure
looks identical to everything working.

---

## Part 2. The template

Supabase dashboard → **Authentication** → **Emails** → **Confirm signup**.

There are two fields, a subject and a message body. The body is raw HTML and it
is rendered by Go's template engine, so the only values you can interpolate are
the ones the **auth row** holds:

    {{ .ConfirmationURL }}   the link that confirms the account
    {{ .Email }}             the address they signed up with
    {{ .SiteURL }}           your Site URL setting
    {{ .Token }}             the six digit code, if you ever want an OTP instead
    {{ .Data }}              the user metadata sent at signup

`{{ .Data }}` is the one that matters for a greeting. Nothing in
`gemlyx_user_data` is reachable from here and never will be: email templating
cannot see your tables. So `src/utils/auth.js` now sends the name to Supabase as
user metadata at signup as well as writing it to the profile row, which is why
`{{ .Data.name }}` below has anything to print. It is written once and never
updated, because the email template is the only thing that reads it.

### Subject

    Verify your Gemlyx account

Your draft had a rocket on the end. Worth knowing before you decide: emoji in a
subject line is one of the signals spam filters weigh, and this is the one email
in the product that absolutely has to land, since a person cannot use the account
until it does. Marketing mail can afford the character. This one cannot. Both
versions are here and it is your call:

    Verify your Gemlyx account 🚀

### Body

Paste this whole block into the message field.

Notes on why it is built this way, since email HTML is its own world:

- **Tables, not divs.** Outlook on Windows renders through Word and ignores
  most modern layout. Tables are the only thing that works everywhere.
- **Everything inline.** Gmail strips `<style>` blocks.
- **The button is a table cell, not a styled link.** Outlook ignores padding on
  an `<a>`, so a link styled as a button arrives as bare text on the client
  most likely to belong to somebody's employer.
- **No images at all.** Most clients block remote images by default, and a
  broken image in a verification email reads as a phishing attempt. The wordmark
  is text with letter-spacing, which is what it is on the site anyway.
- **No Google Fonts.** Email clients do not load them. The stack falls back
  through Georgia for the heading and system sans for the body, which is close
  to Fraunces and Inter and does not depend on a network request.
- **The link is printed in full underneath.** Some clients mangle buttons, and
  some people simply do not trust one.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#12100B;margin:0;padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#1C1912;border:1px solid #2E2718;border-radius:16px;">
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:4px;color:#E0AE4E;font-weight:bold;">&#10022; GEMLYX</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0 32px;">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#F4F0E4;font-weight:normal;">Verify your email</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#D8D0BD;">
            {{ if .Data.name }}Hi {{ .Data.name }},{{ else }}Hi there,{{ end }}
            <br /><br />
            Thanks for signing up for Gemlyx. Confirm your address and your account is live.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:26px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#E0AE4E" style="border-radius:11px;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#12100B;text-decoration:none;border-radius:11px;">Confirm email address</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#968C76;">
            If the button does not work, copy this into your browser:
            <br />
            <a href="{{ .ConfirmationURL }}" target="_blank" style="color:#E0AE4E;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.65;color:#D8D0BD;border-top:1px solid #2E2718;">
            Welcome aboard,
            <br />
            The Gemlyx Team
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td style="padding:16px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.55;color:#968C76;text-align:center;">
            You are getting this because someone used this address to sign up at gemlyxtravel.com. If that was not you, ignore it and no account is made.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

That last paragraph is not decoration. A confirmation email is the one message
that can arrive at somebody who did not ask for it, because anybody can type any
address into a signup form. Saying plainly that ignoring it costs them nothing is
both the decent thing and the thing that stops them reporting it as spam, which
is what damages a sending domain.

### Also worth setting while you are on that screen

The **Site URL** under Authentication → URL Configuration must be
`https://www.gemlyxtravel.com`. `{{ .ConfirmationURL }}` points at Supabase's own
verify endpoint, which then redirects to whatever Site URL says. If it still says
`localhost:5173` or a vercel.app address, every confirmation link in every email
lands somewhere that is not your site.

**Reset password** has its own template on the same screen and is currently the
Supabase default. The same block works for it with the heading changed to
"Choose a new password" and the button to "Reset password". Worth doing, since
`utils/auth.js` now has a real recovery flow behind that link.
