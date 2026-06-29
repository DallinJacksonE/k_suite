import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addProduct,
  addUser,
  checkedout,
  checkUserPassword,
  createMariaDbAccess,
  getUser,
  loginUser,
  listShopProducts,
  addCartItem,
  removeCartItem,
  newCookie,
} from '../dist/db/mariadb_access.js';

class FakeService {
  constructor() {
    this.users = new Map();
    this.admins = new Map();
    this.cookies = new Map();
    this.guests = new Map();
    this.products = new Map();
    this.orders = [];
  }

  async findUserByEmail(email) { return this.users.get(email) ?? null; }
  async insertUser(user) { this.users.set(user.email, { ...user, cart: user.cart ?? [], pdfKeys: user.pdfKeys ?? [] }); return this.users.get(user.email); }
  async updateUser(email, patch) { this.users.set(email, { ...this.users.get(email), ...patch }); return this.users.get(email); }
  async deleteUser(email) { this.users.delete(email); }
  async insertAdmin(admin) { this.admins.set(admin.email, admin); return admin; }
  async findAdminByEmail(email) { return this.admins.get(email) ?? null; }
  async upsertCookie(email, cookie, kind = 'client') { this.cookies.set(cookie, { email, cookie, kind }); }
  async findCookie(cookie) { return this.cookies.get(cookie) ?? null; }
  async deleteCookie(cookie) { this.cookies.delete(cookie); }
  async insertProduct(product) { this.products.set(product.id, { ...product, available: product.available ?? true }); return this.products.get(product.id); }
  async updateProduct(productId, patch) { this.products.set(productId, { ...this.products.get(productId), ...patch }); return this.products.get(productId); }
  async findProductById(productId) { return this.products.get(productId) ?? null; }
  async insertOrder(order) { this.orders.push(order); return order; }
  async listOrdersForUser(email) { return this.orders.filter((order) => order.clientEmail === email); }
  async listOrders() { return this.orders; }
  async initialize() {}
  async close() {}
  async upsertGuestCart(guestCookie, cart) { const guest = { guestCookie, cart }; this.guests.set(guestCookie, guest); return guest; }
  async findGuestByCookie(guestCookie) { return this.guests.get(guestCookie) ?? null; }
  async deleteGuest(guestCookie) { this.guests.delete(guestCookie); }
  async removeProduct(productId) { await this.updateProduct(productId, { available: false }); }
  async listProducts(productType, includeUnavailable = false) { return [...this.products.values()].filter((product) => (!productType || product.type === productType) && (includeUnavailable || product.available)); }
}

test('addUser stores a salted hash and returns a usable client cookie', async () => {
  const service = new FakeService();
  const access = createMariaDbAccess(service, { randomBytes: () => 'cookie-1' });

  const result = await access.addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' });
  const stored = await service.findUserByEmail('a@example.com');

  assert.equal(result.user.email, 'a@example.com');
  assert.equal(result.cookie, 'cookie-1');
  assert.equal((await service.findCookie('cookie-1')).kind, 'client');
  assert.notEqual(stored.passwordHash, 'correct horse');
  assert.ok(stored.salt.length > 0);
});

test('checkUserPassword accepts the original password and rejects the wrong password', async () => {
  const service = new FakeService();
  const access = createMariaDbAccess(service, { randomBytes: () => 'cookie-1' });

  await access.addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' });

  assert.equal(await access.checkUserPassword('a@example.com', 'correct horse'), true);
  assert.equal(await access.checkUserPassword('a@example.com', 'wrong'), false);
});

test('getUser requires a matching client cookie and includes orders', async () => {
  const service = new FakeService();
  const access = createMariaDbAccess(service, { randomBytes: () => 'cookie-1' });

  const { cookie } = await addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' }, service, { randomBytes: () => 'cookie-1' });
  await service.insertOrder({ orderId: 'o1', productId: 'p1', clientEmail: 'a@example.com', details: {}, clientInstructions: '', chargedAmount: 100, status: 'pending' });

  const profile = await getUser('a@example.com', cookie, service);

  assert.equal(profile.user.email, 'a@example.com');
  assert.equal(profile.orders.length, 1);
  await assert.rejects(() => access.getUser('a@example.com', 'bad-cookie'), /Invalid or expired cookie/);
});

test('checkedout moves cart products into pending orders and clears the cart', async () => {
  const service = new FakeService();
  const access = createMariaDbAccess(service, { randomBytes: () => 'cookie-1', randomUUID: () => 'order-1' });

  const { cookie } = await access.addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' });
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'Plushie', price: 100, readyToShip: true, description: 'Plushie', thumbnailImage: 'photo', colorVariations: ['red'] });
  await service.updateUser('a@example.com', { cart: [{ productId: 'p1', quantity: 2, colorVariation: 'red' }] });

  const orders = await checkedout('a@example.com', cookie, 200, service, { randomUUID: () => 'order-1' });

  assert.equal(orders.length, 1);
  assert.equal(orders[0].status, 'pending');
  assert.equal(orders[0].details.colorVariation, 'red');
  assert.deepEqual((await service.findUserByEmail('a@example.com')).cart, []);
});

test('admin product writes require an admin cookie and generate a product id', async () => {
  const service = new FakeService();
  const access = createMariaDbAccess(service, { randomBytes: () => 'admin-cookie', randomUUID: () => 'product-1' });

  await service.insertAdmin({ email: 'admin@example.com', name: 'Admin', passwordHash: 'hash', salt: 'salt' });
  await newCookie('admin@example.com', undefined, 'admin', service, { randomBytes: () => 'admin-cookie' });

  const product = await addProduct('admin-cookie', { type: 'pattern', title: 'Pattern PDF', price: 500, description: 'Pattern PDF', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/a.pdf' }, service, { randomUUID: () => 'product-1' });

  assert.equal(product.id, 'product-1');
  await assert.rejects(() => access.addProduct('bad-cookie', { type: 'pattern', title: 'Pattern PDF', price: 500, description: 'Pattern PDF', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/a.pdf' }), /Admin access required/);
});

test('loginUser creates a client cookie only for the correct password', async () => {
  const service = new FakeService();
  await addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' }, service, { randomBytes: () => 'register-cookie' });

  const result = await loginUser({ email: 'a@example.com', password: 'correct horse' }, service, { randomBytes: () => 'login-cookie' });

  assert.equal(result.cookie, 'login-cookie');
  assert.equal((await service.findCookie('login-cookie')).kind, 'client');
  await assert.rejects(() => loginUser({ email: 'a@example.com', password: 'wrong' }, service), /Invalid user credentials/);
});

test('guest cart creates session_cookie and merges repeated product/color entries', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'Plushie', price: 100, readyToShip: true, description: 'Plushie', thumbnailImage: 'photo', colorVariations: ['red'] });

  const first = await addCartItem({ productId: 'p1', quantity: 1, colorVariation: 'red' }, {}, service, { randomBytes: () => 'session-1' });
  const second = await addCartItem({ productId: 'p1', quantity: 2, colorVariation: 'red' }, { sessionCookie: first.cookie }, service);

  assert.equal(first.cookieName, 'session_cookie');
  assert.equal(second.cookie, 'session-1');
  assert.equal(second.cart[0].quantity, 3);
  assert.deepEqual((await service.findGuestByCookie('session-1')).cart, second.cart);
});

test('client cart uses client_cookie instead of a guest session', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'pattern-1', type: 'pattern', title: 'Pattern', price: 500, description: 'Pattern', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/p.pdf' });
  await addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' }, service, { randomBytes: () => 'client-1' });

  const added = await addCartItem({ productId: 'pattern-1', quantity: 1 }, { clientCookie: 'client-1', sessionCookie: 'session-ignored' }, service);
  const userAfterAdd = await service.findUserByEmail('a@example.com');
  const removed = await removeCartItem('pattern-1', { clientCookie: 'client-1' }, service);

  assert.equal(added.cookieName, 'client_cookie');
  assert.equal(added.cookie, 'client-1');
  assert.equal(userAfterAdd.cart.length, 1);
  assert.deepEqual(removed.cart, []);
  assert.equal((await service.findUserByEmail('a@example.com')).cart.length, 0);
});

test('listShopProducts filters unavailable products and paginates by afterId', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'One', price: 100, readyToShip: true, description: 'One', thumbnailImage: 'photo', colorVariations: ['red'] });
  await service.insertProduct({ id: 'p2', type: 'plushie', title: 'Two', price: 100, readyToShip: true, description: 'Two', thumbnailImage: 'photo', colorVariations: ['blue'] });
  await service.insertProduct({ id: 'hidden', type: 'plushie', title: 'Hidden', price: 100, readyToShip: true, description: 'Hidden', thumbnailImage: 'photo', colorVariations: [], available: false });
  await service.insertProduct({ id: 'pattern-1', type: 'pattern', title: 'Pattern', price: 500, description: 'Pattern', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/p.pdf' });

  const products = await listShopProducts('plushie', 1, 'p1', service);

  assert.deepEqual(products.map((product) => product.id), ['p2']);
});
