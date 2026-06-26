import { format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns'

import { officeDateToUtcIso } from '@/lib/datetime'

import type { Csr, Exam, ExamType, Invigilator, Office } from '@/api/schemas'

export type ExamSetup =
  | 'challenger'
  | 'group'
  | 'individual'
  | 'other'
  | 'pesticide'

export type ExamTypeFilter = 'all' | 'group' | 'individual'
export type QuickActionFilter =
  | ''
  | 'all'
  | 'awaiting_receipt'
  | 'awaiting_upload'
  | 'expired'
  | 'oemai'
  | 'ready'
  | 'require_attention'
  | 'returned'

export interface ExamFilters {
  examType: ExamTypeFilter
  officeNumber: number | string
  quickAction: QuickActionFilter
  search: string
  showAllPesticide: boolean
}

export interface ExamPermissions {
  canAddGroup: boolean
  canAddPesticide: boolean
  canGenerateFinancialReport: boolean
  canManageOtherOffices: boolean
  canSeeMonthlySessionOption: boolean
  isFinancialDesignate: boolean
  isIta2Designate: boolean
  isOfficeManager: boolean
  isPesticideDesignate: boolean
  roleCode: string | null
}

export interface ExamStatus {
  color: string
  label: string
  rank: number
  tone: 'attention' | 'done' | 'pending' | 'ready'
}

export interface ExamDraft {
  candidates?: Array<Record<string, unknown>>
  event_id?: string
  exam_method?: string
  exam_name?: string
  exam_received_date?: string | null
  exam_time?: string
  exam_type_id?: number
  examinee_email?: string
  examinee_name?: string
  examinee_phone?: string
  expiry_date?: string
  fees?: string
  ind_or_group?: 'group' | 'individual'
  invigilator_id?: number
  notes?: string
  number_of_students?: number
  office_id?: number
  offsite_location?: string
  on_or_off?: 'off' | 'on'
  payee_email?: string
  payee_name?: string
  payee_phone?: string
  receipt?: string
  receipt_number?: string
  sbc_managed?: 'non-sbc' | 'sbc'
}

export function getExamPermissions(csr: Csr): ExamPermissions {
  const roleCode = csr.role?.role_code ?? null
  const isOfficeManager = csr.office_manager === 1
  const isIta2Designate = csr.ita2_designate === 1
  const isPesticideDesignate = csr.pesticide_designate === 1
  const isFinancialDesignate = csr.finance_designate === 1

  return {
    canAddGroup: isIta2Designate,
    canAddPesticide: isPesticideDesignate,
    canGenerateFinancialReport:
      isFinancialDesignate || roleCode === 'GA' || isOfficeManager,
    canManageOtherOffices: isIta2Designate || isPesticideDesignate,
    canSeeMonthlySessionOption: roleCode === 'GA' || isOfficeManager,
    isFinancialDesignate,
    isIta2Designate,
    isOfficeManager,
    isPesticideDesignate,
    roleCode,
  }
}

export function canDeleteExam(exam: Exam, permissions: ExamPermissions) {
  if (isPesticideExam(exam)) {
    return permissions.isPesticideDesignate
  }

  return (
    permissions.isOfficeManager ||
    permissions.roleCode === 'GA' ||
    permissions.isIta2Designate
  )
}

export function isGroupExam(exam: Exam) {
  return (
    exam.exam_type?.exam_type_name === 'Monthly Session Exam' ||
    exam.exam_type?.group_exam_ind === 1 ||
    Number(exam.number_of_students ?? 0) > 1
  )
}

export function isPesticideExam(exam: Exam) {
  return exam.is_pesticide === 1 || exam.exam_type?.pesticide_exam_ind === 1
}

export function isMonthlySessionExam(exam: Exam) {
  return exam.exam_type?.exam_type_name === 'Monthly Session Exam'
}

export function examTypeForEdit(exam: Exam): ExamSetup {
  if (isMonthlySessionExam(exam)) {
    return 'challenger'
  }

  if (isPesticideExam(exam)) {
    return 'pesticide'
  }

  if (exam.exam_type?.group_exam_ind === 1) {
    return 'group'
  }

  if (exam.exam_type?.ita_ind === 1) {
    return 'individual'
  }

  return 'other'
}

export function requiredInvigilatorCount(exam: Exam) {
  return Math.ceil(Number(exam.number_of_students ?? 0) / 24)
}

export function hasEnoughInvigilators(exam: Exam) {
  const invigilators = getBookingInvigilatorIds(exam)
  const required = requiredInvigilatorCount(exam)

  if (exam.exam_type?.group_exam_ind === 1 || isMonthlySessionExam(exam)) {
    return invigilators.length >= required
  }

  if (exam.booking && exam.exam_type?.group_exam_ind === 0) {
    return invigilators.length > 0 || exam.booking.sbc_staff_invigilated === 1
  }

  return false
}

export function isExpired(exam: Exam, now = new Date()) {
  if (!exam.expiry_date || exam.exam_returned_date) {
    return false
  }

  return isBefore(startOfDay(parseDate(exam.expiry_date)), startOfDay(now))
}

export function isPastScheduledExam(exam: Exam, now = new Date()) {
  if (!exam.booking?.start_time) {
    return false
  }

  return isBefore(
    startOfDay(parseDate(exam.booking.start_time)),
    startOfDay(now),
  )
}

export function getExamStatus(exam: Exam, now = new Date()): ExamStatus {
  if (
    isPesticideExam(exam) &&
    !exam.exam_received_date &&
    !exam.exam_returned_date
  ) {
    return {
      color: '#d8292f',
      label: 'Requires attention',
      rank: 4,
      tone: 'attention',
    }
  }

  if (exam.exam_returned_date) {
    return {
      color: '#4e9de0',
      label: 'Returned',
      rank: 1,
      tone: 'done',
    }
  }

  if (exam.booking?.invigilator?.deleted) {
    return {
      color: '#d8292f',
      label: 'Requires attention',
      rank: 4,
      tone: 'attention',
    }
  }

  if (isMonthlySessionExam(exam)) {
    if (!exam.booking || !hasEnoughInvigilators(exam) || isExpired(exam, now)) {
      return attentionStatus()
    }

    if (isPastScheduledExam(exam, now)) {
      return attentionStatus()
    }

    if (
      exam.number_of_students == null ||
      !exam.event_id ||
      !exam.exam_received_date
    ) {
      return pendingStatus()
    }

    return readyStatus()
  }

  if (exam.exam_type?.group_exam_ind === 1) {
    if (!exam.booking || !hasEnoughInvigilators(exam) || isExpired(exam, now)) {
      return attentionStatus()
    }

    if (isPastScheduledExam(exam, now)) {
      return attentionStatus()
    }

    if (!exam.exam_received_date) {
      return pendingStatus()
    }

    return readyStatus()
  }

  if (isExpired(exam, now) || isPastScheduledExam(exam, now)) {
    return attentionStatus()
  }

  if (!exam.booking || !exam.exam_received_date) {
    return pendingStatus()
  }

  if (isPesticideExam(exam) && exam.exam_received_date && !exam.receipt) {
    return {
      color: '#2e8540',
      label: 'Fee pending',
      rank: 2,
      tone: 'pending',
    }
  }

  return readyStatus()
}

export function stillRequires(exam: Exam) {
  const output: string[] = []

  if (exam.exam_returned_date) {
    return output
  }

  if (!exam.booking) {
    output.push('Scheduling and Assignment of Invigilator')
  }

  if (!exam.exam_received_date) {
    output.push(
      isPesticideExam(exam) ? 'Print Materials' : 'Receipt of Materials',
    )
  }

  if (isMonthlySessionExam(exam)) {
    if (!exam.number_of_students) {
      output.push('Number of Students')
    }
    if (!exam.event_id) {
      output.push('Event ID')
    }
  }

  if (exam.booking) {
    const current = exam.booking.invigilators?.length ?? 0
    const required = requiredInvigilatorCount(exam)

    if (exam.exam_type?.group_exam_ind === 1 || isMonthlySessionExam(exam)) {
      if (current === 0 && required === 1) {
        output.push('Assignment of Invigilator')
      } else if (current === 0 && required > 1) {
        output.push('Assignment of Invigilators')
      } else if (current > 0 && current < required) {
        output.push('Assignment of More Invigilators')
      }
    } else if (
      exam.exam_type?.group_exam_ind === 0 &&
      current === 0 &&
      exam.booking.sbc_staff_invigilated !== 1
    ) {
      output.push('Assignment of Invigilator')
    }
  }

  return output
}

export function readyDetails(
  exam: Exam,
  invigilators: Invigilator[] = [],
): Record<string, string> {
  const output: Record<string, string> = {}

  if (exam.exam_returned_date) {
    return {
      Disposition: exam.exam_returned_tracking_number ?? '',
      Returned: formatDate(exam.exam_returned_date),
      Written: exam.exam_written_ind === 1 ? 'Yes' : 'No',
    }
  }

  if (exam.offsite_location && exam.offsite_location !== '_offsite') {
    output.Location = exam.offsite_location
  }

  if (exam.booking?.sbc_staff_invigilated === 1) {
    output.Invigilator = 'SBC Employee'
  }

  const ids = getBookingInvigilatorIds(exam)
  const names = ids
    .map((id) => invigilators.find((item) => item.invigilator_id === id))
    .filter((item): item is Invigilator => Boolean(item))
    .map((item) => item.invigilator_name)

  if (names.length > 0) {
    output.Invigilators = names.join(', ')
  }

  if (exam.booking?.room?.room_name) {
    output.Room = exam.booking.room.room_name
  }

  return output
}

export function filterExams({
  exams,
  filters,
  homeOfficeNumber,
  now = new Date(),
}: {
  exams: Exam[]
  filters: ExamFilters
  homeOfficeNumber: number
  now?: Date
}) {
  const officeNumber =
    filters.officeNumber === 'default' ? homeOfficeNumber : filters.officeNumber
  const term = filters.search.trim().toLowerCase()
  let filtered = filters.showAllPesticide
    ? exams
    : exams.filter(
        (exam) => String(exam.office?.office_number) === String(officeNumber),
      )

  if (filters.examType === 'individual') {
    filtered = filtered.filter((exam) => !isGroupExam(exam))
  } else if (filters.examType === 'group') {
    filtered = filtered.filter(isGroupExam)
  }

  if (filters.quickAction === 'returned') {
    filtered = filtered.filter((exam) => Boolean(exam.exam_returned_date))
  } else if (filters.quickAction === 'expired') {
    filtered = filtered.filter(
      (exam) => isExpired(exam, now) && !exam.exam_returned_date,
    )
  } else if (filters.quickAction === 'ready') {
    filtered = filtered.filter(
      (exam) =>
        getExamStatus(exam, now).tone === 'ready' && !exam.exam_returned_date,
    )
  } else if (filters.quickAction === 'require_attention') {
    filtered = filtered.filter(
      (exam) =>
        ['attention', 'pending'].includes(getExamStatus(exam, now).tone) &&
        !exam.exam_returned_date,
    )
  } else if (filters.quickAction === 'oemai') {
    filtered = filtered.filter(
      (exam) =>
        !exam.exam_returned_date &&
        (isExpired(exam, now) ||
          (isGroupExam(exam) && !hasEnoughInvigilators(exam)) ||
          (isPesticideExam(exam) && !exam.exam_received_date) ||
          isPastScheduledExam(exam, now)),
    )
  } else if (filters.quickAction === 'awaiting_upload') {
    filtered = filtered.filter(
      (exam) =>
        !exam.exam_returned_date &&
        isPesticideExam(exam) &&
        exam.upload_received_ind !== 1,
    )
  } else if (filters.quickAction === 'awaiting_receipt') {
    filtered = filtered.filter(
      (exam) =>
        !exam.exam_returned_date &&
        isPesticideExam(exam) &&
        exam.receipt_sent_ind !== 1,
    )
  } else if (filters.quickAction === '') {
    filtered = filtered.filter((exam) => !exam.exam_returned_date)
  }

  if (term) {
    filtered = filtered.filter((exam) =>
      JSON.stringify(exam).toLowerCase().includes(term),
    )
  }

  return filtered
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  return format(parseDate(value), 'EEE MMM dd, yyyy')
}

export function dateInputValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return format(parseDate(value), 'yyyy-MM-dd')
}

export function todayDateInputValue(now = new Date()) {
  return format(now, 'yyyy-MM-dd')
}

export function toUtcDateIso(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return `${value}T00:00:00Z`
}

export function shouldBlockScheduling(exam: Exam, now = new Date()) {
  return Boolean(exam.expiry_date) && isExpired(exam, now)
}

export function buildExamPayload({
  draft,
  examTypes,
  office,
  setup,
}: {
  draft: ExamDraft
  examTypes: ExamType[]
  office: Office
  setup: ExamSetup
}) {
  const payload: Record<string, unknown> = {
    ...draft,
    exam_returned_ind: 0,
    office_id: draft.office_id ?? office.office_id,
  }

  delete payload.exam_time
  delete payload.on_or_off
  delete payload.sbc_managed

  if (draft.expiry_date) {
    payload.expiry_date = toUtcDateIso(draft.expiry_date)
  }

  if (draft.exam_received_date) {
    payload.exam_received_date = toUtcDateIso(draft.exam_received_date)
  }

  if (draft.notes == null) {
    payload.notes = ''
  }

  if (setup === 'challenger') {
    payload.examinee_name = 'Monthly Session'
    payload.exam_method = 'paper'
    payload.exam_type_id = examTypes.find(
      (type) => type.exam_type_name === 'Monthly Session Exam',
    )?.exam_type_id
  } else if (setup === 'group') {
    payload.examinee_name = 'group exam'
  } else if (setup === 'pesticide') {
    payload.exam_name = 'Environment'
    payload.is_pesticide = 1
    payload.number_of_students =
      draft.ind_or_group === 'group' ? draft.number_of_students : 1
    payload.receipt = draft.receipt ?? draft.receipt_number
    payload.sbc_managed_ind = draft.sbc_managed === 'sbc' ? 1 : 0
    payload.payee_ind = draft.payee_name || draft.payee_email ? 1 : 0

    if (draft.ind_or_group === 'group') {
      payload.candidates = draft.candidates ?? []
      payload.exam_type_id =
        draft.exam_type_id ??
        examTypes.find(
          (type) =>
            type.group_exam_ind && !type.ita_ind && !type.pesticide_exam_ind,
        )?.exam_type_id
    }
  } else {
    payload.number_of_students = 1
    if (draft.on_or_off === 'off') {
      payload.offsite_location = '_offsite'
    }
  }

  return payload
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function parseDate(value: string) {
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed
}

export function getBookingInvigilatorIds(exam: Exam) {
  return (exam.booking?.invigilators ?? [])
    .map((item) => (typeof item === 'number' ? item : item.invigilator_id))
    .filter((item): item is number => typeof item === 'number')
}

function attentionStatus(): ExamStatus {
  return {
    color: '#d8292f',
    label: 'Requires attention',
    rank: 4,
    tone: 'attention',
  }
}

function pendingStatus(): ExamStatus {
  return {
    color: '#fcba19',
    label: 'Pending',
    rank: 3,
    tone: 'pending',
  }
}

function readyStatus(): ExamStatus {
  return {
    color: '#2e8540',
    label: 'Ready',
    rank: 2,
    tone: 'ready',
  }
}

export function sameDayOrAfterToday(value: string | null | undefined) {
  if (!value) {
    return true
  }

  const date = startOfDay(parseDate(value))
  const today = startOfDay(new Date())

  return isSameDay(date, today) || !isBefore(date, today)
}

export function buildBookingPayload({
  draft,
  examName,
  examType,
  office,
}: {
  draft: ExamDraft
  examName: string
  examType?: ExamType
  office: Office
}) {
  const date = draft.expiry_date || todayDateInputValue()
  const time = draft.exam_time || '09:00'
  const start = new Date(`${date}T${time}`)
  const hours =
    setupDurationHours(examType) ||
    (draft.ind_or_group === 'group' || Number(draft.number_of_students ?? 0) > 1
      ? 3
      : 1)
  const end = new Date(start.getTime() + hours * 60 * 60000)

  return {
    booking_name: examName,
    end_time: officeDateToUtcIso(end, office.timezone.timezone_name),
    fees: 'false',
    invigilator_id: draft.invigilator_id ? [draft.invigilator_id] : undefined,
    office_id: draft.office_id ?? office.office_id,
    start_time: officeDateToUtcIso(start, office.timezone.timezone_name),
  }
}

function setupDurationHours(examType?: ExamType) {
  return Number(examType?.number_of_hours ?? 0)
}

export function setupLabel(setup: ExamSetup) {
  switch (setup) {
    case 'challenger':
      return 'Monthly Session'
    case 'group':
      return 'Group'
    case 'individual':
      return 'SkilledTradesBC'
    case 'pesticide':
      return 'Environment'
    default:
      return 'Other'
  }
}
