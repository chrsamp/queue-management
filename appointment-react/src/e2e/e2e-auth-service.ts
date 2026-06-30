import type { AuthService, AuthSnapshot } from '@/auth/auth-service'

export function createE2eAuthService() {
  let snapshot: AuthSnapshot = {
    authenticated: false,
    authorized: false,
    displayName: null,
    error: null,
    initialized: true,
    roles: [],
    token: null,
    username: null,
  }
  const subscribers = new Set<() => void>()

  function publish(next: AuthSnapshot) {
    snapshot = next
    subscribers.forEach((subscriber) => subscriber())
  }

  return {
    getSnapshot: () => snapshot,
    initialize: () => Promise.resolve(),
    login: ({ redirectUri }: { redirectUri?: string } = {}) => {
      publish({
        authenticated: true,
        authorized: true,
        displayName: 'E2E Citizen',
        error: null,
        initialized: true,
        roles: ['online_appointment_user'],
        token: 'e2e-token',
        username: 'citizen@bceidboth',
      })
      const destination = redirectUri
        ? new URL(redirectUri).pathname
        : '/appointment'
      window.history.replaceState(null, '', destination)
      window.dispatchEvent(new PopStateEvent('popstate'))
      return Promise.resolve()
    },
    logout: () => {
      publish({
        authenticated: false,
        authorized: false,
        displayName: null,
        error: null,
        initialized: true,
        roles: [],
        token: null,
        username: null,
      })
      return Promise.resolve()
    },
    refreshToken: () => Promise.resolve(),
    subscribe: (subscriber: () => void) => {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },
  } as unknown as AuthService
}
