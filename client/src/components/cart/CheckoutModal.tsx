import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CheckoutBillingAddress, CheckoutFullAddress, CheckoutPublicConfig, CheckoutRequest, ClientProfileResponse, ClientSessionState } from '../../service/ClientTypes'

interface CheckoutModalProps {
  session: ClientSessionState
  profile: ClientProfileResponse | null
  config: CheckoutPublicConfig | null
  busy: boolean
  error: string | null
  onClose(): void
  onSubmit(input: Omit<CheckoutRequest, 'idempotencyKey' | 'paymentStatus'>): Promise<void>
}

type SquareCard = { attach(selector: string): Promise<void>; tokenize(): Promise<{ status: string; token?: string; errors?: Array<{ message?: string }> }> }
type SquarePayments = { card(): Promise<SquareCard> }
type SquareNamespace = { payments(applicationId: string, locationId: string): SquarePayments }

declare global { interface Window { Square?: SquareNamespace } }

export function CheckoutModal({ session, profile, config, busy, error, onClose, onSubmit }: CheckoutModalProps) {
  const accountContact = useMemo(() => accountCheckoutContact(session, profile), [session, profile])
  const accountShipping = profile?.user.addressBook?.shippingAddress
  const [card, setCard] = useState<SquareCard | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const usesSquare = config?.provider === 'square' && !!config.square

  useEffect(() => {
    if (!usesSquare || !config?.square) return undefined
    let cancelled = false
    loadSquareScript(config.square.environment)
      .then(() => window.Square?.payments(config.square!.applicationId, config.square!.locationId).card())
      .then(async (nextCard) => {
        if (!nextCard || cancelled) return
        await nextCard.attach('#square-card-container')
        if (!cancelled) setCard(nextCard)
      })
      .catch((loadError: unknown) => setCardError(loadError instanceof Error ? loadError.message : 'Unable to load Square payment form.'))
    return () => { cancelled = true }
  }, [config, usesSquare])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCardError(null)
    try {
      const form = new FormData(event.currentTarget)
      const contact = accountContact ?? { email: read(form, 'email'), name: read(form, 'name') }
      const shippingAddress = accountShipping ?? readAddress(form)
      const billingAddress: CheckoutBillingAddress = { ...shippingAddress, sameAsShipping: true }
      const paymentToken = usesSquare ? await tokenizeSquareCard(card) : 'test-checkout-token'
      await onSubmit({ contact, shippingAddress, billingAddress, paymentToken })
    } catch (submitError) {
      setCardError(submitError instanceof Error ? submitError.message : 'Checkout failed.')
    }
  }

  return (
    <div className="checkoutModalBackdrop" role="presentation">
      <section className="checkoutModal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="checkoutModalHeader">
          <div>
            <p className="eyebrow">Secure checkout</p>
            <h2 id="checkout-title">Complete your order</h2>
          </div>
          <button type="button" className="checkoutModalClose" onClick={onClose} aria-label="Close checkout">×</button>
        </div>
        <form className="checkoutForm" onSubmit={submit}>
          {accountContact ? <p className="checkoutAccountNotice">We’ll email confirmation to {accountContact.email}.</p> : <CheckoutContactFields />}
          {accountShipping ? <SavedAddress address={accountShipping} /> : <CheckoutAddressFields />}
          <section className="checkoutSection">
            <h3>Payment</h3>
            {usesSquare ? <div id="square-card-container" className="squareCardContainer" /> : <div className="squareCardContainer testCardContainer">Test checkout mode — no card will be charged.</div>}
            {cardError ? <p className="shop-error">{cardError}</p> : null}
            {error ? <p className="shop-error">{error}</p> : null}
          </section>
          <div className="checkoutActions">
            <button type="button" className="cartSummarySecondaryButton" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="cartSummaryCheckoutButton" disabled={busy || (usesSquare && (!card || !!cardError))}>{busy ? 'Processing…' : 'Place order'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function CheckoutContactFields() {
  return <section className="checkoutSection"><h3>Contact</h3><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Name<input name="name" autoComplete="name" required /></label></section>
}

function CheckoutAddressFields() {
  return <section className="checkoutSection"><h3>Shipping address</h3><label>Name<input name="addressName" autoComplete="name" required /></label><label>Address line 1<input name="line1" autoComplete="address-line1" required /></label><label>Address line 2<input name="line2" autoComplete="address-line2" /></label><label>City<input name="city" autoComplete="address-level2" required /></label><label>State / Region<input name="region" autoComplete="address-level1" required /></label><label>Postal code<input name="postalCode" autoComplete="postal-code" required /></label><label>Country<input name="country" autoComplete="country" defaultValue="US" required /></label></section>
}

function SavedAddress({ address }: { address: CheckoutFullAddress }) {
  return <section className="checkoutSection"><h3>Shipping address</h3><address>{address.name}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}</address></section>
}

function accountCheckoutContact(session: ClientSessionState, profile: ClientProfileResponse | null) {
  if (session.status !== 'authenticated') return null
  return { email: profile?.user.email ?? session.user.email, name: profile?.user.name ?? session.user.name }
}

function readAddress(form: FormData): CheckoutFullAddress {
  return { name: read(form, 'addressName'), line1: read(form, 'line1'), line2: optionalRead(form, 'line2'), city: read(form, 'city'), region: read(form, 'region'), postalCode: read(form, 'postalCode'), country: read(form, 'country') }
}

function read(form: FormData, name: string): string {
  const value = String(form.get(name) ?? '').trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function optionalRead(form: FormData, name: string): string | undefined {
  const value = String(form.get(name) ?? '').trim()
  return value || undefined
}

async function tokenizeSquareCard(card: SquareCard | null): Promise<string> {
  if (!card) throw new Error('Square card form is not ready yet.')
  const result = await card.tokenize()
  if (result.status === 'OK' && result.token) return result.token
  throw new Error(result.errors?.map((item) => item.message).filter(Boolean).join('; ') || 'Card tokenization failed.')
}

function loadSquareScript(environment: 'production' | 'sandbox'): Promise<void> {
  if (window.Square) return Promise.resolve()
  const src = environment === 'sandbox' ? 'https://sandbox.web.squarecdn.com/v1/square.js' : 'https://web.squarecdn.com/v1/square.js'
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', () => reject(new Error('Square script failed to load.')), { once: true }); return }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Square script failed to load.'))
    document.head.append(script)
  })
}
