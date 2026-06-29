import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';

import { createDocsRouter } from '../dist/routes/docsRoutes.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function request(server, path, options = {}) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

test('docs route lists every mounted backend endpoint', async () => {
  const app = express().use('/docs', createDocsRouter());
  const server = await listen(app);

  try {
    const docs = await request(server, '/docs');
    assert.equal(docs.response.status, 200);
    assert.equal(docs.body.basePath, '/api');

    const endpointIds = docs.body.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`);
    assert.deepEqual(endpointIds, [
      'GET /api/docs',
      'GET /api/health',
      'POST /api/admin/login',
      'GET /api/admin/orders',
      'PATCH /api/admin/orders/:orderId/status',
      'GET /api/admin/products',
      'POST /api/admin/products',
      'PATCH /api/admin/products/:productId',
      'DELETE /api/admin/products/:productId',
      'POST /api/admin/photos/:category',
      'DELETE /api/admin/photos/:category/*key',
      'POST /api/admin/pdfs/patterns',
      'DELETE /api/admin/pdfs/patterns/*key',
      'GET /api/admin/service-health',
      'GET /api/admin/blog/articles',
      'POST /api/admin/blog/articles',
      'PATCH /api/admin/blog/articles/:articleId',
      'DELETE /api/admin/blog/articles/:articleId',
      'GET /api/shop/plushies',
      'POST /api/shop/plushies',
      'DELETE /api/shop/plushies',
      'GET /api/shop/patterns',
      'POST /api/shop/patterns',
      'DELETE /api/shop/patterns',
      'GET /api/user/auth',
      'POST /api/user/auth',
      'GET /api/user/profile',
      'POST /api/user/profile',
      'DELETE /api/user/profile',
    ]);

    const adminOrders = docs.body.endpoints.find((endpoint) => endpoint.path === '/api/admin/orders');
    assert.match(adminOrders.auth, /admin_cookie/);

    const register = docs.body.endpoints.find((endpoint) => endpoint.method === 'POST' && endpoint.path === '/api/user/auth');
    assert.deepEqual(register.setsCookies, ['client_cookie']);
  } finally {
    server.close();
  }
});
