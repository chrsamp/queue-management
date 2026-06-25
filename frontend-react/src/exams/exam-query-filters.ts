import type {
  ExamFilters,
  ExamTypeFilter,
  QuickActionFilter,
} from './exam-utils'

const examTypeFilters = ['all', 'group', 'individual'] as const
const quickActionFilters = [
  '',
  'all',
  'awaiting_receipt',
  'awaiting_upload',
  'expired',
  'oemai',
  'ready',
  'require_attention',
  'returned',
] as const

export function getInitialExamFilters(
  searchParams: URLSearchParams,
): ExamFilters {
  const examType = searchParams.get('examType')
  const quickAction = searchParams.get('quickAction')
  const parsedQuickAction = quickActionFilters.includes(
    quickAction as QuickActionFilter,
  )
    ? (quickAction as QuickActionFilter)
    : ''

  return {
    examType: examTypeFilters.includes(examType as ExamTypeFilter)
      ? (examType as ExamTypeFilter)
      : 'all',
    officeNumber: 'default',
    quickAction: parsedQuickAction,
    search: '',
    showAllPesticide: parsedQuickAction === 'awaiting_receipt',
  }
}
