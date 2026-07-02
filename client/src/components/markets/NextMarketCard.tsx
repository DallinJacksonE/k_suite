import type { MarketEventSummary } from '../../service/ClientTypes'

export function NextMarketCard({ event }: { event: MarketEventSummary | null }) {
  return (
    <section className="profile-panel">
      <p className="eyebrow">Next market</p>
      {event ? <><h2>{event.title}</h2><p>{formatDate(event.startsAt)}</p><p>{event.location ?? event.locationName}</p>{event.externalUrl ? <a href={event.externalUrl}>Event details</a> : null}</> : <p>No upcoming markets scheduled yet.</p>}
    </section>
  )
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString() }
