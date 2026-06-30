import { useContext } from 'react'
import { ClientSessionContext } from './ClientSessionContext'

export function useClientSession() {
  const context = useContext(ClientSessionContext)
  if (!context) throw new Error('useClientSession must be used inside ClientSessionProvider.')
  return context
}
