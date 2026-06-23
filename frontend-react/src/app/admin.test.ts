import { describe, expect, test } from 'vitest'

import {
  buildAdminFrameUrl,
  getAdminOptions,
  getDefaultAdminView,
  isAdminRole,
} from './admin'

describe('admin routing helpers', () => {
  test('detects legacy admin roles', () => {
    expect(isAdminRole('GA')).toBe(true)
    expect(isAdminRole('ANALYTICS')).toBe(true)
    expect(isAdminRole('HELPDESK')).toBe(true)
    expect(isAdminRole('SUPPORT')).toBe(true)
    expect(isAdminRole('CSR')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
  })

  test('resolves legacy default admin views', () => {
    expect(getDefaultAdminView('SUPPORT')).toBe('csr')
    expect(getDefaultAdminView('ANALYTICS')).toBe('service')
    expect(getDefaultAdminView('GA')).toBe('csrga')
    expect(getDefaultAdminView('HELPDESK')).toBe('csrga')
  })

  test('returns role-specific selector options', () => {
    expect(getAdminOptions('SUPPORT').map((option) => option.id)).toContain(
      'smartboard',
    )
    expect(getAdminOptions('GA').map((option) => option.id)).toEqual([
      'csrga',
      'invigilator',
      'room',
      'officega',
      'timeslot',
    ])
    expect(getAdminOptions('ANALYTICS')).toEqual([])
  })

  test('builds iframe URLs from the configured API origin', () => {
    expect(buildAdminFrameUrl('https://api.example.test/base', 'service')).toBe(
      'https://api.example.test/admin/service/',
    )
  })
})
