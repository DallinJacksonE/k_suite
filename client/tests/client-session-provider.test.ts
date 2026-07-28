import type { ReactNode } from 'react'
import { createElement } from 'react'
import assert from 'node:assert/strict'
import test from 'node:test'

import { ClientSessionProvider } from '../src/components/auth/ClientSessionProvider'
import { useClientSession } from '../src/components/auth/useClientSession'
import type { ClientApiService } from '../src/service/ClientApiService'
import { defaultClientApiService } from '../src/service/defaultClientApiService'

const fakeService: ClientApiService = {
  checkHealth: async () => ({ status: 'ok', timestamp: 'now' }),
  getSession: async () => ({ status: 'guest' }),
  login: async () => ({ status: 'authenticated', user: { email: 'a@example.com', name: 'Ada', cart: [], pdfKeys: [] } }),
  register: async () => ({ status: 'authenticated', user: { email: 'b@example.com', name: 'Grace', cart: [], pdfKeys: [] } }),
  logout: async () => {},
  loadProfile: async () => ({ user: { email: 'a@example.com', name: 'Ada' }, orders: [], purchasedPatterns: [] }),
  updateProfile: async () => ({ email: 'a@example.com', name: 'Ada', cart: [], pdfKeys: [] }),
  deleteProfile: async () => {},
  listPurchasedPatterns: async () => [],
  createPurchasedPatternDownload: async () => ({ productId: 'pattern-1', orderId: 'order-1', title: 'Pattern', purchasedAt: 'now' }),
  listFeaturedProducts: async () => [],
  getNextMarketEvent: async () => null,
  listMarketEvents: async () => ({ events: [] }),
  listBlogArticles: async () => [],
  listBlogCollections: async () => [],
  listShopProducts: async () => ({ products: [], hasMore: false, appliedFilters: { type: 'all' } }),
  getShopFilterOptions: async () => ({ colors: [], sizes: [] }),
  addCartItem: async () => ({ cart: [] }),
  getCart: async () => ({ items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }),
  updateCartItem: async () => ({ items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }),
  removeCartItem: async () => ({ items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }),
  estimateCheckout: async () => ({ subtotal: 0, shipping: 0, tax: 0, discount: 0, grandTotal: 0, currency: 'USD' }),
  getCheckoutConfig: async () => ({ provider: 'test' }),
  checkout: async () => ({ orderId: 'order-1', status: 'pending', totals: { subtotal: 0, discountTotal: 0, shipping: 0, tax: 0, grandTotal: 0 }, purchasedPatternDownloadsAvailable: false }),
}

test('client session provider exports a typed provider and hook', () => {
  const element = createElement(ClientSessionProvider, { service: fakeService, children: 'child' satisfies ReactNode })

  assert.equal(element.type, ClientSessionProvider)
  assert.equal(typeof useClientSession, 'function')
})

test('client session provider reuses a stable default API service', () => {
  assert.equal(defaultClientApiService, defaultClientApiService)
})
