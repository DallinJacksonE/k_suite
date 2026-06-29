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

test('admin routes login, set admin_cookie, and protect product mutations', async () => {
  const calls = [];
  const access = {
    adminLogin: async (input) => { calls.push(['adminLogin', input]); return { admin: { email: input.email, name: 'Dallin' }, cookie: 'admin-1' }; },
    addProduct: async (cookie, product) => { calls.push(['addProduct', cookie, product]); return { id: 'product-1', available: true, ...product }; },
    editProduct: async (cookie, productId, patch) => { calls.push(['editProduct', cookie, productId, patch]); return { id: productId, type: 'pattern', price: patch.price, description: 'Pattern', thumbnailImage: 'thumb', available: true, pdfKey: 'pdfs/patterns/p.pdf' }; },
    removeProduct: async (cookie, productId) => { calls.push(['removeProduct', cookie, productId]); },
    getOrders: async () => [],
  };
  const bucket = { uploadPhoto: async () => { throw new Error('not used'); }, deletePublicObject: async () => {}, uploadPatternPdf: async () => { throw new Error('not used'); }, deletePatternPdf: async () => {} };
  const app = express().use(express.json()).use('/admin', createAdminRouter({ access, bucket }));
  const server = await listen(app);
  try {
    const login = await request(server, '/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'dallin@djackson.dev', password: 'adminpassword' }) });
    assert.equal(login.response.status, 200);
    assert.match(login.response.headers.get('set-cookie'), /admin_cookie=admin-1/);

    const created = await request(server, '/admin/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ type: 'pattern', title: 'Crochet Pattern', price: 500, description: 'Pattern', thumbnailImage: 'thumb', pdfKey: 'pdfs/patterns/p.pdf' }) });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.product.id, 'product-1');
    assert.equal(calls[1][2].title, 'Crochet Pattern');

    const edited = await request(server, '/admin/products/product-1', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'admin_cookie=admin-1' }, body: JSON.stringify({ price: 750 }) });
    assert.equal(edited.body.product.price, 750);

    const deleted = await request(server, '/admin/products/product-1', { method: 'DELETE', headers: { cookie: 'admin_cookie=admin-1' } });
    assert.equal(deleted.response.status, 204);
    assert.deepEqual(calls.map((call) => call[0]), ['adminLogin', 'addProduct', 'editProduct', 'removeProduct']);
  } finally {
    server.close();
  }
});

test('admin multipart routes upload product/blog photos and pattern PDFs', async () => {
  const access = {
    adminLogin: async () => ({ admin: { email: 'admin@example.com', name: 'Admin' }, cookie: 'admin-1' }),
    addProduct: async () => ({}),
    editProduct: async () => ({}),
    removeProduct: async () => {},
    getOrders: async () => [],
  };
  const uploads = [];
  const bucket = {
    uploadPhoto: async (category, upload) => { uploads.push(['photo', category, upload.originalName, upload.mimeType, upload.buffer.toString()]); return { bucket: 'public-assets', key: `photos/${category}/${upload.originalName}`, publicUrl: `http://bucket/${upload.originalName}` }; },
    deletePublicObject: async (key) => { uploads.push(['deletePhoto', key]); },
    uploadPatternPdf: async (upload) => { uploads.push(['pdf', upload.originalName, upload.mimeType, upload.buffer.toString()]); return { bucket: 'private-patterns', key: `pdfs/patterns/${upload.originalName}` }; },
    deletePatternPdf: async (key) => { uploads.push(['deletePdf', key]); },
  };
  const app = express().use('/admin', createAdminRouter({ access, bucket }));
  const server = await listen(app);
  try {
    const form = new FormData();
    form.set('file', new Blob(['image-bytes'], { type: 'image/png' }), 'bear.png');
    const photo = await request(server, '/admin/photos/product', { method: 'POST', body: form });
    assert.equal(photo.response.status, 201);
    assert.equal(photo.body.bucket, 'public-assets');

    const blogForm = new FormData();
    blogForm.set('file', new Blob(['blog-image'], { type: 'image/jpeg' }), 'blog.jpg');
    const blog = await request(server, '/admin/photos/blog', { method: 'POST', body: blogForm });
    assert.equal(blog.body.key, 'photos/blog/blog.jpg');

    const pdfForm = new FormData();
    pdfForm.set('file', new Blob(['pdf-bytes'], { type: 'application/pdf' }), 'pattern.pdf');
    const pdf = await request(server, '/admin/pdfs/patterns', { method: 'POST', body: pdfForm });
    assert.equal(pdf.body.bucket, 'private-patterns');

    assert.deepEqual(uploads.map((upload) => upload[0]), ['photo', 'photo', 'pdf']);
  } finally {
    server.close();
  }
});
