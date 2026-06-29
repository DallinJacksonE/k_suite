import type { FormEvent } from 'react'
import { Panel } from '../layout/Panel'

interface AdminLoginFormProps { busy: boolean; onLogin(email: string, password: string): void }

export function AdminLoginForm({ busy, onLogin }: AdminLoginFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onLogin(readFormValue(fields, 'email'), readFormValue(fields, 'password'))
  }
  return (
    <main className="login-shell">
      <Panel title="K Suite Admin" description="Sign in to manage orders, products, blog articles, and server health.">
        <form onSubmit={handleSubmit} className="form-grid">
          <label>Email<input name="email" type="email" autoComplete="username" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button type="submit" disabled={busy}>Log in</button>
        </form>
      </Panel>
    </main>
  )
}
function readFormValue(fields: FormData, name: string): string { const value = fields.get(name); return typeof value === 'string' ? value : '' }
