import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

import type { Citizen, Office } from '@/api/schemas'
import { cx } from '@/lib/cx'

import {
  formatNotificationTime,
  formatQueueTime,
  getCategory,
  getCounterName,
  getPriorityLabel,
  getServiceName,
  getServedBy,
  parseQueueComments,
} from './queue-utils'

interface QueueTableProps {
  citizens: Citizen[]
  emptyMessage: string
  onCitizenClick?: (citizen: Citizen) => void
  office: Office
  showCounter: boolean
  showNotifications: boolean
  tableLabel: string
}

export default function QueueTable({
  citizens,
  emptyMessage,
  onCitizenClick,
  office,
  showCounter,
  showNotifications,
  tableLabel,
}: QueueTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const columns = useMemo(
    () => buildColumns({ office, showCounter, showNotifications }),
    [office, showCounter, showNotifications],
  )

  // TanStack Table returns non-memoizable helpers; this component keeps them local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: citizens,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  return (
    <div className="border-bc-border h-full overflow-auto rounded-lg border bg-white">
      <table
        aria-label={tableLabel}
        className="text-bc-small w-full table-fixed border-collapse"
      >
        <thead className="bg-bc-light-gray">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className="border-bc-border bg-bc-light-gray text-bc-primary sticky top-0 z-10 border-b px-3 py-2 text-left align-bottom font-bold"
                  key={header.id}
                  aria-sort={getHeaderSortDirection(
                    header.column.getIsSorted(),
                  )}
                  style={{ width: header.getSize() }}
                  scope="col"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                className="text-bc-secondary px-3 py-4"
                colSpan={table.getAllLeafColumns().length}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                className={cx(
                  'even:bg-bc-light-gray/45',
                  onCitizenClick &&
                    'hover:bg-bc-button-secondary-hover cursor-pointer',
                )}
                key={row.id}
                onClick={() => onCitizenClick?.(row.original)}
                onKeyDown={(event) => {
                  if (
                    onCitizenClick &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault()
                    onCitizenClick(row.original)
                  }
                }}
                tabIndex={onCitizenClick ? 0 : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    className="border-bc-border text-bc-primary border-b px-3 py-2 align-top"
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function buildColumns({
  office,
  showCounter,
  showNotifications,
}: {
  office: Office
  showCounter: boolean
  showNotifications: boolean
}): ColumnDef<Citizen>[] {
  const columns: ColumnDef<Citizen>[] = [
    {
      cell: ({ row }) => getPriorityLabel(row.original.priority),
      header: 'Priority',
      id: 'priority',
      size: showCounter ? 96 : 112,
    },
  ]

  if (showCounter) {
    columns.push({
      cell: ({ row }) => getCounterName(office, row.original.counter_id),
      header: 'Counter',
      id: 'counter',
      size: 96,
    })
  }

  columns.push(
    {
      accessorFn: (row) => parseSortableDate(row.start_time) ?? undefined,
      cell: ({ row }) => formatQueueTime(row.original.start_time),
      enableSorting: true,
      header: ({ column }) => {
        const sortDirection = column.getIsSorted()
        const sortLabel =
          sortDirection === 'asc'
            ? 'sorted ascending'
            : sortDirection === 'desc'
              ? 'sorted descending'
              : 'not sorted'

        return (
          <button
            aria-label={`Sort by Time, ${sortLabel}`}
            className="focus-visible:outline-bc-link -mx-2 -my-1 flex w-full items-center gap-1 rounded-sm px-2 py-1 text-left font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={column.getToggleSortingHandler()}
            type="button"
          >
            <span>Time</span>
            {sortDirection === 'asc' ? (
              <ChevronUp
                aria-hidden="true"
                className="text-bc-secondary h-4 w-4"
              />
            ) : sortDirection === 'desc' ? (
              <ChevronDown
                aria-hidden="true"
                className="text-bc-secondary h-4 w-4"
              />
            ) : (
              <ChevronsUpDown
                aria-hidden="true"
                className="text-bc-secondary h-4 w-4"
              />
            )}
          </button>
        )
      },
      id: 'time',
      sortingFn: 'basic',
      sortDescFirst: false,
      sortUndefined: 'last',
      size: 128,
    },
    {
      cell: ({ row }) => row.original.ticket_number ?? '',
      header: 'Ticket',
      id: 'ticket',
      size: 88,
    },
    {
      cell: ({ row }) => getServedBy(row.original),
      header: 'Served By',
      id: 'servedBy',
      size: 128,
    },
    {
      cell: ({ row }) => getCategory(row.original),
      header: 'Category',
      id: 'category',
      size: 152,
    },
    {
      cell: ({ row }) => getServiceName(row.original),
      header: 'Service',
      id: 'service',
      size: 152,
    },
    {
      cell: ({ row }) => <CommentsCell citizen={row.original} />,
      header: 'Comments',
      id: 'comments',
      size: 220,
    },
  )

  if (showNotifications) {
    columns.push(
      {
        cell: ({ row }) => <NotificationActionCell citizen={row.original} />,
        header: 'Action',
        id: 'action',
        size: 112,
      },
      {
        cell: ({ row }) => <NotificationCell citizen={row.original} />,
        header: 'Notification',
        id: 'notification',
        size: 220,
      },
      {
        cell: ({ row }) =>
          formatNotificationTime(row.original.notification_sent_time),
        header: 'Time Sent',
        id: 'timeSent',
        size: 128,
      },
    )
  }

  return columns
}

function getHeaderSortDirection(sortDirection: false | 'asc' | 'desc') {
  if (sortDirection === 'asc') {
    return 'ascending'
  }

  if (sortDirection === 'desc') {
    return 'descending'
  }

  return undefined
}

function parseSortableDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function CommentsCell({ citizen }: { citizen: Citizen }) {
  const comments = parseQueueComments(citizen)

  if (!comments.appointmentLabel) {
    return comments.text
  }

  return (
    <span>
      <span className="text-teal-700">{comments.appointmentLabel}</span>
      <br />
      <span>{comments.text}</span>
    </span>
  )
}

function NotificationCell({ citizen }: { citizen: Citizen }) {
  return (
    <span className="flex flex-col gap-1">
      {citizen.notification_phone && <span>{citizen.notification_phone}</span>}
      {citizen.notification_email && <span>{citizen.notification_email}</span>}
    </span>
  )
}

function NotificationActionCell({ citizen }: { citizen: Citizen }) {
  if (!citizen.notification_phone && !citizen.notification_email) {
    return null
  }

  const reminderFlag = citizen.reminder_flag ?? 0
  const label = getReminderLabel(reminderFlag)

  return (
    <span
      className={cx(
        'inline-flex rounded-sm px-2 py-1 text-xs font-bold',
        reminderFlag === 0 && 'bg-bc-disabled-surface text-bc-primary',
        reminderFlag === 1 && 'bg-bc-link text-bc-white',
        reminderFlag >= 2 && 'bg-bc-danger text-bc-white',
      )}
    >
      {label}
    </span>
  )
}

function getReminderLabel(reminderFlag: number) {
  if (reminderFlag === 1) {
    return 'First sent'
  }

  if (reminderFlag >= 2) {
    return 'Second sent'
  }

  return 'Not sent'
}
