import { describe, expect, test } from 'vitest'

import type { Category, Channel, QuickService, Service } from '@/api/schemas'

import {
  filterServices,
  formatNotificationPhone,
  getAvailableQuickItems,
  getCategoryOptions,
  getDefaultChannelId,
  isValidNotificationEmail,
  isValidNotificationPhone,
} from './add-citizen-utils'

const channels = [
  { channel_id: 1, channel_name: 'In Person' },
  { channel_id: 2, channel_name: 'Back Office' },
] satisfies Channel[]

const categories = [
  { service_id: 10, service_name: 'Permits' },
  { service_id: 20, service_name: 'Accounts' },
  { service_id: 30, service_name: 'Unused' },
] satisfies Category[]

const services = [
  {
    actual_service_ind: 1,
    display_dashboard_ind: 1,
    parent: { service_name: 'Permits' },
    parent_id: 10,
    service_desc: 'Apply',
    service_id: 100,
    service_name: 'Licence',
  },
  {
    actual_service_ind: 1,
    display_dashboard_ind: 0,
    parent: { service_name: 'Accounts' },
    parent_id: 20,
    service_desc: 'Staff work',
    service_id: 200,
    service_name: 'Back office review',
  },
] satisfies Service[]

describe('add citizen utilities', () => {
  test('filters quick-list items to active services only', () => {
    const items = [
      { deleted: null, service_id: 1, service_name: 'Active' },
      { deleted: '2026-01-01', service_id: 2, service_name: 'Deleted' },
      { service_id: 3, service_name: 'Legacy missing deleted field' },
    ] satisfies QuickService[]

    expect(getAvailableQuickItems(items)).toEqual([
      { deleted: null, service_id: 1, service_name: 'Active' },
    ])
  })

  test('selects back office channel only for back-office mode', () => {
    expect(getDefaultChannelId(channels, 'add-citizen')).toBe(1)
    expect(getDefaultChannelId(channels, 'back-office')).toBe(2)
    expect(getDefaultChannelId([], 'back-office')).toBeNull()
  })

  test('builds category options from visible services', () => {
    expect(getCategoryOptions(categories, services).map((item) => item.service_name)).toEqual([
      'Permits',
      'Accounts',
    ])
  })

  test('filters services by mode, category, and search', () => {
    expect(
      filterServices({
        categoryId: null,
        mode: 'add-citizen',
        search: 'lic',
        services,
      }).map((service) => service.service_id),
    ).toEqual([100])
    expect(
      filterServices({
        categoryId: 20,
        mode: 'back-office',
        search: 'review',
        services,
      }).map((service) => service.service_id),
    ).toEqual([200])
  })

  test('formats and validates notification fields like the legacy form', () => {
    expect(formatNotificationPhone('2505551212')).toBe('(250) 555-1212')
    expect(formatNotificationPhone('250')).toBe('(250) -')
    expect(isValidNotificationPhone('(250) 555-1212')).toBe(true)
    expect(isValidNotificationPhone('(250) -')).toBe(false)
    expect(isValidNotificationEmail('pat@example.com')).toBe(true)
    expect(isValidNotificationEmail('pat@')).toBe(false)
  })
})
