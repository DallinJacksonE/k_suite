import { useEffect, useMemo, useState } from 'react'
import { ClientShell } from '../components/layout/ClientShell'
import { MarketCalendar } from '../components/markets/MarketCalendar'
import { NextMarketCard } from '../components/markets/NextMarketCard'
import { MarketsPresenter, type MarketsViewModel } from '../presenters/MarketsPresenter'
import { FetchClientApiService } from '../service/ClientApiService'

export function MarketsView() {
  const [model, setModel] = useState<MarketsViewModel>({ loading: true, events: [], nextEvent: null })
  const service = useMemo(() => new FetchClientApiService(), [])
  const presenter = useMemo(() => new MarketsPresenter(service, { renderMarkets: setModel }), [service])
  useEffect(() => { void presenter.load() }, [presenter])

  return (
    <ClientShell>
      <section className="page-card">
        <p className="eyebrow">Markets</p>
        <h1>Find us at upcoming markets.</h1>
        {model.loading ? <p>Loading markets…</p> : null}
        {model.error ? <p role="alert" className="form-error">{model.error}</p> : null}
        <div className="profile-grid">
          <NextMarketCard event={model.nextEvent} />
          <MarketCalendar events={model.events} />
        </div>
      </section>
    </ClientShell>
  )
}
