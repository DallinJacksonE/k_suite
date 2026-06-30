import type { CartSnapshot, CheckoutEstimateRequest, CheckoutEstimateResponse } from '../../service/ClientTypes'

interface CartSummaryProps {
  cart: CartSnapshot
  estimate?: CheckoutEstimateResponse
  onEstimate(input: CheckoutEstimateRequest): Promise<void>
}

export function CartSummary({ cart, estimate, onEstimate }: CartSummaryProps) {
  return (
    <aside className="cart-summary">
      <h2>Order summary</h2>
      <dl>
        <div><dt>Subtotal</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>{estimate ? formatPrice(estimate.shipping) : 'Estimate at checkout'}</dd></div>
        <div><dt>Tax</dt><dd>{estimate ? formatPrice(estimate.tax) : 'Estimate at checkout'}</dd></div>
        <div><dt>Total</dt><dd>{estimate ? formatPrice(estimate.grandTotal) : formatPrice(cart.subtotal)}</dd></div>
      </dl>
      {cart.subtotal >= 8000 ? <p>Free shipping applied for orders over $80.</p> : <p>Free shipping starts at $80.</p>}
      {!cart.guestCheckoutAllowed ? <p className="shop-error">Log in to check out with pattern products.</p> : null}
      <button type="button" onClick={() => onEstimate({ shippingAddress: { country: 'US', state: 'CA', postalCode: '' } })}>Estimate shipping and tax</button>
      <button type="button" disabled={!cart.items.length || !cart.guestCheckoutAllowed}>Continue to checkout</button>
    </aside>
  )
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)
}
