import Keycloak from 'keycloak-js'
import type { KeycloakConfig, KeycloakTokenParsed } from 'keycloak-js'

export const appointmentUserRole = 'online_appointment_user'
export const identityProviderHints = ['bceidboth', 'bcsc'] as const
export type IdentityProviderHint = (typeof identityProviderHints)[number]

interface AppointmentToken extends KeycloakTokenParsed {
  display_name?: string
  firstname?: string
  lastname?: string
  preferred_username?: string
  username?: string
  realm_access?: { roles: string[] }
}

export interface AuthSnapshot {
  authenticated: boolean
  authorized: boolean
  initialized: boolean
  token: string | null
  username: string | null
  displayName: string | null
  roles: string[]
  error: string | null
}

const refreshMinValiditySeconds = 180
const refreshIntervalMs = 60_000
const initialSnapshot: AuthSnapshot = {
  authenticated: false,
  authorized: false,
  initialized: false,
  token: null,
  username: null,
  displayName: null,
  roles: [],
  error: null,
}

export class AuthService {
  private readonly keycloak: Keycloak
  private refreshTimer: number | null = null
  private snapshot = initialSnapshot
  private readonly subscribers = new Set<() => void>()

  constructor(config: KeycloakConfig) {
    this.keycloak = new Keycloak(config)
  }

  getSnapshot = () => this.snapshot

  subscribe = (subscriber: () => void) => {
    this.subscribers.add(subscriber)
    return () => {
      this.subscribers.delete(subscriber)
    }
  }

  async initialize() {
    this.bindCallbacks()

    try {
      const authenticated = await this.keycloak.init({
        checkLoginIframe: false,
        flow: 'standard',
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        responseMode: 'fragment',
      })
      this.syncSnapshot(authenticated)
      if (authenticated) this.startRefreshTimer()
    } catch (error) {
      this.updateSnapshot({
        ...initialSnapshot,
        initialized: true,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to initialize authentication',
      })
    }
  }

  login({
    idpHint,
    redirectUri,
  }: {
    idpHint?: IdentityProviderHint
    redirectUri?: string
  } = {}) {
    return this.keycloak.login({
      idpHint,
      redirectUri: redirectUri ?? `${window.location.origin}/appointment`,
    })
  }

  async logout(redirectUri = `${window.location.origin}/appointment`) {
    this.stopRefreshTimer()
    this.keycloak.clearToken()
    await this.keycloak.logout({ redirectUri })
  }

  async refreshToken(minValidity = refreshMinValiditySeconds) {
    if (!this.keycloak.authenticated) {
      throw new Error('Cannot refresh an unauthenticated session')
    }

    await this.keycloak.updateToken(minValidity)
    this.syncSnapshot(Boolean(this.keycloak.authenticated))
  }

  private bindCallbacks() {
    this.keycloak.onAuthSuccess = () => {
      this.syncSnapshot(true)
      this.startRefreshTimer()
    }
    this.keycloak.onAuthRefreshSuccess = () => this.syncSnapshot(true)
    this.keycloak.onAuthRefreshError = () => {
      this.stopRefreshTimer()
      this.keycloak.clearToken()
      this.updateSnapshot({
        ...initialSnapshot,
        initialized: true,
        error: 'Your session expired. Please log in again.',
      })
    }
    this.keycloak.onAuthLogout = () => {
      this.stopRefreshTimer()
      this.updateSnapshot({ ...initialSnapshot, initialized: true })
    }
    this.keycloak.onTokenExpired = () => {
      void this.refreshToken().catch(() => {
        this.keycloak.onAuthRefreshError?.()
      })
    }
  }

  private syncSnapshot(authenticated: boolean) {
    const parsed = this.keycloak.tokenParsed as AppointmentToken | undefined
    const roles = parsed?.realm_access?.roles ?? []
    const firstName = parsed?.firstname?.trim()
    const lastName = parsed?.lastname?.trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ')

    this.updateSnapshot({
      authenticated,
      authorized: authenticated && roles.includes(appointmentUserRole),
      initialized: true,
      token: this.keycloak.token ?? null,
      username:
        parsed?.preferred_username ?? parsed?.username ?? parsed?.email ?? null,
      displayName: parsed?.display_name?.trim() || fullName || null,
      roles,
      error: null,
    })
  }

  private startRefreshTimer() {
    this.stopRefreshTimer()
    this.refreshTimer = window.setInterval(() => {
      void this.refreshToken().catch(() => {
        this.keycloak.onAuthRefreshError?.()
      })
    }, refreshIntervalMs)
  }

  private stopRefreshTimer() {
    if (this.refreshTimer === null) return
    window.clearInterval(this.refreshTimer)
    this.refreshTimer = null
  }

  private updateSnapshot(next: AuthSnapshot) {
    this.snapshot = next
    this.subscribers.forEach((subscriber) => subscriber())
  }
}

export function isIdentityProviderHint(
  value: string | undefined,
): value is IdentityProviderHint {
  return identityProviderHints.some((hint) => hint === value)
}
