import type { ApiClient } from './client'
import { z } from 'zod'

import {
  csrMeResponseSchema,
  csrStatesResponseSchema,
  csrUpdateResponseSchema,
  citizensResponseSchema,
  officesResponseSchema,
} from './schemas'

export function getOffices(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/offices/', { schema: officesResponseSchema, signal })
    .then((response) => response.offices)
}

export function getCurrentCsr(client: ApiClient, signal?: AbortSignal) {
  return client.get('/csrs/me/', { schema: csrMeResponseSchema, signal })
}

export function loginAdminSession(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/login/', { schema: z.unknown(), signal })
    .then(() => ({ authenticated: true }))
}

export function getCsrStates(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/csr_states/', { schema: csrStatesResponseSchema, signal })
    .then((response) => response.csr_states)
}

export function getCitizens(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/citizens/', { schema: citizensResponseSchema, signal })
    .then((response) => response.citizens)
}

export function updateCsr(
  client: ApiClient,
  csrId: number,
  payload: { csr_state_id?: number; office_id?: number },
  signal?: AbortSignal,
) {
  return client.request(`/csrs/${csrId}/`, {
    body: payload,
    method: 'PUT',
    schema: csrUpdateResponseSchema,
    signal,
  })
}
