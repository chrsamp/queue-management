import { describe, expect, test } from 'vitest'

import { getInitialExamFilters } from './exam-query-filters'

describe('exam workspace query filters', () => {
  test('hydrates Office Exam Manager action item filters from the URL', () => {
    expect(
      getInitialExamFilters(
        new URLSearchParams('quickAction=oemai&examType=all'),
      ),
    ).toMatchObject({
      examType: 'all',
      officeNumber: 'default',
      quickAction: 'oemai',
      search: '',
      showAllPesticide: false,
    })
  })

  test('falls back to default filters for unsupported query values', () => {
    expect(
      getInitialExamFilters(
        new URLSearchParams('quickAction=invalid&examType=invalid'),
      ),
    ).toMatchObject({
      examType: 'all',
      officeNumber: 'default',
      quickAction: '',
      search: '',
      showAllPesticide: false,
    })
  })
})
