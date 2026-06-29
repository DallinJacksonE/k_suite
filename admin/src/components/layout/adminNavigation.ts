export type AdminCategory = 'orders' | 'product' | 'blog' | 'serverMetrics'

export const adminCategories: Array<{ id: AdminCategory; label: string; description: string }> = [
  { id: 'orders', label: 'Orders', description: 'Pending, shipped, history, and revenue' },
  { id: 'product', label: 'Product', description: 'Listings, images, and pattern PDFs' },
  { id: 'blog', label: 'Blog Articles', description: 'Block-based article writing' },
  { id: 'serverMetrics', label: 'Server Metrics', description: 'Service health and API surface' },
]
