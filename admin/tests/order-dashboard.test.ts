import assert from 'node:assert/strict'
import * as React from 'react'
import { createElement, isValidElement } from 'react'
import test from 'node:test'

import { OrdersDashboard } from '../src/components/orders/OrdersDashboard'
import type { OrderRecord } from '../src/service/AdminApiService'

Object.assign(globalThis, { React })

test('paid plushie orders appear in fulfillment queue with ordered item details', () => {
  const text = renderText(createElement(OrdersDashboard, { orders: [plushieOrder()], busy: false, onRefresh: () => {}, onMarkShipped: () => {} }))

  assert.match(text, /Pending1/)
  assert.match(text, /Custom Bear/)
  assert.match(text, /Qty 2/)
  assert.match(text, /medium/)
  assert.match(text, /red/)
  assert.match(text, /Shipping label is accurate/)
  assert.match(text, /Color and size are correct and Notes were considered/)
  assert.match(text, /Ship to Ada, 1 Main/)
  assert.match(text, /Mark shipped/)
  assert.match(text, /\$1,810\.00/)
  assert.match(text, /\$1,800\.00/)
})

test('pattern-only paid orders stay out of the shipping queue', () => {
  const text = renderText(createElement(OrdersDashboard, { orders: [patternOrder()], busy: false, onRefresh: () => {}, onMarkShipped: () => {} }))

  assert.match(text, /Pending0/)
  assert.match(text, /History1/)
  assert.doesNotMatch(text, /Shipping label is accurate/)
})

function plushieOrder(): OrderRecord {
  return {
    orderId: 'order-1',
    productId: 'p1',
    clientEmail: 'ada@example.com',
    chargedAmount: 1810,
    status: 'paid',
    clientInstructions: 'gift wrap',
    details: {
      lineItems: [
        { productId: 'p1', productType: 'plushie', title: 'Custom Bear', quantity: 2, unitPrice: 900, selectedColor: 'red', selectedSize: 'medium', clientInstructions: 'gift wrap', lineTotal: 1800 },
      ],
      totals: { subtotal: 1800, discountTotal: 0, shipping: 10, tax: 0, grandTotal: 1810 },
      shippingAddress: { name: 'Ada', line1: '1 Main', city: 'Los Angeles', region: 'CA', postalCode: '90210', country: 'US' },
    },
  }
}

function patternOrder(): OrderRecord {
  return {
    orderId: 'pattern-order',
    productId: 'pattern-1',
    clientEmail: 'ada@example.com',
    chargedAmount: 500,
    status: 'paid',
    clientInstructions: '',
    details: {
      lineItems: [
        { productId: 'pattern-1', productType: 'pattern', title: 'Pattern PDF', quantity: 1, lineTotal: 500 },
      ],
      totals: { subtotal: 500, discountTotal: 0, shipping: 0, tax: 0, grandTotal: 500 },
    },
  }
}

function renderText(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(renderText).join('')
  if (!isValidElement(node)) return ''
  if (typeof node.type === 'function') return renderText((node.type as (props: unknown) => unknown)(node.props))
  return renderText((node.props as { children?: unknown }).children)
}
