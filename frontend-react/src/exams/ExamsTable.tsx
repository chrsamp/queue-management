import { Fragment, useEffect, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

import type { Exam, Invigilator } from '@/api/schemas'
import Button from '@/components/Button'

import ExamActions from './ExamActions'
import ExamDetails from './ExamDetails'
import {
  formatDate,
  getExamStatus,
  isMonthlySessionExam,
  shouldBlockScheduling,
  type ExamPermissions,
} from './exam-utils'

interface ExamsTableProps {
  exams: Exam[]
  homeOfficeNumber: number
  invigilators: Invigilator[]
  isLoading: boolean
  officeFilter: number | string
  onAction: (action: string, exam: Exam) => void
  pageResetToken: number
  permissions: ExamPermissions
  showAllPesticide: boolean
}

export default function ExamsTable({
  exams,
  homeOfficeNumber,
  invigilators,
  isLoading,
  officeFilter,
  onAction,
  pageResetToken,
  permissions,
  showAllPesticide,
}: ExamsTableProps) {
  const [expandedExamId, setExpandedExamId] = useState<number | null>(null)
  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: 'status' },
  ])

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
          homeOfficeNumber={homeOfficeNumber}
          officeFilter={officeFilter}
          onAction={onAction}
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
    ...(showAllPesticide
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
    data: exams,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  useEffect(() => {
    if (pageResetToken > 0) {
      table.setPageIndex(0)
    }
  }, [pageResetToken, table])

  return (
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
            {isLoading ? (
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
                    onDoubleClick={() => onAction('edit', row.original)}
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
  )
}
