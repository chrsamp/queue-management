import { z } from 'zod'

export const runtimeConfigSchema = z.object({
  VITE_Q_API_URL: z.string().url(),
  VITE_Q_SUPPORT_URL: z.string().url(),
})

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
    Object.keys(runtimeConfigSchema.shape)
      .map((key) => [key, import.meta.env[key]])
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
  ) as Partial<RuntimeConfig>
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
  const config = runtimeConfigSchema.parse({
    ...fileConfig,
    ...getRuntimeEnvOverrides(),
  })

  return {
    config,
    keycloak: keycloakConfigSchema.parse(keycloakJson),
  }
}
