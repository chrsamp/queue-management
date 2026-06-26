import { useEffect, useMemo, useState } from 'react'

import { type BookingPayload } from '@/api/endpoints'
import type { Exam, Invigilator, Office, Room } from '@/api/schemas'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { DialogTitle } from '@/components/Dialog'
import ModalLayout from '@/components/ModalLayout'
import { getErrorMessage } from '@/lib/errors'

import {
  getExamDurationMinutes,
  isAfterExamExpiry,
  isWithinBookingHours,
  type BookingCalendarEvent,
  type RoomResource,
} from './booking-utils'
import {
  addMinutes,
  diffMinutes,
  formatDateInputValue,
  formatTimeInputValue,
  isPast,
  mergeDateAndTime,
  officeDateToUtcIso,
} from '@/lib/datetime'
import {
  useDeleteBookingEventMutation,
  useSaveBookingEventMutation,
} from './booking-mutations'

interface BookingEventModalProps {
  event: BookingCalendarEvent | null
  exam: Exam | null
  invigilators: Invigilator[]
  isOpen: boolean
  mode: 'other' | 'exam' | 'edit' | 'reschedule'
  office: Office
  onClose: () => void
  onReschedule?: (event: BookingCalendarEvent) => void
  resource: RoomResource | null
  roleCode: string | null
  rooms: Room[]
  slotEnd: Date | null
  slotStart: Date | null
}

export default function BookingEventModal({
  event,
  exam,
  invigilators,
  isOpen,
  mode,
  office,
  onClose,
  onReschedule,
  resource,
  roleCode,
  rooms,
  slotEnd,
  slotStart,
}: BookingEventModalProps) {
  const [title, setTitle] = useState('')
  const [contact, setContact] = useState('')
  const [fees, setFees] = useState('false')
  const [notes, setNotes] = useState('')
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [selectedRoomId, setSelectedRoomId] = useState<number | '_offsite'>(
    '_offsite',
  )
  const [invigilatorMode, setInvigilatorMode] = useState<
    'sbc' | 'unassigned' | 'invigilator'
  >('sbc')
  const [invigilatorId, setInvigilatorId] = useState<number | ''>('')
  const [editSeries, setEditSeries] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const saveBookingMutation = useSaveBookingEventMutation()
  const deleteBookingMutation = useDeleteBookingEventMutation()
  const isSaving =
    saveBookingMutation.isPending || deleteBookingMutation.isPending

  const support = roleCode === 'SUPPORT'
  const stat = Boolean(event?.stat_flag)
  const blackout = event?.blackout_flag === 'Y'
  const selectedInvigilators = invigilators.filter(
    (candidate) =>
      candidate.shadow_count === 2 || candidate.shadow_count == null,
  )
  const titleText = useMemo(() => {
    if (mode === 'exam') {
      return 'Confirm Booking'
    }

    if (mode === 'reschedule') {
      return 'Reschedule Booking'
    }

    if (mode === 'edit') {
      return stat ? (support ? 'Edit STAT' : 'View STAT') : 'Edit Booking'
    }

    return 'Non-Exam Event Booking'
  }, [mode, stat, support])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const start = slotStart ?? event?.start ?? new Date()
    const end =
      slotEnd ??
      event?.end ??
      addMinutes(start, exam ? getExamDurationMinutes(exam) : 30)
    const firstInvigilator = event?.booking.invigilators?.[0]

    // Reset local form state whenever a new event or slot opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(exam?.exam_name ?? event?.booking.booking_name ?? '')
    setContact(event?.booking_contact_information ?? '')
    setFees(event?.fees ?? 'false')
    setNotes(event?.blackout_notes ?? '')
    setDateValue(formatDateInputValue(start))
    setTimeValue(formatTimeInputValue(start))
    setDurationMinutes(Math.max(30, diffMinutes(start, end)))
    setSelectedRoomId(
      (resource?.id ?? event?.resourceId ?? '_offsite') as number | '_offsite',
    )
    setInvigilatorMode(
      event?.booking.sbc_staff_invigilated
        ? 'sbc'
        : firstInvigilator
          ? 'invigilator'
          : 'unassigned',
    )
    setInvigilatorId(firstInvigilator?.invigilator_id ?? '')
    setEditSeries(false)
    setConfirmDelete(false)
    setErrorMessage(null)
  }, [event, exam, isOpen, resource, slotEnd, slotStart])

  if (!isOpen) {
    return null
  }

  const roomOptions = [
    ...rooms.map((room) => ({
      label: room.room_name,
      value: room.room_id,
    })),
    { label: 'Offsite', value: '_offsite' as const },
  ]
  const start = mergeDateAndTime(dateValue, timeValue)
  const end = addMinutes(start, durationMinutes)
  const canEdit = !stat || support
  const recurring = Boolean(event?.recurring_uuid)
  const roomLabel =
    roomOptions.find((option) => option.value === selectedRoomId)?.label ??
    resource?.title ??
    'Offsite'

  function validate() {
    if (!canEdit) {
      return true
    }

    if (isPast(start) && mode !== 'edit') {
      setErrorMessage('Selected date/time cannot be in the past')
      return false
    }

    if (selectedRoomId === '_offsite' && mode !== 'edit') {
      setErrorMessage('Offsite cannot be selected from the room calendar.')
      return false
    }

    if (!blackout && !isWithinBookingHours(start, end)) {
      setErrorMessage('Time not allowed')
      return false
    }

    if (exam && isAfterExamExpiry(start, exam)) {
      setErrorMessage(
        `This exam has expired on ${formatDateInputValue(new Date(exam.expiry_date ?? ''))}. Scheduling past expiry date is not allowed.`,
      )
      return false
    }

    if (mode === 'other' && (!title.trim() || !contact.trim() || !fees)) {
      setErrorMessage('Please complete all required fields.')
      return false
    }

    if (mode === 'exam' && !contact.trim()) {
      setErrorMessage('Contact Information is required.')
      return false
    }

    setErrorMessage(null)
    return true
  }

  function buildPayload(): BookingPayload {
    const payload: BookingPayload = {
      booking_contact_information: contact || null,
      booking_name: title || null,
      end_time: officeDateToUtcIso(end, office.timezone.timezone_name),
      fees,
      office_id: office.office_id,
      room_id: selectedRoomId === '_offsite' ? null : selectedRoomId,
      start_time: officeDateToUtcIso(start, office.timezone.timezone_name),
    }

    if (blackout) {
      payload.blackout_notes = notes || null
      payload.blackout_flag = 'Y'
    }

    if (stat) {
      payload.blackout_notes = notes || null
      payload.stat_flag = true
    }

    if (mode === 'exam') {
      payload.booking_name = exam?.exam_name ?? title
      payload.booking_contact_information = contact
      payload.fees = 'false'
      payload.sbc_staff_invigilated = invigilatorMode === 'sbc' ? 1 : 0
      payload.invigilator_id =
        invigilatorMode === 'invigilator' && invigilatorId
          ? invigilatorId
          : null
    }

    return payload
  }

  async function handleSubmit() {
    if (!validate()) {
      return
    }

    setErrorMessage(null)

    try {
      await saveBookingMutation.mutateAsync({
        bookingId: event?.id,
        examId: exam?.exam_id,
        mode:
          mode === 'edit'
            ? 'update'
            : mode === 'reschedule'
              ? 'reschedule'
              : 'create',
        payload: buildPayload(),
        recurringUuid:
          mode === 'edit' && editSeries ? event?.recurring_uuid : null,
      })
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to save booking.'))
    }
  }

  async function handleDelete(
    kind: 'single' | 'series' | 'stat-current' | 'stat-all',
  ) {
    if (!event) {
      return
    }

    setErrorMessage(null)

    try {
      await deleteBookingMutation.mutateAsync({
        bookingId: event.id,
        examId: event.exam?.exam_id,
        kind,
        recurringUuid: event.recurring_uuid,
      })
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to delete booking.'))
    }
  }

  return (
    <ModalLayout
      className="max-w-3xl"
      closeDisabled={isSaving}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          {event && canEdit && !confirmDelete && (
            <Button
              danger
              disabled={isSaving}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
          {event && canEdit && mode === 'edit' && onReschedule && (
            <Button
              disabled={isSaving}
              onClick={() => onReschedule(event)}
              variant="secondary"
            >
              Reschedule
            </Button>
          )}
          {canEdit && (
            <Button disabled={isSaving} onClick={() => void handleSubmit()}>
              Submit
            </Button>
          )}
        </div>
      }
      header={
        <DialogTitle className="text-bc-h4 m-0 font-bold">
          {titleText}
        </DialogTitle>
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-6">
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
          {exam && (
            <div className="border-bc-border grid gap-2 rounded-sm border p-3 sm:grid-cols-2">
              <div>
                <strong>Writer:</strong> {exam.examinee_name || '-'}
              </div>
              <div>
                <strong>Exam:</strong> {exam.exam_name || '-'}
              </div>
              <div>
                <strong>Event ID:</strong> {exam.event_id || '-'}
              </div>
              <div>
                <strong>Expiry:</strong>{' '}
                {exam.expiry_date
                  ? formatDateInputValue(new Date(exam.expiry_date))
                  : '-'}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="font-bold">
                {stat
                  ? 'STAT Notes'
                  : blackout
                    ? 'Blackout Notes'
                    : 'Scheduling Party'}
              </span>
              <input
                className="border-bc-border rounded-sm border px-3 py-2"
                disabled={!canEdit || Boolean(exam) || blackout || stat}
                onChange={(item) => setTitle(item.target.value)}
                value={blackout || stat ? notes : title}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-bold">
                Contact Information (Email or Phone Number)
              </span>
              <input
                className="border-bc-border rounded-sm border px-3 py-2"
                disabled={!canEdit || stat}
                onChange={(item) => setContact(item.target.value)}
                readOnly={stat}
                value={contact}
              />
            </label>
          </div>
          {(blackout || stat) && (
            <label className="flex flex-col gap-1">
              <span className="font-bold">
                {stat ? 'STAT Notes' : 'Blackout Notes'}
              </span>
              <textarea
                className="border-bc-border min-h-20 rounded-sm border px-3 py-2"
                disabled={!canEdit}
                maxLength={255}
                onChange={(item) => setNotes(item.target.value)}
                value={notes}
              />
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="font-bold">Room</span>
              {mode === 'edit' && !canEdit ? (
                <input
                  className="border-bc-border rounded-sm border px-3 py-2"
                  readOnly
                  value={roomLabel}
                />
              ) : (
                <select
                  className="border-bc-border rounded-sm border px-3 py-2"
                  disabled={!canEdit || mode === 'exam'}
                  onChange={(item) =>
                    setSelectedRoomId(
                      item.target.value === '_offsite'
                        ? '_offsite'
                        : Number(item.target.value),
                    )
                  }
                  value={String(selectedRoomId)}
                >
                  {roomOptions.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-bold">Date</span>
              <input
                className="border-bc-border rounded-sm border px-3 py-2"
                disabled={!canEdit}
                onChange={(item) => setDateValue(item.target.value)}
                type="date"
                value={dateValue}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-bold">Start Time</span>
              <input
                className="border-bc-border rounded-sm border px-3 py-2"
                disabled={!canEdit}
                onChange={(item) => setTimeValue(item.target.value)}
                type="time"
                value={timeValue}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-bold">Duration</span>
              <select
                className="border-bc-border rounded-sm border px-3 py-2"
                disabled={!canEdit || Boolean(exam)}
                onChange={(item) =>
                  setDurationMinutes(Number(item.target.value))
                }
                value={durationMinutes}
              >
                {[30, 60, 90, 120, 180, 240].map((value) => (
                  <option key={value} value={value}>
                    {(value / 60).toFixed(1)} hrs
                  </option>
                ))}
                {![30, 60, 90, 120, 180, 240].includes(durationMinutes) && (
                  <option value={durationMinutes}>
                    {(durationMinutes / 60).toFixed(1)} hrs
                  </option>
                )}
              </select>
            </label>
          </div>
          {!exam && !blackout && !stat && (
            <label className="flex max-w-xs flex-col gap-1">
              <span className="font-bold">Collect Fees</span>
              <select
                className="border-bc-border rounded-sm border px-3 py-2"
                onChange={(item) => setFees(item.target.value)}
                value={fees}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
                <option value="HQFin">HQ to Invoice</option>
              </select>
            </label>
          )}
          {exam && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="font-bold">Invigilator Selection Options</span>
                <select
                  className="border-bc-border rounded-sm border px-3 py-2"
                  onChange={(item) =>
                    setInvigilatorMode(
                      item.target.value as 'sbc' | 'unassigned' | 'invigilator',
                    )
                  }
                  value={invigilatorMode}
                >
                  <option value="sbc">ServiceBC Staff</option>
                  <option value="unassigned">Assign Later</option>
                  <option value="invigilator">Contract Invigilator</option>
                </select>
              </label>
              {invigilatorMode === 'invigilator' && (
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Invigilator</span>
                  <select
                    className="border-bc-border rounded-sm border px-3 py-2"
                    onChange={(item) =>
                      setInvigilatorId(Number(item.target.value))
                    }
                    value={invigilatorId}
                  >
                    <option value="">Select invigilator</option>
                    {selectedInvigilators.map((candidate) => (
                      <option
                        key={candidate.invigilator_id}
                        value={candidate.invigilator_id}
                      >
                        {candidate.invigilator_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="font-bold">Notes</span>
                <textarea
                  className="border-bc-border min-h-20 rounded-sm border px-3 py-2"
                  maxLength={255}
                  onChange={(item) => setNotes(item.target.value)}
                  value={notes}
                />
              </label>
            </div>
          )}
          {recurring && canEdit && (
            <label className="flex items-center gap-2">
              <input
                checked={editSeries}
                onChange={(item) => setEditSeries(item.target.checked)}
                type="checkbox"
              />
              Edit recurring series notes
            </label>
          )}
          {confirmDelete && event && (
            <div className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4">
              <p className="mt-0 mb-3">
                Are you sure you want to delete this booking?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  danger
                  disabled={isSaving}
                  onClick={() => void handleDelete('single')}
                >
                  Delete this booking
                </Button>
                {recurring && !stat && (
                  <Button
                    danger
                    disabled={isSaving}
                    onClick={() => void handleDelete('series')}
                  >
                    Delete series
                  </Button>
                )}
                {recurring && stat && support && (
                  <>
                    <Button
                      danger
                      disabled={isSaving}
                      onClick={() => void handleDelete('stat-current')}
                    >
                      Delete series from this office
                    </Button>
                    <Button
                      danger
                      disabled={isSaving}
                      onClick={() => void handleDelete('stat-all')}
                    >
                      Delete all STAT series
                    </Button>
                  </>
                )}
                <Button
                  disabled={isSaving}
                  onClick={() => setConfirmDelete(false)}
                  variant="secondary"
                >
                  Cancel delete
                </Button>
              </div>
            </div>
          )}
      </div>
    </ModalLayout>
  )
}
