import { Fragment, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'

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
import type { Csr, Exam, ExamType, Invigilator, Office } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import { officeDateToUtcIso } from '@/lib/datetime'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import Dialog, { DialogTitle } from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import {
  buildExamPayload,
  canDeleteExam,
  dateInputValue,
  downloadBlob,
  examTypeForEdit,
  filterExams,
  formatDate,
  getExamPermissions,
  getExamStatus,
  getBookingInvigilatorIds,
  hasEnoughInvigilators,
  isGroupExam,
  isMonthlySessionExam,
  isPesticideExam,
  readyDetails,
  requiredInvigilatorCount,
  shouldBlockScheduling,
  stillRequires,
  todayDateInputValue,
  toUtcDateIso,
  type ExamDraft,
  type ExamFilters,
  type ExamSetup,
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

type ActiveModal =
  | {
      exam: Exam
      type: 'delete' | 'edit' | 'group-booking' | 'return' | 'upload'
    }
  | { type: 'add'; setup: ExamSetup }
  | { type: 'financial-report' }
  | { exam: Exam; type: 'select-invigilator' }
  | null

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
  const [expandedExamId, setExpandedExamId] = useState<number | null>(null)
  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: 'status' },
  ])
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
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

  const columns: ColumnDef<Exam>[] = [
    {
      accessorKey: 'event_id',
      cell: ({ row }) => row.original.event_id || '-',
      header: 'Event ID',
    },
    {
      accessorFn: (exam) => exam.exam_type?.exam_type_name ?? '',
      cell: ({ row }) => row.original.exam_type?.exam_type_name || '-',
      header: 'Exam Type',
      id: 'exam_type_name',
    },
    {
      accessorKey: 'exam_name',
      cell: ({ row }) => row.original.exam_name || '-',
      header: 'Exam Name',
    },
    {
      accessorFn: (exam) => exam.booking?.start_time ?? '',
      cell: ({ row }) =>
        row.original.booking?.start_time
          ? formatDate(row.original.booking.start_time)
          : '-',
      header: 'Scheduled Date',
      id: 'start_time',
    },
    {
      accessorKey: 'exam_method',
      cell: ({ row }) => row.original.exam_method || '-',
      header: 'Method',
    },
    {
      accessorKey: 'expiry_date',
      cell: ({ row }) =>
        (isMonthlySessionExam(row.original) ||
          row.original.exam_type?.group_exam_ind) &&
        !shouldBlockScheduling(row.original)
          ? '-'
          : formatDate(row.original.expiry_date),
      header: 'Expiry Date',
    },
    {
      accessorFn: (exam) => (exam.exam_received_date ? 'Yes' : 'No'),
      cell: ({ row }) => (row.original.exam_received_date ? 'Yes' : 'No'),
      header: 'Received?',
      id: 'exam_received',
    },
    {
      accessorKey: 'notes',
      cell: ({ row }) => row.original.notes || '-',
      header: 'Notes',
    },
    {
      accessorFn: (exam) => getExamStatus(exam).rank,
      cell: ({ row }) => {
        const status = getExamStatus(row.original)
        return (
          <button
            aria-label={`${status.label}; show details`}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent font-bold"
            onClick={() =>
              setExpandedExamId((current) =>
                current === row.original.exam_id ? null : row.original.exam_id,
              )
            }
            style={{ color: status.color }}
            type="button"
          >
            {status.tone === 'ready'
              ? '✓'
              : status.tone === 'done'
                ? '↗'
                : status.tone === 'pending'
                  ? '!'
                  : '×'}
          </button>
        )
      },
      header: 'Status',
      id: 'status',
    },
    {
      cell: ({ row }) => (
        <ExamActions
          exam={row.original}
          homeOfficeNumber={office.office_number}
          officeFilter={filters.officeNumber}
          onAction={handleExamAction}
          permissions={permissions}
        />
      ),
      header: 'Actions',
      id: 'actions',
    },
    {
      accessorKey: 'examinee_name',
      cell: ({ row }) => row.original.examinee_name || '-',
      header: 'Candidate Name',
    },
    ...(filters.showAllPesticide
      ? [
          {
            accessorFn: (exam: Exam) => exam.office?.office_name ?? '',
            cell: ({ row }: { row: { original: Exam } }) =>
              row.original.office?.office_name || '-',
            header: 'Office',
            id: 'office',
          } satisfies ColumnDef<Exam>,
        ]
      : []),
  ]

  // TanStack Table returns imperative helpers that are intentionally not compiler-memoizable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: visibleExams,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

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
    table.setPageIndex(0)
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
    table.setPageIndex(0)
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
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <AddExamButtons
          onAdd={(setup) => setActiveModal({ setup, type: 'add' })}
          onReport={() => setActiveModal({ type: 'financial-report' })}
          permissions={permissions}
        />
      </div>

      <div className="border-bc-border bg-bc-white flex shrink-0 flex-wrap items-end gap-3 rounded-sm border p-3">
        <label className="flex flex-col gap-1">
          <span className="font-bold">Search</span>
          <input
            className="border-bc-border rounded-sm border px-3 py-2"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            value={filters.search}
          />
        </label>
        {permissions.canManageOtherOffices && (
          <label className="flex flex-col gap-1">
            <span className="font-bold">Office</span>
            <select
              className="border-bc-border rounded-sm border px-3 py-2"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  officeNumber: event.target.value,
                  showAllPesticide: false,
                }))
              }
              value={String(filters.officeNumber)}
            >
              <option value="default">
                This Office #{office.office_number} - {office.office_name}
              </option>
              {offices.map((item) => (
                <option key={item.office_id} value={item.office_number}>
                  Office #{item.office_number} - {item.office_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-bold">Exam Type Filters</span>
          <select
            className="border-bc-border rounded-sm border px-3 py-2"
            onChange={(event) =>
              handleExamTypeFilter(event.target.value as ExamTypeFilter)
            }
            value={filters.examType}
          >
            <option value="individual">Individual</option>
            <option value="group">Group</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-bold">Quick Action Filters</span>
          <select
            className="border-bc-border rounded-sm border px-3 py-2"
            disabled={isRefreshingStatus}
            onChange={(event) =>
              handleQuickActionFilter(event.target.value as QuickActionFilter)
            }
            value={filters.quickAction}
          >
            <option value="">Unreturned</option>
            {quickActionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {filters.showAllPesticide && (
          <Button
            onClick={() =>
              setFilters((current) => ({
                ...current,
                showAllPesticide: false,
              }))
            }
            variant="secondary"
          >
            This Office
          </Button>
        )}
      </div>

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

      <div className="border-bc-border min-h-0 flex-1 overflow-hidden rounded-sm border bg-white">
        <div className="h-full min-h-0 overflow-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead className="bg-bc-light-gray">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      className="border-bc-border bg-bc-light-gray sticky top-0 z-10 border-b px-3 py-2 text-sm"
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className="cursor-pointer border-0 bg-transparent p-0 text-left font-bold"
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {examsQuery.isPending ? (
                <tr>
                  <td className="p-6 text-center" colSpan={columns.length}>
                    Loading exams...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td className="p-6 text-center" colSpan={columns.length}>
                    There are no exams that match this filter criteria
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className="hover:bg-bc-light-gray"
                      onDoubleClick={() =>
                        handleExamAction('edit', row.original)
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          className="border-bc-border border-b px-3 py-2 align-top text-sm"
                          key={cell.id}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                    {expandedExamId === row.original.exam_id && (
                      <tr key={`${row.id}-details`}>
                        <td
                          className="border-bc-border bg-bc-light-gray border-b px-4 py-3"
                          colSpan={columns.length}
                        >
                          <ExamDetails
                            exam={row.original}
                            invigilators={invigilators}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-bc-light-gray flex items-center justify-between gap-3 border-t px-4 py-3">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount() || 1}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size="small"
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size="small"
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {activeModal?.type === 'add' && (
        <AddExamModal
          examTypes={examTypes}
          office={office}
          offices={offices}
          offsiteInvigilators={offsiteInvigilators}
          onClose={() => setActiveModal(null)}
          onSaved={invalidateExams}
          setup={activeModal.setup}
        />
      )}
      {activeModal?.type === 'edit' && (
        <EditExamModal
          exam={activeModal.exam}
          examTypes={examTypes}
          onClose={() => setActiveModal(null)}
          onDelete={() =>
            setActiveModal({ exam: activeModal.exam, type: 'delete' })
          }
          onSaved={invalidateExams}
          permissions={permissions}
        />
      )}
      {activeModal?.type === 'group-booking' && (
        <GroupBookingModal
          exam={activeModal.exam}
          invigilators={invigilators}
          offsiteInvigilators={offsiteInvigilators}
          onClose={() => setActiveModal(null)}
          onSaved={invalidateExams}
          permissions={permissions}
        />
      )}
      {activeModal?.type === 'return' && (
        <ReturnExamModal
          exam={activeModal.exam}
          onClose={() => setActiveModal(null)}
          onSaved={invalidateExams}
        />
      )}
      {activeModal?.type === 'upload' && (
        <UploadPesticideExamModal
          exam={activeModal.exam}
          onClose={() => setActiveModal(null)}
          onSaved={invalidateExams}
        />
      )}
      {activeModal?.type === 'delete' && (
        <DeleteExamModal
          exam={activeModal.exam}
          onClose={() => setActiveModal(null)}
          onSaved={invalidateExams}
        />
      )}
      {activeModal?.type === 'financial-report' && (
        <FinancialReportModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal?.type === 'select-invigilator' && (
        <SelectInvigilatorModal
          exam={activeModal.exam}
          invigilators={invigilators}
          onClose={() => setActiveModal(null)}
          onSaved={invalidateExams}
        />
      )}
    </section>
  )
}

function AddExamButtons({
  onAdd,
  onReport,
  permissions,
}: {
  onAdd: (setup: ExamSetup) => void
  onReport: () => void
  permissions: ReturnType<typeof getExamPermissions>
}) {
  return (
    <>
      <Button onClick={() => onAdd('individual')}>
        Add SkilledTradesBC Exam
      </Button>
      {permissions.canSeeMonthlySessionOption && (
        <Button onClick={() => onAdd('challenger')} variant="secondary">
          Add Monthly Session Exam
        </Button>
      )}
      {permissions.canAddGroup && (
        <Button onClick={() => onAdd('group')}>Add Group Exam</Button>
      )}
      <Button onClick={() => onAdd('other')}>Add Other Exam</Button>
      {permissions.canAddPesticide && (
        <Button onClick={() => onAdd('pesticide')}>Add Environment Exam</Button>
      )}
      {permissions.canGenerateFinancialReport && (
        <Button onClick={onReport}>Generate Financial Report</Button>
      )}
    </>
  )
}

function ExamActions({
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
  permissions: ReturnType<typeof getExamPermissions>
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

function ExamDetails({
  exam,
  invigilators,
}: {
  exam: Exam
  invigilators: Invigilator[]
}) {
  const requirements = stillRequires(exam)
  const details = readyDetails(exam, invigilators)

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2">
      {requirements.length > 0 && (
        <div>
          <strong>Still Requires:</strong>
          <ul className="my-1 pl-5">
            {requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <strong>Details:</strong>
        {Object.keys(details).length === 0 ? (
          <span className="ml-2">-</span>
        ) : (
          <dl className="my-1 grid grid-cols-[max-content_1fr] gap-x-2">
            {Object.entries(details).map(([key, value]) => (
              <div className="contents" key={key}>
                <dt className="font-bold">{key}:</dt>
                <dd className="m-0">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}

function AddExamModal({
  examTypes,
  office,
  offices,
  offsiteInvigilators,
  onClose,
  onSaved,
  setup,
}: {
  examTypes: ExamType[]
  office: Office
  offices: Office[]
  offsiteInvigilators: Invigilator[]
  onClose: () => void
  onSaved: () => Promise<void>
  setup: ExamSetup
}) {
  const apiClient = useApiClient()
  const [draft, setDraft] = useState<ExamDraft>({
    exam_method: 'paper',
    fees: 'collect',
    ind_or_group: setup === 'pesticide' ? 'individual' : undefined,
    office_id: office.office_id,
    on_or_off: 'on',
    sbc_managed: 'sbc',
  })
  const [requestExam, setRequestExam] = useState(setup === 'pesticide')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const pesticideTypes = examTypes.filter((type) => type.pesticide_exam_ind)
  const nonPesticideTypes = examTypes.filter(
    (type) =>
      type.exam_type_name !== 'Monthly Session Exam' &&
      !type.pesticide_exam_ind &&
      (setup === 'group'
        ? type.group_exam_ind
        : setup === 'individual'
          ? type.ita_ind && !type.group_exam_ind
          : !type.ita_ind && !type.group_exam_ind),
  )
  const candidateCount = Number(draft.number_of_students ?? 0)

  function update(updates: Partial<ExamDraft>) {
    setDraft((current) => ({ ...current, ...updates }))
  }

  function validate() {
    if (
      setup !== 'challenger' &&
      !draft.exam_type_id &&
      setup !== 'pesticide'
    ) {
      return 'Exam Type is required.'
    }

    if (!draft.exam_name && setup !== 'pesticide') {
      return 'Exam Name is required.'
    }

    if (
      ['challenger', 'group'].includes(setup) ||
      (setup === 'pesticide' && draft.ind_or_group === 'group')
    ) {
      if (!draft.expiry_date || !draft.exam_time) {
        return 'Exam date and time are required.'
      }
    }

    if (setup === 'individual' || setup === 'other') {
      if (!draft.expiry_date) {
        return 'Exam Expiry Date is required.'
      }
    }

    if (setup === 'pesticide' && draft.sbc_managed === 'non-sbc') {
      if (!draft.offsite_location || !draft.invigilator_id) {
        return 'Location and invigilator are required.'
      }
    }

    return null
  }

  async function handleSubmit() {
    const validation = validate()
    if (validation) {
      setErrorMessage(validation)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const payload = buildExamPayload({ draft, examTypes, office, setup })

      if (setup === 'pesticide' && requestExam) {
        if (draft.ind_or_group === 'group') {
          payload.bookdata = buildBookingPayload({
            draft,
            examName: String(payload.exam_name ?? 'Environment'),
            examType: examTypes.find(
              (type) => type.exam_type_id === Number(payload.exam_type_id),
            ),
            office,
          })
        }
        await requestBcmpExam(apiClient, payload)
      } else {
        const exam = await createExam(apiClient, payload)

        if (
          setup === 'challenger' ||
          setup === 'group' ||
          (setup === 'pesticide' &&
            (draft.ind_or_group === 'group' || draft.sbc_managed === 'non-sbc'))
        ) {
          const booking = await createBooking(
            apiClient,
            buildBookingPayload({
              draft,
              examName: exam.exam_name ?? String(payload.exam_name ?? ''),
              examType: exam.exam_type,
              office,
            }),
          )

          if (booking?.booking_id) {
            const updated = await updateExam(apiClient, exam.exam_id, {
              booking_id: booking.booking_id,
            })

            if (draft.sbc_managed === 'non-sbc' && updated.invigilator) {
              await emailExamInvigilator(apiClient, updated.exam_id, {
                invigilator_email: updated.invigilator.contact_email,
                invigilator_id: updated.invigilator.invigilator_id,
                invigilator_name: updated.invigilator.invigilator_name,
                invigilator_phone: updated.invigilator.contact_phone,
              })
            }
          }
        }
      }

      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to add exam.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal className="max-w-3xl overflow-hidden" isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title={`Add ${setupLabel(setup)} Exam`} />
        <div className="grid max-h-[75vh] gap-4 overflow-auto p-6 sm:grid-cols-2">
          {errorMessage && <Alert message={errorMessage} />}
          {setup === 'pesticide' && (
            <>
              <SelectField
                label="Individual or Group Exam?"
                onChange={(value) =>
                  update({ ind_or_group: value as 'group' | 'individual' })
                }
                value={draft.ind_or_group ?? 'individual'}
              >
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </SelectField>
              <SelectField
                label="SBC or Invigilator Managed?"
                onChange={(value) =>
                  update({ sbc_managed: value as 'non-sbc' | 'sbc' })
                }
                value={draft.sbc_managed ?? 'sbc'}
              >
                <option value="non-sbc">Non-SBC Managed Exam</option>
                <option value="sbc">SBC Managed Exam</option>
              </SelectField>
              {draft.ind_or_group === 'individual' && (
                <SelectField
                  label="Type of Environment Exam"
                  onChange={(value) => update({ exam_type_id: Number(value) })}
                  value={draft.exam_type_id ?? ''}
                >
                  <option value="">Select exam type</option>
                  {pesticideTypes.map((type) => (
                    <option key={type.exam_type_id} value={type.exam_type_id}>
                      {type.exam_type_name}
                    </option>
                  ))}
                </SelectField>
              )}
            </>
          )}
          {setup !== 'challenger' && setup !== 'pesticide' && (
            <SelectField
              label="Exam Type"
              onChange={(value) => update({ exam_type_id: Number(value) })}
              value={draft.exam_type_id ?? ''}
            >
              <option value="">Select exam type</option>
              {nonPesticideTypes.map((type) => (
                <option key={type.exam_type_id} value={type.exam_type_id}>
                  {type.exam_type_name}
                </option>
              ))}
            </SelectField>
          )}
          {(setup === 'group' ||
            (setup === 'pesticide' && draft.sbc_managed === 'sbc')) && (
            <SelectField
              label="Office"
              onChange={(value) => update({ office_id: Number(value) })}
              value={draft.office_id ?? office.office_id}
            >
              <option value={office.office_id}>{office.office_name}</option>
              {offices.map((item) => (
                <option key={item.office_id} value={item.office_id}>
                  {item.office_name}
                </option>
              ))}
            </SelectField>
          )}
          {setup !== 'pesticide' && (
            <TextField
              label="Exam Name"
              maxLength={50}
              onChange={(value) => update({ exam_name: value })}
              value={draft.exam_name ?? ''}
            />
          )}
          <TextField
            label="Event ID"
            onChange={(value) => update({ event_id: value })}
            value={draft.event_id ?? ''}
          />
          {(setup === 'individual' || setup === 'other') && (
            <TextField
              label="Candidate's Name"
              onChange={(value) => update({ examinee_name: value })}
              value={draft.examinee_name ?? ''}
            />
          )}
          {setup === 'pesticide' && draft.ind_or_group === 'individual' && (
            <>
              <TextField
                label="Candidate's Name"
                onChange={(value) => update({ examinee_name: value })}
                value={draft.examinee_name ?? ''}
              />
              <TextField
                label="Candidate's Phone"
                onChange={(value) => update({ examinee_phone: value })}
                value={draft.examinee_phone ?? ''}
              />
              <TextField
                label="Candidate's Email"
                onChange={(value) => update({ examinee_email: value })}
                value={draft.examinee_email ?? ''}
              />
              <SelectField
                label="Fees"
                onChange={(value) => update({ fees: value })}
                value={draft.fees ?? 'collect'}
              >
                <option value="collect">Collect at Exam Time</option>
                <option value="paid">Paid with Liaison</option>
              </SelectField>
            </>
          )}
          {(setup === 'group' ||
            setup === 'challenger' ||
            (setup === 'pesticide' && draft.ind_or_group === 'group')) && (
            <TextField
              label="Number of Students"
              onChange={(value) =>
                update({ number_of_students: Number(value) })
              }
              type="number"
              value={draft.number_of_students ?? ''}
            />
          )}
          {setup !== 'individual' && setup !== 'other' && (
            <>
              <TextField
                label="Exam Date"
                onChange={(value) => update({ expiry_date: value })}
                type="date"
                value={draft.expiry_date ?? ''}
              />
              <TextField
                label="Exam Time"
                onChange={(value) => update({ exam_time: value })}
                type="time"
                value={draft.exam_time ?? ''}
              />
            </>
          )}
          {(setup === 'individual' || setup === 'other') && (
            <>
              <TextField
                label="Exam Expiry Date"
                onChange={(value) => update({ expiry_date: value })}
                type="date"
                value={draft.expiry_date ?? ''}
              />
              <SelectField
                label="Exam Received?"
                onChange={(value) =>
                  update({
                    exam_received_date:
                      value === 'yes' ? todayDateInputValue() : null,
                  })
                }
                value={draft.exam_received_date ? 'yes' : 'no'}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </SelectField>
            </>
          )}
          {setup === 'pesticide' && draft.sbc_managed === 'non-sbc' && (
            <>
              <TextField
                label="Location"
                maxLength={50}
                onChange={(value) => update({ offsite_location: value })}
                value={draft.offsite_location ?? ''}
              />
              <SelectField
                label="Invigilator"
                onChange={(value) => update({ invigilator_id: Number(value) })}
                value={draft.invigilator_id ?? ''}
              >
                <option value="">Select invigilator</option>
                {offsiteInvigilators.map((item) => (
                  <option key={item.invigilator_id} value={item.invigilator_id}>
                    {item.invigilator_name}
                  </option>
                ))}
              </SelectField>
            </>
          )}
          {setup === 'pesticide' &&
            draft.ind_or_group === 'group' &&
            candidateCount > 0 && (
              <div className="sm:col-span-2">
                <CandidateEditor
                  count={candidateCount}
                  examTypes={pesticideTypes}
                  onChange={(candidates) => update({ candidates })}
                />
              </div>
            )}
          <TextAreaField
            className="sm:col-span-2"
            label="Additional Notes"
            maxLength={400}
            onChange={(value) => update({ notes: value })}
            value={draft.notes ?? ''}
          />
          {setup === 'pesticide' && (
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                checked={requestExam}
                onChange={(event) => setRequestExam(event.target.checked)}
                type="checkbox"
              />
              Request exam package from BCMP
            </label>
          )}
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
        />
      </Dialog>
    </Modal>
  )
}

function EditExamModal({
  exam,
  examTypes,
  onClose,
  onDelete,
  onSaved,
  permissions,
}: {
  exam: Exam
  examTypes: ExamType[]
  onClose: () => void
  onDelete: () => void
  onSaved: () => Promise<void>
  permissions: ReturnType<typeof getExamPermissions>
}) {
  const apiClient = useApiClient()
  const setGlobalAlert = useWorkflowStore((state) => state.setGlobalAlert)
  const [fields, setFields] = useState<Record<string, string | number | null>>({
    event_id: exam.event_id ?? '',
    exam_method: exam.exam_method ?? 'paper',
    exam_name: exam.exam_name ?? '',
    exam_received_date: dateInputValue(exam.exam_received_date),
    exam_type_id: exam.exam_type_id ?? '',
    examinee_email: exam.examinee_email ?? '',
    examinee_name: exam.examinee_name ?? '',
    examinee_phone: exam.examinee_phone ?? '',
    expiry_date: dateInputValue(exam.expiry_date),
    notes: exam.notes ?? '',
    number_of_students: exam.number_of_students ?? '',
    receipt: exam.receipt ?? '',
    receipt_sent_ind: exam.receipt_sent_ind ?? 0,
  })
  const [confirmBookingDelete, setConfirmBookingDelete] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [examNotReady, setExamNotReady] = useState(false)
  const type = examTypeForEdit(exam)
  const showAllFields =
    permissions.roleCode === 'GA' ||
    permissions.isIta2Designate ||
    permissions.isOfficeManager ||
    ['individual', 'other', 'pesticide'].includes(type)
  const typeOptions = examTypes.filter((item) => {
    if (type === 'group') {
      return item.group_exam_ind && !item.pesticide_exam_ind
    }
    if (type === 'individual') {
      return (
        item.ita_ind &&
        !item.group_exam_ind &&
        !item.exam_type_name?.includes('Monthly')
      )
    }
    if (type === 'other') {
      return !item.ita_ind && !item.group_exam_ind && !item.pesticide_exam_ind
    }
    return item.exam_type_id === exam.exam_type_id
  })

  function update(key: string, value: string | number | null) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function handleDownload() {
    setExamNotReady(false)
    try {
      const blob = await downloadExamDocument(apiClient, exam.exam_id)
      downloadBlob(blob, `${exam.exam_id}.pdf`)
      update('exam_received_date', todayDateInputValue())
    } catch {
      setExamNotReady(true)
      window.setTimeout(() => setExamNotReady(false), 15000)
    }
  }

  async function submitConfirmed() {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      if (confirmBookingDelete && exam.booking_id) {
        await deleteBooking(apiClient, exam.booking_id)
      }

      const payload: Record<string, unknown> = {}
      Object.entries(fields).forEach(([key, value]) => {
        if (key.endsWith('_date')) {
          payload[key] = toUtcDateIso(value ? String(value) : null)
          return
        }
        payload[key] = value === '' ? null : value
      })

      if (!fields.exam_received_date) {
        payload.exam_received_date = null
      }

      await updateExam(apiClient, exam.exam_id, payload)
      await onSaved()
      setGlobalAlert({
        id: 'exam-edit-success',
        message: 'Success!',
        role: 'status',
        variant: 'success',
      })
      onClose()
    } catch (error) {
      setGlobalAlert({
        id: 'exam-edit-failure',
        message:
          'Something Went Wrong! Please submit feedback and tell us about this issue.',
        role: 'alert',
        variant: 'danger',
      })
      setErrorMessage(getErrorMessage(error, 'Unable to update exam.'))
    } finally {
      setIsSaving(false)
    }
  }

  function handleSubmit() {
    if (
      type === 'individual' &&
      exam.booking_id &&
      Number(fields.exam_type_id) !== exam.exam_type_id
    ) {
      setConfirmBookingDelete(true)
      return
    }

    void submitConfirmed()
  }

  return (
    <Modal className="max-w-3xl overflow-hidden" isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Edit/Print Exam Details" />
        <div className="grid max-h-[75vh] gap-4 overflow-auto p-6 sm:grid-cols-2">
          {errorMessage && <Alert message={errorMessage} />}
          {examNotReady && (
            <Alert message="This exam is not yet ready for retrieval. Please try again in no less than 15 minutes." />
          )}
          {type === 'pesticide' && (
            <>
              <ReadOnlyField label="Exam Type" value={exam.exam_name ?? '-'} />
              <Button onClick={() => void handleDownload()}>Print</Button>
            </>
          )}
          {showAllFields ? (
            <>
              <TextField
                label="Event ID"
                onChange={(value) => update('event_id', value)}
                value={fields.event_id ?? ''}
              />
              <SelectField
                label="Exam Method"
                onChange={(value) => update('exam_method', value)}
                value={fields.exam_method ?? 'paper'}
              >
                <option value="paper">paper</option>
                <option value="online">online</option>
              </SelectField>
              {type !== 'challenger' && type !== 'pesticide' && (
                <SelectField
                  label="Exam Type"
                  onChange={(value) => update('exam_type_id', Number(value))}
                  value={fields.exam_type_id ?? ''}
                >
                  {typeOptions.map((item) => (
                    <option key={item.exam_type_id} value={item.exam_type_id}>
                      {item.exam_type_name}
                    </option>
                  ))}
                </SelectField>
              )}
              <TextField
                label="Exam Name"
                maxLength={50}
                onChange={(value) => update('exam_name', value)}
                value={fields.exam_name ?? ''}
              />
              <SelectField
                label={
                  type === 'pesticide' ? 'Exam Printed?' : 'Exam Received?'
                }
                onChange={(value) =>
                  update(
                    'exam_received_date',
                    value === 'yes' ? todayDateInputValue() : '',
                  )
                }
                value={fields.exam_received_date ? 'yes' : 'no'}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </SelectField>
              {fields.exam_received_date ? (
                <TextField
                  label={
                    type === 'pesticide' ? 'Printed Date' : 'Received Date'
                  }
                  onChange={(value) => update('exam_received_date', value)}
                  type="date"
                  value={fields.exam_received_date ?? ''}
                />
              ) : null}
              {['group', 'challenger'].includes(type) && (
                <TextField
                  label="# of Writers"
                  onChange={(value) =>
                    update('number_of_students', Number(value))
                  }
                  type="number"
                  value={fields.number_of_students ?? ''}
                />
              )}
              {type === 'individual' && (
                <TextField
                  label="Expiry Date"
                  onChange={(value) => update('expiry_date', value)}
                  type="date"
                  value={fields.expiry_date ?? ''}
                />
              )}
              {['individual', 'other', 'pesticide'].includes(type) && (
                <TextField
                  label="Candidate's Name"
                  onChange={(value) => update('examinee_name', value)}
                  value={fields.examinee_name ?? ''}
                />
              )}
              {type === 'pesticide' && (
                <>
                  <TextField
                    label="Telephone"
                    onChange={(value) => update('examinee_phone', value)}
                    value={fields.examinee_phone ?? ''}
                  />
                  <TextField
                    label="Candidate's Email"
                    onChange={(value) => update('examinee_email', value)}
                    value={fields.examinee_email ?? ''}
                  />
                  <TextField
                    label="Receipt"
                    onChange={(value) => update('receipt', value)}
                    value={fields.receipt ?? ''}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      checked={fields.receipt_sent_ind === 1}
                      onChange={(event) =>
                        update('receipt_sent_ind', event.target.checked ? 1 : 0)
                      }
                      type="checkbox"
                    />
                    Confirmation/Receipt Sent?
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <ReadOnlyField label="Exam" value={exam.exam_name ?? '-'} />
              <ReadOnlyField label="Event ID" value={exam.event_id ?? '-'} />
              <ReadOnlyField
                label="Type"
                value={exam.exam_type?.exam_type_name ?? '-'}
              />
              <ReadOnlyField label="Method" value={exam.exam_method ?? '-'} />
              <SelectField
                label="Exam Received?"
                onChange={(value) =>
                  update(
                    'exam_received_date',
                    value === 'yes' ? todayDateInputValue() : '',
                  )
                }
                value={fields.exam_received_date ? 'yes' : 'no'}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </SelectField>
            </>
          )}
          <TextAreaField
            className="sm:col-span-2"
            label="Notes"
            maxLength={400}
            onChange={(value) => update('notes', value)}
            value={fields.notes ?? ''}
          />
          {confirmBookingDelete && (
            <div className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4 sm:col-span-2">
              <p className="mt-0">
                Room booking for the exam will be deleted. Are you sure you want
                to proceed?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setConfirmBookingDelete(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button danger onClick={() => void submitConfirmed()}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="bg-bc-light-gray flex flex-wrap justify-end gap-3 border-t px-6 py-4">
          {canDeleteExam(exam, permissions) && (
            <Button danger disabled={isSaving} onClick={onDelete}>
              Delete Exam
            </Button>
          )}
          <Button disabled={isSaving} onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={isSaving || confirmBookingDelete}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      </Dialog>
    </Modal>
  )
}

function GroupBookingModal({
  exam,
  invigilators,
  offsiteInvigilators,
  onClose,
  onSaved,
  permissions,
}: {
  exam: Exam
  invigilators: Invigilator[]
  offsiteInvigilators: Invigilator[]
  onClose: () => void
  onSaved: () => Promise<void>
  permissions: ReturnType<typeof getExamPermissions>
}) {
  const apiClient = useApiClient()
  const timezone =
    exam.booking?.office.timezone.timezone_name ??
    exam.office?.timezone.timezone_name ??
    'America/Vancouver'
  const [date, setDate] = useState(dateInputValue(exam.booking?.start_time))
  const [time, setTime] = useState(
    exam.booking?.start_time
      ? new Date(exam.booking.start_time).toISOString().slice(11, 16)
      : '',
  )
  const [eventId, setEventId] = useState(exam.event_id ?? '')
  const [offsiteLocation, setOffsiteLocation] = useState(
    exam.offsite_location === '_offsite' ? '' : (exam.offsite_location ?? ''),
  )
  const [notes, setNotes] = useState(exam.notes ?? '')
  const [selectedInvigilators, setSelectedInvigilators] = useState<number[]>(
    getBookingInvigilatorIds(exam),
  )
  const [shadowInvigilatorId, setShadowInvigilatorId] = useState<number | ''>(
    exam.booking?.shadow_invigilator_id ?? '',
  )
  const [examReceivedDate, setExamReceivedDate] = useState(
    dateInputValue(exam.exam_received_date),
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fieldDisabled =
    permissions.roleCode !== 'SUPPORT' &&
    ((examTypeForEdit(exam) === 'challenger' &&
      permissions.roleCode !== 'GA' &&
      !permissions.isIta2Designate &&
      !permissions.isOfficeManager) ||
      (examTypeForEdit(exam) === 'group' &&
        ((isPesticideExam(exam) && !permissions.isPesticideDesignate) ||
          (!permissions.isIta2Designate && !permissions.isPesticideDesignate))))
  const invigilatorSource =
    isPesticideExam(exam) && exam.office?.office_name === 'Pesticide Offsite'
      ? offsiteInvigilators
      : invigilators
  const required = requiredInvigilatorCount(exam)

  async function handleSubmit() {
    if (!date || !time) {
      setErrorMessage('Exam date and time are required.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const start = new Date(`${date}T${time}`)
      const duration = Number(exam.exam_type?.number_of_hours ?? 1) * 60
      const end = new Date(start.getTime() + duration * 60000)
      const bookingPayload = {
        booking_name: exam.exam_name,
        end_time: officeDateToUtcIso(end, timezone),
        invigilator_id: isPesticideExam(exam)
          ? selectedInvigilators.slice(0, 1)
          : selectedInvigilators,
        office_id: exam.office_id ?? exam.office?.office_id,
        sbc_staff_invigilated: 0,
        shadow_invigilator_id: shadowInvigilatorId || null,
        start_time: officeDateToUtcIso(start, timezone),
      }

      let bookingId = exam.booking_id
      if (exam.booking_id) {
        await updateBooking(apiClient, exam.booking_id, bookingPayload)
      } else {
        const booking = await createBooking(apiClient, bookingPayload)
        bookingId = booking?.booking_id ?? null
      }

      await updateExam(apiClient, exam.exam_id, {
        booking_id: bookingId,
        event_id: eventId,
        exam_received_date: toUtcDateIso(examReceivedDate),
        invigilator_id: selectedInvigilators[0] ?? null,
        notes,
        offsite_location: offsiteLocation || exam.offsite_location,
      })

      if (
        shadowInvigilatorId &&
        shadowInvigilatorId !== exam.booking?.shadow_invigilator_id
      ) {
        await updateInvigilatorShadowCount(
          apiClient,
          Number(shadowInvigilatorId),
          {
            add: true,
            subtract: false,
          },
        )
      }

      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to update booking.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal className="max-w-3xl overflow-hidden" isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader
          title={`Edit ${setupLabel(examTypeForEdit(exam))} Exam Booking`}
        />
        <div className="grid max-h-[75vh] gap-4 overflow-auto p-6 sm:grid-cols-2">
          {errorMessage && <Alert message={errorMessage} />}
          <ReadOnlyField label="Exam" value={exam.exam_name ?? '-'} />
          <ReadOnlyField
            label="Writers"
            value={String(exam.number_of_students ?? '-')}
          />
          <TextField
            disabled={fieldDisabled}
            label="Event ID"
            onChange={setEventId}
            value={eventId}
          />
          <TextField
            disabled={fieldDisabled}
            label="Exam Date"
            onChange={setDate}
            type="date"
            value={date}
          />
          <TextField
            disabled={fieldDisabled}
            label="Exam Time"
            onChange={setTime}
            type="time"
            value={time}
          />
          <TextField
            disabled={fieldDisabled}
            label="Location"
            maxLength={50}
            onChange={setOffsiteLocation}
            value={offsiteLocation}
          />
          <SelectField
            label="Exam Received?"
            onChange={(value) =>
              setExamReceivedDate(value === 'yes' ? todayDateInputValue() : '')
            }
            value={examReceivedDate ? 'yes' : 'no'}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </SelectField>
          {examReceivedDate && (
            <TextField
              label="Received Date"
              onChange={setExamReceivedDate}
              type="date"
              value={examReceivedDate}
            />
          )}
          <TextAreaField
            className="sm:col-span-2"
            label="Notes"
            maxLength={400}
            onChange={setNotes}
            value={notes}
          />
          <fieldset className="border-bc-border rounded-sm border p-3 sm:col-span-2">
            <legend className="font-bold">Invigilators</legend>
            <p className="mt-0 mb-2">Required Invigilators: {required}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {invigilatorSource
                .filter(
                  (item) =>
                    item.shadow_count === 2 || item.shadow_count == null,
                )
                .map((item) => (
                  <label
                    className="flex items-center gap-2"
                    key={item.invigilator_id}
                  >
                    <input
                      checked={selectedInvigilators.includes(
                        item.invigilator_id,
                      )}
                      onChange={(event) =>
                        setSelectedInvigilators((current) =>
                          event.target.checked
                            ? [...current, item.invigilator_id]
                            : current.filter(
                                (id) => id !== item.invigilator_id,
                              ),
                        )
                      }
                      type="checkbox"
                    />
                    {item.invigilator_name}
                  </label>
                ))}
            </div>
          </fieldset>
          <SelectField
            className="sm:col-span-2"
            label="Shadow Invigilator"
            onChange={(value) =>
              setShadowInvigilatorId(value ? Number(value) : '')
            }
            value={shadowInvigilatorId}
          >
            <option value="">Unassigned</option>
            {invigilators
              .filter((item) => (item.shadow_count ?? 0) < 2)
              .map((item) => (
                <option key={item.invigilator_id} value={item.invigilator_id}>
                  {item.invigilator_name}
                </option>
              ))}
          </SelectField>
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
        />
      </Dialog>
    </Modal>
  )
}

function ReturnExamModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const apiClient = useApiClient()
  const [returned, setReturned] = useState(Boolean(exam.exam_returned_date))
  const [written, setWritten] = useState(exam.exam_written_ind ?? 1)
  const [date, setDate] = useState(
    dateInputValue(exam.exam_returned_date) || todayDateInputValue(),
  )
  const [actionTaken, setActionTaken] = useState(
    exam.exam_returned_tracking_number ?? '',
  )
  const [notes, setNotes] = useState(exam.notes ?? '')
  const [confirm, setConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const editMode = Boolean(exam.exam_returned_date)

  async function submit() {
    if (returned && !actionTaken) {
      setErrorMessage('Action Taken is required.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      await updateExam(apiClient, exam.exam_id, {
        exam_returned_date: returned ? toUtcDateIso(date) : null,
        exam_returned_tracking_number: returned ? actionTaken : null,
        exam_written_ind: written,
        notes: returned ? notes : '',
      })
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to update return details.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title={editMode ? 'Edit Return Details' : 'Return Exam'} />
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {errorMessage && <Alert message={errorMessage} />}
          <SelectField
            label="Exam Status"
            onChange={(value) => setReturned(value === 'returned')}
            value={returned ? 'returned' : 'not-returned'}
          >
            <option value="not-returned">Not Returned</option>
            <option value="returned">Returned</option>
          </SelectField>
          {returned && (
            <>
              <SelectField
                label="Written?"
                onChange={(value) => setWritten(Number(value))}
                value={written}
              >
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </SelectField>
              <TextField
                label="Date of Return"
                onChange={setDate}
                type="date"
                value={date}
              />
              <TextField
                label="Action Taken"
                maxLength={250}
                onChange={setActionTaken}
                value={actionTaken}
              />
              <TextField label="Notes" onChange={setNotes} value={notes} />
            </>
          )}
          {confirm && (
            <div className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4 sm:col-span-2">
              <p className="mt-0">Are you sure you want to return this exam?</p>
              <div className="flex gap-2">
                <Button onClick={() => setConfirm(false)} variant="secondary">
                  No
                </Button>
                <Button onClick={() => void submit()}>Yes</Button>
              </div>
            </div>
          )}
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() =>
            editMode || !returned ? void submit() : setConfirm(true)
          }
        />
      </Dialog>
    </Modal>
  )
}

function UploadPesticideExamModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const apiClient = useApiClient()
  const printed = Boolean(exam.exam_received_date)
  const [status, setStatus] = useState(
    exam.exam_destroyed_date
      ? 'noshow'
      : exam.upload_received_ind && exam.exam_written_ind
        ? 'written'
        : '',
  )
  const [destroyed, setDestroyed] = useState(Boolean(exam.exam_destroyed_date))
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    if (status === 'written' && !file) {
      setErrorMessage('Please provide a file to upload.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const putData: Record<string, unknown> = {
        exam_destroyed_date: destroyed ? new Date().toISOString() : null,
        exam_returned_date: new Date().toISOString(),
        exam_written_ind: status === 'written' ? 1 : 0,
        upload_received_ind: status === 'written' ? 1 : 0,
      }

      if (status === 'written' && file) {
        await uploadCompletedExamDocument(apiClient, exam.exam_id, file)
      }

      await updateExam(apiClient, exam.exam_id, putData)
      await onSaved()
      setSubmitted(true)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'File upload failed, please try again.'),
      )
    } finally {
      setIsSaving(false)
      setConfirm(false)
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Upload Completed Exam" />
        <div className="grid gap-4 p-6">
          {submitted ? (
            <div className="text-center">
              <div className="text-6xl text-green-700">✓</div>
              <h3 className="text-bc-h4 my-2 font-bold">Success!</h3>
            </div>
          ) : null}
          {errorMessage && <Alert message={errorMessage} />}
          <div className="border-bc-border rounded-sm border p-3">
            <div>
              <strong>Exam:</strong> {exam.exam_name}
            </div>
            <div>
              <strong>Exam Type:</strong> {exam.exam_type?.exam_type_name}
            </div>
            <div>
              <strong>Event ID:</strong> {exam.event_id || '-'}
            </div>
            <div>
              <strong>Upload Status:</strong>{' '}
              {exam.upload_received_ind ? 'Received' : 'Not Received'}
            </div>
          </div>
          {!submitted && (
            <>
              <SelectField
                label="Exam Status"
                onChange={setStatus}
                value={status}
              >
                <option value=""></option>
                <option value="unwritten">Unwritten</option>
                {printed && <option value="written">Written</option>}
                <option value="noshow">No Show</option>
              </SelectField>
              {status === 'written' && (
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Attach Scanned Exam</span>
                  <input
                    onChange={(event) =>
                      setFile(event.target.files?.item(0) ?? null)
                    }
                    type="file"
                  />
                </label>
              )}
              {status === 'noshow' && (
                <SelectField
                  label="Exam Destroyed?"
                  onChange={(value) => setDestroyed(value === 'true')}
                  value={String(destroyed)}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </SelectField>
              )}
              {confirm && (
                <div className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4">
                  <p className="mt-0">
                    Are you sure you want to upload this exam?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setConfirm(false)}
                      variant="secondary"
                    >
                      No
                    </Button>
                    <Button onClick={() => void submit()}>Yes</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="bg-bc-light-gray flex justify-end gap-3 border-t px-6 py-4">
          <Button
            disabled={isSaving}
            onClick={submitted ? onClose : onClose}
            variant="secondary"
          >
            {submitted ? 'Done' : 'Cancel'}
          </Button>
          {!submitted && (
            <Button
              disabled={isSaving || !status}
              onClick={() =>
                status === 'written' ? setConfirm(true) : void submit()
              }
            >
              Submit
            </Button>
          )}
        </div>
      </Dialog>
    </Modal>
  )
}

function DeleteExamModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: Exam
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const apiClient = useApiClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleDelete() {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      await deleteExam(apiClient, exam.exam_id)
      if (exam.booking_id) {
        await deleteBooking(apiClient, exam.booking_id)
      }
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to delete exam.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Delete Exam" />
        <div className="grid gap-4 p-6">
          {errorMessage && <Alert message={errorMessage} />}
          <p className="m-0">Are you sure you want to delete this Exam?</p>
          <div className="border-bc-border rounded-sm border p-3">
            <div>
              <strong>Exam Name:</strong> {exam.exam_name}
            </div>
            <div>
              <strong>Examinee Name:</strong> {exam.examinee_name || '-'}
            </div>
            <div>
              <strong>Event ID:</strong> {exam.event_id || '-'}
            </div>
          </div>
        </div>
        <div className="bg-bc-light-gray flex justify-end gap-3 border-t px-6 py-4">
          <Button disabled={isSaving} onClick={onClose} variant="secondary">
            No
          </Button>
          <Button
            danger
            disabled={isSaving}
            onClick={() => void handleDelete()}
          >
            Yes
          </Button>
        </div>
      </Dialog>
    </Modal>
  )
}

function FinancialReportModal({ onClose }: { onClose: () => void }) {
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
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Generate Exam Report" />
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
          <SelectField
            label="Exam Types"
            onChange={setExamType}
            value={examType}
          >
            <option value="">Click for Filter Options</option>
            <option value="all_exams">All Exams</option>
            <option value="all_bookings">All Booking Events</option>
            <option value="ita">
              SkilledTradesBC Individual and Group Exams
            </option>
            <option value="all_non_ita">All Non-SkilledTradesBC Exams</option>
          </SelectField>
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() => void submit()}
        />
      </Dialog>
    </Modal>
  )
}

function SelectInvigilatorModal({
  exam,
  invigilators,
  onClose,
  onSaved,
}: {
  exam: Exam
  invigilators: Invigilator[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const apiClient = useApiClient()
  const [selected, setSelected] = useState<number | ''>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    const invigilator = invigilators.find(
      (item) => item.invigilator_id === selected,
    )
    if (!invigilator) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      await emailExamInvigilator(apiClient, exam.exam_id, {
        invigilator_email: invigilator.contact_email,
        invigilator_id: invigilator.invigilator_id,
        invigilator_name: invigilator.invigilator_name,
        invigilator_phone: invigilator.contact_phone,
      })
      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'An error occurred emailing the invigilator'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <ModalHeader title="Select Invigilator" />
        <div className="grid gap-4 p-6">
          {errorMessage && <Alert message={errorMessage} />}
          <SelectField
            label="Invigilator"
            onChange={(value) => setSelected(value ? Number(value) : '')}
            value={selected}
          >
            <option value="">Select invigilator</option>
            {invigilators.map((item) => (
              <option key={item.invigilator_id} value={item.invigilator_id}>
                {item.invigilator_name}
              </option>
            ))}
          </SelectField>
        </div>
        <ModalFooter
          isSaving={isSaving}
          onCancel={onClose}
          onSubmit={() => void submit()}
          submitDisabled={!selected}
          submitText="Email Invigilator"
        />
      </Dialog>
    </Modal>
  )
}

function CandidateEditor({
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

function buildBookingPayload({
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

function ModalHeader({ title }: { title: string }) {
  return (
    <div className="border-bc-border bg-bc-light-gray border-b px-6 py-4">
      <DialogTitle className="text-bc-h4 m-0 font-bold">{title}</DialogTitle>
    </div>
  )
}

function ModalFooter({
  isSaving,
  onCancel,
  onSubmit,
  submitDisabled = false,
  submitText = 'Submit',
}: {
  isSaving: boolean
  onCancel: () => void
  onSubmit: () => void
  submitDisabled?: boolean
  submitText?: string
}) {
  return (
    <div className="bg-bc-light-gray flex justify-end gap-3 border-t px-6 py-4">
      <Button disabled={isSaving} onClick={onCancel} variant="secondary">
        Cancel
      </Button>
      <Button disabled={isSaving || submitDisabled} onClick={onSubmit}>
        {submitText}
      </Button>
    </div>
  )
}

function Alert({ message }: { message: string }) {
  return (
    <AlertBanner
      className="sm:col-span-2"
      isCloseable={false}
      role="alert"
      size="small"
      variant="danger"
    >
      {message}
    </AlertBanner>
  )
}

function TextField({
  className,
  disabled = false,
  label,
  maxLength,
  onChange,
  type = 'text',
  value,
}: {
  className?: string
  disabled?: boolean
  label: string
  maxLength?: number
  onChange: (value: string) => void
  type?: string
  value: number | string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="font-bold">{label}</span>
      <input
        className="border-bc-border rounded-sm border px-3 py-2"
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

function TextAreaField({
  className,
  label,
  maxLength,
  onChange,
  value,
}: {
  className?: string
  label: string
  maxLength?: number
  onChange: (value: string) => void
  value: number | string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="font-bold">{label}</span>
      <textarea
        className="border-bc-border min-h-20 rounded-sm border px-3 py-2"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

function SelectField({
  children,
  className,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode
  className?: string
  label: string
  onChange: (value: string) => void
  value: number | string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="font-bold">{label}</span>
      <select
        className="border-bc-border rounded-sm border px-3 py-2"
        onChange={(event) => onChange(event.target.value)}
        value={String(value)}
      >
        {children}
      </select>
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-bold">{label}</span>
      <div className="border-bc-border bg-bc-light-gray rounded-sm border px-3 py-2">
        {value}
      </div>
    </div>
  )
}

function setupLabel(setup: ExamSetup) {
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
