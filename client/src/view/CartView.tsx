import { useEffect, useMemo, useState } from 'react'
import { CartItemRow } from '../components/cart/CartItemRow'
import { CartSummary } from '../components/cart/CartSummary'
import { ClientShell } from '../components/layout/ClientShell'
import { CartPresenter, type CartPresenterView, type CartViewModel } from '../presenters/CartPresenter'
import { FetchClientApiService } from '../service/ClientApiService'
import type { CheckoutEstimateRequest } from '../service/ClientTypes'

const emptyCart: CartViewModel = { items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }

export function CartView() {
  const presenter = useMemo(() => new CartPresenter(new FetchClientApiService()), [])
  const [cart, setCart] = useState<CartViewModel>(emptyCart)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const view: CartPresenterView = { setCart, setBusy, setError }
    presenter.attach(view)
    void presenter.loadCart()
    return () => presenter.detach()
  }, [presenter])

  const estimate = async (input: CheckoutEstimateRequest) => presenter.estimate(input)

  return (
    <ClientShell>
      <section className="page-card">
        <p className="eyebrow">Cart</p>
        <h1>Your cart</h1>
        <p>Review quantities, see product snapshots, estimate shipping and tax, then continue to checkout.</p>
        {error ? <p className="shop-error">{error}</p> : null}
      </section>

      <section className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item) => <CartItemRow key={item.itemId} item={item} onQuantityChange={(itemId, quantity) => presenter.updateQuantity(itemId, quantity)} />)}
          {!cart.items.length && !busy ? <p>Your cart is empty.</p> : null}
        </div>
        <CartSummary cart={cart} estimate={cart.estimate} onEstimate={estimate} />
      </section>
    </ClientShell>
  )
}
