import type { Key } from 'react-aria-components'

export type AdminView =
  | 'channel'
  | 'counter'
  | 'csr'
  | 'csrga'
  | 'examtype'
  | 'invigilator'
  | 'office'
  | 'officega'
  | 'role'
  | 'room'
  | 'service'
  | 'smartboard'
  | 'timeslot'

export interface AdminOption {
  id: AdminView
  label: string
}

export const adminRoleCodes = ['GA', 'ANALYTICS', 'HELPDESK', 'SUPPORT']

export const supportAdminOptions: AdminOption[] = [
  { id: 'csr', label: 'CSRs' },
  { id: 'office', label: 'Offices' },
  { id: 'channel', label: 'Delivery Channels' },
  { id: 'role', label: 'User roles' },
  { id: 'service', label: 'Provided Services' },
  { id: 'smartboard', label: 'Smartboard Content' },
  { id: 'invigilator', label: 'Invigilators' },
  { id: 'room', label: 'Rooms' },
  { id: 'examtype', label: 'Exam Types' },
  { id: 'counter', label: 'Counters' },
  { id: 'timeslot', label: 'Time Slots' },
]

export const gaAdminOptions: AdminOption[] = [
  { id: 'csrga', label: 'CSRs' },
  { id: 'invigilator', label: 'Invigilators' },
  { id: 'room', label: 'Rooms' },
  { id: 'officega', label: 'Offices' },
  { id: 'timeslot', label: 'Time Slots' },
]

export function isAdminRole(roleCode: string | null | undefined) {
  return Boolean(roleCode && adminRoleCodes.includes(roleCode))
}

export function getDefaultAdminView(
  roleCode: string | null | undefined,
): AdminView {
  if (roleCode === 'SUPPORT') {
    return 'csr'
  }

  if (roleCode === 'ANALYTICS') {
    return 'service'
  }

  return 'csrga'
}

export function getAdminOptions(roleCode: string | null | undefined) {
  if (roleCode === 'SUPPORT') {
    return supportAdminOptions
  }

  if (roleCode === 'GA') {
    return gaAdminOptions
  }

  return []
}

export function keyToAdminView(key: Key): AdminView {
  return String(key) as AdminView
}

export function buildAdminFrameUrl(apiOrigin: string, view: AdminView) {
  return new URL(`/admin/${view}/`, apiOrigin).toString()
}
