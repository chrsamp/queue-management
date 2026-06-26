import { useState } from 'react'

import type { Exam, Invigilator } from '@/api/schemas'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'
import { officeDateToUtcIso } from '@/lib/datetime'

import {
  Alert,
  ModalFooter,
  ModalHeader,
  ReadOnlyField,
  SelectField,
  TextAreaField,
  TextField,
} from './ExamModalFields'
import {
  dateInputValue,
  examTypeForEdit,
  getBookingInvigilatorIds,
  isPesticideExam,
  requiredInvigilatorCount,
  setupLabel,
  todayDateInputValue,
  toUtcDateIso,
  type ExamPermissions,
} from './exam-utils'
import { useGroupBookingMutation } from './exam-mutations'

export default function GroupBookingModal({
  exam,
  invigilators,
  offsiteInvigilators,
  onClose,
  onSaved,
  permissions,
}: {
  exam: Exam
  invigilators: Invigilator[]
  offsiteInvigilators: Invigilator[]
  onClose: () => void
  onSaved: () => Promise<void>
  permissions: ExamPermissions
}) {
  const timezone =
    exam.booking?.office.timezone.timezone_name ??
    exam.office?.timezone.timezone_name ??
    'America/Vancouver'
  const [date, setDate] = useState(dateInputValue(exam.booking?.start_time))
  const [time, setTime] = useState(
    exam.booking?.start_time
      ? new Date(exam.booking.start_time).toISOString().slice(11, 16)
      : '',
  )
  const [eventId, setEventId] = useState(exam.event_id ?? '')
  const [offsiteLocation, setOffsiteLocation] = useState(
    exam.offsite_location === '_offsite' ? '' : (exam.offsite_location ?? ''),
  )
  const [notes, setNotes] = useState(exam.notes ?? '')
  const [selectedInvigilators, setSelectedInvigilators] = useState<number[]>(
    getBookingInvigilatorIds(exam),
  )
  const [shadowInvigilatorId, setShadowInvigilatorId] = useState<number | ''>(
    exam.booking?.shadow_invigilator_id ?? '',
  )
  const [examReceivedDate, setExamReceivedDate] = useState(
    dateInputValue(exam.exam_received_date),
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const groupBookingMutation = useGroupBookingMutation()
  const isSaving = groupBookingMutation.isPending
  const fieldDisabled =
    permissions.roleCode !== 'SUPPORT' &&
    ((examTypeForEdit(exam) === 'challenger' &&
      permissions.roleCode !== 'GA' &&
      !permissions.isIta2Designate &&
      !permissions.isOfficeManager) ||
      (examTypeForEdit(exam) === 'group' &&
        ((isPesticideExam(exam) && !permissions.isPesticideDesignate) ||
          (!permissions.isIta2Designate && !permissions.isPesticideDesignate))))
  const invigilatorSource =
    isPesticideExam(exam) && exam.office?.office_name === 'Pesticide Offsite'
      ? offsiteInvigilators
      : invigilators
  const required = requiredInvigilatorCount(exam)

  async function handleSubmit() {
    if (!date || !time) {
      setErrorMessage('Exam date and time are required.')
      return
    }

    setErrorMessage(null)

    try {
      const start = new Date(`${date}T${time}`)
      const duration = Number(exam.exam_type?.number_of_hours ?? 1) * 60
      const end = new Date(start.getTime() + duration * 60000)
      const bookingPayload = {
        booking_name: exam.exam_name,
        end_time: officeDateToUtcIso(end, timezone),
        invigilator_id: isPesticideExam(exam)
          ? selectedInvigilators.slice(0, 1)
          : selectedInvigilators,
        office_id: exam.office_id ?? exam.office?.office_id,
        sbc_staff_invigilated: 0,
        shadow_invigilator_id: shadowInvigilatorId || null,
        start_time: officeDateToUtcIso(start, timezone),
      }

      await groupBookingMutation.mutateAsync({
        bookingId: exam.booking_id,
        bookingPayload,
        examId: exam.exam_id,
        examPayload: {
          event_id: eventId,
          exam_received_date: toUtcDateIso(examReceivedDate),
          invigilator_id: selectedInvigilators[0] ?? null,
          notes,
          offsite_location: offsiteLocation || exam.offsite_location,
        },
        shadowInvigilatorId: shadowInvigilatorId
          ? Number(shadowInvigilatorId)
          : null,
        updateShadowCount:
          Boolean(shadowInvigilatorId) &&
          shadowInvigilatorId !== exam.booking?.shadow_invigilator_id,
      })

      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to update booking.'))
    }
  }

  return (
    <Modal className="max-w-3xl overflow-hidden" isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader
          title={`Edit ${setupLabel(examTypeForEdit(exam))} Exam Booking`}
        />
        <div className="grid max-h-[75vh] gap-4 overflow-auto p-6 sm:grid-cols-2">
          {errorMessage && <Alert message={errorMessage} />}
          <ReadOnlyField label="Exam" value={exam.exam_name ?? '-'} />
          <ReadOnlyField
            label="Writers"
            value={String(exam.number_of_students ?? '-')}
          />
          <TextField
            disabled={fieldDisabled}
            label="Event ID"
            onChange={setEventId}
            value={eventId}
          />
          <TextField
            disabled={fieldDisabled}
            label="Exam Date"
            onChange={setDate}
            type="date"
            value={date}
          />
          <TextField
            disabled={fieldDisabled}
            label="Exam Time"
            onChange={setTime}
            type="time"
            value={time}
          />
          <TextField
            disabled={fieldDisabled}
            label="Location"
            maxLength={50}
            onChange={setOffsiteLocation}
            value={offsiteLocation}
          />
          <SelectField
            label="Exam Received?"
            onChange={(value) =>
              setExamReceivedDate(value === 'yes' ? todayDateInputValue() : '')
            }
            value={examReceivedDate ? 'yes' : 'no'}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </SelectField>
          {examReceivedDate && (
            <TextField
              label="Received Date"
              onChange={setExamReceivedDate}
              type="date"
              value={examReceivedDate}
            />
          )}
          <TextAreaField
            className="sm:col-span-2"
            label="Notes"
            maxLength={400}
            onChange={setNotes}
            value={notes}
          />
          <fieldset className="border-bc-border rounded-sm border p-3 sm:col-span-2">
            <legend className="font-bold">Invigilators</legend>
            <p className="mt-0 mb-2">Required Invigilators: {required}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {invigilatorSource
                .filter(
                  (item) =>
                    item.shadow_count === 2 || item.shadow_count == null,
                )
                .map((item) => (
                  <label
                    className="flex items-center gap-2"
                    key={item.invigilator_id}
                  >
                    <input
                      checked={selectedInvigilators.includes(
                        item.invigilator_id,
                      )}
                      onChange={(event) =>
                        setSelectedInvigilators((current) =>
                          event.target.checked
                            ? [...current, item.invigilator_id]
                            : current.filter(
                                (id) => id !== item.invigilator_id,
                              ),
                        )
                      }
                      type="checkbox"
                    />
                    {item.invigilator_name}
                  </label>
                ))}
            </div>
          </fieldset>
          <SelectField
            className="sm:col-span-2"
            label="Shadow Invigilator"
            onChange={(value) =>
              setShadowInvigilatorId(value ? Number(value) : '')
            }
            value={shadowInvigilatorId}
          >
            <option value="">Unassigned</option>
            {invigilators
              .filter((item) => (item.shadow_count ?? 0) < 2)
              .map((item) => (
                <option key={item.invigilator_id} value={item.invigilator_id}>
                  {item.invigilator_name}
                </option>
              ))}
          </SelectField>
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
        />
      </Dialog>
    </Modal>
  )
}
