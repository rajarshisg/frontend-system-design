### Subresource Integrity (SRI)

**TL;DR:** A browser feature that lets you pin an external resource (script or stylesheet) to a specific cryptographic hash — if the CDN serves a tampered file, the browser refuses to execute it.

## The problem it solves

```html
<!-- Without SRI: you're trusting the CDN forever -->
<script src="https://cdn.example.com/jquery.min.js"></script>
```

If the CDN is compromised or the file is updated (even innocently), the new file runs in your page with full JS privileges. Supply-chain attacks (e.g. the `polyfill.io` incident) exploit exactly this.

## How it works

```html
<script
  src="https://cdn.example.com/jquery-3.7.1.min.js"
  integrity="sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs"
  crossorigin="anonymous">
</script>
```

1. Browser downloads the resource from the CDN.
2. Browser computes the cryptographic hash (SHA-256/384/512) of the received bytes.
3. Browser compares it against the `integrity` attribute value.
4. If they match → execute. If they don't → block and log an error. The mismatch is also reported if you have a CSP `report-uri`.

The `crossorigin="anonymous"` attribute is required — SRI needs the response to be CORS-eligible so the browser can actually read the bytes for hashing. Without it, SRI is silently skipped on cross-origin resources.

## Generating the hash

```bash
# Using openssl
cat jquery.min.js | openssl dgst -sha384 -binary | openssl base64 -A
# Output: 1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs

# Then prefix with the algorithm:
sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs
```

CDN providers (jsDelivr, cdnjs, unpkg) and tools like [srihash.org](https://www.srihash.org) generate these for you.

## Multiple hashes (fallback)

You can provide multiple hashes separated by spaces — the browser accepts the file if it matches **any** of them. Use this when supporting multiple CDN mirrors or transitioning between file versions:

```html
integrity="sha384-oldHash sha384-newHash"
```

## Limitations

| Limitation | Detail |
|---|---|
| Only for `<script>` and `<link rel="stylesheet">` | Not for images, fonts, iframes, or fetch() calls |
| Static resources only | SRI requires a fixed hash — it can't work with dynamically generated or versioned-by-query-param files |
| CDN must send CORS headers | `Access-Control-Allow-Origin` is required, otherwise `crossorigin="anonymous"` fails |
| You must update the hash on every version bump | If you pin to the hash but reference a URL that changes content, it'll break |

## Interview soundbites

- *"What is SRI?"* → A hash pinned in the `integrity` attribute. Browser hashes the downloaded file and blocks execution if it doesn't match — even if the CDN was compromised.
- *"Why is `crossorigin="anonymous"` required?"* → SRI needs to read the response bytes to hash them. CORS controls cross-origin read access — without it the browser can't inspect the content, so it can't verify the hash.
- *"Does SRI protect against all CDN attacks?"* → No — only attacks that change the file bytes. If the CDN serves the correct file but the original file was already malicious when you generated the hash, SRI won't help. It protects against post-publish tampering.
- *"What's the alternative to SRI?"* → Self-hosting all assets (no CDN trust required), or using a strict CSP with a nonce/hash on every script (complementary — CSP blocks inline injection, SRI validates external files).
