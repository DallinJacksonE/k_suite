import type { FormEvent } from 'react'
import { useState } from 'react'
import type { MarketEventInput, MarketEventRecord } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface MarketsDashboardProps {
  events: MarketEventRecord[]
  busy: boolean
  onCreate(input: MarketEventInput): Promise<boolean> | boolean
  onUpdate(eventId: string, input: Partial<MarketEventInput>): void
  onDelete(eventId: string): void
  onRefresh(): void
}

export function MarketsDashboard({ events, busy, onCreate, onUpdate, onDelete, onRefresh }: MarketsDashboardProps) {
  const [draft, setDraft] = useState<MarketEventInput>(emptyMarketDraft())
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  async function saveDraft() {
    const saved = await onCreate(draft)
    if (saved) setDraft(emptyMarketDraft())
  }

  return (
    <div className="category-stack">
      <Panel title="Add market date" description="Create upcoming markets with a title, date, time, and location.">
        <MarketEventForm event={draft} busy={busy} submitLabel="Create market date" onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onSubmit={() => void saveDraft()} />
      </Panel>

      <Panel title="Market dates" description="Click a market date to edit or delete it inline.">
        <button type="button" onClick={onRefresh} disabled={busy}>Refresh market dates</button>
        {events.length ? (
          <ul className="result-list product-result-list">
            {events.map((event) => {
              const selected = selectedEventId === event.id
              return (
                <li key={event.id} className={selected ? 'product-listing selected' : 'product-listing'}>
                  <button type="button" className="product-listing-summary" onClick={() => setSelectedEventId(selected ? null : event.id)} aria-expanded={selected}>
                    <span className="product-listing-main"><strong>{event.title}</strong><span>{event.location}</span></span>
                    <span>{formatMarketDate(event.startsAt)}</span>
                    <span className="dropdown-indicator">{selected ? 'Close editor' : 'Edit market date'}</span>
                  </button>
                  {selected ? <MarketInlineEditor event={event} busy={busy} onUpdate={onUpdate} onDelete={onDelete} /> : null}
                </li>
              )
            })}
          </ul>
        ) : <p>No market dates loaded.</p>}
      </Panel>
    </div>
  )
}

function MarketInlineEditor({ event, busy, onUpdate, onDelete }: { event: MarketEventRecord; busy: boolean; onUpdate(eventId: string, input: Partial<MarketEventInput>): void; onDelete(eventId: string): void }) {
  const [edit, setEdit] = useState<MarketEventInput>(toFormEvent(event))
  return (
    <MarketEventForm
      event={edit}
      busy={busy}
      submitLabel="Save market date"
      onChange={(patch) => setEdit((current) => ({ ...current, ...patch }))}
      onSubmit={() => onUpdate(event.id, edit)}
      onDelete={() => window.confirm('Delete this market date?') && onDelete(event.id)}
    />
  )
}

function MarketEventForm({ event, busy, submitLabel, onChange, onSubmit, onDelete }: { event: MarketEventInput; busy: boolean; submitLabel: string; onChange(patch: Partial<MarketEventInput>): void; onSubmit(): void; onDelete?(): void }) {
  const submit = (formEvent: FormEvent<HTMLFormElement>) => { formEvent.preventDefault(); onSubmit() }
  return (
    <form onSubmit={submit} className="form-grid">
      <label>Title<input value={event.title} onChange={(change) => onChange({ title: change.target.value })} /></label>
      <label>Location<input value={event.location} onChange={(change) => onChange({ location: change.target.value })} /></label>
      <label>Date<input type="date" value={datePart(event.startsAt)} onChange={(change) => onChange({ startsAt: combineDateAndTime(change.target.value, timePart(event.startsAt)) })} /></label>
      <label>Time<input type="time" value={timePart(event.startsAt)} onChange={(change) => onChange({ startsAt: combineDateAndTime(datePart(event.startsAt), change.target.value) })} /></label>
      <div className="button-row full-width"><button type="submit" disabled={busy}>{submitLabel}</button>{onDelete ? <button type="button" className="danger-button" onClick={onDelete} disabled={busy}>Delete market date</button> : null}</div>
    </form>
  )
}

function emptyMarketDraft(): MarketEventInput {
  return { title: '', location: '', startsAt: combineDateAndTime('', '') }
}

function toFormEvent(event: MarketEventRecord): MarketEventInput {
  return { title: event.title, location: event.location, startsAt: toLocalDateTimeValue(event.startsAt), endsAt: event.endsAt, description: event.description, externalUrl: event.externalUrl }
}

function formatMarketDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function datePart(value: string): string { return value.slice(0, 10) }
function timePart(value: string): string { return value.slice(11, 16) }
function combineDateAndTime(date: string, time: string): string { return date && time ? `${date}T${time}` : date ? `${date}T00:00` : '' }
function toLocalDateTimeValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
