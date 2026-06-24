import type { AuthService, AuthSnapshot } from '@/auth/auth-service'

export function createE2eAuthService() {
  let snapshot: AuthSnapshot = {
    authenticated: true,
    error: null,
    initialized: true,
    token: 'e2e-token',
    username: 'e2e.user',
  }
  const subscribers = new Set<() => void>()

  const service = {
    getSnapshot: () => snapshot,
    initialize: () => Promise.resolve(),
    login: () => Promise.resolve(),
    logout: () => {
      snapshot = {
        authenticated: false,
        error: null,
        initialized: true,
        token: null,
        username: null,
      }
      subscribers.forEach((subscriber) => subscriber())
      window.history.pushState(null, '', '/')
      return Promise.resolve()
    },
    refreshToken: () => Promise.resolve(),
    subscribe: (subscriber: () => void) => {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },
  }

  return service as unknown as AuthService
}
