import type { FormEvent } from 'react'
import type { ShippingAddress, UpdateProfileInput, UserAddressBook, UserProfileDetails } from '../../service/ClientTypes'

interface Props {
  user: UserProfileDetails
  saving: boolean
  onSave(input: Omit<UpdateProfileInput, 'email'>): void
}

export function ProfileInfoForm({ user, saving, onSave }: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = read(form, 'password')
    onSave({
      name: read(form, 'name') || user.name,
      emailNotificationsEnabled: form.get('emailNotificationsEnabled') === 'on',
      password: password || undefined,
      addressBook: readAddressBook(form, user.addressBook),
    })
  }

  const address = user.addressBook?.shippingAddress

  return (
    <form className="profile-panel" onSubmit={submit}>
      <h2>Edit Profile details</h2>
      <label>Name: <input name="name" defaultValue={user.name} /></label>
      <label className="inline"><input name="emailNotificationsEnabled" type="checkbox" defaultChecked={user.emailNotificationsEnabled !== false} /> Email notifications</label>
      <fieldset className="profile-fieldset">
        <legend>Shipping address</legend>
        <label>Name<input name="shippingName" defaultValue={address?.name ?? ''} /></label>
        <label>Line 1<input name="shippingLine1" defaultValue={address?.line1 ?? ''} /></label>
        <label>Line 2<input name="shippingLine2" defaultValue={address?.line2 ?? ''} /></label>
        <label>City<input name="shippingCity" defaultValue={address?.city ?? ''} /></label>
        <label>Region<input name="shippingRegion" defaultValue={address?.region ?? ''} /></label>
        <label>Postal code<input name="shippingPostalCode" defaultValue={address?.postalCode ?? ''} /></label>
        <label>Country<input name="shippingCountry" defaultValue={address?.country ?? 'US'} /></label>
      </fieldset>
      <label>New password<input name="password" type="password" autoComplete="new-password" placeholder="Leave blank to keep current password" /></label>
      <button type="submit" className="profile-action-button" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
  )
}

function readAddressBook(form: FormData, current?: UserAddressBook): UserAddressBook {
  const shippingAddress = readShippingAddress(form)
  return { ...current, shippingAddress }
}

function readShippingAddress(form: FormData): ShippingAddress | undefined {
  const line1 = read(form, 'shippingLine1')
  if (!line1) return undefined

  return {
    name: read(form, 'shippingName'),
    line1,
    line2: read(form, 'shippingLine2') || undefined,
    city: read(form, 'shippingCity'),
    region: read(form, 'shippingRegion'),
    postalCode: read(form, 'shippingPostalCode'),
    country: read(form, 'shippingCountry') || 'US',
  }
}

function read(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}
