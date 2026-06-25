import type { QueryClient } from '@tanstack/react-query'

import {
  appointmentSchema,
  bookingSchema,
  citizenSchema,
  type Citizen,
} from '@/api/schemas'
import { queryKeys } from '@/query/query-keys'
import { getActiveCitizenForCsr } from '@/queue/queue-utils'
import type { RealtimeServiceHandle } from '@/realtime/RealtimeProvider'
import type { RealtimeServiceOptions } from '@/realtime/realtime-service'
import {
  extractRealtimeId,
  refreshAppointmentQueries,
  refreshBookingQueries,
  removeAppointmentCache,
  removeBookingCache,
  upsertAppointmentCache,
  upsertBookingCache,
} from '@/realtime/realtime-query-handlers'
import { useWorkflowStore } from '@/store/workflow-store'

declare global {
  interface Window {
    __QMS_E2E_REALTIME__?: {
      emit: (eventName: string, payload?: unknown) => void
    }
  }
}

export function createE2eRealtimeService({
  queryClient,
}: RealtimeServiceOptions): RealtimeServiceHandle {
  const emit = (eventName: string, payload?: unknown) => {
    useWorkflowStore.getState().setRealtimeEvent(eventName)

    if (eventName === 'update_active_citizen') {
      applyUpdateActiveCitizen(queryClient, payload)
      return
    }

    if (eventName === 'csr_update') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me })
      void queryClient.invalidateQueries({ queryKey: queryKeys.csrs.all })
      return
    }

    if (eventName === 'get_Csr_State_IDs') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.csrStates })
      return
    }

    if (eventName === 'update_customer_list') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activeCitizen })
      return
    }

    if (eventName === 'update_offices_cache') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.offices })
      void queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me })
      return
    }

    if (
      eventName === 'appointment_create' ||
      eventName === 'appointment_update'
    ) {
      applyAppointmentUpsert(queryClient, payload)
      return
    }

    if (eventName === 'appointment_delete') {
      applyAppointmentDelete(queryClient, payload)
      return
    }

    if (eventName === 'booking_create' || eventName === 'booking_update') {
      applyBookingUpsert(queryClient, payload)
      return
    }

    if (eventName === 'booking_delete') {
      applyBookingDelete(queryClient, payload)
    }
  }

  window.__QMS_E2E_REALTIME__ = { emit }

  return {
    close: () => {
      useWorkflowStore.getState().setRealtimeConnectionStatus('idle')
    },
    connect: () => {
      useWorkflowStore.getState().setRealtimeConnectionStatus('connected')
      useWorkflowStore.getState().setRealtimeRoomStatus('joined')
    },
    reconnect: () => {
      useWorkflowStore.getState().setRealtimeConnectionStatus('connected')
    },
  }
}

function applyAppointmentUpsert(queryClient: QueryClient, payload: unknown) {
  const parsed = appointmentSchema.safeParse(payload)

  if (parsed.success) {
    upsertAppointmentCache(queryClient, parsed.data)
  }

  refreshAppointmentQueries(queryClient)
}

function applyAppointmentDelete(queryClient: QueryClient, payload: unknown) {
  const id = extractRealtimeId(payload, 'appointment_id')

  if (id !== null) {
    removeAppointmentCache(queryClient, id)
  }

  refreshAppointmentQueries(queryClient)
}

function applyBookingUpsert(queryClient: QueryClient, payload: unknown) {
  const parsed = bookingSchema.safeParse(payload)

  if (parsed.success) {
    upsertBookingCache(queryClient, parsed.data)
  }

  refreshBookingQueries(queryClient)
}

function applyBookingDelete(queryClient: QueryClient, payload: unknown) {
  const id = extractRealtimeId(payload, 'booking_id')

  if (id !== null) {
    removeBookingCache(queryClient, id)
  }

  refreshBookingQueries(queryClient)
}

function applyUpdateActiveCitizen(queryClient: QueryClient, payload: unknown) {
  const parsed = citizenSchema.safeParse(payload)

  if (!parsed.success) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
    return
  }

  const citizen = parsed.data

  queryClient.setQueryData<Citizen[]>(queryKeys.citizens, (current = []) => {
    const index = current.findIndex(
      (item) => item.citizen_id === citizen.citizen_id,
    )

    if (index === -1) {
      return [...current, citizen]
    }

    return current.map((item) =>
      item.citizen_id === citizen.citizen_id ? citizen : item,
    )
  })

  const workflow = useWorkflowStore.getState()
  const activeCitizen = getActiveCitizenForCsr({
    citizens: [citizen],
    csrId: workflow.currentCsrId,
    username: workflow.currentUsername,
  })

  if (activeCitizen) {
    workflow.setActiveServiceCitizen(
      citizen.citizen_id,
      activeCitizen.serviceRequest.sr_id,
      activeCitizen.serviceBegun,
    )
    workflow.openServiceModal()
  } else if (workflow.activeCitizenId === citizen.citizen_id) {
    workflow.clearServeCitizen()
  }
}
