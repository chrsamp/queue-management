import { useState } from 'react'

import type { Exam, Invigilator } from '@/api/schemas'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'

import { Alert, ModalFooter, ModalHeader, SelectField } from './ExamModalFields'
import { useEmailExamInvigilatorMutation } from './exam-mutations'

export default function SelectInvigilatorModal({
  exam,
  invigilators,
  onClose,
  onSaved,
}: {
  exam: Exam
  invigilators: Invigilator[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [selected, setSelected] = useState<number | ''>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const emailInvigilatorMutation = useEmailExamInvigilatorMutation()
  const isSaving = emailInvigilatorMutation.isPending

  async function submit() {
    const invigilator = invigilators.find(
      (item) => item.invigilator_id === selected,
    )
    if (!invigilator) {
      return
    }

    setErrorMessage(null)

    try {
      await emailInvigilatorMutation.mutateAsync({
        examId: exam.exam_id,
        invigilator,
      })
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'An error occurred emailing the invigilator'),
      )
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Select Invigilator" />
        <div className="grid gap-4 p-6">
          {errorMessage && <Alert message={errorMessage} />}
          <SelectField
            label="Invigilator"
            onChange={(value) => setSelected(value ? Number(value) : '')}
            value={selected}
          >
            <option value="">Select invigilator</option>
            {invigilators.map((item) => (
              <option key={item.invigilator_id} value={item.invigilator_id}>
                {item.invigilator_name}
              </option>
            ))}
          </SelectField>
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() => void submit()}
          submitDisabled={!selected}
          submitText="Email Invigilator"
        />
      </Dialog>
    </Modal>
  )
}
