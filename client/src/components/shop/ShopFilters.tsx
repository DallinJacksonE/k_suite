import { useState, type FormEvent } from 'react'
import type { ProductSize, ProductSortDirection, ProductSortKey, ProductType, ShopProductFilters, ShopProductTypeFilter } from '../../service/ClientTypes'

interface ShopFiltersProps {
  filters: ShopProductFilters
  fixedType?: ProductType
  availableColors?: string[]
  availableSizes?: ProductSize[]
  onApply(filters: ShopProductFilters, sort?: ProductSortKey, direction?: ProductSortDirection): void
}

export function ShopFilters({ filters, fixedType, availableColors = [], availableSizes = [], onApply }: ShopFiltersProps) {
  const [type, setType] = useState<ShopProductTypeFilter>(fixedType ?? filters.type ?? 'all')
  const [saleOnly, setSaleOnly] = useState(Boolean(filters.saleOnly))
  const [selectedColors, setSelectedColors] = useState<string[]>(filters.color ? filters.color.split(',') : [])
  const [size, setSize] = useState<ProductSize | ''>(filters.size ?? '')
  const [sort, setSort] = useState<ProductSortKey>('createdAt')
  const [direction, setDirection] = useState<ProductSortDirection>('desc')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const colorString = selectedColors.join(',')
    onApply({ type: fixedType ?? type, saleOnly: saleOnly || undefined, color: colorString || undefined, size: size || undefined }, sort, direction)
  }

  const clearFilters = () => {
    const clearedType = fixedType ?? 'all'
    setType(clearedType)
    setSaleOnly(false)
    setSelectedColors([])
    setSize('')
    setSort('createdAt')
    setDirection('desc')
    onApply({ type: clearedType }, 'createdAt', 'desc')
  }

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    )
  }

  const toggleSize = (toggledSize: string) => {
    setSize((prev) => prev === toggledSize ? '' : toggledSize as ProductSize)
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

        <TagDropdownFilter
          label="Color"
          options={availableColors}
          selected={selectedColors}
          onToggle={toggleColor}
        />

        <TagDropdownFilter
          label="Size"
          options={availableSizes}
          selected={size ? [size] : []}
          onToggle={toggleSize}
        />

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

        <label className="shopFiltersCheckboxField">
          <input type="checkbox" checked={saleOnly} onChange={(event) => setSaleOnly(event.target.checked)} />Sale only
        </label>
      </div>

      <div className="shopFiltersActions">
        <button className="shopFiltersTextAction" type="submit">Apply filters</button>
        <button className="shopFiltersTextAction" type="button" onClick={clearFilters}>Clear filters</button>
      </div>
    </form>
  )
}

// --- Reusable Component ---

interface TagDropdownFilterProps {
  label: string
  options: string[]
  selected: string[]
  onToggle(option: string): void
}

function TagDropdownFilter({ label, options, selected, onToggle }: TagDropdownFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="shopFiltersField">
      <span>{label}</span>
      <div className="shopFiltersDropdownContainer">
        <button
          type="button"
          className="shopFiltersDropdownPlus"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Toggle ${label} filter options`}
        >
          +
        </button>
        <div className="shopFiltersDropdownTags">
          {selected.length === 0 && <span className="shopFiltersDropdownEmpty">Any</span>}
          {selected.map((val) => (
            <span key={val} className="shopFiltersDropdownTag">
              {val}
              <button
                type="button"
                className="shopFiltersDropdownTagRemove"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle(val)
                }}
                aria-label={`Remove ${val} filter`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {isOpen && (
          <div className="shopFiltersDropdownTooltip">
            {options.length === 0 ? <div className="shopFiltersDropdownTooltipEmpty">No options available</div> : null}
            {options.map((option) => (
              <label key={option} className="shopFiltersDropdownOption">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => onToggle(option)}
                />
                {option}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
