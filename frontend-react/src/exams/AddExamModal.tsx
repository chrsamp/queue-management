import { useState } from 'react'

import type { Exam, ExamType, Invigilator, Office } from '@/api/schemas'
import ModalLayout from '@/components/ModalLayout'
import { getErrorMessage } from '@/lib/errors'

import CandidateEditor from './CandidateEditor'
import {
  Alert,
  ModalFooter,
  ModalHeader,
  SelectField,
  TextAreaField,
  TextField,
} from './ExamModalFields'
import {
  buildBookingPayload,
  buildExamPayload,
  setupLabel,
  todayDateInputValue,
  type ExamDraft,
  type ExamSetup,
} from './exam-utils'
import { useAddExamMutation } from './exam-mutations'

export default function AddExamModal({
  examTypes,
  office,
  offices,
  offsiteInvigilators,
  onClose,
  onSaved,
  setup,
}: {
  examTypes: ExamType[]
  office: Office
  offices: Office[]
  offsiteInvigilators: Invigilator[]
  onClose: () => void
  onSaved: () => Promise<void>
  setup: ExamSetup
}) {
  const [draft, setDraft] = useState<ExamDraft>({
    exam_method: 'paper',
    fees: 'collect',
    ind_or_group: setup === 'pesticide' ? 'individual' : undefined,
    office_id: office.office_id,
    on_or_off: 'on',
    sbc_managed: 'sbc',
  })
  const [requestExam, setRequestExam] = useState(setup === 'pesticide')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const addExamMutation = useAddExamMutation()
  const isSaving = addExamMutation.isPending
  const pesticideTypes = examTypes.filter((type) => type.pesticide_exam_ind)
  const nonPesticideTypes = examTypes.filter(
    (type) =>
      type.exam_type_name !== 'Monthly Session Exam' &&
      !type.pesticide_exam_ind &&
      (setup === 'group'
        ? type.group_exam_ind
        : setup === 'individual'
          ? type.ita_ind && !type.group_exam_ind
          : !type.ita_ind && !type.group_exam_ind),
  )
  const candidateCount = Number(draft.number_of_students ?? 0)

  function update(updates: Partial<ExamDraft>) {
    setDraft((current) => ({ ...current, ...updates }))
  }

  function validate() {
    if (
      setup !== 'challenger' &&
      !draft.exam_type_id &&
      setup !== 'pesticide'
    ) {
      return 'Exam Type is required.'
    }

    if (!draft.exam_name && setup !== 'pesticide') {
      return 'Exam Name is required.'
    }

    if (
      ['challenger', 'group'].includes(setup) ||
      (setup === 'pesticide' && draft.ind_or_group === 'group')
    ) {
      if (!draft.expiry_date || !draft.exam_time) {
        return 'Exam date and time are required.'
      }
    }

    if (setup === 'individual' || setup === 'other') {
      if (!draft.expiry_date) {
        return 'Exam Expiry Date is required.'
      }
    }

    if (setup === 'pesticide' && draft.sbc_managed === 'non-sbc') {
      if (!draft.offsite_location || !draft.invigilator_id) {
        return 'Location and invigilator are required.'
      }
    }

    return null
  }

  async function handleSubmit() {
    const validation = validate()
    if (validation) {
      setErrorMessage(validation)
      return
    }

    setErrorMessage(null)

    try {
      const payload = buildExamPayload({ draft, examTypes, office, setup })
      const shouldCreateBooking =
        setup === 'challenger' ||
        setup === 'group' ||
        (setup === 'pesticide' &&
          (draft.ind_or_group === 'group' || draft.sbc_managed === 'non-sbc'))
      const examType = examTypes.find(
        (type) => type.exam_type_id === Number(payload.exam_type_id),
      )
      const buildCreatedExamBookingPayload = (exam: Exam) =>
        shouldCreateBooking
          ? buildBookingPayload({
              draft,
              examName: exam.exam_name ?? String(payload.exam_name ?? ''),
              examType: exam.exam_type,
              office,
            })
          : null

      if (setup === 'pesticide' && requestExam) {
        if (draft.ind_or_group === 'group') {
          payload.bookdata = buildBookingPayload({
            draft,
            examName: String(payload.exam_name ?? 'Environment'),
            examType,
            office,
          })
        }
      }

      await addExamMutation.mutateAsync({
        buildBookingPayload: buildCreatedExamBookingPayload,
        emailInvigilator: draft.sbc_managed === 'non-sbc',
        payload,
        requestExam: setup === 'pesticide' && requestExam,
      })

      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to add exam.'))
    }
  }

  return (
    <ModalLayout
      className="max-w-3xl"
      closeDisabled={isSaving}
      footer={
        <ModalFooter isSaving={isSaving} onSubmit={() => void handleSubmit()} />
      }
      header={<ModalHeader title={`Add ${setupLabel(setup)} Exam`} />}
      onClose={onClose}
    >
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {errorMessage && <Alert message={errorMessage} />}
        {setup === 'pesticide' && (
          <>
            <SelectField
              label="Individual or Group Exam?"
              onChange={(value) =>
                update({ ind_or_group: value as 'group' | 'individual' })
              }
              value={draft.ind_or_group ?? 'individual'}
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </SelectField>
            <SelectField
              label="SBC or Invigilator Managed?"
              onChange={(value) =>
                update({ sbc_managed: value as 'non-sbc' | 'sbc' })
              }
              value={draft.sbc_managed ?? 'sbc'}
            >
              <option value="non-sbc">Non-SBC Managed Exam</option>
              <option value="sbc">SBC Managed Exam</option>
            </SelectField>
            {draft.ind_or_group === 'individual' && (
              <SelectField
                label="Type of Environment Exam"
                onChange={(value) => update({ exam_type_id: Number(value) })}
                value={draft.exam_type_id ?? ''}
              >
                <option value="">Select exam type</option>
                {pesticideTypes.map((type) => (
                  <option key={type.exam_type_id} value={type.exam_type_id}>
                    {type.exam_type_name}
                  </option>
                ))}
              </SelectField>
            )}
          </>
        )}
        {setup !== 'challenger' && setup !== 'pesticide' && (
          <SelectField
            label="Exam Type"
            onChange={(value) => update({ exam_type_id: Number(value) })}
            value={draft.exam_type_id ?? ''}
          >
            <option value="">Select exam type</option>
            {nonPesticideTypes.map((type) => (
              <option key={type.exam_type_id} value={type.exam_type_id}>
                {type.exam_type_name}
              </option>
            ))}
          </SelectField>
        )}
        {(setup === 'group' ||
          (setup === 'pesticide' && draft.sbc_managed === 'sbc')) && (
          <SelectField
            label="Office"
            onChange={(value) => update({ office_id: Number(value) })}
            value={draft.office_id ?? office.office_id}
          >
            <option value={office.office_id}>{office.office_name}</option>
            {offices.map((item) => (
              <option key={item.office_id} value={item.office_id}>
                {item.office_name}
              </option>
            ))}
          </SelectField>
        )}
        {setup !== 'pesticide' && (
          <TextField
            label="Exam Name"
            maxLength={50}
            onChange={(value) => update({ exam_name: value })}
            value={draft.exam_name ?? ''}
          />
        )}
        <TextField
          label="Event ID"
          onChange={(value) => update({ event_id: value })}
          value={draft.event_id ?? ''}
        />
        {(setup === 'individual' || setup === 'other') && (
          <TextField
            label="Candidate's Name"
            onChange={(value) => update({ examinee_name: value })}
            value={draft.examinee_name ?? ''}
          />
        )}
        {setup === 'pesticide' && draft.ind_or_group === 'individual' && (
          <>
            <TextField
              label="Candidate's Name"
              onChange={(value) => update({ examinee_name: value })}
              value={draft.examinee_name ?? ''}
            />
            <TextField
              label="Candidate's Phone"
              onChange={(value) => update({ examinee_phone: value })}
              value={draft.examinee_phone ?? ''}
            />
            <TextField
              label="Candidate's Email"
              onChange={(value) => update({ examinee_email: value })}
              value={draft.examinee_email ?? ''}
            />
            <SelectField
              label="Fees"
              onChange={(value) => update({ fees: value })}
              value={draft.fees ?? 'collect'}
            >
              <option value="collect">Collect at Exam Time</option>
              <option value="paid">Paid with Liaison</option>
            </SelectField>
          </>
        )}
        {(setup === 'group' ||
          setup === 'challenger' ||
          (setup === 'pesticide' && draft.ind_or_group === 'group')) && (
          <TextField
            label="Number of Students"
            onChange={(value) => update({ number_of_students: Number(value) })}
            type="number"
            value={draft.number_of_students ?? ''}
          />
        )}
        {setup !== 'individual' && setup !== 'other' && (
          <>
            <TextField
              label="Exam Date"
              onChange={(value) => update({ expiry_date: value })}
              type="date"
              value={draft.expiry_date ?? ''}
            />
            <TextField
              label="Exam Time"
              onChange={(value) => update({ exam_time: value })}
              type="time"
              value={draft.exam_time ?? ''}
            />
          </>
        )}
        {(setup === 'individual' || setup === 'other') && (
          <>
            <TextField
              label="Exam Expiry Date"
              onChange={(value) => update({ expiry_date: value })}
              type="date"
              value={draft.expiry_date ?? ''}
            />
            <SelectField
              label="Exam Received?"
              onChange={(value) =>
                update({
                  exam_received_date:
                    value === 'yes' ? todayDateInputValue() : null,
                })
              }
              value={draft.exam_received_date ? 'yes' : 'no'}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </SelectField>
          </>
        )}
        {setup === 'pesticide' && draft.sbc_managed === 'non-sbc' && (
          <>
            <TextField
              label="Location"
              maxLength={50}
              onChange={(value) => update({ offsite_location: value })}
              value={draft.offsite_location ?? ''}
            />
            <SelectField
              label="Invigilator"
              onChange={(value) => update({ invigilator_id: Number(value) })}
              value={draft.invigilator_id ?? ''}
            >
              <option value="">Select invigilator</option>
              {offsiteInvigilators.map((item) => (
                <option key={item.invigilator_id} value={item.invigilator_id}>
                  {item.invigilator_name}
                </option>
              ))}
            </SelectField>
          </>
        )}
        {setup === 'pesticide' &&
          draft.ind_or_group === 'group' &&
          candidateCount > 0 && (
            <div className="sm:col-span-2">
              <CandidateEditor
                count={candidateCount}
                examTypes={pesticideTypes}
                onChange={(candidates) => update({ candidates })}
              />
            </div>
          )}
        <TextAreaField
          className="sm:col-span-2"
          label="Additional Notes"
          maxLength={400}
          onChange={(value) => update({ notes: value })}
          value={draft.notes ?? ''}
        />
        {setup === 'pesticide' && (
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              checked={requestExam}
              onChange={(event) => setRequestExam(event.target.checked)}
              type="checkbox"
            />
            Request exam package from BCMP
          </label>
        )}
      </div>
    </ModalLayout>
  )
}
