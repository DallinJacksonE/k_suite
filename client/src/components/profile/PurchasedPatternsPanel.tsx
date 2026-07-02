import type { PurchasedPatternDownload } from '../../service/ClientTypes'

interface Props {
  patterns: PurchasedPatternDownload[]
  onDownload(productId: string): void
}

export function PurchasedPatternsPanel({ patterns, onDownload }: Props) {
  return (
    <section className="profile-panel">
      <h2>Purchased patterns</h2>
      <p>Download links are generated on demand and expire shortly.</p>
      {patterns.length === 0 ? <p>No pattern purchases yet.</p> : (
        <ul className="profile-list">
          {patterns.map((pattern) => (
            <li key={`${pattern.orderId}-${pattern.productId}`}>
              <strong>{pattern.title}</strong>
              <span>Purchased {new Date(pattern.purchasedAt).toLocaleDateString()}</span>
              <button type="button" onClick={() => onDownload(pattern.productId)}>Create download link</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
