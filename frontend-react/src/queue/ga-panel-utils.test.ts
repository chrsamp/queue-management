import { describe, expect, test } from 'vitest'

import type {
  Citizen,
  CsrListItem,
  CsrState,
  ServiceRequest,
} from '@/api/schemas'

import { buildGaPanelRows, getServingCsrCount } from './ga-panel-utils'

const states = [
  {
    csr_state_desc: null,
    csr_state_id: 1,
    csr_state_name: 'Login',
  },
  {
    csr_state_desc: null,
    csr_state_id: 2,
    csr_state_name: 'Break',
  },
] satisfies CsrState[]

function csr(id: number, username: string, csrStateId = 1): CsrListItem {
  return {
    counter: 1,
    counter_id: 1,
    csr_id: id,
    csr_state:
      states.find((state) => state.csr_state_id === csrStateId) ?? null,
    csr_state_id: csrStateId,
    finance_designate: null,
    ita2_designate: null,
    office_id: 1,
    pesticide_designate: null,
    qt_xn_csr_ind: null,
    receptionist_ind: null,
    role: {
      role_code: 'CSR',
      role_desc: null,
      role_id: 1,
    },
    role_id: 1,
    username,
  }
}

function serviceRequest(csrId: number, periodName: string) {
  return {
    citizen_id: 1,
    periods: [
      {
        csr: {
          counter: 1,
          counter_id: 1,
          username: `user.${csrId}`,
        },
        csr_id: csrId,
        period_id: 1,
        ps: {
          ps_name: 'Waiting',
        },
        time_end: '2026-06-23T16:10:00Z',
        time_start: '2026-06-23T16:00:00Z',
      },
      {
        csr: {
          counter: 1,
          counter_id: 1,
          username: `user.${csrId}`,
        },
        csr_id: csrId,
        period_id: 2,
        ps: {
          ps_name: periodName,
        },
        time_end: null,
        time_start: '2026-06-23T16:10:00Z',
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
  } satisfies ServiceRequest
}

function citizen(id: number, csrId: number, periodName = 'Being Served') {
  return {
    citizen_comments: 'Bring ID',
    citizen_id: id,
    citizen_name: null,
    counter_id: 1,
    cs: {
      cs_state_name: 'Active',
    },
    office_id: 1,
    priority: 2,
    service_reqs: [serviceRequest(csrId, periodName)],
    start_time: '2026-06-23T16:00:00Z',
    ticket_number: `A${id}`,
  } satisfies Citizen
}

describe('ga-panel-utils', () => {
  test('groups active, break, and inactive CSRs after username sorting', () => {
    const rows = buildGaPanelRows({
      citizens: [citizen(1, 3)],
      csrs: [csr(2, 'z.inactive'), csr(3, 'b.active'), csr(1, 'a.break', 2)],
      csrStates: states,
      now: new Date('2026-06-23T16:12:30Z'),
    })

    expect(rows.map((row) => row.csr.username)).toEqual([
      'b.active',
      'a.break',
      'z.inactive',
    ])
    expect(rows.map((row) => row.status)).toEqual([
      'active',
      'break',
      'inactive',
    ])
    expect(rows[0]).toMatchObject({
      serviceName: 'Driver licence',
      servingTime: '0h 2m 30s',
      waitTime: '0h 10m 0s',
    })
    expect(rows[1].waitTime).toBe('ON BREAK')
  })

  test('counts unique invited and being-served CSRs', () => {
    expect(
      getServingCsrCount([
        citizen(1, 3, 'Invited'),
        citizen(2, 3, 'Being Served'),
        citizen(3, 4, 'On hold'),
      ]),
    ).toBe(1)
  })
})
