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
  assert.match(text, /Mark shipped/)
})

function plushieOrder(): OrderRecord {
  return {
    orderId: 'order-1',
    productId: 'p1',
    clientEmail: 'ada@example.com',
    chargedAmount: 2600,
    status: 'paid',
    clientInstructions: 'gift wrap',
    details: {
      lineItems: [
        { productId: 'p1', productType: 'plushie', title: 'Custom Bear', quantity: 2, unitPrice: 900, selectedColor: 'red', selectedSize: 'medium', clientInstructions: 'gift wrap', lineTotal: 1800 },
      ],
      totals: { subtotal: 1800, discountTotal: 0, shipping: 800, tax: 0, grandTotal: 2600 },
      shippingAddress: { name: 'Ada', line1: '1 Main', city: 'Los Angeles', region: 'CA', postalCode: '90210', country: 'US' },
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
