import type { AdminCategory } from './adminNavigation'
import { adminCategories } from './adminNavigation'

interface AdminSidebarProps { activeCategory: AdminCategory; onSelect(category: AdminCategory): void }

export function AdminSidebar({ activeCategory, onSelect }: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar" aria-label="Admin actions">
      {adminCategories.map((category) => (
        <button key={category.id} type="button" className={category.id === activeCategory ? 'nav-card selected' : 'nav-card'} aria-pressed={category.id === activeCategory} onClick={() => onSelect(category.id)}>
          <strong>{category.label}</strong>
          <span>{category.description}</span>
        </button>
      ))}
    </aside>
  )
}
