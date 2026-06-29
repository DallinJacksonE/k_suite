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
  await service.insertProduct({ id: 'p1', type: 'plushie', title: 'Red Bear', price: 1250, readyToShip: true, description: 'Red plushie', thumbnailImage: 'photos/product/red.png', colorVariations: [{ name: 'red', imageUrl: 'https://bucket/red.png' }] });
  await service.insertOrder({ orderId: 'o1', productId: 'p1', clientEmail: 'a@example.com', details: { color: 'red' }, clientInstructions: 'gift wrap', chargedAmount: 1250, status: 'pending' });

  assert.deepEqual(pool.queries.at(-4).params.slice(0, 4), ['a@example.com', 'Ada', 'hash', 'salt']);
  assert.deepEqual(pool.queries.at(-3).params, ['a@example.com', 'cookie-1', 'client']);
  assert.deepEqual(pool.queries.at(-2).params.slice(0, 7), ['p1', 'plushie', 'Red Bear', 1250, 'Red plushie', 'photos/product/red.png', true]);
  assert.equal(pool.queries.at(-2).params[8], JSON.stringify([{ name: 'red', imageUrl: 'https://bucket/red.png' }]));
  assert.deepEqual(pool.queries.at(-1).params.slice(0, 7), ['o1', 'p1', 'a@example.com', JSON.stringify({ color: 'red' }), 'gift wrap', 1250, 'pending']);
});
