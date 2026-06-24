import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'
import { MemoryRouter } from 'react-router'

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

    render(
      <MemoryRouter>
        <GlobalAlertRegion />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Network restored')

    await user.click(screen.getByRole('button', { name: 'Close this alert' }))

    expect(useWorkflowStore.getState().globalAlerts).toEqual([])
    expect(useWorkflowStore.getState().dismissedGlobalAlertIds).toContain(
      'network',
    )
  })

  test('renders nothing when there is no active global alert', () => {
    const { container } = render(
      <MemoryRouter>
        <GlobalAlertRegion />
      </MemoryRouter>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  test('renders multiple alerts and action links', () => {
    useWorkflowStore.getState().setGlobalAlert({
      action: { label: 'Show', to: '/exams?quickAction=oemai&examType=all' },
      id: 'exam-action-items',
      message: 'Office Exam Manager Action Items are present',
      variant: 'info',
    })
    useWorkflowStore.getState().setGlobalAlert({
      id: 'edit-success',
      message: 'Success!',
      variant: 'success',
    })

    render(
      <MemoryRouter>
        <GlobalAlertRegion />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Show' })).toHaveAttribute(
      'href',
      '/exams?quickAction=oemai&examType=all',
    )
  })

  test('does not render an alert that was dismissed in this session', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setGlobalAlert({
      id: 'network',
      message: 'Network restored',
      variant: 'success',
    })

    render(
      <MemoryRouter>
        <GlobalAlertRegion />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Close this alert' }))

    useWorkflowStore.getState().setGlobalAlert({
      id: 'network',
      message: 'Network restored',
      variant: 'success',
    })

    expect(screen.queryByText('Network restored')).not.toBeInTheDocument()
  })
})
