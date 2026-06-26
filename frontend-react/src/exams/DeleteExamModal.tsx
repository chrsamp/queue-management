import { useState } from 'react'

import { deleteBooking, deleteExam } from '@/api/endpoints'
import type { Exam } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import Button from '@/components/Button'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'

import { Alert, ModalHeader } from './ExamModalFields'

export default function DeleteExamModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const apiClient = useApiClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleDelete() {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      await deleteExam(apiClient, exam.exam_id)
      if (exam.booking_id) {
        await deleteBooking(apiClient, exam.booking_id)
      }
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to delete exam.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Delete Exam" />
        <div className="grid gap-4 p-6">
          {errorMessage && <Alert message={errorMessage} />}
          <p className="m-0">Are you sure you want to delete this Exam?</p>
          <div className="border-bc-border rounded-sm border p-3">
            <div>
              <strong>Exam Name:</strong> {exam.exam_name}
            </div>
            <div>
              <strong>Examinee Name:</strong> {exam.examinee_name || '-'}
            </div>
            <div>
              <strong>Event ID:</strong> {exam.event_id || '-'}
            </div>
          </div>
        </div>
        <div className="bg-bc-light-gray flex justify-end gap-3 border-t px-6 py-4">
          <Button disabled={isSaving} onClick={onClose} variant="secondary">
            No
          </Button>
          <Button
            danger
            disabled={isSaving}
            onClick={() => void handleDelete()}
          >
            Yes
          </Button>
        </div>
      </Dialog>
    </Modal>
  )
}
