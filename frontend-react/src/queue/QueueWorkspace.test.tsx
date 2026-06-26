import type { ComponentProps } from 'react'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { ApiClient } from '@/api/client'
import { ApiProvider } from '@/api/ApiProvider'
import type { Citizen, Csr, Office, ServiceRequest } from '@/api/schemas'
import { useWorkflowStore } from '@/store/workflow-store'

import QueueWorkspace from './QueueWorkspace'

const receptionOffice = {
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

const csr = {
  counter: 1,
  counter_id: 1,
  csr_id: 10,
  csr_state: null,
  csr_state_id: 1,
  finance_designate: null,
  ita2_designate: null,
  office: receptionOffice,
  office_id: receptionOffice.office_id,
  pesticide_designate: null,
  qt_xn_csr_ind: null,
  receptionist_ind: 1,
  role: {
    role_code: 'CSR',
    role_desc: 'CSR',
    role_id: 1,
  },
  role_id: 1,
  username: 'csr.user',
} satisfies Csr

function renderQueueWorkspace(props: ComponentProps<typeof QueueWorkspace>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const client = {
    get: vi.fn((path: string) => {
      if (path === '/categories/') {
        return Promise.resolve({
          categories: [{ service_id: 10, service_name: 'Licensing' }],
          errors: {},
        })
      }
      if (path === '/channels/') {
        return Promise.resolve({
          channels: [{ channel_id: 1, channel_name: 'In Person' }],
          errors: {},
        })
      }
      if (path.startsWith('/services/')) {
        return Promise.resolve({
          services: [
            {
              actual_service_ind: 1,
              display_dashboard_ind: 1,
              parent: {
                service_name: 'Licensing',
              },
              parent_id: 10,
              service_id: 1,
              service_name: 'Licence renewal',
            },
          ],
          errors: {},
        })
      }
      return Promise.resolve({})
    }),
    request: vi.fn((path: string) => {
      if (path === '/citizens/0/add_citizen/') {
        return Promise.resolve({
          citizen: citizen(5, 'Waiting', {
            citizen_id: 5,
            service_reqs: [],
            ticket_number: 'A5',
          }),
          errors: {},
        })
      }

      return Promise.resolve({})
    }),
  } as unknown as ApiClient

  const view = render(
    <ApiProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <QueueWorkspace {...props} />
      </QueryClientProvider>
    </ApiProvider>,
  )

  return { ...view, client, queryClient }
}

function serviceRequest(periodName: string) {
  return {
    channel: {
      channel_id: 1,
      channel_name: 'In Person',
    },
    channel_id: 1,
    citizen_id: 1,
    periods: [
      {
        csr: {
          counter: 1,
          counter_id: 1,
          username: 'csr.user',
        },
        csr_id: 10,
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
        service_name: 'Permits',
      },
      parent_id: 1,
      service_name: 'Road test',
    },
    quantity: 1,
    sr_id: 1,
  } satisfies ServiceRequest
}

function citizen(
  id: number,
  periodName: string,
  overrides: Partial<Citizen> = {},
) {
  return {
    citizen_comments: 'Needs help',
    citizen_id: id,
    citizen_name: null,
    counter_id: 1,
    cs: {
      cs_state_name: 'Active',
    },
    office_id: 1,
    priority: 2,
    service_reqs: [serviceRequest(periodName)],
    start_time: '2026-06-23T16:00:00Z',
    ticket_number: `A${id}`,
    ...overrides,
  } satisfies Citizen
}

afterEach(() => {
  window.sessionStorage.clear()
  useWorkflowStore.getState().clearWorkflow()
  cleanup()
})

describe('QueueWorkspace', () => {
  test('shows waiting and hold tables for reception offices', () => {
    renderQueueWorkspace({
      citizens: [citizen(1, 'Waiting'), citizen(2, 'On hold')],
      office: receptionOffice,
    })

    expect(
      screen.queryByRole('heading', { name: 'Queue' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Downtown')).not.toBeInTheDocument()
    expect(screen.getByText('Citizens Waiting: 1')).toBeVisible()
    expect(screen.getByText('Citizens on Hold: 1')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Resize queue tables' }),
    ).toBeVisible()

    const waitingTable = screen.getByRole('table', {
      name: 'Citizens waiting',
    })
    const holdTable = screen.getByRole('table', { name: 'Citizens on hold' })

    expect(
      within(waitingTable).getByRole('columnheader', { name: 'Counter' }),
    ).toBeVisible()
    expect(within(waitingTable).getByText('A1')).toBeVisible()
    expect(within(holdTable).getByText('A2')).toBeVisible()
  })

  test('shows only the hold table for non-reception offices', () => {
    renderQueueWorkspace({
      citizens: [citizen(1, 'Waiting'), citizen(2, 'On hold')],
      office: {
        ...receptionOffice,
        sb: {
          sb_id: 1,
          sb_type: 'nocallonsmartboard',
        },
      },
    })

    expect(screen.queryByText(/Citizens Waiting:/)).not.toBeInTheDocument()
    expect(screen.getByText('Citizens on Hold: 1')).toBeVisible()
    expect(
      screen.queryByRole('table', { name: 'Citizens waiting' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Resize queue tables' }),
    ).not.toBeInTheDocument()
    expect(
      within(
        screen.getByRole('table', { name: 'Citizens on hold' }),
      ).queryByRole('columnheader', { name: 'Counter' }),
    ).not.toBeInTheDocument()
  })

  test('shows notification columns only when check-in notifications are enabled', () => {
    const notifiedCitizen = citizen(1, 'Waiting', {
      notification_email: 'pat@example.com',
      notification_phone: '(250) 555-1212',
      reminder_flag: 1,
    })

    const { unmount } = renderQueueWorkspace({
      citizens: [notifiedCitizen],
      office: {
        ...receptionOffice,
        check_in_notification: 1,
      },
    })

    const waitingTable = screen.getByRole('table', {
      name: 'Citizens waiting',
    })
    expect(
      within(waitingTable).getByRole('columnheader', { name: 'Action' }),
    ).toBeVisible()
    expect(
      within(waitingTable).getByRole('columnheader', { name: 'Notification' }),
    ).toBeVisible()
    expect(within(waitingTable).getByText('First sent')).toBeVisible()

    unmount()
    renderQueueWorkspace({
      citizens: [notifiedCitizen],
      office: receptionOffice,
    })

    expect(
      within(
        screen.getByRole('table', { name: 'Citizens waiting' }),
      ).queryByRole('columnheader', { name: 'Action' }),
    ).not.toBeInTheDocument()
  })

  test('renders empty states inside visible tables', () => {
    renderQueueWorkspace({ citizens: [], office: receptionOffice })

    expect(
      within(screen.getByRole('table', { name: 'Citizens waiting' })).getByText(
        'No citizens are waiting.',
      ),
    ).toBeVisible()
    expect(
      within(screen.getByRole('table', { name: 'Citizens on hold' })).getByText(
        'No citizens are on hold.',
      ),
    ).toBeVisible()
  })

  test('keeps add citizen and back office buttons fully rounded without quick-service menus', () => {
    renderQueueWorkspace({ citizens: [], office: receptionOffice })

    expect(screen.getByRole('button', { name: 'Add Citizen' })).not.toHaveClass(
      'rounded-r-none',
    )
    expect(screen.getByRole('button', { name: 'Back Office' })).not.toHaveClass(
      'rounded-r-none',
    )
    expect(
      screen.queryByRole('button', { name: 'Add Citizen quick services' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Back Office quick services' }),
    ).not.toBeInTheDocument()
  })

  test('shows add citizen and back office split buttons with quick-service menus', async () => {
    const user = userEvent.setup()

    renderQueueWorkspace({
      citizens: [],
      office: {
        ...receptionOffice,
        back_office_list: [
          { deleted: null, service_id: 2, service_name: 'Staff review' },
        ],
        quick_list: [
          { deleted: null, service_id: 1, service_name: 'Licence renewal' },
          {
            deleted: '2026-01-01',
            service_id: 3,
            service_name: 'Deleted service',
          },
        ],
      },
    })

    expect(screen.getByRole('button', { name: 'Add Citizen' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Back Office' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add Citizen' })).toHaveClass(
      'rounded-r-none',
    )
    expect(screen.getByRole('button', { name: 'Back Office' })).toHaveClass(
      'rounded-r-none',
    )
    expect(screen.getByRole('button', { name: 'Add Citizen' })).toHaveClass(
      'bg-bc-button-primary',
    )
    expect(screen.getByRole('button', { name: 'Back Office' })).toHaveClass(
      'bg-bc-white',
    )

    await user.click(
      screen.getByRole('button', { name: 'Add Citizen quick services' }),
    )

    expect(
      screen.getByRole('menuitem', { name: 'Licence renewal' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('menuitem', { name: 'Deleted service' }),
    ).not.toBeInTheDocument()
  })

  test('opens a prefilled quick-service modal when the global CSR is receptionist', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr(csr)

    const { client } = renderQueueWorkspace({
      citizens: [],
      office: {
        ...receptionOffice,
        quick_list: [
          { deleted: null, service_id: 1, service_name: 'Licence renewal' },
        ],
      },
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Add Citizen quick services' }),
      ).not.toBeDisabled()
    })
    await user.click(
      screen.getByRole('button', { name: 'Add Citizen quick services' }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Licence renewal' }))

    expect(
      await screen.findByRole('heading', { name: 'Add Citizen' }),
    ).toBeVisible()
    expect(screen.getByDisplayValue('Licence renewal')).toBeVisible()
    expect(client.request).toHaveBeenCalledWith('/citizens/0/add_citizen/', {
      method: 'POST',
      schema: expect.anything(),
      signal: undefined,
    })
    expect(client.request).not.toHaveBeenCalledWith(
      '/citizens/5/begin_service/',
      expect.anything(),
    )
  })

  test('quick-service action begins service when the global CSR is not receptionist', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr({
      ...csr,
      receptionist_ind: 0,
    })

    const { client } = renderQueueWorkspace({
      citizens: [],
      office: {
        ...receptionOffice,
        quick_list: [
          { deleted: null, service_id: 1, service_name: 'Licence renewal' },
        ],
      },
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Add Citizen quick services' }),
      ).not.toBeDisabled()
    })
    await user.click(
      screen.getByRole('button', { name: 'Add Citizen quick services' }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Licence renewal' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        '/citizens/5/begin_service/',
        {
          body: {},
          method: 'POST',
          schema: expect.anything(),
          signal: undefined,
        },
      )
    })
    expect(
      screen.queryByRole('heading', { name: 'Add Citizen' }),
    ).not.toBeInTheDocument()
  })

  test('sorts the time column by queue start date', async () => {
    const user = userEvent.setup()

    renderQueueWorkspace({
      citizens: [
        citizen(1, 'Waiting', {
          start_time: '2026-06-23T17:00:00Z',
        }),
        citizen(2, 'Waiting', {
          start_time: '2026-06-23T15:00:00Z',
        }),
        citizen(3, 'Waiting', {
          start_time: 'not a date',
        }),
      ],
      office: receptionOffice,
    })

    const waitingTable = screen.getByRole('table', {
      name: 'Citizens waiting',
    })
    const sortButton = within(waitingTable).getByRole('button', {
      name: /Sort by Time/,
    })

    await user.click(sortButton)

    expect(getTicketOrder(waitingTable)).toEqual(['A2', 'A1', 'A3'])
    expect(
      within(waitingTable).getByRole('columnheader', { name: /Time/ }),
    ).toHaveAttribute('aria-sort', 'ascending')

    await user.click(sortButton)

    expect(getTicketOrder(waitingTable)).toEqual(['A1', 'A2', 'A3'])
    expect(
      within(waitingTable).getByRole('columnheader', { name: /Time/ }),
    ).toHaveAttribute('aria-sort', 'descending')
  })

  test('invites a waiting citizen from the row and begins service in the modal', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr(csr)
    const { client } = renderQueueWorkspace({
      citizens: [citizen(1, 'Waiting')],
      csrId: csr.csr_id,
      office: receptionOffice,
    })

    await user.click(screen.getByText('A1'))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith('/citizens/1/invite/', {
        body: { counter_id: 1 },
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      })
    })
    expect(
      await screen.findByRole('heading', { name: 'Serve Citizen' }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Begin Service' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        '/citizens/1/begin_service/',
        {
          body: {},
          method: 'POST',
          schema: expect.anything(),
          signal: undefined,
        },
      )
    })
  })

  test('resumes a held citizen and can place the active ticket back on hold', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr(csr)
    const { client } = renderQueueWorkspace({
      citizens: [citizen(1, 'On hold')],
      csrId: csr.csr_id,
      office: receptionOffice,
    })

    await user.click(screen.getByText('A1'))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        '/citizens/1/begin_service/',
        {
          body: {},
          method: 'POST',
          schema: expect.anything(),
          signal: undefined,
        },
      )
    })

    await user.click(screen.getByRole('button', { name: 'Place on Hold' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        '/citizens/1/place_on_hold/',
        {
          method: 'POST',
          schema: expect.anything(),
          signal: undefined,
        },
      )
    })
  })

  test('uses Invite and Serve Now buttons for the active citizen', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr(csr)
    const { client, queryClient, rerender } = renderQueueWorkspace({
      citizens: [citizen(1, 'Waiting')],
      csrId: csr.csr_id,
      office: receptionOffice,
    })

    await user.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith('/citizens/invite/', {
        body: { counter_id: 1 },
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      })
    })
    expect(screen.getByRole('heading', { name: 'Serve Citizen' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Begin Service' }))
    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        '/citizens/1/begin_service/',
        {
          body: {},
          method: 'POST',
          schema: expect.anything(),
          signal: undefined,
        },
      )
    })

    rerender(
      <ApiProvider client={client}>
        <QueryClientProvider client={queryClient}>
          <QueueWorkspace
            citizens={[citizen(1, 'Being Served')]}
            csrId={csr.csr_id}
            office={receptionOffice}
          />
        </QueryClientProvider>
      </ApiProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Minimize modal' }))
    expect(screen.getByRole('heading', { name: 'Serve Citizen' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Finish' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore modal' }))
    expect(screen.getByRole('button', { name: 'Finish' })).toBeVisible()
  })

  test('clears stale active state when the queue data has no active CSR citizen', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr(csr)
    useWorkflowStore.getState().setActiveServiceCitizen(99, 99, true)

    const { client } = renderQueueWorkspace({
      citizens: [citizen(1, 'Waiting')],
      csrId: csr.csr_id,
      office: receptionOffice,
    })

    await waitFor(() => {
      expect(useWorkflowStore.getState().activeCitizenId).toBeNull()
    })

    expect(screen.getByRole('button', { name: 'Serve Now' })).toBeDisabled()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Invite' })).not.toBeDisabled()
    })

    await user.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith('/citizens/invite/', {
        body: { counter_id: 1 },
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      })
    })
    expect(
      screen.queryByText(
        'You are already serving a citizen.  Click Serve Now to resume.',
      ),
    ).not.toBeInTheDocument()
  })

  test('does not leave Serve Now locked after finishing an active citizen', async () => {
    const user = userEvent.setup()
    useWorkflowStore.getState().setCurrentCsr(csr)
    const { client, queryClient, rerender } = renderQueueWorkspace({
      citizens: [citizen(1, 'Being Served')],
      csrId: csr.csr_id,
      office: receptionOffice,
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Serve Now' }),
      ).not.toBeDisabled()
    })
    await user.click(screen.getByRole('button', { name: 'Serve Now' }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        '/citizens/1/finish_service/?inaccurate=false',
        {
          method: 'POST',
          schema: expect.anything(),
          signal: undefined,
        },
      )
    })

    rerender(
      <ApiProvider client={client}>
        <QueryClientProvider client={queryClient}>
          <QueueWorkspace
            citizens={[citizen(2, 'Waiting')]}
            csrId={csr.csr_id}
            office={receptionOffice}
          />
        </QueryClientProvider>
      </ApiProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Serve Now' })).toBeDisabled()
    })
    expect(screen.getByRole('button', { name: 'Invite' })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith('/citizens/invite/', {
        body: { counter_id: 1 },
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      })
    })
  })
})

function getTicketOrder(table: HTMLElement) {
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent?.match(/A\d+/)?.[0] ?? '')
}
