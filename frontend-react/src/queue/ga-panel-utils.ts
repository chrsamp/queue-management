import type {
  Citizen,
  CsrListItem,
  CsrState,
  ServiceRequest,
} from '@/api/schemas'

import { getActiveCitizenForCsr } from './queue-utils'

export type GaPanelStatus = 'active' | 'break' | 'inactive'

export interface GaPanelRow {
  citizen: Citizen | null
  csr: CsrListItem
  serviceName: string
  servingTime: string
  status: GaPanelStatus
  waitTime: string
}

export function buildGaPanelRows({
  citizens,
  csrs,
  csrStates,
  now,
}: {
  citizens: Citizen[]
  csrs: CsrListItem[]
  csrStates: CsrState[]
  now: Date
}) {
  const breakStateId = csrStates.find(
    (state) => state.csr_state_name === 'Break',
  )?.csr_state_id
  const activeRows: GaPanelRow[] = []
  const breakRows: GaPanelRow[] = []
  const inactiveRows: GaPanelRow[] = []

  const sortedCsrs = [...csrs].sort((left, right) =>
    left.username.localeCompare(right.username),
  )

  for (const csr of sortedCsrs) {
    const active = getActiveCitizenForCsr({
      citizens,
      csrId: csr.csr_id,
      username: csr.username,
    })

    if (active) {
      activeRows.push({
        citizen: active.citizen,
        csr,
        serviceName: active.serviceRequest.service.service_name,
        servingTime: getServingTime(active.serviceRequest, now),
        status: 'active',
        waitTime: getWaitTime(active.serviceRequest),
      })
      continue
    }

    if (breakStateId !== undefined && csr.csr_state_id === breakStateId) {
      breakRows.push({
        citizen: null,
        csr,
        serviceName: '',
        servingTime: '',
        status: 'break',
        waitTime: 'ON BREAK',
      })
      continue
    }

    inactiveRows.push({
      citizen: null,
      csr,
      serviceName: '',
      servingTime: '',
      status: 'inactive',
      waitTime: '',
    })
  }

  return [...activeRows, ...breakRows, ...inactiveRows]
}

export function getServingCsrCount(citizens: Citizen[]) {
  const csrIds = new Set<number>()

  for (const citizen of citizens) {
    for (const serviceRequest of citizen.service_reqs) {
      for (const period of serviceRequest.periods) {
        if (
          period.time_end === null &&
          period.csr_id !== null &&
          period.csr_id !== undefined &&
          ['Invited', 'Being Served'].includes(period.ps.ps_name)
        ) {
          csrIds.add(period.csr_id)
        }
      }
    }
  }

  return csrIds.size
}

function getWaitTime(serviceRequest: ServiceRequest) {
  const waitingPeriod = serviceRequest.periods.find(
    (period) => period.ps.ps_name === 'Waiting',
  )

  if (!waitingPeriod?.time_start || !waitingPeriod.time_end) {
    return ''
  }

  return formatDurationBetween(waitingPeriod.time_start, waitingPeriod.time_end)
}

function getServingTime(serviceRequest: ServiceRequest, now: Date) {
  let milliseconds = 0

  for (const period of serviceRequest.periods) {
    if (period.ps.ps_name !== 'Being Served' || !period.time_start) {
      continue
    }

    const start = new Date(period.time_start).getTime()
    const end = period.time_end
      ? new Date(period.time_end).getTime()
      : now.getTime()

    if (Number.isFinite(start) && Number.isFinite(end)) {
      milliseconds += Math.max(0, end - start)
    }
  }

  return milliseconds > 0 ? formatDuration(milliseconds) : ''
}

function formatDurationBetween(startValue: string, endValue: string) {
  const start = new Date(startValue).getTime()
  const end = new Date(endValue).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return ''
  }

  return formatDuration(Math.max(0, end - start))
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours}h ${minutes}m ${seconds}s`
}
