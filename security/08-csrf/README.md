### Cross-Site Request Forgery (CSRF)

**TL;DR:** An attacker tricks a logged-in user's browser into making a request to your site that the user didn't intend — and the browser automatically attaches the session cookie, so your server thinks it's legitimate.

## How it works

```
User is logged into bank.com (session cookie exists in browser)

Attacker's page (evil.com):
<form action="https://bank.com/transfer" method="POST" id="f">
  <input name="to" value="attacker-account">
  <input name="amount" value="10000">
</form>
<script>document.getElementById('f').submit();</script>
```

The victim visits `evil.com`. The hidden form auto-submits a POST to `bank.com`. The browser dutifully attaches the `bank.com` session cookie. The server sees an authenticated request from the user's session and executes the transfer.

Key: **the attacker doesn't need to read the response** (that's CORS's job to block). The *action* (state change) happens from the request alone.

## Why GET is especially dangerous for state-changing actions

```html
<!-- On evil.com: -->
<img src="https://bank.com/transfer?to=attacker&amount=10000">
```

An `<img>` tag triggers a GET with cookies attached. If your `/transfer` endpoint accepts GET, you have CSRF with zero user interaction — just loading a page.

**Rule: never use GET for state-changing operations.** GET should be idempotent and safe.

## Mitigations

### 1. Anti-CSRF tokens (most common)
Server generates a random unpredictable token per session (or per form), embeds it in the form/response, and validates it on every state-changing request:

```html
<form method="POST" action="/transfer">
  <input type="hidden" name="csrf_token" value="r4nd0m-un9u3ss4bl3-t0k3n">
  ...
</form>
```

Evil.com can't read your page's content (Same-Origin Policy blocks it), so it can't read the token. Without the correct token, the server rejects the request.

**Double-Submit Cookie pattern** — an alternative that works without server-side state: set the token as a cookie *and* require the same value in a request header/body. Cross-origin pages can't read or set your site's cookies (SOP), so they can't forge the match.

### 2. SameSite Cookies

| Value | Behaviour |
|---|---|
| `SameSite=Strict` | Cookie is never sent on any cross-site request — even top-level navigation from another site. Strongest protection, but breaks "click a link to login" flows. |
| `SameSite=Lax` | Cookie is sent on top-level GET navigations but not on cross-site subresource loads, iframes, or forms. Default in modern browsers. Blocks most CSRF. |
| `SameSite=None; Secure` | Cookie is sent on all cross-site requests. Opt-in only; needed for legitimate cross-site embeds (e.g. payment widgets). |

`SameSite=Lax` blocks the silent form-submit CSRF because the POST is a cross-site form submission, not a top-level navigation. But it doesn't block GET-based CSRF if you have unsafe GET endpoints (another reason to use POST for mutations).

### 3. Check the `Origin`/`Referer` header

On the server, reject state-changing requests where `Origin` or `Referer` doesn't match your expected domain. Not 100% reliable (some proxies strip Referer; some browsers don't send it) — use as defence-in-depth, not primary protection.

### 4. CAPTCHA

Appropriate for high-value one-off actions (account deletion, large transfers). Adds user friction so not suitable everywhere.

### 5. Custom request headers (`X-Requested-With`, etc.)

For JSON APIs: require a custom header (e.g. `X-Requested-With: XMLHttpRequest`). Simple HTML forms can't set custom headers — a cross-origin form submit will fail server-side validation. Works for `fetch`/XHR-based apps.

## CSRF vs XSS

| | CSRF | XSS |
|---|---|---|
| What the attacker controls | The *request* (action) | The *code* running in your origin |
| Victim's browser | Sends an unintended request | Runs attacker's script |
| Needs to read response? | No | Typically yes |
| Stopped by anti-CSRF token? | Yes | No (XSS can read the token) |
| Relationship | XSS can bypass CSRF protection — if an attacker can inject script into your origin, they can read the token and include it. Secure against XSS first. |

## Interview soundbites

- *"What is CSRF?"* → The browser auto-attaches cookies to requests. An attacker can trick the user's browser into making a credentialed request to your site from another page, executing actions as the user.
- *"What's the primary fix?"* → Anti-CSRF tokens — the server issues a secret the form must echo back, which cross-origin pages can't read.
- *"Does `SameSite=Lax` make CSRF tokens unnecessary?"* → In practice `SameSite=Lax` blocks most CSRF vectors for modern browsers, but anti-CSRF tokens are still recommended defence-in-depth (older browsers, misconfigured apps, edge cases with top-level GET navigations).
- *"Why never use GET for mutations?"* → `<img>`, `<link>`, link prefetching — many things trigger GET requests with cookies attached, with zero user interaction. POST requires a form submit or XHR, which is harder to forge silently.
- *"Does CORS prevent CSRF?"* → No — CORS blocks the attacker from *reading* the response. The state-changing request still goes to the server and is still executed. CORS and CSRF solve different problems.
