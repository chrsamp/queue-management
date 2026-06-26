import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getCsrStates, updateCsr } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import type { CsrMe, CsrState } from '@/api/schemas'
import { queryKeys } from '@/query/query-keys'
import { isCsrOnBreak, useWorkflowStore } from '@/store/workflow-store'

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
  const switchContainerRef = useRef<HTMLSpanElement>(null)

  const csrStatesQuery = useQuery({
    enabled: currentCsrId !== null && currentCsrState !== null,
    queryFn: ({ signal }) => getCsrStates(apiClient, signal),
    queryKey: queryKeys.csrStates,
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

      void queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me })
    },
    onMutate: ({ targetState }) => {
      setCurrentCsrState(targetState)
    },
    onSuccess: (response, variables) => {
      setCurrentCsrState(response.csr.csr_state ?? variables.targetState)
      queryClient.setQueryData<CsrMe>(queryKeys.csrs.me, (current) =>
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

      updateCsrState(targetState)
    },
    [breakState, loginState, updateCsrState],
  )

  const isOnBreak = isCsrOnBreak(currentCsrState)

  useEffect(() => {
    if (!isOnBreak || !loginState) {
      return
    }

    const handleBodyClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        switchContainerRef.current?.contains(event.target)
      ) {
        return
      }

      updateCsrState(loginState)
    }

    document.body.addEventListener('click', handleBodyClick)

    return () => {
      document.body.removeEventListener('click', handleBodyClick)
    }
  }, [isOnBreak, loginState, updateCsrState])

  if (currentCsrId === null || !currentCsrState || !loginState || !breakState) {
    return null
  }

  return (
    <span ref={switchContainerRef}>
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
    </span>
  )
}

export { CsrStatusSwitch }
