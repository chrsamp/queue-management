import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type {
  Appointment,
  Booking,
  Citizen,
  Csr,
  ServiceRequest,
} from '@/api/schemas'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import { RealtimeService } from './realtime-service'

const socketMocks = vi.hoisted(() => ({
  io: vi.fn(),
  listeners: {} as Record<string, (...args: unknown[]) => void>,
  managerListeners: {} as Record<string, (...args: unknown[]) => void>,
}))

vi.mock('socket.io-client', () => ({
  io: socketMocks.io,
}))

const config = {
  reconnectionDelayMax: 5000,
  timeout: 20000,
  url: 'http://localhost:5000',
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
    role_code: 'GA',
    role_desc: null,
    role_id: 1,
  },
  role_id: 1,
  username: 'queue.user',
} satisfies Csr

function serviceRequest(
  periodName: string,
  overrides: Partial<ServiceRequest> = {},
) {
  return {
    citizen_id: 1,
    periods: [
      {
        csr: {
          counter: 1,
          counter_id: 1,
          username: 'queue.user',
        },
        csr_id: 42,
        period_id: 100,
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
    ...overrides,
  } satisfies ServiceRequest
}

function citizen(
  id: number,
  periodName: string,
  overrides: Partial<Citizen> = {},
) {
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
    service_reqs: [serviceRequest(periodName)],
    start_time: '2026-06-23T16:00:00Z',
    ticket_number: `A${id}`,
    ...overrides,
  } satisfies Citizen
}

function appointment(
  id: number,
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    appointment_id: id,
    blackout_flag: null,
    checked_in_time: null,
    citizen_id: 200 + id,
    citizen_name: `Appointment ${id}`,
    comments: null,
    contact_information: null,
    end_time: '2026-06-23T17:30:00Z',
    is_draft: false,
    office: csr.office,
    office_id: 1,
    online_flag: false,
    recurring_uuid: null,
    service: null,
    service_id: null,
    start_time: '2026-06-23T17:00:00Z',
    stat_flag: false,
    ...overrides,
  }
}

function booking(id: number, overrides: Partial<Booking> = {}): Booking {
  return {
    blackout_flag: null,
    blackout_notes: null,
    booking_contact_information: null,
    booking_id: id,
    booking_name: `Booking ${id}`,
    end_time: '2026-06-24T18:00:00Z',
    fees: null,
    invigilator: null,
    invigilator_id: null,
    invigilators: [],
    office: csr.office,
    office_id: 1,
    recurring_uuid: null,
    room: {
      capacity: 10,
      color: '#005ea8',
      deleted: null,
      office_id: 1,
      room_id: 7,
      room_name: 'Room 7',
    },
    room_id: 7,
    sbc_staff_invigilated: null,
    shadow_invigilator_id: null,
    start_time: '2026-06-24T17:00:00Z',
    stat_flag: false,
    ...overrides,
  }
}

function createMockSocket() {
  const socket = {
    close: vi.fn(),
    connected: false,
    emit: vi.fn((_eventName, _payload, ack?: () => void) => {
      ack?.()
    }),
    io: {
      on: vi.fn((eventName: string, listener: (...args: unknown[]) => void) => {
        socketMocks.managerListeners[eventName] = listener
      }),
    },
    on: vi.fn((eventName: string, listener: (...args: unknown[]) => void) => {
      socketMocks.listeners[eventName] = listener
      return socket
    }),
    open: vi.fn(),
    removeAllListeners: vi.fn(),
  }

  socketMocks.io.mockReturnValue(socket)

  return socket
}

function createService() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

  return {
    invalidateQueries,
    queryClient,
    service: new RealtimeService({ config, queryClient }),
  }
}

beforeEach(() => {
  socketMocks.listeners = {}
  socketMocks.managerListeners = {}
  socketMocks.io.mockReset()
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  useWorkflowStore.getState().setCurrentCsr(csr)
})

afterEach(() => {
  vi.useRealTimers()
  useWorkflowStore.getState().clearWorkflow()
  vi.restoreAllMocks()
})

describe('StaffSocketService', () => {
  test('connects with the legacy staff socket options and registers all listeners', () => {
    const socket = createMockSocket()
    const { service } = createService()

    service.connect()

    expect(socketMocks.io).toHaveBeenCalledWith(config.url, {
      autoConnect: false,
      path: '/api/v1/socket.io',
      reconnectionDelayMax: config.reconnectionDelayMax,
      timeout: config.timeout,
      transports: ['websocket'],
      withCredentials: true,
    })
    expect(socket.open).toHaveBeenCalledTimes(1)
    expect(Object.keys(socketMocks.listeners).sort()).toEqual(
      [
        'appointment_create',
        'appointment_delete',
        'appointment_update',
        'booking_create',
        'booking_delete',
        'booking_update',
        'clear_csr_cache',
        'connect',
        'csr_update',
        'disconnect',
        'get_Csr_State_IDs',
        'joinRoomFail',
        'joinRoomSuccess',
        'reconnecting',
        'update_active_citizen',
        'update_customer_list',
        'update_offices_cache',
      ].sort(),
    )
    expect(Object.keys(socketMocks.managerListeners)).toEqual([
      'reconnect_attempt',
    ])
  })

  test('emits joinRoom after connecting', () => {
    const socket = createMockSocket()
    const { service } = createService()

    service.connect()
    socketMocks.listeners.connect()

    expect(socket.emit).toHaveBeenCalledWith(
      'joinRoom',
      { count: 0 },
      expect.any(Function),
    )
    expect(useWorkflowStore.getState().realtimeConnectionStatus).toBe(
      'connected',
    )
  })

  test('starts and clears the legacy manual reconnect loop', () => {
    vi.useFakeTimers()
    const socket = createMockSocket()
    const { service } = createService()

    service.connect()
    socketMocks.listeners.disconnect()
    vi.advanceTimersByTime(1000)

    expect(socket.open).toHaveBeenCalledTimes(2)
    expect(useWorkflowStore.getState().realtimeConnectionStatus).toBe(
      'reconnecting',
    )

    service.close()
    vi.advanceTimersByTime(1000)

    expect(socket.open).toHaveBeenCalledTimes(2)
    expect(socket.close).toHaveBeenCalledTimes(1)
    expect(socket.removeAllListeners).toHaveBeenCalledTimes(1)
  })

  test('updates room status for joinRoomSuccess and joinRoomFail', () => {
    createMockSocket()
    const { service } = createService()

    service.connect()
    socketMocks.listeners.joinRoomSuccess({ sucess: true })

    expect(useWorkflowStore.getState().realtimeRoomStatus).toBe('joined')
    expect(useWorkflowStore.getState().realtimeLastError).toBeNull()

    socketMocks.listeners.joinRoomFail({ success: false })

    expect(useWorkflowStore.getState().realtimeRoomStatus).toBe('failed')
    expect(useWorkflowStore.getState().realtimeLastError).toBe(
      'Unable to join staff room',
    )
  })

  test('invalidates handled reference, CSR, and office queries', () => {
    const socket = createMockSocket()
    const { invalidateQueries, service } = createService()

    service.connect()
    socketMocks.listeners.get_Csr_State_IDs()
    socketMocks.listeners.csr_update({ csr_id: 42 })
    socketMocks.listeners.update_offices_cache()

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.csrStates,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.csrs.me,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.csrs.all,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.offices,
    })
    expect(socket.emit).toHaveBeenCalledWith('sync_offices_cache')
  })

  test('invalidates the CSR list for SUPPORT users on csr_update', () => {
    createMockSocket()
    useWorkflowStore.getState().setCurrentCsr({
      ...csr,
      role: {
        role_code: 'SUPPORT',
        role_desc: null,
        role_id: 2,
      },
      role_id: 2,
    })
    const { invalidateQueries, service } = createService()

    service.connect()
    socketMocks.listeners.csr_update({ csr_id: 42 })

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.csrs.all,
    })
  })

  test('emits clear_csr_user_id when clear_csr_cache is received', () => {
    const socket = createMockSocket()
    const { service } = createService()

    service.connect()
    socketMocks.listeners.clear_csr_cache({ id: 42 })

    expect(socket.emit).toHaveBeenCalledWith('clear_csr_user_id', 42)
  })

  test('refreshes queue data for update_customer_list without deferred logs', () => {
    createMockSocket()
    const { invalidateQueries, service } = createService()

    service.connect()
    socketMocks.listeners.update_customer_list({ success: true })

    expect(console.info).toHaveBeenCalledWith(
      'socket received: "update_customer_list"',
      { success: true },
    )
    expect(console.info).not.toHaveBeenCalledWith(
      expect.stringContaining('React handling is deferred'),
      expect.anything(),
    )
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.citizens,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.activeCitizen,
    })
  })

  test('upserts appointment create and update events into matching office caches', () => {
    createMockSocket()
    const { invalidateQueries, queryClient, service } = createService()
    queryClient.setQueryData<Appointment[]>(queryKeys.appointments.office(1), [
      appointment(1),
    ])
    queryClient.setQueryData<Appointment[]>(queryKeys.appointments.office(2), [
      appointment(2, { office_id: 2 }),
      appointment(1, { office_id: 2 }),
    ])

    service.connect()
    socketMocks.listeners.appointment_create(appointment(4))
    socketMocks.listeners.appointment_update(
      appointment(1, { citizen_name: 'Updated appointment' }),
    )

    expect(
      queryClient.getQueryData<Appointment[]>(queryKeys.appointments.office(1)),
    ).toMatchObject([
      { appointment_id: 1, citizen_name: 'Updated appointment' },
      { appointment_id: 4 },
    ])
    expect(
      queryClient.getQueryData<Appointment[]>(queryKeys.appointments.office(2)),
    ).toEqual([appointment(2, { office_id: 2 })])
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.appointments.all,
    })
  })

  test('removes appointment delete events by id or recurring series', () => {
    createMockSocket()
    const { queryClient, service } = createService()
    queryClient.setQueryData<Appointment[]>(queryKeys.appointments.office(1), [
      appointment(1),
      appointment(2, { recurring_uuid: 'series-1' }),
      appointment(3, { recurring_uuid: 'series-1' }),
    ])

    service.connect()
    socketMocks.listeners.appointment_delete(1)
    socketMocks.listeners.appointment_delete('series-1')

    expect(
      queryClient.getQueryData<Appointment[]>(queryKeys.appointments.office(1)),
    ).toEqual([])
  })

  test('invalid appointment payloads fall back to refetch without deferred logs', () => {
    createMockSocket()
    const { invalidateQueries, service } = createService()

    service.connect()
    socketMocks.listeners.appointment_create({ appointment_id: 1 })

    expect(console.info).toHaveBeenCalledWith(
      'socket received: "appointment_create"',
      { appointment_id: 1 },
    )
    expect(console.info).not.toHaveBeenCalledWith(
      expect.stringContaining('React handling is deferred'),
      expect.anything(),
    )
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.appointments.all,
    })
  })

  test('upserts booking create and update events and refreshes affected routes', () => {
    createMockSocket()
    const { invalidateQueries, queryClient, service } = createService()
    queryClient.setQueryData<Booking[]>(queryKeys.bookings.office(1), [
      booking(1),
    ])

    service.connect()
    socketMocks.listeners.booking_create(booking(2))
    socketMocks.listeners.booking_update(
      booking(1, { booking_name: 'Updated booking' }),
    )

    expect(
      queryClient.getQueryData<Booking[]>(queryKeys.bookings.office(1)),
    ).toMatchObject([
      { booking_id: 1, booking_name: 'Updated booking' },
      { booking_id: 2 },
    ])
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.bookings.all,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.exams.all,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.appointments.all,
    })
  })

  test('removes booking delete events by id or recurring series', () => {
    createMockSocket()
    const { queryClient, service } = createService()
    queryClient.setQueryData<Booking[]>(queryKeys.bookings.office(1), [
      booking(1),
      booking(2, { recurring_uuid: 'series-2' }),
      booking(3, { recurring_uuid: 'series-2' }),
    ])

    service.connect()
    socketMocks.listeners.booking_delete({ booking_id: 1 })
    socketMocks.listeners.booking_delete('series-2')

    expect(
      queryClient.getQueryData<Booking[]>(queryKeys.bookings.office(1)),
    ).toEqual([])
  })

  test('upserts update_active_citizen payloads into the citizen cache', () => {
    createMockSocket()
    const { queryClient, service } = createService()
    queryClient.setQueryData<Citizen[]>(queryKeys.citizens, [
      citizen(1, 'Waiting'),
    ])

    service.connect()
    socketMocks.listeners.update_active_citizen(citizen(2, 'Waiting'))

    expect(queryClient.getQueryData<Citizen[]>(queryKeys.citizens)).toEqual([
      citizen(1, 'Waiting'),
      citizen(2, 'Waiting'),
    ])

    socketMocks.listeners.update_active_citizen(
      citizen(1, 'On hold', { citizen_comments: 'Updated' }),
    )

    expect(
      queryClient.getQueryData<Citizen[]>(queryKeys.citizens)?.[0],
    ).toMatchObject({
      citizen_comments: 'Updated',
      citizen_id: 1,
    })
  })

  test('opens the queue service modal for an invited active citizen', () => {
    window.history.pushState(null, '', '/queue')
    createMockSocket()
    const { service } = createService()

    service.connect()
    socketMocks.listeners.update_active_citizen(citizen(7, 'Invited'))

    expect(useWorkflowStore.getState()).toMatchObject({
      activeCitizenId: 7,
      activeServiceRequestId: 20,
      citizenInvited: true,
      serviceBegun: false,
      showServiceModal: true,
    })
  })

  test('marks being-served active citizens as service begun', () => {
    createMockSocket()
    const { service } = createService()

    service.connect()
    socketMocks.listeners.update_active_citizen(citizen(7, 'Being Served'))

    expect(useWorkflowStore.getState()).toMatchObject({
      activeCitizenId: 7,
      activeServiceRequestId: 20,
      citizenInvited: false,
      serviceBegun: true,
    })
  })

  test('clears only matching active workflow when a citizen is no longer active for the CSR', () => {
    createMockSocket()
    const { service } = createService()

    service.connect()
    useWorkflowStore.getState().setActiveServiceCitizen(99, 99, true)
    socketMocks.listeners.update_active_citizen(citizen(7, 'On hold'))

    expect(useWorkflowStore.getState().activeCitizenId).toBe(99)

    useWorkflowStore.getState().setActiveServiceCitizen(7, 20, true)
    socketMocks.listeners.update_active_citizen(citizen(7, 'On hold'))

    expect(useWorkflowStore.getState().activeCitizenId).toBeNull()
  })

  test('invalid update_active_citizen payloads preserve workflow state and refresh safely', () => {
    createMockSocket()
    const { invalidateQueries, service } = createService()
    useWorkflowStore.getState().setActiveServiceCitizen(7, 20, true)

    service.connect()
    socketMocks.listeners.update_active_citizen({ citizen_id: 7 })

    expect(useWorkflowStore.getState().activeCitizenId).toBe(7)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.citizens,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.activeCitizen,
    })
  })
})
