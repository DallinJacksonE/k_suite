interface StatusCardProps {
  status: string
  error: string | null
  backendStatus: string
  busy: boolean
  onRefresh(): void
}

export function StatusCard({ status, error, backendStatus, busy, onRefresh }: StatusCardProps) {
  return (
    <section className="status-card" aria-live="polite">
      <div>
        <p className="eyebrow">Frontend status</p>
        <h2>{status}</h2>
        <p>{error ?? `Backend: ${backendStatus}`}</p>
      </div>
      <button type="button" disabled={busy} onClick={onRefresh}>
        {busy ? 'Checking...' : 'Check backend'}
      </button>
    </section>
  )
}
