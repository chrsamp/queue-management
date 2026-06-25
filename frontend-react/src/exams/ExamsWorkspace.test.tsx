import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiProvider } from '@/api/ApiProvider'
import type { ApiClient } from '@/api/client'
import type {
  Booking,
  Csr,
  Exam,
  ExamType,
  Invigilator,
  Office,
} from '@/api/schemas'

import {
  createBooking,
  createExam,
  deleteBooking,
  deleteExam,
  downloadExamDocument,
  downloadExamExport,
  emailExamInvigilator,
  getExamTypes,
  getExams,
  getInvigilators,
  getOffices,
  getOffsiteInvigilators,
  refreshBcmpExamStatus,
  requestBcmpExam,
  updateBooking,
  updateExam,
  updateInvigilatorShadowCount,
  uploadCompletedExamDocument,
} from '@/api/endpoints'

import { getInitialExamFilters } from './exam-query-filters'
import ExamsWorkspace from './ExamsWorkspace'

vi.mock('@/api/endpoints', () => ({
  createBooking: vi.fn(),
  createExam: vi.fn(),
  deleteBooking: vi.fn(),
  deleteExam: vi.fn(),
  downloadExamDocument: vi.fn(),
  downloadExamExport: vi.fn(),
  emailExamInvigilator: vi.fn(),
  getExamTypes: vi.fn(),
  getExams: vi.fn(),
  getInvigilators: vi.fn(),
  getOffices: vi.fn(),
  getOffsiteInvigilators: vi.fn(),
  refreshBcmpExamStatus: vi.fn(),
  requestBcmpExam: vi.fn(),
  updateBooking: vi.fn(),
  updateExam: vi.fn(),
  updateInvigilatorShadowCount: vi.fn(),
  uploadCompletedExamDocument: vi.fn(),
}))

const office = {
  office_id: 10,
  office_name: 'Victoria',
  office_number: 94,
  timezone: { timezone_id: 1, timezone_name: 'America/Vancouver' },
} as Office

const csr = {
  csr_id: 1,
  csr_state_id: 1,
  counter: 1,
  counter_id: 1,
  finance_designate: 0,
  ita2_designate: 1,
  office_id: office.office_id,
  office_manager: 0,
  pesticide_designate: 0,
  qt_xn_csr_ind: 0,
  receptionist_ind: 0,
  role: { role_code: 'CSR', role_id: 1 },
  role_id: 1,
  username: 'exam.user',
} as Csr

const singleType = {
  exam_type_id: 2,
  exam_type_name: 'Single Exam',
  group_exam_ind: 0,
  ita_ind: 1,
  number_of_hours: 3,
  number_of_minutes: 0,
  pesticide_exam_ind: 0,
} as ExamType

const alternateSingleType = {
  ...singleType,
  exam_type_id: 3,
  exam_type_name: 'Single Exam Alternate',
} as ExamType

const groupType = {
  exam_type_id: 10,
  exam_type_name: 'Group Exam',
  group_exam_ind: 1,
  ita_ind: 1,
  number_of_hours: 3,
  number_of_minutes: 0,
  pesticide_exam_ind: 0,
} as ExamType

const invigilator = {
  invigilator_id: 7,
  invigilator_name: 'Alex Invigilator',
  shadow_count: 2,
} as Invigilator

const singleExam = {
  booking: null,
  booking_id: null,
  event_id: 'SINGLE-1',
  exam_id: 1,
  exam_method: 'paper',
  exam_name: 'Single booking',
  exam_received_date: null,
  exam_returned_date: null,
  exam_returned_ind: 0,
  exam_type: singleType,
  exam_type_id: singleType.exam_type_id,
  exam_written_ind: 1,
  examinee_email: 'single@example.com',
  examinee_name: 'Single Candidate',
  examinee_phone: '555-0101',
  expiry_date: '2026-07-15T00:00:00Z',
  is_pesticide: 0,
  notes: '',
  number_of_students: 1,
  office,
  office_id: office.office_id,
  offsite_location: null,
} as Exam

const groupExam = {
  booking: {
    booking_id: 50,
    booking_name: 'Group booking',
    end_time: '2026-07-20T20:00:00Z',
    invigilators: [],
    office,
    office_id: office.office_id,
    start_time: '2026-07-20T17:00:00Z',
  },
  booking_id: 50,
  event_id: 'GROUP-1',
  exam_id: 2,
  exam_method: 'paper',
  exam_name: 'Group booking',
  exam_received_date: null,
  exam_returned_date: null,
  exam_returned_ind: 0,
  exam_type: groupType,
  exam_type_id: groupType.exam_type_id,
  exam_written_ind: 1,
  examinee_name: 'group exam',
  expiry_date: null,
  is_pesticide: 0,
  notes: '',
  number_of_students: 24,
  office,
  office_id: office.office_id,
  offsite_location: null,
} as Exam

const createdBooking = {
  booking_id: 99,
  booking_name: 'Created booking',
  end_time: '2026-07-21T20:00:00Z',
  invigilators: [],
  office,
  office_id: office.office_id,
  start_time: '2026-07-21T17:00:00Z',
} as Booking

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

describe('ExamsWorkspace', () => {
  beforeEach(() => {
    vi.mocked(createBooking).mockResolvedValue(createdBooking)
    vi.mocked(createExam).mockResolvedValue({ exam_id: 99 } as Exam)
    vi.mocked(deleteBooking).mockResolvedValue(undefined)
    vi.mocked(deleteExam).mockResolvedValue(undefined)
    vi.mocked(downloadExamDocument).mockResolvedValue(new Blob(['pdf']))
    vi.mocked(downloadExamExport).mockResolvedValue(new Blob(['csv']))
    vi.mocked(emailExamInvigilator).mockResolvedValue(undefined)
    vi.mocked(getExamTypes).mockResolvedValue([
      singleType,
      alternateSingleType,
      groupType,
    ])
    vi.mocked(getExams).mockResolvedValue([singleExam, groupExam])
    vi.mocked(getInvigilators).mockResolvedValue([invigilator])
    vi.mocked(getOffices).mockResolvedValue([office])
    vi.mocked(getOffsiteInvigilators).mockResolvedValue([])
    vi.mocked(refreshBcmpExamStatus).mockResolvedValue({ exams_updated: [] })
    vi.mocked(requestBcmpExam).mockResolvedValue({})
    vi.mocked(updateBooking).mockResolvedValue({
      ...createdBooking,
      booking_id: 50,
      booking_name: 'Group booking',
      end_time: '2026-07-20T20:00:00Z',
      start_time: '2026-07-20T17:00:00Z',
    })
    vi.mocked(updateExam).mockResolvedValue({} as Exam)
    vi.mocked(updateInvigilatorShadowCount).mockResolvedValue(undefined)
    vi.mocked(uploadCompletedExamDocument).mockResolvedValue({})
  })

  test('does not carry a single exam type into a later group booking update', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await openExamDetails('Single booking', user)
    await user.selectOptions(
      screen.getByLabelText('Exam Type'),
      String(alternateSingleType.exam_type_id),
    )
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() =>
      expect(updateExam).toHaveBeenCalledWith(
        expect.anything(),
        singleExam.exam_id,
        expect.objectContaining({
          exam_type_id: alternateSingleType.exam_type_id,
        }),
      ),
    )

    await openGroupBooking(user)
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() =>
      expect(updateExam).toHaveBeenCalledWith(
        expect.anything(),
        groupExam.exam_id,
        expect.anything(),
      ),
    )
    const groupExamPayload = vi
      .mocked(updateExam)
      .mock.calls.find(
        ([, examId]) => examId === groupExam.exam_id,
      )?.[2] as Record<string, unknown>

    expect(groupExamPayload).toBeDefined()
    expect(groupExamPayload).not.toHaveProperty('exam_type_id')
    expect(groupExamPayload).not.toMatchObject({
      exam_type_id: alternateSingleType.exam_type_id,
    })
  })
})

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <ApiProvider client={{} as ApiClient}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExamsWorkspace csr={csr} office={office} />
        </MemoryRouter>
      </QueryClientProvider>
    </ApiProvider>,
  )
}

async function openExamDetails(
  examName: string,
  user: ReturnType<typeof userEvent.setup>,
) {
  const row = await findExamRow(examName)
  await user.click(
    within(row).getByRole('button', { name: 'Edit/Print Exam Details' }),
  )
  expect(
    await screen.findByRole('heading', { name: 'Edit/Print Exam Details' }),
  ).toBeVisible()
}

async function openGroupBooking(user: ReturnType<typeof userEvent.setup>) {
  const row = await findExamRow('Group booking')
  await user.click(
    within(row).getByRole('button', {
      name: 'Edit/Print/Add Invigilator',
    }),
  )
  expect(
    await screen.findByRole('heading', {
      name: 'Edit Group Exam Booking',
    }),
  ).toBeVisible()
}

async function findExamRow(examName: string) {
  await screen.findByText(examName)

  const row = screen
    .getAllByRole('row')
    .find((item) => item.textContent?.includes(examName))

  if (!row) {
    throw new Error(`Could not find exam row for ${examName}`)
  }

  return row
}
