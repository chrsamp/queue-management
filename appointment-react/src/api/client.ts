import type { z } from 'zod'

import type { AuthService } from '@/auth/auth-service'

import { ApiError, getApiErrorKind } from './errors'

export interface ApiClientOptions {
  authService: AuthService
  baseUrl: string
  defaultTimeoutMs?: number
}

export interface ApiRequestOptions<TSchema extends z.ZodType> {
  authenticated?: boolean
  body?: unknown
  method?: string
  schema: TSchema
  signal?: AbortSignal
  timeoutMs?: number
}

const defaultTimeoutMs = 30_000

export class ApiClient {
  private readonly authService: AuthService
  private readonly baseUrl: string
  private readonly defaultTimeoutMs: number

  constructor({
    authService,
    baseUrl,
    defaultTimeoutMs: timeout = defaultTimeoutMs,
  }: ApiClientOptions) {
    this.authService = authService
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.defaultTimeoutMs = timeout
  }

  get<TSchema extends z.ZodType>(
    path: string,
    options: Omit<ApiRequestOptions<TSchema>, 'method'>,
  ) {
    return this.request(path, { ...options, method: 'GET' })
  }

  async request<TSchema extends z.ZodType>(
    path: string,
    {
      authenticated = true,
      body,
      method = 'GET',
      schema,
      signal,
      timeoutMs = this.defaultTimeoutMs,
    }: ApiRequestOptions<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const controller = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })

    try {
      const headers = new Headers({ Accept: 'application/json' })
      const payload = body === undefined ? undefined : JSON.stringify(body)
      if (payload !== undefined) headers.set('Content-Type', 'application/json')

      if (authenticated) {
        try {
          await this.authService.refreshToken()
        } catch {
          throw new ApiError({
            kind: 'unauthorized',
            message: 'Authentication is required',
            status: 401,
          })
        }
        const token = this.authService.getSnapshot().token
        if (!token) {
          throw new ApiError({
            kind: 'unauthorized',
            message: 'Authentication is required',
            status: 401,
          })
        }
        headers.set('Authorization', `Bearer ${token}`)
      }

      const response = await fetch(this.buildUrl(path), {
        body: payload,
        headers,
        method,
        signal: controller.signal,
      })
      const responseBody = await this.readBody(response)

      if (!response.ok) {
        throw new ApiError({
          details: responseBody,
          kind: getApiErrorKind(response.status, responseBody),
          message: this.getErrorMessage(response.status, responseBody),
          status: response.status,
        })
      }

      const parsed = schema.safeParse(responseBody)
      if (!parsed.success) {
        throw new ApiError({
          details: parsed.error,
          kind: 'validation',
          message: 'The API response did not match the expected contract',
          status: response.status,
        })
      }
      return parsed.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (controller.signal.aborted) {
        throw new ApiError({
          kind: timedOut ? 'timeout' : 'cancelled',
          message: timedOut
            ? 'The API request timed out'
            : 'The API request was cancelled',
        })
      }
      if (error instanceof TypeError) {
        throw new ApiError({
          details: error,
          kind: 'network',
          message: 'Unable to reach the service',
        })
      }
      throw new ApiError({
        details: error,
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'API request failed',
      })
    } finally {
      window.clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abort)
    }
  }

  private buildUrl(path: string) {
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`
  }

  private async readBody(response: Response): Promise<unknown> {
    const text = await response.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  private getErrorMessage(status: number, body: unknown) {
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>
      const message = record.message ?? record.Message
      if (typeof message === 'string') return message
    }
    return `API request failed with status ${status}`
  }
}
