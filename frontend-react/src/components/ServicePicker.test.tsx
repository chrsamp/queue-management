import { useState } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { Category, Service } from '@/api/schemas'

import ServicePicker from './ServicePicker'

const categories = [
  { service_id: 10, service_name: 'Permits' },
  { service_id: 20, service_name: 'Accounts' },
  { service_id: 30, service_name: 'Unused' },
] satisfies Category[]

const services = [
  {
    parent: { service_name: 'Permits' },
    parent_id: 10,
    service_desc: 'Apply for a card',
    service_id: 100,
    service_name: 'Licence',
  },
  {
    parent: { service_name: 'Accounts' },
    parent_id: 20,
    service_desc: 'Staff work',
    service_id: 200,
    service_name: 'Account review',
  },
] satisfies Service[]

function renderPicker(onSelectService = vi.fn()) {
  function Harness() {
    const [search, setSearch] = useState('')
    const [categoryId, setCategoryId] = useState<number | null>(null)
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
      null,
    )

    return (
      <ServicePicker
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        onSearchChange={setSearch}
        onSelectService={(service) => {
          setSelectedServiceId(service.service_id)
          setSearch(service.service_name)
          onSelectService(service)
        }}
        search={search}
        selectedServiceId={selectedServiceId}
        services={services}
      />
    )
  }

  render(<Harness />)
}

afterEach(() => {
  cleanup()
})

describe('ServicePicker', () => {
  test('filters services by search text and empty state', () => {
    renderPicker()

    const searchInput = screen.getByPlaceholderText('Type service here')
    fireEvent.change(searchInput, { target: { value: 'staff' } })

    expect(screen.getByRole('button', { name: 'Account review' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Licence' })).toBeNull()

    fireEvent.change(searchInput, { target: { value: 'missing' } })

    expect(
      screen.getByText('No services match the current filters.'),
    ).toBeVisible()
  })

  test('filters services by category', () => {
    renderPicker()

    fireEvent.change(screen.getByLabelText('Filter by category'), {
      target: { value: '10' },
    })

    expect(screen.getByRole('button', { name: 'Licence' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Account review' })).toBeNull()
  })

  test('selects a service row and reflects the selected search value', () => {
    const onSelectService = vi.fn()
    renderPicker(onSelectService)

    fireEvent.click(screen.getByRole('button', { name: 'Licence' }))

    expect(onSelectService).toHaveBeenCalledWith(
      expect.objectContaining({ service_id: 100 }),
    )
    expect(screen.getByPlaceholderText('Type service here')).toHaveValue(
      'Licence',
    )

    const row = screen.getByRole('button', { name: 'Licence' }).closest('tr')
    expect(row).toHaveClass('bg-bc-button-secondary-pressed')
  })

  test('renders optional action columns', () => {
    render(
      <ServicePicker
        actionColumns={[
          {
            header: 'Serve',
            render: (service) => (
              <button type="button">Serve {service.service_name}</button>
            ),
          },
        ]}
        categories={categories}
        categoryId={null}
        onCategoryChange={vi.fn()}
        onSearchChange={vi.fn()}
        onSelectService={vi.fn()}
        search=""
        selectedServiceId={null}
        services={services}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Serve' })).toBeVisible()
    expect(
      within(screen.getByRole('row', { name: /Serve Licence/ })).getByRole(
        'button',
        { name: 'Serve Licence' },
      ),
    ).toBeVisible()
  })
})
