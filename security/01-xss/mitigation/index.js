import express from "express";

const app = express();

app.use(express.json());

// DEMO SIMPLIFICATION: the nonce is hardcoded so it's easy to read in the
// HTML source. In a real app it must be a fresh cryptographically random
// value generated PER RESPONSE (e.g. crypto.randomBytes(16).toString('base64'))
// and injected into both this header and the <script nonce="..."> tag for
// that request only. A nonce that's predictable or reused across requests
// gives an attacker who can inject a full <script nonce="..."> element
// (not just an attribute, since innerHTML-inserted <script> tags don't run -
// but e.g. a server-side template injection could) a way around this policy.
const setCspHeadersMiddleware = (req, res, next) => {
    res.setHeader("Content-Security-Policy", [
        "default-src 'self'",       // fallback for any directive not listed below
        "script-src 'self' 'nonce-randomkey'", // only same-origin files + our nonced inline script; NO 'unsafe-inline'
        "style-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",       // restricts fetch/XHR/WebSocket targets
        "frame-src 'none'",         // this page can't embed iframes (not to be confused with frame-ancestors, which controls who can embed THIS page)
        "object-src 'none'",        // blocks <object>/<embed>/plugin-based execution
        "base-uri 'self'",          // blocks <base href="evil.com"> hijacking relative URLs
        "form-action 'self'",       // blocks forms from being redirected to an attacker's domain
    ].join('; ') + ';');
    next();
}

app.use(setCspHeadersMiddleware);

app.get("/", (req, res) => {
  const dirName = process.cwd();
  res.sendFile(`${dirName}/mitigation.html`);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});