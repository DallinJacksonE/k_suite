import type { MarketEventSummary } from '../../service/ClientTypes'

interface MarketListingCardProps {
  event: MarketEventSummary | null
  emptyMessage?: string
  headingId?: string
  mapLabelPrefix?: string
}

export function MarketListingCard({ event, emptyMessage = 'No upcoming markets scheduled yet.', headingId, mapLabelPrefix = 'Open' }: MarketListingCardProps) {
  if (!event) return <p>{emptyMessage}</p>

  const mapQuery = marketMapQuery(event.address, event.location, event.locationName)
  const location = event.location ?? event.locationName

  return (
    <article className="market-listing-card">
      <div>
        <h2 id={headingId}>{event.title}</h2>
        <p>{formatMarketDate(event.startsAt)}{location ? ` · ${location}` : ''}</p>
        {event.address ? <p className="market-listing-card__address">{event.address}</p> : null}
        {event.description ? <p>{event.description}</p> : null}
        {event.externalUrl ? <a href={event.externalUrl} target="_blank" rel="noreferrer">Event details</a> : null}
      </div>
      {mapQuery ? <GoogleMapsThumbnail query={mapQuery} label={`${mapLabelPrefix} ${event.title} in Google Maps`} /> : null}
    </article>
  )
}

function GoogleMapsThumbnail({ query, label }: { query: string; label: string }) {
  const encodedQuery = encodeURIComponent(query)
  return (
    <a className="google-map-thumbnail" href={`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`} target="_blank" rel="noreferrer" aria-label={label}>
      <iframe title="Google Maps preview" src={`https://maps.google.com/maps?q=${encodedQuery}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <span>Open map</span>
    </a>
  )
}

function marketMapQuery(address?: string, location?: string, locationName?: string): string | null {
  const query = address?.trim() || location?.trim() || locationName?.trim()
  return query || null
}

function formatMarketDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
