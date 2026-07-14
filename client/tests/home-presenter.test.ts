import assert from 'node:assert/strict'
import test from 'node:test'

import { HomePresenter } from '../src/presenters/HomePresenter'
import { FetchClientApiService } from '../src/service/ClientApiService'
import type { HomeViewModel } from '../src/service/ClientTypes'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

test('home presenter loads next market through the service boundary', async () => {
  const viewUpdates: HomeViewModel[] = []
  const presenter = new HomePresenter({
    getNextMarketEvent: async () => ({ id: 'market-1', title: 'Saturday Market', startsAt: '2026-07-04T10:00:00.000Z', locationName: 'Town Square', address: '123 Market St, Pittsburgh, PA' }),
  })

  presenter.attach({ setHome: (model) => viewUpdates.push(model) })
  await presenter.refreshHome()

  assert.equal(viewUpdates[0].nextMarket?.title, 'Saturday Market')
})

test('client API service loads featured products and next market from backend endpoints', async () => {
  const calls: string[] = []
  const fetcher: typeof fetch = async (input) => {
    calls.push(String(input))
    if (String(input).endsWith('/shop/plushies?batchSize=3')) return jsonResponse({ products: [] })
    if (String(input).endsWith('/markets/next')) return jsonResponse({ nextEvent: { id: 'market-1', title: 'Saturday Market', startsAt: '2026-07-04T10:00:00.000Z', location: 'Town Square', address: '123 Market St, Pittsburgh, PA' } })
    throw new Error(`unexpected request ${String(input)}`)
  }
  const service = new FetchClientApiService('/api', fetcher)

  await service.listFeaturedProducts()
  const market = await service.getNextMarketEvent()

  assert.deepEqual(calls, ['/api/shop/plushies?batchSize=3', '/api/markets/next'])
  assert.equal(market?.title, 'Saturday Market')
  assert.equal(market?.address, '123 Market St, Pittsburgh, PA')
})
