import { useState } from 'react'

import type { Exam } from '@/api/schemas'
import Button from '@/components/Button'
import ModalLayout from '@/components/ModalLayout'
import { getErrorMessage } from '@/lib/errors'

import { Alert, ModalHeader } from './ExamModalFields'
import { useDeleteExamMutation } from './exam-mutations'

export default function DeleteExamModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const deleteExamMutation = useDeleteExamMutation()
  const isSaving = deleteExamMutation.isPending

  async function handleDelete() {
    setErrorMessage(null)

    try {
      await deleteExamMutation.mutateAsync(exam)
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to delete exam.'))
    }
  }

  return (
    <ModalLayout
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            danger
            disabled={isSaving}
            onClick={() => void handleDelete()}
          >
            Yes
          </Button>
        </div>
      }
      header={<ModalHeader title="Delete Exam" />}
      onClose={onClose}
    >
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
    </ModalLayout>
  )
}
