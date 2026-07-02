import type { OrderRecord } from '../../service/ClientTypes'

export function OrderHistoryPanel({ orders }: { orders: OrderRecord[] }) {
  return (
    <section className="profile-panel">
      <h2>Order history</h2>
      {orders.length === 0 ? <p>No orders yet.</p> : (
        <ul className="profile-list">
          {orders.map((order) => <li key={order.orderId}><strong>{order.orderId}</strong><span>{order.status}</span><span>${(order.chargedAmount / 100).toFixed(2)}</span></li>)}
        </ul>
      )}
    </section>
  )
}
