import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { finishCitizenService, getCsrStates, getCsrs } from '@/api/endpoints'
import type { Citizen, Office } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import Button from '@/components/Button'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { queryKeys } from '@/query/query-keys'

import {
  buildGaPanelRows,
  getServingCsrCount,
  type GaPanelRow,
} from './ga-panel-utils'
import {
  getHoldCitizens,
  getWaitingCitizens,
  isReceptionOffice,
} from './queue-utils'

interface GaPanelProps {
  citizens: Citizen[]
  isOpen: boolean
  office: Office
  onClose: () => void
}

export default function GaPanel({
  citizens,
  isOpen,
  office,
  onClose,
}: GaPanelProps) {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const csrsQuery = useQuery({
    enabled: isOpen,
    queryFn: ({ signal }) => getCsrs(apiClient, signal),
    queryKey: queryKeys.csrs.all,
  })
  const csrStatesQuery = useQuery({
    enabled: isOpen,
    queryFn: ({ signal }) => getCsrStates(apiClient, signal),
    queryKey: queryKeys.csrStates,
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const interval = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(interval)
  }, [isOpen])

  const rows = useMemo(
    () =>
      buildGaPanelRows({
        citizens,
        csrs: csrsQuery.data ?? [],
        csrStates: csrStatesQuery.data ?? [],
        now,
      }),
    [citizens, csrsQuery.data, csrStatesQuery.data, now],
  )
  const reception = isReceptionOffice(office)
  const queueCount = reception
    ? getWaitingCitizens(citizens).length
    : getHoldCitizens(citizens).length

  if (!isOpen) {
    return null
  }

  async function handleEndService(row: GaPanelRow) {
    if (!row.citizen) {
      return
    }

    setErrorMessage(null)

    try {
      await finishCitizenService(apiClient, row.citizen.citizen_id, true)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.citizens }),
        queryClient.invalidateQueries({ queryKey: queryKeys.csrs.all }),
      ])
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to end service.'))
    }
  }

  return (
    <Modal
      className="max-w-6xl overflow-hidden"
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <Dialog className="p-0">
        <div className="border-bc-border bg-bc-light-gray flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-bc-h4 text-bc-secondary m-0 font-bold">
            GA Panel
          </h2>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryItem
              label={reception ? 'Citizens Waiting' : 'Citizens on Hold'}
              value={queueCount}
            />
            <SummaryItem
              label="Total CSRs"
              value={csrsQuery.data?.length ?? 0}
            />
            <SummaryItem
              label="Serving CSRs"
              value={getServingCsrCount(citizens)}
            />
          </div>

          {errorMessage && (
            <p
              className="bg-bc-danger-surface text-bc-danger border-bc-danger m-0 border-l-4 px-3 py-2"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {csrsQuery.isPending || csrStatesQuery.isPending ? (
            <p className="text-bc-secondary m-0" role="status">
              Loading GA panel...
            </p>
          ) : csrsQuery.isError || csrStatesQuery.isError ? (
            <p
              className="bg-bc-danger-surface text-bc-danger border-bc-danger m-0 border-l-4 px-3 py-2"
              role="alert"
            >
              Unable to load GA panel.
            </p>
          ) : (
            <div className="border-bc-border max-h-[65vh] overflow-auto border">
              <table
                aria-label="GA panel staff"
                className="text-bc-small w-full min-w-5xl border-collapse"
              >
                <thead className="bg-bc-light-gray">
                  <tr>
                    <ColumnHeader>Staff Member</ColumnHeader>
                    <ColumnHeader>Service</ColumnHeader>
                    <ColumnHeader>Wait Time</ColumnHeader>
                    <ColumnHeader>Serving Time</ColumnHeader>
                    <ColumnHeader>Comments</ColumnHeader>
                    <ColumnHeader>Status</ColumnHeader>
                    <ColumnHeader>End Service</ColumnHeader>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="text-bc-secondary px-3 py-4" colSpan={7}>
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        className="even:bg-bc-light-gray/45"
                        key={row.csr.csr_id}
                      >
                        <TableCell>{row.csr.username}</TableCell>
                        <TableCell>{row.serviceName}</TableCell>
                        <TableCell>{row.waitTime}</TableCell>
                        <TableCell>{row.servingTime}</TableCell>
                        <TableCell>
                          {row.citizen?.citizen_comments ?? ''}
                        </TableCell>
                        <TableCell>{getStatusLabel(row.status)}</TableCell>
                        <TableCell>
                          {row.citizen && (
                            <Button
                              onClick={() => void handleEndService(row)}
                              size="small"
                              variant="secondary"
                            >
                              End Service
                            </Button>
                          )}
                        </TableCell>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Dialog>
    </Modal>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-bc-border bg-bc-light-gray rounded-sm border px-4 py-3 text-center">
      <p className="text-bc-small text-bc-secondary m-0 font-bold">{label}</p>
      <p className="text-bc-h4 m-0 font-bold">{value}</p>
    </div>
  )
}

function ColumnHeader({ children }: { children: string }) {
  return (
    <th className="border-bc-border text-bc-primary border-b px-3 py-2 text-left align-bottom font-bold">
      {children}
    </th>
  )
}

function TableCell({ children }: { children?: ReactNode }) {
  return (
    <td className="border-bc-border text-bc-primary border-b px-3 py-2 align-top">
      {children}
    </td>
  )
}

function getStatusLabel(status: GaPanelRow['status']) {
  switch (status) {
    case 'active':
      return 'Active'
    case 'break':
      return 'Break'
    case 'inactive':
      return 'Inactive'
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export { GaPanel }
