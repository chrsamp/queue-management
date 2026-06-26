import { act, renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { inviteCitizen } from '@/api/endpoints'
import { queryKeys } from '@/query/query-keys'
import { createMutationTestWrapper } from '@/test/mutation-test-utils'

import { useInviteCitizenMutation } from './queue-mutations'

vi.mock('@/api/endpoints', () => ({
  activateServiceRequest: vi.fn(),
  addCitizen: vi.fn(),
  addCitizenToQueue: vi.fn(),
  beginCitizenService: vi.fn(),
  createServiceRequest: vi.fn(),
  finishCitizenService: vi.fn(),
  inviteCitizen: vi.fn(),
  inviteNextCitizen: vi.fn(),
  markCitizenLeft: vi.fn(),
  placeCitizenOnHold: vi.fn(),
  sendWalkinLineReminder: vi.fn(),
  updateCitizen: vi.fn(),
  updateServiceRequest: vi.fn(),
}))

describe('queue mutations', () => {
  test('invites a citizen and invalidates citizens', async () => {
    vi.mocked(inviteCitizen).mockResolvedValue({})
    const { queryClient, Wrapper } = createMutationTestWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useInviteCitizenMutation(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ citizenId: 10, counterId: 3 })
    })

    expect(inviteCitizen).toHaveBeenCalledWith({}, 10, 3)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.citizens,
    })
  })
})
