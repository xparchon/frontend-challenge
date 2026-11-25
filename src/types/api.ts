export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYMENT_REQUIRED'
  | 'TRANSIENT_ERROR'
  | 'SESSION_EXPIRED'

export interface ApiErrorResponse {
  code: ApiErrorCode
  message: string
  fieldErrors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
