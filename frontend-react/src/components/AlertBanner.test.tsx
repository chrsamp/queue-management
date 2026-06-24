import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import AlertBanner from './AlertBanner'

afterEach(() => {
  cleanup()
})

describe('AlertBanner', () => {
  test('renders default content with status role and close button', () => {
    render(<AlertBanner>System message</AlertBanner>)

    expect(screen.getByRole('status')).toHaveTextContent('System message')
    expect(
      screen.getByRole('button', { name: 'Close this alert' }),
    ).toBeVisible()
  })

  test('supports variants, sizes, layouts, custom class names, and custom role', () => {
    const { container } = render(
      <AlertBanner
        className="root-class"
        containerClassName="container-class"
        role="alert"
        size="small"
        variant="warning"
      >
        Warning message
      </AlertBanner>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Warning message')
    expect(container.firstElementChild).toHaveClass('bg-bc-warning')
    expect(container.firstElementChild).toHaveClass('root-class')
    expect(container.querySelector('.container-class')).toBeInTheDocument()
  })

  test('can hide or replace the icon', () => {
    const { container, rerender } = render(
      <AlertBanner isIconHidden>Hidden icon</AlertBanner>,
    )

    expect(container.querySelectorAll('svg')).toHaveLength(1)

    rerender(
      <AlertBanner customIcon={<span data-testid="custom-icon">*</span>}>
        Custom icon
      </AlertBanner>,
    )

    expect(screen.getByTestId('custom-icon')).toBeVisible()
  })

  test('can hide the close button or call onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <AlertBanner isCloseable={false}>No close</AlertBanner>,
    )

    expect(
      screen.queryByRole('button', { name: 'Close this alert' }),
    ).not.toBeInTheDocument()

    rerender(<AlertBanner onClose={onClose}>Close me</AlertBanner>)
    await user.click(screen.getByRole('button', { name: 'Close this alert' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
