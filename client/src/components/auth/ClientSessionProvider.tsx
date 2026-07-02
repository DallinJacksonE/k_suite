import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ClientApiService } from '../../service/ClientApiService'
import type { ClientSessionState, LoginInput, RegisterInput } from '../../service/ClientTypes'
import { defaultClientApiService } from '../../service/defaultClientApiService'
import { ClientSessionContext, type ClientSessionContextValue } from './ClientSessionContext'

interface ClientSessionProviderProps {
  children: ReactNode
  service?: ClientApiService
}

export function ClientSessionProvider({ children, service = defaultClientApiService }: ClientSessionProviderProps) {
  const [session, setSession] = useState<ClientSessionState>({ status: 'loading' })
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    setLoading(true)
    try {
      setSession(await service.getSession())
    } finally {
      setLoading(false)
    }
  }, [service])

  const login = useCallback(async (input: LoginInput) => {
    setLoading(true)
    try {
      setSession(await service.login(input))
    } finally {
      setLoading(false)
    }
  }, [service])

  const register = useCallback(async (input: RegisterInput) => {
    setLoading(true)
    try {
      setSession(await service.register(input))
    } finally {
      setLoading(false)
    }
  }, [service])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await service.logout()
      setSession({ status: 'guest' })
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    let cancelled = false
    service.getSession()
      .then((nextSession) => {
        if (!cancelled) setSession(nextSession)
      })
      .catch((error: unknown) => {
        console.error('Unable to load client session.', error)
        if (!cancelled) setSession({ status: 'guest' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [service])

  const value = useMemo<ClientSessionContextValue>(() => {
    const authenticated = session.status === 'authenticated'
    return {
      session,
      loading,
      canBuyPatterns: authenticated,
      canViewProfile: authenticated,
      refreshSession,
      login,
      register,
      logout,
    }
  }, [loading, login, logout, refreshSession, register, session])

  return <ClientSessionContext.Provider value={value}>{children}</ClientSessionContext.Provider>
}
