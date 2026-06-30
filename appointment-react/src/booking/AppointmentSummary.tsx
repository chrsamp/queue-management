import { useEffect, useMemo, useState, type RefObject } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import {
  createAppointment,
  createUser,
  deleteDraft,
  getAppointments,
  getOffices,
  getServices,
  updateAppointment,
  updateUser,
} from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import type { Appointment, PublicUser, UserUpdateRequest } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import { useAuth } from '@/auth/use-auth'
import { formatSelectedSlot } from '@/booking/booking-datetime'
import {
  getServiceDisplayName,
  getVisibleOffices,
  getVisibleServices,
} from '@/booking/booking-utils'
import { RequestError, StepHeader } from '@/booking/BookingStepLayout'
import OfficeMap from '@/booking/OfficeMap'
import TermsOfUseDialog from '@/booking/TermsOfUseDialog'
import Button from '@/components/Button'
import Checkbox from '@/components/Checkbox'
import Dialog, { DialogTitle } from '@/components/Dialog'
import LoadingIndicator from '@/components/LoadingIndicator'
import Modal from '@/components/Modal'
import Switch from '@/components/Switch'
import type { RuntimeConfig } from '@/config/runtime-config'
import { queryKeys } from '@/query/query-keys'
import { useBookingStore } from '@/store/booking-store'

interface ResultDialog {
  appointment: Appointment | null
  kind: 'success' | 'failure' | 'uncertain' | 'duplicate' | 'precondition'
  message: string
}

export default function AppointmentSummary({
  config,
  headingRef,
}: {
  config: RuntimeConfig
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const apiClient = useApiClient()
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const selectedOfficeId = useBookingStore((state) => state.selectedOfficeId)
  const selectedServiceId = useBookingStore((state) => state.selectedServiceId)
  const selectedSlot = useBookingStore((state) => state.selectedSlot)
  const draftAppointmentId = useBookingStore(
    (state) => state.draftAppointmentId,
  )
  const editAppointmentId = useBookingStore((state) => state.editAppointmentId)
  const setCurrentStep = useBookingStore((state) => state.setCurrentStep)
  const setDraftAppointmentId = useBookingStore(
    (state) => state.setDraftAppointmentId,
  )
  const clearBooking = useBookingStore((state) => state.clearBooking)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [emailReminder, setEmailReminder] = useState(false)
  const [smsReminder, setSmsReminder] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState<ResultDialog | null>(null)

  useEffect(() => {
    if (!auth.authenticated || !auth.authorized) setCurrentStep('login')
  }, [auth.authenticated, auth.authorized, setCurrentStep])

  const officesQuery = useQuery({
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })
  const servicesQuery = useQuery({
    enabled: selectedOfficeId !== null,
    queryFn: ({ signal }) => getServices(apiClient, selectedOfficeId!, signal),
    queryKey: queryKeys.services.office(selectedOfficeId ?? 0),
  })
  const userQuery = useQuery({
    enabled: auth.authenticated && auth.authorized,
    queryFn: ({ signal }) => createUser(apiClient, signal),
    queryKey: queryKeys.users.me,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const user = userQuery.data?.[0] ?? null
  const selectedOffice = getVisibleOffices(
    officesQuery.data?.offices ?? [],
  ).find((office) => office.office_id === selectedOfficeId)
  const selectedService = getVisibleServices(
    servicesQuery.data?.services ?? [],
  ).find((service) => service.service_id === selectedServiceId)
  const appointmentsQuery = useQuery({
    enabled: Boolean(user && selectedService?.is_dlkt),
    queryFn: ({ signal }) => getAppointments(apiClient, signal),
    queryKey: queryKeys.appointments,
  })
  const hasActiveKnowledgeTest = useMemo(
    () =>
      (appointmentsQuery.data?.appointments ?? []).some(
        (appointment) =>
          appointment.appointment_id !== editAppointmentId &&
          (appointment.service?.is_dlkt === true ||
            (appointment.service_id === selectedService?.service_id &&
              selectedService?.is_dlkt === true)),
      ),
    [
      appointmentsQuery.data,
      editAppointmentId,
      selectedService?.is_dlkt,
      selectedService?.service_id,
    ],
  )

  async function saveReminderPreferences(currentUser: PublicUser) {
    if (!emailReminder && !smsReminder) return currentUser
    const request: UserUpdateRequest = {
      email: currentUser.email ?? '',
      send_email_reminders:
        Boolean(currentUser.send_email_reminders) || emailReminder,
      send_sms_reminders:
        Boolean(currentUser.send_sms_reminders) || smsReminder,
      telephone: currentUser.telephone ?? '',
    }
    let response
    try {
      response = await updateUser(apiClient, currentUser.user_id, request)
    } catch {
      throw new ReminderUpdateError()
    }
    queryClient.setQueryData(queryKeys.users.me, response)
    return response[0] ?? currentUser
  }

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (
        !user ||
        !selectedOffice ||
        !selectedService ||
        !selectedSlot ||
        draftAppointmentId === null
      ) {
        throw new Error('The booking is incomplete')
      }

      await saveReminderPreferences(user)

      if (
        selectedService.is_dlkt &&
        editAppointmentId === null &&
        hasActiveKnowledgeTest
      ) {
        try {
          await deleteDraft(apiClient, draftAppointmentId)
        } catch {
          // Draft cleanup is best effort.
        }
        setDraftAppointmentId(null)
        throw new DuplicateKnowledgeTestError()
      }

      const request = {
        appointment_draft_id: draftAppointmentId,
        comments: '',
        end_time: selectedSlot.endTime,
        office_id: selectedOffice.office_id,
        service_id: selectedService.service_id,
        start_time: selectedSlot.startTime,
        user_id: user.user_id,
      }
      return editAppointmentId === null
        ? createAppointment(apiClient, request)
        : updateAppointment(apiClient, editAppointmentId, request)
    },
    onError: (error) => {
      if (error instanceof ReminderUpdateError) {
        setResultDialog({
          appointment: null,
          kind: 'precondition',
          message:
            'Unable to save your reminder preferences. Your appointment has not been submitted.',
        })
        return
      }
      setDraftAppointmentId(null)
      if (selectedOffice && selectedService) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.slots(
            selectedOffice.office_id,
            selectedService.service_id,
          ),
        })
      }
      if (error instanceof DuplicateKnowledgeTestError) {
        setResultDialog({
          appointment: null,
          kind: 'duplicate',
          message:
            'You already have an appointment scheduled for a Knowledge Test. To reschedule, visit My Appointments.',
        })
      } else if (
        error instanceof ApiError &&
        (error.kind === 'network' || error.kind === 'timeout')
      ) {
        setResultDialog({
          appointment: null,
          kind: 'uncertain',
          message:
            'We could not verify whether your appointment was booked. Check My Appointments before trying again.',
        })
      } else {
        setResultDialog({
          appointment: null,
          kind: 'failure',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to book the appointment.',
        })
      }
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments })
      setResultDialog({
        appointment: response.appointment,
        kind: 'success',
        message:
          'If you need to cancel or reschedule your appointment, please contact Service BC.',
      })
    },
  })

  const loading =
    officesQuery.isPending ||
    servicesQuery.isPending ||
    userQuery.isPending ||
    (selectedService?.is_dlkt === true && appointmentsQuery.isPending)
  const error =
    officesQuery.isError ||
    servicesQuery.isError ||
    userQuery.isError ||
    (selectedService?.is_dlkt === true && appointmentsQuery.isError)
  const complete = Boolean(
    selectedOffice &&
    selectedService &&
    selectedSlot &&
    draftAppointmentId !== null &&
    user,
  )

  return (
    <>
      <StepHeader
        headingRef={headingRef}
        onBack={() => setCurrentStep('date')}
        title="Appointment Summary"
      />
      <div className="p-4 sm:p-6">
        {loading && <LoadingIndicator label="Loading appointment summary" />}
        {error && (
          <RequestError
            message="Unable to load your appointment summary."
            onRetry={() => {
              void officesQuery.refetch()
              void servicesQuery.refetch()
              void userQuery.refetch()
            }}
          />
        )}
        {!loading && !error && !complete && (
          <RequestError
            message="Your reservation is incomplete. Please choose another time."
            onRetry={() => setCurrentStep('date')}
          />
        )}
        {!loading &&
          !error &&
          complete &&
          selectedOffice &&
          selectedService &&
          selectedSlot &&
          user && (
            <div className="mx-auto max-w-3xl">
              <div className="bg-bc-light-gray grid gap-5 p-5 sm:grid-cols-2">
                <SummaryItem
                  label="Reason for Appointment"
                  value={getServiceDisplayName(selectedService)}
                />
                <SummaryItem
                  label="Date of Appointment"
                  value={formatSelectedSlot(
                    selectedSlot,
                    selectedOffice.timezone.timezone_name,
                  )}
                />
                <SummaryItem
                  label="Location"
                  value={selectedOffice.office_name}
                />
                <SummaryItem
                  label="Telephone"
                  value={selectedOffice.telephone ?? ''}
                />
              </div>
              <div className="border-bc-border border-x">
                <OfficeMap office={selectedOffice} />
              </div>
              <div className="border-bc-border flex flex-col gap-4 border p-5">
                {user.email && !user.send_email_reminders && (
                  <Switch checked={emailReminder} onChange={setEmailReminder}>
                    Send me appointment reminders via email
                  </Switch>
                )}
                {!config.VITE_APPOINTMENT_DISABLE_SMS &&
                  user.telephone &&
                  !user.send_sms_reminders && (
                    <Switch checked={smsReminder} onChange={setSmsReminder}>
                      Send me appointment reminders via SMS text message
                    </Switch>
                  )}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Checkbox
                    isSelected={termsAccepted}
                    onChange={setTermsAccepted}
                  >
                    I agree to the Terms of Use
                  </Checkbox>
                  <Button onClick={() => setTermsOpen(true)} variant="link">
                    Read Terms of Use
                  </Button>
                </div>
                <Button
                  className="self-center"
                  disabled={!termsAccepted || confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate()}
                  size="large"
                >
                  {confirmMutation.isPending
                    ? 'Saving appointment...'
                    : editAppointmentId === null
                      ? 'Confirm Appointment'
                      : 'Update Appointment'}
                </Button>
              </div>
            </div>
          )}
      </div>
      <TermsOfUseDialog
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
      />
      {resultDialog && selectedOffice && selectedService && selectedSlot && (
        <ResultModal
          dialog={resultDialog}
          officeName={selectedOffice.office_name}
          onMyAppointments={() => {
            clearBooking()
            void navigate('/booked-appointments')
          }}
          onPickAnotherTime={() => {
            setResultDialog(null)
            setCurrentStep('date')
          }}
          onRetry={() => setResultDialog(null)}
          onSuccess={() => {
            clearBooking()
            void navigate('/booked-appointments')
          }}
          serviceName={getServiceDisplayName(selectedService)}
          time={formatSelectedSlot(
            selectedSlot,
            selectedOffice.timezone.timezone_name,
          )}
        />
      )}
    </>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-bc-small text-bc-secondary font-bold">{label}</div>
      <div>{value}</div>
    </div>
  )
}

function ResultModal({
  dialog,
  officeName,
  onMyAppointments,
  onPickAnotherTime,
  onRetry,
  onSuccess,
  serviceName,
  time,
}: {
  dialog: ResultDialog
  officeName: string
  onMyAppointments: () => void
  onPickAnotherTime: () => void
  onRetry: () => void
  onSuccess: () => void
  serviceName: string
  time: string
}) {
  const success = dialog.kind === 'success'
  return (
    <Modal isDismissable={false} isOpen>
      <Dialog isCloseable={false}>
        <DialogTitle className="text-bc-h4 mt-0">
          {success
            ? 'Success! Your appointment has been booked.'
            : 'Unable to complete your appointment'}
        </DialogTitle>
        <p role={success ? 'status' : 'alert'}>{dialog.message}</p>
        {success && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryItem label="Service" value={serviceName} />
            <SummaryItem label="Location" value={officeName} />
            <SummaryItem label="Time" value={time} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {success ? (
            <Button onClick={onSuccess}>OK</Button>
          ) : dialog.kind === 'precondition' ? (
            <Button onClick={onRetry}>Close</Button>
          ) : dialog.kind === 'failure' ? (
            <>
              <Button onClick={onMyAppointments} variant="secondary">
                My Appointments
              </Button>
              <Button onClick={onPickAnotherTime}>Pick another time</Button>
            </>
          ) : (
            <Button onClick={onMyAppointments}>My Appointments</Button>
          )}
        </div>
      </Dialog>
    </Modal>
  )
}

class DuplicateKnowledgeTestError extends Error {
  constructor() {
    super('A Knowledge Test appointment is already scheduled')
    this.name = 'DuplicateKnowledgeTestError'
  }
}

class ReminderUpdateError extends Error {
  constructor() {
    super('Reminder preferences could not be saved')
    this.name = 'ReminderUpdateError'
  }
}
