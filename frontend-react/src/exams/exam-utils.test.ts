import { describe, expect, test } from 'vitest'

import type { Csr, Exam, Invigilator } from '@/api/schemas'

import {
  canDeleteExam,
  filterExams,
  getExamPermissions,
  getExamStatus,
  hasEnoughInvigilators,
  stillRequires,
} from './exam-utils'

const csr = {
  csr_id: 1,
  csr_state_id: 1,
  counter: 1,
  counter_id: 1,
  finance_designate: 0,
  ita2_designate: 1,
  office_id: 10,
  office_manager: 0,
  pesticide_designate: 0,
  qt_xn_csr_ind: 0,
  receptionist_ind: 0,
  role: { role_code: 'CSR', role_id: 1 },
  role_id: 1,
  username: 'exam.user',
} as Csr

const baseExam = {
  booking: null,
  booking_id: null,
  event_id: 'EVT1',
  exam_id: 1,
  exam_method: 'paper',
  exam_name: 'COFQ',
  exam_received_date: null,
  exam_returned_date: null,
  exam_type: {
    exam_type_id: 2,
    exam_type_name: 'Single Exam',
    group_exam_ind: 0,
    ita_ind: 1,
    number_of_hours: 3,
    pesticide_exam_ind: 0,
  },
  exam_type_id: 2,
  examinee_name: 'Pat',
  expiry_date: '2026-07-15T00:00:00Z',
  is_pesticide: 0,
  number_of_students: 1,
  office: {
    office_id: 10,
    office_name: 'Victoria',
    office_number: 94,
    timezone: { timezone_id: 1, timezone_name: 'America/Vancouver' },
  },
  office_id: 10,
} as Exam

describe('exam permissions', () => {
  test('allows ITA2 designates to delete non-pesticide exams', () => {
    expect(canDeleteExam(baseExam, getExamPermissions(csr))).toBe(true)
  })

  test('limits pesticide exam deletion to pesticide designates', () => {
    const pesticide = {
      ...baseExam,
      is_pesticide: 1,
      exam_type: { ...baseExam.exam_type, pesticide_exam_ind: 1 },
    } as Exam

    expect(canDeleteExam(pesticide, getExamPermissions(csr))).toBe(false)
    expect(
      canDeleteExam(
        pesticide,
        getExamPermissions({ ...csr, pesticide_designate: 1 } as Csr),
      ),
    ).toBe(true)
  })
})

describe('exam status and filters', () => {
  test('marks unscheduled individual exams as pending and requiring scheduling', () => {
    expect(getExamStatus(baseExam).tone).toBe('pending')
    expect(stillRequires(baseExam)).toContain(
      'Scheduling and Assignment of Invigilator',
    )
  })

  test('marks scheduled/received exams with invigilation as ready', () => {
    const invigilator = {
      invigilator_id: 4,
      invigilator_name: 'Alex',
    } as Invigilator
    const exam = {
      ...baseExam,
      booking: {
        booking_id: 5,
        booking_name: 'COFQ',
        end_time: '2026-07-10T19:00:00Z',
        invigilators: [invigilator],
        office: baseExam.office,
        office_id: 10,
        start_time: '2026-07-10T16:00:00Z',
      },
      booking_id: 5,
      exam_received_date: '2026-07-01T00:00:00Z',
    } as Exam

    expect(hasEnoughInvigilators(exam)).toBe(true)
    expect(getExamStatus(exam).tone).toBe('ready')
  })

  test('preserves quick action filtering for returned and expired exams', () => {
    const returned = {
      ...baseExam,
      exam_id: 2,
      exam_returned_date: '2026-06-01T00:00:00Z',
    } as Exam
    const expired = {
      ...baseExam,
      exam_id: 3,
      expiry_date: '2026-01-01T00:00:00Z',
    } as Exam

    expect(
      filterExams({
        exams: [baseExam, returned, expired],
        filters: {
          examType: 'all',
          officeNumber: 'default',
          quickAction: 'returned',
          search: '',
          showAllPesticide: false,
        },
        homeOfficeNumber: 94,
        now: new Date('2026-06-24T12:00:00Z'),
      }).map((exam) => exam.exam_id),
    ).toEqual([2])

    expect(
      filterExams({
        exams: [baseExam, returned, expired],
        filters: {
          examType: 'all',
          officeNumber: 'default',
          quickAction: 'expired',
          search: '',
          showAllPesticide: false,
        },
        homeOfficeNumber: 94,
        now: new Date('2026-06-24T12:00:00Z'),
      }).map((exam) => exam.exam_id),
    ).toEqual([3])
  })
})
