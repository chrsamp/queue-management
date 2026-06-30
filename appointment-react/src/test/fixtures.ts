import type {
  Appointment,
  Office,
  PublicUser,
  Service,
  SlotsByDate,
} from '@/api/schemas'

export const officeFixture: Office = {
  office_id: 10,
  office_name: 'Victoria Service BC Centre',
  office_number: 101,
  appointments_enabled_ind: 1,
  appointment_duration: 30,
  appointments_days_limit: 30,
  civic_address: '403-771 Vernon Avenue, Victoria, BC',
  deleted: null,
  external_map_link: 'https://maps.example.test/victoria',
  latitude: 48.455,
  longitude: -123.377,
  office_appointment_message: 'Please arrive five minutes early.',
  online_status: 'Status.SHOW',
  telephone: '250-555-0100',
  timeslots: [
    {
      day_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      end_time: '16:30:00',
      no_of_slots: 16,
      start_time: '08:30:00',
    },
  ],
  timezone: { timezone_id: 1, timezone_name: 'America/Vancouver' },
}

const serviceBase = {
  actual_service_ind: 1,
  deleted: null,
  display_dashboard_ind: 1,
  parent: { service_name: 'Personal Services' },
  parent_id: 50,
  prefix: null,
  service_code: null,
  service_desc: 'Service description',
}

export const categoryFixture: Service = {
  actual_service_ind: 0,
  deleted: null,
  display_dashboard_ind: 0,
  external_service_name: 'Personal Services',
  is_dlkt: null,
  online_availability: 'Availability.SHOW',
  online_link: null,
  parent_id: null,
  prefix: null,
  service_code: 'PERSONAL',
  service_desc: 'Personal services',
  service_id: 50,
  service_name: 'Personal Services',
}

export const serviceFixtures: Service[] = [
  {
    ...serviceBase,
    service_id: 20,
    service_name: 'General Service',
    external_service_name: 'General Service',
    is_dlkt: false,
    online_availability: 'Availability.SHOW',
    online_link: null,
  },
  {
    ...serviceBase,
    service_id: 21,
    service_name: 'Unavailable Service',
    external_service_name: 'Unavailable Service',
    is_dlkt: false,
    online_availability: 'Availability.DISABLE',
    online_link: 'https://example.test/online',
  },
  {
    ...serviceBase,
    service_id: 22,
    service_name: 'Hidden Service',
    external_service_name: 'Hidden Service',
    is_dlkt: false,
    online_availability: 'Availability.HIDE',
    online_link: null,
  },
  {
    ...serviceBase,
    service_id: 23,
    service_name: 'Knowledge Test',
    external_service_name: 'Knowledge Test',
    is_dlkt: true,
    online_availability: 'Availability.SHOW',
    online_link: null,
  },
]

export const slotsFixture: SlotsByDate = {
  '07/15/2030': [
    { end_time: '09:30', no_of_slots: 1, start_time: '09:00' },
    { end_time: '10:00', no_of_slots: 2, start_time: '09:30' },
  ],
}

export const userFixture: PublicUser = {
  display_name: 'Alex Citizen',
  email: 'alex@example.test',
  last_name: 'Citizen',
  send_email_reminders: true,
  send_sms_reminders: false,
  telephone: '2505550101',
  user_id: 30,
  username: 'citizen@bceidboth',
}

export const draftFixture: Appointment = {
  appointment_id: 40,
  citizen_id: null,
  citizen_name: '',
  comments: '',
  end_time: '2030-07-15T16:30:00Z',
  is_draft: true,
  office: officeFixture,
  office_id: officeFixture.office_id,
  service: serviceFixtures[0]!,
  service_id: serviceFixtures[0]!.service_id,
  start_time: '2030-07-15T16:00:00Z',
}

export const appointmentFixture: Appointment = {
  ...draftFixture,
  appointment_id: 41,
  citizen_id: userFixture.user_id,
  citizen_name: userFixture.display_name ?? '',
  is_draft: false,
}

export const knowledgeTestAppointmentFixture: Appointment = {
  ...appointmentFixture,
  appointment_id: 42,
  service: serviceFixtures[3]!,
  service_id: serviceFixtures[3]!.service_id,
}
