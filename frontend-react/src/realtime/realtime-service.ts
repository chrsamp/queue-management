import type { QueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'

import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

export interface RealtimeConfig {
  reconnectionDelayMax: number
  timeout: number
  url: string
}

export interface RealtimeServiceOptions {
  config: RealtimeConfig
  queryClient: QueryClient
}

interface ClearCsrCachePayload {
  id?: unknown
}

type RealtimeSocket = Socket & {
  io: Socket['io'] & {
    on: (eventName: string, listener: (...args: unknown[]) => void) => void
  }
}

const socketPath = '/api/v1/socket.io'

export class RealtimeService {
  private readonly config: RealtimeConfig
  private readonly queryClient: QueryClient
  private reconnectInterval: number | null = null
  private socket: RealtimeSocket | null = null
  private intentionallyClosed = false

  constructor({ config, queryClient }: RealtimeServiceOptions) {
    this.config = config
    this.queryClient = queryClient
  }

  connect() {
    if (this.socket?.connected) {
      return
    }

    this.intentionallyClosed = false
    this.clearReconnectInterval()
    useWorkflowStore.getState().setRealtimeConnectionStatus('connecting')

    if (!this.socket) {
      this.socket = io(this.config.url, {
        autoConnect: false,
        path: socketPath,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
        transports: ['websocket'],
        withCredentials: true,
      }) as RealtimeSocket
      this.addListeners(this.socket)
    }

    console.info('Socket attempting to connect')
    this.socket.open()
  }

  close() {
    this.intentionallyClosed = true
    this.clearReconnectInterval()

    if (this.socket) {
      this.socket.close()
      this.socket.removeAllListeners()
      this.socket = null
    }

    useWorkflowStore.getState().setRealtimeConnectionStatus('idle')
    useWorkflowStore.getState().setRealtimeRoomStatus('idle')
    console.info('socket session closed')
  }

  reconnect() {
    this.close()
    this.connect()
  }

  private addListeners(socket: RealtimeSocket) {
    socket.on('connect', () => {
      this.recordEvent('connect')
      console.info('socket connected')
      this.clearReconnectInterval()
      useWorkflowStore.getState().setRealtimeConnectionStatus('connected')
      this.join()
    })

    socket.on('disconnect', () => {
      this.recordEvent('disconnect')
      console.info('socket disconnected')
      useWorkflowStore.getState().setRealtimeConnectionStatus('disconnected')

      if (!this.intentionallyClosed) {
        this.startReconnectInterval()
      }
    })

    socket.on('reconnecting', () => {
      this.markReconnecting('reconnecting')
    })

    socket.io.on('reconnect_attempt', () => {
      this.markReconnecting('reconnect_attempt')
    })

    socket.on('joinRoomSuccess', (payload: unknown) => {
      this.recordEvent('joinRoomSuccess')
      console.info('socket received: "joinRoomSuccess"', payload)
      useWorkflowStore.getState().setRealtimeRoomStatus('joined')
      useWorkflowStore.getState().setRealtimeError(null)
    })

    socket.on('joinRoomFail', (payload: unknown) => {
      this.recordEvent('joinRoomFail')
      console.warn('socket received: "joinRoomFail"', payload)
      useWorkflowStore.getState().setRealtimeRoomStatus('failed')
      useWorkflowStore.getState().setRealtimeError('Unable to join staff room')
    })

    socket.on('get_Csr_State_IDs', () => {
      this.recordEvent('get_Csr_State_IDs')
      console.info('socket received: "get_Csr_State_IDs"')
      void this.queryClient.invalidateQueries({ queryKey: queryKeys.csrStates })
    })

    socket.on('update_customer_list', (payload: unknown) => {
      this.recordDeferredEvent('update_customer_list', payload)
      void this.queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
    })

    socket.on('update_active_citizen', (payload: unknown) => {
      this.recordDeferredEvent('update_active_citizen', payload)
      void this.queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      void this.queryClient.invalidateQueries({
        queryKey: queryKeys.activeCitizen,
      })
    })

    socket.on('csr_update', (payload: unknown) => {
      this.recordEvent('csr_update')
      console.info('socket received: "csr_update"', payload)
      void this.queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me })

      if (useWorkflowStore.getState().currentRoleCode === 'GA') {
        console.info(
          'socket received: "csr_update"; GA CSR list refresh is deferred until the GA screen is implemented',
        )
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.csrs.all })
      }
    })

    socket.on('clear_csr_cache', (payload: ClearCsrCachePayload) => {
      this.recordEvent('clear_csr_cache')
      console.info('socket received: "clear_csr_cache"', payload)
      socket.emit('clear_csr_user_id', payload?.id)
    })

    socket.on('update_offices_cache', () => {
      this.recordEvent('update_offices_cache')
      console.info('socket received: "update_offices_cache"')
      socket.emit('sync_offices_cache')
      void this.queryClient.invalidateQueries({ queryKey: queryKeys.offices })
      void this.queryClient.invalidateQueries({ queryKey: queryKeys.csrs.me })
    })

    socket.on('appointment_create', (payload: unknown) => {
      this.recordDeferredEvent('appointment_create', payload)
      void this.queryClient.invalidateQueries({
        queryKey: queryKeys.appointments,
      })
    })

    socket.on('appointment_update', (payload: unknown) => {
      this.recordDeferredEvent('appointment_update', payload)
      void this.queryClient.invalidateQueries({
        queryKey: queryKeys.appointments,
      })
    })

    socket.on('appointment_delete', (payload: unknown) => {
      this.recordDeferredEvent('appointment_delete', payload)
      void this.queryClient.invalidateQueries({
        queryKey: queryKeys.appointments,
      })
    })
  }

  private join() {
    this.socket?.emit('joinRoom', { count: 0 }, () => {
      console.info('socket emit: "joinRoom"')
    })
  }

  private markReconnecting(eventName: string) {
    this.recordEvent(eventName)
    console.info('socket reconnecting')
    useWorkflowStore.getState().setRealtimeConnectionStatus('reconnecting')
  }

  private recordDeferredEvent(eventName: string, payload: unknown) {
    this.recordEvent(eventName)
    console.info(
      `socket received: "${eventName}"; React handling is deferred to a future route implementation`,
      payload,
    )
  }

  private recordEvent(eventName: string) {
    useWorkflowStore.getState().setRealtimeEvent(eventName)
  }

  private startReconnectInterval() {
    if (this.reconnectInterval !== null) {
      return
    }

    this.reconnectInterval = window.setInterval(() => {
      console.info('Reconnecting')
      useWorkflowStore.getState().setRealtimeConnectionStatus('reconnecting')
      this.socket?.open()
    }, 1000)
  }

  private clearReconnectInterval() {
    if (this.reconnectInterval !== null) {
      window.clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }
  }
}
