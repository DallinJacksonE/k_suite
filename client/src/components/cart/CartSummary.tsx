import type { CartSnapshot, CheckoutEstimateResponse } from '../../service/ClientTypes'

interface CartSummaryProps {
  cart: CartSnapshot
  estimate?: CheckoutEstimateResponse
  onCheckout(): Promise<void>
}

export function CartSummary({ cart, estimate, onCheckout }: CartSummaryProps) {
  const hasItems = cart.items.length > 0
  return (
    <aside className="cartSummary">
      <h2>Order summary</h2>
      <dl>
        <div><dt>Subtotal</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>{estimate ? formatPrice(estimate.shipping) : hasItems ? 'Calculating…' : formatPrice(0)}</dd></div>
        <div><dt>Tax</dt><dd>{estimate ? formatPrice(estimate.tax) : hasItems ? 'Calculating…' : formatPrice(0)}</dd></div>
        <div className="cartSummaryTotal"><dt>Total</dt><dd>{estimate ? formatPrice(estimate.grandTotal) : formatPrice(cart.subtotal)}</dd></div>
      </dl>
      {cart.subtotal >= 80 ? <p className="cartSummaryNotice">Free shipping applied for orders over $80.</p> : <p className="cartSummaryNotice">Free shipping starts at $80.</p>}
      {!cart.guestCheckoutAllowed ? <p className="shop-error">Log in to check out with pattern products.</p> : null}
      <button className="cartSummaryCheckoutButton" type="button" disabled={!hasItems || !cart.guestCheckoutAllowed} onClick={() => void onCheckout()}>Checkout</button>
    </aside>
  )
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
