import { TZDate } from '@date-fns/tz'
import { CalendarDate } from '@internationalized/date'

import type { SelectedSlot } from '@/store/booking-store'

export function apiDateKeyToCalendarDate(dateKey: string) {
  const [month, day, year] = dateKey.split('/').map(Number)
  if (!month || !day || !year) {
    throw new Error(`Invalid appointment date key: ${dateKey}`)
  }
  return new CalendarDate(year, month, day)
}

export function calendarDateToApiKey(
  date: Pick<CalendarDate, 'day' | 'month' | 'year'>,
) {
  return [
    String(date.month).padStart(2, '0'),
    String(date.day).padStart(2, '0'),
    date.year,
  ].join('/')
}

export function officeSlotToUtcIso(
  dateKey: string,
  time: string,
  timezone: string,
) {
  const [month, day, year] = dateKey.split('/').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  if (!month || !day || !year || hours === undefined || minutes === undefined) {
    throw new Error('Invalid appointment date or time')
  }
  const zoned = new TZDate(year, month - 1, day, hours, minutes, 0, 0, timezone)
  return new Date(zoned.getTime()).toISOString()
}

export function formatOfficeDate(
  dateKey: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
) {
  const [month, day, year] = dateKey.split('/').map(Number)
  const date = new TZDate(year!, month! - 1, day!, 12, 0, 0, timezone)
  return new Intl.DateTimeFormat('en-CA', {
    ...options,
    timeZone: timezone,
  }).format(date)
}

export function formatOfficeTime(
  value: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  },
) {
  return new Intl.DateTimeFormat('en-CA', {
    ...options,
    timeZone: timezone,
  }).format(new Date(value))
}

export function utcIsoToApiDateKey(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value
  return `${part('month')}/${part('day')}/${part('year')}`
}

export function formatSlotTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatSelectedSlot(slot: SelectedSlot, timezone: string) {
  return `${formatOfficeDate(slot.dateKey, timezone)} ${formatOfficeTime(
    slot.startTime,
    timezone,
  )} – ${formatOfficeTime(slot.endTime, timezone)}`
}
