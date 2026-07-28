import type { FormEvent } from 'react'
import { useState } from 'react'
import type { ProductColorVariation, ProductRecord, ProductSize, ProductType, UpdateProductInput } from '../../service/AdminApiService'
import type { ProductFormInput } from '../../presenter/AdminDashboardPresenter'
import { Panel } from '../layout/Panel'

interface ProductDashboardProps {
  productType: ProductType
  products: ProductRecord[]
  busy: boolean
  onCreate(input: ProductFormInput): Promise<boolean> | boolean
  onUpdate(productId: string, input: UpdateProductInput): void
  onDelete(productId: string): void
  onUploadImage(file: File | null): Promise<string>
  onUploadPdf(file: File | null): Promise<string>
  onRefresh(): void
}

export function ProductDashboard({ productType, products, busy, onCreate, onUpdate, onDelete, onUploadImage, onUploadPdf, onRefresh }: ProductDashboardProps) {
  const productLabel = productType === 'plushie' ? 'plushie' : 'pattern'
  const productTitle = productType === 'plushie' ? 'Plushie products' : 'Pattern products'
  const productDescription = productType === 'plushie'
    ? 'Add finished plushies or click an existing plushie to edit colors, sizes, and inventory inline.'
    : 'Add downloadable pattern listings or click an existing pattern to edit the PDF and storefront copy inline.'
  const visibleProducts = products.filter((product) => product.type === productType)
  const [thumbnailImage, setThumbnailImage] = useState('')
  const [pdfKey, setPdfKey] = useState('')
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [colorVariations, setColorVariations] = useState<ProductColorVariation[]>([{ name: '' }])
  const [sizes, setSizes] = useState<ProductSize[]>([])

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const saved = await onCreate({
      type: productType,
      title: read(fields, 'title'),
      price: read(fields, 'price'),
      salePrice: read(fields, 'salePrice'),
      isSaleItem: fields.get('isSaleItem') === 'on',
      description: read(fields, 'description'),
      thumbnailImage,
      available: fields.get('available') === 'on',
      readyToShip: productType === 'plushie' && fields.get('readyToShip') === 'on',
      sizes: productType === 'plushie' ? sizes : [],
      tags: read(fields, 'tags'),
      inventoryCount: productType === 'plushie' ? read(fields, 'inventoryCount') : undefined,
      colorVariations: productType === 'plushie' ? colorVariations : [],
      pdfKey: productType === 'pattern' ? pdfKey : '',
    })
    if (saved) resetCreateForm()
  }

  const resetCreateForm = () => {
    setThumbnailImage('')
    setPdfKey('')
    setColorVariations([{ name: '' }])
    setSizes([])
    setCreatingProduct(false)
  }

  const updateColorVariation = (index: number, patch: Partial<ProductColorVariation>) => {
    setColorVariations((current) => updateVariationAt(current, index, patch))
  }
  const removeColorVariation = (index: number) => {
    setColorVariations((current) => removeVariationAt(current, index))
  }
  const toggleProduct = (productId: string) => {
    setSelectedProductId((current) => current === productId ? null : productId)
    setCreatingProduct(false)
  }

  return (
    <div className="category-stack">
      <Panel title={productTitle} description={productDescription}>
        <div className="button-row">
          <button type="button" onClick={() => { setCreatingProduct((current) => !current); setSelectedProductId(null) }} disabled={busy}>{creatingProduct ? `Close new ${productLabel} form` : `New ${productLabel}`}</button>
          <button type="button" onClick={onRefresh} disabled={busy}>Refresh products</button>
        </div>
        {creatingProduct ? (
          <div className="product-listing selected">
            <form onSubmit={(event) => void submitCreate(event)} className="form-grid two-column">
              <label>Title<input name="title" required /></label>
              <label>Price<input name="price" type="number" min="0.01" step="0.01" required /></label>
              <label className="checkbox-label">Sale item<input name="isSaleItem" type="checkbox" /></label>
              <label>Sale price<input name="salePrice" type="number" min="0.01" step="0.01" /></label>
              <label>Tags<input name="tags" placeholder="featured, market" /></label>
              {productType === 'plushie' ? <><label>Inventory count<input name="inventoryCount" type="number" min="0" step="1" /></label><SizePicker sizes={sizes} onChange={setSizes} /></> : null}
              <label className="full-width">Description<textarea name="description" rows={4} required /></label>
              <UploadControl label="Product image" accept="image/*" onUpload={async (file) => setThumbnailImage(await onUploadImage(file))} />
              {thumbnailImage ? <img className="image-preview" src={thumbnailImage} alt="Uploaded product preview" /> : null}
              {productType === 'plushie' ? (
                <div className="full-width color-variation-stack">
                  <h3>Color variations</h3>
                  {colorVariations.map((variation, index) => (
                    <ColorVariationRow key={index} variation={variation} canRemove={colorVariations.length > 1} onChange={(patch) => updateColorVariation(index, patch)} onRemove={() => removeColorVariation(index)} onUploadImage={onUploadImage} />
                  ))}
                  <button type="button" onClick={() => setColorVariations((current) => [...current, { name: '' }])}>Add color</button>
                  <label className="checkbox-label">Ready to ship<input name="readyToShip" type="checkbox" /></label>
                </div>
              ) : (
                <><UploadControl label="Pattern PDF" accept="application/pdf" onUpload={async (file) => setPdfKey(await onUploadPdf(file))} /><label>PDF key<input value={pdfKey} onChange={(event) => setPdfKey(event.target.value)} required /></label></>
              )}
              <label className="checkbox-label">Available<input name="available" type="checkbox" defaultChecked /></label>
              <div className="button-row full-width"><button type="submit" disabled={busy}>Create {productLabel}</button><button type="button" onClick={resetCreateForm} disabled={busy}>Cancel</button></div>
            </form>
          </div>
        ) : null}
        {visibleProducts.length ? (
          <ul className="result-list product-result-list">
            {visibleProducts.map((product) => {
              const selected = selectedProductId === product.id
              return (
                <li key={product.id} className={selected ? 'product-listing selected' : 'product-listing'}>
                  <button type="button" className="product-listing-summary" onClick={() => toggleProduct(product.id)} aria-expanded={selected}>
                    <span className="product-listing-main"><strong>{product.title}</strong><span>{product.type} · {product.id}</span></span>
                    <span>{product.isSaleItem ? `Sale ${formatPrice(product.salePrice ?? product.price)} · was ${formatPrice(product.price)}` : formatPrice(product.price)}</span>
                    {product.type === 'plushie' ? <span>{product.inventoryCount === undefined ? 'Inventory: unlimited' : `Inventory: ${product.inventoryCount}`}</span> : null}
                    <span>{product.description}</span>
                    {product.type === 'plushie' ? <span>{formatVariations(product.colorVariations ?? [])}</span> : null}
                    {product.thumbnailImage ? <img className="thumb-preview" src={product.thumbnailImage} alt="" /> : null}
                    <span className="dropdown-indicator">{selected ? 'Close editor' : 'Edit listing'}</span>
                  </button>
                  {selected ? <ProductInlineEditor product={product} busy={busy} onUpdate={onUpdate} onDelete={onDelete} onUploadImage={onUploadImage} onUploadPdf={onUploadPdf} /> : null}
                </li>
              )
            })}
          </ul>
        ) : <p>No {productLabel} products loaded.</p>}
      </Panel>
    </div>
  )
}

function ProductInlineEditor({ product, busy, onUpdate, onDelete, onUploadImage, onUploadPdf }: {
  product: ProductRecord
  busy: boolean
  onUpdate(productId: string, input: UpdateProductInput): void
  onDelete(productId: string): void
  onUploadImage(file: File | null): Promise<string>
  onUploadPdf(file: File | null): Promise<string>
}) {
  const [thumbnailImage, setThumbnailImage] = useState(product.thumbnailImage)
  const [pdfKey, setPdfKey] = useState(product.pdfKey ?? '')
  const [colorVariations, setColorVariations] = useState<ProductColorVariation[]>(product.colorVariations?.length ? product.colorVariations : [{ name: '' }])
  const [sizes, setSizes] = useState<ProductSize[]>(product.sizes ?? [])

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const update: UpdateProductInput = {
      title: read(fields, 'title'),
      price: Number(read(fields, 'price')),
      salePrice: optionalNumber(read(fields, 'salePrice')),
      isSaleItem: fields.get('isSaleItem') === 'on',
      description: read(fields, 'description'),
      thumbnailImage,
      available: fields.get('available') === 'on',
      tags: parseTags(read(fields, 'tags')),
    }
    if (product.type === 'plushie') {
      update.readyToShip = fields.get('readyToShip') === 'on'
      update.colorVariations = colorVariations
      update.inventoryCount = optionalNumber(read(fields, 'inventoryCount'))
      update.sizes = sizes
    }
    if (product.type === 'pattern') update.pdfKey = pdfKey
    onUpdate(product.id, update)
  }

  const updateColorVariation = (index: number, patch: Partial<ProductColorVariation>) => {
    setColorVariations((current) => updateVariationAt(current, index, patch))
  }
  const removeColorVariation = (index: number) => {
    setColorVariations((current) => removeVariationAt(current, index))
  }

  return (
    <form onSubmit={submitEdit} className="form-grid two-column product-inline-editor">
      <label>Title<input name="title" defaultValue={product.title} required /></label>
      <label>Price<input name="price" type="number" min="0.01" step="0.01" defaultValue={product.price} required /></label>
      <label>Sale price<input name="salePrice" type="number" min="0.01" step="0.01" defaultValue={product.salePrice ?? ''} /></label>
      <label>Tags<input name="tags" defaultValue={product.tags?.join(', ') ?? ''} /></label>
      {product.type === 'plushie' ? <><label>Inventory count<input name="inventoryCount" type="number" min="0" step="1" defaultValue={product.inventoryCount ?? ''} /></label><SizePicker sizes={sizes} onChange={setSizes} /></> : null}
      <label className="full-width">Description<textarea name="description" rows={3} defaultValue={product.description} required /></label>
      <UploadControl label="Replace product image" accept="image/*" onUpload={async (file) => setThumbnailImage(await onUploadImage(file))} />
      {thumbnailImage ? <img className="image-preview" src={thumbnailImage} alt="Selected product preview" /> : null}
      {product.type === 'plushie' ? (
        <div className="full-width color-variation-stack">
          <h3>Edit color variations</h3>
          {colorVariations.map((variation, index) => (
            <ColorVariationRow
              key={index}
              variation={variation}
              canRemove={colorVariations.length > 1}
              onChange={(patch) => updateColorVariation(index, patch)}
              onRemove={() => removeColorVariation(index)}
              onUploadImage={onUploadImage}
            />
          ))}
          <button type="button" onClick={() => setColorVariations((current) => [...current, { name: '' }])}>Add color</button>
          <label className="checkbox-label">Ready to ship<input name="readyToShip" type="checkbox" defaultChecked={product.readyToShip} /></label>
        </div>
      ) : (
        <><UploadControl label="Replace pattern PDF" accept="application/pdf" onUpload={async (file) => setPdfKey(await onUploadPdf(file))} /><label>PDF key<input value={pdfKey} onChange={(event) => setPdfKey(event.target.value)} required /></label></>
      )}
      <label className="checkbox-label">Available<input name="available" type="checkbox" defaultChecked={product.available} /></label>
      <label className="checkbox-label">Sale item<input name="isSaleItem" type="checkbox" defaultChecked={product.isSaleItem} /></label>
      <div className="button-row full-width">
        <button type="submit" disabled={busy}>Save edits</button>
        <button type="button" className="danger-button" onClick={() => window.confirm('Delete this product listing?') && onDelete(product.id)} disabled={busy}>Delete product</button>
      </div>
    </form>
  )
}

function ColorVariationRow({ variation, canRemove, onChange, onRemove, onUploadImage }: {
  variation: ProductColorVariation
  canRemove: boolean
  onChange(patch: Partial<ProductColorVariation>): void
  onRemove(): void
  onUploadImage(file: File | null): Promise<string>
}) {
  return (
    <div className="color-variation-row">
      <label>Color name<input value={variation.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="brown" /></label>
      <UploadControl label="Optional color image" accept="image/*" onUpload={async (file) => onChange({ imageUrl: await onUploadImage(file) })} />
      {variation.imageUrl ? <img className="thumb-preview" src={variation.imageUrl} alt={`${variation.name} variation`} /> : <span className="muted-text">No image linked</span>}
      <button type="button" className="danger-button" onClick={onRemove} disabled={!canRemove}>Remove</button>
    </div>
  )
}

const productSizeOptions: ProductSize[] = ['extra-small', 'small', 'medium', 'large', 'extra-large']

function SizePicker({ sizes, onChange }: { sizes: ProductSize[]; onChange(sizes: ProductSize[]): void }) {
  return (
    <fieldset className="full-width checkbox-group">
      <legend>Sizes</legend>
      <span>
        {productSizeOptions.map((size) => (
          <label key={size} className="checkbox-label">
            {size}
            <input
              type="checkbox"
              checked={sizes.includes(size)}
              onChange={(event) => onChange(event.target.checked ? [...sizes, size] : sizes.filter((current) => current !== size))}
            />
          </label>
        ))}
      </span>
    </fieldset>
  )
}

function UploadControl({ label, accept, onUpload }: { label: string; accept: string; onUpload(file: File | null): Promise<void> }) {
  return <label>{label}<input type="file" accept={accept} onChange={(event) => void onUpload(event.currentTarget.files?.[0] ?? null)} /></label>
}
function updateVariationAt(variations: ProductColorVariation[], index: number, patch: Partial<ProductColorVariation>): ProductColorVariation[] {
  return variations.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
}
function removeVariationAt(variations: ProductColorVariation[], index: number): ProductColorVariation[] {
  return variations.length === 1 ? variations : variations.filter((_, itemIndex) => itemIndex !== index)
}
function formatVariations(variations: ProductColorVariation[]): string {
  return variations.map((variation) => variation.imageUrl ? `${variation.name} (image)` : variation.name).join(', ')
}
function read(fields: FormData, name: string): string { const value = fields.get(name); return typeof value === 'string' ? value : '' }
function optionalNumber(value: string): number | undefined { return value.trim() ? Number(value) : undefined }
function parseTags(value: string): string[] | undefined { const tags = value.split(',').map((tag) => tag.trim()).filter(Boolean); return tags.length ? tags : undefined }
function formatPrice(value: number): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
