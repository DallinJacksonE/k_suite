import { useState, type FormEvent } from 'react'
import type { ProductSize, ProductSortDirection, ProductSortKey, ShopProductFilters, ShopProductTypeFilter } from '../../service/ClientTypes'

interface ShopFiltersProps {
  filters: ShopProductFilters
  onApply(filters: ShopProductFilters, sort?: ProductSortKey, direction?: ProductSortDirection): void
}

const sizeOptions: ProductSize[] = ['extra-small', 'small', 'medium', 'large', 'extra-large']

export function ShopFilters({ filters, onApply }: ShopFiltersProps) {
  const [type, setType] = useState<ShopProductTypeFilter>(filters.type ?? 'all')
  const [saleOnly, setSaleOnly] = useState(Boolean(filters.saleOnly))
  const [color, setColor] = useState(filters.color ?? '')
  const [size, setSize] = useState<ProductSize | ''>(filters.size ?? '')
  const [sort, setSort] = useState<ProductSortKey>('createdAt')
  const [direction, setDirection] = useState<ProductSortDirection>('desc')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onApply({ type, saleOnly: saleOnly || undefined, color: color.trim() || undefined, size: size || undefined }, sort, direction)
  }

  return (
    <form className="shop-filters" onSubmit={submit}>
      <label>Type
        <select value={type} onChange={(event) => setType(event.target.value as ShopProductTypeFilter)}>
          <option value="all">All</option>
          <option value="plushie">Plushies</option>
          <option value="pattern">Patterns</option>
        </select>
      </label>
      <label>Color<input value={color} onChange={(event) => setColor(event.target.value)} placeholder="blue" /></label>
      <label>Size
        <select value={size} onChange={(event) => setSize(event.target.value as ProductSize | '')}>
          <option value="">Any</option>
          {sizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>Sort
        <select value={sort} onChange={(event) => setSort(event.target.value as ProductSortKey)}>
          <option value="createdAt">Newest</option>
          <option value="price">Price</option>
          <option value="title">Title</option>
        </select>
      </label>
      <label>Direction
        <select value={direction} onChange={(event) => setDirection(event.target.value as ProductSortDirection)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
      <label className="checkbox-label"><input type="checkbox" checked={saleOnly} onChange={(event) => setSaleOnly(event.target.checked)} />Sale only</label>
      <button type="submit">Apply filters</button>
    </form>
  )
}
