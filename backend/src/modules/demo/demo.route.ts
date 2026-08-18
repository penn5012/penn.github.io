import type { FastifyInstance } from 'fastify'

type DemoQuery = {
  code: string
}

// Keep the verification value aligned with docs/api/openapi.yaml and the
// frontend learning example.
const DEMO_CODE = 'achat-demo'

export async function demoRoute(app: FastifyInstance) {
  app.get<{ Querystring: DemoQuery }>(
    '/api/demo',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['code'],
          additionalProperties: false,
          properties: {
            code: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.query.code !== DEMO_CODE) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_DEMO_CODE',
            message: '请求参数错误，请输入正确的 Demo Code',
          },
        })
      }

      return {
        message: '你好，今天你想做点什么有趣的事情？',
        timestamp: new Date().toISOString(),
      }
    },
  )
}
