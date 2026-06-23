import { useContext } from 'react'

import { ApiClientContext } from './api-context'

export function useApiClient() {
  const client = useContext(ApiClientContext)

  if (!client) {
    throw new Error('useApiClient must be used within ApiProvider')
  }

  return client
}
