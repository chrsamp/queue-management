import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ApiProvider } from '@/api/ApiProvider'
import type { ApiClient } from '@/api/client'
import type { Citizen, CsrListItem, CsrState, Office } from '@/api/schemas'
import { useWorkflowStore } from '@/store/workflow-store'

import GaPanel from './GaPanel'

const office = {
  check_in_notification: null,
  counters: [
    {
      counter_id: 1,
      counter_name: 'Front 1',
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

const states = [
  {
    csr_state_desc: null,
    csr_state_id: 1,
    csr_state_name: 'Login',
  },
  {
    csr_state_desc: null,
    csr_state_id: 2,
    csr_state_name: 'Break',
  },
] satisfies CsrState[]

function csr(id: number, username: string, roleCode = 'CSR', csrStateId = 1) {
  return {
    counter: 1,
    counter_id: 1,
    csr_id: id,
    csr_state:
      states.find((state) => state.csr_state_id === csrStateId) ?? null,
    csr_state_id: csrStateId,
    finance_designate: null,
    ita2_designate: null,
    office_id: 1,
    pesticide_designate: null,
    qt_xn_csr_ind: null,
    receptionist_ind: null,
    role: {
      role_code: roleCode,
      role_desc: null,
      role_id: roleCode === 'SUPPORT' ? 2 : 1,
    },
    role_id: roleCode === 'SUPPORT' ? 2 : 1,
    username,
  } satisfies CsrListItem
}

function citizen(id: number, periodName: string, csrId = 10) {
  return {
    citizen_comments: 'Bring ID',
    citizen_id: id,
    citizen_name: null,
    counter_id: 1,
    cs: {
      cs_state_name: 'Active',
    },
    office_id: 1,
    priority: 2,
    service_reqs: [
      {
        citizen_id: id,
        periods: [
          {
            csr: {
              counter: 1,
              counter_id: 1,
              username: 'active.user',
            },
            csr_id: csrId,
            period_id: 1,
            ps: {
              ps_name: periodName,
            },
            time_end: null,
            time_start: '2026-06-23T16:00:00Z',
          },
        ],
        service: {
          parent: {
            service_name: 'Licensing',
          },
          parent_id: 1,
          service_name: 'Driver licence',
        },
        sr_id: 20,
      },
    ],
    start_time: '2026-06-23T16:00:00Z',
    ticket_number: `A${id}`,
  } satisfies Citizen
}

function renderWithApi({
  citizens,
  csrs = [csr(10, 'active.user'), csr(11, 'break.user', 'CSR', 2)],
  panelOpen = true,
}: {
  citizens: Citizen[]
  csrs?: CsrListItem[]
  panelOpen?: boolean
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const client = {
    get: vi.fn((path: string) => {
      if (path === '/csrs/') {
        return Promise.resolve({ csrs, errors: {} })
      }
      if (path === '/csr_states/') {
        return Promise.resolve({ csr_states: states, errors: {} })
      }
      if (path === '/categories/') {
        return Promise.resolve({ categories: [], errors: {} })
      }
      if (path === '/channels/') {
        return Promise.resolve({ channels: [], errors: {} })
      }
      if (path.startsWith('/services/')) {
        return Promise.resolve({ services: [], errors: {} })
      }
      return Promise.resolve({})
    }),
    request: vi.fn().mockResolvedValue({}),
  } as unknown as ApiClient

  render(
    <ApiProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <GaPanel
          citizens={citizens}
          isOpen={panelOpen}
          office={office}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    </ApiProvider>,
  )

  return { client, queryClient }
}

afterEach(() => {
  useWorkflowStore.getState().clearWorkflow()
  vi.restoreAllMocks()
})

describe('GaPanel', () => {
  test('fetches CSRs only when open and renders reception summary', async () => {
    const { client } = renderWithApi({
      citizens: [citizen(1, 'Waiting'), citizen(2, 'Being Served')],
      panelOpen: false,
    })

    expect(client.get).not.toHaveBeenCalledWith('/csrs/', expect.anything())

    renderWithApi({
      citizens: [citizen(1, 'Waiting'), citizen(2, 'Being Served')],
    })

    expect(await screen.findByRole('dialog')).toBeVisible()
    expect(screen.getByText('Citizens Waiting')).toBeVisible()
    expect(screen.getAllByText('1')[0]).toBeVisible()
    expect(screen.getByText('Total CSRs')).toBeVisible()
    expect(screen.getByText('Serving CSRs')).toBeVisible()
  })

  test('renders rows and can end active service', async () => {
    const user = userEvent.setup()
    const { client } = renderWithApi({
      citizens: [citizen(2, 'Being Served')],
    })

    const table = await screen.findByRole('table', { name: 'GA panel staff' })
    expect(within(table).getByText('active.user')).toBeVisible()
    expect(within(table).getByText('break.user')).toBeVisible()
    expect(within(table).getByText('Break')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'End Service' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        '/citizens/2/finish_service/?inaccurate=true',
        {
          method: 'POST',
          schema: expect.anything(),
          signal: undefined,
        },
      )
    })
  })

  test('shows hold summary for non-reception offices', async () => {
    render(
      <ApiProvider
        client={
          {
            get: vi.fn((path: string) => {
              if (path === '/csrs/') {
                return Promise.resolve({ csrs: [], errors: {} })
              }
              if (path === '/csr_states/') {
                return Promise.resolve({ csr_states: states, errors: {} })
              }
              return Promise.resolve({})
            }),
          } as unknown as ApiClient
        }
      >
        <QueryClientProvider client={new QueryClient()}>
          <GaPanel
            citizens={[citizen(1, 'On hold')]}
            isOpen
            office={{
              ...office,
              sb: {
                sb_id: 2,
                sb_type: 'nocallonsmartboard',
              },
            }}
            onClose={vi.fn()}
          />
        </QueryClientProvider>
      </ApiProvider>,
    )

    expect(await screen.findByText('Citizens on Hold')).toBeVisible()
  })
})
