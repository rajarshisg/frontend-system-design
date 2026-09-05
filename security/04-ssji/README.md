### Server Side JavaScript Injection (SSJI)

**TL;DR:** User-controlled input reaches a server-side `eval()` (or equivalent) and executes as JavaScript in the Node.js process — giving the attacker arbitrary server-side code execution.

## How it works

```js
// Vulnerable Express endpoint
app.get('/calc', (req, res) => {
    const result = eval(req.query.expr);  // <-- never do this
    res.json({ result });
});
```

Attacker hits: `GET /calc?expr=require('child_process').execSync('cat /etc/passwd')`

The `eval` runs inside the Node.js process with full server permissions — file system, OS commands, network, everything.

## Common vulnerable patterns

| Pattern | Why it's dangerous |
|---|---|
| `eval(userInput)` | Direct execution |
| `new Function(userInput)()` | Same as eval, just less obvious |
| `setTimeout(userInput, 0)` / `setInterval(userInput, 0)` | String form also evaluates code |
| Template engines with `{{{ }}}` / `<%- %>` (unescaped output) | Some support expression evaluation |
| `vm.runInThisContext(userInput)` | Not sandboxed — same process, same globals |
| `require('some-module')` where the module path comes from user input | Path traversal to load arbitrary files |
| YAML / BSON deserialization with `!!js/eval` | Some parsers evaluate embedded code |

## What an attacker can do

Once code runs in the Node.js process:
- Read any file on the server (`/etc/passwd`, `.env`, private keys)
- Execute arbitrary OS commands (`child_process.execSync`)
- Exfiltrate environment variables (DB passwords, API keys)
- Pivot to internal network (the server has internal access)
- Plant a reverse shell / persistent backdoor

## Mitigations

1. **Never use `eval` on user input** — there's almost always a better way (JSON.parse for data, a proper math library for expressions, etc.).
2. **Never pass user input as a string to `setTimeout`/`setInterval`** — always use a function reference: `setTimeout(() => doThing(), 1000)`.
3. **Whitelist/validate inputs** — if you need dynamic dispatch, map allowed strings to known safe functions.
4. **Use `vm.createContext` with strict sandboxing** — but be aware `vm` module is not a security boundary; a determined attacker can escape it. For untrusted code execution use isolated-vm or a subprocess with seccomp/AppArmor.
5. **Content Security Policy (server-side equivalent)** — run Node.js with minimal OS permissions; use containers/sandboxes so even successful code injection has limited blast radius.
6. **Dependency scanning** — SSJI can also come from malicious or compromised npm packages (`eval`-ing data from their own APIs).

## Interview soundbites

- *"What's SSJI?"* → User input reaching server-side `eval()` — the server executes the attacker's code with full Node.js process permissions.
- *"Is `vm.runInNewContext` safe?"* → Not as a security sandbox — it's designed for isolation of different scripts, not for running untrusted code. Prototype chain manipulation can break out. Use isolated-vm or a subprocess for true sandboxing.
- *"How is SSJI different from XSS?"* → XSS runs attacker code in a *victim's browser*. SSJI runs attacker code in your *server process* — no victim browser involved, and the impact is typically worse (OS-level access).
- *"What's the actual fix?"* → Don't eval user input. Period. Validate, whitelist, or use a structured parser. There's no safe way to eval arbitrary user-provided strings.
