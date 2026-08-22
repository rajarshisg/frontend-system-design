# WebSockets

**TL;DR:** One persistent, full-duplex connection. Either side sends
whenever it wants — no request/response back-and-forth per message.

## How it works

```
Client                    Server
  |---- HTTP upgrade ------->|
  |<--- 101 Switching -------|   (handshake, once)
  |======= open socket ======|
  |------ send msg --------->|
  |<----- send msg ----------|
  |------ send msg --------->|
  |<----- send msg ----------|
       (connection stays open until either side closes it)
```

After the initial HTTP handshake, it stops being HTTP — it's a raw TCP
pipe both sides can write to at any time. No headers, no request/response
framing per message, no polling in either direction.

## Pros

- Real bidirectional push, lowest latency of the four patterns here.
- Low overhead per message (no HTTP headers each time).
- Great fit for high-frequency, low-latency, two-way traffic.

## Cons

- Stateful connection: the client is pinned to one server instance, which
  complicates horizontal scaling (need sticky sessions or a shared
  pub/sub broker like Redis so instance B knows what instance A's
  clients should hear).
- Some corporate proxies/firewalls block WebSocket upgrades, so you
  sometimes still need a polling fallback.
- More moving parts: heartbeats/ping-pong to detect dead connections,
  reconnect + backoff logic, message ordering/delivery guarantees are on
  you.

## When to use it

- Chat, multiplayer games, live cursors/collaborative editing, trading
  tickers — anything with frequent, low-latency, two-way messages.
- Not a great fit for occasional one-off updates — that's overkill
  compared to short/long polling or webhooks.

## Real-world examples

- Slack / Discord messaging.
- Google Docs collaborative cursors.
- Multiplayer game state sync.
- Live stock tickers.

## Quick revision checklist

- [ ] True push, both directions, one long-lived connection.
- [ ] Handshake is HTTP (`Upgrade` header), everything after is not.
- [ ] Biggest operational cost isn't the protocol, it's **scaling
      stateful connections** across multiple servers.
- [ ] Compared against: [long polling](../long-polling/README.md) (also
      near-real-time, but still HTTP request/response under the hood,
      one-directional, easier to scale) and [webhooks](../webhooks/README.md)
      (no connection at all — event-driven callbacks instead).

---

## Demo in this repo

`backend/` (Express + `socket.io`, port 3000) broadcasts any message it
receives to every other connected client:

```bash
cd backend && npm install && npm start
```

Open `frontend/index.html` in **two** tabs and send a message from one —
it shows up in the other instantly, no refresh or polling.

Verified by starting the server and confirming the Socket.IO client
script is served correctly; the broadcast logic matches how the frontend
renders it. Minor cleanup done while checking it: removed a leftover
unused `GET /data` route copy-pasted from the long-polling example, and
fixed a copy-pasted page title.
