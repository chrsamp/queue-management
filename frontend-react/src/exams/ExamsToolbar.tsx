import type { Office } from '@/api/schemas'
import Button from '@/components/Button'
import SplitAction, { type SplitActionItem } from '@/components/SplitAction'

import type {
  ExamFilters,
  ExamPermissions,
  ExamSetup,
  ExamTypeFilter,
  QuickActionFilter,
} from './exam-utils'

interface ExamsToolbarProps {
  filters: ExamFilters
  isRefreshingStatus: boolean
  office: Office
  offices: Office[]
  onAdd: (setup: ExamSetup) => void
  onExamTypeFilter: (examType: ExamTypeFilter) => void
  onFiltersChange: (updates: Partial<ExamFilters>) => void
  onQuickActionFilter: (quickAction: QuickActionFilter) => void
  onReport: () => void
  permissions: ExamPermissions
  quickActionOptions: Array<{ label: string; value: QuickActionFilter }>
}

export default function ExamsToolbar({
  filters,
  isRefreshingStatus,
  office,
  offices,
  onAdd,
  onExamTypeFilter,
  onFiltersChange,
  onQuickActionFilter,
  onReport,
  permissions,
  quickActionOptions,
}: ExamsToolbarProps) {
  const examTypeItems: SplitActionItem[] = [
    { id: 'individual', label: 'SkilledTradesBC Exam' },
    ...(permissions.canSeeMonthlySessionOption
      ? [{ id: 'challenger' as const, label: 'Monthly Session Exam' }]
      : []),
    ...(permissions.canAddGroup
      ? [{ id: 'group' as const, label: 'Group Exam' }]
      : []),
    { id: 'other', label: 'Other Exam' },
    ...(permissions.canAddPesticide
      ? [{ id: 'pesticide' as const, label: 'Environment Exam' }]
      : []),
  ]

  return (
    <>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        {permissions.canGenerateFinancialReport && (
          <Button onClick={onReport} variant="secondary">
            Generate Financial Report
          </Button>
        )}
        <SplitAction
          items={examTypeItems}
          label="Create new..."
          onAction={(key) => onAdd(key as ExamSetup)}
        />
      </div>

      <div className="border-bc-border bg-bc-white flex shrink-0 flex-wrap items-end gap-3 rounded-sm border p-3">
        <label className="flex flex-col gap-1">
          <span className="font-bold">Search</span>
          <input
            className="border-bc-border rounded-sm border px-3 py-2"
            onChange={(event) =>
              onFiltersChange({ search: event.target.value })
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
                onFiltersChange({
                  officeNumber: event.target.value,
                  showAllPesticide: false,
                })
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
              onExamTypeFilter(event.target.value as ExamTypeFilter)
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
              onQuickActionFilter(event.target.value as QuickActionFilter)
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
            onClick={() => onFiltersChange({ showAllPesticide: false })}
            variant="secondary"
          >
            This Office
          </Button>
        )}
      </div>
    </>
  )
}
