import type { ErrorEnvelope } from '../types/api'

const FALLBACK_ERROR_CODE = 'HTTP_ERROR'

export class ApiError extends Error {
  readonly code: string
  readonly status: number | undefined

  constructor(
    message: string,
    options: { code?: string; status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.code = options.code ?? FALLBACK_ERROR_CODE
    this.status = options.status
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!value || typeof value !== 'object' || !('error' in value)) return false

  const { error } = value

  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

export async function rejectErrorResponse(response: Response) {
  if (response.ok) return response

  let code = FALLBACK_ERROR_CODE
  let message = `请求失败（${response.status}）`

  try {
    const body: unknown = await response.json()

    if (isErrorEnvelope(body)) {
      code = body.error.code
      message = body.error.message
    }
  } catch {
    // The HTTP status message remains useful for an empty or non-JSON response.
  }

  throw new ApiError(message, { code, status: response.status })
}

export function normalizeRequestError(error: unknown) {
  if (
    error instanceof ApiError ||
    (error instanceof DOMException && error.name === 'AbortError')
  ) {
    return error
  }

  return new ApiError('无法连接服务器，请检查网络后重试', {
    code: 'NETWORK_ERROR',
    cause: error,
  })
}
