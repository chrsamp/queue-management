import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'

import ApiProvider from '@/api/ApiProvider'
import { ApiClient } from '@/api/client'
import type { AuthService } from '@/auth/auth-service'
import AuthProvider from '@/auth/AuthProvider'
import type { RuntimeConfig } from '@/config/runtime-config'
import { useBookingStore } from '@/store/booking-store'
import { server } from '@/test/server'
import { appointmentFixture, userFixture } from '@/test/fixtures'

vi.mock('@/booking/OfficeMap', () => ({
  default: ({ office }: { office: { office_name: string } }) => (
    <div aria-label={`Map showing ${office.office_name}`} />
  ),
}))

import AppointmentBooking from './AppointmentBooking'

const config: RuntimeConfig = {
  VITE_APPOINTMENT_API_URL: 'http://localhost:5000/api/v1',
  VITE_APPOINTMENT_BCEID_REGISTRATION_URL: '',
  VITE_APPOINTMENT_BC_SERVICES_CARD_URL: '',
  VITE_APPOINTMENT_DISABLE_SMS: false,
  VITE_APPOINTMENT_FOOTER_LINKS: '',
  VITE_APPOINTMENT_FOOTER_MESSAGE: '',
  VITE_APPOINTMENT_HEADER_LINKS: '',
  VITE_APPOINTMENT_HEADER_MESSAGE: '',
  VITE_APPOINTMENT_HIDE_BC_SERVICES_CARD: false,
}

function renderBooking(authenticated = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const authSnapshot = {
    authenticated,
    authorized: authenticated,
    displayName: authenticated ? 'Alex Citizen' : null,
    error: null,
    initialized: true,
    roles: authenticated ? ['online_appointment_user'] : [],
    token: authenticated ? 'test-token' : null,
    username: authenticated ? 'citizen@bceidboth' : null,
  }
  const authService = {
    getSnapshot: () => authSnapshot,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    refreshToken: () => Promise.resolve(),
    subscribe: () => () => undefined,
  } as unknown as AuthService
  const apiClient = new ApiClient({
    authService,
    baseUrl: 'http://localhost:5000/api/v1',
  })
  return render(
    <AuthProvider authService={authService}>
      <ApiProvider client={apiClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AppointmentBooking config={config} />
          </MemoryRouter>
        </QueryClientProvider>
      </ApiProvider>
    </AuthProvider>,
  )
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: string | RegExp,
  optionName: RegExp,
) {
  await user.click(await screen.findByLabelText(triggerName))
  await user.click(await screen.findByRole('option', { name: optionName }))
}

async function startBooking(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Book an appointment' }))
}

beforeEach(() => {
  window.sessionStorage.clear()
  useBookingStore.getState().clearBooking()
})

afterEach(() => {
  cleanup()
})

describe('appointment booking location and service flow', () => {
  it('shows the introduction and starts Step 1', async () => {
    const user = userEvent.setup()
    renderBooking()

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Book an appointment at Service BC',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'What you should know',
      }),
    ).toBeVisible()
    expect(
      screen.getByText(/do more than one service in a single appointment/),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: '1-800-663-6687' }),
    ).toHaveAttribute('href', 'tel:+18006636687')
    expect(
      screen.getByRole('link', {
        name: 'Get help with government services',
      }),
    ).toHaveAttribute('href', 'https://gov.bc.ca/contact')
    expect(
      screen.queryByRole('navigation', { name: 'Booking progress' }),
    ).toBeNull()

    await startBooking(user)

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Select a Service BC location',
      }),
    ).toHaveFocus()
    expect(screen.getByText('Step 1')).toBeVisible()
    const back = screen.getByRole('button', { name: 'Back' })
    const progress = screen.getByRole('navigation', {
      name: 'Booking progress',
    })
    expect(
      back.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await user.click(back)
    expect(
      screen.getByRole('heading', {
        name: 'Book an appointment at Service BC',
      }),
    ).toHaveFocus()
  })

  it('selects an office, shows its details, and navigates back from services', async () => {
    const user = userEvent.setup()
    renderBooking()
    await startBooking(user)

    await selectOption(user, 'Select Office', /Victoria Service BC Centre/)

    const officeHeading = screen.getByRole('heading', {
      name: 'Victoria Service BC Centre',
    })
    expect(officeHeading).toBeVisible()
    expect(screen.getByText('250-555-0100')).toBeVisible()
    expect(screen.getAllByText('8:30 a.m. – 4:30 p.m.')).toHaveLength(5)
    expect(
      screen.getByLabelText('Map showing Victoria Service BC Centre'),
    ).toBeVisible()

    const officeDetails = officeHeading.closest('article')
    expect(officeDetails).not.toBeNull()
    const detailsText = officeDetails!.textContent ?? ''
    expect(
      detailsText.indexOf('403-771 Vernon Avenue, Victoria, BC'),
    ).toBeLessThan(detailsText.indexOf('250-555-0100'))
    expect(detailsText.indexOf('View available services')).toBeLessThan(
      detailsText.indexOf('Book Appointment'),
    )

    await user.click(screen.getByRole('button', { name: 'Book Appointment' }))
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Select the service you need',
      }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(
      screen.getByRole('heading', {
        name: 'Select a Service BC location',
      }),
    ).toHaveFocus()
  })

  it('filters the Available Services dialog and resets its filters', async () => {
    const user = userEvent.setup()
    renderBooking()
    await startBooking(user)
    await selectOption(user, 'Select Office', /Victoria Service BC Centre/)

    await user.click(
      screen.getByRole('link', { name: 'View available services' }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Unavailable Service')).toBeVisible()
    expect(within(dialog).queryByText('Hidden Service')).toBeNull()

    await user.type(
      within(dialog).getByRole('searchbox', { name: 'Search Service' }),
      'knowledge',
    )
    expect(within(dialog).getByText('Knowledge Test')).toBeVisible()
    expect(within(dialog).queryByText('General Service')).toBeNull()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await user.click(
      screen.getByRole('link', { name: 'View available services' }),
    )
    expect(
      within(await screen.findByRole('dialog')).getByText('General Service'),
    ).toBeVisible()
  })

  it('blocks an unavailable service and advances a bookable service', async () => {
    const user = userEvent.setup()
    renderBooking()
    await startBooking(user)
    await selectOption(user, 'Select Office', /Victoria Service BC Centre/)
    await user.click(screen.getByRole('button', { name: 'Book Appointment' }))

    await selectOption(user, 'Select Service', /Unavailable Service/)
    expect(screen.getByText(/is not available by appointment/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /Next/ })).toBeNull()

    await selectOption(user, /Unavailable Service/, /General Service/)
    await user.click(screen.getByRole('button', { name: /Next/ }))

    expect(
      screen.getByRole('heading', { name: 'Select a date and time' }),
    ).toHaveFocus()
    expect(useBookingStore.getState().selectedServiceId).toBeGreaterThan(0)
  })

  it('has no serious or critical accessibility violations', async () => {
    const user = userEvent.setup()
    const { container } = renderBooking()
    await startBooking(user)
    await screen.findByLabelText('Select Office')

    const results = await axe(container)
    expect(
      results.violations.filter(
        ({ impact }) => impact === 'serious' || impact === 'critical',
      ),
    ).toEqual([])
  })

  it('creates a draft from an office-local time and advances to login', async () => {
    const user = userEvent.setup()
    const store = useBookingStore.getState()
    store.setOfficeId(10)
    store.setServiceId(20)
    store.setCurrentStep('date')
    renderBooking()

    await user.click(
      await screen.findByRole('button', {
        name: '9:00 a.m. – 9:30 a.m.',
      }),
    )

    expect(await screen.findByRole('heading', { name: 'Login' })).toHaveFocus()
    expect(screen.getByText('Sign in to continue')).toBeVisible()
    const progress = screen.getByRole('navigation', {
      name: 'Booking progress',
    })
    expect(within(progress).getAllByRole('listitem')).toHaveLength(4)
    expect(progress.querySelector('[aria-current="step"]')).toBeNull()
    expect(useBookingStore.getState()).toMatchObject({
      currentStep: 'login',
      draftAppointmentId: 40,
      selectedSlot: {
        dateKey: '07/15/2030',
        endTime: '2030-07-15T16:30:00.000Z',
        startTime: '2030-07-15T16:00:00.000Z',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(
      screen.getByRole('heading', { name: 'Select a date and time' }),
    ).toHaveFocus()
  })

  it('recovers when draft creation reports a slot conflict', async () => {
    server.use(
      http.post('http://localhost:5000/api/v1/appointments/draft', () =>
        HttpResponse.json(
          {
            code: 'CONFLICT_APPOINTMENT',
            message: 'Please pick another time.',
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    const store = useBookingStore.getState()
    store.setOfficeId(10)
    store.setServiceId(20)
    store.setCurrentStep('date')
    renderBooking()

    await user.click(
      await screen.findByRole('button', {
        name: '9:00 a.m. – 9:30 a.m.',
      }),
    )

    expect(
      await screen.findByText(
        'That time is no longer available. Please choose another time.',
      ),
    ).toBeVisible()
    expect(useBookingStore.getState()).toMatchObject({
      currentStep: 'date',
      draftAppointmentId: null,
      selectedSlot: null,
    })
  })

  it('provisions the user, saves reminders, and confirms the draft', async () => {
    let appointmentRequest: unknown
    let reminderRequest: unknown
    server.use(
      http.put(
        'http://localhost:5000/api/v1/users/:userId/',
        async ({ request }) => {
          reminderRequest = await request.json()
          return HttpResponse.json([
            { ...userFixture, send_sms_reminders: true },
          ])
        },
      ),
      http.post(
        'http://localhost:5000/api/v1/appointments/',
        async ({ request }) => {
          appointmentRequest = await request.json()
          return HttpResponse.json(
            { appointment: appointmentFixture, errors: {} },
            { status: 201 },
          )
        },
      ),
    )
    const store = useBookingStore.getState()
    store.setOfficeId(10)
    store.setServiceId(20)
    store.setReservation(
      {
        dateKey: '07/15/2030',
        endTime: '2030-07-15T16:30:00.000Z',
        startTime: '2030-07-15T16:00:00.000Z',
      },
      40,
    )
    store.setCurrentStep('summary')
    const user = userEvent.setup()
    renderBooking(true)

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Appointment summary',
      }),
    ).toBeVisible()
    expect(screen.getByText('Step 4')).toBeVisible()
    expect(
      screen.getByText(
        'Please confirm your appointment and location before completing your booking.',
      ),
    ).toBeVisible()

    await user.click(
      await screen.findByRole('switch', {
        name: /SMS text message/,
      }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /I agree to the Terms/ }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Confirm Appointment' }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Success! Your appointment has been booked.',
      }),
    ).toBeVisible()
    expect(reminderRequest).toMatchObject({
      send_sms_reminders: true,
    })
    expect(appointmentRequest).toMatchObject({
      appointment_draft_id: 40,
      office_id: 10,
      service_id: 20,
    })
  })

  it('rejects a second active Knowledge Test appointment', async () => {
    let appointmentSubmitted = false
    server.use(
      http.post('http://localhost:5000/api/v1/appointments/', () => {
        appointmentSubmitted = true
        return HttpResponse.json(
          { appointment: appointmentFixture, errors: {} },
          { status: 201 },
        )
      }),
    )
    const store = useBookingStore.getState()
    store.setOfficeId(10)
    store.setServiceId(23)
    store.setReservation(
      {
        dateKey: '07/15/2030',
        endTime: '2030-07-15T16:30:00.000Z',
        startTime: '2030-07-15T16:00:00.000Z',
      },
      40,
    )
    store.setCurrentStep('summary')
    const user = userEvent.setup()
    renderBooking(true)

    await user.click(
      await screen.findByRole('checkbox', {
        name: /I agree to the Terms/,
      }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Confirm Appointment' }),
    )

    expect(
      await screen.findByText(
        /already have an appointment scheduled for a Knowledge Test/,
      ),
    ).toBeVisible()
    expect(appointmentSubmitted).toBe(false)
    expect(useBookingStore.getState().draftAppointmentId).toBeNull()
  })
})
