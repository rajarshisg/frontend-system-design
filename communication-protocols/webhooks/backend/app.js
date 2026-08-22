import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
    origin: '*', // Replace with your frontend's origin
}));
app.use(express.json());

// Shared secret the "provider" signs webhook deliveries with, and the
// "consumer" checks on receipt. Real integrations use an HMAC signature
// over the payload (e.g. Stripe's Stripe-Signature header) instead of a
// raw shared secret, but the idea being demonstrated is the same.
const WEBHOOK_SECRET = 'demo-secret-123';

// URLs that have subscribed to be called back when an order finishes.
// In this demo there's only one real subscriber (this same server's
// /webhooks/receive route, standing in for a third party's backend).
const subscribers = [];

// Browser tabs listening over Server-Sent Events so we can *see* a
// webhook arrive in real time. A real webhook consumer has no browser in
// the loop at all — this is purely for visualizing the demo.
const sseClients = [];

function broadcastToBrowser(event) {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    sseClients.forEach(client => client.write(payload));
}

app.post('/webhooks/subscribe', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ message: 'url is required' });
    }
    if (!subscribers.includes(url)) {
        subscribers.push(url);
    }
    res.json({ message: 'Subscribed', subscribers });
});

// Kicks off a "slow" piece of work (e.g. payment processing, video
// encoding, report generation). The caller gets an immediate ack and is
// NOT expected to poll for the result — a webhook will be delivered to
// every subscribed URL once the work finishes.
app.post('/orders', (req, res) => {
    const orderId = `order_${Date.now()}`;
    const { item = 'Widget' } = req.body;

    res.status(202).json({ orderId, status: 'processing' });

    const processingTimeMs = 3000;
    setTimeout(async () => {
        const event = {
            id: `evt_${Date.now()}`,
            type: 'order.completed',
            data: { orderId, item },
            createdAt: new Date().toISOString(),
        };

        for (const url of subscribers) {
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Secret': WEBHOOK_SECRET,
                    },
                    body: JSON.stringify(event),
                });
            } catch (err) {
                // A real implementation would retry with backoff here
                // and let the consumer dedupe on event.id.
                console.error(`Failed to deliver webhook to ${url}:`, err.message);
            }
        }
    }, processingTimeMs);
});

// Stands in for the THIRD PARTY'S server. This is the endpoint the
// provider calls when the event happens - the consumer never asks for
// this, it just shows up.
app.post('/webhooks/receive', (req, res) => {
    if (req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
        return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body;
    console.log('Webhook received:', event);

    // Acknowledge receipt immediately so the provider doesn't retry.
    res.status(200).json({ received: true });

    broadcastToBrowser(event);
});

// Lets the demo frontend watch webhook deliveries arrive live.
app.get('/events', (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
        const index = sseClients.indexOf(res);
        if (index !== -1) sseClients.splice(index, 1);
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
