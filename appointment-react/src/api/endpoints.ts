import type { ApiClient } from './client'
import {
  appointmentResponseSchema,
  appointmentsResponseSchema,
  categoriesResponseSchema,
  draftAppointmentResponseSchema,
  emptyResponseSchema,
  officesResponseSchema,
  servicesResponseSchema,
  slotsSchema,
  usersResponseSchema,
  type AppointmentRequest,
  type UserUpdateRequest,
} from './schemas'

export function getOffices(client: ApiClient, signal?: AbortSignal) {
  return client.get('/offices/', {
    authenticated: false,
    schema: officesResponseSchema,
    signal,
  })
}

export function getServices(
  client: ApiClient,
  officeId?: number,
  signal?: AbortSignal,
) {
  const query = officeId === undefined ? '' : `?office_id=${officeId}`
  return client.get(`/services/${query}`, {
    authenticated: false,
    schema: servicesResponseSchema,
    signal,
  })
}

export function getCategories(client: ApiClient, signal?: AbortSignal) {
  return client.get('/categories/', {
    authenticated: false,
    schema: categoriesResponseSchema,
    signal,
  })
}

export function getSlots(
  client: ApiClient,
  officeId: number,
  serviceId: number,
  signal?: AbortSignal,
) {
  return client.get(`/offices/${officeId}/slots/?service_id=${serviceId}`, {
    authenticated: false,
    schema: slotsSchema,
    signal,
  })
}

export function createDraft(
  client: ApiClient,
  request: AppointmentRequest,
  signal?: AbortSignal,
) {
  return client.request('/appointments/draft', {
    authenticated: false,
    body: request,
    method: 'POST',
    schema: draftAppointmentResponseSchema,
    signal,
  })
}

export function deleteDraft(
  client: ApiClient,
  appointmentId: number,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/draft/${appointmentId}/`, {
    authenticated: false,
    method: 'DELETE',
    schema: emptyResponseSchema,
    signal,
  })
}

export function createAppointment(
  client: ApiClient,
  request: AppointmentRequest,
  signal?: AbortSignal,
) {
  return client.request('/appointments/', {
    body: request,
    method: 'POST',
    schema: appointmentResponseSchema,
    signal,
  })
}

export function updateAppointment(
  client: ApiClient,
  appointmentId: number,
  request: AppointmentRequest,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/${appointmentId}/`, {
    body: request,
    method: 'PUT',
    schema: appointmentResponseSchema,
    signal,
  })
}

export function deleteAppointment(
  client: ApiClient,
  appointmentId: number,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/${appointmentId}/`, {
    method: 'DELETE',
    schema: emptyResponseSchema,
    signal,
  })
}

export function getAppointments(client: ApiClient, signal?: AbortSignal) {
  return client.get('/users/appointments/', {
    schema: appointmentsResponseSchema,
    signal,
  })
}

export function createUser(client: ApiClient, signal?: AbortSignal) {
  return client.request('/users/', {
    body: {},
    method: 'POST',
    schema: usersResponseSchema,
    signal,
  })
}

export function getCurrentUser(client: ApiClient, signal?: AbortSignal) {
  return client.get('/users/me/', { schema: usersResponseSchema, signal })
}

export function updateUser(
  client: ApiClient,
  userId: number,
  request: UserUpdateRequest,
  signal?: AbortSignal,
) {
  return client.request(`/users/${userId}/`, {
    body: request,
    method: 'PUT',
    schema: usersResponseSchema,
    signal,
  })
}
