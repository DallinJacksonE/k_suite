import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'

import { ProductCard } from '../src/components/shop/ProductCard'
import { ProductDetailModal } from '../src/components/shop/ProductDetailModal'
import { ShopFilters } from '../src/components/shop/ShopFilters'
import { ShopPresenter } from '../src/presenters/ShopPresenter'
import { FetchClientApiService } from '../src/service/ClientApiService'
import type { ClientSessionState, Product, ShopViewModel } from '../src/service/ClientTypes'

const plushie: Product = {
  id: 'plushie-1',
  type: 'plushie',
  title: 'Blue Bear',
  price: 3000,
  salePrice: 2500,
  isSaleItem: true,
  description: 'Soft bear',
  thumbnailImage: '/bear.png',
  available: true,
  sizes: ['medium'],
  readyToShip: true,
  colorVariations: [{ name: 'blue' }],
}

const pattern: Product = {
  id: 'pattern-1',
  type: 'pattern',
  title: 'Bear Pattern',
  price: 1200,
  isSaleItem: false,
  description: 'PDF pattern',
  thumbnailImage: '/pattern.png',
  available: true,
  sizes: [],
  pdfKey: 'pdfs/patterns/bear.pdf',
}

test('shop presenter loads batches, filters, load more, and gates guest pattern adds', async () => {
  const updates: ShopViewModel[] = []
  const addCalls: unknown[] = []
  const presenter = new ShopPresenter({
    listShopProducts: async (request) => ({ products: request.afterId ? [pattern] : [plushie], nextCursor: request.afterId ? undefined : 'plushie-1', hasMore: !request.afterId, appliedFilters: request.filters ?? { type: 'all' } }),
    addCartItem: async (input) => { addCalls.push(input); return { cart: [input] } },
  }, { status: 'guest' })

  presenter.attach({ setShop: (model) => updates.push(model), setBusy: () => {}, setError: () => {} })
  await presenter.loadInitial()
  await presenter.loadMore()
  await presenter.applyFilters({ type: 'plushie', saleOnly: true })
  presenter.selectProduct(pattern)
  await presenter.addSelectedToCart({ quantity: 1 })

  assert.equal(updates[0].products[0].id, 'plushie-1')
  assert.deepEqual(updates[1].products.map((product) => product.id), ['plushie-1', 'pattern-1'])
  assert.equal(updates.at(-1)?.filters.saleOnly, true)
  assert.equal(addCalls.length, 0)
  assert.match(updates.at(-1)?.notice ?? '', /log in/i)
})

test('shop components are importable React boundaries', () => {
  assert.equal(createElement(ProductCard, { product: plushie, onSelect: () => {} }).type, ProductCard)
  assert.equal(createElement(ProductDetailModal, { product: plushie, session: { status: 'guest' } satisfies ClientSessionState, onClose: () => {}, onAddToCart: async () => {} }).type, ProductDetailModal)
  assert.equal(createElement(ShopFilters, { filters: { type: 'all' }, onApply: () => {} }).type, ShopFilters)
})

test('client API service calls filtered shop batch endpoint and cart mutation endpoint', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetcher: typeof fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init })
    if (String(input).startsWith('/api/shop/products')) return jsonResponse({ products: [plushie], nextCursor: 'plushie-1', hasMore: true, appliedFilters: { type: 'all' } })
    if (String(input).endsWith('/user/csrf')) return jsonResponse({ token: 'csrf-1', headerName: 'x-csrf-token' })
    if (String(input).endsWith('/shop/plushies')) return jsonResponse({ cart: [{ productId: 'plushie-1', quantity: 1 }] })
    throw new Error(`unexpected request ${String(input)}`)
  }
  const service = new FetchClientApiService('/api', fetcher)

  const batch = await service.listShopProducts({ filters: { type: 'all', saleOnly: true, color: 'blue' }, sort: 'price', direction: 'asc', batchSize: 20 })
  await service.addCartItem({ productId: 'plushie-1', productType: 'plushie', quantity: 1 })

  assert.equal(batch.products[0].id, 'plushie-1')
  assert.match(calls[0].url, /\/api\/shop\/products\?/) 
  assert.match(calls[0].url, /saleOnly=true/)
  assert.equal(new Headers(calls[2].init.headers).get('x-csrf-token'), 'csrf-1')
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}
