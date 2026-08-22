# Communication Protocols — Quick Revision

Four ways a frontend (or one service) stays in sync with a backend (or
another service). Each has its own folder with concept notes + a
demoable code sample.

| Pattern | Who initiates each update? | Connection | Latency | Server load |
|---|---|---|---|---|
| [Short Polling](./short-polling/README.md) | Client, every N sec | New request each time | Up to N sec | Highest (constant requests) |
| [Long Polling](./long-polling/README.md) | Client, but server delays the reply | New request each time (held open) | Near-instant | Medium (many held connections) |
| [WebSockets](./websockets/README.md) | Either side, anytime | One persistent connection | Instant | Low per-message, but stateful conns to manage |
| [Webhooks](./webhooks/README.md) | The *other* server, when an event happens | None held open | Instant (at event time) | Lowest — zero idle cost |

## The core mental model

- **Short polling** — ask repeatedly, get an answer every time even when
  nothing changed.
- **Long polling** — ask once, server waits to answer until there's
  actually something to say.
- **WebSockets** — stop asking altogether; open one pipe and let either
  side talk whenever.
- **Webhooks** — don't even keep a pipe open; register a callback once
  and let the *other* system call you later.

That's a straight line from "pull, dumb" → "pull, smart" → "push,
connected" → "push, disconnected." Each step trades simplicity for
efficiency and adds a new kind of operational complexity (timeouts →
connection scaling → public-endpoint + retry/idempotency).

## Picking one

- Need something quick, updates are infrequent/non-critical → **short polling**.
- Need near-real-time, mostly server→client, can't run WebSocket infra → **long polling**.
- Need true low-latency two-way traffic (chat, games, collab) → **WebSockets**.
- Integrating with a third-party system, or a browser isn't the direct
  audience → **webhooks** (pair with SSE/WebSockets if the browser needs
  to see it live too).

## Revision log

- **2026-08-22** — Ran every folder's backend and hit it with `curl` /
  a browser before writing anything down.
  - short-polling: correct as-is.
  - long-polling: logic correct (verified hold + release); removed dead
    leftover code and a copy-pasted title.
  - websockets: broadcast logic correct; removed an unused route
    copy-pasted from long-polling, fixed a copy-pasted title.
  - webhooks: didn't exist — added a new demo and verified it end-to-end.

See each folder's own README for the full concept notes, pros/cons, and
how to run its demo.
