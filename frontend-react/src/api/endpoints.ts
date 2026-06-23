import type { ApiClient } from './client'
import { csrMeResponseSchema, officesResponseSchema } from './schemas'

export function getOffices(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/offices/', { schema: officesResponseSchema, signal })
    .then((response) => response.offices)
}

export function getCurrentCsr(client: ApiClient, signal?: AbortSignal) {
  return client.get('/csrs/me/', { schema: csrMeResponseSchema, signal })
}
