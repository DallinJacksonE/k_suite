import type { OrderRecord } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface OrdersDashboardProps { orders: OrderRecord[]; busy: boolean; onRefresh(): void; onMarkShipped(orderId: string): void }
interface OrderLineItem { productId?: string; title: string; quantity?: number; selectedColor?: string; selectedSize?: string; clientInstructions?: string; lineTotal: number }
interface ShippingAddress { name?: string; line1: string; city?: string; region?: string; postalCode?: string }

export function OrdersDashboard({ orders, busy, onRefresh, onMarkShipped }: OrdersDashboardProps) {
  const pending = orders.filter((order) => isFulfillmentOrder(order))
  const history = orders.filter((order) => !isFulfillmentOrder(order))
  const total = orders.reduce((sum, order) => sum + order.chargedAmount, 0)
  return (
    <div className="category-stack">
      <Panel title="Order metrics"><div className="metric-grid"><Metric label="Pending" value={pending.length} /><Metric label="History" value={history.length} /><Metric label="Charged" value={formatPrice(total)} /></div><button type="button" onClick={onRefresh} disabled={busy}>Refresh orders</button></Panel>
      <Panel title="Pending orders" description="Paid and pending plushie orders that still need packing and shipment."><OrderList orders={pending} empty="No pending orders." action={(order) => <button type="button" onClick={() => onMarkShipped(order.orderId)} disabled={busy}>Mark shipped</button>} /></Panel>
      <Panel title="Order history"><OrderList orders={history} empty="No shipped, fulfilled, cancelled, or refunded orders yet." /></Panel>
    </div>
  )
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div> }
function OrderList({ orders, empty, action }: { orders: OrderRecord[]; empty: string; action?: (order: OrderRecord) => React.ReactNode }) {
  if (!orders.length) return <p>{empty}</p>
  return <ul className="result-list">{orders.map((order) => <li key={order.orderId} className="order-listing"><div className="order-listing-header"><strong>{order.orderId}</strong><span>{order.clientEmail}</span><span>{order.status} · {formatPrice(order.chargedAmount)}</span>{action?.(order)}</div><OrderItems order={order} /><OrderAddress order={order} /></li>)}</ul>
}
function OrderItems({ order }: { order: OrderRecord }) {
  const items = readLineItems(order)
  if (!items.length) return <p className="muted-text">No item details saved for this order.</p>
  return <ul className="order-line-item-list">{items.map((item) => <li key={`${item.productId ?? item.title}-${item.selectedColor ?? ''}-${item.selectedSize ?? ''}`}><strong>{item.title}</strong><span>Qty {item.quantity ?? 1}</span>{item.selectedColor ? <span>Color: {item.selectedColor}</span> : null}{item.selectedSize ? <span>Size: {item.selectedSize}</span> : null}<span>{formatPrice(item.lineTotal)}</span>{item.clientInstructions ? <span className="full-width">Notes: {item.clientInstructions}</span> : null}</li>)}</ul>
}
function OrderAddress({ order }: { order: OrderRecord }) {
  const address = readShippingAddress(order)
  if (!address) return null
  return <p className="muted-text">Ship to {address.name ? `${address.name}, ` : ''}{address.line1}, {address.city}, {address.region} {address.postalCode}</p>
}
function isFulfillmentOrder(order: OrderRecord): boolean { return order.status === 'pending' || order.status === 'paid' }
function readLineItems(order: OrderRecord): OrderLineItem[] { const items = order.details.lineItems; return Array.isArray(items) ? items.filter(isOrderLineItem) : [] }
function isOrderLineItem(value: unknown): value is OrderLineItem { return !!value && typeof value === 'object' && typeof (value as { title?: unknown }).title === 'string' }
function readShippingAddress(order: OrderRecord): ShippingAddress | null { const address = order.details.shippingAddress; return address && typeof address === 'object' && typeof (address as { line1?: unknown }).line1 === 'string' ? address as ShippingAddress : null }
function formatPrice(cents: number): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100) }
