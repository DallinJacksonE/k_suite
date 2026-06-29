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
    getUser: async (email, cookie) => { calls.push(['getUser', email, cookie]); return { user: { email, name: 'Ada', cart: [], pdfKeys: ['pdfs/patterns/p1.pdf'] }, orders: [] }; },
    updateUser: async (input, email, cookie) => { calls.push(['updateUser', input, email, cookie]); return { email, name: input.name, cart: [], pdfKeys: [] }; },
    deleteUser: async (email, cookie) => { calls.push(['deleteUser', email, cookie]); },
  };
  const app = express().use(express.json()).use('/user', createUserRouter({ access }));
  const server = await listen(app);
  try {
    const registered = await request(server, '/user/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@example.com', name: 'Ada', password: 'pw' }) });
    assert.equal(registered.response.status, 201);
    assert.match(registered.response.headers.get('set-cookie'), /client_cookie=client-1/);

    const loggedIn = await request(server, '/user/auth?email=a@example.com&password=pw');
    assert.equal(loggedIn.response.status, 200);
    assert.match(loggedIn.response.headers.get('set-cookie'), /client_cookie=client-2/);

    const profile = await request(server, '/user/profile?email=a@example.com', { headers: { cookie: 'client_cookie=client-2' } });
    assert.equal(profile.body.user.email, 'a@example.com');
    assert.deepEqual(profile.body.user.pdfKeys, ['pdfs/patterns/p1.pdf']);

    const updated = await request(server, '/user/profile', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'client_cookie=client-2' }, body: JSON.stringify({ email: 'a@example.com', name: 'Ada Lovelace' }) });
    assert.equal(updated.body.user.name, 'Ada Lovelace');

    const deleted = await request(server, '/user/profile', { method: 'DELETE', headers: { 'content-type': 'application/json', cookie: 'client_cookie=client-2' }, body: JSON.stringify({ email: 'a@example.com' }) });
    assert.equal(deleted.response.status, 204);
    assert.match(deleted.response.headers.get('set-cookie'), /client_cookie=/);
  } finally {
    server.close();
  }
});

test('shop routes list products and maintain guest cart with session_cookie', async () => {
  const access = {
    listShopProducts: async (type, batchSize, afterId) => [{ id: `${type}-1`, type, price: 10, description: 'd', thumbnailImage: 'thumb', available: true, ...(type === 'plushie' ? { readyToShip: true, colorVariations: ['red'] } : { pdfKey: 'pdfs/patterns/p.pdf' }) }],
    addCartItem: async (input, cookies) => ({ cookie: cookies.sessionCookie ?? 'session-1', cookieName: cookies.clientCookie ? 'client_cookie' : 'session_cookie', cart: [input] }),
    removeCartItem: async (productId, cookies) => ({ cookie: cookies.sessionCookie ?? 'session-1', cookieName: 'session_cookie', cart: [] }),
  };
  const app = express().use(express.json()).use('/shop', createShopRouter({ access }));
  const server = await listen(app);
  try {
    const listed = await request(server, '/shop/plushies?batchSize=2');
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.products[0].type, 'plushie');

    const added = await request(server, '/shop/plushies', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'p1', quantity: 1, colorVariation: 'red' }) });
    assert.equal(added.response.status, 200);
    assert.match(added.response.headers.get('set-cookie'), /session_cookie=session-1/);

    const removed = await request(server, '/shop/plushies', { method: 'DELETE', headers: { 'content-type': 'application/json', cookie: 'session_cookie=session-1' }, body: JSON.stringify({ productId: 'p1' }) });
    assert.deepEqual(removed.body.cart, []);
  } finally {
    server.close();
  }
});
