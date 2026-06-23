import type { Citizen, Office, Period, ServiceRequest } from '@/api/schemas'

const waitingPeriodName = 'Waiting'
const holdPeriodName = 'On hold'

export function isReceptionOffice(office: Office) {
  const smartboardType = office.sb?.sb_type

  return smartboardType === 'callbyname' || smartboardType === 'callbyticket'
}

export function isNotificationEnabled(office: Office) {
  return office.check_in_notification === 1
}

export function getActiveService(citizen: Citizen) {
  return citizen.service_reqs.find((serviceRequest) =>
    serviceRequest.periods.some(isActivePeriod),
  )
}

export function getActivePeriod(serviceRequest: ServiceRequest | undefined) {
  return serviceRequest?.periods.find(isActivePeriod) ?? null
}

export function getWaitingCitizens(citizens: Citizen[]) {
  return citizens.filter((citizen) => hasActivePeriodNamed(citizen, waitingPeriodName))
}

export function getHoldCitizens(citizens: Citizen[]) {
  return citizens.filter((citizen) => hasActivePeriodNamed(citizen, holdPeriodName))
}

export function getPriorityLabel(priority: number | null | undefined) {
  switch (priority) {
    case 1:
      return 'High'
    case 2:
      return 'Default'
    case 3:
      return 'Low'
    default:
      return ''
  }
}

export function getCounterName(
  office: Office,
  counterId: number | null | undefined,
) {
  if (counterId === null || counterId === undefined) {
    return ''
  }

  return (
    office.counters.find((counter) => counter.counter_id === counterId)
      ?.counter_name ?? ''
  )
}

export function getServedBy(citizen: Citizen) {
  const activeService = getActiveService(citizen)
  return getActivePeriod(activeService)?.csr.username ?? ''
}

export function getCategory(citizen: Citizen) {
  const activeService = getActiveService(citizen)

  if (!activeService) {
    return ''
  }

  return activeService.service.parent?.service_name ?? 'category'
}

export function getServiceName(citizen: Citizen) {
  return getActiveService(citizen)?.service.service_name ?? ''
}

export function parseQueueComments(citizen: Citizen) {
  const comments = citizen.citizen_comments ?? ''

  if (!comments.includes('|||')) {
    return {
      appointmentLabel: null,
      text: comments,
    }
  }

  const [appointment, text = ''] = comments.split('|||')

  if (!citizen.citizen_name) {
    return {
      appointmentLabel: null,
      text: comments,
    }
  }

  return {
    appointmentLabel: `${appointment} Appt: ${citizen.citizen_name}`,
    text,
  }
}

export function formatQueueTime(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString()
}

export function formatNotificationTime(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function hasActivePeriodNamed(citizen: Citizen, periodName: string) {
  if (citizen.service_reqs.length === 0) {
    return false
  }

  return citizen.service_reqs.some((serviceRequest) =>
    serviceRequest.periods.some(
      (period) => isActivePeriod(period) && period.ps.ps_name === periodName,
    ),
  )
}

function isActivePeriod(period: Period) {
  return period.time_end === null
}
