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

const defaultTimeoutMs = 30000

export class ApiClient {
  private readonly authService: AuthService
  private readonly baseUrl: string
  private readonly defaultTimeoutMs: number

  constructor({
    authService,
    baseUrl,
    defaultTimeoutMs: timeoutMs = defaultTimeoutMs,
  }: ApiClientOptions) {
    this.authService = authService
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.defaultTimeoutMs = timeoutMs
  }

  async get<TSchema extends z.ZodType>(
    path: string,
    options: Omit<ApiRequestOptions<TSchema>, 'method'>,
  ): Promise<z.infer<TSchema>> {
    return this.request(path, { ...options, method: 'GET' })
  }

  async request<TSchema extends z.ZodType>(
    path: string,
    {
      authenticated = true,
      body: requestBody,
      method = 'GET',
      schema,
      signal,
      timeoutMs = this.defaultTimeoutMs,
    }: ApiRequestOptions<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    const abortListener = () => controller.abort()

    signal?.addEventListener('abort', abortListener, { once: true })

    try {
      const headers = new Headers({ Accept: 'application/json' })
      const requestPayload =
        requestBody === undefined ? undefined : JSON.stringify(requestBody)

      if (requestPayload !== undefined) {
        headers.set('Content-Type', 'application/json')
      }

      if (authenticated) {
        await this.authService.refreshToken()
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
        credentials: 'include',
        body: requestPayload,
        headers,
        method,
        signal: controller.signal,
      })

      const responseBody = await this.readBody(response)

      if (!response.ok) {
        throw new ApiError({
          details: responseBody,
          kind: getApiErrorKind(response.status),
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
      throw this.normalizeError(error, controller.signal)
    } finally {
      window.clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortListener)
    }
  }

  private buildUrl(path: string) {
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`
  }

  private async readBody(response: Response) {
    const text = await response.text()

    if (!text) {
      return null
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  private getErrorMessage(status: number, body: unknown) {
    if (body && typeof body === 'object') {
      const message =
        'message' in body
          ? body.message
          : 'Message' in body
            ? body.Message
            : null

      if (typeof message === 'string') {
        return message
      }
    }

    return `API request failed with status ${status}`
  }

  private normalizeError(error: unknown, signal: AbortSignal): ApiError {
    if (error instanceof ApiError) {
      return error
    }

    if (signal.aborted) {
      return new ApiError({
        kind: 'timeout',
        message: 'The API request timed out',
      })
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return new ApiError({
        kind: 'cancelled',
        message: 'The API request was cancelled',
      })
    }

    if (error instanceof TypeError) {
      return new ApiError({
        details: error,
        kind: 'network',
        message: 'The API request could not reach the server',
      })
    }

    return new ApiError({
      details: error,
      kind: 'unknown',
      message:
        error instanceof Error
          ? error.message
          : 'An unknown API error occurred',
    })
  }
}
