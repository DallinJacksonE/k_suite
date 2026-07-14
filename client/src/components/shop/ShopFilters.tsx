import { useState, type FormEvent } from 'react'
import type { ProductSize, ProductSortDirection, ProductSortKey, ProductType, ShopProductFilters, ShopProductTypeFilter } from '../../service/ClientTypes'

interface ShopFiltersProps {
  filters: ShopProductFilters
  fixedType?: ProductType
  onApply(filters: ShopProductFilters, sort?: ProductSortKey, direction?: ProductSortDirection): void
}

const sizeOptions: ProductSize[] = ['extra-small', 'small', 'medium', 'large', 'extra-large']

export function ShopFilters({ filters, fixedType, onApply }: ShopFiltersProps) {
  const [type, setType] = useState<ShopProductTypeFilter>(fixedType ?? filters.type ?? 'all')
  const [saleOnly, setSaleOnly] = useState(Boolean(filters.saleOnly))
  const [color, setColor] = useState(filters.color ?? '')
  const [size, setSize] = useState<ProductSize | ''>(filters.size ?? '')
  const [sort, setSort] = useState<ProductSortKey>('createdAt')
  const [direction, setDirection] = useState<ProductSortDirection>('desc')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onApply({ type: fixedType ?? type, saleOnly: saleOnly || undefined, color: color.trim() || undefined, size: size || undefined }, sort, direction)
  }

  const clearFilters = () => {
    const clearedType = fixedType ?? 'all'
    setType(clearedType)
    setSaleOnly(false)
    setColor('')
    setSize('')
    setSort('createdAt')
    setDirection('desc')
    onApply({ type: clearedType }, 'createdAt', 'desc')
  }

  return (
    <form className="shopFiltersForm" onSubmit={submit}>
      <div className="shopFiltersControls">
        {fixedType ? null : <label className="shopFiltersField">Type
          <select value={type} onChange={(event) => setType(event.target.value as ShopProductTypeFilter)}>
            <option value="all">All</option>
            <option value="plushie">Plushies</option>
            <option value="pattern">Patterns</option>
          </select>
        </label>}
        <label className="shopFiltersField">Color<input value={color} onChange={(event) => setColor(event.target.value)} placeholder="blue" /></label>
        <label className="shopFiltersField">Size
          <select value={size} onChange={(event) => setSize(event.target.value as ProductSize | '')}>
            <option value="">Any</option>
            {sizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="shopFiltersField">Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as ProductSortKey)}>
            <option value="createdAt">Newest</option>
            <option value="price">Price</option>
            <option value="title">Title</option>
          </select>
        </label>
        <label className="shopFiltersField">Direction
          <select value={direction} onChange={(event) => setDirection(event.target.value as ProductSortDirection)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <label className="shopFiltersCheckboxField"><input type="checkbox" checked={saleOnly} onChange={(event) => setSaleOnly(event.target.checked)} />Sale only</label>
        <button className="shopFiltersApplyButton" type="submit">Apply filters</button>
      </div>
      <button className="shopFiltersClearButton" type="button" onClick={clearFilters}>Clear filters</button>
    </form>
  )
}
