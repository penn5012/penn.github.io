import type { FastifyInstance } from 'fastify'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error)
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
    return reply.status(statusCode).send({
      error: {
        code: statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message: statusCode === 500 ? '服务器内部错误' : error.message,
      },
    })
  })
}
