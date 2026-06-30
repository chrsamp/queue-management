import { beforeEach, describe, expect, it, vi } from 'vitest'

const keycloak = vi.hoisted(() => ({
  authenticated: false,
  clearToken: vi.fn(),
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  token: undefined as string | undefined,
  tokenParsed: undefined as Record<string, unknown> | undefined,
  updateToken: vi.fn(),
  onAuthLogout: undefined as (() => void) | undefined,
  onAuthRefreshError: undefined as (() => void) | undefined,
  onAuthRefreshSuccess: undefined as (() => void) | undefined,
  onAuthSuccess: undefined as (() => void) | undefined,
  onTokenExpired: undefined as (() => void) | undefined,
}))

vi.mock('keycloak-js', () => ({
  default: function KeycloakMock() {
    return keycloak
  },
}))

import { AuthService, isIdentityProviderHint } from './auth-service'

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    keycloak.authenticated = false
    keycloak.token = undefined
    keycloak.tokenParsed = undefined
    keycloak.init.mockResolvedValue(false)
    keycloak.login.mockResolvedValue(undefined)
    keycloak.logout.mockResolvedValue(undefined)
    keycloak.updateToken.mockResolvedValue(false)
  })

  it('initializes check-sso with PKCE and authorizes the appointment role', async () => {
    keycloak.authenticated = true
    keycloak.token = 'access-token'
    keycloak.tokenParsed = {
      display_name: 'Alex Citizen',
      preferred_username: 'citizen@bceidboth',
      realm_access: { roles: ['online_appointment_user'] },
    }
    keycloak.init.mockResolvedValue(true)
    const service = new AuthService({
      clientId: 'appointment',
      realm: 'servicebc-local',
      url: 'http://localhost:8085/auth',
    })

    await service.initialize()

    expect(keycloak.init).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: 'standard',
        onLoad: 'check-sso',
        pkceMethod: 'S256',
      }),
    )
    expect(service.getSnapshot()).toMatchObject({
      authenticated: true,
      authorized: true,
      displayName: 'Alex Citizen',
      token: 'access-token',
    })
    expect(window.sessionStorage.length).toBe(0)
    await service.logout()
  })

  it('passes only supported identity-provider hints to Keycloak', async () => {
    const service = new AuthService({
      clientId: 'appointment',
      realm: 'servicebc-local',
      url: 'http://localhost:8085/auth',
    })

    await service.login({
      idpHint: 'bcsc',
      redirectUri: 'http://localhost:8100/appointment',
    })

    expect(keycloak.login).toHaveBeenCalledWith({
      idpHint: 'bcsc',
      redirectUri: 'http://localhost:8100/appointment',
    })
    expect(isIdentityProviderHint('bceidboth')).toBe(true)
    expect(isIdentityProviderHint('idir')).toBe(false)
  })
})
