import { useMemo, useState } from 'react'
import type { CartItemInput, ClientSessionState, Product, ProductSize } from '../../service/ClientTypes'

interface ProductDetailModalProps {
  product: Product
  session: ClientSessionState
  onClose(): void
  onAddToCart(input: Omit<CartItemInput, 'productId' | 'productType'>): Promise<void>
}

interface ProductCarouselImage {
  url: string
  label: string
  colorName?: string
}

export function ProductDetailModal({ product, session, onClose, onAddToCart }: ProductDetailModalProps) {
  const carouselImages = useMemo(() => buildCarouselImages(product), [product])
  const [quantity, setQuantity] = useState(1)
  const [selectedColor, setSelectedColor] = useState(product.type === 'plushie' ? product.colorVariations[0]?.name ?? '' : '')
  const [selectedSize, setSelectedSize] = useState<ProductSize | ''>(product.sizes[0] ?? '')
  const [clientInstructions, setClientInstructions] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const patternBlocked = product.type === 'pattern' && session.status !== 'authenticated'
  const addLabel = useMemo(() => patternBlocked ? 'Log in to buy patterns' : 'Add to cart', [patternBlocked])
  const activeImage = carouselImages[activeImageIndex] ?? carouselImages[0]
  const hasCarouselControls = carouselImages.length > 1

  const selectColor = (colorName: string) => {
    setSelectedColor(colorName)
    const colorImageIndex = carouselImages.findIndex((image) => image.colorName === colorName)
    if (colorImageIndex >= 0) setActiveImageIndex(colorImageIndex)
  }

  const moveCarousel = (direction: -1 | 1) => {
    setActiveImageIndex((current) => (current + direction + carouselImages.length) % carouselImages.length)
  }

  return (
    <div className="productDetailModal" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onClick={onClose}>
      <div className="productDetailModalPanel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="productDetailModalClose" onClick={onClose} aria-label="Close product details">×</button>
        <figure className="productDetailCarousel" aria-label={`${product.title} images`}>
          <div className="productDetailCarouselStage">
            <img src={activeImage.url} alt={activeImage.label} />
            {hasCarouselControls ? (
              <div className="productDetailCarouselControls">
                <button type="button" onClick={() => moveCarousel(-1)} aria-label="Previous product image">‹</button>
                <button type="button" onClick={() => moveCarousel(1)} aria-label="Next product image">›</button>
              </div>
            ) : null}
          </div>
          {hasCarouselControls ? (
            <div className="productDetailCarouselThumbs" aria-label="Choose product image">
              {carouselImages.map((image, index) => (
                <button
                  type="button"
                  key={`${image.url}-${image.colorName ?? index}`}
                  className={index === activeImageIndex ? 'productDetailCarouselThumbActive' : 'productDetailCarouselThumb'}
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`Show ${image.label}`}
                  aria-current={index === activeImageIndex ? 'true' : undefined}
                >
                  <img src={image.url} alt="" />
                  <span>{image.colorName ?? 'Main'}</span>
                </button>
              ))}
            </div>
          ) : null}
        </figure>
        <h2 id="product-detail-title">{product.title}</h2>
        <p>{product.description}</p>
        {product.type === 'plushie' ? (
          <label>Color
            <select value={selectedColor} onChange={(event) => selectColor(event.target.value)}>
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
        <button className="productDetailAddButton" type="button" disabled={patternBlocked} onClick={() => onAddToCart({ quantity, selectedColor: selectedColor || undefined, colorVariation: selectedColor || undefined, selectedSize: selectedSize || undefined, clientInstructions })}>
          {addLabel}
        </button>
      </div>
    </div>
  )
}

function buildCarouselImages(product: Product): ProductCarouselImage[] {
  const images: ProductCarouselImage[] = [{ url: product.thumbnailImage, label: `${product.title} main image` }]
  if (product.type !== 'plushie') return images

  for (const variation of product.colorVariations) {
    if (!variation.imageUrl || images.some((image) => image.url === variation.imageUrl)) continue
    images.push({ url: variation.imageUrl, label: `${product.title} in ${variation.name}`, colorName: variation.name })
  }
  return images
}
