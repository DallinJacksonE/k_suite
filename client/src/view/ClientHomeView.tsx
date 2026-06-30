import { useEffect, useMemo, useState } from 'react'
import { ClientShell } from '../components/layout/ClientShell'
import { StatusCard } from '../components/common/StatusCard'
import { ClientHomePresenter } from '../presenters/ClientHomePresenter'
import type { ClientHomeView as ClientHomeViewContract } from '../presenters/ClientHomePresenter'
import { FetchClientApiService } from '../service/ClientApiService'
import './ClientHomeView.css'

export function ClientHomeView() {
  const presenter = useMemo(() => new ClientHomePresenter(new FetchClientApiService()), [])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Ready for client frontend development.')
  const [error, setError] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState('Not checked yet')

  useEffect(() => {
    const view: ClientHomeViewContract = {
      setBusy,
      setStatus,
      setError,
      setBackendStatus,
    }

    presenter.attach(view)
    return () => presenter.detach()
  }, [presenter])

  return (
    <ClientShell>
      <section className="client-hero">
        <p className="eyebrow">Client storefront</p>
        <h1>Prepared for MVP frontend development.</h1>
        <p>
          Template code is gone. Future client routes can now grow through thin React views,
          presenter-owned behavior, and service-owned API calls.
        </p>
      </section>

      <section className="foundation-grid" aria-label="Frontend architecture layers">
        <article>
          <span>/components</span>
          <h2>Reusable React UI</h2>
          <p>Shared layout and small interface pieces that stay free of API behavior.</p>
        </article>
        <article>
          <span>/view</span>
          <h2>Router views</h2>
          <p>Route-level React components that own local state and attach presenters.</p>
        </article>
        <article>
          <span>/presenters</span>
          <h2>View behavior</h2>
          <p>Interaction logic, validation, and view contract updates without React imports.</p>
        </article>
        <article>
          <span>/service</span>
          <h2>API access</h2>
          <p>Fetch details and backend DTOs live behind service interfaces.</p>
        </article>
      </section>

      <StatusCard
        status={status}
        error={error}
        backendStatus={backendStatus}
        busy={busy}
        onRefresh={() => void presenter.refreshBackendStatus()}
      />
    </ClientShell>
  )
}
