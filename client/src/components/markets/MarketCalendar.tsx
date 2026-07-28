import type { MarketEventSummary } from '../../service/ClientTypes'
import { MarketListingCard } from './MarketListingCard'

export function MarketCalendar({ events }: { events: MarketEventSummary[] }) {
  return (
    <section className="profile-panel">
      {events.length === 0 ? <p>No upcoming events yet. Check back soon.</p> : (
        <ul className="market-listing-list">
          {events.map((event) => <li key={event.id}><MarketListingCard event={event} /></li>)}
        </ul>
      )}
    </section>
  )
}
