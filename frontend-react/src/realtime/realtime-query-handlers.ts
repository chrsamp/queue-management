import type { QueryClient } from '@tanstack/react-query'

import type { Appointment, Booking } from '@/api/schemas'
import { queryKeys } from '@/query/query-keys'

export function upsertAppointmentCache(
  queryClient: QueryClient,
  appointment: Appointment,
) {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.appointments.all })) {
    queryClient.setQueryData<Appointment[]>(query.queryKey, (current) => {
      if (!current) {
        return current
      }

      if (!queryMatchesOffice(query.queryKey, appointment.office_id)) {
        return current.filter(
          (item) => item.appointment_id !== appointment.appointment_id,
        )
      }

      const exists = current.some(
        (item) => item.appointment_id === appointment.appointment_id,
      )

      if (!exists) {
        return [...current, appointment]
      }

      return current.map((item) =>
        item.appointment_id === appointment.appointment_id ? appointment : item,
      )
    })
  }
}

export function removeAppointmentCache(
  queryClient: QueryClient,
  id: number | string,
) {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.appointments.all })) {
    queryClient.setQueryData<Appointment[]>(query.queryKey, (current) => {
      if (!current) {
        return current
      }

      if (typeof id === 'number') {
        return current.filter((item) => item.appointment_id !== id)
      }

      return current.filter((item) => item.recurring_uuid !== id)
    })
  }
}

export function refreshAppointmentQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.appointments.all,
  })
}

export function upsertBookingCache(queryClient: QueryClient, booking: Booking) {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.bookings.all })) {
    queryClient.setQueryData<Booking[]>(query.queryKey, (current) => {
      if (!current) {
        return current
      }

      if (!queryMatchesOffice(query.queryKey, booking.office_id)) {
        return current.filter((item) => item.booking_id !== booking.booking_id)
      }

      const exists = current.some(
        (item) => item.booking_id === booking.booking_id,
      )

      if (!exists) {
        return [...current, booking]
      }

      return current.map((item) =>
        item.booking_id === booking.booking_id ? booking : item,
      )
    })
  }
}

export function removeBookingCache(
  queryClient: QueryClient,
  id: number | string,
) {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.bookings.all })) {
    queryClient.setQueryData<Booking[]>(query.queryKey, (current) => {
      if (!current) {
        return current
      }

      if (typeof id === 'number') {
        return current.filter((item) => item.booking_id !== id)
      }

      return current.filter((item) => item.recurring_uuid !== id)
    })
  }
}

export function refreshBookingQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.bookings.all,
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.exams.all,
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.appointments.all,
  })
}

export function extractRealtimeId(payload: unknown, idKey: string) {
  if (typeof payload === 'number' || typeof payload === 'string') {
    return payload
  }

  if (payload && typeof payload === 'object' && idKey in payload) {
    const id = (payload as Record<string, unknown>)[idKey]

    if (typeof id === 'number' || typeof id === 'string') {
      return id
    }
  }

  return null
}

function queryMatchesOffice(queryKey: readonly unknown[], officeId: number) {
  const queryOfficeId = queryKey[1]
  return typeof queryOfficeId !== 'number' || queryOfficeId === officeId
}
