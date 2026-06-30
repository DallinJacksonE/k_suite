import type { ReactNode } from 'react'
import { createElement } from 'react'
import assert from 'node:assert/strict'
import test from 'node:test'

import { ClientSessionProvider } from '../src/components/auth/ClientSessionProvider'
import { useClientSession } from '../src/components/auth/useClientSession'
import type { ClientApiService } from '../src/service/ClientApiService'

const fakeService: ClientApiService = {
  checkHealth: async () => ({ status: 'ok', timestamp: 'now' }),
  getSession: async () => ({ status: 'guest' }),
  login: async () => ({ status: 'authenticated', user: { email: 'a@example.com', name: 'Ada', cart: [], pdfKeys: [] } }),
  register: async () => ({ status: 'authenticated', user: { email: 'b@example.com', name: 'Grace', cart: [], pdfKeys: [] } }),
  logout: async () => {},
  loadProfile: async () => ({ user: { email: 'a@example.com', name: 'Ada' }, orders: [], purchasedPatterns: [] }),
  listFeaturedProducts: async () => [],
  getNextMarketEvent: async () => null,
  listShopProducts: async () => ({ products: [], hasMore: false, appliedFilters: { type: 'all' } }),
  addCartItem: async () => ({ cart: [] }),
  getCart: async () => ({ items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }),
  updateCartItem: async () => ({ items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }),
  estimateCheckout: async () => ({ subtotal: 0, shipping: 0, tax: 0, discount: 0, grandTotal: 0, currency: 'USD' }),
}

test('client session provider exports a typed provider and hook', () => {
  const element = createElement(ClientSessionProvider, { service: fakeService, children: 'child' satisfies ReactNode })

  assert.equal(element.type, ClientSessionProvider)
  assert.equal(typeof useClientSession, 'function')
})
