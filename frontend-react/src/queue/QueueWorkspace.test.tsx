import type { ComponentProps } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { ApiClient } from '@/api/client'
import { ApiProvider } from '@/api/ApiProvider'
import type { Citizen, Csr, Office, ServiceRequest } from '@/api/schemas'

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

function renderQueueWorkspace(
  props: Omit<ComponentProps<typeof QueueWorkspace>, 'csr'> & {
    csr?: Csr
  },
) {
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
    request: vi.fn(),
  } as unknown as ApiClient

  return render(
    <ApiProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <QueueWorkspace {...props} csr={props.csr ?? csr} />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

function serviceRequest(periodName: string) {
  return {
    citizen_id: 1,
    periods: [
      {
        csr: {
          counter: 1,
          counter_id: 1,
          username: 'csr.user',
        },
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
      within(screen.getByRole('table', { name: 'Citizens on hold' })).queryByRole(
        'columnheader',
        { name: 'Counter' },
      ),
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

    await user.click(
      screen.getByRole('button', { name: 'Add Citizen quick services' }),
    )

    expect(screen.getByRole('menuitem', { name: 'Licence renewal' })).toBeVisible()
    expect(screen.queryByRole('menuitem', { name: 'Deleted service' })).not.toBeInTheDocument()
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
})

function getTicketOrder(table: HTMLElement) {
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent?.match(/A\d+/)?.[0] ?? '')
}
