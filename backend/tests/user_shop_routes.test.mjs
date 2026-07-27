import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';

import { createShopRouter } from '../dist/routes/shopRoutes.js';
import { createUserRouter } from '../dist/routes/userRoutes.js';

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

test('user auth routes register, login, and read profile with client_cookie', async () => {
  const calls = [];
  const access = {
    addUser: async (input) => { calls.push(['addUser', input]); return { user: { email: input.email, name: input.name, cart: [], pdfKeys: [] }, cookie: 'client-1' }; },
    loginUser: async (input) => { calls.push(['loginUser', input]); return { user: { email: input.email, name: 'Ada', cart: [], pdfKeys: [] }, cookie: 'client-2' }; },
    getSession: async (cookies) => { calls.push(['getSession', cookies]); return cookies.clientCookie ? { status: 'authenticated', user: { email: 'a@example.com', name: 'Ada', cart: [], pdfKeys: [] } } : { status: 'guest' }; },
    logoutUser: async (cookie) => { calls.push(['logoutUser', cookie]); },
    getUser: async (email, cookie) => { calls.push(['getUser', email, cookie]); return { user: { email, name: 'Ada', cart: [], pdfKeys: ['pdfs/patterns/p1.pdf'] }, orders: [] }; },
    updateUser: async (input, email, cookie) => { calls.push(['updateUser', input, email, cookie]); return { email, name: input.name, cart: [], pdfKeys: [] }; },
    deleteUser: async (email, cookie) => { calls.push(['deleteUser', email, cookie]); },
  };
  const app = express().use(express.json()).use('/user', createUserRouter({ access }));
  const server = await listen(app);
  try {
    const csrf = await request(server, '/user/csrf');
    assert.equal(csrf.response.status, 200);
    assert.equal(csrf.body.headerName, 'x-csrf-token');
    const csrfCookie = csrf.response.headers.get('set-cookie');
    assert.match(csrfCookie, /csrf_token=/);

    const registered = await request(server, '/user/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@example.com', name: 'Ada', password: 'pw' }) });
    assert.equal(registered.response.status, 201);
    assert.match(registered.response.headers.get('set-cookie'), /client_cookie=client-1/);
    assert.match(registered.response.headers.get('set-cookie'), /Max-Age=7200/);
    assert.match(registered.response.headers.get('set-cookie'), /HttpOnly/);
    assert.match(registered.response.headers.get('set-cookie'), /SameSite=Lax/);

    const loggedIn = await request(server, '/user/auth?email=a@example.com&password=pw');
    assert.equal(loggedIn.response.status, 200);
    assert.match(loggedIn.response.headers.get('set-cookie'), /client_cookie=client-2/);

    const postLogin = await request(server, '/user/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@example.com', password: 'pw' }) });
    assert.equal(postLogin.response.status, 200);
    assert.match(postLogin.response.headers.get('set-cookie'), /client_cookie=client-2/);

    const session = await request(server, '/user/session', { headers: { cookie: 'client_cookie=client-2' } });
    assert.equal(session.body.status, 'authenticated');
    assert.equal(session.body.user.email, 'a@example.com');

    const profile = await request(server, '/user/profile?email=a@example.com', { headers: { cookie: 'client_cookie=client-2' } });
    assert.equal(profile.body.user.email, 'a@example.com');
    assert.deepEqual(profile.body.user.pdfKeys, ['pdfs/patterns/p1.pdf']);

    const rejectedUpdate = await request(server, '/user/profile', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'client_cookie=client-2' }, body: JSON.stringify({ email: 'a@example.com', name: 'Ada Lovelace' }) });
    assert.equal(rejectedUpdate.response.status, 403);

    const csrfHeaders = { 'content-type': 'application/json', cookie: `client_cookie=client-2; ${csrfCookie.split(';')[0]}`, 'x-csrf-token': csrf.body.token };
    const updated = await request(server, '/user/profile', { method: 'POST', headers: csrfHeaders, body: JSON.stringify({ email: 'a@example.com', name: 'Ada Lovelace' }) });
    assert.equal(updated.body.user.name, 'Ada Lovelace');

    const deleted = await request(server, '/user/profile', { method: 'DELETE', headers: csrfHeaders, body: JSON.stringify({ email: 'a@example.com' }) });
    assert.equal(deleted.response.status, 204);
    assert.match(deleted.response.headers.get('set-cookie'), /client_cookie=/);

    const logout = await request(server, '/user/logout', { method: 'POST', headers: { cookie: 'client_cookie=client-2' } });
    assert.equal(logout.response.status, 204);
    assert.match(logout.response.headers.get('set-cookie'), /client_cookie=/);
  } finally {
    server.close();
  }
});

test('user auth routes throttle repeated login attempts', async () => {
  const access = {
    addUser: async () => { throw new Error('not used'); },
    loginUser: async () => { throw new Error('Invalid user credentials.'); },
    getSession: async () => ({ status: 'guest' }),
    logoutUser: async () => {},
    getUser: async () => { throw new Error('not used'); },
    updateUser: async () => { throw new Error('not used'); },
    deleteUser: async () => { throw new Error('not used'); },
  };
  const app = express().use(express.json()).use('/user', createUserRouter({ access, rateLimit: { maxAttempts: 1, windowMs: 60_000 } }));
  const server = await listen(app);
  try {
    await request(server, '/user/auth?email=a@example.com&password=bad');
    const limited = await request(server, '/user/auth?email=a@example.com&password=bad');

    assert.equal(limited.response.status, 429);
    assert.equal(limited.body.error, 'rate_limited');
    assert.equal(limited.body.retryAfterSeconds, 60);
  } finally {
    server.close();
  }
});

test('shop routes list products and maintain guest cart with session_cookie', async () => {
  const access = {
    listShopProducts: async (request) => ({ products: [{ id: `${request.filters.type === 'all' ? 'plushie' : request.filters.type}-1`, type: request.filters.type === 'all' ? 'plushie' : request.filters.type, price: 10, isSaleItem: false, description: 'd', thumbnailImage: 'thumb', available: true, sizes: [], readyToShip: true, colorVariations: [{ name: 'red' }] }], nextCursor: 'cursor-1', hasMore: false, appliedFilters: request.filters }),
    listAvailableProductFilterOptions: async () => ({ colors: ['red'], sizes: ['medium'] }),
    listAvailableProductColors: async () => ['red'],
    listAvailableProductSizes: async () => ['medium'],
    addCartItem: async (input, cookies) => ({ cookie: cookies.sessionCookie ?? 'session-1', cookieName: cookies.clientCookie ? 'client_cookie' : 'session_cookie', cart: [input] }),
    removeCartItem: async (productId, cookies) => ({ cookie: cookies.sessionCookie ?? 'session-1', cookieName: 'session_cookie', cart: [] }),
    getCart: async () => ({ items: [{ itemId: 'p1:red:medium', productId: 'p1', productType: 'plushie', title: 'Bear', thumbnailImage: 'thumb', quantity: 1, unitPrice: 1000, lineTotal: 1000, selectedColor: 'red', selectedSize: 'medium' }], subtotal: 1000, containsPatterns: false, guestCheckoutAllowed: true }),
    updateCartItem: async () => ({ items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }),
    estimateCheckout: async () => ({ subtotal: 1000, shipping: 800, tax: 83, discount: 0, grandTotal: 1883, currency: 'USD' }),
    checkout: async () => ({ orderId: 'order-1', status: 'pending', totals: { subtotal: 1000, discountTotal: 0, shipping: 800, tax: 83, grandTotal: 1883 }, purchasedPatternDownloadsAvailable: false }),
    addUser: async () => ({}),
    loginUser: async () => ({}),
    getSession: async () => ({ status: 'guest' }),
    logoutUser: async () => {},
    getUser: async () => ({}),
    updateUser: async () => ({}),
    deleteUser: async () => {},
  };
  const app = express().use(express.json()).use('/user', createUserRouter({ access })).use('/shop', createShopRouter({ access }));
  const server = await listen(app);
  try {
    const csrf = await request(server, '/user/csrf');
    const csrfCookie = csrf.response.headers.get('set-cookie').split(';')[0];

    const listed = await request(server, '/shop/plushies?batchSize=2');
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.products[0].type, 'plushie');

    const filtered = await request(server, '/shop/products?type=all&batchSize=2&sort=price&direction=asc&saleOnly=true&color=red&size=medium');
    assert.equal(filtered.response.status, 200);
    assert.equal(filtered.body.appliedFilters.saleOnly, true);
    assert.equal(filtered.body.appliedFilters.color, 'red');
    assert.equal(filtered.body.nextCursor, 'cursor-1');

    const filters = await request(server, '/shop/filters');
    assert.deepEqual(filters.body, { colors: ['red'], sizes: ['medium'] });

    const colors = await request(server, '/shop/filters/colors');
    assert.deepEqual(colors.body.colors, ['red']);

    const sizes = await request(server, '/shop/filters/sizes');
    assert.deepEqual(sizes.body.sizes, ['medium']);

    const rejectedAdd = await request(server, '/shop/plushies', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'p1', quantity: 1, colorVariation: 'red' }) });
    assert.equal(rejectedAdd.response.status, 403);

    const added = await request(server, '/shop/plushies', { method: 'POST', headers: { 'content-type': 'application/json', cookie: csrfCookie, 'x-csrf-token': csrf.body.token }, body: JSON.stringify({ productId: 'p1', quantity: 1, colorVariation: 'red' }) });
    assert.equal(added.response.status, 200);
    assert.match(added.response.headers.get('set-cookie'), /session_cookie=session-1/);
    assert.match(added.response.headers.get('set-cookie'), /Max-Age=7200/);

    const removed = await request(server, '/shop/plushies', { method: 'DELETE', headers: { 'content-type': 'application/json', cookie: `session_cookie=session-1; ${csrfCookie}`, 'x-csrf-token': csrf.body.token }, body: JSON.stringify({ productId: 'p1' }) });
    assert.deepEqual(removed.body.cart, []);

    const cart = await request(server, '/shop/cart', { headers: { cookie: 'session_cookie=session-1' } });
    assert.equal(cart.response.status, 200);
    assert.equal(cart.body.items[0].title, 'Bear');

    const patched = await request(server, '/shop/cart/items/p1%3Ared%3Amedium', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: `session_cookie=session-1; ${csrfCookie}`, 'x-csrf-token': csrf.body.token }, body: JSON.stringify({ quantity: 2 }) });
    assert.equal(patched.response.status, 200);

    const estimate = await request(server, '/shop/checkout/estimate', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'session_cookie=session-1' }, body: JSON.stringify({ shippingAddress: { country: 'US', state: 'CA', postalCode: '90210' } }) });
    assert.equal(estimate.body.grandTotal, 1883);

    const checkout = await request(server, '/shop/checkout', { method: 'POST', headers: { 'content-type': 'application/json', cookie: `session_cookie=session-1; ${csrfCookie}`, 'x-csrf-token': csrf.body.token }, body: JSON.stringify({ idempotencyKey: 'key-1' }) });
    assert.equal(checkout.response.status, 201);
    assert.equal(checkout.body.orderId, 'order-1');
  } finally {
    server.close();
  }
});
