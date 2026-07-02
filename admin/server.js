import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4999;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5000';

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res, next) => {
  console.log(`[Express] Received ${req.method} request for ${req.url}`);
  next();
});

// Proxy API requests with forced visibility
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  logger: console, // Forces the v3 middleware to output its internal logs
  on: {
    proxyReq: (proxyReq, req, res) => {

      console.log(`[Proxy] Attempting to forward ${req.method} to ${BACKEND_URL}${req.url}`);
    },
    proxyRes: (proxyRes, req, res) => {
      console.log(`[Proxy] Backend responded with status: ${proxyRes.statusCode}`);
    },
    error: (err, req, res) => {
      console.error('[Proxy] Critical Network Error:', err.message);
      // Send a 502 instead of a 404 so the browser knows the proxy failed
      res.status(502).json({ error: 'Proxy failed to reach the backend container', details: err.message });
    }
  }
}));

app.use('/ws', createProxyMiddleware({
  target: BACKEND_URL,
  ws: true,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  logger: console
}));

app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend service listening on port ${PORT}`);
  console.log(`Proxying API and websocket traffic to ${BACKEND_URL}`);
});
