import assert from 'node:assert/strict';
import test from 'node:test';

import { MinIoBucketService, createMinIoBucketService } from '../dist/db/minIo.js';

test('bucket public links use public endpoint instead of internal compose hostname', () => {
  const service = createMinIoBucketService({
    MINIO_ENDPOINT: 'http://bucket:9000',
    MINIO_PUBLIC_ENDPOINT: 'http://localhost:9000',
    MINIO_ACCESS_KEY: 'key',
    MINIO_SECRET_KEY: 'secret',
    MINIO_PUBLIC_BUCKET: 'public-assets',
    MINIO_PRIVATE_BUCKET: 'private-patterns',
  });

  assert.equal(service.publicUrl('photos/product/bear.png'), 'http://localhost:9000/public-assets/photos/product/bear.png');
});

test('bucket public links default to localhost for browser-accessible urls', () => {
  const service = new MinIoBucketService({
    endpoint: 'http://bucket:9000',
    accessKey: 'key',
    secretKey: 'secret',
    publicBucket: 'public-assets',
    privateBucket: 'private-patterns',
  });

  assert.equal(service.publicUrl('photos/blog/post.png'), 'http://localhost:9000/public-assets/photos/blog/post.png');
});
