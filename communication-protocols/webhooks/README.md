# Webhooks

**TL;DR:** Don't ask. Register a URL once, and the other system calls
*you* when something happens. No connection held open in between at all.

## How it works

```
You (consumer)              Provider              Provider's later self
   |-- "call this URL when X happens" ->|                    |
   |<---------- ack -------------------|                    |
   |         (walk away — no connection held open)          |
   |                       ... event X happens later ...     |
   |<-------------- POST your-url { event } -----------------|
   |------------- 200 received ------------------------------>|
```

This is the only pattern of the four that's fundamentally *not*
client-initiated per update. The "client" (whoever wants to be notified)
only talks once, up front, to subscribe. Every actual event delivery is
the provider initiating an outbound HTTP request to you.

## Pros

- Zero idle cost — no polling, no held-open connections between events.
- Fully decoupled: provider and consumer don't need to be online at the
  same time except at delivery moment.
- Scales trivially for the provider — it only does work when an event
  actually occurs.

## Cons

- Your endpoint must be **publicly reachable** — a pain for local dev
  (tools like ngrok exist specifically for this).
- Delivery is push-only *to a server*, never to a browser directly — a
  browser has no public URL to receive a POST, so if you want the
  browser to reflect a webhook live, you still need something like SSE
  or a WebSocket to relay it (see the demo below).
- You must handle **security** (verify the sender, e.g. HMAC signature)
  and **retries/idempotency** (most providers retry on failure, so you
  may receive the same event twice — dedupe by event ID).
- No ordering guarantee across events unless the provider explicitly
  promises one.
- Harder to debug than a request you initiated yourself — you generally
  need provider-side delivery logs/replay tooling.

## When to use it

- Third-party integrations where you don't control the other system's
  internals (payments, CI, SaaS platforms).
- Server-to-server event notification where nothing needs to reach a
  browser instantly.

## Real-world examples

- Stripe calling your backend when a payment succeeds/fails.
- GitHub triggering a CI pipeline on `push`/`pull_request`.
- Twilio posting delivery status for an SMS you sent.

## Quick revision checklist

- [ ] Inverted control flow: **provider initiates**, consumer just
      subscribes once.
- [ ] No connection lives between events — the opposite trade-off from
      [WebSockets](../websockets/README.md).
- [ ] The two things people always forget: **verify the signature**, and
      **make delivery handling idempotent** (retries happen).
- [ ] Can't push to a browser directly — needs a public server endpoint,
      then relay to the browser separately if you want live UI.

---

## Demo in this repo

`backend/` (Express, port 3000) plays *both* roles for simplicity — it's
the provider *and* the "third party" receiving its own webhook:

- `POST /orders` responds `202` in ~10ms, then 3s later fires a signed
  webhook to whatever subscribed.
- `POST /webhooks/receive` checks the signature and acknowledges it.
- `GET /events` (SSE) relays the delivery to the browser purely so you
  can *watch* it happen — a real consumer wouldn't have a browser in
  this loop at all.

```bash
cd backend && npm install && npm start
```

Open `frontend/index.html`, click **Place Order** — the status updates
instantly, then ~3s later a webhook delivery appears in the list below
it, pushed there by the server, not fetched by the page.

This folder didn't exist before — added and verified end-to-end with
`curl` (confirmed the `202` is immediate, the signed delivery lands ~3s
later, and the SSE stream carries it to the browser).
