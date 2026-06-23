import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, test, vi } from 'vitest'

import HeaderNavigationMenu from './HeaderNavigationMenu'

function LocationText() {
  const location = useLocation()

  return <span data-testid="location">{location.pathname}</span>
}

function renderMenu(currentRoleCode: string | null, onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <HeaderNavigationMenu
        currentRoleCode={currentRoleCode}
        onLogout={onLogout}
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
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeVisible()
  })

  test('hides admin for non-admin roles', async () => {
    const user = userEvent.setup()
    renderMenu('CSR')

    await user.click(screen.getByRole('button', { name: /menu/i }))

    expect(await screen.findByRole('menuitem', { name: 'Queue' })).toBeVisible()
    expect(
      screen.queryByRole('menuitem', { name: 'Admin' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeVisible()
  })

  test('navigates and logs out from menu actions', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    renderMenu('SUPPORT', onLogout)

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(await screen.findByRole('menuitem', { name: 'Admin' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/admin')

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Queue' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/queue')

    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
