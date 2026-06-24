import type { ApiClient } from './client'
import { z } from 'zod'

import {
  addCitizenResponseSchema,
  appointmentResponseSchema,
  appointmentsResponseSchema,
  bookingsResponseSchema,
  bookingResponseSchema,
  categoriesResponseSchema,
  channelsResponseSchema,
  csrMeResponseSchema,
  csrStatesResponseSchema,
  csrUpdateResponseSchema,
  csrsResponseSchema,
  bcmpRequestResponseSchema,
  bcmpStatusResponseSchema,
  citizensResponseSchema,
  examResponseSchema,
  examsResponseSchema,
  examTypesResponseSchema,
  invigilatorsResponseSchema,
  officesResponseSchema,
  roomsResponseSchema,
  serviceRequestResponseSchema,
  servicesResponseSchema,
  uploadUrlResponseSchema,
} from './schemas'

export function getOffices(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/offices/', { schema: officesResponseSchema, signal })
    .then((response) => response.offices)
}

export function getCurrentCsr(client: ApiClient, signal?: AbortSignal) {
  return client.get('/csrs/me/', { schema: csrMeResponseSchema, signal })
}

export function getCsrs(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/csrs/', { schema: csrsResponseSchema, signal })
    .then((response) => response.csrs)
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
  accurate_time_ind?: number | null
  citizen_name?: string
  citizen_comments?: string
  counter_id?: number | null
  notification_email?: string
  notification_phone?: string
  priority?: number
  start_time?: string
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

export function inviteNextCitizen(
  client: ApiClient,
  counterId: number | null,
  signal?: AbortSignal,
) {
  return client.request('/citizens/invite/', {
    body: { counter_id: counterId },
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export function inviteCitizen(
  client: ApiClient,
  citizenId: number,
  counterId: number | null,
  signal?: AbortSignal,
) {
  return client.request(`/citizens/${citizenId}/invite/`, {
    body: { counter_id: counterId },
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

export function placeCitizenOnHold(
  client: ApiClient,
  citizenId: number,
  signal?: AbortSignal,
) {
  return client.request(`/citizens/${citizenId}/place_on_hold/`, {
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export function finishCitizenService(
  client: ApiClient,
  citizenId: number,
  inaccurate: boolean,
  signal?: AbortSignal,
) {
  return client.request(
    `/citizens/${citizenId}/finish_service/?inaccurate=${String(inaccurate)}`,
    {
      method: 'POST',
      schema: serviceRequestResponseSchema,
      signal,
    },
  )
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

export interface UpdateServiceRequestPayload {
  channel_id?: number
  quantity?: number
  service_id?: number
}

export function updateServiceRequest(
  client: ApiClient,
  serviceRequestId: number,
  payload: UpdateServiceRequestPayload,
  signal?: AbortSignal,
) {
  return client.request(`/service_requests/${serviceRequestId}/`, {
    body: payload,
    method: 'PUT',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export function activateServiceRequest(
  client: ApiClient,
  serviceRequestId: number,
  signal?: AbortSignal,
) {
  return client.request(`/service_requests/${serviceRequestId}/activate/`, {
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export function sendWalkinLineReminder(
  client: ApiClient,
  citizenId: number,
  signal?: AbortSignal,
) {
  return client.request('/send-reminder/line-walkin/', {
    body: { previous_citizen_id: citizenId },
    method: 'POST',
    schema: serviceRequestResponseSchema,
    signal,
  })
}

export interface AppointmentPayload {
  appointment_id?: number
  appointment_draft_id?: number
  blackout_flag?: string
  checked_in_time?: string
  citizen_name?: string | null
  comments?: string | null
  contact_information?: string | null
  end_time?: string
  office_id?: number
  recurring_uuid?: string | null
  service_id?: number | null
  start_time?: string
  stat_flag?: boolean
}

export function getAppointments(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/appointments/', { schema: appointmentsResponseSchema, signal })
    .then((response) =>
      response.appointments.filter((appointment) => !appointment.checked_in_time),
    )
}

export function createAppointment(
  client: ApiClient,
  payload: AppointmentPayload,
  signal?: AbortSignal,
) {
  return client
    .request('/appointments/', {
      body: payload,
      method: 'POST',
      schema: appointmentResponseSchema,
      signal,
    })
    .then((response) => response.appointment)
}

export function updateAppointment(
  client: ApiClient,
  appointmentId: number,
  payload: AppointmentPayload,
  signal?: AbortSignal,
) {
  return client
    .request(`/appointments/${appointmentId}/`, {
      body: payload,
      method: 'PUT',
      schema: appointmentResponseSchema,
      signal,
    })
    .then((response) => response.appointment)
}

export function deleteAppointment(
  client: ApiClient,
  appointmentId: number,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/${appointmentId}/`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function createDraftAppointment(
  client: ApiClient,
  payload: AppointmentPayload,
  signal?: AbortSignal,
) {
  return client
    .request('/appointments/draft', {
      authenticated: false,
      body: payload,
      method: 'POST',
      schema: appointmentResponseSchema,
      signal,
    })
    .then((response) => response.appointment)
}

export function deleteDraftAppointment(
  client: ApiClient,
  appointmentId: number,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/draft/${appointmentId}/`, {
    authenticated: false,
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function updateRecurringAppointment(
  client: ApiClient,
  recurringUuid: string,
  payload: AppointmentPayload,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/recurring/${recurringUuid}`, {
    body: payload,
    method: 'PUT',
    schema: appointmentsResponseSchema,
    signal,
  })
}

export function deleteRecurringAppointments(
  client: ApiClient,
  recurringUuid: string,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/recurring/${recurringUuid}`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function deleteAllStatAppointments(
  client: ApiClient,
  recurringUuid: string,
  signal?: AbortSignal,
) {
  return client.request(`/appointments/all-stat/${recurringUuid}`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function getRooms(
  client: ApiClient,
  officeId: number,
  signal?: AbortSignal,
) {
  return client
    .get(`/rooms/?office_id=${officeId}`, { schema: roomsResponseSchema, signal })
    .then((response) => response.rooms)
}

export function getBookings(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/bookings/', { schema: bookingsResponseSchema, signal })
    .then((response) => response.bookings)
}

export interface BookingPayload {
  blackout_flag?: string | null
  blackout_notes?: string | null
  booking_contact_information?: string | null
  booking_name?: string | null
  end_time?: string
  fees?: string | null
  for_stat?: boolean
  invigilator_id?: number | number[] | null
  office_id?: number
  recurring_uuid?: string | null
  room_id?: number | string | null
  sbc_staff_invigilated?: boolean | number | null
  shadow_invigilator_id?: number | null
  start_time?: string
  stat_flag?: boolean
}

export function createBooking(
  client: ApiClient,
  payload: BookingPayload,
  signal?: AbortSignal,
) {
  return client
    .request('/bookings/', {
      body: payload,
      method: 'POST',
      schema: bookingResponseSchema,
      signal,
    })
    .then((response) => response.booking)
}

export function updateBooking(
  client: ApiClient,
  bookingId: number,
  payload: BookingPayload,
  signal?: AbortSignal,
) {
  return client
    .request(`/bookings/${bookingId}/`, {
      body: payload,
      method: 'PUT',
      schema: bookingResponseSchema,
      signal,
    })
    .then((response) => response.booking)
}

export function deleteBooking(
  client: ApiClient,
  bookingId: number,
  signal?: AbortSignal,
) {
  return client.request(`/bookings/${bookingId}/`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function updateRecurringBooking(
  client: ApiClient,
  recurringUuid: string,
  payload: BookingPayload,
  signal?: AbortSignal,
) {
  return client.request(`/bookings/recurring/${recurringUuid}`, {
    body: payload,
    method: 'PUT',
    schema: bookingsResponseSchema,
    signal,
  })
}

export function deleteRecurringBooking(
  client: ApiClient,
  recurringUuid: string,
  signal?: AbortSignal,
) {
  return client.request(`/bookings/recurring/${recurringUuid}`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function deleteRecurringStatBookingsForCurrentOffice(
  client: ApiClient,
  recurringUuid: string,
  signal?: AbortSignal,
) {
  return client.request(`/bookings/recurring/current-office/${recurringUuid}`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function deleteRecurringStatBookingsForAllOffices(
  client: ApiClient,
  recurringUuid: string,
  signal?: AbortSignal,
) {
  return client.request(`/bookings/recurring/stat/${recurringUuid}`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function getInvigilators(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/invigilators/', { schema: invigilatorsResponseSchema, signal })
    .then((response) => response.invigilators)
}

export function getOffsiteInvigilators(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/invigilators/offsite/', {
      schema: invigilatorsResponseSchema,
      signal,
    })
    .then((response) => response.invigilators)
}

export function getExams(
  client: ApiClient,
  signal?: AbortSignal,
  officeNumber?: number | string | null,
) {
  const params = officeNumber ? `?office_number=${officeNumber}` : ''

  return client
    .get(`/exams/${params}`, { schema: examsResponseSchema, signal })
    .then((response) => response.exams)
}

export function getExamTypes(client: ApiClient, signal?: AbortSignal) {
  return client
    .get('/exam_types/', { schema: examTypesResponseSchema, signal })
    .then((response) => response.exam_types)
}

export type ExamPayload = Record<string, unknown>

export function createExam(
  client: ApiClient,
  payload: ExamPayload,
  signal?: AbortSignal,
) {
  return client
    .request('/exams/', {
      body: payload,
      method: 'POST',
      schema: examResponseSchema,
      signal,
    })
    .then((response) => response.exam)
}

export function requestBcmpExam(
  client: ApiClient,
  payload: ExamPayload,
  signal?: AbortSignal,
) {
  return client.request('/exams/bcmp/', {
    body: payload,
    method: 'POST',
    schema: bcmpRequestResponseSchema,
    signal,
  })
}

export function updateExam(
  client: ApiClient,
  examId: number,
  payload: ExamPayload,
  signal?: AbortSignal,
) {
  return client
    .request(`/exams/${examId}/`, {
      body: payload,
      method: 'PUT',
      schema: examResponseSchema,
      signal,
    })
    .then((response) => response.exam)
}

export function deleteExam(
  client: ApiClient,
  examId: number,
  signal?: AbortSignal,
) {
  return client.request(`/exams/${examId}/`, {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  })
}

export function refreshBcmpExamStatus(client: ApiClient, signal?: AbortSignal) {
  return client.request('/exams/bcmp_status/', {
    method: 'POST',
    schema: bcmpStatusResponseSchema,
    signal,
  })
}

export function getExamUploadUrl(
  client: ApiClient,
  examId: number,
  signal?: AbortSignal,
) {
  return client
    .get(`/exams/${examId}/upload/`, {
      schema: uploadUrlResponseSchema,
      signal,
    })
    .then((response) => response.url)
}

export function transferExamToBcmp(
  client: ApiClient,
  examId: number,
  signal?: AbortSignal,
) {
  return client.request(`/exams/${examId}/transfer/`, {
    method: 'POST',
    schema: bcmpRequestResponseSchema,
    signal,
  })
}

export async function uploadCompletedExamDocument(
  client: ApiClient,
  examId: number,
  file: Blob,
  signal?: AbortSignal,
) {
  const url = await getExamUploadUrl(client, examId, signal)
  await client.putPresignedBlob(url, file, signal)
  return transferExamToBcmp(client, examId, signal)
}

export function downloadExamDocument(
  client: ApiClient,
  examId: number,
  signal?: AbortSignal,
) {
  return client.requestBlob(`/exams/${examId}/download/`, { signal })
}

export function downloadExamExport(
  client: ApiClient,
  {
    endDate,
    examType,
    startDate,
  }: {
    endDate: string
    examType: string
    startDate: string
  },
  signal?: AbortSignal,
) {
  return client.requestBlob(
    `/exams/export/?start_date=${startDate}&end_date=${endDate}&exam_type=${examType}`,
    { signal },
  )
}

export function emailExamInvigilator(
  client: ApiClient,
  examId: number,
  payload: {
    invigilator_email?: string | null
    invigilator_id: number
    invigilator_name?: string | null
    invigilator_phone?: string | null
  },
  signal?: AbortSignal,
) {
  return client.request(`/exams/${examId}/email_invigilator/`, {
    body: payload,
    method: 'POST',
    schema: z.unknown(),
    signal,
  })
}

export function updateInvigilatorShadowCount(
  client: ApiClient,
  invigilatorId: number,
  params: { add: boolean; subtract: boolean },
  signal?: AbortSignal,
) {
  return client.request(
    `/invigilator/${invigilatorId}/?add=${params.add ? 'True' : 'False'}&subtract=${params.subtract ? 'True' : 'False'}`,
    {
      method: 'PUT',
      schema: z.unknown(),
      signal,
    },
  )
}

export function updateExamBooking(
  client: ApiClient,
  examId: number,
  bookingId: number | null,
  signal?: AbortSignal,
) {
  return client
    .request(`/exams/${examId}/`, {
      body: { booking_id: bookingId },
      method: 'PUT',
      schema: examResponseSchema,
      signal,
    })
    .then((response) => response.exam)
}

export function updateCsr(
  client: ApiClient,
  csrId: number,
  payload: {
    counter_id?: number | null
    csr_state_id?: number
    office_id?: number
    receptionist_ind?: number
  },
  signal?: AbortSignal,
) {
  return client.request(`/csrs/${csrId}/`, {
    body: payload,
    method: 'PUT',
    schema: csrUpdateResponseSchema,
    signal,
  })
}
