import { RRule, type Weekday } from 'rrule'

import {
  addMinutes,
  diffMinutes,
  isPast,
  utcToOfficeDate,
} from '@/lib/datetime'

import type { Booking, Exam, Room } from '@/api/schemas'

export interface RoomResource {
  eventColor: string
  id: number | '_offsite'
  title: string
}

export interface BookingCalendarEvent {
  blackout_flag?: string | null
  blackout_notes?: string | null
  booking: Booking
  booking_contact_information?: string | null
  color: string
  end: Date
  exam: Exam | null
  fees?: string | null
  id: number
  name: string
  recurring_uuid?: string | null
  resourceId: number | '_offsite'
  room: Room | null
  start: Date
  stat_flag?: boolean | null
  title: string
}

export interface BookingWindow {
  end: Date
  start: Date
}

export const offsiteResource: RoomResource = {
  eventColor: '#F58B4C',
  id: '_offsite',
  title: 'Offsite',
}

export const bookingWorkdayStart = { hours: 8, minutes: 30 }
export const bookingWorkdayEnd = { hours: 17, minutes: 0 }

export function examsEnabled(
  office: { exams_enabled_ind?: number | null } | null,
) {
  return office?.exams_enabled_ind === 1
}

export function buildRoomResources(rooms: Room[]): RoomResource[] {
  return [
    ...rooms.map((room) => ({
      eventColor: room.color || '#1a5a96',
      id: room.room_id,
      title: room.room_name,
    })),
    offsiteResource,
  ]
}

export function bookingToCalendarEvent(
  booking: Booking,
  exams: Exam[] = [],
): BookingCalendarEvent | null {
  if (booking.room?.deleted) {
    return null
  }

  const room = booking.room ?? null
  const resourceId = booking.room_id ?? '_offsite'
  const exam =
    exams.find((candidate) => candidate.booking_id === booking.booking_id) ??
    null
  const name =
    booking.stat_flag && booking.blackout_notes
      ? booking.blackout_notes
      : (booking.booking_name ?? '')
  const color = getBookingEventColor({
    blackoutFlag: booking.blackout_flag,
    room,
    stat: booking.stat_flag,
  })

  return {
    blackout_flag: booking.blackout_flag,
    blackout_notes: booking.blackout_notes,
    booking,
    booking_contact_information: booking.booking_contact_information,
    color,
    end: utcToOfficeDate(
      booking.end_time,
      booking.office.timezone.timezone_name,
    ),
    exam,
    fees: booking.fees,
    id: booking.booking_id,
    name,
    recurring_uuid: booking.recurring_uuid,
    resourceId,
    room,
    start: utcToOfficeDate(
      booking.start_time,
      booking.office.timezone.timezone_name,
    ),
    stat_flag: booking.stat_flag,
    title: name,
  }
}

export function filterBookingEvents({
  events,
  mode,
  search,
}: {
  events: BookingCalendarEvent[]
  mode: 'onsite' | 'offsite' | 'both'
  search: string
}) {
  const byLocation = events.filter((event) => {
    if (mode === 'onsite') {
      return event.resourceId !== '_offsite'
    }

    if (mode === 'offsite') {
      return event.resourceId === '_offsite'
    }

    return true
  })
  const term = search.trim().toLowerCase()

  if (!term) {
    return byLocation
  }

  return byLocation.filter((event) =>
    JSON.stringify(event).toLowerCase().includes(term),
  )
}

export function canSelectBookingSlot({
  resourceId,
  scheduling,
  start,
}: {
  resourceId: number | string | null | undefined
  scheduling: boolean
  start: Date
}) {
  if (!scheduling) {
    return false
  }

  if (resourceId === '_offsite') {
    return false
  }

  if (start.getDay() === 0 || start.getDay() === 6) {
    return false
  }

  return !isPast(start)
}

export function isWithinBookingHours(start: Date, end: Date) {
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const min = bookingWorkdayStart.hours * 60 + bookingWorkdayStart.minutes
  const max = bookingWorkdayEnd.hours * 60 + bookingWorkdayEnd.minutes

  return startMinutes >= min && endMinutes <= max && end > start
}

export function buildRecurringBookingWindows({
  count,
  endDate,
  endTime,
  frequency,
  startDate,
  startTime,
  weekdays,
}: {
  count?: number | null
  endDate: Date
  endTime: Date
  frequency: 'daily' | 'weekly'
  startDate: Date
  startTime: Date
  weekdays: Weekday[]
}) {
  const durationMinutes = diffMinutes(startTime, endTime)
  const rule = new RRule({
    byweekday: weekdays.length ? weekdays : undefined,
    count: count || undefined,
    dtstart: new Date(
      Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes(),
      ),
    ),
    freq: frequency === 'weekly' ? RRule.WEEKLY : RRule.DAILY,
    until: new Date(
      Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes(),
      ),
    ),
  })

  return rule.all().map((start) => ({
    end: addMinutes(start, durationMinutes),
    start,
  }))
}

export function getExamDurationMinutes(exam: Exam) {
  const hours = exam.exam_type.number_of_hours ?? 0
  const minutes = exam.exam_type.number_of_minutes ?? 0
  const total = hours * 60 + minutes

  return total > 0 ? total : 30
}

export function isAfterExamExpiry(start: Date, exam: Exam | null) {
  if (!exam?.expiry_date) {
    return false
  }

  const [datePart] = exam.expiry_date.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const expiry =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month - 1, day)
      : new Date(exam.expiry_date)

  if (Number.isNaN(expiry.getTime())) {
    return false
  }

  return start > endOfLocalDay(expiry)
}

export function endOfLocalDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  )
}

function getBookingEventColor({
  blackoutFlag,
  room,
  stat,
}: {
  blackoutFlag?: string | null
  room: Room | null
  stat?: boolean | null
}) {
  if (stat) {
    return '#757575'
  }

  if (blackoutFlag === 'Y') {
    return '#000000'
  }

  if (!room) {
    return offsiteResource.eventColor
  }

  return room.color || '#1a5a96'
}
