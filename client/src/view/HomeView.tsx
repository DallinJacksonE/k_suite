import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusCard } from '../components/common/StatusCard'
import { ClientShell } from '../components/layout/ClientShell'
import { HomePresenter, type HomePresenterView } from '../presenters/HomePresenter'
import { FetchClientApiService } from '../service/ClientApiService'
import type { HomeViewModel } from '../service/ClientTypes'

const emptyHome: HomeViewModel = {
  featuredProducts: [],
  nextMarket: null,
}

export function HomeView() {
  const presenter = useMemo(() => new HomePresenter(new FetchClientApiService()), [])
  const [home, setHome] = useState<HomeViewModel>(emptyHome)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const view: HomePresenterView = { setHome, setBusy, setError }
    presenter.attach(view)
    void presenter.refreshHome()
    return () => presenter.detach()
  }, [presenter])

  return (
    <ClientShell>
      <section className="home-hero page-card">
        <p className="eyebrow">Handmade plushies and patterns</p>
        <h1>Soft goods, thoughtful patterns, and market-day updates.</h1>
        <p>
          Browse ready-to-ship plushies, sign in for pattern purchases, and keep an eye on the next local market.
        </p>
        <div className="home-hero__actions">
          <Link className="cta-link" to="/shop">Shop products</Link>
          <Link className="cta-link cta-link--secondary" to="/markets">Find markets</Link>
        </div>
      </section>

      <section className="page-card" aria-labelledby="featured-products-heading">
        <p className="eyebrow">Featured products</p>
        <h2 id="featured-products-heading">Fresh from the shop</h2>
        {home.featuredProducts.length > 0 ? (
          <div className="featured-grid">
            {home.featuredProducts.map((product) => (
              <article className="featured-card" key={product.id}>
                <img src={product.thumbnailImage} alt="" />
                <p className="eyebrow">{product.type}</p>
                <h3>{product.title}</h3>
                <p>{formatPrice(product.salePrice ?? product.price)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>{busy ? 'Loading featured products...' : 'Featured products will appear here soon.'}</p>
        )}
      </section>

      <section className="page-card" aria-labelledby="next-market-heading">
        <p className="eyebrow">Next market</p>
        <h2 id="next-market-heading">{home.nextMarket?.title ?? 'Market calendar coming soon'}</h2>
        <p>{home.nextMarket ? `${home.nextMarket.startsAt} · ${home.nextMarket.locationName}` : 'Check back for upcoming event dates.'}</p>
      </section>

      <StatusCard
        status="Client storefront shell is ready."
        error={error}
        backendStatus={busy ? 'Loading home content...' : 'Home content loaded'}
        busy={busy}
        onRefresh={() => void presenter.refreshHome()}
      />
    </ClientShell>
  )
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
