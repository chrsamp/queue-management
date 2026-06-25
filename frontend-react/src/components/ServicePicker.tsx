import { type ReactNode, type RefObject, useMemo } from 'react'

import type { Category, Service } from '@/api/schemas'

import {
  filterServicePickerServices,
  getServiceCategoryOptions,
} from './service-picker-utils'

interface ServicePickerActionColumn {
  header: string
  render: (service: Service) => ReactNode
  widthClassName?: string
}

interface ServicePickerProps {
  actionColumns?: ServicePickerActionColumn[]
  categoryId: number | null
  categories: Category[]
  search: string
  searchInputRef?: RefObject<HTMLInputElement | null>
  selectedServiceId: number | null
  services: Service[]
  onCategoryChange: (categoryId: number | null) => void
  onSearchChange: (search: string) => void
  onSelectService: (service: Service) => void
}

export default function ServicePicker({
  actionColumns = [],
  categoryId,
  categories,
  search,
  searchInputRef,
  selectedServiceId,
  services,
  onCategoryChange,
  onSearchChange,
  onSelectService,
}: ServicePickerProps) {
  const categoryOptions = useMemo(
    () => getServiceCategoryOptions(categories, services),
    [categories, services],
  )
  const filteredServices = useMemo(
    () => filterServicePickerServices({ categoryId, search, services }),
    [categoryId, search, services],
  )

  return (
    <>
      <div className="grid grid-cols-[minmax(0,7fr)_minmax(12rem,3fr)] gap-3">
        <label className="block">
          <span className="sr-only">Type service here</span>
          <input
            className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 w-full rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Type service here"
            ref={searchInputRef}
            value={search}
          />
        </label>
        <select
          aria-label="Filter by category"
          className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
          onChange={(event) =>
            onCategoryChange(Number(event.target.value) || null)
          }
          value={categoryId ?? ''}
        >
          <option value="">Categories</option>
          {categoryOptions.map((category) => (
            <option key={category.service_id} value={category.service_id}>
              {category.service_name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-bc-gray-110 py-4">
        <div className="border-bc-border max-h-64 overflow-auto border bg-white">
          <table className="w-full border-collapse text-left">
            <thead className="bg-bc-secondary text-bc-white sticky top-0">
              <tr>
                {actionColumns.map((column) => (
                  <th
                    className={`border-bc-border border-b px-3 py-2 text-center font-normal ${column.widthClassName ?? ''}`}
                    key={column.header}
                  >
                    {column.header}
                  </th>
                ))}
                <th className="border-bc-border border-b px-3 py-2 font-normal">
                  Service
                </th>
                <th className="border-bc-border border-b px-3 py-2 font-normal">
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => {
                const selected = service.service_id === selectedServiceId

                return (
                  <tr
                    className={
                      selected
                        ? 'bg-bc-button-secondary-pressed'
                        : 'hover:bg-bc-button-secondary-hover'
                    }
                    key={service.service_id}
                  >
                    {actionColumns.map((column) => (
                      <td
                        className="border-bc-border border-t px-3 py-2 text-center"
                        key={column.header}
                      >
                        {column.render(service)}
                      </td>
                    ))}
                    <td className="border-bc-border border-t px-3 py-2">
                      <button
                        className="focus-visible:outline-bc-focus w-full cursor-pointer bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                        onClick={() => onSelectService(service)}
                        title={service.service_desc ?? undefined}
                        type="button"
                      >
                        {service.service_name}
                      </button>
                    </td>
                    <td className="border-bc-border border-t px-3 py-2">
                      {service.parent?.service_name ?? ''}
                    </td>
                  </tr>
                )
              })}
              {filteredServices.length === 0 && (
                <tr>
                  <td
                    className="text-bc-secondary px-3 py-6 text-center"
                    colSpan={2 + actionColumns.length}
                  >
                    No services match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
