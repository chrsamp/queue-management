import type { Exam } from '@/api/schemas'

import type { ExamSetup } from './exam-utils'

export type ActiveExamModal =
  | {
      exam: Exam
      type: 'delete' | 'edit' | 'group-booking' | 'return' | 'upload'
    }
  | { type: 'add'; setup: ExamSetup }
  | { type: 'financial-report' }
  | { exam: Exam; type: 'select-invigilator' }
  | null
