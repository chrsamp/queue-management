import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { AppointmentCalendarEvent } from './appointment-utils'
import { checkInAppointment } from './appointment-checkin'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

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
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const activeCitizenId = useWorkflowStore((state) => state.activeCitizenId)
  const showServiceModal = useWorkflowStore((state) => state.showServiceModal)
  const setGlobalAlert = useWorkflowStore((state) => state.setGlobalAlert)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !clickedEvent) {
    return null
  }

  const draft = Boolean(clickedEvent.is_draft)
  const blackout = clickedEvent.blackout_flag === 'Y'
  const recurring = Boolean(clickedEvent.recurring_uuid) && !clickedEvent.stat_flag
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

    setIsCheckingIn(true)
    setErrorMessage(null)

    try {
      await checkInAppointment({
        apiClient,
        appointment: clickedEvent.appointment,
        beginService: false,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.citizens }),
      ])
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to check in appointment.'))
    } finally {
      setIsCheckingIn(false)
    }
  }

  return (
    <Modal className="max-w-sm overflow-hidden" isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <div className="border-bc-border bg-bc-light-gray border-b px-6 py-4">
          <h2 className="text-bc-h4 m-0 font-bold">Appointment</h2>
        </div>
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
                  layout="fluid"
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
                    {support ? 'Edit or Cancel Recurring STAT Series?' : 'View STAT?'}
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
        <div className="bg-bc-light-gray flex justify-end border-t px-6 py-4">
          <Button disabled={isCheckingIn} onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </Dialog>
    </Modal>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
