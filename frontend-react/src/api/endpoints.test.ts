import { describe, expect, test, vi } from 'vitest'

import type { ApiClient } from './client'
import { loginAdminSession } from './endpoints'

describe('loginAdminSession', () => {
  test('returns concrete query data after the bridge request succeeds', async () => {
    const client = {
      get: vi.fn().mockResolvedValue('<!doctype html>'),
    } as unknown as ApiClient

    await expect(loginAdminSession(client)).resolves.toEqual({
      authenticated: true,
    })
  })
})
