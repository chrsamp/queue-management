import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createAppointment,
  createDraftAppointment,
  deleteAllStatAppointments,
  deleteAppointment,
  deleteDraftAppointment,
  deleteRecurringAppointments,
  deleteRecurringStatBookingsForAllOffices,
  deleteRecurringStatBookingsForCurrentOffice,
  updateAppointment,
  updateRecurringAppointment,
  type AppointmentPayload,
} from '@/api/endpoints'
import type { Appointment } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'

import { checkInAppointment } from './appointment-checkin'

function mutationOptions() {
  return { retry: false } as const
}

export function useCreateDraftAppointmentMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: (payload: AppointmentPayload) =>
      createDraftAppointment(apiClient, payload),
    ...mutationOptions(),
  })
}

export function useDeleteDraftAppointmentMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: (appointmentId: number) =>
      deleteDraftAppointment(apiClient, appointmentId),
    ...mutationOptions(),
  })
}

export function useSaveAppointmentMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      createPayload,
      recurringUuid,
      updatePayload,
    }: {
      appointmentId?: number
      createPayload?: AppointmentPayload
      recurringUuid?: string
      updatePayload: AppointmentPayload
    }) => {
      if (appointmentId) {
        if (recurringUuid) {
          await updateRecurringAppointment(apiClient, recurringUuid, updatePayload)
        } else {
          await updateAppointment(apiClient, appointmentId, updatePayload)
        }
      } else if (createPayload) {
        await createAppointment(apiClient, createPayload)
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all,
      })
    },
    ...mutationOptions(),
  })
}

export function useDeleteAppointmentMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      recurringUuid,
      singleOnly = false,
      stat = false,
    }: {
      appointmentId: number
      recurringUuid?: string | null
      singleOnly?: boolean
      stat?: boolean
    }) => {
      if (!singleOnly && recurringUuid) {
        if (stat) {
          await deleteAllStatAppointments(apiClient, recurringUuid)
          await deleteRecurringStatBookingsForAllOffices(apiClient, recurringUuid)
        } else {
          await deleteRecurringAppointments(apiClient, recurringUuid)
          await deleteRecurringStatBookingsForCurrentOffice(apiClient, recurringUuid)
        }
      } else {
        await deleteAppointment(apiClient, appointmentId)
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all,
      })
    },
    ...mutationOptions(),
  })
}

export function useCheckInAppointmentMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointment,
      beginService = false,
    }: {
      appointment: Appointment
      beginService?: boolean
    }) => {
      await checkInAppointment({
        apiClient,
        appointment,
        beginService,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.citizens }),
      ])
    },
    ...mutationOptions(),
  })
}

export function useCreateAppointmentBlackoutMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (run: (apiClient: ReturnType<typeof useApiClient>) => Promise<void>) => {
      await run(apiClient)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all,
      })
    },
    ...mutationOptions(),
  })
}
