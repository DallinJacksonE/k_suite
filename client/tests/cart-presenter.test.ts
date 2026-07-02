import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'

import { CartItemRow } from '../src/components/cart/CartItemRow'
import { CartSummary } from '../src/components/cart/CartSummary'
import { CartPresenter } from '../src/presenters/CartPresenter'
import { FetchClientApiService } from '../src/service/ClientApiService'
import type { CartSnapshot, CheckoutEstimateResponse } from '../src/service/ClientTypes'

const cart: CartSnapshot = {
  items: [{ itemId: 'p1:red:medium', productId: 'p1', productType: 'plushie', title: 'Bear', thumbnailImage: '/bear.png', quantity: 2, unitPrice: 2000, regularUnitPrice: 2500, salePrice: 2000, lineTotal: 4000, selectedColor: 'red', selectedSize: 'medium', clientInstructions: '' }],
  subtotal: 4000,
  containsPatterns: false,
  guestCheckoutAllowed: true,
}

const estimate: CheckoutEstimateResponse = { subtotal: 4000, shipping: 800, tax: 330, discount: 0, grandTotal: 5130, currency: 'USD' }

test('cart presenter loads cart, updates quantities, and estimates checkout totals', async () => {
  const models: unknown[] = []
  const presenter = new CartPresenter({
    getCart: async () => cart,
    updateCartItem: async (_itemId, input) => ({ ...cart, items: [{ ...cart.items[0], quantity: input.quantity ?? 2, lineTotal: (input.quantity ?? 2) * 2000 }], subtotal: (input.quantity ?? 2) * 2000 }),
    estimateCheckout: async () => estimate,
  })

  presenter.attach({ setCart: (model) => models.push(model), setBusy: () => {}, setError: () => {} })
  await presenter.loadCart()
  await presenter.updateQuantity('p1:red:medium', 3)
  await presenter.estimate({ shippingAddress: { country: 'US', state: 'CA', postalCode: '90210' } })

  assert.equal((models[0] as CartSnapshot).subtotal, 4000)
  assert.equal((models[1] as CartSnapshot).subtotal, 6000)
  assert.equal((models[2] as { estimate: CheckoutEstimateResponse }).estimate.grandTotal, 5130)
})

test('cart components are importable React boundaries', () => {
  assert.equal(createElement(CartItemRow, { item: cart.items[0], onQuantityChange: async () => {} }).type, CartItemRow)
  assert.equal(createElement(CartSummary, { cart, estimate, onEstimate: async () => {} }).type, CartSummary)
})

test('client API service reads cart, patches items, and estimates checkout', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetcher: typeof fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init })
    if (String(input).endsWith('/user/csrf')) return jsonResponse({ token: 'csrf-1', headerName: 'x-csrf-token' })
    if (String(input).endsWith('/shop/cart')) return jsonResponse(cart)
    if (String(input).includes('/shop/cart/items/')) return jsonResponse(cart)
    if (String(input).endsWith('/shop/checkout/estimate')) return jsonResponse(estimate)
    throw new Error(`unexpected request ${String(input)}`)
  }
  const service = new FetchClientApiService('/api', fetcher)

  await service.getCart()
  await service.updateCartItem('p1:red:medium', { quantity: 3 })
  await service.estimateCheckout({ shippingAddress: { country: 'US', state: 'CA' } })

  assert.equal(calls[0].url, '/api/shop/cart')
  assert.equal(calls[2].init.method, 'PATCH')
  assert.equal(new Headers(calls[2].init.headers).get('x-csrf-token'), 'csrf-1')
  assert.equal(calls[3].url, '/api/shop/checkout/estimate')
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}
