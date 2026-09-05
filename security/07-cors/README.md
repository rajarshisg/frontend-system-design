### Cross Origin Resource Sharing (CORS)

**TL;DR:** A browser mechanism that allows a server to tell the browser "yes, this cross-origin page is allowed to read my response." Without CORS headers, the browser blocks JS from reading the response — the request is still made, but the result is hidden.

## Why it exists — the Same-Origin Policy

The browser's Same-Origin Policy (SOP) blocks JS from reading responses across origins (different scheme + host + port = different origin). This is good security: `evil.com` shouldn't be able to `fetch('https://yourbank.com/account')` and read your balance. CORS is the controlled exception — the *server* opts specific origins in.

## Simple vs preflighted requests

**Simple requests** (no CORS preflight): `GET`/`POST`/`HEAD` with safe headers and content types. The browser sends the request and adds an `Origin` header, then checks the response headers to decide whether to expose the result to JS.

**Preflighted requests** (everything else): before sending the actual request, the browser sends an `OPTIONS` request to check if the server permits it. Only if the server responds with the right headers does the actual request go through.

```
Browser                        Server
  |--- OPTIONS /api/data ------->|   (preflight)
  |    Origin: https://app.com   |
  |    Access-Control-Request-Method: PUT
  |    Access-Control-Request-Headers: Content-Type
  |                               |
  |<-- 204 No Content ------------|
  |    Access-Control-Allow-Origin: https://app.com
  |    Access-Control-Allow-Methods: GET, POST, PUT
  |    Access-Control-Allow-Headers: Content-Type
  |                               |
  |--- PUT /api/data ------------>|   (actual request)
  |<-- 200 { data } --------------|
  |    Access-Control-Allow-Origin: https://app.com
```

Preflight result is cached by `Access-Control-Max-Age` (seconds). Without it, every single non-simple request pays the extra round-trip.

## The CORS response headers

| Header | Purpose |
|---|---|
| `Access-Control-Allow-Origin` | Which origin(s) may read this response. `*` means any origin (but cannot be used with `credentials: 'include'`). For credentialed requests, must be an exact origin. |
| `Access-Control-Allow-Methods` | Comma-separated list of allowed HTTP methods (used in preflight response) |
| `Access-Control-Allow-Headers` | Which request headers the client is allowed to send (used in preflight response) |
| `Access-Control-Allow-Credentials` | `true` if cookies/auth headers should be included and exposed. Requires `Allow-Origin` to be an exact origin, not `*`. |
| `Access-Control-Expose-Headers` | By default, JS can only read a small set of "safe" response headers. This header lists additional ones the browser should expose to JS (e.g. `X-Request-Id`, `X-Total-Count`). |
| `Access-Control-Max-Age` | How many seconds the preflight response may be cached. Reduces preflight round-trips. |

## Common mistakes

| Mistake | Consequence |
|---|---|
| `Access-Control-Allow-Origin: *` with `credentials: 'include'` | Browser rejects it — wildcard origin + credentials is explicitly forbidden by the spec |
| Reflecting `Origin` header back without validating it | Any origin gets access — functionally the same as `*` but for credentialed requests too (worse) |
| Only setting CORS headers on 200 responses, not errors | Preflight gets a 403 and the browser treats it as a CORS failure — the real error is invisible |
| Forgetting `Vary: Origin` | Caches serve one origin's response to a different origin |

## CORS does NOT protect your API from all cross-origin requests

CORS is a **browser enforcement** mechanism. Server-to-server calls (`curl`, `fetch` from Node, Postman) are completely unaffected — they don't have a Same-Origin Policy. CORS only controls whether the *browser* lets JS code read the response. Authentication (JWT, session cookie, API key) is still your primary access control.

## Interview soundbites

- *"What is CORS?"* → A browser mechanism where the server opts specific origins into reading its responses. Without the right headers, the browser hides the response from JS even though the request was made.
- *"What's the preflight?"* → An `OPTIONS` request the browser sends automatically before a non-simple cross-origin request, to ask the server if the real request is allowed.
- *"Can I use `*` with cookies?"* → No — `Access-Control-Allow-Origin: *` cannot be combined with `Access-Control-Allow-Credentials: true`. You must echo back the exact requesting origin.
- *"Does CORS stop server-to-server calls?"* → No — CORS is enforced by the browser only. `curl` and server-side `fetch` ignore it entirely.
- *"What does `Access-Control-Expose-Headers` do?"* → Allows JS to read response headers beyond the small default safe list (like Cache-Control, Content-Type). Custom headers like `X-Total-Count` need to be explicitly listed here to be readable by `response.headers.get(...)`.
