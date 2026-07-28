import type { CartSnapshot, CheckoutEstimateRequest, CheckoutEstimateResponse } from '../../service/ClientTypes'

interface CartSummaryProps {
  cart: CartSnapshot
  estimate?: CheckoutEstimateResponse
  onEstimate(input: CheckoutEstimateRequest): Promise<void>
  onCheckout(): Promise<void>
}

export function CartSummary({ cart, estimate, onEstimate, onCheckout }: CartSummaryProps) {
  return (
    <aside className="cartSummary">
      <h2>Order summary</h2>
      <dl>
        <div><dt>Subtotal</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>{estimate ? formatPrice(estimate.shipping) : 'Estimate at checkout'}</dd></div>
        <div><dt>Tax</dt><dd>{estimate ? formatPrice(estimate.tax) : 'Estimate at checkout'}</dd></div>
        <div className="cartSummaryTotal"><dt>Total</dt><dd>{estimate ? formatPrice(estimate.grandTotal) : formatPrice(cart.subtotal)}</dd></div>
      </dl>
      {cart.subtotal >= 80 ? <p className="cartSummaryNotice">Free shipping applied for orders over $80.</p> : <p className="cartSummaryNotice">Free shipping starts at $80.</p>}
      {!cart.guestCheckoutAllowed ? <p className="shop-error">Log in to check out with pattern products.</p> : null}
      <button className="cartSummarySecondaryButton" type="button" onClick={() => onEstimate({ shippingAddress: { country: 'US', state: 'UT', postalCode: '' } })}>Estimate Utah shipping and tax</button>
      <button className="cartSummaryCheckoutButton" type="button" disabled={!cart.items.length || !cart.guestCheckoutAllowed} onClick={() => void onCheckout()}>Checkout</button>
    </aside>
  )
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
