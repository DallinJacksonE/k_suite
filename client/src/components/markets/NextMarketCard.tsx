import type { MarketEventSummary } from '../../service/ClientTypes'
import { MarketListingCard } from './MarketListingCard'

export function NextMarketCard({ event }: { event: MarketEventSummary | null }) {
  return (
    <section className="profile-panel">
      <p className="eyebrow">Next market</p>
      <MarketListingCard event={event} />
    </section>
  )
}
