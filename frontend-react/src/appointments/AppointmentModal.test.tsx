import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ApiClient } from '@/api/client'
import { ApiProvider } from '@/api/ApiProvider'
import type { Appointment, Category, Office, Service } from '@/api/schemas'

import AppointmentModal from './AppointmentModal'
import type { AppointmentCalendarEvent } from './appointment-utils'

const office = {
  appointment_duration: 30,
  appointments_enabled_ind: 1,
  counters: [],
  office_id: 3,
  office_name: 'Victoria',
  office_number: 94,
  timeslots: [],
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
} satisfies Office

const services = [
  {
    parent: {
      service_name: 'MSP',
    },
    parent_id: 1,
    service_id: 10,
    service_name: 'Payment - MSP',
  },
] satisfies Service[]

const categories = [{ service_id: 1, service_name: 'MSP' }] satisfies Category[]

function appointmentEvent(
  overrides: Partial<AppointmentCalendarEvent> = {},
): AppointmentCalendarEvent {
  const start = new Date('2026-06-25T17:45:00.000Z')
  const end = new Date('2026-06-25T18:15:00.000Z')

  return {
    appointment: {} as Appointment,
    appointment_id: 44,
    color: 'cal-events-default',
    end,
    service_id: 10,
    serviceName: 'Payment - MSP',
    start,
    title: 'Pat Smith',
    ...overrides,
  }
}

function renderModal({
  clickedEvent = null,
  clickedTime,
}: {
  clickedEvent?: AppointmentCalendarEvent | null
  clickedTime: Date | null
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const client = {} as ApiClient

  return render(
    <ApiProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <AppointmentModal
          categories={categories}
          clickedEvent={clickedEvent}
          clickedTime={clickedTime}
          isOpen
          office={office}
          onClose={vi.fn()}
          onDraftCleanup={vi.fn().mockResolvedValue(undefined)}
          roleCode="CSR"
          services={services}
        />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('AppointmentModal', () => {
  test('keeps date and time inputs editable for a new appointment', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-24T18:00:00.000Z'))
    renderModal({
      clickedEvent: null,
      clickedTime: new Date('2026-06-24T17:45:00.000Z'),
    })

    const dateInput = screen.getByLabelText('Date')
    const timeInput = screen.getByLabelText('Time')

    expect(dateInput).toBeEnabled()
    expect(timeInput).toBeEnabled()

    fireEvent.change(dateInput, { target: { value: '2026-06-25' } })
    fireEvent.change(timeInput, { target: { value: '09:15' } })

    expect(dateInput).toHaveValue('2026-06-25')
    expect(timeInput).toHaveValue('09:15')
  })

  test('uses the service picker for a new service appointment', () => {
    renderModal({
      clickedEvent: null,
      clickedTime: new Date('2026-06-25T17:45:00.000Z'),
    })

    expect(screen.getByPlaceholderText('Type service here')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Payment - MSP' }))

    expect(screen.getByPlaceholderText('Type service here')).toHaveValue(
      'Payment - MSP',
    )
  })

  test('uses the service picker for an existing service appointment', () => {
    renderModal({
      clickedEvent: appointmentEvent(),
      clickedTime: null,
    })

    expect(screen.getByPlaceholderText('Type service here')).toHaveValue(
      'Payment - MSP',
    )
    expect(screen.getByRole('button', { name: 'Payment - MSP' })).toBeVisible()
  })

  test('does not use the service picker for blackouts or STAT appointments', () => {
    const { unmount } = renderModal({
      clickedEvent: appointmentEvent({ blackout_flag: 'Y' }),
      clickedTime: null,
    })

    expect(screen.queryByPlaceholderText('Type service here')).toBeNull()

    unmount()

    renderModal({
      clickedEvent: appointmentEvent({ stat_flag: true }),
      clickedTime: null,
    })

    expect(screen.queryByPlaceholderText('Type service here')).toBeNull()
  })
})
