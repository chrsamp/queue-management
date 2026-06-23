import { act, cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { AuthProvider } from '@/auth/AuthProvider'
import type { AuthService, AuthSnapshot } from '@/auth/auth-service'
import type { Office } from '@/api/schemas'
import { useWorkflowStore } from '@/store/workflow-store'

import {
  RealtimeProvider,
  type RealtimeServiceHandle,
} from './RealtimeProvider'

const config = {
  reconnectionDelayMax: 5000,
  timeout: 20000,
  url: 'http://localhost:5000',
}

const downtownOffice = {
  counters: [],
  office_id: 1,
  office_name: 'Downtown',
  office_number: 101,
  sb: null,
  timeslots: [],
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
} satisfies Office

const victoriaOffice = {
  ...downtownOffice,
  office_id: 2,
  office_name: 'Victoria',
  office_number: 94,
} satisfies Office

function createAuthHarness(initial: AuthSnapshot) {
  let snapshot = initial
  const subscribers = new Set<() => void>()

  return {
    authService: {
      getSnapshot: () => snapshot,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      subscribe: (subscriber: () => void) => {
        subscribers.add(subscriber)
        return () => {
          subscribers.delete(subscriber)
        }
      },
    },
    setSnapshot: (next: Partial<AuthSnapshot>) => {
      snapshot = { ...snapshot, ...next }
      subscribers.forEach((subscriber) => {
        subscriber()
      })
    },
  }
}

function renderProvider({
  authSnapshot,
  service,
}: {
  authSnapshot: AuthSnapshot
  service: RealtimeServiceHandle
}) {
  const auth = createAuthHarness(authSnapshot)
  const queryClient = new QueryClient()
  const createService = vi.fn(() => service)

  render(
    <AuthProvider authService={auth.authService as unknown as AuthService}>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider config={config} createService={createService}>
          <div>socket child</div>
        </RealtimeProvider>
      </QueryClientProvider>
    </AuthProvider>,
  )

  return { auth, createService }
}

const unauthenticatedSnapshot: AuthSnapshot = {
  authenticated: false,
  error: null,
  initialized: true,
  token: null,
  username: null,
}

const authenticatedSnapshot: AuthSnapshot = {
  authenticated: true,
  error: null,
  initialized: true,
  token: 'token',
  username: 'queue.user',
}

afterEach(() => {
  cleanup()
  useWorkflowStore.getState().clearWorkflow()
  vi.clearAllMocks()
})

describe('StaffSocketProvider', () => {
  test('connects only after authentication and closes on logout', () => {
    const service = {
      close: vi.fn(),
      connect: vi.fn(),
      reconnect: vi.fn(),
    }
    const { auth } = renderProvider({
      authSnapshot: unauthenticatedSnapshot,
      service,
    })

    expect(service.connect).not.toHaveBeenCalled()
    expect(service.close).toHaveBeenCalledTimes(1)

    act(() => {
      auth.setSnapshot(authenticatedSnapshot)
    })

    expect(service.connect).toHaveBeenCalledTimes(1)

    act(() => {
      auth.setSnapshot(unauthenticatedSnapshot)
    })

    expect(service.close).toHaveBeenCalledTimes(2)
  })

  test('reconnects when the current office changes after initial load', () => {
    const service = {
      close: vi.fn(),
      connect: vi.fn(),
      reconnect: vi.fn(),
    }

    renderProvider({
      authSnapshot: authenticatedSnapshot,
      service,
    })

    expect(service.connect).toHaveBeenCalledTimes(1)

    act(() => {
      useWorkflowStore.getState().setCurrentOffice(downtownOffice)
    })

    expect(service.reconnect).not.toHaveBeenCalled()

    act(() => {
      useWorkflowStore.getState().setCurrentOffice(victoriaOffice)
    })

    expect(service.reconnect).toHaveBeenCalledTimes(1)
  })
})
