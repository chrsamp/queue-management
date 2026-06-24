import type { ApiClient } from './client'
import { z } from 'zod'

import {
  addCitizenResponseSchema,
  categoriesResponseSchema,
  channelsResponseSchema,
  csrMeResponseSchema,
  csrStatesResponseSchema,
  csrUpdateResponseSchema,
  citizensResponseSchema,
  officesResponseSchema,
  serviceRequestResponseSchema,
  servicesResponseSchema,
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

export function getCategories(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/categories/', { schema: categoriesResponseSchema, signal })
    .then((response) => response.categories)
}

export function getChannels(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/channels/', { schema: channelsResponseSchema, signal })
    .then((response) => response.channels)
}

export function getServices(
  client: ApiClient,
  officeId: number,
  signal?: AbortSignal,
) {
  return client
    .get(`/services/?office_id=${officeId}`, {
      schema: servicesResponseSchema,
      signal,
    })
    .then((response) =>
      response.services.filter((service) => service.actual_service_ind === 1),
    )
}

export function addCitizen(
  client: ApiClient,
  citizensWaiting: number,
  signal?: AbortSignal,
) {
  return client
    .request(`/citizens/${citizensWaiting}/add_citizen/`, {
      method: 'POST',
      schema: addCitizenResponseSchema,
      signal,
    })
    .then((response) => response.citizen)
}

export interface UpdateCitizenPayload {
  citizen_comments?: string
  counter_id?: number | null
  notification_email?: string
  notification_phone?: string
  priority?: number
  walkin_unique_id?: string
}

export function updateCitizen(
  client: ApiClient,
  citizenId: number,
  payload: UpdateCitizenPayload,
  signal?: AbortSignal,
) {
  return client.request(`/citizens/${citizenId}/`, {
    body: payload,
    method: 'PUT',
    schema: addCitizenResponseSchema,
    signal,
  })
}

export interface CreateServiceRequestPayload {
  channel_id: number
  citizen_id: number
  priority: number
  quantity: number
  service_id: number
}

export function createServiceRequest(
  client: ApiClient,
  serviceRequest: CreateServiceRequestPayload,
  signal?: AbortSignal,
) {
  return client.request('/service_requests/', {
    body: { service_request: serviceRequest },
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export function addCitizenToQueue(
  client: ApiClient,
  citizenId: number,
  signal?: AbortSignal,
) {
  return client.request(`/citizens/${citizenId}/add_to_queue/`, {
    body: {},
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export function beginCitizenService(
  client: ApiClient,
  citizenId: number,
  signal?: AbortSignal,
) {
  return client.request(`/citizens/${citizenId}/begin_service/`, {
    body: {},
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export function markCitizenLeft(
  client: ApiClient,
  citizenId: number,
  signal?: AbortSignal,
) {
  return client.request(`/citizens/${citizenId}/citizen_left/`, {
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
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
