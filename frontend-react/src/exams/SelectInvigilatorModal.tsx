import { useState } from 'react'

import { emailExamInvigilator } from '@/api/endpoints'
import type { Exam, Invigilator } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'

import { Alert, ModalFooter, ModalHeader, SelectField } from './ExamModalFields'

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
  const apiClient = useApiClient()
  const [selected, setSelected] = useState<number | ''>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    const invigilator = invigilators.find(
      (item) => item.invigilator_id === selected,
    )
    if (!invigilator) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      await emailExamInvigilator(apiClient, exam.exam_id, {
        invigilator_email: invigilator.contact_email,
        invigilator_id: invigilator.invigilator_id,
        invigilator_name: invigilator.invigilator_name,
        invigilator_phone: invigilator.contact_phone,
      })
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'An error occurred emailing the invigilator'),
      )
    } finally {
      setIsSaving(false)
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
