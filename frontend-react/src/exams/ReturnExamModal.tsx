import { useState } from 'react'

import type { Exam } from '@/api/schemas'
import Button from '@/components/Button'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'

import {
  Alert,
  ModalFooter,
  ModalHeader,
  SelectField,
  TextField,
} from './ExamModalFields'
import { dateInputValue, todayDateInputValue, toUtcDateIso } from './exam-utils'
import { useUpdateExamMutation } from './exam-mutations'

export default function ReturnExamModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [returned, setReturned] = useState(Boolean(exam.exam_returned_date))
  const [written, setWritten] = useState(exam.exam_written_ind ?? 1)
  const [date, setDate] = useState(
    dateInputValue(exam.exam_returned_date) || todayDateInputValue(),
  )
  const [actionTaken, setActionTaken] = useState(
    exam.exam_returned_tracking_number ?? '',
  )
  const [notes, setNotes] = useState(exam.notes ?? '')
  const [confirm, setConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const updateExamMutation = useUpdateExamMutation()
  const isSaving = updateExamMutation.isPending
  const editMode = Boolean(exam.exam_returned_date)

  async function submit() {
    if (returned && !actionTaken) {
      setErrorMessage('Action Taken is required.')
      return
    }

    setErrorMessage(null)

    try {
      await updateExamMutation.mutateAsync({
        examId: exam.exam_id,
        payload: {
          exam_returned_date: returned ? toUtcDateIso(date) : null,
          exam_returned_tracking_number: returned ? actionTaken : null,
          exam_written_ind: written,
          notes: returned ? notes : '',
        },
      })
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to update return details.'),
      )
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title={editMode ? 'Edit Return Details' : 'Return Exam'} />
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {errorMessage && <Alert message={errorMessage} />}
          <SelectField
            label="Exam Status"
            onChange={(value) => setReturned(value === 'returned')}
            value={returned ? 'returned' : 'not-returned'}
          >
            <option value="not-returned">Not Returned</option>
            <option value="returned">Returned</option>
          </SelectField>
          {returned && (
            <>
              <SelectField
                label="Written?"
                onChange={(value) => setWritten(Number(value))}
                value={written}
              >
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </SelectField>
              <TextField
                label="Date of Return"
                onChange={setDate}
                type="date"
                value={date}
              />
              <TextField
                label="Action Taken"
                maxLength={250}
                onChange={setActionTaken}
                value={actionTaken}
              />
              <TextField label="Notes" onChange={setNotes} value={notes} />
            </>
          )}
          {confirm && (
            <div className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4 sm:col-span-2">
              <p className="mt-0">Are you sure you want to return this exam?</p>
              <div className="flex gap-2">
                <Button onClick={() => setConfirm(false)} variant="secondary">
                  No
                </Button>
                <Button onClick={() => void submit()}>Yes</Button>
              </div>
            </div>
          )}
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() =>
            editMode || !returned ? void submit() : setConfirm(true)
          }
        />
      </Dialog>
    </Modal>
  )
}
