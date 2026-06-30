import { useMemo, useState } from 'react'
import type { CartItemInput, ClientSessionState, Product, ProductSize } from '../../service/ClientTypes'

interface ProductDetailModalProps {
  product: Product
  session: ClientSessionState
  onClose(): void
  onAddToCart(input: Omit<CartItemInput, 'productId' | 'productType'>): Promise<void>
}

export function ProductDetailModal({ product, session, onClose, onAddToCart }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedColor, setSelectedColor] = useState(product.type === 'plushie' ? product.colorVariations[0]?.name ?? '' : '')
  const [selectedSize, setSelectedSize] = useState<ProductSize | ''>(product.sizes[0] ?? '')
  const [clientInstructions, setClientInstructions] = useState('')
  const patternBlocked = product.type === 'pattern' && session.status !== 'authenticated'
  const addLabel = useMemo(() => patternBlocked ? 'Log in to buy patterns' : 'Add to cart', [patternBlocked])

  return (
    <div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
      <div className="product-modal__panel">
        <button type="button" className="product-modal__close" onClick={onClose}>Close</button>
        <img src={product.thumbnailImage} alt="" />
        <h2 id="product-detail-title">{product.title}</h2>
        <p>{product.description}</p>
        {product.type === 'plushie' ? (
          <label>Color
            <select value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)}>
              {product.colorVariations.map((variation) => <option key={variation.name} value={variation.name}>{variation.name}</option>)}
            </select>
          </label>
        ) : null}
        {product.sizes.length ? (
          <label>Size
            <select value={selectedSize} onChange={(event) => setSelectedSize(event.target.value as ProductSize)}>
              {product.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        ) : null}
        <label>Quantity<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <label>Notes<textarea value={clientInstructions} onChange={(event) => setClientInstructions(event.target.value)} /></label>
        {patternBlocked ? <p className="shop-notice">Please log in before buying patterns.</p> : null}
        <button type="button" disabled={patternBlocked} onClick={() => onAddToCart({ quantity, selectedColor: selectedColor || undefined, colorVariation: selectedColor || undefined, selectedSize: selectedSize || undefined, clientInstructions })}>
          {addLabel}
        </button>
      </div>
    </div>
  )
}
