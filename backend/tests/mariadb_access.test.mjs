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
  createMarketEvent,
  updateMarketEvent,
  deleteMarketEvent,
  listAvailableProductFilterOptions,
  listAvailableProductColors,
  listAvailableProductSizes,
  listAdminMarketEvents,
  listPublishedBlogArticles,
  listShopProducts,
  addCartItem,
  removeCartItem,
  getCart,
  updateCartItem,
  estimateCheckout,
  checkout,
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
    this.purchasedPatterns = [];
    this.blogCollections = new Map([['kaylies-creations-updates', { tag: 'kaylies-creations-updates', label: 'Kaylies Creations Updates' }], ['tutorials', { tag: 'tutorials', label: 'Tutorials' }]]);
    this.blogArticles = [];
    this.marketEvents = new Map();
  }

  async findUserByEmail(email) { return this.users.get(email) ?? null; }
  async insertUser(user) { this.users.set(user.email, { ...user, cart: user.cart ?? [], pdfKeys: user.pdfKeys ?? [] }); return this.users.get(user.email); }
  async updateUser(email, patch) { this.users.set(email, { ...this.users.get(email), ...patch }); return this.users.get(email); }
  async deleteUser(email) { this.users.delete(email); }
  async insertAdmin(admin) { this.admins.set(admin.email, admin); return admin; }
  async findAdminByEmail(email) { return this.admins.get(email) ?? null; }
  async upsertCookie(email, cookie, kind = 'client', expiresAt = new Date(Date.now() + 7_200_000)) { this.cookies.set(cookie, { email, cookie, kind, lastSeenAt: new Date(), expiresAt }); }
  async findCookie(cookie) { return this.cookies.get(cookie) ?? null; }
  async deleteCookie(cookie) { this.cookies.delete(cookie); }
  async touchCookie(cookie, expiresAt) { const record = this.cookies.get(cookie); if (record) this.cookies.set(cookie, { ...record, lastSeenAt: new Date(), expiresAt }); }
  async deleteExpiredCookies(now) { for (const [cookie, record] of this.cookies) if (record.expiresAt <= now) this.cookies.delete(cookie); }
  async insertProduct(product) { this.products.set(product.id, { ...product, available: product.available ?? true }); return this.products.get(product.id); }
  async updateProduct(productId, patch) { this.products.set(productId, { ...this.products.get(productId), ...patch }); return this.products.get(productId); }
  async findProductById(productId) { return this.products.get(productId) ?? null; }
  async insertOrder(order) { this.orders.push(order); return order; }
  async findOrderByIdempotencyKey(idempotencyKey) { return this.orders.find((order) => order.idempotencyKey === idempotencyKey) ?? null; }
  async insertPurchasedPattern(pattern) { const record = { ...pattern, purchasedAt: new Date() }; this.purchasedPatterns.push(record); return record; }
  async listPurchasedPatternsForUser(email) { return this.purchasedPatterns.filter((pattern) => pattern.userEmail === email); }
  async findPurchasedPatternForUser(email, productId) { return this.purchasedPatterns.find((pattern) => pattern.userEmail === email && pattern.productId === productId) ?? null; }
  async listOrdersForUser(email) { return this.orders.filter((order) => order.clientEmail === email); }
  async listOrders() { return this.orders; }
  async initialize() {}
  async close() {}
  async upsertGuestCart(guestCookie, cart, expiresAt = new Date(Date.now() + 7_200_000)) { const guest = { guestCookie, cart, lastSeenAt: new Date(), expiresAt }; this.guests.set(guestCookie, guest); return guest; }
  async findGuestByCookie(guestCookie) { return this.guests.get(guestCookie) ?? null; }
  async deleteGuest(guestCookie) { this.guests.delete(guestCookie); }
  async touchGuest(guestCookie, expiresAt) { const record = this.guests.get(guestCookie); if (record) this.guests.set(guestCookie, { ...record, lastSeenAt: new Date(), expiresAt }); }
  async deleteExpiredGuests(now) { for (const [guestCookie, record] of this.guests) if (record.expiresAt <= now) this.guests.delete(guestCookie); }
  async removeProduct(productId) { await this.updateProduct(productId, { available: false }); }
  async listProducts(productType, includeUnavailable = false) { return [...this.products.values()].filter((product) => (!productType || product.type === productType) && (includeUnavailable || product.available)); }
  async listBlogCollections() { return [...this.blogCollections.values()]; }
  async insertBlogCollection(input) { const record = { ...input }; this.blogCollections.set(record.tag, record); return record; }
  async updateBlogCollection(tag, patch) { const current = this.blogCollections.get(tag); const next = { ...current, ...patch }; if (patch.tag && patch.tag !== tag) this.blogCollections.delete(tag); this.blogCollections.set(next.tag, next); return next; }
  async deleteBlogCollection(tag) { this.blogCollections.delete(tag); }
  async listBlogArticles() { return this.blogArticles.map((article) => ({ ...article, collectionTags: article.collectionTags?.length ? article.collectionTags : ['kaylies-creations-updates'] })); }
  async insertBlogArticle(input) { const article = { ...input, collectionTags: input.collectionTags?.length ? input.collectionTags : ['kaylies-creations-updates'] }; this.blogArticles.push(article); return article; }
  async updateBlogArticle(articleId, patch) { const index = this.blogArticles.findIndex((article) => article.articleId === articleId); this.blogArticles[index] = { ...this.blogArticles[index], ...patch, collectionTags: patch.collectionTags ?? this.blogArticles[index].collectionTags ?? ['kaylies-creations-updates'] }; return this.blogArticles[index]; }
  async deleteBlogArticle(articleId) { this.blogArticles = this.blogArticles.filter((article) => article.articleId !== articleId); }
  async listMarketEvents() { return [...this.marketEvents.values()]; }
  async insertMarketEvent(input) { this.marketEvents.set(input.id, input); return input; }
  async updateMarketEvent(eventId, patch) { const event = { ...this.marketEvents.get(eventId), ...patch }; this.marketEvents.set(eventId, event); return event; }
  async deleteMarketEvent(eventId) { this.marketEvents.delete(eventId); }
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

test('authenticated activity rejects expired cookies and refreshes active cookies', async () => {
  const service = new FakeService();
  const { cookie } = await addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' }, service, { randomBytes: () => 'cookie-1' });
  service.cookies.get(cookie).expiresAt = new Date(Date.now() - 1_000);

  await assert.rejects(() => getUser('a@example.com', cookie, service), /Invalid or expired cookie/);

  const fresh = await loginUser({ email: 'a@example.com', password: 'correct horse' }, service, { randomBytes: () => 'cookie-2' });
  const before = service.cookies.get(fresh.cookie).expiresAt.getTime();
  await getUser('a@example.com', fresh.cookie, service);

  assert.ok(service.cookies.get(fresh.cookie).expiresAt.getTime() >= before);
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

test('checkout processes cart as paid in test mode, clears cart, and is idempotent', async () => {
  const service = new FakeService();
  const sentEmails = [];
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'Plushie', price: 1000, salePrice: 900, isSaleItem: true, readyToShip: true, description: 'Plushie', thumbnailImage: 'photo', colorVariations: [{ name: 'red' }], inventoryCount: 2 });
  await addCartItem({ productId: 'p1', quantity: 2, colorVariation: 'red', selectedSize: 'medium', clientInstructions: 'gift wrap' }, {}, service, { randomBytes: () => 'guest-1' });

  const result = await checkout(checkoutRequest(), { sessionCookie: 'guest-1' }, service, { randomUUID: () => 'order-1', emailService: { send: async (message) => sentEmails.push(message) } });
  const duplicate = await checkout(checkoutRequest(), { sessionCookie: 'guest-1' }, service, { randomUUID: () => 'order-2' });

  assert.equal(result.orderId, 'order-1');
  assert.equal(result.status, 'paid');
  assert.equal(service.orders[0].details.payment.status, 'paid');
  assert.equal(service.orders[0].details.payment.provider, 'test');
  assert.equal(result.totals.subtotal, 1800);
  assert.equal(service.orders.length, 1);
  assert.equal(service.orders[0].clientEmail, 'ada@example.com');
  assert.equal(service.orders[0].details.lineItems[0].title, 'Plushie');
  assert.equal(service.orders[0].details.lineItems[0].salePrice, 900);
  assert.deepEqual((await service.findGuestByCookie('guest-1')).cart, []);
  assert.equal(duplicate.orderId, 'order-1');
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'ada@example.com');
});

test('checkout grants pattern downloads after test-mode payment succeeds', async () => {
  const service = new FakeService();
  await addUser({ email: 'a@example.com', name: 'Ada', password: 'correct horse' }, service, { randomBytes: () => 'client-1' });
  await service.insertProduct({ id: 'pattern-1', type: 'pattern', title: 'Pattern', price: 500, description: 'Pattern', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/p.pdf' });
  await addCartItem({ productId: 'pattern-1', quantity: 1 }, { clientCookie: 'client-1' }, service);

  const result = await checkout({ ...checkoutRequest(), idempotencyKey: 'pattern-key' }, { clientCookie: 'client-1' }, service, { randomUUID: () => 'pattern-order' });

  assert.equal(result.status, 'paid');
  assert.equal(result.purchasedPatternDownloadsAvailable, true);
  assert.equal(service.orders[0].details.lineItems[0].pdfKey, 'pdfs/patterns/p.pdf');
  assert.equal((await service.listPurchasedPatternsForUser('a@example.com'))[0].pdfKey, 'pdfs/patterns/p.pdf');
  assert.deepEqual((await service.findUserByEmail('a@example.com')).cart, []);
});

test('listPublishedBlogArticles only exposes published articles', async () => {
  const service = new FakeService();
  service.blogArticles.push(
    { articleId: 'published', title: 'Published', slug: 'published', excerpt: 'Visible', blocks: [], collectionTags: ['tutorials'], published: true },
    { articleId: 'draft', title: 'Draft', slug: 'draft', excerpt: 'Hidden', blocks: [], collectionTags: ['tutorials'], published: false },
  );

  const articles = await listPublishedBlogArticles(service);

  assert.deepEqual(articles.map((article) => article.articleId), ['published']);
});

test('admin market events require admin access and support create update delete', async () => {
  const service = new FakeService();
  await service.insertAdmin({ email: 'admin@example.com', name: 'Admin', passwordHash: 'hash', salt: 'salt' });
  await newCookie('admin@example.com', undefined, 'admin', service, { randomBytes: () => 'admin-cookie' });

  const created = await createMarketEvent('admin-cookie', { title: 'Market', location: 'Town Square', address: '123 Market St, Pittsburgh, PA', startsAt: '2026-07-04T10:00:00.000Z' }, service, { randomUUID: () => 'market-1' });
  const listed = await listAdminMarketEvents('admin-cookie', service);
  const updated = await updateMarketEvent('admin-cookie', 'market-1', { address: '456 City Hall Ave' }, service);
  await deleteMarketEvent('admin-cookie', 'market-1', service);

  assert.equal(created.id, 'market-1');
  assert.equal(created.address, '123 Market St, Pittsburgh, PA');
  assert.equal(listed.length, 1);
  assert.equal(updated.address, '456 City Hall Ave');
  assert.equal((await service.listMarketEvents()).length, 0);
  await assert.rejects(() => createMarketEvent('', { title: 'Market', location: 'Town Square', startsAt: '2026-07-04T10:00:00.000Z' }, service), /Admin access required/);
});

test('order status emails are sent for shipped orders', async () => {
  const service = new FakeService();
  const sentEmails = [];
  await service.insertAdmin({ email: 'admin@example.com', name: 'Admin', passwordHash: 'hash', salt: 'salt' });
  await newCookie('admin@example.com', undefined, 'admin', service, { randomBytes: () => 'admin-cookie' });
  await service.insertOrder({ orderId: 'o1', productId: 'p1', clientEmail: 'ada@example.com', details: { totals: { grandTotal: 1000 } }, clientInstructions: '', chargedAmount: 1000, status: 'pending' });
  service.updateOrderStatus = async (orderId, status) => { const order = service.orders.find((item) => item.orderId === orderId); Object.assign(order, { status }); return order; };

  const access = createMariaDbAccess(service, { emailService: { send: async (message) => sentEmails.push(message) } });
  const order = await access.updateOrderStatus('admin-cookie', 'o1', 'shipped');

  assert.equal(order.status, 'shipped');
  assert.equal(sentEmails[0].subject, 'Your K Suite order has shipped');
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
  assert.ok((await service.findGuestByCookie('session-1')).expiresAt instanceof Date);
});

test('guest cart expires independently from authenticated cookies', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'Plushie', price: 100, readyToShip: true, description: 'Plushie', thumbnailImage: 'photo', colorVariations: ['red'] });
  await addCartItem({ productId: 'p1', quantity: 1 }, {}, service, { randomBytes: () => 'session-1' });
  service.guests.get('session-1').expiresAt = new Date(Date.now() - 1_000);

  const next = await addCartItem({ productId: 'p1', quantity: 1 }, { sessionCookie: 'session-1' }, service);

  assert.equal(next.cart[0].productId, 'p1');
  assert.equal(next.cart[0].quantity, 1);
  assert.equal(next.cart[0].clientInstructions, '');
  assert.ok(service.guests.get('session-1').expiresAt > new Date());
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

  const batch = await listShopProducts({ filters: { type: 'plushie' }, batchSize: 1, afterId: 'p1' }, service);

  assert.deepEqual(batch.products.map((product) => product.id), ['p2']);
  assert.equal(batch.hasMore, false);
});

test('listShopProducts applies filters before deterministic sorting and pagination', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'expensive', type: 'plushie', title: 'Expensive Bear', price: 3000, salePrice: 2500, isSaleItem: true, readyToShip: true, description: 'Bear', thumbnailImage: 'photo', colorVariations: [{ name: 'red' }], sizes: ['medium'], tags: ['market'], inventoryCount: 5 });
  await service.insertProduct({ id: 'cheap', type: 'plushie', title: 'Cheap Bear', price: 1000, salePrice: 900, isSaleItem: true, readyToShip: true, description: 'Bear', thumbnailImage: 'photo', colorVariations: [{ name: 'red' }], sizes: ['medium'], tags: ['featured'], inventoryCount: 3 });
  await service.insertProduct({ id: 'pattern', type: 'pattern', title: 'Pattern', price: 2000, description: 'Pattern', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/p.pdf', sizes: ['medium'], tags: ['featured'] });
  await service.insertProduct({ id: 'blue', type: 'plushie', title: 'Blue Bear', price: 500, readyToShip: true, description: 'Bear', thumbnailImage: 'photo', colorVariations: [{ name: 'blue' }], sizes: ['small'], tags: ['featured'], inventoryCount: 3 });

  const batch = await listShopProducts({ filters: { type: 'all', saleOnly: true, color: 'red', size: 'medium' }, sort: 'price', direction: 'asc', batchSize: 1 }, service);

  assert.deepEqual(batch.products.map((product) => product.id), ['cheap']);
  assert.equal(batch.nextCursor, 'cheap');
  assert.equal(batch.hasMore, true);
  assert.deepEqual(batch.appliedFilters, { type: 'all', saleOnly: true, color: 'red', size: 'medium' });
});

test('available product filter options are cached and recalculate on product add', async () => {
  const service = new FakeService();
  await service.insertAdmin({ email: 'admin@example.com', name: 'Admin', passwordHash: 'hash', salt: 'salt' });
  await newCookie('admin@example.com', undefined, 'admin', service, { randomBytes: () => 'admin-cookie' });
  await service.insertProduct({ id: 'available', type: 'plushie', title: 'Available Bear', price: 1000, readyToShip: true, description: 'Bear', thumbnailImage: 'photo', colorVariations: [{ name: 'blue' }], sizes: ['small'] });
  await service.insertProduct({ id: 'hidden', type: 'plushie', title: 'Hidden Bear', price: 1000, readyToShip: true, description: 'Bear', thumbnailImage: 'photo', available: false, colorVariations: [{ name: 'gray' }], sizes: ['large'] });

  assert.deepEqual(await listAvailableProductColors(service), []);

  await addProduct('admin-cookie', { type: 'plushie', title: 'Added Bear', price: 1200, readyToShip: true, description: 'Bear', thumbnailImage: 'photo', colorVariations: [{ name: 'red' }], sizes: ['medium'] }, service, { randomUUID: () => 'added' });

  assert.deepEqual(await listAvailableProductColors(service), ['blue', 'red']);
  assert.deepEqual(await listAvailableProductSizes(service), ['small', 'medium']);
  assert.deepEqual(await listAvailableProductFilterOptions(service), { colors: ['blue', 'red'], sizes: ['small', 'medium'] });
});

test('cart add rejects unavailable inventory and guest pattern purchases', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'sold-out', type: 'plushie', title: 'Sold Out', price: 100, readyToShip: true, description: 'Sold Out', thumbnailImage: 'photo', colorVariations: [{ name: 'red' }], inventoryCount: 0 });
  await service.insertProduct({ id: 'pattern-1', type: 'pattern', title: 'Pattern', price: 500, description: 'Pattern', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/p.pdf' });

  await assert.rejects(() => addCartItem({ productId: 'sold-out', quantity: 1 }, {}, service), /out of stock/i);
  await assert.rejects(() => addCartItem({ productId: 'pattern-1', quantity: 1 }, {}, service), /login required/i);
});

test('cart read and update return product snapshots, preserve variants, and refresh guest expiry', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'Plushie', price: 2500, salePrice: 2000, isSaleItem: true, readyToShip: true, description: 'Plushie', thumbnailImage: 'photo', colorVariations: [{ name: 'red' }, { name: 'blue' }], sizes: ['medium'], inventoryCount: 10 });
  const red = await addCartItem({ productId: 'p1', quantity: 1, colorVariation: 'red', selectedSize: 'medium' }, {}, service, { randomBytes: () => 'guest-1' });
  await addCartItem({ productId: 'p1', quantity: 2, colorVariation: 'blue', selectedSize: 'medium' }, { sessionCookie: red.cookie }, service);

  const beforeTouch = service.guests.get('guest-1').expiresAt.getTime();
  const snapshot = await getCart({ sessionCookie: 'guest-1' }, service);
  const updated = await updateCartItem(snapshot.items[0].itemId, { quantity: 3 }, { sessionCookie: 'guest-1' }, service);

  assert.equal(snapshot.items.length, 2);
  assert.equal(snapshot.items[0].title, 'Plushie');
  assert.equal(snapshot.items[0].unitPrice, 2000);
  assert.equal(snapshot.subtotal, 6000);
  assert.equal(updated.items[0].quantity, 3);
  assert.equal(updated.items[1].quantity, 2);
  assert.ok(service.guests.get('guest-1').expiresAt.getTime() >= beforeTouch);
});

test('checkout estimate blocks guest pattern checkout and applies free shipping threshold', async () => {
  const service = new FakeService();
  await service.insertProduct({ id: 'big', type: 'plushie', title: 'Big Plushie', price: 9000, readyToShip: true, description: 'Big', thumbnailImage: 'photo', colorVariations: [{ name: 'red' }] });
  await service.insertProduct({ id: 'pattern-1', type: 'pattern', title: 'Pattern', price: 1200, description: 'Pattern', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/p.pdf' });
  const guest = await addCartItem({ productId: 'big', quantity: 1 }, {}, service, { randomBytes: () => 'guest-1' });

  const estimate = await estimateCheckout({ shippingAddress: { country: 'US', state: 'CA', postalCode: '90210' } }, { sessionCookie: guest.cookie }, service);

  assert.equal(estimate.subtotal, 9000);
  assert.equal(estimate.shipping, 0);
  assert.equal(estimate.tax, 743);
  assert.equal(estimate.grandTotal, 9743);

  await service.upsertGuestCart('guest-pattern', [{ productId: 'pattern-1', quantity: 1 }]);
  await assert.rejects(() => estimateCheckout({ shippingAddress: { country: 'US', state: 'CA', postalCode: '90210' } }, { sessionCookie: 'guest-pattern' }, service), /log in/i);
});

function checkoutRequest() {
  return {
    idempotencyKey: 'checkout-key-1',
    contact: { email: 'Ada@Example.com', name: 'Ada Lovelace' },
    shippingAddress: { name: 'Ada Lovelace', line1: '1 Main St', city: 'Los Angeles', region: 'CA', postalCode: '90210', country: 'US' },
    billingAddress: { name: 'Ada Lovelace', line1: '1 Main St', city: 'Los Angeles', region: 'CA', postalCode: '90210', country: 'US', sameAsShipping: true },
    paymentStatus: 'pending',
    paymentToken: 'placeholder-token',
  };
}
