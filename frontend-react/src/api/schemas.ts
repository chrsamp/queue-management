import { z } from 'zod'

const errorsSchema = z.record(z.string(), z.unknown())

export const timezoneSchema = z
  .object({
    timezone_id: z.number(),
    timezone_name: z.string(),
  })
  .passthrough()

export const counterSchema = z
  .object({
    counter_id: z.number(),
    counter_name: z.string(),
  })
  .passthrough()

export const smartboardSchema = z
  .object({
    sb_id: z.number(),
    sb_type: z.string(),
  })
  .passthrough()

export const quickServiceSchema = z
  .object({
    deleted: z.unknown().nullable().optional(),
    service_id: z.number(),
    service_name: z.string(),
  })
  .passthrough()

export const roleSchema = z
  .object({
    role_id: z.number(),
    role_code: z.string(),
    role_desc: z.string().nullable().optional(),
  })
  .passthrough()

export const csrStateSchema = z
  .object({
    csr_state_id: z.number(),
    csr_state_name: z.string(),
    csr_state_desc: z.string().nullable().optional(),
  })
  .passthrough()

export const officeSchema = z
  .object({
    appointments_enabled_ind: z.number().nullable().optional(),
    exams_enabled_ind: z.number().nullable().optional(),
    office_id: z.number(),
    office_name: z.string(),
    office_number: z.number(),
    timezone: timezoneSchema,
    counters: z.array(counterSchema),
    timeslots: z.array(z.unknown()),
    sb: smartboardSchema.nullable().optional(),
    quick_list: z.array(quickServiceSchema).optional(),
    back_office_list: z.array(quickServiceSchema).optional(),
    check_in_notification: z.number().nullable().optional(),
  })
  .passthrough()

export const appointmentOfficeSchema = z
  .object({
    appointments_enabled_ind: z.number().nullable().optional(),
    appointment_duration: z.number().nullable().optional(),
    office_id: z.number(),
    office_name: z.string(),
    office_number: z.number(),
    timezone: timezoneSchema,
  })
  .passthrough()

export const csrSchema = z
  .object({
    csr_id: z.number(),
    username: z.string(),
    office_id: z.number(),
    role_id: z.number(),
    csr_state_id: z.number(),
    counter_id: z.number(),
    counter: z.number(),
    role: roleSchema,
    office: officeSchema,
    csr_state: csrStateSchema.nullable().optional(),
    finance_designate: z.number().nullable(),
    ita2_designate: z.number().nullable(),
    pesticide_designate: z.number().nullable(),
    qt_xn_csr_ind: z.number().nullable(),
    office_manager: z.number().nullable().optional(),
    receptionist_ind: z.number().nullable().optional(),
  })
  .passthrough()

export const csrListItemSchema = csrSchema.omit({ office: true })

export const officesResponseSchema = z
  .object({
    offices: z.array(officeSchema),
    errors: errorsSchema,
  })
  .passthrough()

export const csrStatesResponseSchema = z
  .object({
    csr_states: z.array(csrStateSchema),
    errors: errorsSchema,
  })
  .passthrough()

export const csrMeResponseSchema = z
  .object({
    csr: csrSchema,
    attention_needed: z.boolean(),
    active_citizens: z.array(z.unknown()),
    back_office_display: z.unknown(),
    recurring_feature_flag: z.unknown(),
    errors: errorsSchema,
  })
  .passthrough()

export const csrsResponseSchema = z
  .object({
    csrs: z.array(csrListItemSchema),
    errors: errorsSchema,
  })
  .passthrough()

export const csrUpdateResponseSchema = z
  .object({
    csr: csrSchema,
    errors: errorsSchema,
  })
  .passthrough()

export const periodStateSchema = z
  .object({
    ps_name: z.string(),
  })
  .passthrough()

export const periodCsrSchema = z
  .object({
    username: z.string(),
    counter_id: z.number().nullable().optional(),
    counter: z.number().nullable().optional(),
  })
  .passthrough()

export const periodSchema = z
  .object({
    period_id: z.number(),
    csr_id: z.number().nullable().optional(),
    time_start: z.string().nullable().optional(),
    time_end: z.string().nullable().optional(),
    ps: periodStateSchema,
    csr: periodCsrSchema,
  })
  .passthrough()

export const serviceParentSchema = z
  .object({
    service_name: z.string(),
  })
  .passthrough()

export const serviceRequestServiceSchema = z
  .object({
    service_name: z.string(),
    parent: serviceParentSchema.nullable().optional(),
    parent_id: z.number().nullable().optional(),
  })
  .passthrough()

export const serviceRequestSchema = z
  .object({
    sr_id: z.number(),
    citizen_id: z.number(),
    channel_id: z.number().nullable().optional(),
    channel: z
      .object({
        channel_id: z.number().optional(),
        channel_name: z.string(),
      })
      .passthrough()
      .nullable()
      .optional(),
    quantity: z.number().nullable().optional(),
    service_id: z.number().nullable().optional(),
    periods: z.array(periodSchema),
    service: serviceRequestServiceSchema,
  })
  .passthrough()

export const citizenStateSchema = z
  .object({
    cs_state_name: z.string(),
  })
  .passthrough()

export const citizenSchema = z
  .object({
    citizen_id: z.number(),
    citizen_name: z.string().nullable().optional(),
    office_id: z.number(),
    ticket_number: z.string().nullable().optional(),
    citizen_comments: z.string().nullable().optional(),
    counter_id: z.number().nullable().optional(),
    start_time: z.string().nullable().optional(),
    service_reqs: z.array(serviceRequestSchema),
    cs: citizenStateSchema,
    priority: z.number().nullable().optional(),
    notification_sent_time: z.string().nullable().optional(),
    notification_phone: z.string().nullable().optional(),
    notification_email: z.string().nullable().optional(),
    reminder_flag: z.number().nullable().optional(),
    accurate_time_ind: z.number().nullable().optional(),
    walkin_unique_id: z.string().nullable().optional(),
  })
  .passthrough()

export const citizensResponseSchema = z
  .object({
    citizens: z.array(citizenSchema),
    errors: errorsSchema,
  })
  .passthrough()

export const categorySchema = z
  .object({
    service_id: z.number(),
    service_name: z.string(),
  })
  .passthrough()

export const channelSchema = z
  .object({
    channel_id: z.number(),
    channel_name: z.string(),
  })
  .passthrough()

export const serviceSchema = z
  .object({
    actual_service_ind: z.number().nullable().optional(),
    css_colour: z.string().nullable().optional(),
    display_dashboard_ind: z.number().nullable().optional(),
    parent: serviceParentSchema.nullable().optional(),
    parent_id: z.number().nullable().optional(),
    service_desc: z.string().nullable().optional(),
    service_id: z.number(),
    service_name: z.string(),
    timeslot_duration: z.number().nullable().optional(),
  })
  .passthrough()

export const appointmentSchema = z
  .object({
    appointment_id: z.number(),
    blackout_flag: z.string().nullable().optional(),
    checked_in_time: z.string().nullable().optional(),
    citizen_id: z.number().nullable().optional(),
    citizen_name: z.string().nullable().optional(),
    comments: z.string().nullable().optional(),
    contact_information: z.string().nullable().optional(),
    end_time: z.string(),
    is_draft: z.boolean().nullable().optional(),
    office: appointmentOfficeSchema,
    office_id: z.number(),
    online_flag: z.boolean().nullable().optional(),
    recurring_uuid: z.string().nullable().optional(),
    service: serviceSchema.nullable().optional(),
    service_id: z.number().nullable().optional(),
    start_time: z.string(),
    stat_flag: z.boolean().nullable().optional(),
  })
  .passthrough()

export const appointmentsResponseSchema = z
  .object({
    appointments: z.array(appointmentSchema),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const appointmentResponseSchema = z
  .object({
    appointment: appointmentSchema,
    errors: z.unknown().optional(),
    warning: z.unknown().optional(),
  })
  .passthrough()

export const roomSchema = z
  .object({
    capacity: z.number().nullable().optional(),
    color: z.string().nullable().optional(),
    deleted: z.string().nullable().optional(),
    office_id: z.number().nullable().optional(),
    room_id: z.number(),
    room_name: z.string(),
  })
  .passthrough()

export const roomsResponseSchema = z
  .object({
    rooms: z.array(roomSchema),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const invigilatorSchema = z
  .object({
    contact_email: z.string().nullable().optional(),
    contact_phone: z.string().nullable().optional(),
    deleted: z.unknown().nullable().optional(),
    invigilator_id: z.number(),
    invigilator_name: z.string(),
    invigilator_notes: z.string().nullable().optional(),
    shadow_count: z.number().nullable().optional(),
  })
  .passthrough()

export const invigilatorsResponseSchema = z
  .object({
    invigilators: z.array(invigilatorSchema),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const uploadUrlResponseSchema = z
  .object({
    url: z.string(),
  })
  .passthrough()

export const bcmpStatusResponseSchema = z
  .object({
    exams_updated: z.array(z.number()).optional(),
  })
  .passthrough()

export const bcmpRequestResponseSchema = z
  .object({
    bcmp_job_id: z.string().optional(),
    bcmp: z.unknown().optional(),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const bookingOfficeSchema = appointmentOfficeSchema

export const bookingSchema = z
  .object({
    blackout_flag: z.string().nullable().optional(),
    blackout_notes: z.string().nullable().optional(),
    booking_contact_information: z.string().nullable().optional(),
    booking_id: z.number(),
    booking_name: z.string().nullable().optional(),
    end_time: z.string(),
    fees: z.string().nullable().optional(),
    invigilator: invigilatorSchema.nullable().optional(),
    invigilator_id: z.number().nullable().optional(),
    invigilators: z.array(invigilatorSchema).optional(),
    office: bookingOfficeSchema,
    office_id: z.number(),
    recurring_uuid: z.string().nullable().optional(),
    room: roomSchema.nullable().optional(),
    room_id: z.number().nullable().optional(),
    sbc_staff_invigilated: z.number().nullable().optional(),
    shadow_invigilator_id: z.number().nullable().optional(),
    start_time: z.string(),
    stat_flag: z.boolean().nullable().optional(),
  })
  .passthrough()

export const bookingsResponseSchema = z
  .object({
    bookings: z.array(bookingSchema),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const bookingResponseSchema = z
  .object({
    booking: bookingSchema.optional(),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const examTypeSchema = z
  .object({
    exam_color: z.string().nullable().optional(),
    exam_type_id: z.number(),
    exam_type_name: z.string().nullable().optional(),
    group_exam_ind: z.number().nullable().optional(),
    ita_ind: z.number().nullable().optional(),
    number_of_hours: z.number().nullable().optional(),
    number_of_minutes: z.number().nullable().optional(),
    pesticide_exam_ind: z.number().nullable().optional(),
  })
  .passthrough()

export const examCandidateSchema = z
  .object({
    examinee_email: z.string().nullable().optional(),
    examinee_name: z.string().nullable().optional(),
    exam_type_id: z.union([z.number(), z.string()]).nullable().optional(),
    fees: z.string().nullable().optional(),
    payee_email: z.string().nullable().optional(),
    payee_ind: z.union([z.number(), z.string()]).nullable().optional(),
    payee_name: z.string().nullable().optional(),
    receipt: z.string().nullable().optional(),
    receipt_number: z.string().nullable().optional(),
  })
  .passthrough()

export const examSchema = z
  .object({
    bcmp_job_id: z.string().nullable().optional(),
    booking: bookingSchema.nullable().optional(),
    booking_id: z.number().nullable().optional(),
    candidates_list: z
      .union([z.array(examCandidateSchema), examCandidateSchema])
      .nullable()
      .optional(),
    deleted_date: z.string().nullable().optional(),
    event_id: z.string().nullable().optional(),
    exam_destroyed_date: z.string().nullable().optional(),
    exam_id: z.number(),
    exam_method: z.string().nullable().optional(),
    exam_name: z.string().nullable().optional(),
    exam_received: z.number().nullable().optional(),
    exam_received_date: z.string().nullable().optional(),
    exam_returned_date: z.string().nullable().optional(),
    exam_returned_ind: z.number().nullable().optional(),
    exam_returned_tracking_number: z.string().nullable().optional(),
    exam_type: examTypeSchema,
    exam_type_id: z.number().nullable().optional(),
    exam_written_ind: z.number().nullable().optional(),
    examinee_email: z.string().nullable().optional(),
    examinee_name: z.string().nullable().optional(),
    examinee_phone: z.string().nullable().optional(),
    expiry_date: z.string().nullable().optional(),
    fees: z.string().nullable().optional(),
    invigilator: invigilatorSchema.nullable().optional(),
    invigilator_id: z.number().nullable().optional(),
    is_pesticide: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    number_of_students: z.number().nullable().optional(),
    office: bookingOfficeSchema.optional(),
    office_id: z.number().nullable().optional(),
    offsite_location: z.string().nullable().optional(),
    payee_email: z.string().nullable().optional(),
    payee_ind: z.number().nullable().optional(),
    payee_name: z.string().nullable().optional(),
    payee_phone: z.string().nullable().optional(),
    receipt: z.string().nullable().optional(),
    receipt_number: z.string().nullable().optional(),
    receipt_sent_ind: z.number().nullable().optional(),
    sbc_managed_ind: z.number().nullable().optional(),
    session_number: z.number().nullable().optional(),
    upload_received_ind: z.number().nullable().optional(),
  })
  .passthrough()

export const examsResponseSchema = z
  .object({
    exams: z.array(examSchema),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const examResponseSchema = z
  .object({
    exam: examSchema,
    errors: z.unknown().optional(),
  })
  .passthrough()

export const examTypesResponseSchema = z
  .object({
    exam_types: z.array(examTypeSchema),
    errors: z.unknown().optional(),
  })
  .passthrough()

export const categoriesResponseSchema = z
  .object({
    categories: z.array(categorySchema),
    errors: errorsSchema.optional(),
  })
  .passthrough()

export const channelsResponseSchema = z
  .object({
    channels: z.array(channelSchema),
    errors: errorsSchema.optional(),
  })
  .passthrough()

export const servicesResponseSchema = z
  .object({
    services: z.array(serviceSchema),
    errors: errorsSchema.optional(),
  })
  .passthrough()

export const addCitizenResponseSchema = z
  .object({
    citizen: citizenSchema,
    errors: errorsSchema.optional(),
  })
  .passthrough()

export const serviceRequestResponseSchema = z.unknown()

export type Office = z.infer<typeof officeSchema>
export type Csr = z.infer<typeof csrSchema>
export type CsrListItem = z.infer<typeof csrListItemSchema>
export type CsrMe = z.infer<typeof csrMeResponseSchema>
export type CsrState = z.infer<typeof csrStateSchema>
export type Citizen = z.infer<typeof citizenSchema>
export type ServiceRequest = z.infer<typeof serviceRequestSchema>
export type Period = z.infer<typeof periodSchema>
export type QuickService = z.infer<typeof quickServiceSchema>
export type Category = z.infer<typeof categorySchema>
export type Channel = z.infer<typeof channelSchema>
export type Service = z.infer<typeof serviceSchema>
export type Appointment = z.infer<typeof appointmentSchema>
export type Room = z.infer<typeof roomSchema>
export type Invigilator = z.infer<typeof invigilatorSchema>
export type Booking = z.infer<typeof bookingSchema>
export type Exam = z.infer<typeof examSchema>
export type ExamType = z.infer<typeof examTypeSchema>
export type ExamCandidate = z.infer<typeof examCandidateSchema>
