import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiProvider } from '@/api/ApiProvider'
import type { ApiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { getOffices, updateCsr } from '@/api/endpoints'
import { useWorkflowStore } from '@/store/workflow-store'

import Header from './Header'
import OfficeSwitcher from './OfficeSwitcher'

vi.mock('@/api/endpoints', () => ({
  getOffices: vi.fn(),
  updateCsr: vi.fn(),
}))

const timezone = {
  timezone_id: 1,
  timezone_name: 'America/Vancouver',
}

const downtownOffice = {
  counters: [],
  office_id: 1,
  office_name: 'Downtown',
  office_number: 101,
  sb: null,
  timeslots: [],
  timezone,
}

const victoriaOffice = {
  ...downtownOffice,
  office_id: 2,
  office_name: 'Victoria',
  office_number: 94,
}

const kelownaOffice = {
  ...downtownOffice,
  office_id: 3,
  office_name: 'Kelowna',
  office_number: 103,
}

const victoriaWestOffice = {
  ...downtownOffice,
  office_id: 4,
  office_name: 'Victoria West',
  office_number: 95,
}

const northVictoriaOffice = {
  ...downtownOffice,
  office_id: 5,
  office_name: 'North Victoria',
  office_number: 96,
}

const csr = {
  counter: 1,
  counter_id: 1,
  csr_id: 42,
  csr_state: {
    csr_state_desc: null,
    csr_state_id: 2,
    csr_state_name: 'Login',
  },
  csr_state_id: 2,
  finance_designate: null,
  ita2_designate: null,
  office: downtownOffice,
  office_id: downtownOffice.office_id,
  pesticide_designate: null,
  qt_xn_csr_ind: null,
  receptionist_ind: null,
  role: {
    role_code: 'GA',
    role_desc: null,
    role_id: 1,
  },
  role_id: 1,
  username: 'queue.user',
}

function renderOfficeSwitcher() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  render(
    <ApiProvider client={{} as ApiClient}>
      <QueryClientProvider client={queryClient}>
        <Header title="Queue Management">
          <div className="flex min-w-0 flex-col items-start">
            <span>{csr.username}</span>
            <OfficeSwitcher />
          </div>
        </Header>
      </QueryClientProvider>
    </ApiProvider>,
  )

  return queryClient
}

async function openOfficeModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', {
      name: `Change office, current office ${downtownOffice.office_name}`,
    }),
  )

  return screen.getByRole('dialog', { name: 'Change office' })
}

async function selectVictoria(user: ReturnType<typeof userEvent.setup>) {
  await openOfficeSelect(user)
  await user.click(await screen.findByRole('option', { name: /^victoria$/i }))
}

async function openOfficeSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', {
      name: /downtown office/i,
    }),
  )
}

beforeEach(() => {
  vi.mocked(getOffices).mockResolvedValue([
    downtownOffice,
    victoriaOffice,
    kelownaOffice,
    victoriaWestOffice,
    northVictoriaOffice,
  ])
  vi.mocked(updateCsr).mockResolvedValue({
    csr: {
      ...csr,
      office: victoriaOffice,
      office_id: victoriaOffice.office_id,
    },
    errors: {},
  })
  useWorkflowStore.getState().setCurrentCsr(csr)
})

afterEach(() => {
  cleanup()
  useWorkflowStore.getState().clearWorkflow()
  vi.clearAllMocks()
})

describe('OfficeSwitcher', () => {
  test('shows the current office underneath the username in the header', async () => {
    renderOfficeSwitcher()

    expect(screen.getByText('queue.user')).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: `Change office, current office ${downtownOffice.office_name}`,
      }),
    ).toBeVisible()
  })

  test('autocomplete filters a partial office name against several matching offices', async () => {
    const user = userEvent.setup()
    renderOfficeSwitcher()

    await openOfficeModal(user)
    await openOfficeSelect(user)

    await user.type(
      screen.getByRole('searchbox', { name: 'Search offices' }),
      'vic',
    )

    expect(
      await screen.findByRole('option', { name: /^victoria$/i }),
    ).toBeVisible()
    expect(
      screen.getByRole('option', { name: /^victoria west$/i }),
    ).toBeVisible()
    expect(
      screen.getByRole('option', { name: /^north victoria$/i }),
    ).toBeVisible()
    expect(
      screen.queryByRole('option', { name: /kelowna/i }),
    ).not.toBeInTheDocument()
  })

  test('autocomplete matches partial office numbers', async () => {
    const user = userEvent.setup()
    renderOfficeSwitcher()

    await openOfficeModal(user)
    await openOfficeSelect(user)

    await user.type(
      screen.getByRole('searchbox', { name: 'Search offices' }),
      '10',
    )

    expect(
      await screen.findByRole('option', { name: /^downtown$/i }),
    ).toBeVisible()
    expect(screen.getByRole('option', { name: /^kelowna$/i })).toBeVisible()
    expect(
      screen.queryByRole('option', { name: /^victoria$/i }),
    ).not.toBeInTheDocument()
  })

  test('saves a new office and updates the header', async () => {
    const user = userEvent.setup()
    renderOfficeSwitcher()

    await openOfficeModal(user)
    await selectVictoria(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(updateCsr).toHaveBeenCalledWith(expect.anything(), csr.csr_id, {
        office_id: victoriaOffice.office_id,
      })
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', {
        name: `Change office, current office ${victoriaOffice.office_name}`,
      }),
    ).toBeVisible()
  })

  test('keeps the modal open and shows an error when saving fails', async () => {
    const user = userEvent.setup()
    vi.mocked(updateCsr).mockRejectedValueOnce(
      new ApiError({
        kind: 'server',
        message: 'Office update failed',
        status: 500,
      }),
    )
    renderOfficeSwitcher()

    await openOfficeModal(user)
    await selectVictoria(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Office update failed',
    )
    expect(screen.getByRole('dialog', { name: 'Change office' })).toBeVisible()
  })
})
