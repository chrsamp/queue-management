import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Key } from 'react-aria-components'

import type { CsrMe, Office } from '@/api/schemas'
import { getOffices, updateCsr } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { useWorkflowStore } from '@/store/workflow-store'

import Select, { type SelectItem } from './Select'

interface OfficeSelectItem extends SelectItem {
  office: Office
}

function getOfficeDescription(office: Office) {
  return `Office #${office.office_number}`
}


export default function OfficeSwitcher() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const currentCsrId = useWorkflowStore((state) => state.currentCsrId)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)
  const setGlobalAlert = useWorkflowStore((state) => state.setGlobalAlert)
  const clearGlobalAlert = useWorkflowStore((state) => state.clearGlobalAlert)
  const resetDismissedGlobalAlert = useWorkflowStore(
    (state) => state.resetDismissedGlobalAlert,
  )

  const officesQuery = useQuery({
    enabled: currentCsrId !== null,
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })

  const officeItems = useMemo<OfficeSelectItem[]>(() => {
    const offices =
      officesQuery.data?.some(
        (office) => office.office_id === currentOffice?.office_id,
      ) || !currentOffice
        ? (officesQuery.data ?? [])
        : [currentOffice, ...(officesQuery.data ?? [])]

    return offices.map((office) => ({
      description: getOfficeDescription(office),
      id: office.office_id,
      label: office.office_name,
      office,
      textValue: `${office.office_name} ${office.office_number}`,
    }))
  }, [currentOffice, officesQuery.data])

  const updateOfficeMutation = useMutation({
    mutationFn: (office: Office) => {
      if (currentCsrId === null) {
        throw new Error('Cannot update office before CSR profile loads')
      }

      return updateCsr(apiClient, currentCsrId, {
        office_id: office.office_id,
      })
    },
    onSuccess: (response) => {
      setCurrentCsr(response.csr)
      queryClient.setQueryData<CsrMe>(queryKeys.csrs.me, (current) =>
        current ? { ...current, csr: response.csr } : current,
      )
      void queryClient.invalidateQueries({
        predicate: (query) =>
          !(
            query.queryKey[0] === 'csrs' ||
            query.queryKey[0] === 'offices' ||
            query.queryKey[0] === 'csr-states'
          ),
      })
      clearGlobalAlert('office-switcher')
      resetDismissedGlobalAlert('office-switcher')
    },
    onError: (error) => {
      setGlobalAlert({
        id: 'office-switcher',
        message: getErrorMessage(error, 'Unable to change offices. Please try again.'),
        role: 'alert',
        variant: 'danger',
      })
    },
  })

  if (currentCsrId === null || !currentOffice) {
    return null
  }

  const currentOfficeId = currentOffice.office_id

  function handleSelectionChange(key: Key | null) {
    if (key === null || updateOfficeMutation.isPending) {
      return
    }

    const selectedOffice =
      officeItems.find((item) => item.office.office_id === Number(key))
        ?.office ?? null

    if (!selectedOffice || selectedOffice.office_id === currentOfficeId) {
      return
    }

    updateOfficeMutation.mutate(selectedOffice)
  }

  return (
    <Select
      aria-label="Office"
      className="w-56"
      description={
        officesQuery.isLoading
          ? 'Loading offices...'
          : updateOfficeMutation.isPending
            ? 'Saving office...'
            : undefined
      }
      errorMessage={
        officesQuery.isError ? getErrorMessage(officesQuery.error, 'Unable to change offices. Please try again.') : ''
      }
      isDisabled={officesQuery.isLoading || updateOfficeMutation.isPending}
      isInvalid={officesQuery.isError}
      items={officeItems}
      onSelectionChange={handleSelectionChange}
      placeholder="Select an office"
      renderEmptyState={() => (
        <div className="text-bc-body text-bc-secondary p-3">
          No offices match your search.
        </div>
      )}
      searchable
      searchLabel="Search offices"
      searchPlaceholder="Search by office name or number"
      selectedKey={currentOfficeId}
      size="small"
    />
  )
}

export { OfficeSwitcher }
