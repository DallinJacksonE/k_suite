import type { Product } from '../../service/ClientTypes'

interface ProductCardProps {
  product: Product
  isPurchasedPattern?: boolean
  onSelect(product: Product): void
  onAccessPattern?(productId: string): void
}

export function ProductCard({ product, isPurchasedPattern = false, onSelect, onAccessPattern }: ProductCardProps) {
  const openProduct = () => {
    if (isPurchasedPattern && product.type === 'pattern') {
      onAccessPattern?.(product.id)
      return
    }
    onSelect(product)
  }

  return (
    <article className="product-card">
      <button type="button" onClick={openProduct} aria-label={isPurchasedPattern ? `Open purchased pattern ${product.title}` : `View ${product.title}`}>
        {product.type === 'pattern' ? <span className="pattern-pdf-ribbon">PATTERN PDF ONLY</span> : null}
        <img src={product.thumbnailImage} alt="" />
        <span className="eyebrow">{product.type}</span>
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        <Price product={product} />
        {product.isSaleItem ? <strong className="sale-badge">Sale</strong> : null}
        {product.sizes.length ? <span>Sizes: {product.sizes.join(', ')}</span> : null}
        {product.type === 'plushie' ? <span>Colors: {product.colorVariations.map((variation) => variation.name).join(', ')}</span> : null}
        <span className={isPurchasedPattern ? 'product-card-cta product-card-ctaPurchased' : 'product-card-cta'}>
          {isPurchasedPattern ? 'Already Purchased, See Pattern ->' : 'View details'}
        </span>
      </button>
    </article>
  )
}

function Price({ product }: { product: Product }) {
  if (product.salePrice !== undefined) {
    return <p><span>{formatPrice(product.salePrice)}</span> <del>{formatPrice(product.price)}</del></p>
  }
  return <p>{formatPrice(product.price)}</p>
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
