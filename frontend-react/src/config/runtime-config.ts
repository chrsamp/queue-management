import { z } from 'zod'

const defaultSocketTimeout = 20000
const defaultSocketDelayMax = 5000

const runtimeConfigInputSchema = z.object({
  VITE_Q_API_URL: z.string().url(),
  VITE_Q_SUPPORT_URL: z.string().url(),
  VITE_Q_SOCKET_DELAY_MAX: z.coerce.number().int().positive().optional(),
  VITE_Q_SOCKET_TIMEOUT: z.coerce.number().int().positive().optional(),
  VITE_Q_SOCKET_URL: z.string().url().optional(),
})

export const runtimeConfigSchema = runtimeConfigInputSchema.transform(
  (config) => ({
    ...config,
    VITE_Q_SOCKET_DELAY_MAX:
      config.VITE_Q_SOCKET_DELAY_MAX ?? defaultSocketDelayMax,
    VITE_Q_SOCKET_TIMEOUT: config.VITE_Q_SOCKET_TIMEOUT ?? defaultSocketTimeout,
    VITE_Q_SOCKET_URL:
      config.VITE_Q_SOCKET_URL ?? new URL(config.VITE_Q_API_URL).origin,
  }),
)

export const keycloakConfigSchema = z.object({
  realm: z.string().min(1),
  url: z.string().url(),
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

function getRuntimeEnvOverrides(): Partial<RuntimeConfig> {
  return Object.fromEntries(
    Object.keys(runtimeConfigInputSchema.shape)
      .map((key) => [key, import.meta.env[key]])
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
  ) as Partial<RuntimeConfig>
}

export function resolveRuntimeConfig(config: unknown): RuntimeConfig {
  return runtimeConfigSchema.parse(config)
}

export async function loadRuntime(): Promise<AppRuntime> {
  const [configJson, keycloakJson] = await Promise.all([
    loadJson('/config/configuration.json'),
    loadJson('/config/keycloak.json'),
  ])
  const fileConfig =
    typeof configJson === 'object' && configJson !== null
      ? (configJson as Record<string, unknown>)
      : {}
  const config = resolveRuntimeConfig({
    ...fileConfig,
    ...getRuntimeEnvOverrides(),
  })

  return {
    config,
    keycloak: keycloakConfigSchema.parse(keycloakJson),
  }
}
