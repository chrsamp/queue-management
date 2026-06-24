import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiProvider } from '@/api/ApiProvider'
import type { ApiClient } from '@/api/client'
import type { Csr, CsrMe, Office } from '@/api/schemas'
import { updateCsr } from '@/api/endpoints'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import CounterSwitcher from './CounterSwitcher'

vi.mock('@/api/endpoints', () => ({
  updateCsr: vi.fn(),
}))

const receptionOffice = {
  counters: [
    {
      counter_id: 1,
      counter_name: 'Front 1',
    },
    {
      counter_id: 2,
      counter_name: 'Front 2',
    },
  ],
  office_id: 1,
  office_name: 'Downtown',
  office_number: 100,
  sb: {
    sb_id: 1,
    sb_type: 'callbyticket',
  },
  timeslots: [],
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
} satisfies Office

const nonReceptionOffice = {
  ...receptionOffice,
  sb: {
    sb_id: 2,
    sb_type: 'nocallonsmartboard',
  },
} satisfies Office

const loginState = {
  csr_state_desc: null,
  csr_state_id: 2,
  csr_state_name: 'Login',
}

const csr = {
  counter: 1,
  counter_id: 1,
  csr_id: 42,
  csr_state: loginState,
  csr_state_id: loginState.csr_state_id,
  finance_designate: null,
  ita2_designate: null,
  office: receptionOffice,
  office_id: receptionOffice.office_id,
  pesticide_designate: null,
  qt_xn_csr_ind: null,
  receptionist_ind: 0,
  role: {
    role_code: 'GA',
    role_desc: null,
    role_id: 1,
  },
  role_id: 1,
  username: 'queue.user',
} satisfies Csr

function renderCounterSwitcher() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  queryClient.setQueryData<CsrMe>(queryKeys.csrs.me, {
    active_citizens: [],
    attention_needed: false,
    back_office_display: null,
    csr,
    errors: {},
    recurring_feature_flag: null,
  })

  render(
    <ApiProvider client={{} as ApiClient}>
      <QueryClientProvider client={queryClient}>
        <CounterSwitcher />
      </QueryClientProvider>
    </ApiProvider>,
  )

  return queryClient
}

async function openCounterSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /counter/i }))
}

beforeEach(() => {
  vi.mocked(updateCsr).mockResolvedValue({
    csr,
    errors: {},
  })
})

afterEach(() => {
  cleanup()
  useWorkflowStore.getState().clearWorkflow()
  vi.clearAllMocks()
})

describe('CounterSwitcher', () => {
  test('does not render before CSR state is available', () => {
    renderCounterSwitcher()

    expect(
      screen.queryByRole('button', { name: /counter/i }),
    ).not.toBeInTheDocument()
  })

  test('does not render for non-reception offices', () => {
    useWorkflowStore.getState().setCurrentCsr({
      ...csr,
      office: nonReceptionOffice,
      office_id: nonReceptionOffice.office_id,
    })

    renderCounterSwitcher()

    expect(
      screen.queryByRole('button', { name: /counter/i }),
    ).not.toBeInTheDocument()
  })

  test('renders Receptionist even when the office has no counters', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr({
      ...csr,
      office: {
        ...receptionOffice,
        counters: [],
      },
      receptionist_ind: 1,
    })

    renderCounterSwitcher()
    await openCounterSelect(user)

    expect(screen.getByRole('option', { name: 'Receptionist' })).toBeVisible()
  })

  test('renders Receptionist before office counters', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr(csr)

    renderCounterSwitcher()
    await openCounterSelect(user)

    expect(
      screen
        .getAllByRole('option')
        .map((option) => option.textContent?.replace('✓', '')),
    ).toEqual(['Receptionist', 'Front 1', 'Front 2'])
  })

  test('shows Receptionist as selected when the CSR is currently receptionist', () => {
    useWorkflowStore.getState().setCurrentCsr({
      ...csr,
      receptionist_ind: 1,
    })

    renderCounterSwitcher()

    expect(screen.getByRole('button', { name: /receptionist/i })).toBeVisible()
  })

  test('selecting a counter persists and updates global state and cache', async () => {
    const user = userEvent.setup()
    const updatedCsr = {
      ...csr,
      counter: 2,
      counter_id: 2,
      receptionist_ind: 0,
    } satisfies Csr
    vi.mocked(updateCsr).mockResolvedValueOnce({
      csr: updatedCsr,
      errors: {},
    })
    useWorkflowStore.getState().setCurrentCsr({
      ...csr,
      receptionist_ind: 1,
    })

    const queryClient = renderCounterSwitcher()
    await openCounterSelect(user)
    await user.click(screen.getByRole('option', { name: 'Front 2' }))

    await waitFor(() => {
      expect(updateCsr).toHaveBeenCalledWith(expect.anything(), csr.csr_id, {
        counter_id: 2,
        receptionist_ind: 0,
      })
    })
    expect(useWorkflowStore.getState().currentCounterId).toBe(2)
    expect(useWorkflowStore.getState().currentReceptionist).toBe(false)
    expect(queryClient.getQueryData<CsrMe>(queryKeys.csrs.me)?.csr).toEqual(
      updatedCsr,
    )
  })

  test('selecting Receptionist preserves the current counter id', async () => {
    const user = userEvent.setup()
    const updatedCsr = {
      ...csr,
      receptionist_ind: 1,
    } satisfies Csr
    vi.mocked(updateCsr).mockResolvedValueOnce({
      csr: updatedCsr,
      errors: {},
    })
    useWorkflowStore.getState().setCurrentCsr(csr)

    renderCounterSwitcher()
    await openCounterSelect(user)
    await user.click(screen.getByRole('option', { name: 'Receptionist' }))

    await waitFor(() => {
      expect(updateCsr).toHaveBeenCalledWith(expect.anything(), csr.csr_id, {
        counter_id: 1,
        receptionist_ind: 1,
      })
    })
    expect(useWorkflowStore.getState().currentCounterId).toBe(1)
    expect(useWorkflowStore.getState().currentReceptionist).toBe(true)
  })

  test('failed save reverts optimistic state and invalidates current CSR', async () => {
    const user = userEvent.setup()
    vi.mocked(updateCsr).mockRejectedValueOnce(new Error('Unable to save'))
    useWorkflowStore.getState().setCurrentCsr(csr)

    const queryClient = renderCounterSwitcher()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    await openCounterSelect(user)
    await user.click(screen.getByRole('option', { name: 'Front 2' }))

    await waitFor(() => {
      expect(useWorkflowStore.getState().currentCounterId).toBe(1)
    })
    expect(useWorkflowStore.getState().currentReceptionist).toBe(false)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.csrs.me })
  })
})
