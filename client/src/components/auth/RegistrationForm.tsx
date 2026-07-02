import type { FormEvent } from 'react'
import type { ShippingAddress } from '../../service/ClientTypes'

interface RegistrationFormProps {
  busy: boolean
  onSubmit(input: { email: string; name: string; password: string; shippingAddress: ShippingAddress }): void
}

export function RegistrationForm({ busy, onSubmit }: RegistrationFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      email: String(form.get('email') ?? ''),
      name: String(form.get('name') ?? ''),
      password: String(form.get('password') ?? ''),
      shippingAddress: {
        name: String(form.get('shippingName') ?? ''),
        line1: String(form.get('line1') ?? ''),
        line2: String(form.get('line2') ?? ''),
        city: String(form.get('city') ?? ''),
        region: String(form.get('region') ?? ''),
        postalCode: String(form.get('postalCode') ?? ''),
        country: String(form.get('country') ?? ''),
      },
    })
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div>
        <p className="eyebrow">New customer</p>
        <h2>Register</h2>
      </div>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Name
        <input name="name" autoComplete="name" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" required />
      </label>
      <fieldset>
        <legend>Shipping address</legend>
        <label>
          Shipping name
          <input name="shippingName" autoComplete="shipping name" required />
        </label>
        <label>
          Address line 1
          <input name="line1" autoComplete="shipping address-line1" required />
        </label>
        <label>
          Address line 2
          <input name="line2" autoComplete="shipping address-line2" />
        </label>
        <div className="auth-form__row">
          <label>
            City
            <input name="city" autoComplete="shipping address-level2" required />
          </label>
          <label>
            State / region
            <input name="region" autoComplete="shipping address-level1" required />
          </label>
        </div>
        <div className="auth-form__row">
          <label>
            Postal code
            <input name="postalCode" autoComplete="shipping postal-code" required />
          </label>
          <label>
            Country
            <input name="country" autoComplete="shipping country-name" required />
          </label>
        </div>
      </fieldset>
      <button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>
  )
}
