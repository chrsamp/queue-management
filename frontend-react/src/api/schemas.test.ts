import { describe, expect, test } from 'vitest'

import {
  appointmentResponseSchema,
  appointmentsResponseSchema,
} from './schemas'

const appointmentOffice = {
  appointment_duration: 30,
  appointments_days_limit: 30,
  appointments_enabled_ind: 1,
  check_in_notification: 1,
  civic_address: 'Victoria, BC',
  office_id: 3,
  office_name: 'Victoria',
  office_number: 94,
  sb_id: 1,
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
}

describe('appointment response schemas', () => {
  test('parses appointments with slim nested office data', () => {
    const response = appointmentsResponseSchema.parse({
      appointments: [
        {
          appointment_id: 3,
          blackout_flag: 'N',
          checked_in_time: null,
          citizen_id: 32,
          citizen_name: 'Test',
          comments: 'test',
          contact_information: '5555555555',
          end_time: '2026-06-24T20:45:00+00:00',
          is_draft: false,
          office: appointmentOffice,
          office_id: 3,
          online_flag: false,
          recurring_uuid: null,
          service: {
            parent: {
              service_name: 'MSP',
            },
            parent_id: 1,
            service_id: 10,
            service_name: 'Payment - MSP',
          },
          service_id: 10,
          start_time: '2026-06-24T20:30:00+00:00',
          stat_flag: false,
        },
      ],
      errors: {
        errors: {},
      },
    })

    expect(response.appointments).toHaveLength(1)
    expect(response.appointments[0].office.timezone.timezone_name).toBe(
      'America/Vancouver',
    )
  })

  test('parses blackout appointment responses with null service', () => {
    const response = appointmentResponseSchema.parse({
      appointment: {
        appointment_id: 4,
        blackout_flag: 'Y',
        checked_in_time: null,
        citizen_id: 33,
        citizen_name: 'BLACKOUT PERIOD',
        comments: 'Test blackout',
        contact_information: 'admin',
        end_time: '2026-06-26T17:00:00+00:00',
        is_draft: false,
        office: appointmentOffice,
        office_id: 3,
        online_flag: false,
        recurring_uuid: null,
        service: null,
        service_id: null,
        start_time: '2026-06-26T08:30:00+00:00',
        stat_flag: false,
      },
      errors: {},
    })

    expect(response.appointment.service).toBeNull()
    expect(response.appointment.office.office_id).toBe(3)
  })
})
