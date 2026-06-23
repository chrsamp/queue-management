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
    quick_list: z.array(z.unknown()).optional(),
    back_office_list: z.array(z.unknown()).optional(),
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

export const officesResponseSchema = z
  .object({
    offices: z.array(officeSchema),
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

export type Office = z.infer<typeof officeSchema>
export type Csr = z.infer<typeof csrSchema>
export type CsrMe = z.infer<typeof csrMeResponseSchema>
