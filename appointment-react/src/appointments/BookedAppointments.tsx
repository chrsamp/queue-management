import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'

import { createUser, deleteAppointment, getAppointments } from '@/api/endpoints'
import type { Appointment } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import ContactPreferencesAlert from '@/account/ContactPreferencesAlert'
import { utcIsoToApiDateKey } from '@/booking/booking-datetime'
import { getServiceDisplayName } from '@/booking/booking-utils'
import OfficeMap from '@/booking/OfficeMap'
import { RequestError } from '@/booking/BookingStepLayout'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import Dialog, { DialogTitle } from '@/components/Dialog'
import LoadingIndicator from '@/components/LoadingIndicator'
import Modal from '@/components/Modal'
import type { RuntimeConfig } from '@/config/runtime-config'
import { queryKeys } from '@/query/query-keys'
import { useBookingStore } from '@/store/booking-store'

export default function BookedAppointments({
  config,
}: {
  config: RuntimeConfig
}) {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const startNewBooking = useBookingStore((state) => state.startNewBooking)
  const startAppointmentEdit = useBookingStore(
    (state) => state.startAppointmentEdit,
  )
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const appointmentsQuery = useQuery({
    queryFn: ({ signal }) => getAppointments(apiClient, signal),
    queryKey: queryKeys.appointments,
  })
  const userQuery = useQuery({
    queryFn: ({ signal }) => createUser(apiClient, signal),
    queryKey: queryKeys.users.me,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const user = userQuery.data?.[0] ?? null

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: number) =>
      deleteAppointment(apiClient, appointmentId),
    onError: () => {
      setCancelError('Unable to cancel this appointment. Please try again.')
    },
    onSuccess: async () => {
      setAppointmentToCancel(null)
      setCancelError(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.appointments })
    },
  })

  function bookNewAppointment() {
    startNewBooking()
    void navigate('/appointment')
  }

  function changeAppointment(appointment: Appointment) {
    const office = appointment.office
    if (
      !office ||
      appointment.service_id == null ||
      !appointment.start_time ||
      !appointment.end_time
    ) {
      return
    }
    startAppointmentEdit({
      appointmentId: appointment.appointment_id,
      officeId: office.office_id,
      serviceId: appointment.service_id,
      slot: {
        dateKey: utcIsoToApiDateKey(
          appointment.start_time,
          office.timezone.timezone_name,
        ),
        endTime: appointment.end_time,
        startTime: appointment.start_time,
      },
    })
    void navigate('/appointment')
  }

  const loading = appointmentsQuery.isPending || userQuery.isPending
  const failed = appointmentsQuery.isError || userQuery.isError
  const appointments = appointmentsQuery.data?.appointments ?? []

  return (
    <section aria-labelledby="appointments-heading">
      {user && <ContactPreferencesAlert config={config} user={user} />}
      <div className="border-bc-border mb-6 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-bc-h3 m-0" id="appointments-heading">
          My Appointments
        </h2>
        <Button onClick={bookNewAppointment} size="large">
          <CalendarPlus aria-hidden="true" className="size-5" />
          Book a New Appointment
        </Button>
      </div>

      {loading && <LoadingIndicator label="Loading appointments" />}
      {failed && (
        <RequestError
          message="Unable to load your appointments."
          onRetry={() => {
            void appointmentsQuery.refetch()
            void userQuery.refetch()
          }}
        />
      )}
      {!loading && !failed && appointments.length === 0 && (
        <AlertBanner isCloseable={false} variant="black">
          No appointments found!
        </AlertBanner>
      )}
      {!loading && !failed && appointments.length > 0 && (
        <div className="flex flex-col gap-5">
          {appointments.map((appointment) => (
            <AppointmentCard
              appointment={appointment}
              key={appointment.appointment_id}
              onCancel={() => {
                setCancelError(null)
                setAppointmentToCancel(appointment)
              }}
              onChange={() => changeAppointment(appointment)}
            />
          ))}
        </div>
      )}

      {appointmentToCancel && (
        <Modal
          isDismissable={!cancelMutation.isPending}
          isOpen
          onOpenChange={(open) => {
            if (!open && !cancelMutation.isPending) {
              setAppointmentToCancel(null)
              setCancelError(null)
            }
          }}
        >
          <Dialog isCloseable={!cancelMutation.isPending}>
            <DialogTitle className="text-bc-h4 mt-0">Are you sure?</DialogTitle>
            <p>Are you sure that you want to cancel this appointment?</p>
            {cancelError && (
              <p className="text-bc-danger" role="alert">
                {cancelError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <Button
                disabled={cancelMutation.isPending}
                onClick={() => setAppointmentToCancel(null)}
                variant="secondary"
              >
                No
              </Button>
              <Button
                danger
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate(appointmentToCancel.appointment_id)
                }
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel it'}
              </Button>
            </div>
          </Dialog>
        </Modal>
      )}
    </section>
  )
}

function AppointmentCard({
  appointment,
  onCancel,
  onChange,
}: {
  appointment: Appointment
  onCancel: () => void
  onChange: () => void
}) {
  const office = appointment.office
  const service = appointment.service
  const timezone = office?.timezone.timezone_name
  const canChange = Boolean(
    office &&
    appointment.service_id != null &&
    appointment.start_time &&
    appointment.end_time,
  )
  const date =
    appointment.start_time && timezone
      ? new Intl.DateTimeFormat('en-CA', {
          day: '2-digit',
          month: 'short',
          timeZone: timezone,
          year: 'numeric',
        }).format(new Date(appointment.start_time))
      : 'Unavailable'
  const time =
    appointment.start_time && appointment.end_time && timezone
      ? `${formatTime(appointment.start_time, timezone)} – ${formatTime(
          appointment.end_time,
          timezone,
        )}`
      : 'Unavailable'

  return (
    <article className="border-bc-border overflow-hidden border bg-white">
      <div className="grid md:grid-cols-[minmax(18rem,5fr)_4fr_3fr]">
        <div className="border-bc-border min-h-60 border-b md:border-r md:border-b-0">
          {office ? (
            <OfficeMap office={office} />
          ) : (
            <div className="bg-bc-light-gray text-bc-secondary flex h-full min-h-60 items-center justify-center p-4">
              A map is not available for this location.
            </div>
          )}
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] content-center gap-x-2 gap-y-3 p-5">
          <dt className="font-bold">Service:</dt>
          <dd className="m-0">
            {service ? getServiceDisplayName(service) : 'Unavailable'}
          </dd>
          <dt className="font-bold">Location:</dt>
          <dd className="m-0">{office?.office_name ?? 'Unavailable'}</dd>
          <dt className="font-bold">Date:</dt>
          <dd className="m-0">{date}</dd>
          <dt className="font-bold">Time:</dt>
          <dd className="m-0">{time}</dd>
          <dt className="sr-only">Status:</dt>
          <dd className="text-bc-success col-span-2 m-0 font-bold">
            Appointment Confirmed
          </dd>
        </dl>
        <div className="flex flex-col justify-center gap-3 p-5">
          <Button disabled={!canChange} onClick={onChange} variant="secondary">
            <Pencil aria-hidden="true" className="size-4" />
            Change Appointment
          </Button>
          <Button danger onClick={onCancel} variant="secondary">
            <Trash2 aria-hidden="true" className="size-4" />
            Cancel Appointment
          </Button>
        </div>
      </div>
    </article>
  )
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value))
}
