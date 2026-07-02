import assert from 'node:assert/strict'
import test from 'node:test'

import { AdminDashboardPresenter } from '../src/presenter/AdminDashboardPresenter.ts'
import type { AdminDashboardView, UploadedAsset } from '../src/presenter/AdminDashboardPresenter.ts'
import type { AdminApiService, ApiEndpointDoc, BlogArticleRecord, MarketEventRecord, OrderRecord, ProductRecord, ServiceHealthReport } from '../src/service/AdminApiService.ts'

class FakeView implements AdminDashboardView {
  busy = false
  status = ''
  error: string | null = null
  adminName: string | null = null
  authenticated = false
  backendStatus = ''
  apiEndpoints: ApiEndpointDoc[] = []
  orders: OrderRecord[] = []
  products: ProductRecord[] = []
  articles: BlogArticleRecord[] = []
  marketEvents: MarketEventRecord[] = []
  serviceHealth: ServiceHealthReport | null = null
  uploadedAssets: UploadedAsset[] = []

  setBusy(value: boolean): void { this.busy = value }
  setStatus(value: string): void { this.status = value }
  setError(value: string | null): void { this.error = value }
  setAdminName(value: string | null): void { this.adminName = value }
  setAuthenticated(value: boolean): void { this.authenticated = value }
  setBackendStatus(value: string): void { this.backendStatus = value }
  setApiEndpoints(value: ApiEndpointDoc[]): void { this.apiEndpoints = value }
  setOrders(value: OrderRecord[]): void { this.orders = value }
  setProducts(value: ProductRecord[]): void { this.products = value }
  setBlogArticles(value: BlogArticleRecord[]): void { this.articles = value }
  setMarketEvents(value: MarketEventRecord[]): void { this.marketEvents = value }
  setServiceHealth(value: ServiceHealthReport): void { this.serviceHealth = value }
  addCreatedProduct(value: ProductRecord): void { this.products = [value, ...this.products] }
  addUploadedAsset(value: UploadedAsset): void { this.uploadedAssets = [value, ...this.uploadedAssets] }
}

function createService(): AdminApiService {
  return {
    checkHealth: async () => ({ status: 'ok', timestamp: 'now' }),
    loadApiDocs: async () => ({ title: 'Docs', version: 1, basePath: '/api', endpoints: [] }),
    login: async () => ({ admin: { email: 'admin@example.com', name: 'Admin' }, cookie: 'cookie' }),
    listOrders: async () => [{ orderId: 'o1', productId: 'p1', clientEmail: 'a@example.com', details: {}, clientInstructions: '', chargedAmount: 25, status: 'pending' }],
    markOrderShipped: async (orderId) => ({ orderId, productId: 'p1', clientEmail: 'a@example.com', details: {}, clientInstructions: '', chargedAmount: 25, status: 'fulfilled' }),
    listProducts: async () => [],
    createProduct: async (input) => ({ id: 'p1', ...input }),
    updateProduct: async (productId, input) => ({ id: productId, type: 'plushie', price: 25, description: 'Updated', thumbnailImage: 'image', available: true, readyToShip: true, colorVariations: [], ...input }),
    deleteProduct: async () => {},
    uploadPhoto: async () => ({ bucket: 'public-assets', key: 'photos/product/bear.png', publicUrl: 'http://bucket/bear.png' }),
    deletePhoto: async () => {},
    uploadPatternPdf: async () => ({ bucket: 'private-patterns', key: 'pdfs/patterns/pattern.pdf' }),
    deletePatternPdf: async () => {},
    listBlogArticles: async () => [],
    createBlogArticle: async (input) => ({ articleId: 'blog-1', createdAt: 'now', updatedAt: 'now', ...input, published: input.published ?? false }),
    updateBlogArticle: async (articleId, input) => ({ articleId, title: 'T', slug: 't', excerpt: 'E', blocks: [], published: false, ...input }),
    deleteBlogArticle: async () => {},
    listMarketEvents: async () => [],
    createMarketEvent: async (input) => ({ id: 'market-1', ...input }),
    updateMarketEvent: async (eventId, input) => ({ id: eventId, title: 'Market', location: 'Town Square', startsAt: '2026-07-04T10:00:00.000Z', ...input }),
    deleteMarketEvent: async () => {},
    loadServiceHealth: async () => ({ status: 'ok', checkedAt: 'now', services: [{ name: 'database', status: 'ok' }] }),
  }
}

test('login gates the dashboard until a successful admin login', async () => {
  const presenter = new AdminDashboardPresenter(createService())
  const view = new FakeView()
  presenter.attach(view)

  assert.equal(view.authenticated, false)
  await presenter.login({ email: 'admin@example.com', password: 'secret' })

  assert.equal(view.authenticated, true)
  assert.equal(view.adminName, 'Admin')
})

test('product image upload returns a bucket url that can populate the listing thumbnail', async () => {
  const presenter = new AdminDashboardPresenter(createService())
  const view = new FakeView()
  presenter.attach(view)

  const url = await presenter.uploadProductImage(new File(['image'], 'bear.png', { type: 'image/png' }))

  assert.equal(url, 'http://bucket/bear.png')
  assert.equal(view.uploadedAssets[0].url, 'http://bucket/bear.png')
})


test('create product preserves title and per-color image urls', async () => {
  let created: ProductRecord | null = null
  const service = createService()
  service.createProduct = async (input) => {
    created = { id: 'p1', ...input }
    return created
  }
  const presenter = new AdminDashboardPresenter(service)
  const view = new FakeView()
  presenter.attach(view)

  await presenter.createProduct({
    type: 'plushie',
    title: 'Custom Bear',
    price: '25',
    salePrice: '20',
    isSaleItem: true,
    description: 'Soft bear',
    thumbnailImage: 'https://bucket/thumb.png',
    available: true,
    readyToShip: true,
    sizes: ['medium'],
    tags: 'featured, market',
    inventoryCount: '3',
    colorVariations: [
      { name: 'brown', imageUrl: 'https://bucket/brown.png' },
      { name: 'cream' },
    ],
    pdfKey: '',
  })

  assert.equal(created?.title, 'Custom Bear')
  assert.equal(created?.salePrice, 20)
  assert.equal(created?.isSaleItem, true)
  assert.deepEqual(created?.sizes, ['medium'])
  assert.deepEqual(created?.tags, ['featured', 'market'])
  assert.equal(created?.inventoryCount, 3)
  assert.deepEqual(created?.colorVariations, [
    { name: 'brown', imageUrl: 'https://bucket/brown.png' },
    { name: 'cream' },
  ])
})

test('orders and service health workflows update category state', async () => {
  const presenter = new AdminDashboardPresenter(createService())
  const view = new FakeView()
  presenter.attach(view)

  await presenter.loadOrders()
  await presenter.markOrderShipped('o1')
  await presenter.loadServiceHealth()

  assert.equal(view.orders[0].status, 'fulfilled')
  assert.equal(view.serviceHealth?.services[0].name, 'database')
})

test('market date workflows validate and refresh events', async () => {
  const presenter = new AdminDashboardPresenter(createService())
  const view = new FakeView()
  presenter.attach(view)

  await presenter.createMarketEvent({ title: 'Saturday Market', location: 'Town Square', startsAt: '2026-07-04T10:00:00.000Z' })
  await presenter.updateMarketEvent('market-1', { location: 'City Hall' })
  await presenter.deleteMarketEvent('market-1')

  assert.equal(view.status, 'Market date deleted.')
  await presenter.createMarketEvent({ title: '', location: 'Town Square', startsAt: '2026-07-04T10:00:00.000Z' })
  assert.equal(view.error, 'title is required.')
})
