import type { PurchasedPatternDownload } from '../../service/ClientTypes'

interface Props {
  patterns: PurchasedPatternDownload[]
  onDownload(productId: string): void
}

export function PurchasedPatternsPanel({ patterns, onDownload }: Props) {
  return (
    <section className="profile-panel">
      <h2>Purchased patterns</h2>
      <p className="profile-panel-copy">Download links are generated on demand and expire shortly.</p>
      {patterns.length === 0 ? <p className="profile-empty-state">No pattern purchases yet.</p> : (
        <ul className="profile-list profile-pattern-list">
          {patterns.map((pattern) => (
            <li key={`${pattern.orderId}-${pattern.productId}`}>
              <div>
                <strong>{pattern.title}</strong>
                <span>Purchased {formatDate(pattern.purchasedAt)}</span>
              </div>
              <button type="button" onClick={() => onDownload(pattern.productId)}>Create download link</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}
