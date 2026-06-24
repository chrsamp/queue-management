import type { Channel, Citizen, Office, Service } from '@/api/schemas'

import type { AddCitizenMode } from './add-citizen-utils'
import { getDefaultChannelId } from './add-citizen-utils'

export interface AddCitizenModalState {
  activeServiceRequestId: number | null
  categoryId: number | null
  channelId: number | null
  citizen: Citizen
  comments: string
  counterId: number | null
  mode: AddCitizenMode
  notificationEmail: string
  notificationPhone: string
  priority: number
  search: string
  selectedServiceId: number | null
  walkinUniqueId: string
}

export function createAddCitizenModalState({
  channels,
  citizen,
  mode,
  office,
  preselectedService,
}: {
  channels: Channel[]
  citizen: Citizen
  mode: AddCitizenMode
  office: Office
  preselectedService?: Pick<Service, 'service_id' | 'service_name'> | null
}): AddCitizenModalState {
  const sortedCounters = [...office.counters].sort((left, right) =>
    left.counter_name.localeCompare(right.counter_name),
  )

  return {
    activeServiceRequestId: null,
    categoryId: null,
    channelId: getDefaultChannelId(channels, mode),
    citizen,
    comments: '',
    counterId: sortedCounters[0]?.counter_id ?? null,
    mode,
    notificationEmail: '',
    notificationPhone: '',
    priority: 2,
    search: preselectedService?.service_name ?? '',
    selectedServiceId: preselectedService?.service_id ?? null,
    walkinUniqueId: '',
  }
}
