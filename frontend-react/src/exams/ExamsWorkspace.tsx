import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'

import {
  getExamTypes,
  getExams,
  getInvigilators,
  getOffices,
  getOffsiteInvigilators,
  refreshBcmpExamStatus,
} from '@/api/endpoints'
import type { Csr, Exam, Office } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import ExamModals from './ExamModals'
import ExamsTable from './ExamsTable'
import ExamsToolbar from './ExamsToolbar'
import type { ActiveExamModal } from './exam-modal-types'
import {
  filterExams,
  formatDate,
  getExamPermissions,
  isPesticideExam,
  shouldBlockScheduling,
  type ExamFilters,
  type ExamTypeFilter,
  type QuickActionFilter,
} from './exam-utils'
import { getInitialExamFilters } from './exam-query-filters'

const emptyExams: never[] = []
const emptyExamTypes: never[] = []
const emptyInvigilators: never[] = []
const emptyOffices: never[] = []

interface ExamsWorkspaceProps {
  csr: Csr
  office: Office
}

export default function ExamsWorkspace({ csr, office }: ExamsWorkspaceProps) {
  const apiClient = useApiClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const permissions = getExamPermissions(csr)
  const setExamSchedulingRequest = useWorkflowStore(
    (state) => state.setExamSchedulingRequest,
  )
  const [filters, setFilters] = useState<ExamFilters>(() =>
    getInitialExamFilters(searchParams),
  )
  const [activeModal, setActiveModal] = useState<ActiveExamModal>(null)
  const [pageResetToken, setPageResetToken] = useState(0)
  const [routeMessage, setRouteMessage] = useState<string | null>(null)
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false)

  const officeNumber =
    filters.officeNumber === 'default'
      ? office.office_number
      : filters.officeNumber
  const examsQuery = useQuery({
    queryFn: ({ signal }) =>
      getExams(
        apiClient,
        signal,
        filters.showAllPesticide ? null : officeNumber,
      ),
    queryKey: filters.showAllPesticide
      ? queryKeys.exams.all
      : queryKeys.exams.office(officeNumber),
  })
  const examTypesQuery = useQuery({
    queryFn: ({ signal }) => getExamTypes(apiClient, signal),
    queryKey: queryKeys.examTypes,
  })
  const invigilatorsQuery = useQuery({
    queryFn: ({ signal }) => getInvigilators(apiClient, signal),
    queryKey: queryKeys.invigilators,
  })
  const offsiteInvigilatorsQuery = useQuery({
    enabled: permissions.isPesticideDesignate,
    queryFn: ({ signal }) => getOffsiteInvigilators(apiClient, signal),
    queryKey: ['invigilators', 'offsite'],
  })
  const officesQuery = useQuery({
    enabled: permissions.canManageOtherOffices,
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })

  const exams = examsQuery.data ?? emptyExams
  const examTypes = examTypesQuery.data ?? emptyExamTypes
  const invigilators = invigilatorsQuery.data ?? emptyInvigilators
  const offsiteInvigilators = offsiteInvigilatorsQuery.data ?? emptyInvigilators
  const offices = officesQuery.data ?? emptyOffices
  const filteredExams = useMemo(
    () =>
      filterExams({
        exams,
        filters,
        homeOfficeNumber: office.office_number,
      }),
    [exams, filters, office.office_number],
  )
  const visibleExams = useMemo(
    () =>
      filters.showAllPesticide
        ? filteredExams.filter((exam) => isPesticideExam(exam))
        : filteredExams,
    [filteredExams, filters.showAllPesticide],
  )

  async function invalidateExams() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.exams.office(officeNumber),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me }),
    ])
  }

  async function handleRefreshStatus() {
    setIsRefreshingStatus(true)
    setRouteMessage(null)

    try {
      await refreshBcmpExamStatus(apiClient)
      setFilters((current) => ({
        ...current,
        officeNumber: 'pesticide_offsite',
        quickAction: 'awaiting_upload',
        showAllPesticide: false,
      }))
      await invalidateExams()
    } catch (error) {
      setRouteMessage(getErrorMessage(error, 'Unable to refresh exam status.'))
    } finally {
      setIsRefreshingStatus(false)
    }
  }

  function handleExamTypeFilter(examType: ExamTypeFilter) {
    setFilters((current) => ({
      ...current,
      examType,
      quickAction: '',
      showAllPesticide: false,
    }))
    setPageResetToken((current) => current + 1)
  }

  function handleQuickActionFilter(quickAction: QuickActionFilter) {
    if (quickAction === 'awaiting_upload') {
      void handleRefreshStatus()
      return
    }

    setFilters((current) => ({
      ...current,
      quickAction,
      showAllPesticide: quickAction === 'awaiting_receipt',
    }))
    setPageResetToken((current) => current + 1)
  }

  function handleExamAction(action: string, exam: Exam) {
    setRouteMessage(null)

    if (action === 'schedule') {
      if (shouldBlockScheduling(exam)) {
        setRouteMessage(
          `This exam has expired on ${formatDate(exam.expiry_date)}. Scheduling is not allowed.`,
        )
        return
      }
      setExamSchedulingRequest(exam)
      void navigate('/booking')
      return
    }

    if (action === 'booking') {
      setActiveModal({ exam, type: 'group-booking' })
      return
    }

    if (action === 'edit') {
      setActiveModal({ exam, type: 'edit' })
      return
    }

    if (action === 'return') {
      setActiveModal({
        exam,
        type: isPesticideExam(exam) ? 'upload' : 'return',
      })
      return
    }

    if (action === 'delete') {
      setActiveModal({ exam, type: 'delete' })
      return
    }

    if (action === 'invigilator') {
      setActiveModal({ exam, type: 'select-invigilator' })
    }
  }

  const quickActionOptions = [
    { label: 'Ready', value: 'ready' },
    { label: 'Requires Attention', value: 'require_attention' },
    ...(permissions.isOfficeManager || permissions.roleCode === 'GA'
      ? [
          {
            label: 'Office Exam Manager Action Items',
            value: 'oemai' as const,
          },
        ]
      : []),
    { label: 'Expired', value: 'expired' },
    { label: 'Returned', value: 'returned' },
    ...(permissions.isPesticideDesignate
      ? [
          { label: 'Awaiting Upload', value: 'awaiting_upload' as const },
          { label: 'Awaiting Receipt', value: 'awaiting_receipt' as const },
        ]
      : []),
    { label: 'All', value: 'all' },
  ] satisfies Array<{ label: string; value: QuickActionFilter }>

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-6">
      <ExamsToolbar
        filters={filters}
        isRefreshingStatus={isRefreshingStatus}
        office={office}
        offices={offices}
        onAdd={(setup) => setActiveModal({ setup, type: 'add' })}
        onExamTypeFilter={handleExamTypeFilter}
        onFiltersChange={(updates) =>
          setFilters((current) => ({ ...current, ...updates }))
        }
        onQuickActionFilter={handleQuickActionFilter}
        onReport={() => setActiveModal({ type: 'financial-report' })}
        permissions={permissions}
        quickActionOptions={quickActionOptions}
      />

      {(routeMessage || examsQuery.isError) && (
        <AlertBanner
          isCloseable={false}
          role="alert"
          size="small"
          variant="danger"
        >
          {routeMessage ??
            getErrorMessage(examsQuery.error, 'Unable to load exams.')}
        </AlertBanner>
      )}

      <ExamsTable
        exams={visibleExams}
        homeOfficeNumber={office.office_number}
        invigilators={invigilators}
        isLoading={examsQuery.isPending}
        officeFilter={filters.officeNumber}
        onAction={handleExamAction}
        pageResetToken={pageResetToken}
        permissions={permissions}
        showAllPesticide={filters.showAllPesticide}
      />

      <ExamModals
        activeModal={activeModal}
        examTypes={examTypes}
        invigilators={invigilators}
        office={office}
        offices={offices}
        offsiteInvigilators={offsiteInvigilators}
        onClose={() => setActiveModal(null)}
        onSaved={invalidateExams}
        onSwitchModal={setActiveModal}
        permissions={permissions}
      />
    </section>
  )
}
