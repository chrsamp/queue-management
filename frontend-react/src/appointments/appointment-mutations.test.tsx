import { act, renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { deleteAppointment } from '@/api/endpoints'
import { queryKeys } from '@/query/query-keys'
import { createMutationTestWrapper } from '@/test/mutation-test-utils'

import { useDeleteAppointmentMutation } from './appointment-mutations'

vi.mock('@/api/endpoints', () => ({
  addCitizenToQueue: vi.fn(),
  beginCitizenService: vi.fn(),
  createAppointment: vi.fn(),
  createBooking: vi.fn(),
  createDraftAppointment: vi.fn(),
  createServiceRequest: vi.fn(),
  deleteAllStatAppointments: vi.fn(),
  deleteAppointment: vi.fn(),
  deleteDraftAppointment: vi.fn(),
  deleteRecurringAppointments: vi.fn(),
  deleteRecurringStatBookingsForAllOffices: vi.fn(),
  deleteRecurringStatBookingsForCurrentOffice: vi.fn(),
  getChannels: vi.fn(),
  getOffices: vi.fn(),
  getRooms: vi.fn(),
  updateAppointment: vi.fn(),
  updateCitizen: vi.fn(),
  updateRecurringAppointment: vi.fn(),
}))

describe('appointment mutations', () => {
  test('deletes a single appointment and invalidates appointments', async () => {
    vi.mocked(deleteAppointment).mockResolvedValue({})
    const { queryClient, Wrapper } = createMutationTestWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteAppointmentMutation(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ appointmentId: 44 })
    })

    expect(deleteAppointment).toHaveBeenCalledWith({}, 44)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.appointments.all,
    })
  })
})
