import type { Category, Channel, QuickService, Service } from '@/api/schemas'

export type AddCitizenMode =
  | 'add-citizen'
  | 'add-next-service'
  | 'back-office'
  | 'edit-service'
  | 'simplified'

export function getAvailableQuickItems(items: QuickService[] | undefined) {
  return (items ?? []).filter((item) => item.deleted === null)
}

export function getDefaultChannelId(
  channels: Channel[],
  mode: AddCitizenMode,
) {
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
    mode === 'add-citizen' || mode === 'add-next-service' || mode === 'edit-service'
      ? service.display_dashboard_ind === 1
      : service.display_dashboard_ind === 0,
  )
}

export function getCategoryOptions(
  categories: Category[],
  services: Service[],
) {
  const parentIds = new Set(services.map((service) => service.parent_id))

  return categories.filter((category) => parentIds.has(category.service_id))
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
  const normalizedSearch = search.trim().toLowerCase()

  return getModeServices(services, mode)
    .filter((service) => !categoryId || service.parent_id === categoryId)
    .filter((service) => {
      if (!normalizedSearch) {
        return true
      }

      return [
        service.service_name,
        service.service_desc ?? '',
        service.parent?.service_name ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    })
    .sort((left, right) => {
      const categoryCompare = (left.parent?.service_name ?? '').localeCompare(
        right.parent?.service_name ?? '',
      )

      if (categoryCompare !== 0) {
        return categoryCompare
      }

      return left.service_name.localeCompare(right.service_name)
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

export function createWalkinUniqueId() {
  if ('crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
