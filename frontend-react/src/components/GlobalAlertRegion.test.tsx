import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'

import { useWorkflowStore } from '@/store/workflow-store'

import GlobalAlertRegion from './GlobalAlertRegion'

afterEach(() => {
  cleanup()
  useWorkflowStore.getState().clearWorkflow()
})

describe('GlobalAlertRegion', () => {
  test('renders and dismisses the active global alert', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setGlobalAlert({
      id: 'network',
      message: 'Network restored',
      variant: 'success',
    })

    render(<GlobalAlertRegion />)

    expect(screen.getByRole('status')).toHaveTextContent('Network restored')

    await user.click(screen.getByRole('button', { name: 'Close this alert' }))

    expect(useWorkflowStore.getState().globalAlert).toBeNull()
  })

  test('renders nothing when there is no active global alert', () => {
    const { container } = render(<GlobalAlertRegion />)

    expect(container).toBeEmptyDOMElement()
  })
})
