import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import Button from './Button'
import Subheader from './Subheader'

describe('Subheader', () => {
  afterEach(() => {
    cleanup()
  })

  test('does not render without items', () => {
    const { container } = render(<Subheader ariaLabel="Queue controls" />)

    expect(container).toBeEmptyDOMElement()
  })

  test('renders arbitrary start and end items with separators', () => {
    render(
      <Subheader
        ariaLabel="Queue controls"
        endItems={[
          <Button key="agenda" size="small" variant="secondary">
            Show Day Agenda
          </Button>,
          <Button key="ga" size="small" variant="secondary">
            GA Panel
          </Button>,
        ]}
        startItems={[
          <span key="status">Active</span>,
          <span key="counter">Counter 1</span>,
        ]}
      />,
    )

    expect(
      screen.getByRole('navigation', { name: 'Queue controls' }),
    ).toBeVisible()
    expect(screen.getByText('Active')).toBeVisible()
    expect(screen.getByText('Counter 1')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Show Day Agenda' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'GA Panel' })).toBeVisible()
  })
})
