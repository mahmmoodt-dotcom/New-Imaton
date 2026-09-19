# Security — what protects this shop, and what you still have to do

This is a plain-language record of how the site defends itself, written so
you can check it rather than take it on trust. Nothing here needs any
action from you except the four items under **Your part** at the bottom.

## Getting into the dashboard

| Protection | What it means |
| --- | --- |
| Passwords are hashed with bcrypt | The database never stores your password. Someone who steals the whole database still cannot read it. |
| Sign-in is per browser, via a cookie | Signing in on your phone does not sign anyone else in. The old version shared one "logged in" flag with the entire internet. |
| The session cookie is `httpOnly` | No script on the page can read it, so a script injected into the page cannot steal your session. |
| The cookie is `secure` over HTTPS | It is never sent over an unencrypted connection. |
| 10 wrong passwords = 15 minute lock | Counted per internet address *and* per username, so neither one machine trying many accounts nor many machines trying one account gets through. |
| Wrong username and wrong password give the same message | Nobody can use the login form to discover whether a username exists. |
| Changing your password signs out every other device | If someone did get in, changing the password evicts them rather than just adding a second key. |
| Weak passwords are refused and flagged | A short or obvious password is rejected, and the dashboard shows a red warning for as long as one is in use. |

Every part of the dashboard is checked on the server, not just hidden in the
page. Asking the server directly for orders, products or settings without a
valid session returns "not signed in" — verified by test.

## Attacks that were specifically tested and blocked

- **Someone guessing tracking numbers to read customer details.** Tracking
  numbers used to count up one at a time (`...000001`, `...000002`), so
  anyone could walk the list and read other customers' names, phones and
  addresses. They are now eight random characters, and the tracking page no
  longer returns the phone number at all.
- **Uploading a program disguised as a photo.** The file type is decided by
  reading the actual image data, never by what the uploader claims. A PHP
  script renamed as an image, and an SVG carrying a script, are both
  refused. As a second layer, the server is configured never to run
  anything inside the uploads folder.
- **A malicious link saved into the shop's settings.** Social and map links
  must be ordinary `http(s)` addresses, so a `javascript:` link cannot be
  saved and then run in a visitor's browser.
- **SQL injection.** Every database query uses bound parameters. Probes in
  the login form, the tracking box and the order filters change nothing.
- **Cross-site request forgery** — another website quietly submitting a
  form to this one using your logged-in session. Blocked two ways: the
  cookie is `SameSite=Lax`, and any request arriving from another site is
  refused outright.
- **Flooding the shop with fake orders.** Limited to 10 per hour from one
  address. Tracking lookups are limited to 30 per 15 minutes.
- **Junk data breaking the shop.** Every field has a length limit, item
  quantities cap at 99, prices must be sensible numbers, and the delivery
  city must be one you actually deliver to.
- **A garbled request wiping the catalogue.** A save request that cannot be
  read is refused with "nothing was changed", instead of being treated as
  "the catalogue is now empty".

## In the browser

The site sends a Content Security Policy telling browsers to run **only**
scripts that came from this site. If text with a script hidden in it ever
reached a page, the browser would refuse to run it. Also set: no framing by
other sites, no content-type guessing, no camera/microphone/location access,
and the server's software version is hidden.

React escapes all text it displays, so a product name containing HTML is
shown as text rather than run as code.

## What is deliberately *not* here

- **No customer accounts.** Customers never create a password, so there is
  no customer password to leak.
- **No card payments.** The shop is cash on delivery, so no card details
  are ever entered, transmitted or stored.
- **No analytics or third-party trackers.**

## Your part

These four are the ones the code cannot do for you:

1. **Change the admin password** the first time you sign in. Until you do,
   the dashboard shows a red warning. Use something long that you do not
   use anywhere else.
2. **Turn on the free SSL certificate** in Hostinger (hPanel → Security →
   SSL) so the site runs over `https`. The site redirects to https
   automatically, which only works once the certificate exists.
3. **Delete `create-admin.php`** from the server after you create your
   account. It refuses to run twice, but there is no reason to leave it.
4. **Keep `config.php` off any public folder or git.** It holds the
   database password.

## If you ever think someone got in

1. Sign in and change the password — that alone signs out every other
   device immediately.
2. In Hostinger, change the MySQL database password and update `config.php`
   to match.
3. Check Orders for entries you do not recognise, and Settings for changed
   phone numbers or links.
