import { RRule } from 'rrule'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { Booking, Exam, Room } from '@/api/schemas'

import {
  bookingToCalendarEvent,
  buildRecurringBookingWindows,
  buildRoomResources,
  canSelectBookingSlot,
  filterBookingEvents,
  getExamDurationMinutes,
  isAfterExamExpiry,
} from './booking-utils'

const room = {
  color: '#2364aa',
  deleted: null,
  room_id: 10,
  room_name: 'Room 1',
} satisfies Room

const booking = {
  booking_contact_information: 'person@example.com',
  booking_id: 99,
  booking_name: 'Training',
  end_time: '2026-06-24T18:00:00Z',
  fees: 'false',
  office: {
    office_id: 3,
    office_name: 'Victoria',
    office_number: 94,
    timezone: {
      timezone_id: 1,
      timezone_name: 'America/Vancouver',
    },
  },
  office_id: 3,
  room,
  room_id: 10,
  start_time: '2026-06-24T17:00:00Z',
} satisfies Booking

const exam = {
  booking_id: 99,
  exam_id: 123,
  exam_name: 'COFQ',
  exam_type: {
    exam_type_id: 1,
    number_of_hours: 2,
    number_of_minutes: 30,
  },
  expiry_date: '2026-06-30T00:00:00Z',
} satisfies Exam

describe('booking-utils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('maps rooms and appends the legacy offsite resource', () => {
    expect(buildRoomResources([room])).toEqual([
      {
        eventColor: '#2364aa',
        id: 10,
        title: 'Room 1',
      },
      {
        eventColor: '#F58B4C',
        id: '_offsite',
        title: 'Offsite',
      },
    ])
  })

  test('maps a booking into a calendar event in the office timezone', () => {
    const event = bookingToCalendarEvent(booking, [exam])

    expect(event?.id).toBe(99)
    expect(event?.resourceId).toBe(10)
    expect(event?.title).toBe('Training')
    expect(event?.exam?.exam_id).toBe(123)
    expect(event?.start.getHours()).toBe(10)
    expect(event?.end.getHours()).toBe(11)
  })

  test('drops bookings attached to deleted rooms', () => {
    const deletedRoomBooking = {
      ...booking,
      room: {
        ...room,
        deleted: '2026-01-01T00:00:00Z',
      },
    } satisfies Booking

    expect(bookingToCalendarEvent(deletedRoomBooking, [])).toBeNull()
  })

  test('filters by onsite/offsite and nested search text', () => {
    const onsite = bookingToCalendarEvent(booking, [exam])
    const offsite = bookingToCalendarEvent(
      {
        ...booking,
        booking_id: 100,
        booking_name: 'Offsite Training',
        room: null,
        room_id: null,
      },
      [],
    )

    expect(onsite).not.toBeNull()
    expect(offsite).not.toBeNull()

    const events = [onsite!, offsite!]

    expect(
      filterBookingEvents({ events, mode: 'onsite', search: '' }).map(
        (event) => event.id,
      ),
    ).toEqual([99])
    expect(
      filterBookingEvents({ events, mode: 'offsite', search: '' }).map(
        (event) => event.id,
      ),
    ).toEqual([100])
    expect(
      filterBookingEvents({ events, mode: 'both', search: 'cofq' }).map(
        (event) => event.id,
      ),
    ).toEqual([99])
  })

  test('guards calendar slot selection', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-24T16:00:00Z'))

    expect(
      canSelectBookingSlot({
        resourceId: 10,
        scheduling: true,
        start: new Date('2026-06-24T17:00:00Z'),
      }),
    ).toBe(true)
    expect(
      canSelectBookingSlot({
        resourceId: '_offsite',
        scheduling: true,
        start: new Date('2026-06-24T17:00:00Z'),
      }),
    ).toBe(false)
    expect(
      canSelectBookingSlot({
        resourceId: 10,
        scheduling: true,
        start: new Date('2026-06-27T17:00:00Z'),
      }),
    ).toBe(false)
  })

  test('builds recurring booking windows with duration intact', () => {
    const windows = buildRecurringBookingWindows({
      endDate: new Date(2026, 5, 30, 10, 0),
      endTime: new Date(2026, 5, 24, 10, 0),
      frequency: 'weekly',
      startDate: new Date(2026, 5, 24, 9, 0),
      startTime: new Date(2026, 5, 24, 9, 0),
      weekdays: [RRule.WE],
    })

    expect(windows).toHaveLength(1)
    expect(windows[0].end.getTime() - windows[0].start.getTime()).toBe(
      60 * 60000,
    )
  })

  test('calculates exam duration and expiry restriction', () => {
    expect(getExamDurationMinutes(exam)).toBe(150)
    expect(isAfterExamExpiry(new Date('2026-06-30T12:00:00'), exam)).toBe(
      false,
    )
    expect(isAfterExamExpiry(new Date('2026-07-01T09:00:00'), exam)).toBe(true)
  })
})
