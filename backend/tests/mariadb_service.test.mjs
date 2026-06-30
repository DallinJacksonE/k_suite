import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MariaDbService,
  createMariaDbService,
} from '../dist/db/mariadb_service.js';

class FakePool {
  constructor() {
    this.queries = [];
    this.rows = [];
    this.ended = false;
  }

  async query(sql, params = []) {
    this.queries.push({ sql, params });
    return this.rows.shift() ?? [];
  }

  async end() {
    this.ended = true;
  }
}

test('initialize creates all application tables idempotently', async () => {
  const pool = new FakePool();
  const service = new MariaDbService(pool);

  await service.initialize();

  const sql = pool.queries.map((query) => query.sql).join('\n');
  for (const tableName of ['admins', 'users', 'guests', 'cookies', 'products', 'orders']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}`));
  }
  assert.match(sql, /thumbnail_image/);
  assert.match(sql, /kind ENUM\('session', 'client', 'admin'\)/);
  assert.match(sql, /last_seen_at TIMESTAMP/);
  assert.match(sql, /expires_at TIMESTAMP/);
  assert.match(sql, /ALTER TABLE cookies ADD COLUMN IF NOT EXISTS last_seen_at/);
  assert.match(sql, /ALTER TABLE guests ADD COLUMN IF NOT EXISTS expires_at/);
  assert.match(sql, /sale_price DECIMAL\(10,2\) NULL/);
  assert.match(sql, /is_sale_item BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(sql, /sizes JSON NULL/);
  assert.match(sql, /tags JSON NULL/);
  assert.match(sql, /inventory_count INT NULL/);
  assert.match(sql, /idempotency_key VARCHAR\(255\) NULL UNIQUE/);
  assert.match(sql, /'shipped'/);
  assert.match(sql, /ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price/);
  assert.match(sql, /ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_count/);
  assert.match(sql, /ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key/);
});

test('createMariaDbService reads compose-compatible environment defaults', () => {
  const env = { MARIADB_HOST: 'mariadb', MARIADB_PORT: '3307', MARIADB_DATABASE: 'k_suite', MARIADB_USER: 'k_suite', MARIADB_PASSWORD: 'secret' };
  const service = createMariaDbService(env, { createPool: (config) => ({ config, query: async () => [], end: async () => {} }) });

  assert.equal(service.pool.config.host, 'mariadb');
  assert.equal(service.pool.config.port, 3307);
  assert.equal(service.pool.config.database, 'k_suite');
  assert.equal(service.pool.config.user, 'k_suite');
  assert.equal(service.pool.config.password, 'secret');
});

test('users, cookies, products, and orders use parameterized SQL accessors', async () => {
  const pool = new FakePool();
  const service = new MariaDbService(pool);

  await service.insertUser({ email: 'a@example.com', name: 'Ada', passwordHash: 'hash', salt: 'salt' });
  await service.upsertCookie('a@example.com', 'cookie-1');
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'Red Bear', price: 1250, salePrice: 999, isSaleItem: true, readyToShip: true, description: 'Red plushie', thumbnailImage: 'photos/product/red.png', colorVariations: [{ name: 'red', imageUrl: 'https://bucket/red.png' }], sizes: ['medium'], tags: ['featured'], inventoryCount: 4 });
  await service.insertOrder({ orderId: 'o1', idempotencyKey: 'key-1', productId: 'p1', clientEmail: 'a@example.com', details: { color: 'red' }, clientInstructions: 'gift wrap', chargedAmount: 1250, status: 'pending' });

  assert.deepEqual(pool.queries.at(-4).params.slice(0, 4), ['a@example.com', 'Ada', 'hash', 'salt']);
  assert.deepEqual(pool.queries.at(-3).params.slice(0, 3), ['a@example.com', 'cookie-1', 'client']);
  assert.deepEqual(pool.queries.at(-2).params.slice(0, 9), ['p1', 'plushie', 'Red Bear', 1250, 999, true, 'Red plushie', 'photos/product/red.png', true]);
  assert.equal(pool.queries.at(-2).params[4], 999);
  assert.equal(pool.queries.at(-2).params[5], true);
  assert.equal(pool.queries.at(-2).params[10], JSON.stringify([{ name: 'red', imageUrl: 'https://bucket/red.png' }]));
  assert.equal(pool.queries.at(-2).params[12], JSON.stringify(['medium']));
  assert.equal(pool.queries.at(-2).params[13], JSON.stringify(['featured']));
  assert.equal(pool.queries.at(-2).params[14], 4);
  assert.deepEqual(pool.queries.at(-1).params.slice(0, 8), ['o1', 'key-1', 'p1', 'a@example.com', JSON.stringify({ color: 'red' }), 'gift wrap', 1250, 'pending']);
});

test('product updates persist sale, size, tags, and inventory metadata', async () => {
  const pool = new FakePool();
  const service = new MariaDbService(pool);
  pool.rows.push([], [{ product_id: 'p1', product_type: 'plushie', title: 'Sale Bear', price: 1250, sale_price: 999, is_sale_item: 1, description: 'Updated', thumbnail_image: 'photo', available: 1, ready_to_ship: 1, color_variations: JSON.stringify([{ name: 'blue' }]), sizes: JSON.stringify(['small']), tags: JSON.stringify(['sale']), inventory_count: 2 }]);

  await service.updateProduct('p1', { salePrice: 999, isSaleItem: true, sizes: ['small'], tags: ['sale'], inventoryCount: 2 });

  assert.match(pool.queries.at(-2).sql, /sale_price = \?/);
  assert.match(pool.queries.at(-2).sql, /is_sale_item = \?/);
  assert.match(pool.queries.at(-2).sql, /sizes = \?/);
  assert.match(pool.queries.at(-2).sql, /tags = \?/);
  assert.match(pool.queries.at(-2).sql, /inventory_count = \?/);
  assert.deepEqual(pool.queries.at(-2).params.slice(0, 5), [999, true, JSON.stringify(['small']), JSON.stringify(['sale']), 2]);
});

test('cookie and guest expiry accessors touch and delete expired records', async () => {
  const pool = new FakePool();
  const service = new MariaDbService(pool);
  const expiresAt = new Date('2026-06-30T12:00:00.000Z');

  await service.touchCookie('cookie-1', expiresAt);
  await service.deleteExpiredCookies(expiresAt);
  await service.touchGuest('guest-1', expiresAt);
  await service.deleteExpiredGuests(expiresAt);

  assert.deepEqual(pool.queries.at(-4).params, [expiresAt, 'cookie-1']);
  assert.match(pool.queries.at(-4).sql, /UPDATE cookies SET last_seen_at = CURRENT_TIMESTAMP, expires_at = \?/);
  assert.deepEqual(pool.queries.at(-3).params, [expiresAt]);
  assert.match(pool.queries.at(-3).sql, /DELETE FROM cookies WHERE expires_at <= \?/);
  assert.deepEqual(pool.queries.at(-2).params, [expiresAt, 'guest-1']);
  assert.match(pool.queries.at(-2).sql, /UPDATE guests SET last_seen_at = CURRENT_TIMESTAMP, expires_at = \?/);
  assert.deepEqual(pool.queries.at(-1).params, [expiresAt]);
  assert.match(pool.queries.at(-1).sql, /DELETE FROM guests WHERE expires_at <= \?/);
});
