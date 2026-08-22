# Iframe Protection

> Revision notes + interview prep. Runnable clickjacking demo lives in [`vulnerability/`](./vulnerability/attack.html) and [`mitigation/`](./mitigation/attack.html) — see [Demo in this repo](#demo-in-this-repo).

## TL;DR

Iframes create three distinct risk categories, and they have three
**different** fixes — mixing them up is the most common interview slip-up:

| Risk | The actual problem | The fix |
|---|---|---|
| **Clickjacking** | Someone else embeds *your* page and tricks a user into clicking it | **You** (the embedded page) send framing headers |
| **Cross-frame data theft** | Two frames of different origins get access to each other's data | The Same-Origin Policy + careful `postMessage` usage |
| **Cookie/session leakage** | A framed/cross-site request carries session cookies it shouldn't | Cookie attributes (`HttpOnly`, `Secure`, `SameSite`) |

## 1. Clickjacking

**Definition:** an attacker loads your legitimate, logged-in page inside an
invisible `<iframe>`, stacks it exactly on top of a decoy button on their
own page, and gets the victim to click what they think is the decoy —
but the click actually lands on your page's real button underneath.

```
Attacker's page (visible)          Victim's page (invisible, on top)
┌───────────────────────┐          ┌───────────────────────┐
│ 🎉 Claim your prize!   │   ═══►   │ [Transfer $10,000] btn │  <iframe opacity: 0.0001>
│  [ Claim Now ]  ◄──────┼──────────┼── same x/y coordinates │  z-index above the decoy
└───────────────────────┘          └───────────────────────┘
        user sees this                user's click actually hits this
```

This is a **UI redress attack**, not a network-level forgery — the
resulting request is a completely normal, first-party request made by
JavaScript that legitimately belongs to your page, running inside the
iframe, with the user's real session. Nothing about the request itself
looks wrong to your server. That's *why* the fix has to happen before the
page even renders in a frame — once it's rendered and clickable, it's
already too late.

### The fix: tell the browser who may frame you

| Header | Values | Notes |
|---|---|---|
| `Content-Security-Policy: frame-ancestors ...` | `'none'`, `'self'`, or a list of allowed origins | **Modern standard.** Wins over `X-Frame-Options` when both are present and the browser supports it (basically all current browsers). |
| `X-Frame-Options` | `DENY`, `SAMEORIGIN` | **Legacy.** No origin-list support (only exact same-origin or nothing) — kept alongside CSP purely as a fallback for the rare client that doesn't understand `frame-ancestors`. |

Set **both** in real apps: `frame-ancestors` for the fix that actually
matters today, `X-Frame-Options` as a cheap legacy safety net. That's what
[`mitigation/server.js`](./mitigation/server.js) does:

```js
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
```

With these set, the browser refuses to render the framed document at all
— the iframe stays blank and devtools logs a refusal, so there's no
content for the invisible-overlay trick to hide in the first place.

### Does `SameSite=Strict` stop clickjacking? (Common trap)

**No.** This trips people up because it sounds related. The click happens
*inside the victim's own frame*, so the resulting `fetch('/transfer')`
call is a same-origin request made by the victim page's own script — not
a cross-site request. `SameSite` only restricts cookies on **cross-site**
requests; it has nothing to say about a same-origin request that a user
was tricked into triggering via UI redress. The *only* fix for
clickjacking is refusing to be framed in the first place
(`frame-ancestors` / `X-Frame-Options`).

### `sandbox` is a different tool for a different actor (also a common mix-up)

The `sandbox` attribute goes on an `<iframe>` tag and restricts what the
**embedded** content is allowed to do (run scripts, submit forms, navigate
the top-level page, open popups, etc.):

```html
<iframe src="https://untrusted-widget.example" sandbox="allow-scripts"></iframe>
```

This is set by **the embedder**, to protect itself from **untrusted
content it chooses to embed** (an ad, a widget, user-generated content in
an iframe). It is *not* something a victim site can use to stop other
sites from framing it — that direction only has `frame-ancestors` /
`X-Frame-Options`. Don't reach for `sandbox` when asked "how do you stop
your page from being clickjacked" — that's the #1 way to get this wrong
in an interview.

## 2. Cross-frame data theft

The browser's **Same-Origin Policy (SOP)** already blocks a page from
reading another origin's frame content directly — `parentWindow.frames[0].document`
throws a `SecurityError` across origins. The real-world ways this
protection gets undermined:

- **Legacy `document.domain` relaxation** — two pages on different
  subdomains of the same registrable domain (`a.example.com`,
  `b.example.com`) could each set `document.domain = 'example.com'` to
  opt into full mutual DOM access. This is deprecated and being removed
  from browsers precisely because it's a foot-gun — it silently widens
  the trust boundary for every script on both pages, forever.
- **Unsafe `postMessage` usage** — the sanctioned way for two frames of
  different origins to talk. Two mistakes cause almost every real-world
  `postMessage` bug:
  - **Receiver doesn't check `event.origin`** — treats a message as
    trusted no matter who sent it, so any embedding/embedded page can
    inject data or trigger actions.
  - **Sender uses `targetOrigin: '*'`** — broadcasts the message to
    whatever origin currently occupies that frame, so a page that's been
    navigated (or framed) by an attacker receives data meant for someone
    else.

```js
// Receiver: always check the origin before trusting anything.
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://trusted-partner.example') return;
    handle(event.data);
});

// Sender: always name the exact origin you intend to reach, never '*'.
otherWindow.postMessage(payload, 'https://trusted-partner.example');
```

## 3. Session / cookie theft via frames

Cookies are scoped to a registrable domain and get attached automatically
to matching requests — framing doesn't change that on its own. Three
attributes shape exactly when:

| Attribute | What it does |
|---|---|
| `HttpOnly` | Cookie is invisible to `document.cookie` — JS (including an XSS payload) can't read it at all. Doesn't affect framing/cookies-on-requests, purely blocks script access. |
| `Secure` | Cookie is only ever sent over HTTPS. |
| `SameSite=Strict` | Cookie is withheld on **any** cross-site request, including top-level navigation from another site. Strongest, but breaks normal cross-site links into a logged-in app. |
| `SameSite=Lax` (default in modern browsers) | Cookie is withheld on cross-site **subrequests** (iframes, `fetch`, images, forms) but still sent on a plain top-level link navigation. |
| `SameSite=None` (+ `Secure`, required together) | Cookie is sent on cross-site requests too — needed for legitimate cross-site embeds (e.g. a payment widget), opt-in only. |

`SameSite=Lax`/`Strict` is what stops a malicious page from silently
embedding your site in a hidden iframe or auto-submitting a cross-site
form and having your session cookie ride along for a **cross-site**
request. It does **not** stop clickjacking (see above) — that's a
same-origin request from the user's own click, not a cross-site one.

## Interview soundbites

- *"How do you stop your site from being clickjacked?"* → `Content-Security-Policy: frame-ancestors` (+ `X-Frame-Options` for legacy support). Not `sandbox` — that protects an embedder from content *it* embeds, not the other way around.
- *"Does `SameSite=Strict` prevent clickjacking?"* → No — the request made during a clickjacking attack is same-origin, initiated by the victim's own script running inside the iframe. `SameSite` only gates cross-site requests.
- *"What's the difference between `X-Frame-Options` and `frame-ancestors`?"* → Same goal, `frame-ancestors` is the modern CSP directive (supports an origin list, wins when both are set), `X-Frame-Options` is the older header kept as a fallback (`DENY`/`SAMEORIGIN` only).
- *"How do two iframes of different origins talk safely?"* → `postMessage`, always with an explicit `targetOrigin` on send and an `event.origin` check on receive — never `'*'` on either side for anything sensitive.
- *"Does `HttpOnly` stop clickjacking or frame-based attacks?"* → No — it stops *script* (e.g. an XSS payload) from reading the cookie via `document.cookie`. It has no relationship to framing at all; the browser still attaches the cookie normally to requests.

## Demo in this repo

Two matched pairs, each spinning up a "victim" server (port 3000) and an
"attacker" server (port 4000) to represent two real, different origins —
open the **attacker's** URL in your browser for both:

**`vulnerability/`** — no framing protection:

```bash
cd vulnerability && npm install && npm start
```

Open **http://localhost:4000** — you'll see a "Claim your free iPhone"
button. Click it: instead of a prize, the console logs `Transfer executed`
on the server, because your click actually landed on SecureBank's hidden
"Transfer $10,000" button underneath. Tick the "Reveal the hidden iframe"
checkbox to see exactly how it was stacked on top of the decoy.

**`mitigation/`** — same attack page, same victim page, but the victim
server now sends `X-Frame-Options: DENY` + `frame-ancestors 'none'`:

```bash
cd mitigation && npm install && npm start
```

Open **http://localhost:4000** again — the iframe area is now blank, and
devtools → Console shows the browser refusing to display the framed page
(`Refused to display '...' in a frame because it set 'X-Frame-Options' to
'deny'`). The decoy button just clicks nothing.

(Stop one pair with `Ctrl+C` before starting the other — both use ports
3000/4000.)

Verified while writing these notes: both servers were started and their
response headers checked with `curl` — the vulnerable victim sends no
framing headers, the mitigated one sends both `X-Frame-Options: DENY`
and `Content-Security-Policy: frame-ancestors 'none'`.
