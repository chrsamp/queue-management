import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Key } from 'react-aria-components'

import type { CsrMe, Office } from '@/api/schemas'
import { getOffices, updateCsr } from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import AlertBanner from './AlertBanner'
import Button from './Button'
import Dialog from './Dialog'
import Modal from './Modal'
import Select, { type SelectItem } from './Select'

interface OfficeSelectItem extends SelectItem {
  office: Office
}

function getOfficeDescription(office: Office) {
  return `Office #${office.office_number}`
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message
  }

  return 'Unable to change offices. Please try again.'
}

export default function OfficeSwitcher() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const currentCsrId = useWorkflowStore((state) => state.currentCsrId)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOfficeId, setSelectedOfficeId] = useState<Key | null>(
    currentOffice?.office_id ?? null,
  )

  const officesQuery = useQuery({
    enabled: currentCsrId !== null,
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })

  const officeItems = useMemo<OfficeSelectItem[]>(() => {
    return (officesQuery.data ?? []).map((office) => ({
      description: getOfficeDescription(office),
      id: office.office_id,
      label: office.office_name,
      office,
      textValue: `${office.office_name} ${office.office_number}`,
    }))
  }, [officesQuery.data])

  const selectedOffice = useMemo(
    () =>
      (officesQuery.data ?? []).find(
        (office) => office.office_id === selectedOfficeId,
      ) ?? null,
    [officesQuery.data, selectedOfficeId],
  )

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
      setIsOpen(false)
    },
  })

  if (currentCsrId === null || !currentOffice) {
    return null
  }

  const openModal = () => {
    setSelectedOfficeId(currentOffice.office_id)
    setIsOpen(true)
  }

  const isSameOffice = selectedOffice?.office_id === currentOffice.office_id
  const canSave =
    selectedOffice !== null && !isSameOffice && !updateOfficeMutation.isPending

  return (
    <>
      <Button
        aria-label={`Change office, current office ${currentOffice.office_name}`}
        className="h-auto min-h-0 justify-start p-0 text-left text-sm"
        onClick={openModal}
        size="small"
        variant="link"
      >
        {currentOffice.office_name}
      </Button>

      <Modal isDismissable isOpen={isOpen} onOpenChange={setIsOpen}>
        <Dialog aria-label="Change office">
          <div className="flex flex-col gap-5 pr-8">
            <div>
              <h2 className="text-bc-h4 mt-0 mb-2 font-bold">Change office</h2>
              <p className="text-bc-body text-bc-secondary m-0">
                Select the office you want to work from.
              </p>
            </div>

            <Select
              description={
                officesQuery.isLoading
                  ? 'Loading offices...'
                  : `${officeItems.length} office${
                      officeItems.length === 1 ? '' : 's'
                    } available`
              }
              isDisabled={officesQuery.isLoading}
              errorMessage={
                officesQuery.isError ? getErrorMessage(officesQuery.error) : ''
              }
              isInvalid={officesQuery.isError}
              items={officeItems}
              label="Office"
              onSelectionChange={setSelectedOfficeId}
              placeholder="Select an office"
              renderEmptyState={() => (
                <div className="text-bc-body text-bc-secondary p-3">
                  No offices match your search.
                </div>
              )}
              searchable
              searchLabel="Search offices"
              searchPlaceholder="Search by office name or number"
              selectedKey={selectedOfficeId}
            />

            {updateOfficeMutation.isError && (
              <AlertBanner
                isCloseable={false}
                layout="fluid"
                role="alert"
                size="small"
                variant="danger"
              >
                {getErrorMessage(updateOfficeMutation.error)}
              </AlertBanner>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                disabled={updateOfficeMutation.isPending}
                onClick={() => setIsOpen(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={!canSave}
                onClick={() => {
                  if (selectedOffice) {
                    updateOfficeMutation.mutate(selectedOffice)
                  }
                }}
              >
                {updateOfficeMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </>
  )
}

export { OfficeSwitcher }
