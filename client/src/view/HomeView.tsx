import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClientShell } from '../components/layout/ClientShell'
import { MarketListingCard } from '../components/markets/MarketListingCard'
import { HomePresenter, type HomePresenterView } from '../presenters/HomePresenter'
import { FetchClientApiService } from '../service/ClientApiService'
import type { HomeViewModel } from '../service/ClientTypes'

const emptyHome: HomeViewModel = {
  nextMarket: null,
}

interface exploreLinks {
  imageURL: string;
  link: string;
  text: string;
}

export function HomeView() {
  const presenter = useMemo(() => new HomePresenter(new FetchClientApiService()), [])
  const [home, setHome] = useState<HomeViewModel>(emptyHome)
  const exploreCard: exploreLinks[] = [
    { imageURL: "imageURL", link: "/patterns", text: "Patterns" },
    { imageURL: "imageURL", link: "/plushies", text: "Plushies" },
    { imageURL: "imageURL", link: "/blog", text: "Blog" }
  ]

  useEffect(() => {
    const view: HomePresenterView = { setHome }
    presenter.attach(view)
    void presenter.refreshHome()
    return () => presenter.detach()
  }, [presenter])

  return (
    <ClientShell>
      <section className="home-hero page-card">
        <h1>Kaylie's Creations</h1>
        <div className="home-hero__actions">
        </div>
      </section>

      <section className="page-card" aria-labelledby="featured-heading">
        <p className="eyebrow">Explore the Community</p>
        <div className="featured-grid">
          {exploreCard.map((card) => (
            <article className="featured-card" key={card.text}>
              <img src={card.imageURL} alt="featured" />
              <Link className="cta-link" to={card.link}>{card.text}</Link>
            </article>
          ))}
        </div>

      </section>

      <section className="page-card" aria-labelledby="next-market-heading">
        <p className="eyebrow">Next market</p>
        {home.nextMarket ? (
          <MarketListingCard event={home.nextMarket} headingId="next-market-heading" />
        ) : (
          <>
            <h2 id="next-market-heading">Market calendar coming soon</h2>
            <p>Check back for upcoming event dates.</p>
          </>
        )}
      </section>

      <section className='page-card' aria-labelledby='aboutme'>
        <p>I'm Kaylie.</p>
        <p>Welcome to my creative corner! I am so gald you are here. I started crocheting when I was 9 years old, started selling my plushies at 13, and started selling patterns at 18. I love all things crafty and creative. Checkout my patterns, ready to go plushies, my blog, and free tutorials!</p>
      </section>
    </ClientShell>
  )
}
