import { createContext } from 'react'
import type { ClientSessionState, LoginInput, RegisterInput } from '../../service/ClientTypes'

export interface ClientSessionContextValue {
  session: ClientSessionState
  loading: boolean
  canBuyPatterns: boolean
  canViewProfile: boolean
  refreshSession(): Promise<void>
  login(input: LoginInput): Promise<void>
  register(input: RegisterInput): Promise<void>
  logout(): Promise<void>
}

export const ClientSessionContext = createContext<ClientSessionContextValue | null>(null)
