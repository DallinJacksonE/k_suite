import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useClientSession } from '../components/auth/useClientSession'
import { ClientShell } from '../components/layout/ClientShell'
import { AddressForm } from '../components/profile/AddressForm'
import { DeleteAccountPanel } from '../components/profile/DeleteAccountPanel'
import { OrderHistoryPanel } from '../components/profile/OrderHistoryPanel'
import { ProfileInfoForm } from '../components/profile/ProfileInfoForm'
import { PurchasedPatternsPanel } from '../components/profile/PurchasedPatternsPanel'
import { ProfilePresenter, type ProfileViewModel } from '../presenters/ProfilePresenter'
import { FetchClientApiService } from '../service/ClientApiService'

export function ProfileView() {
  const { canViewProfile, loading, session } = useClientSession()
  const navigate = useNavigate()
  const [model, setModel] = useState<ProfileViewModel>({ loading: true, saving: false, deleting: false, profile: null })
  const [confirmation, setConfirmation] = useState('')
  const service = useMemo(() => new FetchClientApiService(), [])
  const presenter = useMemo(() => new ProfilePresenter(service, { renderProfile: setModel, onProfileDeleted: () => navigate('/') }), [navigate, service])

  useEffect(() => { if (canViewProfile) void presenter.load() }, [canViewProfile, presenter])

  if (!loading && !canViewProfile) return <Navigate to="/login" replace />

  const profile = model.profile
  const user = profile?.user

  return (
    <ClientShell>
      <section className="page-card profile-page">
        <div className="profile-hero">
          <div>
            <p className="eyebrow">Profile</p>
            <h1>{user ? `Welcome, ${user.name}` : session.status === 'authenticated' ? `Welcome, ${session.user.name}` : 'Loading profile...'}</h1>
            <p>Manage your account details, review order history, and generate fresh download links for purchased patterns.</p>
          </div>
          {profile ? <div className="profile-summary-card"><strong>{profile.orders.length}</strong><span>Orders</span><strong>{profile.purchasedPatterns.length}</strong><span>Patterns</span></div> : null}
        </div>
        {model.error ? <p role="alert" className="form-error">{model.error}</p> : null}
        {model.message ? <p role="status" className="shop-notice">{model.message}</p> : null}
        {model.loading ? <p>Loading profile…</p> : null}
        {user && profile ? (
          <div className="profile-grid">
            <ProfileInfoForm user={user} saving={model.saving} onSave={(input) => void presenter.save({ email: user.email, ...input })} />
            <div className="profile-card-stack">
              <AddressForm addressBook={user.addressBook} />
              <PurchasedPatternsPanel patterns={profile.purchasedPatterns} onDownload={(productId) => void openDownload(productId, presenter)} />
              <DeleteAccountPanel email={user.email} deleting={model.deleting} confirmation={confirmation} onConfirmationChange={setConfirmation} onDelete={() => void presenter.deleteAccount(user.email, confirmation)} />
            </div>
            <OrderHistoryPanel orders={profile.orders} />
          </div>
        ) : null}
      </section>
    </ClientShell>
  )
}

async function openDownload(productId: string, presenter: ProfilePresenter): Promise<void> {
  const download = await presenter.downloadPattern(productId)
  if (download?.downloadUrl) window.open(download.downloadUrl, '_blank', 'noopener,noreferrer')
}
