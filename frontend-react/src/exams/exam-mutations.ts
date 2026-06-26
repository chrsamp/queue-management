import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createBooking,
  createExam,
  deleteBooking,
  deleteExam,
  emailExamInvigilator,
  refreshBcmpExamStatus,
  requestBcmpExam,
  updateBooking,
  updateExam,
  updateInvigilatorShadowCount,
  uploadCompletedExamDocument,
  type BookingPayload,
  type ExamPayload,
} from '@/api/endpoints'
import type { Exam } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'

function mutationOptions() {
  return { retry: false } as const
}

export function useInvalidateExams() {
  const queryClient = useQueryClient()

  return async (officeNumber: number | string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.exams.office(officeNumber),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me }),
    ])
  }
}

export function useRefreshExamStatusMutation(officeNumber: number | string) {
  const apiClient = useApiClient()
  const invalidateExams = useInvalidateExams()

  return useMutation({
    mutationFn: () => refreshBcmpExamStatus(apiClient),
    onSuccess: () => invalidateExams(officeNumber),
    ...mutationOptions(),
  })
}

export function useAddExamMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: async ({
      buildBookingPayload,
      emailInvigilator = false,
      payload,
      requestExam,
    }: {
      buildBookingPayload?: (exam: Exam) => BookingPayload | null
      emailInvigilator?: boolean
      payload: ExamPayload
      requestExam: boolean
    }) => {
      if (requestExam) {
        await requestBcmpExam(apiClient, payload)
        return
      }

      const exam = await createExam(apiClient, payload)
      const bookingPayload = buildBookingPayload?.(exam) ?? null

      if (!bookingPayload) {
        return
      }

      const booking = await createBooking(apiClient, bookingPayload)

      if (booking?.booking_id) {
        const updated = await updateExam(apiClient, exam.exam_id, {
          booking_id: booking.booking_id,
        })

        if (emailInvigilator && updated.invigilator) {
          await emailExamInvigilator(apiClient, updated.exam_id, {
            invigilator_email: updated.invigilator.contact_email,
            invigilator_id: updated.invigilator.invigilator_id,
            invigilator_name: updated.invigilator.invigilator_name,
            invigilator_phone: updated.invigilator.contact_phone,
          })
        }
      }
    },
    ...mutationOptions(),
  })
}

export function useUpdateExamMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: async ({
      deleteBookingId = null,
      examId,
      payload,
    }: {
      deleteBookingId?: number | null
      examId: number
      payload: ExamPayload
    }) => {
      if (deleteBookingId) {
        await deleteBooking(apiClient, deleteBookingId)
      }

      return updateExam(apiClient, examId, payload)
    },
    ...mutationOptions(),
  })
}

export function useDeleteExamMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: async (exam: Exam) => {
      await deleteExam(apiClient, exam.exam_id)
      if (exam.booking_id) {
        await deleteBooking(apiClient, exam.booking_id)
      }
    },
    ...mutationOptions(),
  })
}

export function useGroupBookingMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: async ({
      bookingId,
      bookingPayload,
      examId,
      examPayload,
      shadowInvigilatorId = null,
      updateShadowCount = false,
    }: {
      bookingId?: number | null
      bookingPayload: BookingPayload
      examId: number
      examPayload: ExamPayload
      shadowInvigilatorId?: number | null
      updateShadowCount?: boolean
    }) => {
      let nextBookingId = bookingId
      if (bookingId) {
        await updateBooking(apiClient, bookingId, bookingPayload)
      } else {
        const booking = await createBooking(apiClient, bookingPayload)
        nextBookingId = booking?.booking_id ?? null
      }

      await updateExam(apiClient, examId, {
        ...examPayload,
        booking_id: nextBookingId,
      })

      if (shadowInvigilatorId && updateShadowCount) {
        await updateInvigilatorShadowCount(apiClient, shadowInvigilatorId, {
          add: true,
          subtract: false,
        })
      }
    },
    ...mutationOptions(),
  })
}

export function useEmailExamInvigilatorMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: ({
      examId,
      invigilator,
    }: {
      examId: number
      invigilator: {
        contact_email?: string | null
        contact_phone?: string | null
        invigilator_id: number
        invigilator_name?: string | null
      }
    }) =>
      emailExamInvigilator(apiClient, examId, {
        invigilator_email: invigilator.contact_email,
        invigilator_id: invigilator.invigilator_id,
        invigilator_name: invigilator.invigilator_name,
        invigilator_phone: invigilator.contact_phone,
      }),
    ...mutationOptions(),
  })
}

export function useUploadPesticideExamMutation() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: async ({
      examId,
      file,
      payload,
    }: {
      examId: number
      file?: File | null
      payload: ExamPayload
    }) => {
      if (file) {
        await uploadCompletedExamDocument(apiClient, examId, file)
      }

      return updateExam(apiClient, examId, payload)
    },
    ...mutationOptions(),
  })
}
