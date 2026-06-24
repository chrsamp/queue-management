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
    display_dashboard_ind: z.number().nullable().optional(),
    parent: serviceParentSchema.nullable().optional(),
    parent_id: z.number().nullable().optional(),
    service_desc: z.string().nullable().optional(),
    service_id: z.number(),
    service_name: z.string(),
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
