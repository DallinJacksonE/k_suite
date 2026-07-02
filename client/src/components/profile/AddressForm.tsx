import type { ShippingAddress, UserAddressBook } from '../../service/ClientTypes'

interface Props {
  addressBook?: UserAddressBook
}

export function AddressForm({ addressBook }: Props) {
  const address = addressBook?.shippingAddress
  return (
    <section className="profile-panel">
      <h2>Saved address</h2>
      {address ? <AddressSummary address={address} /> : <p>No saved address yet. Checkout will collect shipping and billing details.</p>}
    </section>
  )
}

function AddressSummary({ address }: { address: ShippingAddress }) {
  return <address>{address.name}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}</address>
}
