import type { Exam } from '@/api/schemas'
import Button from '@/components/Button'

import {
  canDeleteExam,
  hasEnoughInvigilators,
  isGroupExam,
  isPesticideExam,
  type ExamPermissions,
} from './exam-utils'

export default function ExamActions({
  exam,
  homeOfficeNumber,
  officeFilter,
  onAction,
  permissions,
}: {
  exam: Exam
  homeOfficeNumber: number
  officeFilter: number | string
  onAction: (action: string, exam: Exam) => void
  permissions: ExamPermissions
}) {
  const sameOffice =
    officeFilter === 'default' ||
    String(officeFilter) === String(homeOfficeNumber)
  const returned = Boolean(exam.exam_returned_date)
  const canSchedule =
    !exam.booking ||
    Object.keys(exam.booking).length === 0 ||
    exam.offsite_location
  const bookingLabel = hasEnoughInvigilators(exam)
    ? 'Update Booking'
    : isGroupExam(exam) || isPesticideExam(exam)
      ? 'Edit/Print/Add Invigilator'
      : 'Add Invigilator'

  return (
    <div className="flex min-w-44 flex-wrap gap-1">
      {!returned && sameOffice && (
        <>
          {canSchedule && !exam.booking && (
            <Button
              onClick={() =>
                onAction(exam.offsite_location ? 'booking' : 'schedule', exam)
              }
              size="xsmall"
              variant="secondary"
            >
              Schedule Exam
            </Button>
          )}
          {exam.booking && (
            <Button
              onClick={() => onAction('booking', exam)}
              size="xsmall"
              variant="secondary"
            >
              {bookingLabel}
            </Button>
          )}
          {!(exam.exam_type?.group_exam_ind && isPesticideExam(exam)) && (
            <Button
              onClick={() => onAction('edit', exam)}
              size="xsmall"
              variant="secondary"
            >
              Edit/Print Exam Details
            </Button>
          )}
          <Button
            onClick={() => onAction('return', exam)}
            size="xsmall"
            variant="secondary"
          >
            {isPesticideExam(exam) ? 'Upload Exam' : 'Return Exam'}
          </Button>
          {isPesticideExam(exam) && (
            <Button
              onClick={() => onAction('invigilator', exam)}
              size="xsmall"
              variant="secondary"
            >
              Email Invigilator
            </Button>
          )}
          {canDeleteExam(exam, permissions) && (
            <Button
              danger
              onClick={() => onAction('delete', exam)}
              size="xsmall"
              variant="secondary"
            >
              Delete
            </Button>
          )}
        </>
      )}
      {!returned && !sameOffice && (
        <>
          <Button
            onClick={() => onAction('edit', exam)}
            size="xsmall"
            variant="secondary"
          >
            Edit/Print Exam Details
          </Button>
          {exam.offsite_location && (
            <Button
              onClick={() => onAction('booking', exam)}
              size="xsmall"
              variant="secondary"
            >
              Edit Booking
            </Button>
          )}
          {isPesticideExam(exam) && (
            <Button
              onClick={() => onAction('return', exam)}
              size="xsmall"
              variant="secondary"
            >
              Upload Exam
            </Button>
          )}
        </>
      )}
      {returned && sameOffice && (
        <Button
          onClick={() => onAction('return', exam)}
          size="xsmall"
          variant="secondary"
        >
          Edit Return Details
        </Button>
      )}
    </div>
  )
}
