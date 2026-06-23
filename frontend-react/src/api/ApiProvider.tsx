import type { ReactNode } from 'react'

import type { ApiClient } from './client'
import { ApiClientContext } from './api-context'

export function ApiProvider({
  children,
  client,
}: {
  children: ReactNode
  client: ApiClient
}) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  )
}
