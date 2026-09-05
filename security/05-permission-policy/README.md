### Permissions-Policy

**TL;DR:** An HTTP response header that lets a server control which browser features (camera, mic, geolocation, etc.) are available to its own page and to any `<iframe>` it embeds — even if the embedded origin would otherwise have access.

## What it controls

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), fullscreen=(self "https://trusted-partner.example")
```

| Syntax | Meaning |
|---|---|
| `camera=()` | Disable camera for this page and all embedded frames — no one can request it |
| `geolocation=(self)` | Only the page's own origin may request geolocation; embedded iframes cannot |
| `fullscreen=(self "https://partner.example")` | This origin and the named partner can go fullscreen; everyone else is denied |
| `payment=*` | Any origin (including all iframes) may use the Payment Request API |

## Why it matters

By default, a page and its same-origin iframes can access most browser APIs. Cross-origin iframes are more restricted, but some APIs are still available or can be granted via `allow` attribute. Permissions-Policy gives the **top-level page declarative, centralized control** over every frame — useful for:

- **Defence in depth** — if an iframe is compromised (e.g. via XSS or a supply-chain attack in a third-party widget), Permissions-Policy limits the damage by preventing it from accessing the camera or mic even if the iframe's own JS tries to call `getUserMedia`.
- **Compliance** — explicitly disable features you don't use. If your app never uses geolocation, disabling it means a bug can't silently activate it.
- **Embedding third-party content safely** — a `<iframe sandbox>` restricts script behaviour; Permissions-Policy restricts browser API access. They're complementary, not alternatives.

## Relationship to the `allow` attribute on `<iframe>`

The `allow` attribute on the iframe element and the `Permissions-Policy` header interact:

```html
<!-- Parent page header: camera=(self) -->
<!-- This iframe CANNOT get camera access — the parent didn't include this origin -->
<iframe src="https://widget.example" allow="camera"></iframe>

<!-- But if the parent header says camera=(self "https://widget.example") -->
<!-- AND the iframe has allow="camera", THEN the iframe can use the camera -->
```

Both must agree: the parent's `Permissions-Policy` header must allow the feature for that origin, **and** the `<iframe allow="...">` attribute must declare it. Neither alone is sufficient across origins.

## Difference from Content-Security-Policy

| Header | Controls |
|---|---|
| `Content-Security-Policy` | What **resources** (scripts, images, styles) may be loaded and executed |
| `Permissions-Policy` | What **browser APIs / device features** may be accessed |

They're complementary. CSP stops malicious scripts from loading; Permissions-Policy limits what even allowed scripts can do.

## Interview soundbites

- *"What does Permissions-Policy do?"* → Controls access to browser features (camera, mic, geolocation, etc.) for the page and any frames it embeds.
- *"How does an iframe get camera access?"* → Two conditions must both be true: the parent's `Permissions-Policy` header allows it for that iframe origin, AND the `<iframe allow="camera">` attribute is set.
- *"Is it the same as CSP?"* → No — CSP gates what resources load and execute. Permissions-Policy gates what device features those scripts can access even after they run.
- *"What's the practical use case?"* → Defence in depth for third-party widgets — if you embed an ad or analytics iframe, you can ensure it can't silently activate the user's camera or microphone even if it's compromised.
