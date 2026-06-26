import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import ModalLayout from './ModalLayout'

function renderLayout(onClose = vi.fn()) {
  render(
    <ModalLayout
      footer={<button type="button">Save changes</button>}
      header="Test modal"
      onClose={onClose}
    >
      <p>Scrollable body</p>
    </ModalLayout>,
  )

  return onClose
}

describe('ModalLayout', () => {
  afterEach(() => {
    cleanup()
  })

  test('renders shared header, body, and footer regions', () => {
    renderLayout()

    expect(screen.getByRole('heading', { name: 'Test modal' })).toBeVisible()
    expect(screen.getByText('Scrollable body')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeVisible()
  })

  test('closes from the header close button', async () => {
    const user = userEvent.setup()
    const onClose = renderLayout()

    await user.click(screen.getByRole('button', { name: 'Close modal' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('closes with the Escape key', async () => {
    const user = userEvent.setup()
    const onClose = renderLayout()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('minimizes and restores the modal body and footer', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Minimize modal' }))

    expect(screen.getByRole('heading', { name: 'Test modal' })).toBeVisible()
    expect(screen.queryByText('Scrollable body')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save changes' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore modal' }))

    expect(screen.getByText('Scrollable body')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeVisible()
  })

  test('drags from the header without treating control clicks as drag starts', () => {
    renderLayout()

    const heading = screen.getByRole('heading', { name: 'Test modal' })
    const header = heading.closest('.cursor-move')
    const modalFrame = header?.closest('[role="dialog"]')?.parentElement
    expect(header).not.toBeNull()
    expect(modalFrame).not.toBeNull()

    fireEvent.pointerDown(header!, {
      button: 0,
      clientX: 20,
      clientY: 20,
      pointerId: 1,
    })
    fireEvent.pointerMove(header!, {
      clientX: 80,
      clientY: 70,
      pointerId: 1,
    })

    expect(modalFrame).toHaveStyle('transform: translate(60px, 50px)')

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Close modal' }), {
      button: 0,
      clientX: 80,
      clientY: 70,
      pointerId: 2,
    })
    fireEvent.pointerMove(header!, {
      clientX: 120,
      clientY: 110,
      pointerId: 2,
    })

    expect(modalFrame).toHaveStyle('transform: translate(60px, 50px)')
  })
})
