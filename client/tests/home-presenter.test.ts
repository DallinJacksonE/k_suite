import assert from 'node:assert/strict'
import test from 'node:test'

import { HomePresenter } from '../src/presenters/HomePresenter'
import { FetchClientApiService } from '../src/service/ClientApiService'
import type { HomeViewModel } from '../src/service/ClientTypes'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

test('home presenter loads featured products and next market through the service boundary', async () => {
  const featured = [{ id: 'p1', type: 'plushie', title: 'Blue Whale', price: 24, isSaleItem: false, description: 'Soft', thumbnailImage: '/whale.jpg', available: true, sizes: [], readyToShip: true, colorVariations: [] }]
  const viewUpdates: HomeViewModel[] = []
  const presenter = new HomePresenter({
    listFeaturedProducts: async () => featured,
    getNextMarketEvent: async () => ({ id: 'market-1', title: 'Saturday Market', startsAt: '2026-07-04T10:00:00.000Z', locationName: 'Town Square' }),
  })

  presenter.attach({ setHome: (model) => viewUpdates.push(model), setBusy: () => {}, setError: () => {} })
  await presenter.refreshHome()

  assert.equal(viewUpdates[0].featuredProducts[0].title, 'Blue Whale')
  assert.equal(viewUpdates[0].nextMarket?.title, 'Saturday Market')
})

test('client API service exposes temporary home data methods behind named service calls', async () => {
  const calls: string[] = []
  const fetcher: typeof fetch = async (input) => {
    calls.push(String(input))
    if (String(input).endsWith('/shop/plushies?batchSize=3')) return jsonResponse({ products: [] })
    throw new Error(`unexpected request ${String(input)}`)
  }
  const service = new FetchClientApiService('/api', fetcher)

  await service.listFeaturedProducts()
  const market = await service.getNextMarketEvent()

  assert.deepEqual(calls, ['/api/shop/plushies?batchSize=3'])
  assert.equal(market?.source, 'temporary-placeholder')
})
