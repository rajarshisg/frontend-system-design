import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const victim = express();

// The fix: tell the browser who's allowed to frame this page, BEFORE it
// renders anything. Both headers are set together deliberately:
// - Content-Security-Policy: frame-ancestors is the modern standard and
//   wins whenever both are present in a browser that understands it.
// - X-Frame-Options is the older header, kept for any client that only
//   understands that one (CSP frame-ancestors has near-universal support
//   today, so this is mostly a legacy safety net).
victim.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    next();
});

victim.get('/victim', (req, res) => {
    res.sendFile(path.join(__dirname, 'victim.html'));
});

victim.post('/transfer', (req, res) => {
    console.log('Transfer executed via a direct, non-framed request.');
    res.json({ message: 'Transfer of $10,000 completed.' });
});

victim.listen(3000, () => {
    console.log('Victim ("SecureBank") running at http://localhost:3000/victim - framing blocked.');
});

const attacker = express();

attacker.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'attack.html'));
});

attacker.listen(4000, () => {
    console.log('Attacker site running at http://localhost:4000 - open this one in your browser.');
});
