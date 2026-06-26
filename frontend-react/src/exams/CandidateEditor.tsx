import { useState } from 'react'

import type { ExamType } from '@/api/schemas'

import { SelectField, TextField } from './ExamModalFields'

export default function CandidateEditor({
  count,
  examTypes,
  onChange,
}: {
  count: number
  examTypes: ExamType[]
  onChange: (candidates: Array<Record<string, unknown>>) => void
}) {
  const [candidates, setCandidates] = useState<Array<Record<string, unknown>>>(
    Array.from({ length: count }, () => ({})),
  )

  function update(index: number, key: string, value: unknown) {
    const next = candidates.slice(0, count)
    next[index] = { ...next[index], [key]: value }
    setCandidates(next)
    onChange(next)
  }

  return (
    <div className="grid gap-3">
      <h3 className="text-bc-h5 m-0 font-bold">Candidates</h3>
      {Array.from({ length: count }, (_, index) => (
        <div
          className="border-bc-border grid gap-2 rounded-sm border p-3 sm:grid-cols-3"
          key={index}
        >
          <TextField
            label={`Candidate ${index + 1} Name`}
            onChange={(value) => update(index, 'name', value)}
            value={String(candidates[index]?.name ?? '')}
          />
          <TextField
            label="Email"
            onChange={(value) => update(index, 'email', value)}
            value={String(candidates[index]?.email ?? '')}
          />
          <SelectField
            label="Exam Type"
            onChange={(value) => update(index, 'exam_type_id', Number(value))}
            value={String(candidates[index]?.exam_type_id ?? '')}
          >
            <option value="">Select exam type</option>
            {examTypes.map((type) => (
              <option key={type.exam_type_id} value={type.exam_type_id}>
                {type.exam_type_name}
              </option>
            ))}
          </SelectField>
        </div>
      ))}
    </div>
  )
}
