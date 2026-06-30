import { useEffect, useMemo, useState } from 'react'
import { ProductCard } from '../components/shop/ProductCard'
import { ProductDetailModal } from '../components/shop/ProductDetailModal'
import { ShopFilters } from '../components/shop/ShopFilters'
import { useClientSession } from '../components/auth/useClientSession'
import { ClientShell } from '../components/layout/ClientShell'
import { ShopPresenter, type ShopPresenterView } from '../presenters/ShopPresenter'
import { FetchClientApiService } from '../service/ClientApiService'
import type { CartItemInput, ProductSortDirection, ProductSortKey, ShopProductFilters, ShopViewModel } from '../service/ClientTypes'

const emptyShop: ShopViewModel = {
  products: [],
  filters: { type: 'all' },
  hasMore: false,
  selectedProduct: null,
}

export function ShopView() {
  const { session } = useClientSession()
  const presenter = useMemo(() => new ShopPresenter(new FetchClientApiService(), session), [session])
  const [shop, setShop] = useState<ShopViewModel>(emptyShop)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const view: ShopPresenterView = { setShop, setBusy, setError }
    presenter.attach(view)
    void presenter.loadInitial()
    return () => presenter.detach()
  }, [presenter])

  const applyFilters = (filters: ShopProductFilters, sort?: ProductSortKey, direction?: ProductSortDirection) => {
    void presenter.applyFilters(filters)
    void sort
    void direction
  }

  const addToCart = async (input: Omit<CartItemInput, 'productId' | 'productType'>) => {
    await presenter.addSelectedToCart(input)
  }

  return (
    <ClientShell>
      <section className="page-card">
        <p className="eyebrow">Shop</p>
        <h1>Browse plushies and patterns.</h1>
        <p>Filter products, open a listing for options, and add plushies as a guest or patterns as a signed-in customer.</p>
        {error ? <p className="shop-error">{error}</p> : null}
        {shop.notice ? <p className="shop-notice">{shop.notice}</p> : null}
      </section>

      <section className="page-card">
        <ShopFilters filters={shop.filters} onApply={applyFilters} />
      </section>

      <section className="shop-grid" aria-label="Products">
        {shop.products.map((product) => <ProductCard key={product.id} product={product} onSelect={(selected) => presenter.selectProduct(selected)} />)}
      </section>

      {shop.products.length === 0 && !busy ? <p>No products match these filters.</p> : null}
      {shop.hasMore ? <button type="button" className="cta-link shop-load-more" disabled={busy} onClick={() => void presenter.loadMore()}>{busy ? 'Loading...' : 'Load more'}</button> : null}

      {shop.selectedProduct ? (
        <ProductDetailModal product={shop.selectedProduct} session={session} onClose={() => presenter.selectProduct(null)} onAddToCart={addToCart} />
      ) : null}
    </ClientShell>
  )
}
