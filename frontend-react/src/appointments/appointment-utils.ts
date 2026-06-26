import { RRule, type Weekday } from 'rrule'

import { addMinutes, diffMinutes, utcToOfficeDate } from '@/lib/datetime'

import type { Appointment, Office, Service } from '@/api/schemas'

export interface AppointmentCalendarEvent {
  appointment: Appointment
  appointment_id: number
  blackout_flag?: string | null
  citizen_id?: number | null
  color: string
  comments?: string | null
  contact_information?: string | null
  end: Date
  is_draft?: boolean | null
  online_flag?: boolean | null
  recurring_uuid?: string | null
  service_id?: number | null
  serviceName: string
  start: Date
  stat_flag?: boolean | null
  title: string
}

export interface AppointmentWindow {
  end: Date
  start: Date
}

export const appointmentWorkdayStart = { hours: 8, minutes: 30 }
export const appointmentWorkdayEnd = { hours: 17, minutes: 0 }

export function appointmentsEnabled(office: Office | null | undefined) {
  return office?.appointments_enabled_ind === 1
}

export function appointmentToCalendarEvent(
  appointment: Appointment,
  services: Service[],
): AppointmentCalendarEvent {
  const timezone = appointment.office.timezone.timezone_name
  const serviceId = normalizeServiceId(appointment.service_id)
  const service =
    appointment.service ??
    services.find((candidate) => candidate.service_id === serviceId) ??
    null
  const blocked =
    appointment.is_draft ||
    appointment.blackout_flag === 'Y' ||
    appointment.stat_flag

  return {
    appointment,
    appointment_id: appointment.appointment_id,
    blackout_flag: appointment.blackout_flag,
    citizen_id: appointment.citizen_id,
    color: blocked ? '#757575' : (service?.css_colour ?? 'cal-events-default'),
    comments: appointment.comments,
    contact_information: appointment.contact_information,
    end: utcToOfficeDate(appointment.end_time, timezone),
    is_draft: appointment.is_draft,
    online_flag: appointment.online_flag,
    recurring_uuid: appointment.recurring_uuid,
    service_id: serviceId,
    serviceName: service?.service_name ?? '',
    start: utcToOfficeDate(appointment.start_time, timezone),
    stat_flag: appointment.stat_flag,
    title: appointment.citizen_name ?? '',
  }
}

export function getServiceName(appointment: Appointment, services: Service[]) {
  const serviceId = normalizeServiceId(appointment.service_id)
  return (
    appointment.service?.service_name ??
    services.find((service) => service.service_id === serviceId)
      ?.service_name ??
    'N/A'
  )
}

export function getAppointmentLengthOptions(
  appointment: AppointmentCalendarEvent | null,
  selectedService: Service | null,
) {
  const options = [15, 30, 45, 60, 75]
  const serviceDuration = selectedService?.timeslot_duration

  if (serviceDuration && !options.includes(serviceDuration)) {
    options.push(serviceDuration)
  }

  if (appointment) {
    const currentDuration = diffMinutes(appointment.start, appointment.end)

    if (currentDuration > 0 && !options.includes(currentDuration)) {
      options.push(currentDuration)
    }
  }

  return options.sort((left, right) => left - right)
}

export function isWithinAppointmentHours(start: Date, end: Date) {
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const min =
    appointmentWorkdayStart.hours * 60 + appointmentWorkdayStart.minutes
  const max = appointmentWorkdayEnd.hours * 60 + appointmentWorkdayEnd.minutes

  return startMinutes >= min && endMinutes <= max
}

export function getNextValidAppointmentStart(now = new Date()) {
  const next = new Date(now)
  next.setSeconds(0, 0)

  const remainder = next.getMinutes() % 15
  next.setMinutes(next.getMinutes() + (remainder === 0 ? 15 : 15 - remainder))

  const minMinutes =
    appointmentWorkdayStart.hours * 60 + appointmentWorkdayStart.minutes
  const maxMinutes = appointmentWorkdayEnd.hours * 60
  const nextMinutes = next.getHours() * 60 + next.getMinutes()

  if (nextMinutes < minMinutes) {
    next.setHours(
      appointmentWorkdayStart.hours,
      appointmentWorkdayStart.minutes,
      0,
      0,
    )
  } else if (nextMinutes >= maxMinutes) {
    next.setDate(next.getDate() + 1)
    next.setHours(
      appointmentWorkdayStart.hours,
      appointmentWorkdayStart.minutes,
      0,
      0,
    )
  }

  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1)
    next.setHours(
      appointmentWorkdayStart.hours,
      appointmentWorkdayStart.minutes,
      0,
      0,
    )
  }

  return next
}

export function buildRecurringWindows({
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

export function countOverlappingAppointments(
  appointments: Appointment[],
  windows: AppointmentWindow[],
) {
  return appointments.filter((appointment) => {
    if (appointment.blackout_flag === 'Y' || appointment.stat_flag) {
      return false
    }

    const start = new Date(appointment.start_time)
    const end = new Date(appointment.end_time)

    return windows.some((window) => start < window.end && end > window.start)
  }).length
}

function normalizeServiceId(value: unknown) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}
