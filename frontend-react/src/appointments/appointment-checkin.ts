import {
  addCitizenToQueue,
  beginCitizenService,
  createServiceRequest,
  getChannels,
  updateAppointment,
  updateCitizen,
} from '@/api/endpoints'
import type { ApiClient } from '@/api/client'
import type { Appointment } from '@/api/schemas'

export async function checkInAppointment({
  apiClient,
  appointment,
  beginService,
}: {
  apiClient: ApiClient
  appointment: Appointment
  beginService: boolean
}) {
  if (!appointment.citizen_id || !appointment.service_id) {
    throw new Error(
      'The appointment is missing citizen or service information.',
    )
  }

  const checkedInTime = new Date().toISOString()

  await updateAppointment(apiClient, appointment.appointment_id, {
    appointment_id: appointment.appointment_id,
    checked_in_time: checkedInTime,
    citizen_name: appointment.citizen_name ?? '',
    service_id: appointment.service_id,
  })

  const channels = await getChannels(apiClient)
  const inPersonChannel = channels.find((channel) =>
    channel.channel_name.includes('Person'),
  )

  if (!inPersonChannel) {
    throw new Error('The Person channel is not available.')
  }

  await updateCitizen(apiClient, appointment.citizen_id, {
    citizen_comments: `${formatAppointmentPrefix(appointment.start_time)}|||${
      appointment.comments ?? ''
    }`,
    citizen_name: appointment.citizen_name ?? '',
    priority: 1,
    start_time: appointment.start_time.replace('+00:00', 'Z'),
  })
  await createServiceRequest(apiClient, {
    channel_id: inPersonChannel.channel_id,
    citizen_id: appointment.citizen_id,
    priority: 1,
    quantity: 1,
    service_id: appointment.service_id,
  })

  if (beginService) {
    await beginCitizenService(apiClient, appointment.citizen_id)
  } else {
    await addCitizenToQueue(apiClient, appointment.citizen_id)
  }
}

function formatAppointmentPrefix(value: string) {
  const date = new Date(value)
  const hours = date.getHours() % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}
