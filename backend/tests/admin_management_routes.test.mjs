import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';

import { createAdminRouter } from '../dist/routes/adminRouter.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function request(server, path, options = {}) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const body = text && contentType.includes('application/json') ? JSON.parse(text) : text || null;
  return { response, body };
}

function createApp(access) {
  const bucket = {
    uploadPhoto: async () => ({ bucket: 'public-assets', key: 'photos/product/bear.png', publicUrl: 'http://bucket/bear.png' }),
    deletePublicObject: async () => {},
    uploadPatternPdf: async () => ({ bucket: 'private-patterns', key: 'pdfs/patterns/pattern.pdf' }),
    deletePatternPdf: async () => {},
  };
  return express().use(express.json()).use('/admin', createAdminRouter({ access, bucket }));
}

test('admin management routes list products and mark orders fulfilled', async () => {
  const calls = [];
  const access = {
    adminLogin: async () => ({ admin: { email: 'admin@example.com', name: 'Admin' }, cookie: 'admin-1' }),
    getOrders: async () => [{ orderId: 'o1', productId: 'p1', clientEmail: 'a@example.com', details: {}, clientInstructions: '', chargedAmount: 25, status: 'pending' }],
    updateOrderStatus: async (cookie, orderId, status) => { calls.push(['updateOrderStatus', cookie, orderId, status]); return { orderId, productId: 'p1', clientEmail: 'a@example.com', details: {}, clientInstructions: '', chargedAmount: 25, status }; },
    listAdminProducts: async (cookie) => { calls.push(['listAdminProducts', cookie]); return [{ id: 'p1', type: 'plushie', title: 'Bear', price: 25, description: 'Bear', thumbnailImage: 'http://bucket/bear.png', available: true, readyToShip: true, colorVariations: ['brown'] }]; },
    addProduct: async () => ({}),
    editProduct: async () => ({}),
    removeProduct: async () => {},
    getServiceHealth: async () => ({ status: 'ok', checkedAt: '2026-01-01T00:00:00.000Z', services: [{ name: 'database', status: 'ok' }] }),
    listBlogArticles: async () => [],
    createBlogArticle: async () => ({}),
    updateBlogArticle: async () => ({}),
    deleteBlogArticle: async () => {},
  };
  const server = await listen(createApp(access));
  try {
    const products = await request(server, '/admin/products', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(products.response.status, 200);
    assert.equal(products.body.products[0].thumbnailImage, 'http://bucket/bear.png');

    const updated = await request(server, '/admin/orders/o1/status', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ status: 'fulfilled' }) });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.order.status, 'fulfilled');
    assert.deepEqual(calls, [['listAdminProducts', 'admin-1'], ['updateOrderStatus', 'admin-1', 'o1', 'fulfilled']]);
  } finally {
    server.close();
  }
});

test('admin management routes expose service health and blog article CRUD', async () => {
  const calls = [];
  const article = { articleId: 'blog-1', title: 'Launch', slug: 'launch', excerpt: 'News', blocks: [{ type: 'heading', level: 1, text: 'Launch' }], published: false };
  const access = {
    adminLogin: async () => ({ admin: { email: 'admin@example.com', name: 'Admin' }, cookie: 'admin-1' }),
    getOrders: async () => [],
    updateOrderStatus: async () => ({}),
    listAdminProducts: async () => [],
    addProduct: async () => ({}),
    editProduct: async () => ({}),
    removeProduct: async () => {},
    getServiceHealth: async (cookie) => { calls.push(['getServiceHealth', cookie]); return { status: 'ok', checkedAt: '2026-01-01T00:00:00.000Z', services: [{ name: 'database', status: 'ok' }, { name: 'objectStorage', status: 'ok' }] }; },
    listBlogArticles: async (cookie) => { calls.push(['listBlogArticles', cookie]); return [article]; },
    createBlogArticle: async (cookie, input) => { calls.push(['createBlogArticle', cookie, input.title]); return { ...article, ...input }; },
    updateBlogArticle: async (cookie, articleId, input) => { calls.push(['updateBlogArticle', cookie, articleId, input.published]); return { ...article, articleId, ...input }; },
    deleteBlogArticle: async (cookie, articleId) => { calls.push(['deleteBlogArticle', cookie, articleId]); },
  };
  const server = await listen(createApp(access));
  try {
    const health = await request(server, '/admin/service-health', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(health.response.status, 200);
    assert.equal(health.body.health.services.length, 2);

    const listed = await request(server, '/admin/blog/articles', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(listed.body.articles[0].slug, 'launch');

    const created = await request(server, '/admin/blog/articles', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ title: 'Launch', slug: 'launch', excerpt: 'News', blocks: [], published: false }) });
    assert.equal(created.response.status, 201);

    const updated = await request(server, '/admin/blog/articles/blog-1', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ published: true }) });
    assert.equal(updated.body.article.published, true);

    const deleted = await request(server, '/admin/blog/articles/blog-1', { method: 'DELETE', headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(deleted.response.status, 204);
    assert.deepEqual(calls.map((call) => call[0]), ['getServiceHealth', 'listBlogArticles', 'createBlogArticle', 'updateBlogArticle', 'deleteBlogArticle']);
  } finally {
    server.close();
  }
});
