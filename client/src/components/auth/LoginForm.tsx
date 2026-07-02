import type { FormEvent } from 'react'

interface LoginFormProps {
  busy: boolean
  onSubmit(input: { email: string; password: string }): void
}

export function LoginForm({ busy, onSubmit }: LoginFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    })
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div>
        <p className="eyebrow">Welcome back</p>
        <h2>Login</h2>
      </div>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
    </form>
  )
}
