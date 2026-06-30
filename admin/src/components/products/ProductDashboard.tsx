import type { FormEvent } from 'react'
import { useState } from 'react'
import type { ProductColorVariation, ProductRecord, ProductSize, ProductType, UpdateProductInput } from '../../service/AdminApiService'
import type { ProductFormInput } from '../../presenter/AdminDashboardPresenter'
import { Panel } from '../layout/Panel'

interface ProductDashboardProps {
  products: ProductRecord[]
  busy: boolean
  onCreate(input: ProductFormInput): void
  onUpdate(productId: string, input: UpdateProductInput): void
  onDelete(productId: string): void
  onUploadImage(file: File | null): Promise<string>
  onUploadPdf(file: File | null): Promise<string>
  onRefresh(): void
}

export function ProductDashboard({ products, busy, onCreate, onUpdate, onDelete, onUploadImage, onUploadPdf, onRefresh }: ProductDashboardProps) {
  const [productType, setProductType] = useState<ProductType>('plushie')
  const [thumbnailImage, setThumbnailImage] = useState('')
  const [pdfKey, setPdfKey] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [colorVariations, setColorVariations] = useState<ProductColorVariation[]>([{ name: '' }])
  const [sizes, setSizes] = useState<ProductSize[]>([])

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onCreate({
      type: productType,
      title: read(fields, 'title'),
      price: read(fields, 'price'),
      salePrice: read(fields, 'salePrice'),
      isSaleItem: fields.get('isSaleItem') === 'on',
      description: read(fields, 'description'),
      thumbnailImage,
      available: fields.get('available') === 'on',
      readyToShip: fields.get('readyToShip') === 'on',
      sizes,
      tags: read(fields, 'tags'),
      inventoryCount: read(fields, 'inventoryCount'),
      colorVariations,
      pdfKey,
    })
  }

  const updateColorVariation = (index: number, patch: Partial<ProductColorVariation>) => {
    setColorVariations((current) => updateVariationAt(current, index, patch))
  }
  const removeColorVariation = (index: number) => {
    setColorVariations((current) => removeVariationAt(current, index))
  }
  const toggleProduct = (productId: string) => {
    setSelectedProductId((current) => current === productId ? null : productId)
  }

  return (
    <div className="category-stack">
      <Panel title="Create product listing" description="Upload images first; returned bucket URLs can be attached to the shop thumbnail and individual color variations.">
        <form onSubmit={submitCreate} className="form-grid two-column">
          <label>Type<select value={productType} onChange={(event) => setProductType(event.target.value as ProductType)}><option value="plushie">Plushie</option><option value="pattern">Pattern</option></select></label>
          <label>Title<input name="title" required /></label>
          <label>Price<input name="price" type="number" min="0.01" step="0.01" required /></label>
          <label>Sale price<input name="salePrice" type="number" min="0.01" step="0.01" /></label>
          <label>Inventory count<input name="inventoryCount" type="number" min="0" step="1" /></label>
          <label>Tags<input name="tags" placeholder="featured, market" /></label>
          <SizePicker sizes={sizes} onChange={setSizes} />
          <label className="full-width">Description<textarea name="description" rows={4} required /></label>
          <UploadControl label="Product image" accept="image/*" onUpload={async (file) => setThumbnailImage(await onUploadImage(file))} />
          {thumbnailImage ? <img className="image-preview" src={thumbnailImage} alt="Uploaded product preview" /> : null}
          {productType === 'plushie' ? (
            <div className="full-width color-variation-stack">
              <h3>Color variations</h3>
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
              <label className="checkbox-label"><input name="readyToShip" type="checkbox" />Ready to ship</label>
            </div>
          ) : (
            <><UploadControl label="Pattern PDF" accept="application/pdf" onUpload={async (file) => setPdfKey(await onUploadPdf(file))} /><label>PDF key<input value={pdfKey} onChange={(event) => setPdfKey(event.target.value)} required /></label></>
          )}
          <label className="checkbox-label"><input name="available" type="checkbox" defaultChecked />Available</label>
          <label className="checkbox-label"><input name="isSaleItem" type="checkbox" />Sale item</label>
          <button type="submit" disabled={busy}>Create product</button>
        </form>
      </Panel>

      <Panel title="Current products" description="Click a product to open its edit form inline.">
        <button type="button" onClick={onRefresh} disabled={busy}>Refresh products</button>
        {products.length ? (
          <ul className="result-list product-result-list">
            {products.map((product) => {
              const selected = selectedProductId === product.id
              return (
                <li key={product.id} className={selected ? 'product-listing selected' : 'product-listing'}>
                  <button type="button" className="product-listing-summary" onClick={() => toggleProduct(product.id)} aria-expanded={selected}>
                    <span className="product-listing-main"><strong>{product.title}</strong><span>{product.type} · {product.id}</span></span>
                    <span>{product.isSaleItem ? `Sale ${formatPrice(product.salePrice ?? product.price)} · was ${formatPrice(product.price)}` : formatPrice(product.price)}</span>
                    <span>{product.inventoryCount === undefined ? 'Inventory: unlimited' : `Inventory: ${product.inventoryCount}`}</span>
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
        ) : <p>No products loaded.</p>}
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
      sizes,
      tags: parseTags(read(fields, 'tags')),
      inventoryCount: optionalNumber(read(fields, 'inventoryCount')),
    }
    if (product.type === 'plushie') {
      update.readyToShip = fields.get('readyToShip') === 'on'
      update.colorVariations = colorVariations
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
      <label>Inventory count<input name="inventoryCount" type="number" min="0" step="1" defaultValue={product.inventoryCount ?? ''} /></label>
      <label>Tags<input name="tags" defaultValue={product.tags?.join(', ') ?? ''} /></label>
      <SizePicker sizes={sizes} onChange={setSizes} />
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
          <label className="checkbox-label"><input name="readyToShip" type="checkbox" defaultChecked={product.readyToShip} />Ready to ship</label>
        </div>
      ) : (
        <><UploadControl label="Replace pattern PDF" accept="application/pdf" onUpload={async (file) => setPdfKey(await onUploadPdf(file))} /><label>PDF key<input value={pdfKey} onChange={(event) => setPdfKey(event.target.value)} required /></label></>
      )}
      <label className="checkbox-label"><input name="available" type="checkbox" defaultChecked={product.available} />Available</label>
      <label className="checkbox-label"><input name="isSaleItem" type="checkbox" defaultChecked={product.isSaleItem} />Sale item</label>
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
      {productSizeOptions.map((size) => (
        <label key={size} className="checkbox-label">
          <input
            type="checkbox"
            checked={sizes.includes(size)}
            onChange={(event) => onChange(event.target.checked ? [...sizes, size] : sizes.filter((current) => current !== size))}
          />
          {size}
        </label>
      ))}
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
