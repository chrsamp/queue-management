import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import type { AuthService } from '@/auth/auth-service'
import { server } from '@/test/server'

import { ApiClient } from './client'
import { getOffices } from './endpoints'

const authService = {
  getSnapshot: () => ({ token: 'token' }),
  refreshToken: () => Promise.resolve(),
} as unknown as AuthService

describe('ApiClient', () => {
  it('validates public office responses', async () => {
    const client = new ApiClient({
      authService,
      baseUrl: 'http://localhost:5000/api/v1',
    })

    const response = await getOffices(client)

    expect(response.offices[0]?.office_name).toBe('Victoria Service BC Centre')
  })

  it('normalizes conflicts', async () => {
    server.use(
      http.post('http://localhost:5000/api/v1/conflict', () =>
        HttpResponse.json({ message: 'Slot unavailable' }, { status: 409 }),
      ),
    )
    const client = new ApiClient({
      authService,
      baseUrl: 'http://localhost:5000/api/v1',
    })

    await expect(
      client.request('/conflict', {
        authenticated: false,
        method: 'POST',
        schema: z.unknown(),
      }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Slot unavailable',
    })
  })

  it('rejects invalid contracts', async () => {
    server.use(
      http.get('http://localhost:5000/api/v1/offices/', () =>
        HttpResponse.json({ offices: [{ office_id: 'wrong' }] }),
      ),
    )
    const client = new ApiClient({
      authService,
      baseUrl: 'http://localhost:5000/api/v1',
    })

    await expect(getOffices(client)).rejects.toMatchObject({
      kind: 'validation',
    })
  })
})
