# Cross-Site Scripting (XSS)

> Revision notes + interview prep. Demo code lives in [`vulnerability/`](./vulnerability/01-example.html) and [`mitigation/`](./mitigation/mitigation.html) — see [Demo in this repo](#demo-in-this-repo) to run both side by side.

## TL;DR

XSS is what happens when **attacker-controlled data ends up in a "sink" that
executes it as code** instead of displaying it as text. The fix is never
one thing — it's picking the right sink, escaping/sanitizing on the way in
(or out), and adding CSP as a safety net for when the first two fail.

## The 3 types (classic interview question)

| Type | Where the payload lives | How it fires |
|---|---|---|
| **Stored** | Saved server-side (DB, file) — e.g. a comment field | Runs for *every* visitor who views the page, no special link needed. Most dangerous — widest blast radius. |
| **Reflected** | Bounced back by the server in the *same* response — e.g. a search results page echoing `?q=` | Only fires if the victim clicks a crafted link containing the payload. |
| **DOM-based** | Never touches the server at all — client-side JS reads an attacker-controlled source (URL, `document.referrer`, `localStorage`, ...) and writes it into a sink | Purely client-side; server logs/WAFs never even see the payload. |

The demo in this folder is **DOM-based**: `01-example.html`'s own inline
script reads `location.search` and writes it straight into `.innerHTML` —
nothing server-rendered is involved.

## Sources and sinks (the mental model)

Every XSS bug is "untrusted **source** → dangerous **sink**, with no
escaping in between."

**Common sources:** URL (`location.search`, `location.hash`), form inputs,
`document.referrer`, `postMessage` payloads, data from a WebSocket/API
response, anything another user typed that gets stored and re-displayed.

**Common sinks:**
- `.innerHTML`, `.outerHTML`, `document.write()`
- `eval()`, `new Function()`, `setTimeout("string", ...)`
- `element.setAttribute('href'/'src', ...)` with a `javascript:` URL
- React's `dangerouslySetInnerHTML`, Vue's `v-html`, Angular's
  `[innerHTML]`/`bypassSecurityTrust*`

If a source only ever reaches `.textContent`/`.innerText`, or gets
interpolated through a framework's default `{}` binding, it's safe —
those escape automatically. The bug is always at the sink, not the source.

## Why `<img src=x onerror=...>` instead of `<script>`?

Real interview gotcha, and it's baked into this folder's payload:

> Elements created by the HTML parser while parsing `.innerHTML` include
> `<script>` tags, but the DOM spec marks any script inserted this way as
> "already started" — **it is never executed.** This is not a browser
> security feature; it's just how non-parser insertion of `<script>` has
> always worked. So real-world innerHTML payloads use **event-handler
> attributes** instead (`onerror`, `onload`, `onclick`, `onfocus`+`autofocus`,
> `<svg onload=...>`, etc.) — those aren't scripts, they're attributes, and
> attributes always run.

Once *any* handler fires, the attacker has full JS execution and isn't
limited to that one event — `01-example.html`'s payload chains a second
`<img onerror>`, an app function call, and a `keydown` listener all from
inside the first `onerror`, to show that one foothold is enough to do
anything: read `document.cookie`, call authenticated app functions,
log keystrokes, exfiltrate data via `fetch`.

## Impact — what an attacker actually gets

- **Session hijacking** — read `document.cookie` and send it to their own
  server (defeated by `HttpOnly` cookies — see Mitigations below).
- **Acting as the user** — call the page's own authenticated functions/API
  calls (this repo's `createPost()` stand-in) to post, message, transfer
  money, change settings, etc. silently.
- **Keystroke logging / credential theft** — attach listeners, e.g. to
  catch what's typed into a password field on the same page.
- **Full page takeover** — inject a fake login form, redirect, deface content.

## Mitigations, in order of how much they buy you

1. **Pick the right sink.** `.textContent` / `.innerText` never parse HTML —
   if you don't need to render markup, don't use a sink that can.
2. **Escape on output, sanitize if you must allow HTML.** If user content
   genuinely needs to support rich text, run it through an allow-list
   sanitizer (e.g. [DOMPurify](https://github.com/cure53/DOMPurify)) right
   before it hits the DOM — not just once at save time (stored content can
   be re-used in a context it wasn't sanitized for).
3. **Let your framework do it.** React/Vue/Angular escape everything bound
   through their normal templating by default. The risk moves entirely to
   the few explicit "trust me" escape hatches: `dangerouslySetInnerHTML`,
   `v-html`, `[innerHTML]` — grep for those in review, they're where XSS
   bugs hide in modern codebases.
4. **Content-Security-Policy (CSP) — defense in depth, not a fix.** Even if
   an unsafe sink slips through review, a strict CSP can stop the injected
   code from running. See below — this is what `mitigation/` demonstrates.
5. **`HttpOnly` + `Secure` + `SameSite` cookies.** Doesn't prevent XSS, but
   contains the damage: `HttpOnly` cookies can't be read by
   `document.cookie` at all, so even successful script execution can't
   steal the session cookie directly.

## Content-Security-Policy (CSP) deep dive

CSP is a response header that tells the browser which sources are allowed
to load/execute for this page. It's an **allow-list**: anything not
explicitly permitted is blocked, script or otherwise.

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123'; object-src 'none'; base-uri 'self';
```

| Directive | What it controls |
|---|---|
| `default-src` | Fallback for any directive you don't set explicitly |
| `script-src` | What JS is allowed to run — this is the one that stops XSS |
| `style-src`, `img-src`, `font-src`, `connect-src` | Same idea, per resource type (`connect-src` also gates `fetch`/XHR/WebSocket targets) |
| `frame-src` | What THIS page may embed as an `<iframe>` |
| `frame-ancestors` | Who may embed THIS page in an `<iframe>` — the actual clickjacking control, easy to confuse with `frame-src` (covered in [`02-iframe-protection`](../02-iframe-protection/README.md)) |
| `object-src 'none'` | Blocks `<object>`/`<embed>`/plugin-based execution |
| `base-uri 'self'` | Blocks a `<base href="https://evil.com">` injection from hijacking every relative URL on the page |
| `form-action 'self'` | Blocks a form on your page from being redirected to submit to an attacker's domain |

**Key fact for `script-src`:** without `'unsafe-inline'`, inline
`<script>` blocks *and* inline event-handler attributes (`onerror=`,
`onclick=`, ...) are both blocked from executing — this is precisely what
stops the classic `<img onerror>` payload even when an unsafe `.innerHTML`
sink is still in the code (see `mitigation/mitigation.html`).

**Nonces (`'nonce-<random>'`):** let you keep a *specific* inline
`<script>`/`<style>` tag working under a strict policy — the tag needs
`nonce="<random>"` matching the header's value. Two rules people get wrong
in interviews:
- The nonce must be **freshly random per response**, generated server-side
  (e.g. `crypto.randomBytes(16).toString('base64')`), never hardcoded or
  reused. `mitigation/index.js` hardcodes it for readability in the demo —
  that's called out in its comments as something you'd never do for real.
- A nonce only applies to `<script>`/`<style>` **elements**, not to inline
  event-handler **attributes** — you can't add `nonce="..."` to an
  `onerror=""` attribute to make it CSP-compliant. That's a separate,
  unconditional block controlled by the presence/absence of `'unsafe-inline'`.

**`frame-src` vs `frame-ancestors`, one more time because it's a common
mix-up:** `frame-src` = "what can I embed", `frame-ancestors` = "who can
embed me". Clickjacking defense is `frame-ancestors` (or the older
`X-Frame-Options` header).

## Interview soundbites

- *"What's the difference between stored, reflected, and DOM-based XSS?"*
  → source/sink location: stored = server-persisted, reflected = same
  request/response round-trip, DOM-based = entirely client-side, no server
  involvement.
- *"Why doesn't `<script>` execute via `innerHTML`?"* → DOM spec marks
  non-parser-inserted `<script>` elements as already-started; it's not a
  browser security feature, it's just how script insertion has always
  worked — which is exactly why real payloads use event-handler attributes.
- *"Is CSP enough on its own?"* → No — it's defense in depth. It can't see
  or fix a bad sink, it can only block *some* of the ways that sink gets
  exploited (e.g. it does nothing if the attacker's payload is itself a
  same-origin script your app already trusts to load).
- *"Does React/Vue/Angular make you immune to XSS?"* → No — their default
  bindings auto-escape, but `dangerouslySetInnerHTML` / `v-html` /
  `[innerHTML]` opt back into raw HTML and reopen the exact same risk.
- *"How do you stop stolen cookies even if XSS happens?"* → `HttpOnly`
  cookies — JS literally cannot read them via `document.cookie`, so a
  successful injection still can't exfiltrate the session token that way.

## Demo in this repo

**`vulnerability/01-example.html`** — no server needed, open directly in a
browser (`file://` works fine, query strings still parse) and try:

```
01-example.html?username=<img src="x" onerror="alert('You have been hacked!')">
```

You'll see the alert fire — the URL flows straight into `.innerHTML` with
zero escaping.

**`mitigation/`** — the same vulnerable `.innerHTML` line, but now served
behind a strict CSP header, showing that the exploit is blocked even
though the sink itself wasn't fixed:

```bash
cd mitigation && npm install && npm start   # http://localhost:3000
```

Then open `http://localhost:3000/?username=<img src="x" onerror="alert('You have been hacked!')">`
— no alert this time. Open devtools → Console and you'll see Chrome log a
CSP violation ("Refused to execute inline event handler...") instead.

Both files were run and verified while writing these notes: the
vulnerable version fires the payload, the CSP version blocks it and logs
a console violation, and the CSP header itself was confirmed via `curl`.
