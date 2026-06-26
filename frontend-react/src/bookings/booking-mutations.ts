import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createBooking,
  deleteBooking,
  deleteRecurringBooking,
  deleteRecurringStatBookingsForAllOffices,
  deleteRecurringStatBookingsForCurrentOffice,
  updateBooking,
  updateExamBooking,
  updateRecurringBooking,
  type BookingPayload,
} from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'

function mutationOptions() {
  return { retry: false } as const
}

async function invalidateBookings(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.exams.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
  ])
}

export function useSaveBookingEventMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookingId,
      examId,
      mode,
      payload,
      recurringUuid,
    }: {
      bookingId?: number
      examId?: number
      mode: 'create' | 'reschedule' | 'update'
      payload: BookingPayload
      recurringUuid?: string | null
    }) => {
      if (mode === 'update' && bookingId) {
        if (recurringUuid) {
          await updateRecurringBooking(apiClient, recurringUuid, {
            blackout_notes: payload.blackout_notes ?? null,
          })
        } else {
          await updateBooking(apiClient, bookingId, payload)
        }
      } else if (mode === 'reschedule' && bookingId) {
        await updateBooking(apiClient, bookingId, payload)
      } else {
        const created = await createBooking(apiClient, payload)

        if (created?.booking_id && examId) {
          await updateExamBooking(apiClient, examId, created.booking_id)
        }
      }

      await invalidateBookings(queryClient)
    },
    ...mutationOptions(),
  })
}

export function useDeleteBookingEventMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookingId,
      examId,
      kind,
      recurringUuid,
    }: {
      bookingId: number
      examId?: number | null
      kind: 'series' | 'single' | 'stat-all' | 'stat-current'
      recurringUuid?: string | null
    }) => {
      if (kind === 'series' && recurringUuid) {
        await deleteRecurringBooking(apiClient, recurringUuid)
      } else if (kind === 'stat-current' && recurringUuid) {
        await deleteRecurringStatBookingsForCurrentOffice(apiClient, recurringUuid)
      } else if (kind === 'stat-all' && recurringUuid) {
        await deleteRecurringStatBookingsForAllOffices(apiClient, recurringUuid)
      } else {
        await deleteBooking(apiClient, bookingId)
      }

      if (examId) {
        await updateExamBooking(apiClient, examId, null)
      }

      await invalidateBookings(queryClient)
    },
    ...mutationOptions(),
  })
}

export function useCreateBookingBlackoutMutation() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (run: (apiClient: ReturnType<typeof useApiClient>) => Promise<void>) => {
      await run(apiClient)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      ])
    },
    ...mutationOptions(),
  })
}
