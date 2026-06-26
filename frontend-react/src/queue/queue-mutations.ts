import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  activateServiceRequest,
  addCitizen,
  addCitizenToQueue,
  beginCitizenService,
  createServiceRequest,
  finishCitizenService,
  inviteCitizen,
  inviteNextCitizen,
  markCitizenLeft,
  placeCitizenOnHold,
  sendWalkinLineReminder,
  updateCitizen,
  updateServiceRequest,
} from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'

import type { AddCitizenModalState } from './add-citizen-modal-state'

function mutationOptions() {
  return { retry: false } as const
}

async function invalidateCitizens(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
}

async function saveCitizenBase(
  apiClient: ReturnType<typeof useApiClient>,
  current: AddCitizenModalState,
) {
  await updateCitizen(apiClient, current.citizen.citizen_id, {
    citizen_comments: current.comments,
    counter_id: current.counterId,
    notification_email: current.notificationEmail,
    notification_phone: current.notificationPhone,
    priority: current.priority,
    walkin_unique_id: current.walkinUniqueId,
  })
}

async function createSelectedServiceRequest(
  apiClient: ReturnType<typeof useApiClient>,
  current: AddCitizenModalState,
) {
  if (!current.selectedServiceId || !current.channelId) {
    return
  }

  await createServiceRequest(apiClient, {
    channel_id: current.channelId,
    citizen_id: current.citizen.citizen_id,
    priority: current.priority,
    quantity: 1,
    service_id: current.selectedServiceId,
  })
}

export function useCreateCitizenDraftMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: (citizensWaiting: number) =>
      addCitizen(apiClient, citizensWaiting),
    ...mutationOptions(),
  })
}

export function useQuickBeginServiceMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      channelId,
      citizenWaitingCount,
      counterId,
      serviceId,
    }: {
      channelId: number
      citizenWaitingCount: number
      counterId: number | null
      serviceId: number
    }) => {
      const citizen = await addCitizen(apiClient, citizenWaitingCount)

      await updateCitizen(apiClient, citizen.citizen_id, {
        citizen_comments: '',
        counter_id: counterId,
        notification_email: '',
        notification_phone: '',
        priority: 2,
        walkin_unique_id: '',
      })
      await createServiceRequest(apiClient, {
        channel_id: channelId,
        citizen_id: citizen.citizen_id,
        priority: 2,
        quantity: 1,
        service_id: serviceId,
      })
      await beginCitizenService(apiClient, citizen.citizen_id)
      await invalidateCitizens(queryClient)

      return citizen
    },
    ...mutationOptions(),
  })
}

export function useInviteNextCitizenMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (counterId: number | null) => {
      const result = await inviteNextCitizen(apiClient, counterId)
      await invalidateCitizens(queryClient)
      return result
    },
    ...mutationOptions(),
  })
}

export function useInviteCitizenMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      citizenId,
      counterId,
    }: {
      citizenId: number
      counterId: number | null
    }) => {
      const result = await inviteCitizen(apiClient, citizenId, counterId)
      await invalidateCitizens(queryClient)
      return result
    },
    ...mutationOptions(),
  })
}

export function useBeginCitizenFromHoldMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (citizenId: number) => {
      const result = await beginCitizenService(apiClient, citizenId)
      await invalidateCitizens(queryClient)
      return result
    },
    ...mutationOptions(),
  })
}

export function useAddCitizenToQueueMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (current: AddCitizenModalState) => {
      await saveCitizenBase(apiClient, current)
      await createSelectedServiceRequest(apiClient, current)
      const result = await addCitizenToQueue(
        apiClient,
        current.citizen.citizen_id,
      )
      await invalidateCitizens(queryClient)
      return result
    },
    ...mutationOptions(),
  })
}

export function useBeginAddedCitizenServiceMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (current: AddCitizenModalState) => {
      await saveCitizenBase(apiClient, current)
      await createSelectedServiceRequest(apiClient, current)
      const result = await beginCitizenService(
        apiClient,
        current.citizen.citizen_id,
      )
      await invalidateCitizens(queryClient)
      return result
    },
    ...mutationOptions(),
  })
}

export function useCancelAddedCitizenMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (citizenId: number) => {
      const result = await markCitizenLeft(apiClient, citizenId)
      await invalidateCitizens(queryClient)
      return result
    },
    ...mutationOptions(),
  })
}

export function useApplyCitizenServiceMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (current: AddCitizenModalState) => {
      await saveCitizenBase(apiClient, current)

      if (current.mode === 'edit-service' && current.activeServiceRequestId) {
        await updateServiceRequest(apiClient, current.activeServiceRequestId, {
          channel_id: current.channelId ?? undefined,
          service_id: current.selectedServiceId ?? undefined,
        })
      } else {
        await createSelectedServiceRequest(apiClient, current)
      }

      await invalidateCitizens(queryClient)
    },
    ...mutationOptions(),
  })
}

export type ServeCitizenLifecycleAction =
  | { type: 'activate-service-request'; serviceRequestId: number }
  | { type: 'add-to-queue'; citizenId: number }
  | { type: 'begin-service'; citizenId: number }
  | { type: 'citizen-left'; citizenId: number }
  | { type: 'finish-service'; citizenId: number; inaccurate: boolean }
  | { type: 'place-on-hold'; citizenId: number }

export function useServeCitizenLifecycleMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      action,
      reminderCitizenId = null,
      save,
    }: {
      action: ServeCitizenLifecycleAction
      reminderCitizenId?: number | null
      save: () => Promise<void>
    }) => {
      await save()

      if (action.type === 'activate-service-request') {
        await activateServiceRequest(apiClient, action.serviceRequestId)
      } else if (action.type === 'add-to-queue') {
        await addCitizenToQueue(apiClient, action.citizenId)
      } else if (action.type === 'begin-service') {
        await beginCitizenService(apiClient, action.citizenId)
      } else if (action.type === 'citizen-left') {
        await markCitizenLeft(apiClient, action.citizenId)
      } else if (action.type === 'finish-service') {
        await finishCitizenService(
          apiClient,
          action.citizenId,
          action.inaccurate,
        )
      } else {
        await placeCitizenOnHold(apiClient, action.citizenId)
      }

      if (reminderCitizenId !== null) {
        await sendWalkinLineReminder(apiClient, reminderCitizenId)
      }

      await invalidateCitizens(queryClient)
    },
    ...mutationOptions(),
  })
}

export function useGaEndServiceMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (citizenId: number) => {
      const result = await finishCitizenService(apiClient, citizenId, true)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.citizens }),
        queryClient.invalidateQueries({ queryKey: queryKeys.csrs.all }),
      ])
      return result
    },
    ...mutationOptions(),
  })
}
