import type { FastifyInstance } from 'fastify'
import { AppError } from './app-error.js'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      request.log.error(
        {
          errorCode: error.code,
          statusCode: error.statusCode,
          method: request.method,
          url: request.url,
        },
        'request failed',
      )
      if (error.retryAfterSeconds !== undefined) {
        reply.header('retry-after', error.retryAfterSeconds)
      }
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      })
    }

    const statusCode = getStatusCode(error)
    request.log.error(
      {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        statusCode,
        method: request.method,
        url: request.url,
      },
      'request failed',
    )

    return reply.status(statusCode).send({
      error: {
        code: statusCode === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
        message: statusCode === 500 ? '服务器内部错误' : '请求参数错误',
      },
    })
  })
}

function getStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
  ) {
    return error.statusCode
  }

  return 500
}
