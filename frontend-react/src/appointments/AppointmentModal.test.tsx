import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ApiClient } from '@/api/client'
import { ApiProvider } from '@/api/ApiProvider'
import type { Office, Service } from '@/api/schemas'

import AppointmentModal from './AppointmentModal'

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

function renderModal(clickedTime: Date) {
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
          clickedEvent={null}
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
  vi.useRealTimers()
})

describe('AppointmentModal', () => {
  test('keeps date and time inputs editable for a new appointment', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-24T18:00:00.000Z'))
    renderModal(new Date('2026-06-24T17:45:00.000Z'))

    const dateInput = screen.getByLabelText('Date')
    const timeInput = screen.getByLabelText('Time')

    expect(dateInput).toBeEnabled()
    expect(timeInput).toBeEnabled()

    fireEvent.change(dateInput, { target: { value: '2026-06-25' } })
    fireEvent.change(timeInput, { target: { value: '09:15' } })

    expect(dateInput).toHaveValue('2026-06-25')
    expect(timeInput).toHaveValue('09:15')
  })
})
