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


test('pattern download signatures are generated against the browser-facing endpoint', async () => {
  const service = new MinIoBucketService({
    endpoint: 'http://bucket:9000',
    publicEndpoint: 'http://localhost:9000',
    accessKey: 'key',
    secretKey: 'secret',
    publicBucket: 'public-assets',
    privateBucket: 'private-patterns',
  });
  const signedHosts = [];
  service.client = { presignedGetObject: async () => { throw new Error('internal client should not sign browser download urls'); } };
  service.signingClient = { presignedGetObject: async (bucket, key, expires) => { signedHosts.push(['localhost', bucket, key, expires]); return `http://localhost:9000/${bucket}/${key}?X-Amz-Signature=host-bound-to-localhost`; } };

  const result = await service.signPatternPdf('pdfs/patterns/pattern.pdf', 300);

  assert.equal(result.url, 'http://localhost:9000/private-patterns/pdfs/patterns/pattern.pdf?X-Amz-Signature=host-bound-to-localhost');
  assert.deepEqual(signedHosts, [['localhost', 'private-patterns', 'pdfs/patterns/pattern.pdf', 300]]);
});
