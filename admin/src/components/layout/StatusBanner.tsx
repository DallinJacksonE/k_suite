interface StatusBannerProps { status: string; error: string | null }

export function StatusBanner({ status, error }: StatusBannerProps) {
  return (
    <section className="notice-stack" aria-live="polite">
      <p className="status-message">{status}</p>
      {error ? <p className="error-message">{error}</p> : null}
    </section>
  )
}
