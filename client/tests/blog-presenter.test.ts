import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'

import { BlogArticleList } from '../src/components/blog/BlogArticleList'
import { BlogArticleReader } from '../src/components/blog/BlogArticleReader'
import { BlogPresenter, type BlogViewModel } from '../src/presenters/BlogPresenter'
import { FetchClientApiService } from '../src/service/ClientApiService'
import type { BlogArticle } from '../src/service/ClientTypes'

const articles: BlogArticle[] = [
  { articleId: 'a1', title: 'Launch', slug: 'launch', excerpt: 'Hello', published: true, collectionTags: ['tutorials'], createdAt: '2026-07-01T00:00:00.000Z', blocks: [{ type: 'paragraph', text: 'Welcome readers.' }] },
]

test('blog presenter loads articles and selects the first article', async () => {
  const updates: BlogViewModel[] = []
  const presenter = new BlogPresenter({ listBlogArticles: async () => articles, listBlogCollections: async () => [{ tag: 'kaylies-creations-updates', label: 'Kaylies Creations Updates' }, { tag: 'tutorials', label: 'Tutorials' }] }, { renderBlog: (model) => updates.push(model) })

  await presenter.load()
  presenter.selectArticle('launch')

  assert.equal(updates[1].articles[0].title, 'Launch')
  assert.equal(updates[1].collections.some((collection) => collection.tag === 'tutorials'), true)
  assert.equal(updates[1].selectedSlug, undefined)
  assert.equal(updates.at(-1)?.selectedSlug, 'launch')
})

test('blog components are importable React boundaries', () => {
  assert.equal(createElement(BlogArticleList, { articles, selectedSlug: 'launch', onSelect: () => {} }).type, BlogArticleList)
  assert.equal(createElement(BlogArticleReader, { article: articles[0] }).type, BlogArticleReader)
})

test('client API service loads published blog articles from the backend endpoint', async () => {
  const calls: string[] = []
  const fetcher: typeof fetch = async (input) => {
    calls.push(String(input))
    return new Response(JSON.stringify(String(input).endsWith('/collections') ? { collections: [{ tag: 'tutorials', label: 'Tutorials' }] } : { articles }), { headers: { 'content-type': 'application/json' } })
  }
  const service = new FetchClientApiService('/api', fetcher)

  const loaded = await service.listBlogArticles()

  assert.deepEqual(calls, ['/api/blog/articles'])
  assert.equal(loaded[0].slug, 'launch')

  const collections = await service.listBlogCollections()
  assert.equal(collections[0].tag, 'tutorials')
  assert.deepEqual(calls, ['/api/blog/articles', '/api/blog/collections'])
})
