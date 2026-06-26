/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'

import { getAppointments, getServices } from '@/api/endpoints'
import type { Appointment, Office, Service } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { DialogTitle } from '@/components/Dialog'
import ModalLayout from '@/components/ModalLayout'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import { getServiceName } from './appointment-utils'
import { utcToOfficeDate } from '@/lib/datetime'
import { useCheckInAppointmentMutation } from './appointment-mutations'

const emptyServices: never[] = []
const emptyAppointments: never[] = []

interface AgendaPanelProps {
  isOpen: boolean
  office: Office
  onClose: () => void
}

export default function AgendaPanel({
  isOpen,
  office,
  onClose,
}: AgendaPanelProps) {
  const apiClient = useApiClient()
  const activeCitizenId = useWorkflowStore((state) => state.activeCitizenId)
  const showServiceModal = useWorkflowStore((state) => state.showServiceModal)
  const setGlobalAlert = useWorkflowStore((state) => state.setGlobalAlert)
  const [search, setSearch] = useState('')
  const [loadingAppointmentId, setLoadingAppointmentId] = useState<
    number | null
  >(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const checkInMutation = useCheckInAppointmentMutation()

  const appointmentsQuery = useQuery({
    queryFn: ({ signal }) => getAppointments(apiClient, signal),
    queryKey: queryKeys.appointments.office(office.office_id),
    refetchInterval: 15 * 60 * 1000,
  })
  const servicesQuery = useQuery({
    queryFn: ({ signal }) => getServices(apiClient, office.office_id, signal),
    queryKey: queryKeys.services(office.office_id),
  })
  const services = servicesQuery.data ?? emptyServices
  const agendaError = appointmentsQuery.isError
    ? getErrorMessage(appointmentsQuery.error, 'Unable to load agenda.')
    : servicesQuery.isError
      ? getErrorMessage(
          servicesQuery.error,
          'Unable to load appointment services.',
        )
      : null
  const rows = useMemo(
    () =>
      buildAgendaRows({
        appointments: appointmentsQuery.data ?? emptyAppointments,
        officeTimezone: office.timezone.timezone_name,
        search,
        services,
      }),
    [appointmentsQuery.data, office.timezone.timezone_name, search, services],
  )

  async function handleCheckIn(appointment: Appointment) {
    if (activeCitizenId || showServiceModal) {
      setGlobalAlert({
        id: 'agenda-active-service',
        message:
          'Already have appointment in progress.  Please close ticket then check-in citizen',
        role: 'alert',
        variant: 'warning',
      })
      return
    }

    setLoadingAppointmentId(appointment.appointment_id)
    setErrorMessage(null)

    try {
      await checkInMutation.mutateAsync({
        appointment,
        beginService: false,
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to check in appointment.'))
    } finally {
      setLoadingAppointmentId(null)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <ModalLayout
      className="max-w-6xl"
      header={
        <DialogTitle className="text-bc-h4 m-0 font-bold">Agenda</DialogTitle>
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-6">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="font-bold" htmlFor="agenda-search">
            Filter Appointments
          </label>
          <input
            className="border-bc-border rounded-sm border px-3 py-2"
            id="agenda-search"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
          {search && (
            <Button
              onClick={() => setSearch('')}
              size="small"
              variant="secondary"
            >
              Clear
            </Button>
          )}
        </form>
        {errorMessage && (
          <AlertBanner
            isCloseable={false}
            role="alert"
            size="small"
            variant="danger"
          >
            {errorMessage}
          </AlertBanner>
        )}
        {agendaError && (
          <AlertBanner
            isCloseable={false}
            role="alert"
            size="small"
            variant="danger"
          >
            {agendaError}
          </AlertBanner>
        )}
        {appointmentsQuery.isPending || servicesQuery.isPending ? (
          <p className="text-bc-secondary m-0" role="status">
            Loading agenda...
          </p>
        ) : agendaError ? null : (
          <div className="border-bc-border max-h-[65vh] overflow-auto border bg-white">
            <table
              className="text-bc-small w-full min-w-lg border-collapse"
              aria-label="Agenda appointments"
            >
              <thead className="bg-bc-light-gray">
                <tr>
                  <ColumnHeader>Time</ColumnHeader>
                  <ColumnHeader>Citizen Name</ColumnHeader>
                  <ColumnHeader>Service</ColumnHeader>
                  <ColumnHeader>Comments</ColumnHeader>
                  <ColumnHeader>Check-In</ColumnHeader>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="text-bc-secondary px-3 py-4" colSpan={5}>
                      No appointments found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      className="even:bg-bc-light-gray/45"
                      key={row.appointment.appointment_id}
                    >
                      <TableCell>{format(row.start, 'p')}</TableCell>
                      <TableCell>{row.appointment.citizen_name}</TableCell>
                      <TableCell>{row.serviceName}</TableCell>
                      <TableCell>
                        <span
                          className="block max-w-56 truncate"
                          title={row.appointment.comments ?? ''}
                        >
                          {row.appointment.comments}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          disabled={
                            loadingAppointmentId ===
                            row.appointment.appointment_id
                          }
                          onClick={() => void handleCheckIn(row.appointment)}
                          size="small"
                        >
                          {loadingAppointmentId ===
                          row.appointment.appointment_id
                            ? 'Checking In'
                            : 'Check-In'}
                        </Button>
                      </TableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalLayout>
  )
}

export function buildAgendaRows({
  appointments,
  officeTimezone,
  search,
  services,
}: {
  appointments: Appointment[]
  officeTimezone: string
  search: string
  services: Service[]
}) {
  const pastCutoff = new Date(Date.now() - 60 * 60 * 1000)
  const futureCutoff = new Date(Date.now() + 4 * 60 * 60 * 1000)
  const term = search.trim().toLowerCase()

  return appointments
    .filter((appointment) => {
      const start = new Date(appointment.start_time)

      return (
        !appointment.checked_in_time &&
        !appointment.is_draft &&
        appointment.blackout_flag !== 'Y' &&
        start >= pastCutoff &&
        start <= futureCutoff
      )
    })
    .map((appointment) => ({
      appointment,
      serviceName: getServiceName(appointment, services),
      start: utcToOfficeDate(
        appointment.start_time,
        appointment.office.timezone.timezone_name || officeTimezone,
      ),
    }))
    .filter((row) => {
      if (!term) {
        return true
      }

      return [
        row.appointment.start_time,
        row.appointment.citizen_name,
        row.serviceName,
        row.appointment.contact_information,
        row.appointment.comments,
      ].some((value) => value?.toLowerCase().includes(term))
    })
    .sort((left, right) => left.start.getTime() - right.start.getTime())
}

function ColumnHeader({ children }: { children: string }) {
  return (
    <th className="border-bc-border border-b px-3 py-2 text-left font-bold">
      {children}
    </th>
  )
}

function TableCell({ children }: { children?: ReactNode }) {
  return <td className="border-bc-border border-b px-3 py-2">{children}</td>
}
