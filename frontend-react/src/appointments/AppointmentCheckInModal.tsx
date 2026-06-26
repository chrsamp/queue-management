import { useState } from 'react'

import type { AppointmentCalendarEvent } from './appointment-utils'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { DialogTitle } from '@/components/Dialog'
import ModalLayout from '@/components/ModalLayout'
import { getErrorMessage } from '@/lib/errors'
import { useWorkflowStore } from '@/store/workflow-store'
import { useCheckInAppointmentMutation } from './appointment-mutations'

interface AppointmentCheckInModalProps {
  clickedEvent: AppointmentCalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit: (editSeries: boolean) => void
  roleCode: string | null
}

export default function AppointmentCheckInModal({
  clickedEvent,
  isOpen,
  onClose,
  onEdit,
  roleCode,
}: AppointmentCheckInModalProps) {
  const activeCitizenId = useWorkflowStore((state) => state.activeCitizenId)
  const showServiceModal = useWorkflowStore((state) => state.showServiceModal)
  const setGlobalAlert = useWorkflowStore((state) => state.setGlobalAlert)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const checkInMutation = useCheckInAppointmentMutation()
  const isCheckingIn = checkInMutation.isPending

  if (!isOpen || !clickedEvent) {
    return null
  }

  const draft = Boolean(clickedEvent.is_draft)
  const blackout = clickedEvent.blackout_flag === 'Y'
  const recurring =
    Boolean(clickedEvent.recurring_uuid) && !clickedEvent.stat_flag
  const stat = Boolean(clickedEvent.stat_flag)
  const support = roleCode === 'SUPPORT'

  async function handleCheckIn() {
    if (!clickedEvent) {
      return
    }

    if (activeCitizenId || showServiceModal) {
      setGlobalAlert({
        id: 'appointment-check-in-active-service',
        message:
          'Already have appointment in progress.  Please close ticket then check-in citizen',
        role: 'alert',
        variant: 'warning',
      })
      onClose()
      return
    }

    setErrorMessage(null)

    try {
      await checkInMutation.mutateAsync({
        appointment: clickedEvent.appointment,
        beginService: false,
      })
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to check in appointment.'))
    }
  }

  return (
    <ModalLayout
      className="max-w-sm"
      closeDisabled={isCheckingIn}
      header={
        <DialogTitle className="text-bc-h4 m-0 font-bold">
          Appointment
        </DialogTitle>
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-6">
        {draft ? (
          <p className="m-0 font-bold">
            You cannot edit or delete draft appointments.
          </p>
        ) : (
          <>
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
            {!blackout && !stat && (
              <div>
                <p className="mb-3">Citizen Has Arrived?</p>
                <Button
                  className="w-full"
                  disabled={isCheckingIn}
                  onClick={() => void handleCheckIn()}
                >
                  Check-In
                </Button>
              </div>
            )}
            {!stat && (
              <div>
                <p className="mb-3">Edit or Cancel Appointment?</p>
                <Button
                  className="w-full"
                  disabled={isCheckingIn}
                  onClick={() => onEdit(false)}
                  variant="secondary"
                >
                  Edit Appointment
                </Button>
              </div>
            )}
            {recurring && (
              <div>
                <p className="mb-3">Edit or Cancel Recurring Series?</p>
                <Button
                  className="w-full"
                  disabled={isCheckingIn}
                  onClick={() => onEdit(true)}
                  variant="secondary"
                >
                  Edit Recurring Series
                </Button>
              </div>
            )}
            {stat && (
              <div>
                <p className="mb-3">
                  {support
                    ? 'Edit or Cancel Recurring STAT Series?'
                    : 'View STAT?'}
                </p>
                <Button
                  className="w-full"
                  disabled={isCheckingIn}
                  onClick={() => onEdit(true)}
                  variant="secondary"
                >
                  {support ? 'Edit Recurring STAT Series' : 'View STAT'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ModalLayout>
  )
}
