import { afterEach, describe, expect, test, vi } from 'vitest'

import type { Appointment, Service } from '@/api/schemas'

import { buildAgendaRows } from './AgendaPanel'
import { officeDateToUtcIso } from '@/lib/datetime'
import {
  appointmentToCalendarEvent,
  getNextValidAppointmentStart,
} from './appointment-utils'

const office = {
  appointment_duration: 30,
  appointments_enabled_ind: 1,
  office_id: 3,
  office_name: 'Victoria',
  office_number: 94,
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
}

const service = {
  parent: {
    service_name: 'MSP',
  },
  parent_id: 1,
  service_id: 10,
  service_name: 'Payment - MSP',
} satisfies Service

function appointment(overrides: Partial<Appointment> = {}) {
  return {
    appointment_id: 3,
    blackout_flag: 'N',
    checked_in_time: null,
    citizen_id: 32,
    citizen_name: 'Test',
    comments: 'test',
    contact_information: '5555555555',
    end_time: '2026-06-24T20:45:00+00:00',
    is_draft: false,
    office,
    office_id: 3,
    online_flag: false,
    recurring_uuid: null,
    service,
    service_id: 10,
    start_time: '2026-06-24T20:30:00+00:00',
    stat_flag: false,
    ...overrides,
  } satisfies Appointment
}

afterEach(() => {
  vi.useRealTimers()
})

describe('appointment-utils', () => {
  test('converts UTC appointment instants to office wall time for calendar display', () => {
    const event = appointmentToCalendarEvent(appointment(), [service])

    expect(event.start.getFullYear()).toBe(2026)
    expect(event.start.getMonth()).toBe(5)
    expect(event.start.getDate()).toBe(24)
    expect(event.start.getHours()).toBe(13)
    expect(event.start.getMinutes()).toBe(30)
  })

  test('converts office wall time to UTC API timestamps', () => {
    const start = new Date(2026, 5, 26, 8, 30)
    const end = new Date(2026, 5, 26, 17, 0)

    expect(officeDateToUtcIso(start, 'America/Vancouver')).toBe(
      '2026-06-26T15:30:00.000Z',
    )
    expect(officeDateToUtcIso(end, 'America/Vancouver')).toBe(
      '2026-06-27T00:00:00.000Z',
    )
  })

  test('builds agenda rows for upcoming unchecked appointments', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-24T17:00:00.000Z'))

    const rows = buildAgendaRows({
      appointments: [appointment()],
      officeTimezone: 'America/Vancouver',
      search: '',
      services: [service],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].serviceName).toBe('Payment - MSP')
    expect(rows[0].start.getHours()).toBe(13)
    expect(rows[0].start.getMinutes()).toBe(30)
  })

  test('defaults new appointments to the next future appointment slot', () => {
    const next = getNextValidAppointmentStart(new Date(2026, 5, 24, 10, 42, 22))

    expect(next.getHours()).toBe(10)
    expect(next.getMinutes()).toBe(45)
    expect(next.getSeconds()).toBe(0)
  })
})
