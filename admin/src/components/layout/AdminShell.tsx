import type { ReactNode } from 'react'
import type { AdminCategory } from './adminNavigation'
import { AdminSidebar } from './AdminSidebar'

interface AdminShellProps { adminName: string | null; activeCategory: AdminCategory; busy: boolean; onSelect(category: AdminCategory): void; onLogout(): void; children: ReactNode }

export function AdminShell({ adminName, activeCategory, busy, onSelect, onLogout, children }: AdminShellProps) {
  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">K Suite Admin</p>
          <h1>Backend management</h1>
        </div>
        <div className="session-chip">
          <span>{adminName ? `Signed in as ${adminName}` : 'Admin session'}</span>
          <button type="button" onClick={onLogout} disabled={busy}>Log out</button>
        </div>
      </header>
      <div className="dashboard-layout">
        <AdminSidebar activeCategory={activeCategory} onSelect={onSelect} />
        <section className="dashboard-content">{children}</section>
      </div>
    </main>
  )
}
