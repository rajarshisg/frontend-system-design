### Server Side Request Forgery (SSRF)

**TL;DR:** An attacker tricks *your server* into making an HTTP request to a target it shouldn't — typically an internal service or cloud metadata endpoint that the attacker can't reach directly.

## How it works

The classic setup: your server accepts a URL from the user and fetches it on their behalf (e.g. an "import from URL" feature, an image proxy, a webhook tester).

```
Attacker                  Your Server                 Internal Target
   |-- POST /fetch          |                              |
   |   { url: "http://      |                              |
   |   169.254.169.254/     |                              |
   |   latest/meta-data" }->|                              |
   |                        |-- GET 169.254.169.254 ------>|
   |                        |<-- AWS IAM credentials ------|
   |<-- 200 { secret key } -|
```

`169.254.169.254` is AWS EC2's instance metadata endpoint — every EC2 instance can hit it, but it's not reachable from the internet. SSRF turns your server into a proxy.

## What an attacker can do

- **Read cloud metadata** — AWS/GCP/Azure metadata endpoints return IAM credentials, service tokens, and instance config.
- **Scan internal network** — probe `http://10.0.0.x:PORT` to map services that shouldn't be internet-facing (databases, admin panels, microservices with no auth because they're "internal only").
- **Hit internal APIs** — access services that trust any request from within the VPC without additional auth.
- **SSRF via redirect** — your code follows 30x redirects, so `http://your-allowed-domain.com/redirect?to=http://internal` can bypass naive allowlists.

## Mitigations

1. **Allowlist, not blocklist** — only allow fetches to a known set of domains/IPs. Blocklisting `169.254.169.254` is easy to bypass (IPv6 equivalents, DNS rebinding, redirects).
2. **Resolve DNS server-side and validate the IP** — resolve the hostname *before* connecting and reject private/loopback/link-local ranges (`10.x`, `172.16–31.x`, `192.168.x`, `127.x`, `169.254.x`, `::1`).
3. **Disable redirects** — or at least re-validate the final destination after following them.
4. **Use a dedicated egress proxy** with its own allowlist — route all outbound server requests through it, so the policy is enforced in one place.
5. **IMDSv2 on AWS** — Instance Metadata Service v2 requires a session token obtained via a PUT request with a custom header, which SSRF payloads (typically plain GETs) can't supply.
6. **Least-privilege IAM** — even if SSRF reads cloud metadata, the blast radius is limited if the instance role has minimal permissions.

## Interview soundbites

- *"What's SSRF?"* → Attacker supplies a URL that your server fetches, targeting internal resources the attacker can't reach directly.
- *"Why is a blocklist not enough?"* → DNS rebinding, IPv6 equivalents, HTTP redirects, and edge cases like `0.0.0.0` all bypass IP-based blocklists. Allowlist what's permitted instead.
- *"What's the most common real-world target?"* → Cloud instance metadata endpoints — they hand out IAM credentials that can fully compromise the cloud account.
- *"How does IMDSv2 help?"* → It requires a PUT with a `X-aws-ec2-metadata-token-ttl-seconds` header first to get a token, then uses that token in subsequent GETs. A simple SSRF GET can't do the PUT step, so it never gets the token.
