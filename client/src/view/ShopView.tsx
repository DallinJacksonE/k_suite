import { useEffect, useMemo, useState } from 'react'
import { ProductCard } from '../components/shop/ProductCard'
import { ProductDetailModal } from '../components/shop/ProductDetailModal'
import { ShopFilters } from '../components/shop/ShopFilters'
import { useClientSession } from '../components/auth/useClientSession'
import { ClientShell } from '../components/layout/ClientShell'
import { ShopPresenter, type ShopPresenterView } from '../presenters/ShopPresenter'
import { FetchClientApiService } from '../service/ClientApiService'
import type { CartItemInput, ProductSortDirection, ProductSortKey, ProductType, ShopProductFilters, ShopViewModel } from '../service/ClientTypes'

const emptyShop: ShopViewModel = {
  products: [],
  filters: { type: 'all' },
  sort: 'createdAt',
  direction: 'desc',
  hasMore: false,
  selectedProduct: null,
  purchasedPatternProductIds: [],
  availableColors: [],
  availableSizes: [],
}

interface ShopViewProps {
  productType?: ProductType | 'all'
  title?: string
  description?: string
}

export function ShopView({ productType = 'all', title = 'Browse plushies and patterns.', description = 'Filter products, open a listing for options, and add plushies as a guest or patterns as a signed-in customer.' }: ShopViewProps = {}) {
  const { session } = useClientSession()
  const presenter = useMemo(() => new ShopPresenter(new FetchClientApiService(), session, { productType }), [session, productType])
  const [shop, setShop] = useState<ShopViewModel>({ ...emptyShop, filters: { type: productType } })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const view: ShopPresenterView = { setShop, setBusy, setError }
    presenter.attach(view)
    void presenter.loadInitial()
    return () => presenter.detach()
  }, [presenter])

  const applyFilters = (filters: ShopProductFilters, sort?: ProductSortKey, direction?: ProductSortDirection) => {
    void presenter.applyFilters(filters, sort, direction)
  }

  const addToCart = async (input: Omit<CartItemInput, 'productId' | 'productType'>) => {
    await presenter.addSelectedToCart(input)
  }

  const openPatternAccess = async (productId: string) => {
    const download = await presenter.createPatternAccessLink(productId)
    if (download?.downloadUrl) window.open(download.downloadUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <ClientShell>
      <section className="page-card">
        <p className="eyebrow">Shop</p>
        <h1>{title}</h1>
        <p>{description}</p>
        {error ? <p className="shop-error">{error}</p> : null}
        {shop.notice ? <p className="shop-notice">{shop.notice}</p> : null}
      </section>

      <section className="page-card">
        <ShopFilters
          filters={shop.filters}
          fixedType={productType === 'all' ? undefined : productType}
          availableColors={shop.availableColors}
          availableSizes={shop.availableSizes}
          onApply={applyFilters}
        />
      </section>

      <section className="shop-grid" aria-label="Products">
        {shop.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isPurchasedPattern={product.type === 'pattern' && shop.purchasedPatternProductIds.includes(product.id)}
            onSelect={(selected) => presenter.selectProduct(selected)}
            onAccessPattern={(productId) => void openPatternAccess(productId)}
          />
        ))}
      </section>

      {shop.products.length === 0 && !busy ? <p>No products match these filters.</p> : null}
      {shop.hasMore ? <button type="button" className="cta-link shop-load-more" disabled={busy} onClick={() => void presenter.loadMore()}>{busy ? 'Loading...' : 'Load more'}</button> : null}

      {shop.selectedProduct ? (
        <ProductDetailModal product={shop.selectedProduct} session={session} onClose={() => presenter.selectProduct(null)} onAddToCart={addToCart} />
      ) : null}
    </ClientShell>
  )
}
