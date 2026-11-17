import http from 'node:http';
import { createServer } from 'vite';
import checkout from '../api/checkout.js';
import webhook from '../api/stripe-webhook.js';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  if (!url.pathname.startsWith('/api/')) return vite.middlewares(req, res);
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
  req.query = Object.fromEntries(url.searchParams);
  try {
    if (url.pathname === '/api/stripe-webhook') return await webhook(req, res);
    if (url.pathname !== '/api/checkout') return res.status(404).json({ error: 'Endpoint not found.' });
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 65536) return res.status(413).json({ error: 'Request too large.' });
      }
      try { req.body = JSON.parse(body); }
      catch { return res.status(400).json({ error: 'Invalid JSON.' }); }
    }
    await checkout(req, res);
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Local payment server failed.' });
    else res.end();
  }
});
server.listen(3000, '127.0.0.1', () => console.log('App and payment server ready at http://localhost:3000'));
