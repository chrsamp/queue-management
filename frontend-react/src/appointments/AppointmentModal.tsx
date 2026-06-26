import { useEffect, useMemo, useState } from 'react'

import type { Category, Office, Service } from '@/api/schemas'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { DialogTitle } from '@/components/Dialog'
import ModalLayout from '@/components/ModalLayout'
import ServicePicker from '@/components/ServicePicker'
import { cx } from '@/lib/cx'
import { getErrorMessage } from '@/lib/errors'

import {
  getAppointmentLengthOptions,
  isWithinAppointmentHours,
  type AppointmentCalendarEvent,
} from './appointment-utils'
import {
  addMinutes,
  formatDateInputValue,
  formatTimeInputValue,
  isPast,
  mergeDateAndTime,
  officeDateToUtcIso,
} from '@/lib/datetime'
import {
  useDeleteAppointmentMutation,
  useSaveAppointmentMutation,
} from './appointment-mutations'

interface AppointmentModalProps {
  categories: Category[]
  clickedEvent: AppointmentCalendarEvent | null
  clickedTime: Date | null
  isOpen: boolean
  office: Office
  onClose: () => void
  onDraftCleanup: () => Promise<void>
  roleCode: string | null
  services: Service[]
}

export default function AppointmentModal({
  categories,
  clickedEvent,
  clickedTime,
  isOpen,
  office,
  onClose,
  onDraftCleanup,
  roleCode,
  services,
}: AppointmentModalProps) {
  const [citizenName, setCitizenName] = useState('')
  const [contactInformation, setContactInformation] = useState('')
  const [comments, setComments] = useState('')
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [length, setLength] = useState(15)
  const [serviceCategoryId, setServiceCategoryId] = useState<number | null>(
    null,
  )
  const [serviceSearch, setServiceSearch] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('')
  const [editSeries, setEditSeries] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const saveAppointmentMutation = useSaveAppointmentMutation()
  const deleteAppointmentMutation = useDeleteAppointmentMutation()
  const isSaving =
    saveAppointmentMutation.isPending || deleteAppointmentMutation.isPending

  const selectedService =
    typeof selectedServiceId === 'number'
      ? (services.find((service) => service.service_id === selectedServiceId) ??
        null)
      : null
  const lengthOptions = useMemo(
    () => getAppointmentLengthOptions(clickedEvent, selectedService),
    [clickedEvent, selectedService],
  )
  const stat = Boolean(clickedEvent?.stat_flag)
  const blackout = clickedEvent?.blackout_flag === 'Y'
  const draft = Boolean(clickedEvent?.is_draft)
  const support = roleCode === 'SUPPORT'
  const showServicePicker = !stat && !blackout
  const appointmentStart = clickedEvent?.start ?? clickedTime ?? null
  const rescheduleAllowed =
    clickedEvent && appointmentStart ? !isPast(appointmentStart) : true

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const start = clickedEvent?.start ?? clickedTime ?? new Date()
    const duration = clickedEvent
      ? Math.max(
          15,
          Math.round(
            (clickedEvent.end.getTime() - clickedEvent.start.getTime()) / 60000,
          ),
        )
      : 15

    // The modal owns editable form state and must reset when a different
    // appointment or slot opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCitizenName(clickedEvent?.title ?? '')
    setContactInformation(clickedEvent?.contact_information ?? '')
    setComments(clickedEvent?.comments ?? '')
    setDateValue(formatDateInputValue(start))
    setTimeValue(formatTimeInputValue(start))
    setLength(duration)
    setServiceCategoryId(null)
    setServiceSearch(
      services.find(
        (service) => service.service_id === clickedEvent?.service_id,
      )?.service_name ?? '',
    )
    setSelectedServiceId(clickedEvent?.service_id ?? '')
    setEditSeries(false)
    setErrorMessage(null)
  }, [clickedEvent, clickedTime, isOpen, services])

  if (!isOpen) {
    return null
  }

  const title = editSeries
    ? stat
      ? 'Recurring STAT'
      : 'Book Service Appointment Series'
    : clickedEvent?.online_flag
      ? 'Book Service Appointment (Online)'
      : 'Book Service Appointment'

  async function handleClose() {
    await onDraftCleanup()
    onClose()
  }

  async function handleSubmit() {
    if (draft) {
      return
    }

    if (stat && !support) {
      await handleClose()
      return
    }

    if (!stat && (!citizenName || !selectedServiceId)) {
      setErrorMessage('Please complete all required fields.')
      return
    }

    const start = mergeDateAndTime(dateValue, timeValue)
    const end = addMinutes(start, Number(length))

    if (!stat && (!isWithinAppointmentHours(start, end) || isPast(start))) {
      setErrorMessage(
        isPast(start)
          ? 'Selected length/time cannot be in the past'
          : 'Selected length/time is not within the office time',
      )
      return
    }

    setErrorMessage(null)

    try {
      if (clickedEvent?.appointment_id) {
        await saveAppointmentMutation.mutateAsync({
          appointmentId: clickedEvent.appointment_id,
          recurringUuid:
            editSeries && clickedEvent.recurring_uuid
              ? clickedEvent.recurring_uuid
              : undefined,
          updatePayload:
            editSeries && clickedEvent.recurring_uuid
              ? { comments }
              : {
                  comments: comments || null,
                  contact_information: contactInformation || null,
                  end_time: officeDateToUtcIso(
                    end,
                    office.timezone.timezone_name,
                  ),
                  service_id: stat
                    ? clickedEvent.service_id
                    : Number(selectedServiceId),
                  start_time: officeDateToUtcIso(
                    start,
                    office.timezone.timezone_name,
                  ),
                  ...(stat ? {} : { citizen_name: citizenName }),
                },
        })
      } else {
        await saveAppointmentMutation.mutateAsync({
          createPayload: {
            appointment_draft_id: 1,
            citizen_name: citizenName,
            comments: comments || null,
            contact_information: contactInformation || null,
            end_time: officeDateToUtcIso(end, office.timezone.timezone_name),
            office_id: office.office_id,
            service_id: Number(selectedServiceId),
            start_time: officeDateToUtcIso(
              start,
              office.timezone.timezone_name,
            ),
          },
          updatePayload: {},
        })
      }

      await handleClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to save appointment.'))
    }
  }

  async function handleDelete(singleOnly = false) {
    if (!clickedEvent) {
      return
    }

    setErrorMessage(null)

    try {
      await deleteAppointmentMutation.mutateAsync({
        appointmentId: clickedEvent.appointment_id,
        recurringUuid: editSeries ? clickedEvent.recurring_uuid : null,
        singleOnly,
        stat,
      })
      await handleClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to delete appointment.'))
    }
  }

  return (
    <ModalLayout
      className={cx(showServicePicker ? 'max-w-4xl' : 'max-w-2xl')}
      closeDisabled={isSaving}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          {clickedEvent && !draft && (!stat || support) && (
            <Button
              danger
              disabled={isSaving}
              onClick={() => void handleDelete(false)}
            >
              {editSeries ? 'Delete Series' : stat ? 'Delete STAT' : 'Delete'}
            </Button>
          )}
          {!draft && (
            <Button disabled={isSaving} onClick={() => void handleSubmit()}>
              Submit
            </Button>
          )}
        </div>
      }
      header={
        <DialogTitle className="text-bc-h4 m-0 font-bold">{title}</DialogTitle>
      }
      onClose={() => void handleClose()}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Citizen Name</span>
                  <input
                    className="border-bc-border rounded-sm border px-3 py-2"
                    disabled={blackout || stat}
                    onChange={(event) => setCitizenName(event.target.value)}
                    value={citizenName}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-bold">
                    {stat ? 'Contact Info' : 'Send Confirmation'}
                  </span>
                  <input
                    className="border-bc-border rounded-sm border px-3 py-2"
                    disabled={blackout || stat}
                    onChange={(event) =>
                      setContactInformation(event.target.value)
                    }
                    placeholder="By email or SMS Text"
                    value={contactInformation}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Date</span>
                  <input
                    className="border-bc-border rounded-sm border px-3 py-2"
                    disabled={stat || !rescheduleAllowed}
                    onChange={(event) => setDateValue(event.target.value)}
                    type="date"
                    value={dateValue}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Time</span>
                  <input
                    className="border-bc-border rounded-sm border px-3 py-2"
                    disabled={stat || !rescheduleAllowed}
                    onChange={(event) => setTimeValue(event.target.value)}
                    type="time"
                    value={timeValue}
                  />
                </label>
                {!stat && (
                  <label className="flex flex-col gap-1">
                    <span className="font-bold">Length</span>
                    <select
                      className="border-bc-border rounded-sm border px-3 py-2"
                      onChange={(event) =>
                        setLength(Number(event.target.value))
                      }
                      value={length}
                    >
                      {lengthOptions.map((option) => (
                        <option key={option} value={option}>
                          {option} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {showServicePicker && (
                <div className="flex flex-col gap-1">
                  <span className="font-bold">Service Required by Citizen</span>
                  <ServicePicker
                    categories={categories}
                    categoryId={serviceCategoryId}
                    onCategoryChange={setServiceCategoryId}
                    onSearchChange={setServiceSearch}
                    onSelectService={(service) => {
                      setSelectedServiceId(service.service_id)
                      setServiceSearch(service.service_name)
                    }}
                    search={serviceSearch}
                    selectedServiceId={
                      typeof selectedServiceId === 'number'
                        ? selectedServiceId
                        : null
                    }
                    services={services}
                  />
                </div>
              )}
              {!stat && blackout && (
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Service Required by Citizen</span>
                  <select
                    className="border-bc-border rounded-sm border px-3 py-2"
                    disabled={blackout}
                    onChange={(event) =>
                      setSelectedServiceId(Number(event.target.value) || '')
                    }
                    value={selectedServiceId}
                  >
                    <option value="">Please choose a service</option>
                    {services.map((service) => (
                      <option
                        key={service.service_id}
                        value={service.service_id}
                      >
                        {service.service_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="font-bold">{stat ? 'Note' : 'Notes'}</span>
                <textarea
                  className="border-bc-border min-h-20 rounded-sm border px-3 py-2"
                  disabled={stat && !support}
                  maxLength={255}
                  onChange={(event) => setComments(event.target.value)}
                  value={comments}
                />
              </label>
              {clickedEvent?.recurring_uuid && !stat && (
                <label className="flex items-center gap-2">
                  <input
                    checked={editSeries}
                    onChange={(event) => setEditSeries(event.target.checked)}
                    type="checkbox"
                  />
                  Edit or delete recurring series
                </label>
              )}
              {clickedEvent?.recurring_uuid && stat && support && (
                <label className="flex items-center gap-2">
                  <input
                    checked={editSeries}
                    onChange={(event) => setEditSeries(event.target.checked)}
                    type="checkbox"
                  />
                  Edit or delete recurring STAT series
                </label>
              )}
            </>
          )}
      </div>
    </ModalLayout>
  )
}
