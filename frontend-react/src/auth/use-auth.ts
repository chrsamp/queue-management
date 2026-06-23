import { useContext, useMemo, useSyncExternalStore } from 'react'

import { AuthContext } from './auth-context'

export function useAuth() {
  const authService = useContext(AuthContext)

  if (!authService) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  const snapshot = useSyncExternalStore(
    authService.subscribe,
    authService.getSnapshot,
    authService.getSnapshot,
  )

  return useMemo(
    () => ({
      ...snapshot,
      login: authService.login.bind(authService),
      logout: authService.logout.bind(authService),
      refreshToken: authService.refreshToken.bind(authService),
    }),
    [authService, snapshot],
  )
}
