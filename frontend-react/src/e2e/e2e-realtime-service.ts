import type { QueryClient } from '@tanstack/react-query'

import { citizenSchema, type Citizen } from '@/api/schemas'
import { queryKeys } from '@/query/query-keys'
import { getActiveCitizenForCsr } from '@/queue/queue-utils'
import type { RealtimeServiceHandle } from '@/realtime/RealtimeProvider'
import type { RealtimeServiceOptions } from '@/realtime/realtime-service'
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
