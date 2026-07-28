import type { OrderRecord } from '../../service/ClientTypes'

interface OrderLineItem {
  productId?: string
  title: string
  quantity?: number
  selectedColor?: string
  selectedSize?: string
  clientInstructions?: string
  lineTotal: number
}

export function OrderHistoryPanel({ orders }: { orders: OrderRecord[] }) {
  return (
    <section className="profile-panel profile-panelWide">
      <h2>Order history</h2>
      {orders.length === 0 ? <p className="profile-empty-state">No orders yet.</p> : (
        <ul className="profile-list profile-order-list">
          {orders.map((order) => <OrderCard key={order.orderId} order={order} />)}
        </ul>
      )}
    </section>
  )
}

function OrderCard({ order }: { order: OrderRecord }) {
  return (
    <li className="profile-order-card">
      <div className="profile-order-heading">
        <div>
          <h3>{formatDate(order.createdAt)}</h3>
          <p>Order #{order.orderId}</p>
        </div>
        <div className="profile-order-total">
          <span>{order.status}</span>
          <strong>{formatPrice(order.chargedAmount)}</strong>
        </div>
      </div>
      <OrderItems order={order} />
    </li>
  )
}

function OrderItems({ order }: { order: OrderRecord }) {
  const items = readLineItems(order)
  if (!items.length) return <p className="profile-empty-state">No item details saved for this order.</p>

  return (
    <ul className="profile-order-items">
      {items.map((item) => (
        <li key={`${item.productId ?? item.title}-${item.selectedColor ?? ''}-${item.selectedSize ?? ''}`}>
          <div className="profile-order-item-main">
            <strong>{item.title}</strong>
            <span>Qty {item.quantity ?? 1}</span>
          </div>
          <div className="profile-order-item-meta">
            {item.selectedColor ? <span>Color: {item.selectedColor}</span> : null}
            {item.selectedSize ? <span>Size: {item.selectedSize}</span> : null}
            {item.clientInstructions ? <span>Notes: {item.clientInstructions}</span> : null}
          </div>
          <strong className="profile-order-item-price">{formatPrice(item.lineTotal)}</strong>
        </li>
      ))}
    </ul>
  )
}

function readLineItems(order: OrderRecord): OrderLineItem[] {
  const items = order.details.lineItems
  return Array.isArray(items) ? items.filter(isOrderLineItem) : []
}

function isOrderLineItem(value: unknown): value is OrderLineItem {
  return !!value && typeof value === 'object' && typeof (value as { title?: unknown }).title === 'string'
}

function formatDate(value: string | undefined): string {
  if (!value) return 'Order date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
