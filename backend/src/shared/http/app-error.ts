export type AppErrorCode =
  | 'INVALID_REQUEST'
  | 'MODEL_SELECTION_UNSUPPORTED'
  | 'CONVERSATION_NOT_FOUND'
  | 'MODEL_PROVIDER_ERROR'
  | 'MODEL_PROVIDER_UNAVAILABLE'

export class AppError extends Error {
  constructor(
    readonly statusCode: 400 | 404 | 502 | 503,
    readonly code: AppErrorCode,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
