import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'

import ApiProvider from '@/api/ApiProvider'
import { ApiClient } from '@/api/client'
import type { AuthService } from '@/auth/auth-service'
import { useBookingStore } from '@/store/booking-store'

vi.mock('@/booking/OfficeMap', () => ({
  default: ({ office }: { office: { office_name: string } }) => (
    <div aria-label={`Map showing ${office.office_name}`} />
  ),
}))

import AppointmentBooking from './AppointmentBooking'

function renderBooking() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const apiClient = new ApiClient({
    authService: {} as AuthService,
    baseUrl: 'http://localhost:5000/api/v1',
  })
  return render(
    <ApiProvider client={apiClient}>
      <QueryClientProvider client={queryClient}>
        <AppointmentBooking />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: string | RegExp,
  optionName: RegExp,
) {
  await user.click(await screen.findByLabelText(triggerName))
  await user.click(await screen.findByRole('option', { name: optionName }))
}

beforeEach(() => {
  window.sessionStorage.clear()
  useBookingStore.getState().clearBooking()
})

afterEach(() => {
  cleanup()
})

describe('appointment booking location and service flow', () => {
  it('selects an office, shows its details, and navigates back from services', async () => {
    const user = userEvent.setup()
    renderBooking()

    await selectOption(user, 'Select Office', /Victoria Service BC Centre/)

    expect(
      screen.getByRole('heading', {
        name: 'Victoria Service BC Centre',
      }),
    ).toBeVisible()
    expect(screen.getByText('250-555-0100')).toBeVisible()
    expect(screen.getAllByText('8:30 a.m. – 4:30 p.m.')).toHaveLength(5)
    expect(
      screen.getByLabelText('Map showing Victoria Service BC Centre'),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Book Appointment' }))
    expect(
      screen.getByRole('heading', { name: 'Service Selection' }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(
      screen.getByRole('heading', {
        name: 'Book an Appointment at Service BC',
      }),
    ).toHaveFocus()
  })

  it('filters the Available Services dialog and resets its filters', async () => {
    const user = userEvent.setup()
    renderBooking()
    await selectOption(user, 'Select Office', /Victoria Service BC Centre/)

    await user.click(screen.getByRole('button', { name: 'Available Services' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Unavailable Service')).toBeVisible()
    expect(within(dialog).queryByText('Hidden Service')).toBeNull()

    await user.type(
      within(dialog).getByRole('searchbox', { name: 'Search Service' }),
      'knowledge',
    )
    expect(within(dialog).getByText('Knowledge Test')).toBeVisible()
    expect(within(dialog).queryByText('General Service')).toBeNull()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Available Services' }))
    expect(
      within(await screen.findByRole('dialog')).getByText('General Service'),
    ).toBeVisible()
  })

  it('blocks an unavailable service and advances a bookable service', async () => {
    const user = userEvent.setup()
    renderBooking()
    await selectOption(user, 'Select Office', /Victoria Service BC Centre/)
    await user.click(screen.getByRole('button', { name: 'Book Appointment' }))

    await selectOption(user, 'Select Service', /Unavailable Service/)
    expect(screen.getByText(/is not available by appointment/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /Next/ })).toBeNull()

    await selectOption(user, /Unavailable Service/, /General Service/)
    await user.click(screen.getByRole('button', { name: /Next/ }))

    expect(screen.getByRole('heading', { name: 'Select a Date' })).toHaveFocus()
    expect(useBookingStore.getState().selectedServiceId).toBeGreaterThan(0)
  })

  it('has no serious or critical accessibility violations', async () => {
    const { container } = renderBooking()
    await screen.findByLabelText('Select Office')

    const results = await axe(container)
    expect(
      results.violations.filter(
        ({ impact }) => impact === 'serious' || impact === 'critical',
      ),
    ).toEqual([])
  })
})
