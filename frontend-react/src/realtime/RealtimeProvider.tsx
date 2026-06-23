import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'
import { useWorkflowStore } from '@/store/workflow-store'

import {
  RealtimeService as RealtimeService,
  type RealtimeConfig as RealtimeConfig,
  type RealtimeServiceOptions as RealtimeServiceOptions,
} from './realtime-service'

export interface RealtimeServiceHandle {
  close: () => void
  connect: () => void
  reconnect: () => void
}

interface RealtimeProviderProps {
  children: ReactNode
  config: RealtimeConfig
  createService?: (options: RealtimeServiceOptions) => RealtimeServiceHandle
}

function createRealtimeService(options: RealtimeServiceOptions) {
  return new RealtimeService(options)
}

export function RealtimeProvider({
  children,
  config,
  createService = createRealtimeService,
}: RealtimeProviderProps) {
  const auth = useAuth()
  const currentOfficeId = useWorkflowStore(
    (state) => state.currentOffice?.office_id ?? null,
  )
  const queryClient = useQueryClient()
  const previousOfficeId = useRef<number | null | undefined>(undefined)

  const service = useMemo(
    () => createService({ config, queryClient }),
    [config, createService, queryClient],
  )

  useEffect(() => {
    if (auth.authenticated) {
      service.connect()
    } else {
      service.close()
    }
  }, [auth.authenticated, service])

  useEffect(() => {
    return () => {
      service.close()
    }
  }, [service])

  useEffect(() => {
    if (!auth.authenticated) {
      previousOfficeId.current = undefined
      return
    }

    if (
      previousOfficeId.current === undefined ||
      previousOfficeId.current === null
    ) {
      previousOfficeId.current = currentOfficeId
      return
    }

    if (
      currentOfficeId !== null &&
      previousOfficeId.current !== currentOfficeId
    ) {
      previousOfficeId.current = currentOfficeId
      service.reconnect()
    }
  }, [auth.authenticated, currentOfficeId, service])

  return children
}
