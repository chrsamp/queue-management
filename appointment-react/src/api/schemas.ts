import { z } from 'zod'

const nullableString = z.string().nullable()
const nullableNumber = z.number().nullable()
const errorsSchema = z.record(z.string(), z.unknown())

export const timezoneSchema = z.object({
  timezone_id: z.number().int(),
  timezone_name: z.string(),
})

export const timeSlotScheduleSchema = z
  .object({
    day_of_week: z.array(z.string()).optional(),
    end_time: z.string().optional(),
    start_time: z.string().optional(),
    no_of_slots: z.number().int().optional(),
  })
  .loose()

export const officeSchema = z
  .object({
    office_id: z.number().int(),
    office_name: z.string(),
    office_number: z.number().int(),
    sb_id: nullableNumber.optional(),
    deleted: nullableString.optional(),
    exams_enabled_ind: nullableNumber.optional(),
    appointments_enabled_ind: nullableNumber.optional(),
    max_person_appointment_per_day: nullableNumber.optional(),
    telephone: nullableString.optional(),
    appointments_days_limit: nullableNumber.optional(),
    appointment_duration: nullableNumber.optional(),
    timezone: timezoneSchema,
    timeslots: z.array(timeSlotScheduleSchema).default([]),
    latitude: nullableNumber.optional(),
    longitude: nullableNumber.optional(),
    office_appointment_message: nullableString.optional(),
    civic_address: nullableString.optional(),
    online_status: nullableString.optional(),
    external_map_link: nullableString.optional(),
  })
  .loose()

export const serviceSchema = z
  .object({
    service_id: z.number().int(),
    service_code: nullableString.optional(),
    service_name: z.string(),
    service_desc: nullableString.optional(),
    parent: z.object({ service_name: z.string() }).nullable().optional(),
    parent_id: nullableNumber,
    deleted: nullableString.optional(),
    prefix: nullableString.optional(),
    display_dashboard_ind: z.number().int(),
    actual_service_ind: z.number().int(),
    external_service_name: nullableString.optional(),
    online_link: nullableString.optional(),
    online_availability: nullableString.optional(),
    timeslot_duration: nullableNumber.optional(),
    email_paragraph: nullableString.optional(),
    is_dlkt: z.boolean().nullable().optional(),
  })
  .loose()

export const slotSchema = z.object({
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  no_of_slots: z.number().int().nonnegative(),
})

export const slotsSchema = z.record(
  z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  z.array(slotSchema),
)

export const userSchema = z.object({
  telephone: nullableString,
  send_email_reminders: z.boolean().nullable(),
  email: nullableString,
  display_name: nullableString,
  last_name: nullableString,
  username: z.string(),
  user_id: z.number().int(),
  send_sms_reminders: z.boolean().nullable(),
})

export const appointmentSchema = z
  .object({
    appointment_id: z.number().int(),
    office_id: z.number().int(),
    service_id: nullableNumber.optional(),
    citizen_id: nullableNumber.optional(),
    start_time: nullableString,
    end_time: nullableString,
    checked_in_time: nullableString.optional(),
    comments: nullableString.optional(),
    citizen_name: z.string(),
    contact_information: nullableString.optional(),
    blackout_flag: nullableString.optional(),
    recurring_uuid: nullableString.optional(),
    online_flag: z.boolean().nullable().optional(),
    is_draft: z.boolean().nullable().optional(),
    office: officeSchema.nullable().optional(),
    service: serviceSchema.nullable().optional(),
  })
  .loose()

export const officesResponseSchema = z.object({
  errors: errorsSchema,
  offices: z.array(officeSchema),
})
export const servicesResponseSchema = z.object({
  errors: errorsSchema,
  services: z.array(serviceSchema),
})
export const categoriesResponseSchema = z.object({
  categories: z.array(serviceSchema),
  errors: errorsSchema,
})
export const appointmentResponseSchema = z.object({
  appointment: appointmentSchema,
  errors: errorsSchema,
})
export const draftAppointmentResponseSchema = z.object({
  appointment: appointmentSchema,
  warning: z.unknown().optional(),
})
export const appointmentsResponseSchema = z.object({
  appointments: z.array(appointmentSchema),
})
export const usersResponseSchema = z.array(userSchema)
export const emptyResponseSchema = z.null()

export type Office = z.infer<typeof officeSchema>
export type Service = z.infer<typeof serviceSchema>
export type AppointmentSlot = z.infer<typeof slotSchema>
export type SlotsByDate = z.infer<typeof slotsSchema>
export type PublicUser = z.infer<typeof userSchema>
export type Appointment = z.infer<typeof appointmentSchema>

export interface AppointmentRequest {
  start_time: string
  end_time: string
  service_id: number
  comments: string
  office_id: number
  user_id?: number
  citizen_name?: string
  contact_information?: string
  is_draft?: boolean
  appointment_draft_id?: number
}

export interface UserUpdateRequest {
  email: string
  telephone: string
  send_email_reminders: boolean
  send_sms_reminders: boolean
}
