import { describe, expect, it } from 'vitest'

import {
  apiDateKeyToCalendarDate,
  calendarDateToApiKey,
  officeSlotToUtcIso,
} from './booking-datetime'

describe('booking date and time conversion', () => {
  it('round trips API date keys without using the browser timezone', () => {
    const date = apiDateKeyToCalendarDate('07/15/2030')

    expect(date.toString()).toBe('2030-07-15')
    expect(calendarDateToApiKey(date)).toBe('07/15/2030')
  })

  it('converts historic standard and daylight office times to UTC', () => {
    expect(officeSlotToUtcIso('01/15/2024', '09:00', 'America/Vancouver')).toBe(
      '2024-01-15T17:00:00.000Z',
    )
    expect(officeSlotToUtcIso('07/15/2024', '09:00', 'America/Vancouver')).toBe(
      '2024-07-15T16:00:00.000Z',
    )
  })

  it('uses the office timezone across a daylight-saving boundary', () => {
    expect(officeSlotToUtcIso('03/10/2024', '01:30', 'America/Vancouver')).toBe(
      '2024-03-10T09:30:00.000Z',
    )
    expect(officeSlotToUtcIso('03/10/2024', '03:30', 'America/Vancouver')).toBe(
      '2024-03-10T10:30:00.000Z',
    )
  })
})
