import type { OrderRecord } from '../../service/ClientTypes'

interface OrderLineItem { productId?: string; title: string; quantity?: number; selectedColor?: string; selectedSize?: string; clientInstructions?: string; lineTotal: number }

export function OrderHistoryPanel({ orders }: { orders: OrderRecord[] }) {
  return (
    <section className="profile-panel">
      <h2>Order history</h2>
      {orders.length === 0 ? <p>No orders yet.</p> : (
        <ul className="profile-list">
          {orders.map((order) => <li key={order.orderId} className="profile-order-card"><div className="profile-order-summary"><strong>{order.orderId}</strong><span>Status: {order.status}</span><span>{formatPrice(order.chargedAmount)}</span></div><OrderItems order={order} /></li>)}
        </ul>
      )}
    </section>
  )
}
function OrderItems({ order }: { order: OrderRecord }) {
  const items = readLineItems(order)
  if (!items.length) return <p>No item details saved for this order.</p>
  return <ul className="profile-order-items">{items.map((item) => <li key={`${item.productId ?? item.title}-${item.selectedColor ?? ''}-${item.selectedSize ?? ''}`}><strong>{item.title}</strong><span>Qty {item.quantity ?? 1}</span>{item.selectedColor ? <span>Color: {item.selectedColor}</span> : null}{item.selectedSize ? <span>Size: {item.selectedSize}</span> : null}<span>{formatPrice(item.lineTotal)}</span>{item.clientInstructions ? <span>Notes: {item.clientInstructions}</span> : null}</li>)}</ul>
}
function readLineItems(order: OrderRecord): OrderLineItem[] { const items = order.details.lineItems; return Array.isArray(items) ? items.filter(isOrderLineItem) : [] }
function isOrderLineItem(value: unknown): value is OrderLineItem { return !!value && typeof value === 'object' && typeof (value as { title?: unknown }).title === 'string' }
function formatPrice(value: number): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
