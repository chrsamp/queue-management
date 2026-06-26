import { useState } from 'react'

import { downloadExamDocument } from '@/api/endpoints'
import type { Exam, ExamType } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import Button from '@/components/Button'
import ModalLayout from '@/components/ModalLayout'
import { getErrorMessage } from '@/lib/errors'
import { useWorkflowStore } from '@/store/workflow-store'

import {
  Alert,
  ReadOnlyField,
  SelectField,
  TextAreaField,
  TextField,
  ModalHeader,
} from './ExamModalFields'
import {
  canDeleteExam,
  dateInputValue,
  downloadBlob,
  examTypeForEdit,
  todayDateInputValue,
  toUtcDateIso,
  type ExamPermissions,
} from './exam-utils'
import { useUpdateExamMutation } from './exam-mutations'

export default function EditExamModal({
  exam,
  examTypes,
  onClose,
  onDelete,
  onSaved,
  permissions,
}: {
  exam: Exam
  examTypes: ExamType[]
  onClose: () => void
  onDelete: () => void
  onSaved: () => Promise<void>
  permissions: ExamPermissions
}) {
  const apiClient = useApiClient()
  const setGlobalAlert = useWorkflowStore((state) => state.setGlobalAlert)
  const [fields, setFields] = useState<Record<string, string | number | null>>({
    event_id: exam.event_id ?? '',
    exam_method: exam.exam_method ?? 'paper',
    exam_name: exam.exam_name ?? '',
    exam_received_date: dateInputValue(exam.exam_received_date),
    exam_type_id: exam.exam_type_id ?? '',
    examinee_email: exam.examinee_email ?? '',
    examinee_name: exam.examinee_name ?? '',
    examinee_phone: exam.examinee_phone ?? '',
    expiry_date: dateInputValue(exam.expiry_date),
    notes: exam.notes ?? '',
    number_of_students: exam.number_of_students ?? '',
    receipt: exam.receipt ?? '',
    receipt_sent_ind: exam.receipt_sent_ind ?? 0,
  })
  const [confirmBookingDelete, setConfirmBookingDelete] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [examNotReady, setExamNotReady] = useState(false)
  const updateExamMutation = useUpdateExamMutation()
  const isSaving = updateExamMutation.isPending
  const type = examTypeForEdit(exam)
  const showAllFields =
    permissions.roleCode === 'GA' ||
    permissions.isIta2Designate ||
    permissions.isOfficeManager ||
    ['individual', 'other', 'pesticide'].includes(type)
  const typeOptions = examTypes.filter((item) => {
    if (type === 'group') {
      return item.group_exam_ind && !item.pesticide_exam_ind
    }
    if (type === 'individual') {
      return (
        item.ita_ind &&
        !item.group_exam_ind &&
        !item.exam_type_name?.includes('Monthly')
      )
    }
    if (type === 'other') {
      return !item.ita_ind && !item.group_exam_ind && !item.pesticide_exam_ind
    }
    return item.exam_type_id === exam.exam_type_id
  })

  function update(key: string, value: string | number | null) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function handleDownload() {
    setExamNotReady(false)
    try {
      const blob = await downloadExamDocument(apiClient, exam.exam_id)
      downloadBlob(blob, `${exam.exam_id}.pdf`)
      update('exam_received_date', todayDateInputValue())
    } catch {
      setExamNotReady(true)
      window.setTimeout(() => setExamNotReady(false), 15000)
    }
  }

  async function submitConfirmed() {
    setErrorMessage(null)

    try {
      const payload: Record<string, unknown> = {}
      Object.entries(fields).forEach(([key, value]) => {
        if (key.endsWith('_date')) {
          payload[key] = toUtcDateIso(value ? String(value) : null)
          return
        }
        payload[key] = value === '' ? null : value
      })

      if (!fields.exam_received_date) {
        payload.exam_received_date = null
      }

      await updateExamMutation.mutateAsync({
        deleteBookingId:
          confirmBookingDelete && exam.booking_id ? exam.booking_id : null,
        examId: exam.exam_id,
        payload,
      })
      await onSaved()
      setGlobalAlert({
        id: 'exam-edit-success',
        message: 'Success!',
        role: 'status',
        variant: 'success',
      })
      onClose()
    } catch (error) {
      setGlobalAlert({
        id: 'exam-edit-failure',
        message:
          'Something Went Wrong! Please submit feedback and tell us about this issue.',
        role: 'alert',
        variant: 'danger',
      })
      setErrorMessage(getErrorMessage(error, 'Unable to update exam.'))
    }
  }

  function handleSubmit() {
    if (
      type === 'individual' &&
      exam.booking_id &&
      Number(fields.exam_type_id) !== exam.exam_type_id
    ) {
      setConfirmBookingDelete(true)
      return
    }

    void submitConfirmed()
  }

  return (
    <ModalLayout
      className="max-w-3xl"
      closeDisabled={isSaving}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          {canDeleteExam(exam, permissions) && (
            <Button danger disabled={isSaving} onClick={onDelete}>
              Delete Exam
            </Button>
          )}
          <Button
            disabled={isSaving || confirmBookingDelete}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      }
      header={<ModalHeader title="Edit/Print Exam Details" />}
      onClose={onClose}
    >
      <div className="grid gap-4 p-6 sm:grid-cols-2">
          {errorMessage && <Alert message={errorMessage} />}
          {examNotReady && (
            <Alert message="This exam is not yet ready for retrieval. Please try again in no less than 15 minutes." />
          )}
          {type === 'pesticide' && (
            <>
              <ReadOnlyField label="Exam Type" value={exam.exam_name ?? '-'} />
              <Button onClick={() => void handleDownload()}>Print</Button>
            </>
          )}
          {showAllFields ? (
            <>
              <TextField
                label="Event ID"
                onChange={(value) => update('event_id', value)}
                value={fields.event_id ?? ''}
              />
              <SelectField
                label="Exam Method"
                onChange={(value) => update('exam_method', value)}
                value={fields.exam_method ?? 'paper'}
              >
                <option value="paper">paper</option>
                <option value="online">online</option>
              </SelectField>
              {type !== 'challenger' && type !== 'pesticide' && (
                <SelectField
                  label="Exam Type"
                  onChange={(value) => update('exam_type_id', Number(value))}
                  value={fields.exam_type_id ?? ''}
                >
                  {typeOptions.map((item) => (
                    <option key={item.exam_type_id} value={item.exam_type_id}>
                      {item.exam_type_name}
                    </option>
                  ))}
                </SelectField>
              )}
              <TextField
                label="Exam Name"
                maxLength={50}
                onChange={(value) => update('exam_name', value)}
                value={fields.exam_name ?? ''}
              />
              <SelectField
                label={
                  type === 'pesticide' ? 'Exam Printed?' : 'Exam Received?'
                }
                onChange={(value) =>
                  update(
                    'exam_received_date',
                    value === 'yes' ? todayDateInputValue() : '',
                  )
                }
                value={fields.exam_received_date ? 'yes' : 'no'}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </SelectField>
              {fields.exam_received_date ? (
                <TextField
                  label={
                    type === 'pesticide' ? 'Printed Date' : 'Received Date'
                  }
                  onChange={(value) => update('exam_received_date', value)}
                  type="date"
                  value={fields.exam_received_date ?? ''}
                />
              ) : null}
              {['group', 'challenger'].includes(type) && (
                <TextField
                  label="# of Writers"
                  onChange={(value) =>
                    update('number_of_students', Number(value))
                  }
                  type="number"
                  value={fields.number_of_students ?? ''}
                />
              )}
              {type === 'individual' && (
                <TextField
                  label="Expiry Date"
                  onChange={(value) => update('expiry_date', value)}
                  type="date"
                  value={fields.expiry_date ?? ''}
                />
              )}
              {['individual', 'other', 'pesticide'].includes(type) && (
                <TextField
                  label="Candidate's Name"
                  onChange={(value) => update('examinee_name', value)}
                  value={fields.examinee_name ?? ''}
                />
              )}
              {type === 'pesticide' && (
                <>
                  <TextField
                    label="Telephone"
                    onChange={(value) => update('examinee_phone', value)}
                    value={fields.examinee_phone ?? ''}
                  />
                  <TextField
                    label="Candidate's Email"
                    onChange={(value) => update('examinee_email', value)}
                    value={fields.examinee_email ?? ''}
                  />
                  <TextField
                    label="Receipt"
                    onChange={(value) => update('receipt', value)}
                    value={fields.receipt ?? ''}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      checked={fields.receipt_sent_ind === 1}
                      onChange={(event) =>
                        update('receipt_sent_ind', event.target.checked ? 1 : 0)
                      }
                      type="checkbox"
                    />
                    Confirmation/Receipt Sent?
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <ReadOnlyField label="Exam" value={exam.exam_name ?? '-'} />
              <ReadOnlyField label="Event ID" value={exam.event_id ?? '-'} />
              <ReadOnlyField
                label="Type"
                value={exam.exam_type?.exam_type_name ?? '-'}
              />
              <ReadOnlyField label="Method" value={exam.exam_method ?? '-'} />
              <SelectField
                label="Exam Received?"
                onChange={(value) =>
                  update(
                    'exam_received_date',
                    value === 'yes' ? todayDateInputValue() : '',
                  )
                }
                value={fields.exam_received_date ? 'yes' : 'no'}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </SelectField>
            </>
          )}
          <TextAreaField
            className="sm:col-span-2"
            label="Notes"
            maxLength={400}
            onChange={(value) => update('notes', value)}
            value={fields.notes ?? ''}
          />
          {confirmBookingDelete && (
            <div className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4 sm:col-span-2">
              <p className="mt-0">
                Room booking for the exam will be deleted. Are you sure you want
                to proceed?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setConfirmBookingDelete(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button danger onClick={() => void submitConfirmed()}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
      </div>
    </ModalLayout>
  )
}
