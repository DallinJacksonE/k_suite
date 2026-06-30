import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface ClientShellProps {
  children: ReactNode
}

export function ClientShell({ children }: ClientShellProps) {
  return (
    <div className="client-shell">
      <header className="client-shell__header">
        <NavLink className="client-shell__brand" to="/">
          Kaylie&apos;s Suite
        </NavLink>
        <nav className="client-shell__nav" aria-label="Client navigation">
          <NavLink to="/">Home</NavLink>
        </nav>
      </header>
      <main className="client-shell__main">{children}</main>
    </div>
  )
}
