import type { ReactNode } from 'react'

import { ApiContext } from './api-context'
import type { ApiClient } from './client'

export default function ApiProvider({
  children,
  client,
}: {
  children: ReactNode
  client: ApiClient
}) {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>
}
