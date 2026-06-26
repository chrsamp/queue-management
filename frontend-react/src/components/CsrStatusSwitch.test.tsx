import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { ApiClient } from '@/api/client'
import { ApiProvider } from '@/api/ApiProvider'
import { getCsrStates, updateCsr } from '@/api/endpoints'
import { useWorkflowStore } from '@/store/workflow-store'

import CsrStatusSwitch from './CsrStatusSwitch'

vi.mock('@/api/endpoints', () => ({
  getCsrStates: vi.fn(),
  updateCsr: vi.fn(),
}))

const loginState = {
  csr_state_desc: null,
  csr_state_id: 2,
  csr_state_name: 'Login',
}

const breakState = {
  csr_state_desc: null,
  csr_state_id: 3,
  csr_state_name: 'Break',
}

const csr = {
  counter: 1,
  counter_id: 1,
  csr_id: 42,
  csr_state: loginState,
  csr_state_id: loginState.csr_state_id,
  finance_designate: null,
  ita2_designate: null,
  office: {
    counters: [],
    office_id: 1,
    office_name: 'Downtown',
    office_number: 101,
    sb: null,
    timeslots: [],
    timezone: {
      timezone_id: 1,
      timezone_name: 'America/Vancouver',
    },
  },
  office_id: 1,
  pesticide_designate: null,
  qt_xn_csr_ind: null,
  receptionist_ind: null,
  role: {
    role_id: 1,
    role_code: 'GA',
    role_desc: null,
  },
  role_id: 1,
  username: 'queue.user',
}

function renderCsrStatusSwitch() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  render(
    <ApiProvider client={{} as ApiClient}>
      <QueryClientProvider client={queryClient}>
        <CsrStatusSwitch />
      </QueryClientProvider>
    </ApiProvider>,
  )

  return queryClient
}

beforeEach(() => {
  vi.mocked(getCsrStates).mockResolvedValue([loginState, breakState])
  vi.mocked(updateCsr).mockResolvedValue({
    csr,
    errors: {},
  })
  useWorkflowStore.getState().setCurrentCsr(csr)
})

afterEach(() => {
  cleanup()
  useWorkflowStore.getState().clearWorkflow()
  vi.clearAllMocks()
})

describe('CsrStatusSwitch', () => {
  test('renders Active when the stored CSR state is Login', async () => {
    renderCsrStatusSwitch()

    const switchControl = await screen.findByRole('switch', {
      name: 'CSR status',
    })

    expect(switchControl).toBeChecked()
    expect(screen.getByText('Active')).toBeVisible()
  })

  test('toggles the CSR to Break and does not immediately return to Active', async () => {
    const user = userEvent.setup()
    vi.mocked(updateCsr).mockResolvedValueOnce({
      csr: {
        ...csr,
        csr_state: breakState,
        csr_state_id: breakState.csr_state_id,
      },
      errors: {},
    })
    renderCsrStatusSwitch()

    await user.click(await screen.findByRole('switch', { name: 'CSR status' }))

    await waitFor(() => {
      expect(updateCsr).toHaveBeenCalledWith(expect.anything(), csr.csr_id, {
        csr_state_id: breakState.csr_state_id,
      })
    })
    expect(updateCsr).toHaveBeenCalledTimes(1)
    expect(screen.getByText('On Break')).toBeVisible()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()

    await new Promise((resolve) => window.setTimeout(resolve, 150))

    expect(updateCsr).toHaveBeenCalledTimes(1)
    expect(screen.getByText('On Break')).toBeVisible()
  })

  test('returns the CSR to Active after a later body click while on Break', async () => {
    const user = userEvent.setup()
    vi.mocked(updateCsr)
      .mockResolvedValueOnce({
        csr: {
          ...csr,
          csr_state: breakState,
          csr_state_id: breakState.csr_state_id,
        },
        errors: {},
      })
      .mockResolvedValueOnce({
        csr,
        errors: {},
      })
    renderCsrStatusSwitch()

    await user.click(await screen.findByRole('switch', { name: 'CSR status' }))
    await screen.findByText('On Break')
    await new Promise((resolve) => window.setTimeout(resolve, 150))
    await user.click(document.body)

    await waitFor(() => {
      expect(updateCsr).toHaveBeenLastCalledWith(
        expect.anything(),
        csr.csr_id,
        { csr_state_id: loginState.csr_state_id },
      )
    })
    expect(screen.getByText('Active')).toBeVisible()
  })
})
