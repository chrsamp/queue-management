import { describe, expect, test, vi } from 'vitest'

import type { ApiClient } from './client'
import { getCitizens, loginAdminSession } from './endpoints'

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

describe('getCitizens', () => {
  test('returns parsed citizens from the queue endpoint', async () => {
    const citizens = [
      {
        citizen_id: 1,
        citizen_name: null,
        cs: {
          cs_state_name: 'Active',
        },
        office_id: 1,
        service_reqs: [
          {
            citizen_id: 1,
            periods: [
              {
                csr: {
                  counter: 1,
                  counter_id: 1,
                  username: 'queue.user',
                },
                period_id: 10,
                ps: {
                  ps_name: 'Waiting',
                },
                time_end: null,
                time_start: '2026-06-23T16:00:00Z',
              },
            ],
            service: {
              parent: {
                service_name: 'Licensing',
              },
              parent_id: 1,
              service_name: 'Driver licence',
            },
            sr_id: 20,
          },
        ],
      },
    ]
    const client = {
      get: vi.fn().mockResolvedValue({ citizens, errors: {} }),
    } as unknown as ApiClient

    await expect(getCitizens(client)).resolves.toEqual(citizens)
    expect(client.get).toHaveBeenCalledWith('/citizens/', {
      schema: expect.anything(),
      signal: undefined,
    })
  })
})
