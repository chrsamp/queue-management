import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import SplitAction from './SplitAction'

describe('SplitAction', () => {
  test('uses secondary variant for split actions when requested', () => {
    render(
      <SplitAction
        items={[{ id: 'quick', label: 'Quick action' }]}
        label="Back Office"
        onAction={vi.fn()}
        onPrimary={vi.fn()}
        variant="secondary"
      />,
    )

    expect(screen.getByRole('button', { name: 'Back Office' })).toHaveClass(
      'bg-bc-white',
    )
    expect(
      screen.getByRole('button', { name: 'Back Office quick services' }),
    ).toBeVisible()
  })

  test('opens a menu from the main button when no primary action is provided', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()

    render(
      <SplitAction
        items={[
          { id: 'appointment', label: 'Appointment' },
          { id: 'blackout', label: 'Blackout' },
        ]}
        label="Create new..."
        onAction={onAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create new...' }))
    await user.click(screen.getByRole('menuitem', { name: 'Blackout' }))

    expect(onAction).toHaveBeenCalledWith('blackout')
  })
})
