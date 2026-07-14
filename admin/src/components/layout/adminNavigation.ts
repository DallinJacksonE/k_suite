export type AdminCategory = 'orders' | 'users' | 'plushieProducts' | 'patternProducts' | 'blog' | 'markets' | 'serverMetrics'

export const adminCategories: Array<{ id: AdminCategory; label: string; description: string }> = [
  { id: 'orders', label: 'Orders', description: 'Pending, shipped, history, and revenue' },
  { id: 'users', label: 'Users', description: 'Accounts, order history, stats, refunds' },
  { id: 'plushieProducts', label: 'Plushie Products', description: 'Finished plushies, colors, sizes, and stock' },
  { id: 'patternProducts', label: 'Pattern Products', description: 'Downloadable pattern listings and PDFs' },
  { id: 'blog', label: 'Blog Articles', description: 'Block-based article writing' },
  { id: 'markets', label: 'Markets', description: 'Upcoming market dates and locations' },
  { id: 'serverMetrics', label: 'Server Metrics', description: 'Service health and API surface' },
]
