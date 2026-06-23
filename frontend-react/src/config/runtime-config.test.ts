import { describe, expect, test } from 'vitest'

import { resolveRuntimeConfig } from './runtime-config'

describe('resolveRuntimeConfig', () => {
  test('defaults socket settings from the API URL', () => {
    expect(
      resolveRuntimeConfig({
        VITE_Q_API_URL: 'http://localhost:5000/api/v1',
        VITE_Q_SUPPORT_URL: 'mailto:sbcts@gov.bc.ca',
      }),
    ).toMatchObject({
      VITE_Q_SOCKET_DELAY_MAX: 5000,
      VITE_Q_SOCKET_TIMEOUT: 20000,
      VITE_Q_SOCKET_URL: 'http://localhost:5000',
    })
  })

  test('accepts explicit socket settings from runtime configuration', () => {
    expect(
      resolveRuntimeConfig({
        VITE_Q_API_URL: 'http://localhost:5000/api/v1',
        VITE_Q_SOCKET_DELAY_MAX: '3000',
        VITE_Q_SOCKET_TIMEOUT: '30000',
        VITE_Q_SOCKET_URL: 'http://localhost:6000',
        VITE_Q_SUPPORT_URL: 'mailto:sbcts@gov.bc.ca',
      }),
    ).toMatchObject({
      VITE_Q_SOCKET_DELAY_MAX: 3000,
      VITE_Q_SOCKET_TIMEOUT: 30000,
      VITE_Q_SOCKET_URL: 'http://localhost:6000',
    })
  })
})
