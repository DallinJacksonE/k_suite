import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';

import { createBlogRouter } from '../dist/routes/blogRoutes.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function request(server, path) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

test('blog route lists published articles without admin auth', async () => {
  const app = express().use('/blog', createBlogRouter({
    access: {
      listPublishedBlogArticles: async () => [
        { articleId: 'a1', title: 'Launch', slug: 'launch', excerpt: 'Published article', published: true, blocks: [{ type: 'paragraph', text: 'Hello readers.' }] },
      ],
    },
  }));
  const server = await listen(app);

  try {
    const result = await request(server, '/blog/articles');

    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, {
      articles: [
        { articleId: 'a1', title: 'Launch', slug: 'launch', excerpt: 'Published article', published: true, blocks: [{ type: 'paragraph', text: 'Hello readers.' }] },
      ],
    });
  } finally {
    server.close();
  }
});
