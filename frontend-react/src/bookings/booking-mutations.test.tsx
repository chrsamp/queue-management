import { act, renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { createBooking, updateExamBooking } from '@/api/endpoints'
import { queryKeys } from '@/query/query-keys'
import { createMutationTestWrapper } from '@/test/mutation-test-utils'

import { useSaveBookingEventMutation } from './booking-mutations'

vi.mock('@/api/endpoints', () => ({
  createBooking: vi.fn(),
  deleteBooking: vi.fn(),
  deleteRecurringBooking: vi.fn(),
  deleteRecurringStatBookingsForAllOffices: vi.fn(),
  deleteRecurringStatBookingsForCurrentOffice: vi.fn(),
  updateBooking: vi.fn(),
  updateExamBooking: vi.fn(),
  updateRecurringBooking: vi.fn(),
}))

describe('booking mutations', () => {
  test('creates an exam booking and invalidates related calendars', async () => {
    vi.mocked(createBooking).mockResolvedValue({
      booking_id: 88,
    } as Awaited<ReturnType<typeof createBooking>>)
    vi.mocked(updateExamBooking).mockResolvedValue(
      {} as Awaited<ReturnType<typeof updateExamBooking>>,
    )
    const { queryClient, Wrapper } = createMutationTestWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSaveBookingEventMutation(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({
        examId: 55,
        mode: 'create',
        payload: { booking_name: 'Exam' },
      })
    })

    expect(createBooking).toHaveBeenCalledWith({}, { booking_name: 'Exam' })
    expect(updateExamBooking).toHaveBeenCalledWith({}, 55, 88)
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
})
