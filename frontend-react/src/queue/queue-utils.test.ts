import { describe, expect, test } from 'vitest'

import type { Citizen, Office, ServiceRequest } from '@/api/schemas'

import {
  formatNotificationTime,
  formatQueueTime,
  getCategory,
  getCounterName,
  getHoldCitizens,
  getPriorityLabel,
  getServiceName,
  getServedBy,
  getWaitingCitizens,
  isNotificationEnabled,
  isReceptionOffice,
  parseQueueComments,
} from './queue-utils'

const office = {
  check_in_notification: 1,
  counters: [
    {
      counter_id: 7,
      counter_name: 'Counter 7',
    },
  ],
  office_id: 1,
  office_name: 'Downtown',
  office_number: 100,
  sb: {
    sb_id: 1,
    sb_type: 'callbyname',
  },
  timeslots: [],
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
} satisfies Office

function serviceRequest(periodName: string, timeEnd: string | null = null) {
  return {
    citizen_id: 1,
    periods: [
      {
        csr: {
          counter: 7,
          counter_id: 7,
          username: 'csr.user',
        },
        period_id: 100,
        ps: {
          ps_name: periodName,
        },
        time_end: timeEnd,
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
    sr_id: 1,
  } satisfies ServiceRequest
}

function citizen(
  id: number,
  serviceReqs: ServiceRequest[],
  overrides: Partial<Citizen> = {},
) {
  return {
    citizen_comments: null,
    citizen_id: id,
    citizen_name: null,
    counter_id: 7,
    cs: {
      cs_state_name: 'Active',
    },
    office_id: 1,
    priority: 2,
    service_reqs: serviceReqs,
    start_time: '2026-06-23T16:00:00Z',
    ticket_number: `A${id}`,
    ...overrides,
  } satisfies Citizen
}

describe('queue-utils', () => {
  test('detects reception offices and notification-enabled offices', () => {
    expect(isReceptionOffice(office)).toBe(true)
    expect(
      isReceptionOffice({
        ...office,
        sb: {
          sb_id: 2,
          sb_type: 'nocallonsmartboard',
        },
      }),
    ).toBe(false)
    expect(isNotificationEnabled(office)).toBe(true)
    expect(isNotificationEnabled({ ...office, check_in_notification: null })).toBe(
      false,
    )
  })

  test('splits waiting and hold citizens from active period state', () => {
    const waitingCitizen = citizen(1, [serviceRequest('Waiting')])
    const holdCitizen = citizen(2, [serviceRequest('On hold')])
    const finishedCitizen = citizen(3, [
      serviceRequest('Waiting', '2026-06-23T16:05:00Z'),
    ])
    const noServiceCitizen = citizen(4, [])

    const citizens = [
      waitingCitizen,
      holdCitizen,
      finishedCitizen,
      noServiceCitizen,
    ]

    expect(getWaitingCitizens(citizens)).toEqual([waitingCitizen])
    expect(getHoldCitizens(citizens)).toEqual([holdCitizen])
  })

  test('formats table values with legacy labels and fallbacks', () => {
    const activeCitizen = citizen(1, [serviceRequest('Waiting')])
    const missingParentCitizen = citizen(2, [
      {
        ...serviceRequest('Waiting'),
        service: {
          parent: null,
          parent_id: null,
          service_name: 'Standalone service',
        },
      },
    ])

    expect(getPriorityLabel(1)).toBe('High')
    expect(getPriorityLabel(2)).toBe('Default')
    expect(getPriorityLabel(3)).toBe('Low')
    expect(getPriorityLabel(null)).toBe('')
    expect(getCounterName(office, 7)).toBe('Counter 7')
    expect(getCounterName(office, 999)).toBe('')
    expect(getServedBy(activeCitizen)).toBe('csr.user')
    expect(getCategory(activeCitizen)).toBe('Licensing')
    expect(getCategory(missingParentCitizen)).toBe('category')
    expect(getServiceName(activeCitizen)).toBe('Driver licence')
  })

  test('parses appointment comments only when a citizen name is present', () => {
    expect(
      parseQueueComments(
        citizen(1, [serviceRequest('Waiting')], {
          citizen_comments: 'Booked|||Bring ID',
          citizen_name: 'Pat Lee',
        }),
      ),
    ).toEqual({
      appointmentLabel: 'Booked Appt: Pat Lee',
      text: 'Bring ID',
    })

    expect(
      parseQueueComments(
        citizen(2, [serviceRequest('Waiting')], {
          citizen_comments: 'Plain comment',
        }),
      ),
    ).toEqual({
      appointmentLabel: null,
      text: 'Plain comment',
    })

    expect(
      parseQueueComments(
        citizen(3, [serviceRequest('Waiting')], {
          citizen_comments: 'Booked|||Bring ID',
        }),
      ),
    ).toEqual({
      appointmentLabel: null,
      text: 'Booked|||Bring ID',
    })
  })

  test('returns blank display values for missing active periods and invalid times', () => {
    const inactiveCitizen = citizen(1, [
      serviceRequest('Waiting', '2026-06-23T16:05:00Z'),
    ])

    expect(getServedBy(inactiveCitizen)).toBe('')
    expect(getCategory(citizen(2, []))).toBe('')
    expect(getServiceName(inactiveCitizen)).toBe('')
    expect(formatQueueTime(null)).toBe('')
    expect(formatQueueTime('not a date')).toBe('')
    expect(formatNotificationTime(undefined)).toBe('')
  })
})
