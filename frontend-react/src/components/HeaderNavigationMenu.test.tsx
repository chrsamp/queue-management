import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { Office } from '@/api/schemas'
import HeaderNavigationMenu from './HeaderNavigationMenu'

function LocationText() {
  const location = useLocation()

  return <span data-testid="location">{location.pathname}</span>
}

const office = {
  appointments_enabled_ind: 1,
  counters: [],
  office_id: 1,
  office_name: 'Downtown',
  office_number: 100,
  timeslots: [],
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
} as Office

function renderMenu(
  currentRoleCode: string | null,
  onLogout = vi.fn(),
  currentOffice: Office | null = office,
) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <HeaderNavigationMenu
        currentOffice={currentOffice}
        currentRoleCode={currentRoleCode}
        onLogout={onLogout}
        username="Staff User"
      />
      <Routes>
        <Route element={<LocationText />} path="*" />
      </Routes>
    </MemoryRouter>,
  )

  return { onLogout }
}

describe('HeaderNavigationMenu', () => {
  afterEach(() => {
    cleanup()
  })

  test('shows queue, admin, and logout for admin roles', async () => {
    const user = userEvent.setup()
    renderMenu('GA')

    await user.click(screen.getByRole('button', { name: /menu/i }))

    expect(await screen.findByRole('menuitem', { name: 'Queue' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Appointments' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeVisible()
    expect(screen.getByText('Staff User')).toBeVisible()
    expect(screen.getAllByRole('separator')).toHaveLength(2)
  })

  test('hides admin for non-admin roles', async () => {
    const user = userEvent.setup()
    renderMenu('CSR')
    const trigger = screen.getByRole('button', { name: /menu/i })

    expect(trigger.querySelector('svg')).toBeInTheDocument()
    await user.click(trigger)

    expect(await screen.findByRole('menuitem', { name: 'Queue' })).toBeVisible()
    expect(
      screen.queryByRole('menuitem', { name: 'Admin' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeVisible()
  })

  test('uses a hamburger trigger and danger logout item', async () => {
    const user = userEvent.setup()
    renderMenu('CSR')

    await user.click(screen.getByRole('button', { name: /menu/i }))

    const logout = await screen.findByRole('menuitem', { name: 'Log out' })

    expect(logout).toHaveClass('text-bc-danger')
    expect(logout.querySelector('svg')).toBeInTheDocument()
  })

  test('hides appointments when office appointments are disabled', async () => {
    const user = userEvent.setup()
    renderMenu('CSR', vi.fn(), {
      ...office,
      appointments_enabled_ind: 0,
    } as Office)

    await user.click(screen.getByRole('button', { name: /menu/i }))

    expect(
      screen.queryByRole('menuitem', { name: 'Appointments' }),
    ).not.toBeInTheDocument()
  })

  test('navigates and logs out from menu actions', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    renderMenu('SUPPORT', onLogout)

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(await screen.findByRole('menuitem', { name: 'Admin' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/admin')

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Appointments' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/appointments')

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Queue' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/queue')

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
