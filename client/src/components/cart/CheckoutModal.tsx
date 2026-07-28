import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { CartSnapshot, CheckoutBillingAddress, CheckoutEstimateResponse, CheckoutFullAddress, CheckoutPublicConfig, CheckoutRequest, ClientProfileResponse, ClientSessionState } from '../../service/ClientTypes'

interface CheckoutModalProps {
  cart: CartSnapshot
  estimate?: CheckoutEstimateResponse
  session: ClientSessionState
  profile: ClientProfileResponse | null
  config: CheckoutPublicConfig | null
  busy: boolean
  error: string | null
  onClose(): void
  onSubmit(input: Omit<CheckoutRequest, 'idempotencyKey' | 'paymentStatus'>): Promise<void>
}

type SquareTokenizeResult = { status: string; token?: string; errors?: Array<{ message?: string }> }
type SquarePaymentMethod = { attach?(selector: string): Promise<void>; tokenize(): Promise<SquareTokenizeResult>; destroy?(): Promise<void> | void }
type SquarePaymentRequest = unknown
type SquarePayments = {
  card(): Promise<SquarePaymentMethod>
  googlePay(paymentRequest: SquarePaymentRequest): Promise<SquarePaymentMethod>
  applePay(paymentRequest: SquarePaymentRequest): Promise<SquarePaymentMethod>
  paymentRequest(input: { countryCode: string; currencyCode: string; total: { amount: string; label: string } }): SquarePaymentRequest
}
type SquareNamespace = { payments(applicationId: string, locationId: string): SquarePayments }

declare global { interface Window { Square?: SquareNamespace } }

export function CheckoutModal({ cart, estimate, session, profile, config, busy, error, onClose, onSubmit }: CheckoutModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const accountContact = useMemo(() => accountCheckoutContact(session, profile), [session, profile])
  const accountShipping = profile?.user.addressBook?.shippingAddress
  const accountBilling = profile?.user.addressBook?.billingAddress
  const totalAmount = estimate?.grandTotal ?? cart.subtotal
  const [card, setCard] = useState<SquarePaymentMethod | null>(null)
  const [googlePay, setGooglePay] = useState<SquarePaymentMethod | null>(null)
  const [applePay, setApplePay] = useState<SquarePaymentMethod | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const usesSquare = config?.provider === 'square' && !!config.square

  useEffect(() => {
    if (!usesSquare || !config?.square) return undefined
    let cancelled = false
    const attachedMethods: SquarePaymentMethod[] = []

    loadSquareScript(config.square.environment)
      .then(async () => {
        const payments = window.Square?.payments(config.square!.applicationId, config.square!.locationId)
        if (!payments) throw new Error('Square payment form is unavailable.')
        const paymentRequest = payments.paymentRequest({ countryCode: 'US', currencyCode: 'USD', total: { amount: formatPaymentAmount(totalAmount), label: 'Order total' } })
        const nextCard = await payments.card()
        if (cancelled) return
        await nextCard.attach?.('#square-card-container')
        attachedMethods.push(nextCard)
        if (!cancelled) setCard(nextCard)

        void attachOptionalWallet(payments.googlePay(paymentRequest), '#square-google-pay-container', setGooglePay, attachedMethods, () => cancelled)
        void attachOptionalWallet(payments.applePay(paymentRequest), '#square-apple-pay-container', setApplePay, attachedMethods, () => cancelled)
      })
      .catch((loadError: unknown) => setCardError(loadError instanceof Error ? loadError.message : 'Unable to load Square payment form.'))

    return () => {
      cancelled = true
      attachedMethods.forEach((method) => { void method.destroy?.() })
    }
  }, [config, totalAmount, usesSquare])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCardError(null)
    setWalletError(null)
    try {
      const { contact, shippingAddress, billingAddress } = readCheckoutDetails(new FormData(event.currentTarget), accountContact, accountShipping, billingSameAsShipping)
      const paymentToken = usesSquare ? await tokenizeSquareCard(card) : 'test-checkout-token'
      await onSubmit({ contact, shippingAddress, billingAddress, paymentToken })
    } catch (submitError) {
      setCardError(submitError instanceof Error ? submitError.message : 'Checkout failed.')
    }
  }

  const submitWalletPayment = async (method: SquarePaymentMethod | null, label: string) => {
    setCardError(null)
    setWalletError(null)
    try {
      if (!formRef.current) throw new Error('Checkout form is not ready yet.')
      const { contact, shippingAddress, billingAddress } = readCheckoutDetails(new FormData(formRef.current), accountContact, accountShipping, billingSameAsShipping)
      const paymentToken = await tokenizeSquareWallet(method, label)
      await onSubmit({ contact, shippingAddress, billingAddress, paymentToken })
    } catch (submitError) {
      setWalletError(submitError instanceof Error ? submitError.message : `${label} checkout failed.`)
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
        <form ref={formRef} className="checkoutForm" onSubmit={submit}>
          {accountContact ? <p className="checkoutAccountNotice">We’ll email confirmation to {accountContact.email}.</p> : <CheckoutContactFields />}
          {accountShipping ? <SavedAddress address={accountShipping} /> : <CheckoutAddressFields title="Shipping address" prefix="shipping" />}
          <section className="checkoutSection checkoutBillingSection">
            <label className="checkoutCheckbox"><input name="billingSameAsShipping" type="checkbox" checked={billingSameAsShipping} onChange={(event) => setBillingSameAsShipping(event.currentTarget.checked)} />Shipping same as Billing Address</label>
            {!billingSameAsShipping ? <CheckoutAddressFields title="Billing address" prefix="billing" defaultAddress={accountBilling} /> : null}
          </section>
          <section className="checkoutSection">
            <h3>Payment</h3>
            {usesSquare ? (
              <div className="squareWalletGrid" aria-label="Digital wallets">
                <div id="square-google-pay-container" className={googlePay ? 'squareWalletButton' : 'squareWalletButton squareWalletButtonHidden'} onClick={() => void submitWalletPayment(googlePay, 'Google Pay')} />
                <div id="square-apple-pay-container" className={applePay ? 'squareWalletButton' : 'squareWalletButton squareWalletButtonHidden'} onClick={() => void submitWalletPayment(applePay, 'Apple Pay')} />
              </div>
            ) : null}
            {usesSquare ? <div id="square-card-container" className="squareCardContainer" /> : <div className="squareCardContainer testCardContainer">Test checkout mode — no card will be charged.</div>}
            {cardError ? <p className="shop-error">{cardError}</p> : null}
            {walletError ? <p className="shop-error">{walletError}</p> : null}
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

function CheckoutAddressFields({ title, prefix, defaultAddress }: { title: string; prefix: string; defaultAddress?: CheckoutFullAddress }) {
  return <section className="checkoutSection checkoutAddressFields"><h3>{title}</h3><label>Name<input name={`${prefix}Name`} autoComplete="name" defaultValue={defaultAddress?.name ?? ''} required /></label><label>Address line 1<input name={`${prefix}Line1`} autoComplete="address-line1" defaultValue={defaultAddress?.line1 ?? ''} required /></label><label>Address line 2<input name={`${prefix}Line2`} autoComplete="address-line2" defaultValue={defaultAddress?.line2 ?? ''} /></label><label>City<input name={`${prefix}City`} autoComplete="address-level2" defaultValue={defaultAddress?.city ?? ''} required /></label><label>State / Region<input name={`${prefix}Region`} autoComplete="address-level1" defaultValue={defaultAddress?.region ?? ''} required /></label><label>Postal code<input name={`${prefix}PostalCode`} autoComplete="postal-code" defaultValue={defaultAddress?.postalCode ?? ''} required /></label><label>Country<input name={`${prefix}Country`} autoComplete="country" defaultValue={defaultAddress?.country ?? 'US'} required /></label></section>
}

function SavedAddress({ address }: { address: CheckoutFullAddress }) {
  return <section className="checkoutSection"><h3>Shipping address</h3><address>{address.name}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}</address></section>
}

function accountCheckoutContact(session: ClientSessionState, profile: ClientProfileResponse | null) {
  if (session.status !== 'authenticated') return null
  return { email: profile?.user.email ?? session.user.email, name: profile?.user.name ?? session.user.name }
}

function readCheckoutDetails(form: FormData, accountContact: CheckoutRequest['contact'] | null, accountShipping: CheckoutFullAddress | undefined, sameAsShipping: boolean): Omit<CheckoutRequest, 'idempotencyKey' | 'paymentStatus' | 'paymentToken'> {
  const contact = accountContact ?? { email: read(form, 'email'), name: read(form, 'name') }
  const shippingAddress = accountShipping ?? readAddress(form, 'shipping')
  const billingAddress: CheckoutBillingAddress = sameAsShipping ? { ...shippingAddress, sameAsShipping: true } : { ...readAddress(form, 'billing'), sameAsShipping: false }
  return { contact, shippingAddress, billingAddress }
}

function readAddress(form: FormData, prefix: string): CheckoutFullAddress {
  return { name: read(form, `${prefix}Name`), line1: read(form, `${prefix}Line1`), line2: optionalRead(form, `${prefix}Line2`), city: read(form, `${prefix}City`), region: read(form, `${prefix}Region`), postalCode: read(form, `${prefix}PostalCode`), country: read(form, `${prefix}Country`) }
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

async function tokenizeSquareCard(card: SquarePaymentMethod | null): Promise<string> {
  if (!card) throw new Error('Square card form is not ready yet.')
  const result = await card.tokenize()
  if (result.status === 'OK' && result.token) return result.token
  throw new Error(result.errors?.map((item) => item.message).filter(Boolean).join('; ') || 'Card tokenization failed.')
}

async function tokenizeSquareWallet(method: SquarePaymentMethod | null, label: string): Promise<string> {
  if (!method) throw new Error(`${label} is not available on this browser or device.`)
  const result = await method.tokenize()
  if (result.status === 'OK' && result.token) return result.token
  throw new Error(result.errors?.map((item) => item.message).filter(Boolean).join('; ') || `${label} tokenization failed.`)
}

async function attachOptionalWallet(methodPromise: Promise<SquarePaymentMethod>, selector: string, setMethod: (method: SquarePaymentMethod | null) => void, attachedMethods: SquarePaymentMethod[], isCancelled: () => boolean): Promise<void> {
  try {
    const method = await methodPromise
    if (isCancelled()) return
    await method.attach?.(selector)
    attachedMethods.push(method)
    if (!isCancelled()) setMethod(method)
  } catch {
    if (!isCancelled()) setMethod(null)
  }
}

function formatPaymentAmount(value: number): string {
  return Math.max(0, value).toFixed(2)
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
