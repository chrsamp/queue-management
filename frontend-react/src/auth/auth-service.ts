import Keycloak from 'keycloak-js'
import type { KeycloakConfig } from 'keycloak-js'

import { clearOidcJwtCookie, setOidcJwtCookie } from './cookie'

export interface AuthSnapshot {
  authenticated: boolean
  initialized: boolean
  token: string | null
  username: string | null
  error: string | null
}

const refreshMinValiditySeconds = 180
const refreshIntervalMs = 60 * 1000

const initialSnapshot: AuthSnapshot = {
  authenticated: false,
  initialized: false,
  token: null,
  username: null,
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
    this.bindKeycloakCallbacks()

    try {
      const authenticated = await this.keycloak.init({
        flow: 'standard',
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        responseMode: 'fragment',
      })

      this.updateSnapshot({ authenticated, error: null, initialized: true })
      this.syncCookie()

      if (authenticated) {
        this.startRefreshTimer()
      }
    } catch (error) {
      this.updateSnapshot({
        authenticated: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to initialize authentication',
        initialized: true,
        token: null,
        username: null,
      })
      clearOidcJwtCookie()
    }
  }

  login(redirectUri = `${window.location.origin}/queue`) {
    return this.keycloak.login({ redirectUri })
  }

  async logout(redirectUri = window.location.origin) {
    this.stopRefreshTimer()
    clearOidcJwtCookie()
    await this.keycloak.logout({ redirectUri })
  }

  async refreshToken(minValidity = refreshMinValiditySeconds) {
    if (!this.keycloak.authenticated) {
      throw new Error('Cannot refresh an unauthenticated session')
    }

    await this.keycloak.updateToken(minValidity)
    this.updateSnapshot({
      authenticated: Boolean(this.keycloak.authenticated),
      error: null,
      token: this.keycloak.token ?? null,
      username: this.getUsername(),
    })
    this.syncCookie()
  }

  private bindKeycloakCallbacks() {
    this.keycloak.onAuthSuccess = () => {
      this.updateSnapshot({
        authenticated: true,
        error: null,
        token: this.keycloak.token ?? null,
        username: this.getUsername(),
      })
      this.syncCookie()
      this.startRefreshTimer()
    }

    this.keycloak.onAuthRefreshSuccess = () => {
      this.updateSnapshot({
        authenticated: true,
        error: null,
        token: this.keycloak.token ?? null,
        username: this.getUsername(),
      })
      this.syncCookie()
    }

    this.keycloak.onAuthRefreshError = () => {
      this.stopRefreshTimer()
      this.keycloak.clearToken()
      clearOidcJwtCookie()
      this.updateSnapshot({
        authenticated: false,
        error: 'Your session expired. Please log in again.',
        token: null,
        username: null,
      })
    }

    this.keycloak.onAuthLogout = () => {
      this.stopRefreshTimer()
      clearOidcJwtCookie()
      this.updateSnapshot({
        authenticated: false,
        error: null,
        token: null,
        username: null,
      })
    }
  }

  private startRefreshTimer() {
    this.stopRefreshTimer()
    this.refreshTimer = window.setInterval(() => {
      this.refreshToken().catch(() => {
        this.stopRefreshTimer()
        this.keycloak.clearToken()
      })
    }, refreshIntervalMs)
  }

  private stopRefreshTimer() {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private syncCookie() {
    if (this.keycloak.token) {
      setOidcJwtCookie(this.keycloak.token)
    } else {
      clearOidcJwtCookie()
    }
  }

  private getUsername() {
    const parsed = this.keycloak.tokenParsed

    if (typeof parsed?.preferred_username === 'string') {
      return parsed.preferred_username
    }

    if (typeof parsed?.email === 'string') {
      return parsed.email
    }

    return null
  }

  private updateSnapshot(next: Partial<AuthSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next }
    this.subscribers.forEach((subscriber) => {
      subscriber()
    })
  }
}
