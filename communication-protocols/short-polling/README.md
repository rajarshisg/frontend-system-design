# Short Polling

**TL;DR:** Client asks "anything new?" on a fixed timer, forever, whether or not anything actually changed.

## How it works

```
Client                     Server
  |-------- GET /data -------->|
  |<------- 200 (data) --------|
  |         wait N sec         |
  |-------- GET /data -------->|
  |<------- 200 (data) --------|
  |         wait N sec         |
  |-------- GET /data -------->|
```

Every tick is a brand new HTTP request/response. The server never
remembers the client between calls — it just answers whatever's asked,
same as any normal REST endpoint.

## Pros

- Dead simple — plain `fetch` + `setInterval`, no special server support.
- Stateless: any server in a load-balanced pool can answer any request.
- Works through every proxy/firewall/CDN without config.

## Cons

- Wasted requests: most polls return "nothing changed."
- Latency is bounded by the interval — worst case you wait a full tick
  even if the data changed 1ms after your last poll.
- Doesn't scale well if you shrink the interval to reduce that latency —
  request volume grows linearly with (clients × frequency).

## When to use it

- Low-frequency, non-critical updates (e.g. "check every 30s if a report
  finished").
- You need something working in 10 minutes and don't want any persistent
  connection infra.
- Fallback when nothing better is available.

## Real-world examples

- Checking a CI/build job's status.
- Old-school inbox "check for new mail" behavior.
- Dashboards where a few seconds of staleness is fine.

## Quick revision checklist

- [ ] Pull-based, client-initiated, fixed interval.
- [ ] Every request is independent — no held connections.
- [ ] Trade-off is always **latency vs. request volume**: shrink the
      interval, you get fresher data but hammer the server.
- [ ] The pattern it's usually compared against: [long polling](../long-polling/README.md)
      (removes the wasted requests) and [WebSockets](../websockets/README.md)
      (removes the interval entirely).

---

## Demo in this repo

`backend/` (Express, port 3000) + `frontend/index.html` — fetches `/data`
every 5s. Update the value from another terminal and watch the page pick
it up on the next tick:

```bash
cd backend && npm install && npm start
curl -X PUT http://localhost:3000/data -H "Content-Type: application/json" -d '{"data":"Updated!"}'
```

Verified working end-to-end via `curl`; no code changes were needed.
