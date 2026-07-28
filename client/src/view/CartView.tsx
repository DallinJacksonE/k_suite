import { useEffect, useMemo, useState } from 'react'
import { CartItemRow } from '../components/cart/CartItemRow'
import { CartSummary } from '../components/cart/CartSummary'
import { CheckoutModal } from '../components/cart/CheckoutModal'
import { useClientSession } from '../components/auth/useClientSession'
import { ClientShell } from '../components/layout/ClientShell'
import { CartPresenter, type CartPresenterView, type CartViewModel } from '../presenters/CartPresenter'
import { FetchClientApiService } from '../service/ClientApiService'
import type { CheckoutPublicConfig, CheckoutRequest, ClientProfileResponse } from '../service/ClientTypes'

const emptyCart: CartViewModel = { items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }

export function CartView() {
  const { session } = useClientSession()
  const service = useMemo(() => new FetchClientApiService(), [])
  const presenter = useMemo(() => new CartPresenter(service), [service])
  const [cart, setCart] = useState<CartViewModel>(emptyCart)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutPublicConfig | null>(null)
  const [profile, setProfile] = useState<ClientProfileResponse | null>(null)

  useEffect(() => {
    const view: CartPresenterView = { setCart, setBusy, setError }
    presenter.attach(view)
    void presenter.loadCart()
    return () => presenter.detach()
  }, [presenter])

  const openCheckout = async () => {
    setError(null)
    setCheckoutOpen(true)
    const [config, loadedProfile] = await Promise.all([
      service.getCheckoutConfig(),
      session.status === 'authenticated' ? service.loadProfile() : Promise.resolve(null),
    ])
    setCheckoutConfig(config)
    setProfile(loadedProfile)
  }
  const checkout = async (input: Omit<CheckoutRequest, 'idempotencyKey' | 'paymentStatus'>) => {
    const succeeded = await presenter.checkout(input)
    if (succeeded) setCheckoutOpen(false)
  }

  return (
    <ClientShell>
      <section className="page-card">
        <p className="eyebrow">Cart</p>
        <h1>Your cart</h1>
        <p>Review quantities, see product snapshots, estimate shipping and tax, then continue to checkout.</p>
        {cart.checkoutResult ? <p className="shop-notice">Checkout complete. Order {cart.checkoutResult.orderId} is ready in order history and a confirmation email has been sent.</p> : null}
        {error ? <p className="shop-error">{error}</p> : null}
      </section>

      <section className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item) => <CartItemRow key={item.itemId} item={item} onQuantityChange={(itemId, quantity) => presenter.updateQuantity(itemId, quantity)} onRemove={(itemToRemove) => presenter.removeItem(itemToRemove)} />)}
          {!cart.items.length && !busy ? <p>Your cart is empty.</p> : null}
        </div>
        <CartSummary cart={cart} estimate={cart.estimate} onCheckout={openCheckout} />
      </section>
      {checkoutOpen ? <CheckoutModal cart={cart} estimate={cart.estimate} session={session} profile={profile} config={checkoutConfig} busy={busy} error={error} onClose={() => setCheckoutOpen(false)} onSubmit={checkout} /> : null}
    </ClientShell>
  )
}
