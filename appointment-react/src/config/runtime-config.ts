import { z } from 'zod'

const booleanValue = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

const optionalUrl = z.union([z.literal(''), z.url()])

const runtimeConfigInputSchema = z.object({
  VITE_APPOINTMENT_API_URL: z.url(),
  VITE_APPOINTMENT_HIDE_BC_SERVICES_CARD: booleanValue.optional(),
  VITE_APPOINTMENT_BCEID_REGISTRATION_URL: optionalUrl.optional(),
  VITE_APPOINTMENT_BC_SERVICES_CARD_URL: optionalUrl.optional(),
  VITE_APPOINTMENT_DISABLE_SMS: booleanValue.optional(),
  VITE_APPOINTMENT_HEADER_MESSAGE: z.string().optional(),
  VITE_APPOINTMENT_HEADER_LINKS: z.string().optional(),
  VITE_APPOINTMENT_FOOTER_MESSAGE: z.string().optional(),
  VITE_APPOINTMENT_FOOTER_LINKS: z.string().optional(),
})

export const runtimeConfigSchema = runtimeConfigInputSchema.transform(
  (config) => ({
    ...config,
    VITE_APPOINTMENT_HIDE_BC_SERVICES_CARD:
      config.VITE_APPOINTMENT_HIDE_BC_SERVICES_CARD ?? false,
    VITE_APPOINTMENT_BCEID_REGISTRATION_URL:
      config.VITE_APPOINTMENT_BCEID_REGISTRATION_URL ?? '',
    VITE_APPOINTMENT_BC_SERVICES_CARD_URL:
      config.VITE_APPOINTMENT_BC_SERVICES_CARD_URL ?? '',
    VITE_APPOINTMENT_DISABLE_SMS: config.VITE_APPOINTMENT_DISABLE_SMS ?? false,
    VITE_APPOINTMENT_HEADER_MESSAGE:
      config.VITE_APPOINTMENT_HEADER_MESSAGE ?? '',
    VITE_APPOINTMENT_HEADER_LINKS: config.VITE_APPOINTMENT_HEADER_LINKS ?? '',
    VITE_APPOINTMENT_FOOTER_MESSAGE:
      config.VITE_APPOINTMENT_FOOTER_MESSAGE ?? '',
    VITE_APPOINTMENT_FOOTER_LINKS: config.VITE_APPOINTMENT_FOOTER_LINKS ?? '',
  }),
)

export const keycloakConfigSchema = z.object({
  realm: z.string().min(1),
  url: z.url(),
  clientId: z.string().min(1),
})

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>
export type RuntimeKeycloakConfig = z.infer<typeof keycloakConfigSchema>

export interface AppRuntime {
  config: RuntimeConfig
  keycloak: RuntimeKeycloakConfig
}

async function loadJson(path: string): Promise<unknown> {
  const response = await fetch(new URL(path, window.location.origin), {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`)
  }

  return response.json()
}

function getDevelopmentOverrides(): Record<string, unknown> {
  if (!import.meta.env.DEV) return {}

  return Object.fromEntries(
    Object.keys(runtimeConfigInputSchema.shape)
      .map((key) => [key, import.meta.env[key]])
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}

export function resolveRuntimeConfig(config: unknown): RuntimeConfig {
  return runtimeConfigSchema.parse(config)
}

export async function loadRuntime(): Promise<AppRuntime> {
  const [configuration, keycloak] = await Promise.all([
    loadJson('/config/configuration.json'),
    loadJson('/config/keycloak.json'),
  ])

  const fileConfiguration =
    typeof configuration === 'object' && configuration !== null
      ? configuration
      : {}

  return {
    config: resolveRuntimeConfig({
      ...fileConfiguration,
      ...getDevelopmentOverrides(),
    }),
    keycloak: keycloakConfigSchema.parse(keycloak),
  }
}
