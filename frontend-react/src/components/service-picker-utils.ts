import type { Category, Service } from '@/api/schemas'

export function getServiceCategoryOptions(
  categories: Category[],
  services: Service[],
) {
  const parentIds = new Set(services.map((service) => service.parent_id))

  return categories.filter((category) => parentIds.has(category.service_id))
}

export function filterServicePickerServices({
  categoryId,
  search,
  services,
}: {
  categoryId: number | null
  search: string
  services: Service[]
}) {
  const normalizedSearch = search.trim().toLowerCase()

  return services
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
