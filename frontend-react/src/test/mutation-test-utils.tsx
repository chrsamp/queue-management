import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ApiProvider } from '@/api/ApiProvider'
import type { ApiClient } from '@/api/client'

export function createMutationTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ApiProvider client={{} as ApiClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ApiProvider>
    )
  }

  return { queryClient, Wrapper }
}
