# Long Polling

**TL;DR:** Client asks "anything new?" but the server doesn't answer until
there actually is something — then the client immediately asks again.

## How it works

```
Client                          Server
  |-------- GET /data (v=X) --------->|
  |                                    |   no new data yet -> HOLD the request open
  |                                    |   ...time passes...
  |                              (something changes)
  |<------- 200 (new data) -----------|   respond NOW, connection closes
  |-------- GET /data (v=new) ------->|   client re-asks immediately
  |                                    |   HOLD again...
```

It's still plain request/response HTTP underneath — the trick is the
server delays the *response*, not that anything is pushed. From the
outside it looks like a live feed because the client re-issues the
request instantly instead of waiting on a timer.

## Pros

- Feels close to real-time without needing WebSocket infrastructure.
- Still just HTTP — works through proxies/firewalls that block raw
  socket upgrades.
- No wasted "nothing changed" responses like short polling (that's the
  whole point of holding the request).

## Cons

- Each update still costs a full HTTP request/response round trip.
- Server has to hold many connections open at once — depending on the
  stack this can exhaust threads/sockets under load.
- Held requests need a timeout, or they hang forever if nothing ever
  changes (and if a client disconnects mid-hold, the server needs to
  notice and clean it up — easy to forget).
- If you run multiple server instances, they all need to see the same
  "did something change" signal (e.g. via Redis pub/sub) or a held
  request on server B never learns about an update delivered to server A.
- Still one-directional (server → client). Client → server still needs a
  normal request.

## When to use it

- You want near-real-time updates but can't/won't stand up WebSocket
  infra (or need to support very restrictive networks).
- Mostly server → client notifications, low message volume.

## Real-world examples

- Comet-style chat before WebSockets were widely supported.
- Notification systems as a WebSocket fallback.
- Older push-email implementations.

## Quick revision checklist

- [ ] Still pull-based HTTP — the server just delays the response instead
      of pushing data unprompted.
- [ ] Removes short polling's *wasted requests*, but not its *per-update
      request overhead*.
- [ ] Needs a timeout + cleanup story for held connections — this is the
      part people forget.
- [ ] Compared against: [short polling](../short-polling/README.md) (simpler,
      wastes requests) and [WebSockets](../websockets/README.md) (true push,
      bidirectional, but stateful infra).

---

## Demo in this repo

`backend/` (Express, port 3000) holds `GET /data` open until `PUT /data`
is called, then releases it with the new value:

```bash
cd backend && npm install && npm start
curl -X PUT http://localhost:3000/data -H "Content-Type: application/json" -d '{"data":"Pushed update"}'
```

Verified with `curl`: a stale `GET` returns instantly, a matching `GET`
hangs, and `PUT` releases it immediately with the new value. Minor
cleanup done while checking it: removed dead commented-out interval code
left over from an earlier draft, and fixed a copy-pasted page title.
Known gap (not fixed, worth knowing): no timeout on held requests, and no
cleanup if a client disconnects early — see the comment in `app.js`.
