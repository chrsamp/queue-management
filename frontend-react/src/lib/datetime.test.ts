import { describe, expect, test } from 'vitest'

import {
  addMinutes,
  diffMinutes,
  formatDateInputValue,
  formatTimeInputValue,
  isPast,
  mergeDateAndTime,
  officeDateToUtcIso,
  utcToOfficeDate,
} from './datetime'

describe('datetime', () => {
  describe('isPast', () => {
    test('returns true for a date in the past', () => {
      const past = new Date('2020-01-01')
      const now = new Date('2026-01-01')
      expect(isPast(past, now)).toBe(true)
    })

    test('returns false for a date in the future', () => {
      const future = new Date('2030-01-01')
      const now = new Date('2026-01-01')
      expect(isPast(future, now)).toBe(false)
    })

    test('returns false for the same instant', () => {
      const now = new Date('2026-01-01T12:00:00Z')
      expect(isPast(new Date(now), now)).toBe(false)
    })
  })

  describe('addMinutes', () => {
    test('adds minutes to a date', () => {
      const date = new Date('2026-01-01T10:00:00Z')
      expect(addMinutes(date, 30).toISOString()).toBe(
        '2026-01-01T10:30:00.000Z',
      )
    })

    test('handles zero minutes', () => {
      const date = new Date('2026-01-01T10:00:00Z')
      expect(addMinutes(date, 0).getTime()).toBe(date.getTime())
    })

    test('handles negative minutes', () => {
      const date = new Date('2026-01-01T10:00:00Z')
      expect(addMinutes(date, -15).toISOString()).toBe(
        '2026-01-01T09:45:00.000Z',
      )
    })
  })

  describe('diffMinutes', () => {
    test('returns positive difference', () => {
      const start = new Date('2026-01-01T10:00:00Z')
      const end = new Date('2026-01-01T11:30:00Z')
      expect(diffMinutes(start, end)).toBe(90)
    })

    test('returns zero for same instant', () => {
      const date = new Date('2026-01-01T10:00:00Z')
      expect(diffMinutes(date, date)).toBe(0)
    })

    test('returns negative for reversed order', () => {
      const start = new Date('2026-01-01T11:00:00Z')
      const end = new Date('2026-01-01T10:00:00Z')
      expect(diffMinutes(start, end)).toBe(-60)
    })
  })

  describe('utcToOfficeDate', () => {
    test('converts UTC ISO string to office wall time', () => {
      const result = utcToOfficeDate(
        '2026-06-24T20:30:00+00:00',
        'America/Vancouver',
      )
      expect(result.getFullYear()).toBe(2026)
      expect(result.getMonth()).toBe(5)
      expect(result.getDate()).toBe(24)
      expect(result.getHours()).toBe(13)
      expect(result.getMinutes()).toBe(30)
    })
  })

  describe('officeDateToUtcIso', () => {
    test('converts office wall time to UTC ISO string', () => {
      const start = new Date(2026, 5, 26, 8, 30)
      expect(officeDateToUtcIso(start, 'America/Vancouver')).toBe(
        '2026-06-26T15:30:00.000Z',
      )
    })

    test('handles end of day boundary', () => {
      const end = new Date(2026, 5, 26, 17, 0)
      expect(officeDateToUtcIso(end, 'America/Vancouver')).toBe(
        '2026-06-27T00:00:00.000Z',
      )
    })
  })

  describe('formatDateInputValue', () => {
    test('formats date as YYYY-MM-DD', () => {
      const date = new Date(2026, 5, 24)
      expect(formatDateInputValue(date)).toBe('2026-06-24')
    })

    test('zero-pads single-digit month and day', () => {
      const date = new Date(2026, 0, 5)
      expect(formatDateInputValue(date)).toBe('2026-01-05')
    })
  })

  describe('formatTimeInputValue', () => {
    test('formats time as HH:MM', () => {
      const date = new Date(2026, 5, 24, 13, 30)
      expect(formatTimeInputValue(date)).toBe('13:30')
    })

    test('zero-pads single-digit hours and minutes', () => {
      const date = new Date(2026, 5, 24, 9, 5)
      expect(formatTimeInputValue(date)).toBe('09:05')
    })
  })

  describe('mergeDateAndTime', () => {
    test('combines date string and time string into a Date', () => {
      const result = mergeDateAndTime('2026-06-24', '13:30')
      expect(result.getFullYear()).toBe(2026)
      expect(result.getMonth()).toBe(5)
      expect(result.getDate()).toBe(24)
      expect(result.getHours()).toBe(13)
      expect(result.getMinutes()).toBe(30)
      expect(result.getSeconds()).toBe(0)
    })
  })
})
