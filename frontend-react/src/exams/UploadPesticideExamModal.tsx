import { useState } from 'react'

import type { Exam } from '@/api/schemas'
import Button from '@/components/Button'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'

import { Alert, ModalHeader, SelectField } from './ExamModalFields'
import { useUploadPesticideExamMutation } from './exam-mutations'

export default function UploadPesticideExamModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const printed = Boolean(exam.exam_received_date)
  const [status, setStatus] = useState(
    exam.exam_destroyed_date
      ? 'noshow'
      : exam.upload_received_ind && exam.exam_written_ind
        ? 'written'
        : '',
  )
  const [destroyed, setDestroyed] = useState(Boolean(exam.exam_destroyed_date))
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const uploadExamMutation = useUploadPesticideExamMutation()
  const isSaving = uploadExamMutation.isPending

  async function submit() {
    if (status === 'written' && !file) {
      setErrorMessage('Please provide a file to upload.')
      return
    }

    setErrorMessage(null)

    try {
      const putData: Record<string, unknown> = {
        exam_destroyed_date: destroyed ? new Date().toISOString() : null,
        exam_returned_date: new Date().toISOString(),
        exam_written_ind: status === 'written' ? 1 : 0,
        upload_received_ind: status === 'written' ? 1 : 0,
      }

      await uploadExamMutation.mutateAsync({
        examId: exam.exam_id,
        file: status === 'written' ? file : null,
        payload: putData,
      })
      await onSaved()
      setSubmitted(true)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'File upload failed, please try again.'),
      )
    } finally {
      setConfirm(false)
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Upload Completed Exam" />
        <div className="grid gap-4 p-6">
          {submitted ? (
            <div className="text-center">
              <div className="text-6xl text-green-700">✓</div>
              <h3 className="text-bc-h4 my-2 font-bold">Success!</h3>
            </div>
          ) : null}
          {errorMessage && <Alert message={errorMessage} />}
          <div className="border-bc-border rounded-sm border p-3">
            <div>
              <strong>Exam:</strong> {exam.exam_name}
            </div>
            <div>
              <strong>Exam Type:</strong> {exam.exam_type?.exam_type_name}
            </div>
            <div>
              <strong>Event ID:</strong> {exam.event_id || '-'}
            </div>
            <div>
              <strong>Upload Status:</strong>{' '}
              {exam.upload_received_ind ? 'Received' : 'Not Received'}
            </div>
          </div>
          {!submitted && (
            <>
              <SelectField
                label="Exam Status"
                onChange={setStatus}
                value={status}
              >
                <option value=""></option>
                <option value="unwritten">Unwritten</option>
                {printed && <option value="written">Written</option>}
                <option value="noshow">No Show</option>
              </SelectField>
              {status === 'written' && (
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Attach Scanned Exam</span>
                  <input
                    onChange={(event) =>
                      setFile(event.target.files?.item(0) ?? null)
                    }
                    type="file"
                  />
                </label>
              )}
              {status === 'noshow' && (
                <SelectField
                  label="Exam Destroyed?"
                  onChange={(value) => setDestroyed(value === 'true')}
                  value={String(destroyed)}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </SelectField>
              )}
              {confirm && (
                <div className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4">
                  <p className="mt-0">
                    Are you sure you want to upload this exam?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setConfirm(false)}
                      variant="secondary"
                    >
                      No
                    </Button>
                    <Button onClick={() => void submit()}>Yes</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="bg-bc-light-gray flex justify-end gap-3 border-t px-6 py-4">
          <Button
            disabled={isSaving}
            onClick={submitted ? onClose : onClose}
            variant="secondary"
          >
            {submitted ? 'Done' : 'Cancel'}
          </Button>
          {!submitted && (
            <Button
              disabled={isSaving || !status}
              onClick={() =>
                status === 'written' ? setConfirm(true) : void submit()
              }
            >
              Submit
            </Button>
          )}
        </div>
      </Dialog>
    </Modal>
  )
}
