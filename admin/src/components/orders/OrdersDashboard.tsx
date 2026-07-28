import type { ReactNode } from 'react'
import type { OrderRecord } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface OrdersDashboardProps { orders: OrderRecord[]; busy: boolean; onRefresh(): void; onMarkShipped(orderId: string): void }
interface OrderLineItem { productId?: string; productType?: string; title: string; quantity?: number; selectedColor?: string; selectedSize?: string; clientInstructions?: string; lineTotal: number }
interface ShippingAddress { name?: string; line1: string; line2?: string; city?: string; region?: string; postalCode?: string; country?: string }

export function OrdersDashboard({ orders, busy, onRefresh, onMarkShipped }: OrdersDashboardProps) {
  const pending = orders.filter((order) => isFulfillmentOrder(order))
  const history = orders.filter((order) => !isFulfillmentOrder(order))
  const total = orders.reduce((sum, order) => sum + order.chargedAmount, 0)
  return (
    <div className="category-stack">
      <Panel title="Order metrics"><div className="metric-grid"><Metric label="Pending" value={pending.length} /><Metric label="History" value={history.length} /><Metric label="Charged" value={formatPrice(total)} /></div><button type="button" onClick={onRefresh} disabled={busy}>Refresh orders</button></Panel>
      <Panel title="Pending orders" description="Paid and pending plushie orders that still need packing and shipment."><OrderList orders={pending} empty="No pending orders." action={(order) => <ShippingConfirmation order={order} busy={busy} onMarkShipped={onMarkShipped} />} /></Panel>
      <Panel title="Order history"><OrderList orders={history} empty="No shipped, fulfilled, cancelled, or refunded orders yet." /></Panel>
    </div>
  )
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div> }
function OrderList({ orders, empty, action }: { orders: OrderRecord[]; empty: string; action?: (order: OrderRecord) => ReactNode }) {
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
  return <p className="muted-text">Ship to {formatAddress(address)}</p>
}
function ShippingConfirmation({ order, busy, onMarkShipped }: { order: OrderRecord; busy: boolean; onMarkShipped(orderId: string): void }) {
  const dialogId = `ship-${order.orderId}`
  const address = readShippingAddress(order)
  const plushies = readLineItems(order).filter(isPlushieItem)
  return (
    <>
      <button type="button" onClick={() => openDialog(dialogId)} disabled={busy}>Mark shipped</button>
      <dialog id={dialogId} className="shipping-confirmation-modal">
        <div className="shipping-confirmation-card" data-shipping-confirmation>
          <div className="modal-header"><div><p className="eyebrow">Shipping check</p><h3>Mark order {order.orderId} shipped</h3></div><button type="button" className="secondary-button" onClick={() => closeDialog(dialogId)}>Close</button></div>
          <section><h4>Client address</h4>{address ? <address>{formatAddress(address)}</address> : <p className="muted-text">No shipping address saved for this order.</p>}<label className="checkbox-label">Shipping label is accurate<input type="checkbox" onChange={(event) => syncShippingConfirmation(event.currentTarget.closest('[data-shipping-confirmation]'))} /></label></section>
          <section><h4>Plushies ordered</h4>{plushies.length ? <ul className="shipping-plushie-list">{plushies.map((item) => <li key={`${item.productId ?? item.title}-${item.selectedColor ?? ''}-${item.selectedSize ?? ''}`}><strong>{item.title}</strong><span>Qty {item.quantity ?? 1}</span><span>Color: {item.selectedColor || 'Not specified'}</span><span>Size: {item.selectedSize || 'Not specified'}</span><span>Notes: {item.clientInstructions || 'No notes'}</span></li>)}</ul> : <p className="muted-text">No plushie line items saved for this order.</p>}<label className="checkbox-label">Color and size are correct and Notes were considered<input type="checkbox" onChange={(event) => syncShippingConfirmation(event.currentTarget.closest('[data-shipping-confirmation]'))} /></label></section>
          <div className="button-row"><button type="button" data-shipping-confirm data-busy={busy ? 'true' : 'false'} ref={(button) => { if (button && !button.dataset.initialized) { button.disabled = true; button.dataset.initialized = 'true' } }} onClick={(event) => { if (event.currentTarget.disabled) return; onMarkShipped(order.orderId); closeDialog(dialogId); resetShippingConfirmation(event.currentTarget.closest('[data-shipping-confirmation]')) }}>Mark Shipped</button></div>
        </div>
      </dialog>
    </>
  )
}
function isFulfillmentOrder(order: OrderRecord): boolean { return (order.status === 'pending' || order.status === 'paid') && !isPatternOnlyOrder(order) }
function readLineItems(order: OrderRecord): OrderLineItem[] { const items = order.details.lineItems; return Array.isArray(items) ? items.filter(isOrderLineItem) : [] }
function isOrderLineItem(value: unknown): value is OrderLineItem { return !!value && typeof value === 'object' && typeof (value as { title?: unknown }).title === 'string' }
function readShippingAddress(order: OrderRecord): ShippingAddress | null { const address = order.details.shippingAddress; return address && typeof address === 'object' && typeof (address as { line1?: unknown }).line1 === 'string' ? address as ShippingAddress : null }
function isPatternOnlyOrder(order: OrderRecord): boolean { const items = readLineItems(order); return items.length > 0 && items.every((item) => item.productType === 'pattern') }
function isPlushieItem(item: OrderLineItem): boolean { return item.productType === 'plushie' || item.productType === undefined }
function formatAddress(address: ShippingAddress): string { return [address.name, address.line1, address.line2, [address.city, address.region, address.postalCode].filter(Boolean).join(', '), address.country].filter(Boolean).join(', ') }
function openDialog(dialogId: string): void { (document.getElementById(dialogId) as HTMLDialogElement | null)?.showModal() }
function closeDialog(dialogId: string): void { (document.getElementById(dialogId) as HTMLDialogElement | null)?.close() }
function resetShippingConfirmation(container: Element | null): void { container?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => { input.checked = false }); syncShippingConfirmation(container) }
function syncShippingConfirmation(container: Element | null): void { const button = container?.querySelector<HTMLButtonElement>('[data-shipping-confirm]'); const checkboxes = [...(container?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])]; if (button) button.disabled = button.dataset.busy === 'true' || checkboxes.length < 2 || checkboxes.some((input) => !input.checked) }
function formatPrice(value: number): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
