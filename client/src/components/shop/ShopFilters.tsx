import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ProductSize, ProductSortDirection, ProductSortKey, ProductType, ShopProductFilters, ShopProductTypeFilter } from '../../service/ClientTypes'

interface ShopFiltersProps {
  filters: ShopProductFilters
  fixedType?: ProductType
  availableColors?: string[]
  availableSizes?: ProductSize[]
  onApply(filters: ShopProductFilters, sort?: ProductSortKey, direction?: ProductSortDirection): void
}

interface FilterDraft {
  type: ShopProductTypeFilter
  saleOnly: boolean
  selectedColors: string[]
  selectedSizes: string[]
  sort: ProductSortKey
  direction: ProductSortDirection
}

export function ShopFilters({ filters, fixedType, availableColors = [], availableSizes = [], onApply }: ShopFiltersProps) {
  const initialType = fixedType ?? filters.type ?? 'all'
  const [type, setType] = useState<ShopProductTypeFilter>(initialType)
  const [saleOnly, setSaleOnly] = useState(Boolean(filters.saleOnly))
  const [selectedColors, setSelectedColors] = useState<string[]>(shouldShowColorFilter(initialType) ? splitSelectedValues(filters.color) : [])
  const [selectedSizes, setSelectedSizes] = useState<string[]>(splitSelectedValues(filters.size))
  const [sort, setSort] = useState<ProductSortKey>('createdAt')
  const [direction, setDirection] = useState<ProductSortDirection>('desc')
  const canFilterByColor = shouldShowColorFilter(fixedType ?? type)

  const apply = (state: FilterDraft) => {
    const nextType = fixedType ?? state.type
    const colorString = state.selectedColors.join(',')
    const sizeString = state.selectedSizes.join(',')
    onApply({
      type: nextType,
      saleOnly: state.saleOnly || undefined,
      color: shouldShowColorFilter(nextType) ? colorString || undefined : undefined,
      size: sizeString || undefined,
    }, state.sort, state.direction)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    apply({ type, saleOnly, selectedColors, selectedSizes, sort, direction })
  }

  const submitCurrentFilters = () => {
    apply({ type, saleOnly, selectedColors, selectedSizes, sort, direction })
  }

  const clearFilters = () => {
    const clearedType = fixedType ?? 'all'
    setType(clearedType)
    setSaleOnly(false)
    setSelectedColors([])
    setSelectedSizes([])
    setSort('createdAt')
    setDirection('desc')
    onApply({ type: clearedType }, 'createdAt', 'desc')
  }

  const toggleColor = (color: string) => {
    const nextColors = toggleSelection(selectedColors, color)
    setSelectedColors(nextColors)
    apply({ type, saleOnly, selectedColors: nextColors, selectedSizes, sort, direction })
  }

  const toggleSize = (toggledSize: string) => {
    const nextSizes = toggleSelection(selectedSizes, toggledSize)
    setSelectedSizes(nextSizes)
    apply({ type, saleOnly, selectedColors, selectedSizes: nextSizes, sort, direction })
  }

  return (
    <form className="shopFiltersForm" onSubmit={submit}>
      <div className="shopFiltersControls">
        {fixedType ? null : <label className="shopFiltersField">Type
          <select value={type} onChange={(event) => {
            const nextType = event.target.value as ShopProductTypeFilter
            setType(nextType)
            const nextSelectedColors = shouldShowColorFilter(nextType) ? selectedColors : []
            setSelectedColors(nextSelectedColors)
            apply({ type: nextType, saleOnly, selectedColors: nextSelectedColors, selectedSizes, sort, direction })
          }}>
            <option value="all">All</option>
            <option value="plushie">Plushies</option>
            <option value="pattern">Patterns</option>
          </select>
        </label>}

        {canFilterByColor ? <TagDropdownFilter
          label="Color"
          options={availableColors}
          selected={selectedColors}
          onToggle={toggleColor}
          onClose={submitCurrentFilters}
        /> : null}

        <TagDropdownFilter
          label="Size"
          options={availableSizes}
          selected={selectedSizes}
          onToggle={toggleSize}
          onClose={submitCurrentFilters}
        />

        <label className="shopFiltersField">Sort
          <select value={sort} onChange={(event) => {
            const nextSort = event.target.value as ProductSortKey
            setSort(nextSort)
            apply({ type, saleOnly, selectedColors, selectedSizes, sort: nextSort, direction })
          }}>
            <option value="createdAt">Newest</option>
            <option value="price">Price</option>
            <option value="title">Title</option>
          </select>
        </label>

        <label className="shopFiltersField">Direction
          <select value={direction} onChange={(event) => {
            const nextDirection = event.target.value as ProductSortDirection
            setDirection(nextDirection)
            apply({ type, saleOnly, selectedColors, selectedSizes, sort, direction: nextDirection })
          }}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <label className="shopFiltersCheckboxField">
          <input type="checkbox" checked={saleOnly} onChange={(event) => {
            const nextSaleOnly = event.target.checked
            setSaleOnly(nextSaleOnly)
            apply({ type, saleOnly: nextSaleOnly, selectedColors, selectedSizes, sort, direction })
          }} />Sale only
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
  onClose(): void
}

function TagDropdownFilter({ label, options, selected, onToggle, onClose }: TagDropdownFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
      onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, onClose])

  return (
    <div className="shopFiltersField">
      <span>{label}</span>
      <div className="shopFiltersDropdownContainer" ref={containerRef}>
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

function splitSelectedValues(value: string | undefined): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []
}

function shouldShowColorFilter(type: ShopProductTypeFilter): boolean {
  return type !== 'pattern'
}

function toggleSelection(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}
