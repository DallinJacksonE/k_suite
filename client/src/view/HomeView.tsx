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

const patternExploreImage = '/images/rustyfox.jpg'
const plushieExploreImage = '/images/poohbear.JPG'
const blogExploreImage = '/images/chick.JPG'
const blanketBanner = '/images/bannerforwebsite.png'
const profileImage = '/images/profilepic.png'

interface ExploreLink {
  imageUrl: string
  imageAlt: string
  link: string
  text: string
}

const exploreCards: ExploreLink[] = [
  { imageUrl: patternExploreImage, imageAlt: 'Rust-colored crochet fox plushie', link: '/patterns', text: 'Patterns' },
  { imageUrl: plushieExploreImage, imageAlt: 'Crochet Pooh bear plushie', link: '/plushies', text: 'Plushies' },
  { imageUrl: blogExploreImage, imageAlt: 'Crochet chick plushie', link: '/blog', text: 'Blog' },
]

export function HomeView() {
  const presenter = useMemo(() => new HomePresenter(new FetchClientApiService()), [])
  const [home, setHome] = useState<HomeViewModel>(emptyHome)

  useEffect(() => {
    const view: HomePresenterView = { setHome }
    presenter.attach(view)
    void presenter.refreshHome()
    return () => presenter.detach()
  }, [presenter])

  return (
    <ClientShell>
      <section className="home-hero page-card" style={{ backgroundImage: `url(${blanketBanner})` }}>
        <h1>Kaylie's Creations</h1>
        <div className="home-hero__actions">
        </div>
      </section>

      <section className="page-card" aria-labelledby="featured-heading">
        <p className="eyebrow">Explore the Community</p>
        <div className="featured-grid">
          {exploreCards.map((card) => (
            <article className="featured-card" key={card.text}>
              <img src={card.imageUrl} alt={card.imageAlt} />
              <Link className="cta-link" to={card.link}>{card.text} {"->"}</Link>
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

      <section className="page-card home-about" aria-labelledby="aboutme">
        <div className="home-about__copy">
          <h2 id="aboutme">I'm Kaylie.</h2>
          <p>Welcome to my creative corner! I am so gald you are here. I started crocheting when I was 9 years old, started selling my plushies at 13, and started selling patterns at 18. I love all things crafty and creative. Checkout my patterns, ready to go plushies, my blog, and free tutorials!</p>
        </div>
        <img className="home-about__image" src={profileImage} alt="Kaylie smiling with a handmade crochet plushie" />
      </section>
    </ClientShell>
  )
}
