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
    listAdminMarketEvents: async () => [],
    createMarketEvent: async () => ({}),
    updateMarketEvent: async () => ({}),
    deleteMarketEvent: async () => {},
  };
  const server = await listen(createApp(access));
  try {
    const products = await request(server, '/admin/products', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(products.response.status, 200);
    assert.equal(products.body.products[0].thumbnailImage, 'http://bucket/bear.png');

    const updated = await request(server, '/admin/orders/o1/status', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ status: 'shipped' }) });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.order.status, 'shipped');
    assert.deepEqual(calls, [['listAdminProducts', 'admin-1'], ['updateOrderStatus', 'admin-1', 'o1', 'shipped']]);
  } finally {
    server.close();
  }
});


test('admin management routes expose user account management and refunds', async () => {
  const calls = [];
  const account = {
    user: { email: 'client@example.com', name: 'Client', emailNotificationsEnabled: true },
    orders: [{ orderId: 'o1', productId: 'p1', clientEmail: 'client@example.com', details: {}, clientInstructions: '', chargedAmount: 25, status: 'paid' }],
    purchasedPatterns: [],
    stats: { orderCount: 1, totalSpent: 25, refundedTotal: 0, purchasedPatternCount: 0, cartItemCount: 0 },
  };
  const access = {
    listAdminUsers: async (cookie) => { calls.push(['listAdminUsers', cookie]); return [account]; },
    updateAdminUser: async (cookie, email, input) => { calls.push(['updateAdminUser', cookie, email, input.name]); return { ...account, user: { ...account.user, ...input } }; },
    deleteAdminUser: async (cookie, email) => { calls.push(['deleteAdminUser', cookie, email]); },
    refundOrder: async (cookie, orderId, input) => { calls.push(['refundOrder', cookie, orderId, input.reason]); return { ...account.orders[0], orderId, status: 'refunded' }; },
  };
  const server = await listen(createApp(access));
  try {
    const users = await request(server, '/admin/users', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(users.response.status, 200);
    assert.equal(users.body.users[0].stats.orderCount, 1);

    const updated = await request(server, '/admin/users/client%40example.com', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ name: 'Updated Client' }) });
    assert.equal(updated.body.user.user.name, 'Updated Client');

    const refunded = await request(server, '/admin/orders/o1/refund', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ reason: 'Customer request' }) });
    assert.equal(refunded.body.order.status, 'refunded');

    const deleted = await request(server, '/admin/users/client%40example.com', { method: 'DELETE', headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(deleted.response.status, 204);
    assert.deepEqual(calls.map((call) => call[0]), ['listAdminUsers', 'updateAdminUser', 'refundOrder', 'deleteAdminUser']);
  } finally {
    server.close();
  }
});

test('admin management routes expose service health and blog article CRUD', async () => {
  const calls = [];
  const article = { articleId: 'blog-1', title: 'Launch', slug: 'launch', excerpt: 'News', blocks: [{ type: 'heading', level: 1, text: 'Launch' }], collectionTags: ['kaylies-creations-updates'], published: false };
  const access = {
    adminLogin: async () => ({ admin: { email: 'admin@example.com', name: 'Admin' }, cookie: 'admin-1' }),
    getOrders: async () => [],
    updateOrderStatus: async () => ({}),
    listAdminProducts: async () => [],
    addProduct: async () => ({}),
    editProduct: async () => ({}),
    removeProduct: async () => {},
    getServiceHealth: async (cookie) => { calls.push(['getServiceHealth', cookie]); return { status: 'ok', checkedAt: '2026-01-01T00:00:00.000Z', services: [{ name: 'database', status: 'ok' }, { name: 'objectStorage', status: 'ok' }] }; },
    listBlogCollections: async (cookie) => { calls.push(['listBlogCollections', cookie]); return [{ tag: 'kaylies-creations-updates', label: 'Kaylies Creations Updates' }]; },
    createBlogCollection: async (cookie, input) => { calls.push(['createBlogCollection', cookie, input.label]); return { tag: input.tag ?? 'tutorials', ...input }; },
    updateBlogCollection: async (cookie, tag, input) => { calls.push(['updateBlogCollection', cookie, tag, input.label]); return { tag, label: 'Old', ...input }; },
    deleteBlogCollection: async (cookie, tag) => { calls.push(['deleteBlogCollection', cookie, tag]); },
    listBlogArticles: async (cookie) => { calls.push(['listBlogArticles', cookie]); return [article]; },
    createBlogArticle: async (cookie, input) => { calls.push(['createBlogArticle', cookie, input.title]); return { ...article, ...input }; },
    updateBlogArticle: async (cookie, articleId, input) => { calls.push(['updateBlogArticle', cookie, articleId, input.published]); return { ...article, articleId, ...input }; },
    deleteBlogArticle: async (cookie, articleId) => { calls.push(['deleteBlogArticle', cookie, articleId]); },
    listAdminMarketEvents: async () => [],
    createMarketEvent: async () => ({}),
    updateMarketEvent: async () => ({}),
    deleteMarketEvent: async () => {},
  };
  const server = await listen(createApp(access));
  try {
    const health = await request(server, '/admin/service-health', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(health.response.status, 200);
    assert.equal(health.body.health.services.length, 2);

    const listed = await request(server, '/admin/blog/articles', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(listed.body.articles[0].slug, 'launch');

    const collections = await request(server, '/admin/blog/collections', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(collections.body.collections[0].tag, 'kaylies-creations-updates');

    const createdCollection = await request(server, '/admin/blog/collections', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ label: 'Tutorials', tag: 'tutorials' }) });
    assert.equal(createdCollection.response.status, 201);

    const updatedCollection = await request(server, '/admin/blog/collections/tutorials', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ label: 'Guides' }) });
    assert.equal(updatedCollection.body.collection.label, 'Guides');

    const deletedCollection = await request(server, '/admin/blog/collections/tutorials', { method: 'DELETE', headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(deletedCollection.response.status, 204);

    const created = await request(server, '/admin/blog/articles', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ title: 'Launch', slug: 'launch', excerpt: 'News', blocks: [], collectionTags: ['tutorials'], published: false }) });
    assert.equal(created.response.status, 201);

    const updated = await request(server, '/admin/blog/articles/blog-1', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ published: true, collectionTags: ['tutorials'] }) });
    assert.equal(updated.body.article.published, true);

    const deleted = await request(server, '/admin/blog/articles/blog-1', { method: 'DELETE', headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(deleted.response.status, 204);
    assert.deepEqual(calls.map((call) => call[0]), ['getServiceHealth', 'listBlogArticles', 'listBlogCollections', 'createBlogCollection', 'updateBlogCollection', 'deleteBlogCollection', 'createBlogArticle', 'updateBlogArticle', 'deleteBlogArticle']);
  } finally {
    server.close();
  }
});

test('admin management routes expose market date CRUD', async () => {
  const calls = [];
  const event = { id: 'market-1', title: 'Saturday Market', location: 'Town Square', address: '123 Market St, Pittsburgh, PA', startsAt: '2026-07-04T10:00:00.000Z' };
  const access = {
    adminLogin: async () => ({ admin: { email: 'admin@example.com', name: 'Admin' }, cookie: 'admin-1' }),
    getOrders: async () => [],
    updateOrderStatus: async () => ({}),
    listAdminProducts: async () => [],
    addProduct: async () => ({}),
    editProduct: async () => ({}),
    removeProduct: async () => {},
    getServiceHealth: async () => ({ status: 'ok', checkedAt: '2026-01-01T00:00:00.000Z', services: [] }),
    listBlogArticles: async () => [],
    createBlogArticle: async () => ({}),
    updateBlogArticle: async () => ({}),
    deleteBlogArticle: async () => {},
    listAdminMarketEvents: async (cookie) => { calls.push(['listAdminMarketEvents', cookie]); return [event]; },
    createMarketEvent: async (cookie, input) => { calls.push(['createMarketEvent', cookie, input.address]); return { ...event, ...input }; },
    updateMarketEvent: async (cookie, eventId, input) => { calls.push(['updateMarketEvent', cookie, eventId, input.address]); return { ...event, id: eventId, ...input }; },
    deleteMarketEvent: async (cookie, eventId) => { calls.push(['deleteMarketEvent', cookie, eventId]); },
  };
  const server = await listen(createApp(access));
  try {
    const listed = await request(server, '/admin/markets', { headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(listed.body.events[0].title, 'Saturday Market');

    const created = await request(server, '/admin/markets', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify(event) });
    assert.equal(created.response.status, 201);

    const updated = await request(server, '/admin/markets/market-1', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ address: '456 New Hall Ave' }) });
    assert.equal(updated.body.event.address, '456 New Hall Ave');

    const deleted = await request(server, '/admin/markets/market-1', { method: 'DELETE', headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(deleted.response.status, 204);
    assert.deepEqual(calls.map((call) => call[0]), ['listAdminMarketEvents', 'createMarketEvent', 'updateMarketEvent', 'deleteMarketEvent']);
  } finally {
    server.close();
  }
});
