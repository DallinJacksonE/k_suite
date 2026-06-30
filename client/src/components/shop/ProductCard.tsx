import type { Product } from '../../service/ClientTypes'

interface ProductCardProps {
  product: Product
  onSelect(product: Product): void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <article className="product-card">
      <button type="button" onClick={() => onSelect(product)}>
        <img src={product.thumbnailImage} alt="" />
        <span className="eyebrow">{product.type}</span>
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        <Price product={product} />
        {product.isSaleItem ? <strong className="sale-badge">Sale</strong> : null}
        {product.sizes.length ? <span>Sizes: {product.sizes.join(', ')}</span> : null}
        {product.type === 'plushie' ? <span>Colors: {product.colorVariations.map((variation) => variation.name).join(', ')}</span> : null}
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)
}
