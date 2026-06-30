import type { Office, Service } from '@/api/schemas'

export const OFFICE_VISIBLE = 'Status.SHOW'
export const SERVICE_HIDDEN = 'Availability.HIDE'
export const SERVICE_DISABLED = 'Availability.DISABLE'

const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export interface OfficeHours {
  day: (typeof weekDays)[number]
  end: string | null
  start: string | null
}

export function getVisibleOffices(offices: Office[]) {
  return offices
    .filter(
      (office) =>
        !office.deleted &&
        Boolean(office.appointments_enabled_ind) &&
        office.online_status === OFFICE_VISIBLE,
    )
    .toSorted((a, b) =>
      a.office_name.localeCompare(b.office_name, 'en', {
        sensitivity: 'base',
      }),
    )
}

export function getVisibleServices(services: Service[]) {
  return services
    .filter(
      (service) =>
        Boolean(service.actual_service_ind) &&
        Boolean(service.display_dashboard_ind) &&
        service.online_availability !== SERVICE_HIDDEN,
    )
    .toSorted((a, b) => {
      const aName = a.external_service_name
      const bName = b.external_service_name
      if (aName == null && bName == null) return 0
      if (aName == null) return 1
      if (bName == null) return -1
      return aName.localeCompare(bName, 'en', { sensitivity: 'base' })
    })
}

export function getServiceDisplayName(service: Service) {
  return service.external_service_name?.trim() || service.service_name
}

export function getRelevantCategories(
  categories: Service[],
  services: Service[],
) {
  const parentIds = new Set(
    services
      .map((service) => service.parent_id)
      .filter((id): id is number => id !== null),
  )
  return categories
    .filter((category) => parentIds.has(category.service_id))
    .toSorted((a, b) =>
      getServiceDisplayName(a).localeCompare(getServiceDisplayName(b), 'en', {
        sensitivity: 'base',
      }),
    )
}

export function filterServices({
  categoryId,
  search,
  services,
}: {
  categoryId: number | null
  search: string
  services: Service[]
}) {
  const normalizedSearch = search.trim().toLocaleLowerCase()
  return services.filter((service) => {
    if (categoryId !== null) return service.parent_id === categoryId
    if (!normalizedSearch) return true
    return `${getServiceDisplayName(service)} ${service.service_desc ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedSearch)
  })
}

function toMinutes(value: string | undefined) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (
    hours === undefined ||
    minutes === undefined ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null
  }
  return hours * 60 + minutes
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  const suffix = hours >= 12 ? 'p.m.' : 'a.m.'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function getOfficeHours(office: Office): OfficeHours[] {
  return weekDays.map((day) => {
    const matchingSchedules = office.timeslots.filter((schedule) =>
      schedule.day_of_week?.includes(day),
    )
    const starts = matchingSchedules
      .map((schedule) => toMinutes(schedule.start_time))
      .filter((value): value is number => value !== null)
    const ends = matchingSchedules
      .map((schedule) => toMinutes(schedule.end_time))
      .filter((value): value is number => value !== null)

    return {
      day,
      end: ends.length > 0 ? formatMinutes(Math.max(...ends)) : null,
      start: starts.length > 0 ? formatMinutes(Math.min(...starts)) : null,
    }
  })
}
