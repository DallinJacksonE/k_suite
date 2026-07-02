import { useToast } from '@k_suite/shared/toast'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'
import { RegistrationForm } from '../components/auth/RegistrationForm'
import { useClientSession } from '../components/auth/useClientSession'
import { ClientShell } from '../components/layout/ClientShell'
import { AuthPresenter, type AuthViewModel } from '../presenters/AuthPresenter'
import { FetchClientApiService } from '../service/ClientApiService'

export function LoginView() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { canViewProfile, loading, refreshSession } = useClientSession()
  const [model, setModel] = useState<AuthViewModel>({ busy: false })
  const service = useMemo(() => new FetchClientApiService(), [])
  const presenter = useMemo(() => new AuthPresenter(service, {
    renderAuth: (nextModel) => {
      setModel(nextModel)
      if (nextModel.error) showToast({ message: nextModel.error, variant: 'danger', durationMs: 3_000 })
      if (nextModel.message) showToast({ message: nextModel.message, variant: nextModel.busy ? 'info' : 'success', durationMs: 3000 })
    },
    onAuthenticated: () => {
      void refreshSession().then(() => navigate('/profile'))
    },
  }), [navigate, refreshSession, service, showToast])

  if (!loading && canViewProfile) return <Navigate to="/profile" replace />

  return (
    <ClientShell>
      <section className="page-card auth-page">
        <p className="eyebrow">Login / Register</p>
        <h1>Access your account.</h1>
        <p>Log in to view your profile and pattern purchases, or create an account with your shipping details ready for checkout.</p>
        {model.error ? <p role="alert" className="form-error">{model.error}</p> : null}
        {model.message ? <p role="status" className="shop-notice">{model.message}</p> : null}
        <div className="auth-grid">
          <LoginForm busy={model.busy} onSubmit={(input) => void presenter.login(input)} />
          <RegistrationForm busy={model.busy} onSubmit={(input) => void presenter.register(input)} />
        </div>
      </section>
    </ClientShell>
  )
}
