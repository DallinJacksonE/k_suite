import { Navigate } from 'react-router-dom'
import { useClientSession } from '../components/auth/useClientSession'
import { ClientShell } from '../components/layout/ClientShell'

export function ProfileView() {
  const { canViewProfile, loading, session } = useClientSession()

  if (!loading && !canViewProfile) return <Navigate to="/login" replace />

  return (
    <ClientShell>
      <section className="page-card">
        <p className="eyebrow">Profile</p>
        <h1>{session.status === 'authenticated' ? `Welcome, ${session.user.name}` : 'Loading profile...'}</h1>
        <p>Profile details, purchased patterns, and account controls will fill this authenticated page.</p>
      </section>
    </ClientShell>
  )
}
