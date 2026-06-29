import type { OrderRecord } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface OrdersDashboardProps { orders: OrderRecord[]; busy: boolean; onRefresh(): void; onMarkShipped(orderId: string): void }

export function OrdersDashboard({ orders, busy, onRefresh, onMarkShipped }: OrdersDashboardProps) {
  const pending = orders.filter((order) => order.status === 'pending')
  const history = orders.filter((order) => order.status !== 'pending')
  const total = orders.reduce((sum, order) => sum + order.chargedAmount, 0)
  return (
    <div className="category-stack">
      <Panel title="Order metrics"><div className="metric-grid"><Metric label="Pending" value={pending.length} /><Metric label="History" value={history.length} /><Metric label="Charged" value={`$${total.toFixed(2)}`} /></div><button type="button" onClick={onRefresh} disabled={busy}>Refresh orders</button></Panel>
      <Panel title="Pending orders" description="Mark packed orders as shipped/fulfilled."><OrderList orders={pending} empty="No pending orders." action={(order) => <button type="button" onClick={() => onMarkShipped(order.orderId)} disabled={busy}>Mark shipped</button>} /></Panel>
      <Panel title="Order history"><OrderList orders={history} empty="No shipped, paid, fulfilled, or cancelled orders yet." /></Panel>
    </div>
  )
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div> }
function OrderList({ orders, empty, action }: { orders: OrderRecord[]; empty: string; action?: (order: OrderRecord) => React.ReactNode }) { if (!orders.length) return <p>{empty}</p>; return <ul className="result-list">{orders.map((order) => <li key={order.orderId}><strong>{order.orderId}</strong><span>{order.clientEmail}</span><span>{order.status} · ${order.chargedAmount.toFixed(2)}</span>{action?.(order)}</li>)}</ul> }
