import type { MarketEventSummary } from '../../service/ClientTypes'

export function MarketCalendar({ events }: { events: MarketEventSummary[] }) {
  return (
    <section className="profile-panel">
      <h2>Upcoming markets</h2>
      {events.length === 0 ? <p>No upcoming events yet. Check back soon.</p> : (
        <ul className="profile-list">
          {events.map((event) => <li key={event.id}><strong>{event.title}</strong><span>{formatDate(event.startsAt)}</span><span>{event.location ?? event.locationName}</span></li>)}
        </ul>
      )}
    </section>
  )
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString() }
