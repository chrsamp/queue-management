import type { Category, Channel, QuickService, Service } from '@/api/schemas'
import {
  filterServicePickerServices,
  getServiceCategoryOptions,
} from '@/components/service-picker-utils'

export type AddCitizenMode =
  | 'add-citizen'
  | 'add-next-service'
  | 'back-office'
  | 'edit-service'

export function getAvailableQuickItems(items: QuickService[] | undefined) {
  return (items ?? []).filter((item) => item.deleted === null)
}

export function getDefaultChannelId(channels: Channel[], mode: AddCitizenMode) {
  if (mode === 'back-office') {
    const backOfficeChannel = channels.find(
      (channel) => channel.channel_name.toLowerCase() === 'back office',
    )

    if (backOfficeChannel) {
      return backOfficeChannel.channel_id
    }
  }

  return channels[0]?.channel_id ?? null
}

export function getModeServices(services: Service[], mode: AddCitizenMode) {
  return services.filter((service) =>
    mode === 'add-citizen' ||
    mode === 'add-next-service' ||
    mode === 'edit-service'
      ? service.display_dashboard_ind === 1
      : service.display_dashboard_ind === 0,
  )
}

export function getCategoryOptions(
  categories: Category[],
  services: Service[],
) {
  return getServiceCategoryOptions(categories, services)
}

export function filterServices({
  categoryId,
  mode,
  search,
  services,
}: {
  categoryId: number | null
  mode: AddCitizenMode
  search: string
  services: Service[]
}) {
  return filterServicePickerServices({
    categoryId,
    search,
    services: getModeServices(services, mode),
  })
}

export function formatNotificationPhone(value: string) {
  const cleaned = value.replace(/\D/g, '').slice(0, 10)
  const parts = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/)

  if (!parts) {
    return value
  }

  if (!parts[1]) {
    return ''
  }

  return `(${parts[1]}) ${parts[2]}-${parts[3]}`
}

export function isValidNotificationPhone(value: string) {
  return value === '' || value.length === 14
}

const emailPattern = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/

export function isValidNotificationEmail(value: string) {
  return value === '' || emailPattern.test(value)
}
