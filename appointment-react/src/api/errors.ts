export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'server'
  | 'timeout'
  | 'cancelled'
  | 'network'
  | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly details: unknown

  constructor({
    details = null,
    kind,
    message,
    status = null,
  }: {
    details?: unknown
    kind: ApiErrorKind
    message: string
    status?: number | null
  }) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.details = details
  }
}

export function getApiErrorKind(
  status: number,
  details?: unknown,
): ApiErrorKind {
  if (
    details &&
    typeof details === 'object' &&
    'code' in details &&
    details.code === 'CONFLICT_APPOINTMENT'
  ) {
    return 'conflict'
  }
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 400 || status === 422) return 'validation'
  if (status >= 500) return 'server'
  return 'unknown'
}
