import { describe, expect, it } from 'vitest'

import { parseNotice } from './notice-links'
import { keycloakConfigSchema, resolveRuntimeConfig } from './runtime-config'

describe('runtime configuration', () => {
  it('applies safe defaults and accepts empty optional URLs', () => {
    const config = resolveRuntimeConfig({
      VITE_APPOINTMENT_API_URL: 'http://localhost:5000/api/v1',
      VITE_APPOINTMENT_BCEID_REGISTRATION_URL: '',
    })

    expect(config.VITE_APPOINTMENT_DISABLE_SMS).toBe(false)
    expect(config.VITE_APPOINTMENT_HEADER_MESSAGE).toBe('')
  })

  it('rejects an invalid API URL', () => {
    expect(() =>
      resolveRuntimeConfig({ VITE_APPOINTMENT_API_URL: 'not-a-url' }),
    ).toThrow()
  })

  it('validates the modern Keycloak shape', () => {
    expect(
      keycloakConfigSchema.parse({
        clientId: 'appointment',
        realm: 'servicebc-local',
        url: 'http://localhost:8085/auth',
      }),
    ).toMatchObject({ clientId: 'appointment' })
  })
})

describe('notice link parsing', () => {
  it('pairs alternating labels with configured links', () => {
    expect(
      parseNotice(
        'Before {link}First link{link} after {link}Second link',
        'https://example.test/one{link}https://example.test/two',
      ),
    ).toEqual([
      { text: 'Before ', type: 'text' },
      {
        href: 'https://example.test/one',
        text: 'First link',
        type: 'link',
      },
      { text: ' after ', type: 'text' },
      {
        href: 'https://example.test/two',
        text: 'Second link',
        type: 'link',
      },
    ])
  })

  it('renders an unmatched label as text', () => {
    expect(parseNotice('{link}Unmatched', '')).toEqual([
      { text: 'Unmatched', type: 'text' },
    ])
  })
})
