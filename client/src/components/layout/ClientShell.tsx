import type { ReactNode } from 'react'
import { ClientFooter } from './ClientFooter'
import { ClientNavbar } from './ClientNavbar'

interface ClientShellProps {
  children: ReactNode
}

export function ClientShell({ children }: ClientShellProps) {
  return (
    <div className="client-shell">
      <ClientNavbar />
      <main className="client-shell__main">{children}</main>
      <ClientFooter />
    </div>
  )
}
