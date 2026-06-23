import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getCsrStates, updateCsr } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import type { CsrMe, CsrState } from '@/api/schemas'
import { useWorkflowStore } from '@/store/workflow-store'

import Switch from './Switch'

interface UpdateCsrStateVariables {
  previousState: CsrState | null
  targetState: CsrState
}

export default function CsrStatusSwitch() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const currentCsrId = useWorkflowStore((state) => state.currentCsrId)
  const currentCsrState = useWorkflowStore((state) => state.currentCsrState)
  const setCurrentCsrState = useWorkflowStore(
    (state) => state.setCurrentCsrState,
  )
  const skipNextBodyClick = useRef(false)

  const csrStatesQuery = useQuery({
    enabled: currentCsrId !== null && currentCsrState !== null,
    queryFn: ({ signal }) => getCsrStates(apiClient, signal),
    queryKey: ['csr-states'],
    staleTime: Infinity,
  })

  const loginState = csrStatesQuery.data?.find(
    (state) => state.csr_state_name === 'Login',
  )
  const breakState = csrStatesQuery.data?.find(
    (state) => state.csr_state_name === 'Break',
  )

  const updateStateMutation = useMutation({
    mutationFn: ({ targetState }: UpdateCsrStateVariables) => {
      if (currentCsrId === null) {
        throw new Error('Cannot update CSR state before CSR profile loads')
      }

      return updateCsr(apiClient, currentCsrId, {
        csr_state_id: targetState.csr_state_id,
      })
    },
    onError: (_error, variables) => {
      if (variables.previousState) {
        setCurrentCsrState(variables.previousState)
      }

      void queryClient.invalidateQueries({ queryKey: ['csrs', 'me'] })
    },
    onMutate: ({ targetState }) => {
      setCurrentCsrState(targetState)
    },
    onSuccess: (response, variables) => {
      setCurrentCsrState(response.csr.csr_state ?? variables.targetState)
      queryClient.setQueryData<CsrMe>(['csrs', 'me'], (current) =>
        current ? { ...current, csr: response.csr } : current,
      )
    },
  })

  const updateCsrState = useCallback(
    (targetState: CsrState) => {
      if (updateStateMutation.isPending) {
        return
      }

      updateStateMutation.mutate({
        previousState: useWorkflowStore.getState().currentCsrState,
        targetState,
      })
    },
    [updateStateMutation],
  )

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      const targetState = checked ? loginState : breakState

      if (!targetState) {
        return
      }

      skipNextBodyClick.current = checked
      updateCsrState(targetState)
    },
    [breakState, loginState, updateCsrState],
  )

  const isOnBreak = currentCsrState?.csr_state_name === 'Break'

  useEffect(() => {
    if (!isOnBreak || !loginState) {
      return
    }

    const handleBodyClick = () => {
      if (skipNextBodyClick.current) {
        skipNextBodyClick.current = false
        return
      }

      updateCsrState(loginState)
    }

    const timeoutId = window.setTimeout(() => {
      document.body.addEventListener('click', handleBodyClick)
    }, 100)

    return () => {
      window.clearTimeout(timeoutId)
      document.body.removeEventListener('click', handleBodyClick)
    }
  }, [isOnBreak, loginState, updateCsrState])

  if (currentCsrId === null || !currentCsrState || !loginState || !breakState) {
    return null
  }

  return (
    <Switch
      aria-label="CSR status"
      checked={!isOnBreak}
      className="items-center"
      disabled={updateStateMutation.isPending}
      onChange={handleSwitchChange}
    >
      <span className="min-w-16 text-left">
        {isOnBreak ? 'On Break' : 'Active'}
      </span>
    </Switch>
  )
}

export { CsrStatusSwitch }
