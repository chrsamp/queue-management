import { TZDate } from '@date-fns/tz'

export function isPast(date: Date, now = new Date()) {
  return date.getTime() < now.getTime()
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000)
}

export function diffMinutes(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000)
}

export function utcToOfficeDate(value: string, timezone: string) {
  const zoned = new TZDate(value, timezone)

  return new Date(
    zoned.getFullYear(),
    zoned.getMonth(),
    zoned.getDate(),
    zoned.getHours(),
    zoned.getMinutes(),
    zoned.getSeconds(),
    zoned.getMilliseconds(),
  )
}

export function officeDateToUtcIso(value: Date, timezone: string) {
  const zoned = new TZDate(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    value.getHours(),
    value.getMinutes(),
    value.getSeconds(),
    value.getMilliseconds(),
    timezone,
  )

  return new Date(zoned.getTime()).toISOString()
}

export function formatDateInputValue(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')
}

export function formatTimeInputValue(value: Date) {
  return [
    String(value.getHours()).padStart(2, '0'),
    String(value.getMinutes()).padStart(2, '0'),
  ].join(':')
}

export function mergeDateAndTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours, minutes] = timeValue.split(':').map(Number)

  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}
