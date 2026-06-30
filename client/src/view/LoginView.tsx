import { ClientShell } from '../components/layout/ClientShell'

export function LoginView() {
  return (
    <ClientShell>
      <section className="page-card">
        <p className="eyebrow">Login / Register</p>
        <h1>Account access is ready for forms.</h1>
        <p>The session provider already exposes login and register actions for the upcoming auth form work.</p>
      </section>
    </ClientShell>
  )
}
