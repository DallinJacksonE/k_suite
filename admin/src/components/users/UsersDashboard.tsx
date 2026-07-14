import type { FormEvent } from 'react'
import { useState } from 'react'
import type { AdminRefundOrderInput, AdminUserAccount, AdminUserUpdateInput, OrderRecord } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface UsersDashboardProps {
  users: AdminUserAccount[]
  busy: boolean
  onUpdate(email: string, input: AdminUserUpdateInput): void
  onDelete(email: string): void
  onRefund(orderId: string, input: AdminRefundOrderInput): void
  onRefresh(): void
}

export function UsersDashboard({ users, busy, onUpdate, onDelete, onRefund, onRefresh }: UsersDashboardProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const totals = users.reduce((stats, account) => ({ accounts: stats.accounts + 1, orders: stats.orders + account.stats.orderCount, spent: stats.spent + account.stats.totalSpent }), { accounts: 0, orders: 0, spent: 0 })

  return (
    <div className="category-stack">
      <Panel title="Users" description="Review customer accounts, order history, purchase statistics, refunds, and account details.">
        <div className="metric-grid">
          <div className="metric-card"><strong>{totals.accounts}</strong><span>Accounts</span></div>
          <div className="metric-card"><strong>{totals.orders}</strong><span>Total orders</span></div>
          <div className="metric-card"><strong>{formatPrice(totals.spent)}</strong><span>Net non-refunded spend</span></div>
        </div>
        <div className="button-row"><button type="button" onClick={onRefresh} disabled={busy}>Refresh users</button></div>
        {users.length ? (
          <ul className="result-list product-result-list">
            {users.map((account) => {
              const selected = selectedEmail === account.user.email
              return (
                <li key={account.user.email} className={selected ? 'product-listing selected' : 'product-listing'}>
                  <button type="button" className="product-listing-summary user-listing-summary" onClick={() => setSelectedEmail(selected ? null : account.user.email)} aria-expanded={selected}>
                    <span className="product-listing-main"><strong>{account.user.name}</strong><span>{account.user.email}</span></span>
                    <span>{account.stats.orderCount} orders · {formatPrice(account.stats.totalSpent)}</span>
                    <span>{account.stats.purchasedPatternCount} patterns · {account.stats.cartItemCount} cart items</span>
                    <span>{account.user.emailNotificationsEnabled === false ? 'Notifications off' : 'Notifications on'}</span>
                    <span className="dropdown-indicator">{selected ? 'Close account' : 'Manage account'}</span>
                  </button>
                  {selected ? <UserInlineEditor account={account} busy={busy} onUpdate={onUpdate} onDelete={onDelete} onRefund={onRefund} /> : null}
                </li>
              )
            })}
          </ul>
        ) : <p>No user accounts loaded.</p>}
      </Panel>
    </div>
  )
}

function UserInlineEditor({ account, busy, onUpdate, onDelete, onRefund }: { account: AdminUserAccount; busy: boolean; onUpdate(email: string, input: AdminUserUpdateInput): void; onDelete(email: string): void; onRefund(orderId: string, input: AdminRefundOrderInput): void }) {
  const [password, setPassword] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onUpdate(account.user.email, {
      name: read(fields, 'name'),
      emailNotificationsEnabled: fields.get('emailNotificationsEnabled') === 'on',
      password: password.trim() ? password : undefined,
      addressBook: { shippingAddress: readAddress(fields) },
    })
    setPassword('')
  }

  return (
    <div className="product-inline-editor user-editor-stack">
      <form className="form-grid two-column" onSubmit={submit}>
        <label>Name<input name="name" defaultValue={account.user.name} /></label>
        <label>New password<input value={password} type="password" placeholder="Leave blank to keep current password" onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="checkbox-label"><input name="emailNotificationsEnabled" type="checkbox" defaultChecked={account.user.emailNotificationsEnabled !== false} />Email notifications</label>
        <AddressFields address={account.user.addressBook?.shippingAddress} />
        <div className="button-row full-width"><button type="submit" disabled={busy}>Save account</button><button type="button" className="danger-button" onClick={() => window.confirm(`Delete account for ${account.user.email}?`) && onDelete(account.user.email)} disabled={busy}>Delete account</button></div>
      </form>
      <section>
        <h3>Statistics</h3>
        <div className="metric-grid">
          <div className="metric-card"><strong>{account.stats.orderCount}</strong><span>Orders</span></div>
          <div className="metric-card"><strong>{formatPrice(account.stats.totalSpent)}</strong><span>Spent</span></div>
          <div className="metric-card"><strong>{formatPrice(account.stats.refundedTotal)}</strong><span>Refunded</span></div>
          <div className="metric-card"><strong>{account.stats.purchasedPatternCount}</strong><span>Patterns</span></div>
        </div>
      </section>
      <section>
        <h3>Orders</h3>
        {account.orders.length ? <ul className="result-list">{account.orders.map((order) => <OrderRow key={order.orderId} order={order} busy={busy} onRefund={onRefund} />)}</ul> : <p>No orders for this user.</p>}
      </section>
    </div>
  )
}

function OrderRow({ order, busy, onRefund }: { order: OrderRecord; busy: boolean; onRefund(orderId: string, input: AdminRefundOrderInput): void }) {
  const [reason, setReason] = useState('')
  return (
    <li className="user-order-row">
      <strong>{order.orderId}</strong>
      <span>{order.status} · {formatPrice(order.chargedAmount)}</span>
      <span>{String(order.details?.lineItems ? 'Cart checkout' : order.productId)}</span>
      <label>Refund reason<input value={reason} placeholder="Optional internal note" onChange={(event) => setReason(event.target.value)} /></label>
      <button type="button" className="danger-button" disabled={busy || order.status === 'refunded'} onClick={() => onRefund(order.orderId, { reason })}>{order.status === 'refunded' ? 'Refunded' : 'Issue refund'}</button>
    </li>
  )
}

function AddressFields({ address }: { address?: AdminUserAccount['user']['addressBook'] extends infer Book ? Book extends { shippingAddress?: infer Address } ? Address : never : never }) {
  const value = address as Partial<Record<string, string>> | undefined
  return <fieldset className="full-width form-grid two-column"><legend>Shipping address</legend><label>Name<input name="shippingName" defaultValue={value?.name ?? ''} /></label><label>Line 1<input name="shippingLine1" defaultValue={value?.line1 ?? ''} /></label><label>Line 2<input name="shippingLine2" defaultValue={value?.line2 ?? ''} /></label><label>City<input name="shippingCity" defaultValue={value?.city ?? ''} /></label><label>Region<input name="shippingRegion" defaultValue={value?.region ?? ''} /></label><label>Postal code<input name="shippingPostalCode" defaultValue={value?.postalCode ?? ''} /></label><label>Country<input name="shippingCountry" defaultValue={value?.country ?? ''} /></label></fieldset>
}

function readAddress(fields: FormData) {
  const line1 = read(fields, 'shippingLine1')
  if (!line1) return undefined
  return { name: read(fields, 'shippingName'), line1, line2: read(fields, 'shippingLine2') || undefined, city: read(fields, 'shippingCity'), region: read(fields, 'shippingRegion'), postalCode: read(fields, 'shippingPostalCode'), country: read(fields, 'shippingCountry') }
}
function read(fields: FormData, name: string): string { const value = fields.get(name); return typeof value === 'string' ? value.trim() : '' }
function formatPrice(value: number): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
