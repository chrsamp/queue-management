import { useState } from 'react'

import { downloadExamExport } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import ModalLayout from '@/components/ModalLayout'
import { getErrorMessage } from '@/lib/errors'

import {
  Alert,
  ModalFooter,
  ModalHeader,
  SelectField,
  TextField,
} from './ExamModalFields'
import { downloadBlob } from './exam-utils'

export default function FinancialReportModal({
  onClose,
}: {
  onClose: () => void
}) {
  const apiClient = useApiClient()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [examType, setExamType] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    if (!startDate || !endDate || !examType) {
      setErrorMessage('Start Date, End Date, and Exam Types are required.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const blob = await downloadExamExport(apiClient, {
        endDate,
        examType,
        startDate,
      })
      const timestamp = new Date()
        .toISOString()
        .replace(/T/, '_')
        .replace(/[-:]/g, '')
        .slice(0, 15)
      downloadBlob(blob, `export-csv-${timestamp}.csv`)
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to generate report.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ModalLayout
      closeDisabled={isSaving}
      footer={
        <ModalFooter isSaving={isSaving} onSubmit={() => void submit()} />
      }
      header={<ModalHeader title="Generate Exam Report" />}
      onClose={onClose}
    >
      <div className="grid gap-4 p-6">
        {errorMessage && <Alert message={errorMessage} />}
        <TextField
          label="Start Date"
          onChange={setStartDate}
          type="date"
          value={startDate}
        />
        <TextField
          label="End Date"
          onChange={setEndDate}
          type="date"
          value={endDate}
        />
        <SelectField label="Exam Types" onChange={setExamType} value={examType}>
          <option value="">Click for Filter Options</option>
          <option value="all_exams">All Exams</option>
          <option value="all_bookings">All Booking Events</option>
          <option value="ita">
            SkilledTradesBC Individual and Group Exams
          </option>
          <option value="all_non_ita">All Non-SkilledTradesBC Exams</option>
        </SelectField>
      </div>
    </ModalLayout>
  )
}
