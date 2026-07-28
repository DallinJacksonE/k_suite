import assert from 'node:assert/strict'
import * as React from 'react'
import { createElement, isValidElement } from 'react'
import test from 'node:test'

import { OrderHistoryPanel } from '../src/components/profile/OrderHistoryPanel'
import type { OrderRecord } from '../src/service/ClientTypes'

Object.assign(globalThis, { React })

test('profile order history shows purchased item details and order status', () => {
  const text = renderText(createElement(OrderHistoryPanel, { orders: [plushieOrder()] }))

  assert.match(text, /Order history/)
  assert.match(text, /paid/)
  assert.match(text, /Custom Bear/)
  assert.match(text, /Qty 2/)
  assert.match(text, /red/)
  assert.match(text, /medium/)
  assert.match(text, /gift wrap/)
  assert.match(text, /\$1,810\.00/)
  assert.match(text, /\$1,800\.00/)
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
