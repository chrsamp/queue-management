import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Key } from 'react-aria-components'

import type { CsrMe } from '@/api/schemas'
import { updateCsr } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'
import { isReceptionOffice } from '@/queue/queue-utils'
import { useWorkflowStore } from '@/store/workflow-store'

import Select, { type SelectItem } from './Select'

const receptionistKey = 'receptionist'

interface CounterSelectItem extends SelectItem {
  counterId: number | null
}

interface CounterStateSnapshot {
  counterId: number | null
  receptionist: boolean | null
}

interface UpdateCounterVariables {
  counterId: number | null
  receptionist: boolean
}

export default function CounterSwitcher() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const currentCounterId = useWorkflowStore((state) => state.currentCounterId)
  const currentCsrId = useWorkflowStore((state) => state.currentCsrId)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const currentReceptionist = useWorkflowStore(
    (state) => state.currentReceptionist,
  )
  const setCounterReceptionistState = useWorkflowStore(
    (state) => state.setCounterReceptionistState,
  )
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)

  const counterItems = useMemo<CounterSelectItem[]>(() => {
    if (!currentOffice) {
      return []
    }

    return [
      {
        counterId: null,
        id: receptionistKey,
        label: 'Receptionist',
      },
      ...currentOffice.counters.map((counter) => ({
        counterId: counter.counter_id,
        id: counter.counter_id,
        label: counter.counter_name,
      })),
    ]
  }, [currentOffice])

  const updateCounterMutation = useMutation<
    Awaited<ReturnType<typeof updateCsr>>,
    Error,
    UpdateCounterVariables,
    CounterStateSnapshot
  >({
    mutationFn: ({ counterId, receptionist }) => {
      if (currentCsrId === null) {
        throw new Error('Cannot update counter before CSR profile loads')
      }

      return updateCsr(apiClient, currentCsrId, {
        counter_id: counterId,
        receptionist_ind: receptionist ? 1 : 0,
      })
    },
    onError: (_error, _variables, previous) => {
      if (previous) {
        setCounterReceptionistState(previous.counterId, previous.receptionist)
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me })
    },
    onMutate: async ({ counterId, receptionist }) => {
      const previous: CounterStateSnapshot = {
        counterId: useWorkflowStore.getState().currentCounterId,
        receptionist: useWorkflowStore.getState().currentReceptionist,
      }

      setCounterReceptionistState(counterId, receptionist)

      return previous
    },
    onSuccess: (response) => {
      setCurrentCsr(response.csr)
      queryClient.setQueryData<CsrMe>(queryKeys.csrs.me, (current) =>
        current ? { ...current, csr: response.csr } : current,
      )
    },
  })

  if (
    currentCsrId === null ||
    !currentOffice ||
    currentReceptionist === null ||
    !isReceptionOffice(currentOffice)
  ) {
    return null
  }

  const selectedKey = currentReceptionist
    ? receptionistKey
    : (currentCounterId ?? null)

  function handleSelectionChange(key: Key | null) {
    if (key === null || updateCounterMutation.isPending) {
      return
    }

    if (key === receptionistKey) {
      updateCounterMutation.mutate({
        counterId: useWorkflowStore.getState().currentCounterId,
        receptionist: true,
      })
      return
    }

    updateCounterMutation.mutate({
      counterId: Number(key),
      receptionist: false,
    })
  }

  return (
    <Select
      aria-label="Counter"
      className="w-44"
      isDisabled={updateCounterMutation.isPending}
      items={counterItems}
      onSelectionChange={handleSelectionChange}
      placeholder="Select counter"
      selectedKey={selectedKey}
      size="small"
    />
  )
}

export { CounterSwitcher }
