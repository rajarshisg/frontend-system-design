### Important Security Headers
- X-Powered-By: Tells the clients what type of server is used by the back-end (eg: Express, FastAPI, etc.). This header should be removed otherwise if there are any known vulnerabilities on the type of server being used, attackers can exploit that.

- Referrer-Policy: Tells from where the current page has come / redirected from. This might have some vulnerabilities like if in the parent website you were on a route which had critical info in URL params on redirect to a different website all this information is shared. So ideally we can set this policy to 'no-referrer' > never send, 'no-referrer-when-downgrade' > do not send when https to http, 'origin' > only send origin, 'origin-when-cross-origin' > only send origin when going to a different sit (on different domain/origin)

- X-Content-Type-Options: Set the type of content being responded from server, so that browser cannot sniff (change content type based on file type it identifies), this prevent attackers from injecting malicious scripts for eg when all you wanted was to share a JPG.

- X-XSS-Protection: Whether to do XSS filtering. Modern day is CSP header.

- HSTS (Strict-Transport-Security Header): Any request coming over HTTP should automatically be upgraded to HTTPS.

### Client Storage Security
- Always try storing sensitive information on server if possible.
- If not possible, encrypt the data
- Always set the token expiry / data stored in local storage / session storage
- Always use JWT tokens for auth tokens than storing plain passwords
- Always have MFA
- Add checksum on data stored.
- Cookie and Local Storage is 5MB to 10MB per domain, IndexDB (50MB to 100MB per domain), Cookie (4KB to 20KB per cookie), Cache Storage (100s of MBs of data), we need to handl eit correctly because if we hit storage limits old data might be lost or issues might come.
- Set cookies to SameSite HttpOnly and Secure so that no one can access them using document.cookie

### Why is HTTPS secure (how it works and benefits)?

HTTPS = HTTP + TLS. TLS sits between TCP and HTTP and provides three things:

1. **Encryption** — data is encrypted in transit using symmetric keys (negotiated during the handshake), so eavesdroppers see ciphertext.
2. **Authentication** — the server presents a certificate signed by a trusted Certificate Authority (CA). The browser validates the chain → you know you're talking to the real server, not an impersonator.
3. **Integrity** — each TLS record includes a MAC (message authentication code). Tampering in transit is detected and the connection is dropped.

**TLS Handshake (simplified):**
1. Client sends `ClientHello` — TLS version, supported cipher suites, random bytes.
2. Server replies with its certificate + chosen cipher suite + its own random bytes.
3. Client verifies the cert (chain of trust to a trusted CA, not expired, domain matches).
4. They derive shared symmetric session keys from the random bytes using asymmetric crypto (RSA or ECDHE key exchange). After this, everything is symmetric-encrypted — fast.
5. Both sides send `Finished` (a MAC of the handshake) to confirm nothing was tampered with.

**Interview soundbites:**
- Asymmetric crypto (slow, public/private keys) is only used in the handshake to exchange keys. All actual data uses symmetric crypto (fast).
- ECDHE (Diffie-Hellman) provides **perfect forward secrecy** — even if the server's private key is later compromised, past sessions cannot be decrypted because the session keys were ephemeral.
- HSTS header tells browsers to *only* connect over HTTPS for a period, preventing downgrade attacks.

### Dependency Security
Packages or transitive packages which our applicaitons depend on may have vulnerabilities over time. To mitigate:
- Have regular audits (eg: npm audit, npm update)
- Enforce Auditing (npm set audit true, or automated CI scans using Dependabot, Checkmarx, etc)
- Code and Dependency Monitoring (CodeQL, or Checkmarx)
- Dependency Locking (package-lock.json) lock the dependency to a particular version
- Security Scanning: Penetration Testing

### Compliance

| Standard | Scope | What it requires (high level) |
|---|---|---|
| **GDPR** | Personal data of EU residents | Lawful basis to collect, right to access/delete, breach notification within 72 hrs, data minimisation, DPO for large processors |
| **PCI-DSS** | Any system that processes/stores/transmits cardholder data | Encrypt data in transit + at rest, strong access controls, regular pen-tests, network segmentation, never store raw CVV |
| **ISO 27001** | Organization-wide information security | Risk-based ISMS (Information Security Management System), documented controls, annual internal audits, third-party certification |
| **OWASP Top 10** | Web application vulnerabilities | Not a legal standard — a prioritised awareness list (Injection, Broken Auth, XSS, Broken Access Control, etc.). Use it as a checklist during code review and threat modelling |

Frontend relevance: GDPR affects cookie consent banners, tracking pixels, and local storage of user data. PCI means you never build your own payment form — you use a hosted iframe from the processor. OWASP Top 10 is the most directly actionable list for day-to-day dev work.

### Input Validation and Sanitization
- Use libraries and frameworks (like React) which take care of these out of the box.
- Whitelist validation
- Regex validation
- Escape user input
- Parameterized URLs
- Validate Data Type
- Size of data
- Add both client side and server side validation
- Error Handling
- Security Headers
- Regular patches of libraries
- Security Audits and Testing
- Avoid using third party libraries as much as possible
