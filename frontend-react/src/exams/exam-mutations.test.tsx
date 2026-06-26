import { act, renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { refreshBcmpExamStatus } from '@/api/endpoints'
import { queryKeys } from '@/query/query-keys'
import { createMutationTestWrapper } from '@/test/mutation-test-utils'

import { useRefreshExamStatusMutation } from './exam-mutations'

vi.mock('@/api/endpoints', () => ({
  createBooking: vi.fn(),
  createExam: vi.fn(),
  deleteBooking: vi.fn(),
  deleteExam: vi.fn(),
  emailExamInvigilator: vi.fn(),
  refreshBcmpExamStatus: vi.fn(),
  requestBcmpExam: vi.fn(),
  updateBooking: vi.fn(),
  updateExam: vi.fn(),
  updateInvigilatorShadowCount: vi.fn(),
  uploadCompletedExamDocument: vi.fn(),
}))

describe('exam mutations', () => {
  test('refreshes BCMP status and invalidates exam dependencies', async () => {
    vi.mocked(refreshBcmpExamStatus).mockResolvedValue({})
    const { queryClient, Wrapper } = createMutationTestWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRefreshExamStatusMutation(101), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(refreshBcmpExamStatus).toHaveBeenCalledWith({})
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.exams.all,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.exams.office(101),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.bookings.all,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.csrs.me,
    })
  })
})
