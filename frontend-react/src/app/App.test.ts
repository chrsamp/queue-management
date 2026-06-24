import { describe, expect, test } from 'vitest'

import {
  getEnvironmentStripClassName,
  getHeaderTitle,
  getNavigationUsername,
} from './app-shell-utils'

describe('App shell helpers', () => {
  test.each([
    ['/queue', 'Queue Management'],
    ['/appointments', 'Appointments'],
    ['/exams', 'Exam Inventory'],
    ['/booking', 'Room Bookings'],
    ['/admin', 'Admin'],
    ['/', 'Queue Management'],
  ])('maps %s to %s', (pathname, title) => {
    expect(getHeaderTitle(pathname)).toBe(title)
  })

  test.each([
    ['test-q.apps.example.gov.bc.ca', 'bg-bc-gold'],
    ['dev-q.apps.example.gov.bc.ca', 'bg-bc-success'],
    ['localhost:5173', 'bg-bc-local-env'],
    ['127.0.0.1:5173', 'bg-bc-local-env'],
    ['192.168.1.20:5173', 'bg-bc-local-env'],
    ['local-q.example', 'bg-bc-local-env'],
    ['q.apps.example.gov.bc.ca', null],
  ])('maps host %s to %s', (host, className) => {
    expect(getEnvironmentStripClassName(host)).toBe(className)
  })

  test.each([
    ['Staff User', 'staff.user@idir', 'Staff User'],
    [null, 'staff.user@idir', 'staff.user@idir'],
    [undefined, 'staff.user@idir', 'staff.user@idir'],
    [null, null, null],
  ])(
    'uses display name %s and username %s as nav label %s',
    (displayName, username, expected) => {
      expect(getNavigationUsername(displayName, username)).toBe(expected)
    },
  )
})
