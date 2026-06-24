import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { GripHorizontal } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import type { Citizen, Office } from '@/api/schemas'
import { beginCitizenService, inviteCitizen } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'
import DayAgendaPanel from '@/appointments/DayAgendaPanel'
import { appointmentsEnabled } from '@/appointments/appointment-utils'

import QueueActions from './QueueActions'
import QueueTable from './QueueTable'
import ServeCitizenModal from './ServeCitizenModal'
import {
  getActiveCitizenForCsr,
  getActiveService,
  getHoldCitizens,
  getWaitingCitizens,
  isNotificationEnabled,
  isReceptionOffice,
} from './queue-utils'

interface QueueWorkspaceProps {
  citizens: Citizen[]
  csrId?: number | null
  errorMessage?: string | null
  isLoading?: boolean
  office: Office
}

const defaultWaitingRatio = 0.5
const minPanelHeight = 160
const resizeHandleHeight = 32

function getInitialWaitingRatio(csrId: number | null | undefined) {
  if (!csrId || typeof window === 'undefined') {
    return defaultWaitingRatio
  }

  const storedRatio = window.sessionStorage.getItem(
    `queueWorkspace:${csrId}:waitingRatio`,
  )
  const parsedRatio = storedRatio ? Number(storedRatio) : Number.NaN

  return Number.isFinite(parsedRatio) ? parsedRatio : defaultWaitingRatio
}

export default function QueueWorkspace({
  citizens,
  csrId = null,
  errorMessage = null,
  isLoading = false,
  office,
}: QueueWorkspaceProps) {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const reception = isReceptionOffice(office)
  const notificationsEnabled = isNotificationEnabled(office)
  const waitingCitizens = getWaitingCitizens(citizens)
  const holdCitizens = getHoldCitizens(citizens)
  const activeCitizenId = useWorkflowStore((state) => state.activeCitizenId)
  const activeServiceRequestId = useWorkflowStore(
    (state) => state.activeServiceRequestId,
  )
  const clearServeCitizen = useWorkflowStore((state) => state.clearServeCitizen)
  const currentCounterId = useWorkflowStore((state) => state.currentCounterId)
  const currentUsername = useWorkflowStore((state) => state.currentUsername)
  const openServiceModal = useWorkflowStore((state) => state.openServiceModal)
  const resetTerminalClearedCitizen = useWorkflowStore(
    (state) => state.resetTerminalClearedCitizen,
  )
  const serviceBegun = useWorkflowStore((state) => state.serviceBegun)
  const setActiveServiceCitizen = useWorkflowStore(
    (state) => state.setActiveServiceCitizen,
  )
  const showDayAgenda = useWorkflowStore((state) => state.showDayAgenda)
  const showServiceModal = useWorkflowStore((state) => state.showServiceModal)
  const terminalClearedCitizenId = useWorkflowStore(
    (state) => state.terminalClearedCitizenId,
  )
  const [waitingRatio, setWaitingRatio] = useState(() =>
    getInitialWaitingRatio(csrId),
  )
  const [queueAlert, setQueueAlert] = useState<string | null>(null)
  const resizeStorageKey = useMemo(
    () => (csrId ? `queueWorkspace:${csrId}:waitingRatio` : null),
    [csrId],
  )
  const [splitHeight, setSplitHeight] = useState(0)
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startRatio: number
    startY: number
  } | null>(null)

  const clampRatio = useCallback(
    (ratio: number) => {
      if (splitHeight <= 0) {
        return Math.min(0.85, Math.max(0.15, ratio))
      }

      const availableHeight = Math.max(splitHeight - resizeHandleHeight, 1)
      const minRatio = Math.min(0.45, minPanelHeight / availableHeight)
      const maxRatio = 1 - minRatio

      return Math.min(maxRatio, Math.max(minRatio, ratio))
    },
    [splitHeight],
  )
  const activeWaitingRatio = clampRatio(waitingRatio)
  const detectedActiveCitizen = getActiveCitizenForCsr({
    citizens,
    csrId,
    username: currentUsername,
  })
  const confirmedActiveCitizen =
    detectedActiveCitizen?.citizen.citizen_id === terminalClearedCitizenId
      ? null
      : detectedActiveCitizen
  const hasActiveServiceCitizen = confirmedActiveCitizen !== null
  const activeCitizen =
    confirmedActiveCitizen?.citizen ??
    citizens.find((citizen) => citizen.citizen_id === activeCitizenId) ??
    null

  useEffect(() => {
    if (!confirmedActiveCitizen) {
      if (activeCitizenId !== null && !showServiceModal) {
        clearServeCitizen()
      }

      if (!detectedActiveCitizen && terminalClearedCitizenId !== null) {
        resetTerminalClearedCitizen()
      }

      return
    }

    if (
      activeCitizenId === confirmedActiveCitizen.citizen.citizen_id &&
      activeServiceRequestId === confirmedActiveCitizen.serviceRequest.sr_id &&
      serviceBegun === confirmedActiveCitizen.serviceBegun
    ) {
      return
    }

    setActiveServiceCitizen(
      confirmedActiveCitizen.citizen.citizen_id,
      confirmedActiveCitizen.serviceRequest.sr_id,
      confirmedActiveCitizen.serviceBegun,
    )
  }, [
    activeCitizenId,
    activeServiceRequestId,
    clearServeCitizen,
    confirmedActiveCitizen,
    confirmedActiveCitizen?.citizen.citizen_id,
    confirmedActiveCitizen?.serviceBegun,
    confirmedActiveCitizen?.serviceRequest.sr_id,
    detectedActiveCitizen,
    detectedActiveCitizen?.citizen.citizen_id,
    resetTerminalClearedCitizen,
    serviceBegun,
    setActiveServiceCitizen,
    showServiceModal,
    terminalClearedCitizenId,
  ])

  useEffect(() => {
    const updateSplitHeight = () => {
      setSplitHeight(splitContainerRef.current?.clientHeight ?? 0)
    }

    updateSplitHeight()
    window.addEventListener('resize', updateSplitHeight)

    return () => {
      window.removeEventListener('resize', updateSplitHeight)
    }
  }, [reception, isLoading, errorMessage])

  const commitWaitingRatio = useCallback(
    (ratio: number) => {
      const nextRatio = clampRatio(ratio)
      setWaitingRatio(nextRatio)

      if (resizeStorageKey) {
        window.sessionStorage.setItem(resizeStorageKey, String(nextRatio))
      }
    },
    [clampRatio, resizeStorageKey],
  )

  const handleResizePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragStateRef.current = {
        pointerId: event.pointerId,
        startRatio: activeWaitingRatio,
        startY: event.clientY,
      }
    },
    [activeWaitingRatio],
  )

  const handleResizePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const dragState = dragStateRef.current

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return
      }

      const availableHeight = Math.max(splitHeight - resizeHandleHeight, 1)
      const deltaRatio = (event.clientY - dragState.startY) / availableHeight
      commitWaitingRatio(dragState.startRatio + deltaRatio)
    },
    [commitWaitingRatio, splitHeight],
  )

  const handleResizePointerEnd = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const dragState = dragStateRef.current

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return
      }

      dragStateRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [],
  )

  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        commitWaitingRatio(activeWaitingRatio - 0.05)
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        commitWaitingRatio(activeWaitingRatio + 0.05)
      }
    },
    [activeWaitingRatio, commitWaitingRatio],
  )

  const handleWaitingCitizenClick = useCallback(
    async (citizen: Citizen) => {
      if (hasActiveServiceCitizen || showServiceModal) {
        setQueueAlert(
          'You are already serving a citizen.  Click Serve Now to resume.',
        )
        return
      }

      setQueueAlert(null)

      try {
        await inviteCitizen(apiClient, citizen.citizen_id, currentCounterId)
        await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
        openServiceModal()
        setActiveServiceCitizen(
          citizen.citizen_id,
          getActiveService(citizen)?.sr_id ?? null,
          false,
        )
      } catch (error) {
        setQueueAlert(getErrorMessage(error, 'Unable to invite citizen.'))
      }
    },
    [
      apiClient,
      currentCounterId,
      hasActiveServiceCitizen,
      openServiceModal,
      queryClient,
      setActiveServiceCitizen,
      showServiceModal,
    ],
  )

  const handleHoldCitizenClick = useCallback(
    async (citizen: Citizen) => {
      if (hasActiveServiceCitizen || showServiceModal) {
        setQueueAlert(
          'You are already serving a citizen.  Click Serve Now to resume.',
        )
        return
      }

      setQueueAlert(null)

      try {
        await beginCitizenService(apiClient, citizen.citizen_id)
        await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
        openServiceModal()
        setActiveServiceCitizen(
          citizen.citizen_id,
          getActiveService(citizen)?.sr_id ?? null,
          true,
        )
      } catch (error) {
        setQueueAlert(getErrorMessage(error, 'Unable to begin service.'))
      }
    },
    [
      apiClient,
      hasActiveServiceCitizen,
      openServiceModal,
      queryClient,
      setActiveServiceCitizen,
      showServiceModal,
    ],
  )

  return (
    <section className="mx-auto flex min-h-[calc(100vh-var(--spacing-bc-header-height))] max-w-7xl flex-col p-6">
      <QueueActions
        citizens={citizens}
        hasActiveServiceCitizen={hasActiveServiceCitizen}
        office={office}
      />
      {queueAlert && (
        <p
          className="bg-bc-danger-surface text-bc-danger border-bc-danger m-0 mb-4 border-l-4 px-3 py-2"
          role="alert"
        >
          {queueAlert}
        </p>
      )}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
      {isLoading ? (
        <QueueStatusMessage message="Loading queue..." />
      ) : errorMessage ? (
        <QueueStatusMessage message={errorMessage} tone="error" />
      ) : reception ? (
        <div className="flex min-h-0 flex-1 flex-col" ref={splitContainerRef}>
          <QueuePanel
            className="min-h-0"
            count={waitingCitizens.length}
            style={{
              flex: `${activeWaitingRatio} 1 0`,
              minHeight: minPanelHeight,
            }}
            title="Citizens Waiting"
          >
            <QueueTable
              citizens={waitingCitizens}
              emptyMessage="No citizens are waiting."
              onCitizenClick={handleWaitingCitizenClick}
              office={office}
              showCounter
              showNotifications={notificationsEnabled}
              tableLabel="Citizens waiting"
            />
          </QueuePanel>

          <button
            aria-label="Resize queue tables"
            className="border-bc-border bg-bc-light-gray focus-visible:outline-bc-link text-bc-secondary my-1 flex h-6 shrink-0 cursor-row-resize items-center justify-center border font-bold hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2"
            onKeyDown={handleResizeKeyDown}
            onPointerCancel={handleResizePointerEnd}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerEnd}
            type="button"
          >
            <GripHorizontal aria-hidden="true" className="h-4 w-4" />
          </button>

          <QueuePanel
            className="min-h-0"
            count={holdCitizens.length}
            style={{
              flex: `${1 - activeWaitingRatio} 1 0`,
              minHeight: minPanelHeight,
            }}
            title="Citizens on Hold"
          >
            <QueueTable
              citizens={holdCitizens}
              emptyMessage="No citizens are on hold."
              onCitizenClick={handleHoldCitizenClick}
              office={office}
              showCounter
              showNotifications={notificationsEnabled}
              tableLabel="Citizens on hold"
            />
          </QueuePanel>
        </div>
      ) : (
        <QueuePanel
          className="min-h-0 flex-1"
          count={holdCitizens.length}
          title="Citizens on Hold"
        >
          <QueueTable
            citizens={holdCitizens}
            emptyMessage="No citizens are on hold."
            onCitizenClick={handleHoldCitizenClick}
            office={office}
            showCounter={false}
            showNotifications={notificationsEnabled}
            tableLabel="Citizens on hold"
          />
        </QueuePanel>
      )}
        </div>
        {showDayAgenda && appointmentsEnabled(office) && (
          <DayAgendaPanel office={office} />
        )}
      </div>
      <ServeCitizenModal
        citizen={activeCitizen}
        citizens={citizens}
        office={office}
      />
    </section>
  )
}

function QueuePanel({
  children,
  className,
  count,
  style,
  title,
}: {
  children: ReactNode
  className?: string
  count: number
  style?: CSSProperties
  title: string
}) {
  const headingId = `${title.toLowerCase().replaceAll(' ', '-')}-title`

  return (
    <section
      className={`flex flex-col gap-2 ${className ?? ''}`}
      style={style}
      aria-labelledby={headingId}
    >
      <h3
        className="text-bc-body m-0 shrink-0 font-bold"
        id={headingId}
      >{`${title}: ${count}`}</h3>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function QueueStatusMessage({
  message,
  tone = 'default',
}: {
  message: string
  tone?: 'default' | 'error'
}) {
  return (
    <div
      className={
        tone === 'error'
          ? 'border-bc-danger bg-bc-danger-surface text-bc-primary border-l-4 p-4'
          : 'border-bc-gold-60 bg-bc-light-gray text-bc-secondary border-l-4 p-4'
      }
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {message}
    </div>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
