import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import type { AuthService } from '@/auth/auth-service'
import { server } from '@/test/server'

import { ApiClient } from './client'
import { createDraft, getOffices } from './endpoints'

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

  it('normalizes legacy 400 slot conflicts by response code', async () => {
    server.use(
      http.post('http://localhost:5000/api/v1/conflict', () =>
        HttpResponse.json(
          {
            code: 'CONFLICT_APPOINTMENT',
            message: 'Please pick another time',
          },
          { status: 400 },
        ),
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
    ).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('accepts the existing draft response warning contract', async () => {
    const client = new ApiClient({
      authService,
      baseUrl: 'http://localhost:5000/api/v1',
    })

    const response = await createDraft(client, {
      comments: '',
      end_time: '2030-07-15T16:30:00.000Z',
      office_id: 10,
      service_id: 20,
      start_time: '2030-07-15T16:00:00.000Z',
    })

    expect(response.appointment.is_draft).toBe(true)
    expect(response.warning).toEqual({})
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
